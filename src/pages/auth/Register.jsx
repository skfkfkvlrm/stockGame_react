import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './Login.css'; // 로그인 폼 스타일을 재사용하거나 별도 CSS 분리 가능

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        studentId: '',
        password: '',
        name: '',
        grade: '',
        className: '',
        classNumber: ''
    });
    const [errorMsg, setErrorMsg] = useState('');
    const [idCheckMsg, setIdCheckMsg] = useState('');
    const [isIdChecked, setIsIdChecked] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (name === 'studentId') {
            setIsIdChecked(false);
            setIdCheckMsg('');
        }
    };

    const handleIdCheck = async () => {
        if (!formData.studentId) {
            setIdCheckMsg('아이디를 입력해주세요.');
            return;
        }
        try {
            const response = await api.get('/api/members/id-check', {
                params: { studentId: formData.studentId }
            });
            // response.data.data -> true면 중복, false면 사용 가능
            if (response.data.data) {
                setIdCheckMsg('이미 사용중인 아이디입니다.');
                setIsIdChecked(false);
            } else {
                setIdCheckMsg('사용 가능한 아이디입니다.');
                setIsIdChecked(true);
            }
        } catch (error) {
            console.error('ID Check Error:', error);
            setIdCheckMsg('중복 확인 중 오류가 발생했습니다.');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!isIdChecked) {
            setErrorMsg('아이디 중복 확인을 해주세요.');
            return;
        }

        if (!formData.password || !formData.name || !formData.grade || !formData.className || !formData.classNumber) {
            setErrorMsg('모든 필드를 입력해주세요.');
            return;
        }

        try {
            const response = await api.post('/api/members/join', {
                studentId: formData.studentId,
                password: formData.password,
                name: formData.name,
                grade: parseInt(formData.grade, 10),
                className: formData.className,
                classNumber: parseInt(formData.classNumber, 10)
            });

            if (response.data.success) {
                alert('회원가입이 완료되었습니다.');
                navigate('/login');
            } else {
                setErrorMsg(response.data.message || '회원가입에 실패했습니다.');
            }
        } catch (error) {
            console.error('Register Error:', error);
            if (error.response && error.response.data && error.response.data.message) {
                setErrorMsg(error.response.data.message);
            } else {
                setErrorMsg('서버 오류가 발생했습니다.');
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>회원가입</h2>
                <form onSubmit={handleRegister}>
                    <div className="form-group input-with-btn">
                        <label>아이디</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                name="studentId"
                                placeholder="아이디"
                                value={formData.studentId}
                                onChange={handleChange}
                                required
                            />
                            <button type="button" onClick={handleIdCheck} className="check-btn">중복확인</button>
                        </div>
                        {idCheckMsg && <p className={`status-msg ${isIdChecked ? 'success' : 'error'}`}>{idCheckMsg}</p>}
                    </div>

                    <div className="form-group">
                        <label>비밀번호</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="비밀번호"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>이름</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="이름"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group-inline" style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group">
                            <label>학년</label>
                            <input
                                type="number"
                                name="grade"
                                placeholder="학년"
                                value={formData.grade}
                                onChange={handleChange}
                                min="1"
                                max="6"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>반</label>
                            <input
                                type="text"
                                name="className"
                                placeholder="반"
                                value={formData.className}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>번호</label>
                            <input
                                type="number"
                                name="classNumber"
                                placeholder="번호"
                                value={formData.classNumber}
                                onChange={handleChange}
                                min="1"
                                max="99"
                                required
                            />
                        </div>
                    </div>

                    {errorMsg && <p className="error-message">{errorMsg}</p>}

                    <button type="submit" className="login-btn">가입하기</button>
                    <div className="login-links">
                        <span onClick={() => navigate('/login')} className="link" style={{cursor:'pointer', color:'#007bff'}}>이미 계정이 있으신가요? 로그인</span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
