import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './MainLayout.css'; // 공통 레이아웃 스타일용

const MainLayout = () => {
    return (
        <div className="app">
            <div className="content">
                <Outlet /> {/* 라우팅된 하위 컴포넌트들이 여기에 렌더링 됨 */}
            </div>
            <Sidebar />
        </div>
    );
};

export default MainLayout;
