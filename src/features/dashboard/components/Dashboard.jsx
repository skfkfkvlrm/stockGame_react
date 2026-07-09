import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import api from '../../../api/axios';
import './Dashboard.css';

// STATIC CONFIGURATIONS
const chartOptions = {
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
    colors: ['#8b5cf6'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: { categories: ['1일', '2일', '3일', '4일', '5일', '6일', '오늘'], axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: '#94a3b8' } } },
    yaxis: { labels: { style: { colors: '#94a3b8' }, formatter: (value) => value.toLocaleString() } },
    grid: { borderColor: 'rgba(0,0,0,0.05)', strokeDashArray: 4 },
    theme: { mode: 'light' }
};

const chartSeriesDefault = [{ name: '총 자산', data: [] }];

const calculateProfit = (avg, current, amount) => {
    const diff = (current - avg) * amount;
    const rate = avg > 0 ? ((current - avg) / avg) * 100 : 0;
    return { diff, rate };
};

const Dashboard = () => {
    const [assetData, setAssetData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await api.get('/asset/');
                setAssetData(response.data.data);
            } catch (err) {
                setError(err.response?.data?.message || '자산 정보를 불러오는 데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (isLoading) return <div className="dashboard-container"><div className="loading-spinner"></div></div>;
    if (error) return <div className="dashboard-container"><div className="error-msg">{error}</div></div>;

    const totalAsset = assetData?.totalAsset || 0;
    const availablePoints = assetData?.availablePoints || 0;
    const totalProfit = assetData?.totalProfit || 0;
    const portfolio = assetData?.portfolio || [];
    
    // For now, keep the chart static or empty if there's no history in assetData
    const chartSeries = [{ name: '총 자산', data: [totalAsset] }];

    return (
        <div className="dashboard-container">
            <header className="page-header">
                <h1 className="page-title">내 자산 대시보드</h1>
                <p className="page-subtitle">보유 중인 주식 포트폴리오와 자산 현황을 한눈에 확인하세요.</p>
            </header>

            <div className="summary-cards">
                <div className="glass-panel stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper purple"><Wallet size={20} /></div>
                        <h3>총 자산 (포인트 + 주식)</h3>
                    </div>
                    <div className="stat-value">{totalAsset.toLocaleString()} <span className="currency">P</span></div>
                </div>
                <div className="stat-card stat-card-profit">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper red"><TrendingUp size={20} /></div>
                        <h3>평가 손익</h3>
                    </div>
                    <div className={`stat-value ${totalProfit > 0 ? 'profit-up' : totalProfit < 0 ? 'profit-down' : ''}`}>
                        {totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString()} <span className="currency">P</span>
                    </div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper blue"><Activity size={20} /></div>
                        <h3>주문 가능 포인트</h3>
                    </div>
                    <div className="stat-value">{availablePoints.toLocaleString()} <span className="currency">P</span></div>
                </div>
            </div>

            <div className="chart-section glass-panel">
                <div className="section-header">
                    <h2>자산 변동 추이</h2>
                </div>
                <div className="chart-container">
                    <Chart options={chartOptions} series={chartSeries} type="area" height={300} />
                </div>
            </div>

            <div className="portfolio-section glass-panel">
                <div className="section-header">
                    <h2>보유 주식 목록</h2>
                </div>
                <div className="table-responsive">
                    <table className="portfolio-table">
                        <thead>
                            <tr>
                                <th>종목명</th>
                                <th>보유 수량</th>
                                <th>매수 평균가</th>
                                <th>현재가</th>
                                <th>평가 손익</th>
                                <th>수익률</th>
                            </tr>
                        </thead>
                        <tbody>
                            {portfolio.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        보유 중인 주식이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                portfolio.map(stock => {
                                    const { diff, rate } = calculateProfit(stock.avgPrice, stock.currentPrice, stock.amount);
                                    const profitClass = diff > 0 ? 'profit-up' : diff < 0 ? 'profit-down' : '';
                                    return (
                                        <tr key={stock.id || stock.stockId}>
                                            <td className="stock-name">
                                                <div className="stock-info">
                                                    <div className="stock-icon">{stock.name.charAt(0)}</div>
                                                    {stock.name}
                                                </div>
                                            </td>
                                            <td>{stock.amount}주</td>
                                            <td>{stock.avgPrice.toLocaleString()}</td>
                                            <td>{stock.currentPrice.toLocaleString()}</td>
                                            <td className={profitClass}>
                                                <div className="flex-right">
                                                    {diff > 0 ? <ArrowUpRight size={16} /> : diff < 0 ? <ArrowDownRight size={16} /> : ''}
                                                    {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className={profitClass}>
                                                {rate > 0 ? '+' : ''}{rate.toFixed(2)}%
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
