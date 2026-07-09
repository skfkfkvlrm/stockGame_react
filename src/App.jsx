import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './features/core/layout/MainLayout';
import Login from './features/auth/components/Login';
import Register from './features/auth/components/Register';
import Dashboard from './features/dashboard/components/Dashboard';
import StockList from './features/stocks/components/StockList';
import StockDetail from './features/stocks/components/StockDetail';
import NewsList from './features/news/components/NewsList';
import PointsHistory from './features/points/components/PointsHistory';
import CouponStore from './features/coupons/components/CouponStore';
import MyCoupons from './features/coupons/components/MyCoupons';
import useAuthStore from './features/auth/store/useAuthStore';
import { useEffect } from 'react';
import './App.css';

const RequireAuth = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuthStore();
    
    if (isLoading) {
        return <div className="app-container"><div className="loading-spinner"></div></div>;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

function App() {
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인은 레이아웃 외부에서 단독 렌더링 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* 내부 페이지들은 MainLayout 내에서 렌더링 */}
        <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="stocks" element={<StockList />} />
            <Route path="stocks/:stockId" element={<StockDetail />} />
            <Route path="news" element={<NewsList />} />
            <Route path="points" element={<PointsHistory />} />
            <Route path="coupons" element={<CouponStore />} />
            <Route path="my-coupons" element={<MyCoupons />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
