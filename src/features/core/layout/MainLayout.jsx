import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ToastContainer } from 'react-toastify';
import MarketCircuitBreakerBanner from '../components/MarketCircuitBreakerBanner';
import useMarketStore from '../../admin/store/useMarketStore';
import newsService from '../../../services/newsService';
import './MainLayout.css'; // 공통 레이아웃 스타일용

const MainLayout = () => {
    const fetchMarketStatus = useMarketStore((state) => state.fetchMarketStatus);
    const subscribeMarketEvents = useMarketStore((state) => state.subscribeMarketEvents);
    const unsubscribeMarketEvents = useMarketStore((state) => state.unsubscribeMarketEvents);

    useEffect(() => {
        fetchMarketStatus();
        subscribeMarketEvents();
        const stopAutoNews = newsService.startAutoNewsScheduler(180000); // 3분 주기 자동 뉴스 발행
        return () => {
            unsubscribeMarketEvents();
            if (typeof stopAutoNews === 'function') stopAutoNews();
        };
    }, [fetchMarketStatus, subscribeMarketEvents, unsubscribeMarketEvents]);

    return (
        <div className="app-container">
            <Sidebar />
            <main className="content glass-panel" style={{ flex: 1, height: 'calc(100vh - 40px)', margin: '20px', padding: '30px', overflowY: 'auto' }}>
                <MarketCircuitBreakerBanner />
                <Outlet /> {/* 라우팅된 하위 컴포넌트들이 여기에 렌더링 됨 */}
            </main>
            <ToastContainer position="top-right" autoClose={3000} theme="light" hideProgressBar={false} />
        </div>
    );
};

export default MainLayout;
