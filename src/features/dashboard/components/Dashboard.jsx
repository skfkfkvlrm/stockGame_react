import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import api from '../../../api/axios';
import useAuthStore from '../../auth/store/useAuthStore';
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
    const user = useAuthStore((state) => state.user);
    const [assetData, setAssetData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [timeRange, setTimeRange] = useState('ALL'); // '1W', '1M', '3M', 'ALL', 'CUSTOM'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [assetRes, historyRes] = await Promise.all([
                    api.get('/asset').catch(() => ({ data: { data: null } })),
                    api.get('/history').catch(() => ({ data: { data: [] } }))
                ]);

                if (assetRes.data && assetRes.data.data) {
                    setAssetData(assetRes.data.data);
                } else {
                    setAssetData({
                        totalAsset: user?.totalPoint || 0,
                        totalPoint: user?.totalPoint || 0,
                        totalProfit: 0,
                        myStocks: []
                    });
                }

                if (historyRes.data && Array.isArray(historyRes.data.data)) {
                    setHistoryData(historyRes.data.data);
                }
            } catch (err) {
                console.error('Fetch Asset Error:', err);
                setAssetData({
                    totalAsset: user?.totalPoint || 0,
                    totalPoint: user?.totalPoint || 0,
                    totalProfit: 0,
                    myStocks: []
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboard();
    }, [user]);

    if (isLoading) return <div className="dashboard-container"><div className="loading-spinner"></div></div>;
    if (error) return <div className="dashboard-container"><div className="error-msg">{error}</div></div>;

    const totalAsset = assetData?.totalAsset ?? 0;
    const availablePoints = assetData?.totalPoint ?? assetData?.availablePoints ?? 0;
    const totalProfit = assetData?.totalProfit ?? 0;
    const portfolio = assetData?.myStocks || assetData?.portfolio || [];

    // 초기 회원가입/기초 지급 포인트를 제외한 실제 자산 변동 내역 필터링
    const isInitialGrant = (item) => {
        const content = item.historyContent || item.reason || item.description || '';
        return content.includes('회원가입') || content.includes('기초') || content.includes('초기') || content.includes('가입 지원');
    };

    const actualHistoryData = (historyData || []).filter(item => !isInitialGrant(item));

    // 전일 대비(DoD) 및 전월 대비(MoM) 증감 연산
    const computeComparisonMetrics = () => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);

        let todayChange = 0;
        let weekChange = 0;
        let monthChange = 0;

        actualHistoryData.forEach((item) => {
            const itemTime = new Date(item.historyDate || 0).getTime();
            const change = item.pointChange || 0;
            if (itemTime >= startOfToday) {
                todayChange += change;
            }
            if (itemTime >= sevenDaysAgo) {
                weekChange += change;
            }
            if (itemTime >= thirtyDaysAgo) {
                monthChange += change;
            }
        });

        // 전일 마감 자산
        const yesterdayAsset = totalAsset - todayChange;
        const dodRate = yesterdayAsset > 0 ? (todayChange / yesterdayAsset) * 100 : 0;

        // 전주 자산
        const weekAgoAsset = totalAsset - weekChange;
        const wowRate = weekAgoAsset > 0 ? (weekChange / weekAgoAsset) * 100 : 0;

        // 전월 자산
        const monthAgoAsset = totalAsset - monthChange;
        const momRate = monthAgoAsset > 0 ? (monthChange / monthAgoAsset) * 100 : 0;

        return {
            todayChange,
            dodRate,
            yesterdayAsset,
            weekChange,
            wowRate,
            weekAgoAsset,
            monthChange,
            momRate,
            monthAgoAsset
        };
    };

    const metrics = computeComparisonMetrics();

    // 동적 차트 옵션 및 데이터 산출 (히스토리 내역 기간 필터링 및 누적 시계열 파싱)
    const computeChartData = () => {
        if (!historyData || historyData.length === 0) {
            return {
                categories: ['현재'],
                seriesData: [totalAsset]
            };
        }

        const now = new Date().getTime();

        // 1. 기간 필터링
        const filteredHistory = historyData.filter((item) => {
            if (!item.historyDate) return true;
            const itemTime = new Date(item.historyDate).getTime();

            if (timeRange === '1W') {
                return itemTime >= now - (7 * 24 * 60 * 60 * 1000);
            } else if (timeRange === '1M') {
                return itemTime >= now - (30 * 24 * 60 * 60 * 1000);
            } else if (timeRange === '3M') {
                return itemTime >= now - (90 * 24 * 60 * 60 * 1000);
            } else if (timeRange === 'CUSTOM') {
                const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
                const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
                if (start && itemTime < start) return false;
                if (end && itemTime > end) return false;
                return true;
            }
            return true;
        });

        // 과거순 정렬 (오래된 날짜가 앞)
        const sortedHistory = [...filteredHistory].sort((a, b) => {
            const dateA = new Date(a.historyDate || 0).getTime();
            const dateB = new Date(b.historyDate || 0).getTime();
            return dateA - dateB;
        });

        let cumulative = 0;
        const categories = [];
        const seriesData = [];

        sortedHistory.forEach((item) => {
            const change = item.pointChange || 0;
            cumulative += change;
            const dateStr = item.historyDate
                ? new Date(item.historyDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit' })
                : '이력';
            categories.push(dateStr);
            seriesData.push(cumulative);
        });

        // 가장 최근 지점은 현재 totalAsset으로 보정
        if (seriesData.length > 0) {
            categories.push('현재 (총 자산)');
            seriesData.push(totalAsset);
        } else {
            categories.push('현재');
            seriesData.push(totalAsset);
        }

        return { categories, seriesData };
    };

    const { categories, seriesData } = computeChartData();

    const dynamicChartOptions = {
        ...chartOptions,
        xaxis: {
            ...chartOptions.xaxis,
            categories: categories
        }
    };

    const chartSeries = [{ name: '총 자산 추이', data: seriesData }];

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

            {/* 그리드 분할: 좌측 전일/전월 대비 분석 + 우측 자산 변동 추이 차트 */}
            <div className="analytics-split-grid">
                {/* 좌측: 전일 / 전월 대비 수치 카드 */}
                <div className="asset-compare-panel glass-panel">
                    <div className="section-header">
                        <h2>📊 자산 증감 분석</h2>
                    </div>

                    <div className="compare-cards-group">
                        <div className="compare-card">
                            <div className="compare-card-label">
                                <span>전일 대비</span>
                                <span className="compare-badge-sub">vs Yesterday</span>
                            </div>
                            <div className={`compare-card-value ${metrics.todayChange > 0 ? 'profit-up' : metrics.todayChange < 0 ? 'profit-down' : ''}`}>
                                <span className="val-main">{metrics.todayChange > 0 ? '+' : ''}{metrics.todayChange.toLocaleString()} P</span>
                                <span className="val-rate">({metrics.dodRate > 0 ? '+' : ''}{metrics.dodRate.toFixed(2)}%)</span>
                            </div>
                            <div className="compare-sub-text">
                                전일 기준 자산: {metrics.yesterdayAsset.toLocaleString()} P
                            </div>
                        </div>

                        <div className="compare-card">
                            <div className="compare-card-label">
                                <span>전월 대비</span>
                                <span className="compare-badge-sub">vs 30 Days Ago</span>
                            </div>
                            <div className={`compare-card-value ${metrics.monthChange > 0 ? 'profit-up' : metrics.monthChange < 0 ? 'profit-down' : ''}`}>
                                <span className="val-main">{metrics.monthChange > 0 ? '+' : ''}{metrics.monthChange.toLocaleString()} P</span>
                                <span className="val-rate">({metrics.momRate > 0 ? '+' : ''}{metrics.momRate.toFixed(2)}%)</span>
                            </div>
                            <div className="compare-sub-text">
                                30일 전 기준 자산: {metrics.monthAgoAsset.toLocaleString()} P
                            </div>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        className="btn-open-compare-modal"
                        onClick={() => setShowCompareModal(true)}
                    >
                        🔍 상세 비교 분석 리포트 보기
                    </button>
                </div>

                {/* 우측: 자산 변동 추이 차트 */}
                <div className="chart-section glass-panel">
                    <div className="section-header chart-header-with-filters">
                        <h2>📈 자산 변동 추이</h2>
                        <div className="chart-filter-controls">
                            <div className="chart-filter-tabs">
                                {[
                                    { key: 'ALL', label: '전체' },
                                    { key: '1W', label: '1주일' },
                                    { key: '1M', label: '1개월' },
                                    { key: '3M', label: '3개월' },
                                    { key: 'CUSTOM', label: '직접 설정' },
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        className={`chart-filter-btn ${timeRange === tab.key ? 'active' : ''}`}
                                        onClick={() => setTimeRange(tab.key)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {timeRange === 'CUSTOM' && (
                                <div className="chart-custom-date-inputs">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="date-input"
                                    />
                                    <span className="date-sep">~</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="date-input"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="chart-container">
                        <Chart options={dynamicChartOptions} series={chartSeries} type="area" height={280} />
                    </div>
                </div>
            </div>

            {/* 상세 비교 분석 모달 */}
            {showCompareModal && (
                <div className="modal-overlay" onClick={() => setShowCompareModal(false)}>
                    <div className="modal-content compare-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📅 자산 변동 정밀 비교 리포트</h2>
                            <button type="button" className="modal-close-btn" onClick={() => setShowCompareModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-metric-grid">
                                <div className="metric-box">
                                    <span className="box-title">전일 대비 (1일)</span>
                                    <span className={`box-value ${metrics.todayChange >= 0 ? 'profit-up' : 'profit-down'}`}>
                                        {metrics.todayChange > 0 ? '+' : ''}{metrics.todayChange.toLocaleString()} P
                                    </span>
                                    <span className="box-sub">({metrics.dodRate > 0 ? '+' : ''}{metrics.dodRate.toFixed(2)}%)</span>
                                </div>
                                <div className="metric-box">
                                    <span className="box-title">전주 대비 (7일)</span>
                                    <span className={`box-value ${metrics.weekChange >= 0 ? 'profit-up' : 'profit-down'}`}>
                                        {metrics.weekChange > 0 ? '+' : ''}{metrics.weekChange.toLocaleString()} P
                                    </span>
                                    <span className="box-sub">({metrics.wowRate > 0 ? '+' : ''}{metrics.wowRate.toFixed(2)}%)</span>
                                </div>
                                <div className="metric-box">
                                    <span className="box-title">전월 대비 (30일)</span>
                                    <span className={`box-value ${metrics.monthChange >= 0 ? 'profit-up' : 'profit-down'}`}>
                                        {metrics.monthChange > 0 ? '+' : ''}{metrics.monthChange.toLocaleString()} P
                                    </span>
                                    <span className="box-sub">({metrics.momRate > 0 ? '+' : ''}{metrics.momRate.toFixed(2)}%)</span>
                                </div>
                            </div>

                            <div className="modal-history-list-section">
                                <h3>최근 자산 변동 기록 (가입 기본 지급 제외)</h3>
                                <div className="history-table-wrapper">
                                    <table className="modal-history-table">
                                        <thead>
                                            <tr>
                                                <th>일시</th>
                                                <th>사유</th>
                                                <th>변동 포인트</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(!actualHistoryData || actualHistoryData.length === 0) ? (
                                                <tr>
                                                    <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                                                        기록된 변동 내역이 없습니다.
                                                    </td>
                                                </tr>
                                            ) : (
                                                [...actualHistoryData].reverse().slice(0, 10).map((h, i) => (
                                                    <tr key={i}>
                                                        <td>{h.historyDate ? new Date(h.historyDate).toLocaleString('ko-KR') : '-'}</td>
                                                        <td>{h.historyContent || h.reason || h.description || h.historyType || '변동'}</td>
                                                        <td className={(h.pointChange || 0) >= 0 ? 'profit-up' : 'profit-down'}>
                                                             {(h.pointChange || 0) > 0 ? '+' : ''}{(h.pointChange || 0).toLocaleString()} P
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                portfolio.map((stock, idx) => {
                                    const name = stock.stockName || stock.name || '주식';
                                    const avgPrice = stock.averagePrice ?? stock.avgPrice ?? 0;
                                    const currentPrice = stock.currentPrice ?? 0;
                                    const amount = stock.amount ?? 0;
                                    const profit = stock.profit ?? ((currentPrice - avgPrice) * amount);
                                    const rate = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
                                    const profitClass = profit > 0 ? 'profit-up' : profit < 0 ? 'profit-down' : '';

                                    return (
                                        <tr key={stock.stockId || idx}>
                                            <td className="stock-name">
                                                <div className="stock-info">
                                                    <div className="stock-icon">{name.charAt(0)}</div>
                                                    {name}
                                                </div>
                                            </td>
                                            <td>{amount}주</td>
                                            <td>{avgPrice.toLocaleString()} P</td>
                                            <td>{currentPrice.toLocaleString()} P</td>
                                            <td className={profitClass}>
                                                <div className="flex-right">
                                                    {profit > 0 ? <ArrowUpRight size={16} /> : profit < 0 ? <ArrowDownRight size={16} /> : ''}
                                                    {profit > 0 ? '+' : ''}{profit.toLocaleString()} P
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
