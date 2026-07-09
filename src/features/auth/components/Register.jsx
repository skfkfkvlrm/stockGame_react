import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Hash, UserPlus } from 'lucide-react';
import api from '../../../api/axios';
import './Login.css'; // 재사용

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ studentId: '', name: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');
        try {
            const response = await api.post('/members/join', formData);
            if (response.data && response.data.data === true) {
                alert("회원가입이 완료되었습니다. 로그인해주세요.");
                navigate('/login');
            } else {
                setErrorMessage(response.data?.message || '회원가입에 실패했습니다.');
            }
        } catch (error) {
            setErrorMessage(error.response?.data?.message || '서버 오류로 인해 회원가입에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-container glass-panel">
                <div className="login-header">
                    <h2>회원가입</h2>
                    <p>플랫폼에 참여하여 투자를 시작하세요</p>
                </div>
                
                {errorMessage && <div className="error-msg">{errorMessage}</div>}

                <form onSubmit={handleRegister} className="login-form">
                    <div className="input-group">
                        <label>학번</label> 
                        <div className="input-icon-wrapper">
                            <Hash className="input-icon" size={18} />
                            <input type="text" name="studentId" placeholder="예: 30115" value={formData.studentId} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>이름</label> 
                        <div className="input-icon-wrapper">
                            <User className="input-icon" size={18} />
                            <input type="text" name="name" placeholder="실명을 입력하세요" value={formData.name} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>비밀번호</label> 
                        <div className="input-icon-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input type="password" name="password" placeholder="비밀번호 설정" value={formData.password} onChange={handleChange} required />
                        </div>
                    </div>
                    
                    <button type="submit" className="login-btn" disabled={isLoading}>
                        <UserPlus size={20} /> {isLoading ? '처리 중...' : '가입 완료'}
                    </button>
                    
                    <div className="login-links">
                        <span onClick={() => navigate('/login')} className="link">이미 계정이 있으신가요? <b>로그인</b></span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
