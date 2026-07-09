import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Newspaper, Wallet, Store, LogOut } from 'lucide-react';
import useAuthStore from '../../auth/store/useAuthStore';
import './Sidebar.css';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    if (!user) return <aside className="right-sidebar glass-panel"><div className="loading-spinner"></div></aside>;

    return (
        <aside className="right-sidebar glass-panel">
            <div className="sidebar-header">
                <div className="brand-logo">📈 STKGAME</div>
            </div>

            <div className="user-profile">
                <div className="avatar">{user.name ? user.name.charAt(0) : 'U'}</div>
                <div className="user-details">
                    <h2 className="user-name">{user.name}</h2>
                    <p className="user-class">{user.grade}학년 {user.className}반 {user.classNumber}번</p>
                </div>
            </div>

            <div className="point-card glass-panel">
                <p className="point-label">보유 포인트</p>
                <h3 className="point-amount">{user.totalPoint ? user.totalPoint.toLocaleString() : 0} <span className="currency">P</span></h3>
            </div>

            <div className="market-status open">
                <span className="status-dot"></span>
                <p>현재 장 운영중</p>
            </div>

            <nav className="sidebar-menu">
                <button className={`menu-item ${isActive('/')}`} onClick={() => navigate('/')}>
                    <LayoutDashboard className="icon" size={20} /> 대시보드
                </button>
                <button className={`menu-item ${isActive('/stocks')}`} onClick={() => navigate('/stocks')}>
                    <TrendingUp className="icon" size={20} /> 주식 거래
                </button>
                <button className={`menu-item ${isActive('/news')}`} onClick={() => navigate('/news')}>
                    <Newspaper className="icon" size={20} /> 시장 뉴스
                </button>
                <button className={`menu-item ${isActive('/points')}`} onClick={() => navigate('/points')}>
                    <Wallet className="icon" size={20} /> 포인트 내역
                </button>
                <button className={`menu-item ${isActive('/coupons')}`} onClick={() => navigate('/coupons')}>
                    <Store className="icon" size={20} /> 쿠폰 상점
                </button>
            </nav>
            
            <div className="sidebar-footer">
                <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={18} /> 로그아웃
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
