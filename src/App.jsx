import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

// TODO: 앞으로 구현할 컴포넌트들
const Login = () => <div><h2>로그인 페이지</h2><p>기존 Login.jsp를 대체할 컴포넌트</p></div>;
const Dashboard = () => <div><h2>자산 대시보드</h2><p>기존 MyAssets.jsp를 대체할 컴포넌트</p></div>;
const StockList = () => <div><h2>주식 종목 목록</h2><p>기존 StockList.jsp를 대체할 컴포넌트</p></div>;
const StockDetail = () => <div><h2>주식 상세 (차트 및 호가창)</h2><p>기존 StockDetail.jsp를 대체할 컴포넌트</p></div>;

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <header>
          <h1>Stock Game</h1>
          <nav>
            <a href="/">대시보드</a> | <a href="/stocks">주식 목록</a> | <a href="/login">로그인</a>
          </nav>
        </header>
        
        <main style={{ padding: '20px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/stocks" element={<StockList />} />
            <Route path="/stocks/:stockId" element={<StockDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
