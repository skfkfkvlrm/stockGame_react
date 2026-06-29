import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import StockList from './pages/stock/StockList';
import StockDetail from './pages/stock/StockDetail';
import NewsList from './pages/news/NewsList';
import PointsHistory from './pages/points/PointsHistory';
import CouponStore from './pages/coupons/CouponStore';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인은 레이아웃 외부에서 단독 렌더링 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* 내부 페이지들은 MainLayout 내에서 렌더링 */}
        <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="stocks" element={<StockList />} />
            <Route path="stocks/:stockId" element={<StockDetail />} />
            <Route path="news" element={<NewsList />} />
            <Route path="points" element={<PointsHistory />} />
            <Route path="coupons" element={<CouponStore />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
