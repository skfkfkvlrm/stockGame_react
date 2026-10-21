import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const authService = {
    /**
     * 학생 로그인
     */
    async login(studentId, password) {
        const cleanId = studentId ? studentId.trim() : '';

        // 사용자가 로그인 폼에서 직접 'demo'를 입력한 경우, 공용 계정 오염을 방지하고 브라우저 격리 샌드박스로 자동 연계
        if (cleanId.toLowerCase() === 'demo') {
            return await this.loginAsDemo();
        }

        if (isSupabaseMode) {
            let email = `${cleanId}@skfkfkvlrm.kr`;

            let { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            // 채용담당자 세션 비밀번호 호환성 (1234 -> recruiter1234!)
            if (error && cleanId.startsWith('recruiter_') && password === '1234') {
                const recRes = await supabase.auth.signInWithPassword({
                    email,
                    password: 'recruiter1234!'
                });
                if (!recRes.error) {
                    data = recRes.data;
                    error = null;
                }
            }

            // 하위 호환성 지원: 이전 .local 도메인 계정 시도
            if (error && error.message === 'Invalid login credentials') {
                const legacyEmail = `${cleanId}@stockgame.local`;
                const legacyRes = await supabase.auth.signInWithPassword({
                    email: legacyEmail,
                    password
                });
                if (!legacyRes.error) {
                    data = legacyRes.data;
                    error = null;
                }
            }

            if (error) {
                const msg = error.message === 'Invalid login credentials'
                    ? '학번 또는 비밀번호가 일치하지 않습니다.'
                    : (error.message || '로그인에 실패했습니다.');
                throw new Error(msg);
            }

            const token = data.session?.access_token;
            if (token) {
                localStorage.setItem('jwt_token', token);
            }

            // 프로필 정보 동기화
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            return {
                id: data.user.id,
                studentId: profile?.student_id || cleanId,
                name: profile?.name || '학생',
                grade: profile?.grade || 1,
                className: profile?.class_name || '1반',
                classNumber: profile?.class_number || 1,
                role: profile?.role || 'ROLE_STUDENT',
                totalPoint: profile?.total_point ?? 100000,
                totalCoupon: profile?.total_coupon ?? 0,
                token: token
            };
        }

        const response = await api.post('/members/login', { studentId, password });
        if (response.data && response.data.success) {
            const token = response.data.data?.token || response.data.message;
            if (token) {
                localStorage.setItem('jwt_token', token);
            }
            return response.data.data;
        }
        throw new Error(response.data?.message || '로그인 실패');
    },

    /**
     * 학생 회원가입
     */
    async register({ studentId, name, grade, className, classNumber, password }) {
        if (isSupabaseMode) {
            const cleanId = studentId.trim();
            const email = `${cleanId}@skfkfkvlrm.kr`;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        student_id: cleanId,
                        studentId: cleanId,
                        name: name.trim(),
                        grade: parseInt(grade, 10),
                        class_name: `${className}반`,
                        className: `${className}반`,
                        class_number: parseInt(classNumber, 10),
                        classNumber: parseInt(classNumber, 10),
                        role: 'ROLE_STUDENT'
                    }
                }
            });

            if (error) {
                throw new Error(error.message || '회원가입에 실패했습니다.');
            }

            return data;
        }

        const payload = {
            studentId: studentId.trim(),
            name: name.trim(),
            grade: parseInt(grade, 10),
            className: `${className}반`,
            classNumber: parseInt(classNumber, 10),
            password
        };
        const response = await api.post('/members/join/student', payload);
        return response.data;
    },

    /**
     * 학번 중복 확인
     */
    async checkStudentIdDuplicate(studentId) {
        if (isSupabaseMode) {
            const cleanId = studentId.trim();
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('student_id', cleanId)
                .maybeSingle();

            if (error) throw error;
            return !!data; // true: 중복, false: 사용 가능
        }

        const response = await api.get(`/members/id-check?studentId=${encodeURIComponent(studentId.trim())}`);
        return !!response.data?.data;
    },

    /**
     * 현재 인증 사용자 및 프로필 조회
     */
    async getCurrentUser() {
        if (isSupabaseMode) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                return null;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            return {
                id: session.user.id,
                studentId: profile?.student_id || '',
                name: profile?.name || '학생',
                grade: profile?.grade || 1,
                className: profile?.class_name || '1반',
                classNumber: profile?.class_number || 1,
                role: profile?.role || 'ROLE_STUDENT',
                totalPoint: profile?.total_point ?? 0,
                totalCoupon: profile?.total_coupon ?? 0,
                token: session.access_token
            };
        }

        const token = localStorage.getItem('jwt_token');
        if (!token) return null;

        const response = await api.get('/members/me');
        if (response.data && response.data.success) {
            return response.data.data;
        }
        return null;
    },

    /**
     * 채용담당자 전용 1클릭 학생 데모 로그인 (창 닫기 무손실 보장 & 브라우저 세션 독립 샌드박스)
     */
    async loginAsDemo() {
        const RECRUITER_SESSION_KEY = 'stk_recruiter_session_id';
        const RECRUITER_DEFAULT_PASSWORD = 'recruiter1234!';
        let sessionId = localStorage.getItem(RECRUITER_SESSION_KEY);
        if (!sessionId || !sessionId.startsWith('recruiter_')) {
            // 브라우저 세션별 고유 8자리 난수 키 발급 (예: recruiter_a1b2c3d4)
            const randomPart = Math.random().toString(36).substring(2, 10);
            sessionId = `recruiter_${randomPart}`;
            localStorage.setItem(RECRUITER_SESSION_KEY, sessionId);
        }

        const shortCode = sessionId.replace('recruiter_', '').substring(0, 4);
        const displayName = `채용담당자(데모 #${shortCode})`;

        let user;
        try {
            // 1. 기존 발급된 샌드박스 세션으로 로그인 시도
            user = await this.login(sessionId, RECRUITER_DEFAULT_PASSWORD);
        } catch (loginErr) {
            try {
                // 2. 신규 세션인 경우 해당 샌드박스 계정 즉시 자동 생성 (Supabase 비밀번호 6자 이상 규격 준수)
                await this.register({
                    studentId: sessionId,
                    name: displayName,
                    grade: 3,
                    className: '1',
                    classNumber: 99,
                    password: RECRUITER_DEFAULT_PASSWORD
                });
                user = await this.login(sessionId, RECRUITER_DEFAULT_PASSWORD);
            } catch (registerErr) {
                console.warn('Recruiter registration failed, retrying with fresh session key:', registerErr);
                // 만약 기존 세션 키 충돌 등의 이유로 실패 시 즉시 새 세션 키 발급 후 재시도
                const freshRandomPart = Math.random().toString(36).substring(2, 10);
                sessionId = `recruiter_${freshRandomPart}`;
                localStorage.setItem(RECRUITER_SESSION_KEY, sessionId);
                const freshShortCode = freshRandomPart.substring(0, 4);
                await this.register({
                    studentId: sessionId,
                    name: `채용담당자(데모 #${freshShortCode})`,
                    grade: 3,
                    className: '1',
                    classNumber: 99,
                    password: RECRUITER_DEFAULT_PASSWORD
                });
                user = await this.login(sessionId, RECRUITER_DEFAULT_PASSWORD);
            }
        }

        // [창 닫기 무손실 원칙]: 로그인 시점에는 절대 resetDemoAccount()를 호출하지 않음!
        // 브라우저를 닫거나 타 계정과 교차 체결 후 재로그인 시 기존 체결 결과와 잔액을 100% 보존
        return user;
    },

    /**
     * 데모 계정 데이터 완전 초기화 (예수금 100만 P, 보유 주식/미체결 주문/쿠폰 0건 복구)
     */
    async resetDemoAccount() {
        if (isSupabaseMode) {
            const currentUser = await this.getCurrentUser();
            const targetStudentId = currentUser?.studentId || currentUser?.student_id || 'demo';
            const { data, error } = await supabase.rpc('reset_demo_account', {
                p_target_student_id: targetStudentId
            });
            if (error) {
                throw new Error(error.message || '데모 계정 초기화에 실패했습니다.');
            }
            return {
                success: true,
                totalPoint: Number(data?.totalPoint ?? 1000000),
                clearedOrders: Number(data?.clearedOrders ?? 0),
                clearedStocks: Number(data?.clearedStocks ?? 0),
                clearedCoupons: Number(data?.clearedCoupons ?? 0),
                resetAt: data?.resetAt || new Date().toISOString()
            };
        }

        // Spring Boot 모드 (MSA & Monolith): 백엔드 대칭 리셋 API 병렬 호출
        try {
            await Promise.all([
                api.post('/members/demo/reset'),
                api.post('/stock/demo/reset'),
                api.post('/coupons/demo/reset')
            ]);
            return {
                success: true,
                totalPoint: 1000000,
                clearedOrders: 0,
                clearedStocks: 0,
                clearedCoupons: 0,
                resetAt: new Date().toISOString()
            };
        } catch (err) {
            console.error('Spring Boot demo reset failed:', err);
            throw new Error(err.response?.data?.message || err.message || '데모 계정 초기화 실패');
        }
    },

    /**
     * 데모 계정 전용 원터치 포인트 충전 (+1,000,000 P 기본)
     */
    async rechargeDemoPoints(amount = 1000000) {
        const cleanAmount = Number(amount) || 1000000;
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('recharge_demo_points', {
                p_amount: cleanAmount
            });

            if (error) {
                throw new Error(error.message || '데모 포인트 충전에 실패했습니다.');
            }

            return {
                success: true,
                rechargedAmount: Number(data?.rechargedAmount ?? cleanAmount),
                totalPoint: Number(data?.totalPoint ?? 0)
            };
        }

        // Spring Boot 모드: 백엔드 충전 API 호출
        const response = await api.post('/members/demo/recharge', { amount: cleanAmount });
        if (response.data && response.data.success) {
            return {
                success: true,
                rechargedAmount: cleanAmount,
                totalPoint: response.data.data?.totalPoint ?? 0
            };
        }
        throw new Error(response.data?.message || '포인트 충전에 실패했습니다.');
    },

    /**
     * 로그아웃
     */
    async logout() {
        // [창 닫기 및 계정 전환 무손실 원칙]:
        // 로그아웃 시 데모 계정 자산을 임의로 리셋하지 않으며,
        // 오직 사용자가 사이드바/대시보드의 '데모 초기화' 버튼을 명시적으로 클릭할 때만 초기화 진행
        if (isSupabaseMode) {
            await supabase.auth.signOut();
            localStorage.removeItem('jwt_token');
            return;
        }

        try {
            await api.post('/members/logout');
        } catch (e) {
            console.warn('Logout request warning:', e);
        } finally {
            localStorage.removeItem('jwt_token');
        }
    }
};

export default authService;
