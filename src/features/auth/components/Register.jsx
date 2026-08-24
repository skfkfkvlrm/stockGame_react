import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Hash, UserPlus, CheckCircle2, GraduationCap, School, ListOrdered, Gift } from 'lucide-react';
import api from '../../../api/axios';
import './Login.css';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        studentId: '',
        name: '',
        grade: '1',
        className: '1',
        classNumber: '',
        password: '',
        passwordConfirm: ''
    });
    
    const [isIdChecked, setIsIdChecked] = useState(false);
    const [idCheckMessage, setIdCheckMessage] = useState('');
    const [isCheckingId, setIsCheckingId] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (name === 'studentId') {
            setIsIdChecked(false);
            setIdCheckMessage('');
        }
    };

    const handleCheckDuplicate = async () => {
        if (!formData.studentId || !formData.studentId.trim()) {
            setIdCheckMessage('학번을 먼저 입력해주세요.');
            return;
        }

        setIsCheckingId(true);
        setIdCheckMessage('');
        try {
            const response = await api.get(`/members/id-check?studentId=${encodeURIComponent(formData.studentId.trim())}`);
            const isDuplicate = response.data?.data;
            if (isDuplicate) {
                setIsIdChecked(false);
                setIdCheckMessage('❌ 이미 등록된 학번입니다.');
            } else {
                setIsIdChecked(true);
                setIdCheckMessage('✅ 사용 가능한 학번입니다.');
            }
        } catch (error) {
            setIdCheckMessage('중복 확인 중 오류가 발생했습니다.');
        } finally {
            setIsCheckingId(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');

        // 1. 유효성 검사
        if (!isIdChecked) {
            setErrorMessage('학번 중복 확인을 진행해주세요.');
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.passwordConfirm) {
            setErrorMessage('비밀번호가 일치하지 않습니다.');
            setIsLoading(false);
            return;
        }

        if (!formData.classNumber || parseInt(formData.classNumber, 10) <= 0) {
            setErrorMessage('올바른 번호를 입력해주세요.');
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                studentId: formData.studentId.trim(),
                name: formData.name.trim(),
                grade: parseInt(formData.grade, 10),
                className: `${formData.className}반`,
                classNumber: parseInt(formData.classNumber, 10),
                password: formData.password
            };

            const response = await api.post('/members/join', payload);
            if (response.data && response.data.data === true) {
                alert("회원가입이 완료되었습니다. 초기 모의투자 지원금 100,000 P가 지급되었습니다! 로그인해주세요.");
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
            <div className="login-container glass-panel" style={{ maxWidth: '520px' }}>
                <div className="login-header">
                    <h2>학생 회원가입</h2>
                    <p>플랫폼에 참여하여 모의투자를 시작하세요</p>
                </div>

                {/* 혜택 안내 배너 */}
                <div className="register-benefit-banner">
                    <Gift size={18} />
                    <span>가입 즉시 초기 투자 지원금 <b>100,000 P</b> 지급!</span>
                </div>
                
                {errorMessage && <div className="error-msg">{errorMessage}</div>}

                <form onSubmit={handleRegister} className="login-form">
                    {/* 학번 / 아이디 + 중복확인 */}
                    <div className="input-group">
                        <label>학번 (로그인 아이디)</label> 
                        <div className="input-icon-wrapper">
                            <Hash className="input-icon" size={18} />
                            <input 
                                type="text" 
                                name="studentId" 
                                placeholder="예: 20260101 또는 30115" 
                                value={formData.studentId} 
                                onChange={handleChange} 
                                required 
                                style={{ paddingRight: '90px' }}
                            />
                            <button
                                type="button"
                                className="btn-check-duplicate"
                                onClick={handleCheckDuplicate}
                                disabled={isCheckingId || !formData.studentId}
                            >
                                {isCheckingId ? '확인 중' : isIdChecked ? '확인 완료' : '중복 확인'}
                            </button>
                        </div>
                        {idCheckMessage && (
                            <div className={isIdChecked ? "success-msg-inline" : "error-msg-inline"}>
                                {idCheckMessage}
                            </div>
                        )}
                    </div>

                    {/* 이름 */}
                    <div className="input-group">
                        <label>이름</label> 
                        <div className="input-icon-wrapper">
                            <User className="input-icon" size={18} />
                            <input 
                                type="text" 
                                name="name" 
                                placeholder="실명을 입력하세요 (예: 홍길동)" 
                                value={formData.name} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                    </div>

                    {/* 학년 / 반 / 번호 3열 배치 (방안 B) */}
                    <div className="form-row-3col">
                        <div className="input-group">
                            <label>학년</label>
                            <div className="input-icon-wrapper">
                                <GraduationCap className="input-icon" size={18} />
                                <select 
                                    name="grade" 
                                    value={formData.grade} 
                                    onChange={handleChange} 
                                    className="input-select"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(g => (
                                        <option key={g} value={g}>{g}학년</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>반</label>
                            <div className="input-icon-wrapper">
                                <School className="input-icon" size={18} />
                                <select 
                                    name="className" 
                                    value={formData.className} 
                                    onChange={handleChange} 
                                    className="input-select"
                                >
                                    {Array.from({ length: 15 }, (_, i) => i + 1).map(c => (
                                        <option key={c} value={c}>{c}반</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>번호</label>
                            <div className="input-icon-wrapper">
                                <ListOrdered className="input-icon" size={18} />
                                <input 
                                    type="number" 
                                    name="classNumber" 
                                    placeholder="예: 15" 
                                    min="1"
                                    max="50"
                                    value={formData.classNumber} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                        </div>
                    </div>

                    {/* 비밀번호 */}
                    <div className="input-group">
                        <label>비밀번호</label> 
                        <div className="input-icon-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input 
                                type="password" 
                                name="password" 
                                placeholder="비밀번호 설정 (4자 이상)" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                    </div>

                    {/* 비밀번호 확인 */}
                    <div className="input-group">
                        <label>비밀번호 확인</label> 
                        <div className="input-icon-wrapper">
                            <CheckCircle2 className="input-icon" size={18} />
                            <input 
                                type="password" 
                                name="passwordConfirm" 
                                placeholder="비밀번호를 다시 입력하세요" 
                                value={formData.passwordConfirm} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                        {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
                            <div className="error-msg-inline">
                                ❌ 비밀번호가 일치하지 않습니다.
                            </div>
                        )}
                        {formData.passwordConfirm && formData.password === formData.passwordConfirm && (
                            <div className="success-msg-inline">
                                ✅ 비밀번호가 일치합니다.
                            </div>
                        )}
                    </div>
                    
                    <button type="submit" className="login-btn" disabled={isLoading}>
                        <UserPlus size={20} /> {isLoading ? '가입 처리 중...' : '가입 완료하고 10만P 받기'}
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
