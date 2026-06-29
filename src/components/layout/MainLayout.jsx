import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ToastContainer } from 'react-toastify';
import './MainLayout.css'; // 공통 레이아웃 스타일용

const MainLayout = () => {
    return (
        <div className="app-container">
            <Sidebar />
            <main className="content glass-panel" style={{ flex: 1, margin: '20px', padding: '30px', overflowY: 'auto' }}>
                <Outlet /> {/* 라우팅된 하위 컴포넌트들이 여기에 렌더링 됨 */}
            </main>
            <ToastContainer position="top-right" autoClose={3000} theme="dark" hideProgressBar={false} />
        </div>
    );
};

export default MainLayout;
