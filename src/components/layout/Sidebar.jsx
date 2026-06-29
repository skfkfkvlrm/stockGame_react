import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './Sidebar.css';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [info, setInfo] = useState(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await api.get('/api/members/me');
                if (response.data.success) {
                    setInfo(response.data.data);
                }
            } catch (error) {
                console.error("내 정보 조회 실패", error);
            }
        };
        fetchUserInfo();
    }, []);

    const handleLogout = async () => {
        try {
            await api.post('/api/members/logout');
            navigate('/login');
        } catch (error) {
            console.error("로그아웃 실패", error);
        }
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    if (!info) return <aside className="right-sidebar">로딩 중...</aside>;

    return (
        <aside className="right-sidebar">
            <div className="user-info">
                <button onClick={handleLogout} className="logout-btn">로그아웃</button>
                <h2 className="user-name" id="studentName">{info.name}</h2>
                <p id="studentClassInfo">{info.grade}학년 {info.className}반 {info.classNumber}번</p>
                <p className="point-info" id="studentPoints">보유 포인트 :{info.totalPoint.toLocaleString()}P</p>
            </div>

            <div className="round-box">
                <p>장 운영중</p>
            </div>

            <nav className="sidebar-menu">
                <button className={`menu-button ${isActive('/')}`} onClick={() => navigate('/')}>내 자산</button>
                <button className={`menu-button ${isActive('/stocks')}`} onClick={() => navigate('/stocks')}>주식 목록</button>
                <button className={`menu-button ${isActive('/news')}`} onClick={() => navigate('/news')}>뉴스 목록</button>
                <button className={`menu-button ${isActive('/points')}`} onClick={() => navigate('/points')}>내 포인트 내역</button>
                <button className={`menu-button ${isActive('/coupons')}`} onClick={() => navigate('/coupons')}>쿠폰 상점</button>
            </nav>
        </aside>
    );
};

export default Sidebar;
