import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/members/login', { studentId, password });
            if (response.data.success) {
                navigate('/');
            } else {
                setErrorMessage(response.data.message || '로그인 실패');
            }
        } catch (error) {
            setErrorMessage('서버와의 통신에 실패했습니다.');
        }
    };

    return (
        <div className="login-container">
            <h1 className="project-name">SchoolStock</h1>
            {errorMessage && <div className="error-msg">{errorMessage}</div>}
            
            <form onSubmit={handleLogin}>
                <div className="login-form">
                    <div className="input-group">
                        <div className="input-row">
                            <label>아이디 :</label> 
                            <input 
                                type="text" 
                                value={studentId} 
                                onChange={(e) => setStudentId(e.target.value)} 
                            />
                        </div>
                        <div className="input-row">
                            <label>비밀번호 :</label> 
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                            />
                        </div>
                        <button type="submit" className="login-btn">로그인</button>
                    </div>
                    <div className="login-links" style={{marginTop: '15px', textAlign: 'center'}}>
                        <span onClick={() => navigate('/register')} className="link" style={{cursor:'pointer', color:'#007bff'}}>계정이 없으신가요? 회원가입</span>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Login;
