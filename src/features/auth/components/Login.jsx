import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const loginAsDemo = useAuthStore((state) => state.loginAsDemo);
    const isLoading = useAuthStore((state) => state.isLoading);
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isDemoLoading, setIsDemoLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!studentId || !password) {
            setErrorMessage('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        const result = await login(studentId, password);
        if (result.success) {
            navigate('/', { replace: true });
        } else {
            setErrorMessage(result.message || '아이디 또는 비밀번호가 틀립니다.');
        }
    };

    const handleDemoLogin = async () => {
        setErrorMessage('');
        setIsDemoLoading(true);
        try {
            const result = await loginAsDemo();
            if (result.success) {
                navigate('/', { replace: true });
            } else {
                setErrorMessage(result.message || '데모 로그인에 실패했습니다.');
            }
        } catch (err) {
            setErrorMessage(err.message || '데모 로그인 중 오류가 발생했습니다.');
        } finally {
            setIsDemoLoading(false);
        }
    };

    const isActionLoading = isLoading || isDemoLoading;

    return (
        <div className="login-wrapper">
            <div className="login-container glass-panel">
                <div className="login-header">
                    <div className="brand-logo-large">STOCKGAME</div>
                    <p>실전 감각을 기르는 최고의 방법</p>
                </div>

                {errorMessage && <div className="error-msg">{errorMessage}</div>}

                {/* 채용담당자 전용 1클릭 데모 로그인 섹션 */}
                <div className="demo-login-card">
                    <div className="demo-login-header">
                        <span className="demo-badge">
                            <Sparkles size={14} /> Recruiter Quick Access
                        </span>
                        <h3 className="demo-title">회원가입 없이 즉시 체험하기</h3>
                    </div>
                    <p className="demo-desc">
                        채용담당자 및 평가자를 위한 <b>1클릭 게스트 로그인</b>입니다.<br />
                        클릭 즉시 <b>1,000,000 P(예수금)</b>가 충전된 데모 학생 계정으로 입장합니다.
                    </p>
                    <button
                        type="button"
                        onClick={handleDemoLogin}
                        className="demo-login-btn"
                        disabled={isActionLoading}
                    >
                        <Sparkles size={18} />
                        {isDemoLoading ? '데모 계정 인증 및 자산 준비 중...' : '🚀 1클릭 학생 데모 로그인 (즉시 체험)'}
                    </button>
                </div>

                <div className="login-divider">
                    <span>또는 기존 계정으로 로그인</span>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <label>아이디</label>
                        <div className="input-icon-wrapper">
                            <User className="input-icon" size={18} />
                            <input
                                type="text"
                                placeholder="학번을 입력하세요"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>비밀번호</label>
                        <div className="input-icon-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                type="password"
                                placeholder="비밀번호를 입력하세요"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={isActionLoading}>
                        <LogIn size={20} /> {isLoading ? '로그인 중...' : '로그인'}
                    </button>

                    <div className="login-links">
                        <span onClick={() => navigate('/register')} className="link">계정이 없으신가요? <b>회원가입</b></span>
                    </div>
                </form>

                {/* 관리자 포털 교차 체험 이동 안내 */}
                <div className="admin-portal-link-box">
                    <div className="admin-link-left">
                        <ShieldCheck size={18} className="admin-shield-icon" />
                        <div>
                            <div className="admin-link-title">교사용 관리자 포털 둘러보기</div>
                            <div className="admin-link-sub">시장 개폐, 상장폐지 청산, 학생 포인트 조정</div>
                        </div>
                    </div>
                    <a
                        href="https://admin.skfkfkvlrm.kr"
                        target="_blank"
                        rel="noreferrer"
                        className="admin-link-btn"
                    >
                        이동 <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Login;
