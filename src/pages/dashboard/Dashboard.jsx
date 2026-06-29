import React, { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import './Dashboard.css';

const Dashboard = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('/api/asset/');
                if (response.data.success) {
                    setData(response.data.data);
                }
            } catch (error) {
                console.error("대시보드 데이터 조회 실패", error);
            }
        };
        fetchDashboardData();
    }, []);

    if (!data) return <div className="dashboard">데이터를 불러오는 중입니다...</div>;

    const { totalAsset, totalPoint, totalProfit, totalCoupon, myStocks } = data;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h2>나의 자산</h2>
                <div className="summary-cards">
                    <div className="card">
                        <h3>총 자산</h3>
                        <p className="amount">{totalAsset?.toLocaleString()}P</p>
                    </div>
                    <div className="card">
                        <h3>가용 포인트</h3>
                        <p className="amount">{totalPoint?.toLocaleString()}P</p>
                    </div>
                    <div className="card">
                        <h3>총 수익금</h3>
                        <p className={`amount ${totalProfit >= 0 ? 'profit-up' : 'profit-down'}`}>
                            {totalProfit > 0 ? '+' : ''}{totalProfit?.toLocaleString()}P
                        </p>
                    </div>
                    <div className="card">
                        <h3>보유 쿠폰</h3>
                        <p className="amount">{totalCoupon}장</p>
                    </div>
                </div>
            </header>

            <section className="portfolio-section">
                <h3>보유 주식</h3>
                <div className="table-responsive">
                    <table className="portfolio-table">
                        <thead>
                        <tr>
                            <th>종목명</th>
                            <th>보유수량</th>
                            <th>현재가</th>
                            <th>매수평균가</th>
                            <th>평가금액</th>
                            <th>평가손익</th>
                        </tr>
                        </thead>
                        <tbody>
                        {myStocks && myStocks.length > 0 ? (
                            myStocks.map((stock, idx) => (
                                <tr key={idx}>
                                    <td>{stock.stockName}</td>
                                    <td>{stock.amount.toLocaleString()}주</td>
                                    <td>{stock.currentPrice.toLocaleString()}P</td>
                                    <td>{stock.averagePrice.toLocaleString()}P</td>
                                    <td>{stock.totalPurchasePrice.toLocaleString()}P</td>
                                    <td className={stock.profit >= 0 ? 'profit-up' : 'profit-down'}>
                                        {stock.profit > 0 ? '+' : ''}{stock.profit.toLocaleString()}P
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="empty-message">보유 중인 주식이 없습니다.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
