import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const authService = {
    /**
     * 학생 로그인
     */
    async login(studentId, password) {
        if (isSupabaseMode) {
            const cleanId = studentId.trim();
            const email = `${cleanId}@stockgame.local`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

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
            const email = `${cleanId}@stockgame.local`;

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
     * 로그아웃
     */
    async logout() {
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
