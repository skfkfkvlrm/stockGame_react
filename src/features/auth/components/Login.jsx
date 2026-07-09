import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const isLoading = useAuthStore((state) => state.isLoading);
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        
        if (!studentId || !password) {
            setErrorMessage('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        const result = await login(studentId, password);
        if (result.success) {
            navigate('/');
        } else {
            setErrorMessage(result.message || '아이디 또는 비밀번호가 틀립니다.');
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-container glass-panel">
                <div className="login-header">
                    <div className="brand-logo-large">📈 STKGAME</div>
                    <h2>학생 모의투자 플랫폼</h2>
                    <p>실전 감각을 기르는 최고의 방법</p>
                </div>
                
                {errorMessage && <div className="error-msg">{errorMessage}</div>}
                
                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <label>아이디</label> 
                        <div className="input-icon-wrapper">
                            <User className="input-icon" size={18} />
                            <input 
                                type="text" 
                                placeholder="학번을 입력하세요 (예: admin)"
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
                    
                    <button type="submit" className="login-btn" disabled={isLoading}>
                        <LogIn size={20} /> {isLoading ? '로그인 중...' : '시작하기'}
                    </button>
                    
                    <div className="login-links">
                        <span onClick={() => navigate('/register')} className="link">계정이 없으신가요? <b>회원가입</b></span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
