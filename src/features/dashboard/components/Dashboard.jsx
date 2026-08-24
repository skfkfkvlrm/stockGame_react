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
    const [chartType, setChartType] = useState('area'); // 'area' | 'line'
    
    // 자산 추이 기간 게이지 스텝 정의 (0: 오늘/실시간 ~ 4: 전체/가입이래)
    const TIMEFRAME_STEPS = [
        { label: '당일 (실시간)', days: 1, desc: '오늘 장 시작 ~ 현재 변동' },
        { label: '1주일', days: 7, desc: '최근 7일간 자산 추이' },
        { label: '1개월', days: 30, desc: '최근 30일간 자산 추이' },
        { label: '3개월', days: 90, desc: '최근 90일간 자산 추이' },
        { label: '전체 (ALL)', days: 0, desc: '가입 이래 전체 누적 자산 추이' }
    ];
    const [timeframeIndex, setTimeframeIndex] = useState(4); // 기본값: 4 (전체)

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

    // 동적 차트 옵션 및 데이터 산출 (게이지 슬라이더 기반 시계열 필터링)
    const computeChartData = () => {
        if (!historyData || historyData.length === 0) {
            return {
                categories: ['현재'],
                seriesData: [totalAsset]
            };
        }

        const now = new Date().getTime();
        const currentStep = TIMEFRAME_STEPS[timeframeIndex] || TIMEFRAME_STEPS[4];
        const cutoffTime = currentStep.days > 0 ? now - (currentStep.days * 24 * 60 * 60 * 1000) : 0;

        // 1. 기간 필터링
        const filteredHistory = historyData.filter((item) => {
            if (!item.historyDate) return true;
            const itemTime = new Date(item.historyDate).getTime();
            return itemTime >= cutoffTime;
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
            const dateObj = new Date(item.historyDate);
            const dateStr = item.historyDate
                ? (timeframeIndex === 0 
                    ? `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`
                    : `${dateObj.getMonth() + 1}/${dateObj.getDate()}`)
                : '이력';
            categories.push(dateStr);
            seriesData.push(cumulative);
        });

        // 가장 최근 지점은 현재 totalAsset으로 보정
        if (seriesData.length > 0) {
            categories.push('현재');
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
        chart: { ...chartOptions.chart, type: chartType },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { ...chartOptions.xaxis, categories: categories } 
    };
    const chartSeries = [{ name: '총 자산 추이', data: seriesData }];

    const computeProfitBreakdown = () => {
        const unrealizedList = (portfolio || []).map(stk => {
            const name = stk.stockName || stk.name || '주식';
            const amount = stk.amount || 0;
            const avgPrice = stk.averagePrice ?? stk.avgPrice ?? 0;
            const currentPrice = stk.currentPrice ?? stk.nowPrice ?? avgPrice;
            const profit = stk.profit ?? ((currentPrice - avgPrice) * amount);
            const rate = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
            return { name, amount, avgPrice, currentPrice, profit, rate, type: 'UNREALIZED' };
        });
        const sortedByProfit = [...unrealizedList].sort((a, b) => b.profit - a.profit);
        const bestStock = sortedByProfit.length > 0 && sortedByProfit[0].profit > 0 ? sortedByProfit[0] : null;
        const worstStock = sortedByProfit.length > 0 && sortedByProfit[sortedByProfit.length - 1].profit < 0 ? sortedByProfit[sortedByProfit.length - 1] : null;
        return { unrealizedList, bestStock, worstStock };
    };

    const profitBreakdown = computeProfitBreakdown();

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
                        <h3>총 순자산 (Total Assets)</h3>
                    </div>
                    <div className="stat-value">{totalAsset.toLocaleString()} <span className="currency">P</span></div>
                </div>
                <div 
                    className="stat-card stat-card-profit"
                    style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
                    onClick={() => setActiveModalTab('PROFIT')}
                    title="클릭하여 종목별 손익 원인 분석 보기"
                >
                    <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="stat-icon-wrapper red"><TrendingUp size={20} /></div>
                            <h3>투자 평가 손익 (Profit)</h3>
                        </div>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700', color: '#475569' }}>
                            분석 🔍
                        </span>
                    </div>
                    <div className={`stat-value ${totalProfit > 0 ? 'profit-up' : totalProfit < 0 ? 'profit-down' : ''}`}>
                        {totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString()} <span className="currency">P</span>
                    </div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper blue"><Activity size={20} /></div>
                        <h3>보유 현금 포인트 (Cash)</h3>
                    </div>
                    <div className="stat-value">{availablePoints.toLocaleString()} <span className="currency">P</span></div>
                </div>
            </div>

            <div className="analytics-split-grid">
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
                            <div className="compare-sub-text">전일 기준 자산: {metrics.yesterdayAsset.toLocaleString()} P</div>
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
                            <div className="compare-sub-text">30일 전 기준 자산: {metrics.monthAgoAsset.toLocaleString()} P</div>
                        </div>
                    </div>
                    <button type="button" className="btn-open-compare-modal" onClick={() => setActiveModalTab('COMPARE')}>
                        🔍 자산 변동 정밀 비교 리포트 보기
                    </button>
                </div>
                <div className="chart-section glass-panel">
                    <div className="section-header chart-header-with-filters">
                        <h2>📈 자산 변동 추이</h2>
                        <div className="chart-controls-header-mini">
                            <div className="chart-type-tabs-mini">
                                <button 
                                    className={`chart-type-btn-mini ${chartType === 'area' ? 'active' : ''}`}
                                    onClick={() => setChartType('area')}
                                    type="button"
                                >
                                    영역
                                </button>
                                <button 
                                    className={`chart-type-btn-mini ${chartType === 'line' ? 'active' : ''}`}
                                    onClick={() => setChartType('line')}
                                    type="button"
                                >
                                    라인
                                </button>
                            </div>

                            <div className="selected-timeframe-badge-mini">
                                <span className="badge-txt">{TIMEFRAME_STEPS[timeframeIndex].label}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="chart-container">
                        <Chart options={dynamicChartOptions} series={chartSeries} type={chartType} height={280} />
                    </div>

                    {/* 자산 추이 기간 게이지 슬라이더 */}
                    <div className="timeframe-gauge-container-dash">
                        <div className="gauge-track-wrapper">
                            <input
                                type="range"
                                min="0"
                                max={TIMEFRAME_STEPS.length - 1}
                                step="1"
                                value={timeframeIndex}
                                onChange={(e) => setTimeframeIndex(parseInt(e.target.value, 10))}
                                className="timeframe-gauge-slider"
                            />
                            <div className="gauge-step-labels">
                                {TIMEFRAME_STEPS.map((step, idx) => (
                                    <span 
                                        key={step.label} 
                                        className={`gauge-step-label ${idx === timeframeIndex ? 'active' : ''}`}
                                        onClick={() => setTimeframeIndex(idx)}
                                    >
                                        {step.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 통합 상호 전환 분석 모달 */}
            {activeModalTab && (
                <div className="modal-overlay" onClick={() => setActiveModalTab(null)}>
                    <div className="modal-content compare-modal glass-panel" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.4rem' }}>{activeModalTab === 'COMPARE' ? '📅' : '🎯'}</span>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
                                    {activeModalTab === 'COMPARE' ? '자산 변동 정밀 비교 리포트' : '종목별 투자 손익 원인 분석'}
                                </h2>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setActiveModalTab(null)}>✕</button>
                        </div>

                        {/* 모달 내부 상호 전환 탭 네비게이션 */}
                        <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', background: 'rgba(241, 245, 249, 0.7)', borderBottom: '1px solid #e2e8f0' }}>
                            <button
                                type="button"
                                style={{
                                    flex: 1,
                                    padding: '9px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: activeModalTab === 'COMPARE' ? '#6366f1' : 'transparent',
                                    color: activeModalTab === 'COMPARE' ? 'white' : '#64748b',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: activeModalTab === 'COMPARE' ? '0 2px 6px rgba(99, 102, 241, 0.3)' : 'none'
                                }}
                                onClick={() => setActiveModalTab('COMPARE')}
                            >
                                📅 자산 변동 정밀 비교 (기간별)
                            </button>
                            <button
                                type="button"
                                style={{
                                    flex: 1,
                                    padding: '9px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: activeModalTab === 'PROFIT' ? '#6366f1' : 'transparent',
                                    color: activeModalTab === 'PROFIT' ? 'white' : '#64748b',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: activeModalTab === 'PROFIT' ? '0 2px 6px rgba(99, 102, 241, 0.3)' : 'none'
                                }}
                                onClick={() => setActiveModalTab('PROFIT')}
                            >
                                🎯 종목별 손익 원인 분석 (종목별)
                            </button>
                        </div>

                        <div className="modal-body" style={{ padding: '24px' }}>
                            {/* TAB 1: 자산 변동 정밀 비교 */}
                            {activeModalTab === 'COMPARE' && (
                                <>
                                    <div className="modal-metric-grid">
                                        <div className="metric-box">
                                            <span className="box-title">전일 대비 (1일)</span>
                                            <span className={`box-value ${metrics.todayChange >= 0 ? 'profit-up' : 'profit-down'}`}>{metrics.todayChange > 0 ? '+' : ''}{metrics.todayChange.toLocaleString()} P</span>
                                            <span className="box-sub">({metrics.dodRate > 0 ? '+' : ''}{metrics.dodRate.toFixed(2)}%)</span>
                                        </div>
                                        <div className="metric-box">
                                            <span className="box-title">전주 대비 (7일)</span>
                                            <span className={`box-value ${metrics.weekChange >= 0 ? 'profit-up' : 'profit-down'}`}>{metrics.weekChange > 0 ? '+' : ''}{metrics.weekChange.toLocaleString()} P</span>
                                            <span className="box-sub">({metrics.wowRate > 0 ? '+' : ''}{metrics.wowRate.toFixed(2)}%)</span>
                                        </div>
                                        <div className="metric-box">
                                            <span className="box-title">전월 대비 (30일)</span>
                                            <span className={`box-value ${metrics.monthChange >= 0 ? 'profit-up' : 'profit-down'}`}>{metrics.monthChange > 0 ? '+' : ''}{metrics.monthChange.toLocaleString()} P</span>
                                            <span className="box-sub">({metrics.momRate > 0 ? '+' : ''}{metrics.momRate.toFixed(2)}%)</span>
                                        </div>
                                    </div>

                                    <div className="modal-history-list-section" style={{ marginTop: '20px' }}>
                                        <h3>최근 자산 변동 기록 (가입 기본 지원금 제외)</h3>
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
                                </>
                            )}

                            {/* TAB 2: 종목별 투자 손익 원인 분석 */}
                            {activeModalTab === 'PROFIT' && (
                                <>
                                    <div className="modal-metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '20px' }}>
                                        <div className="metric-box">
                                            <span className="box-title">총 투자 평가 손익</span>
                                            <span className={`box-value ${totalProfit >= 0 ? 'profit-up' : 'profit-down'}`}>{totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString()} P</span>
                                        </div>
                                        <div className="metric-box">
                                            <span className="box-title">최고 수익 종목 (BEST)</span>
                                            <span className="box-value profit-up" style={{ fontSize: '1.05rem' }}>{profitBreakdown.bestStock ? `${profitBreakdown.bestStock.name} (+${profitBreakdown.bestStock.profit.toLocaleString()}P)` : '없음'}</span>
                                        </div>
                                        <div className="metric-box">
                                            <span className="box-title">최대 손실 종목 (WORST)</span>
                                            <span className="box-value profit-down" style={{ fontSize: '1.05rem' }}>{profitBreakdown.worstStock ? `${profitBreakdown.worstStock.name} (${profitBreakdown.worstStock.profit.toLocaleString()}P)` : '없음'}</span>
                                        </div>
                                    </div>
                                    <div className="modal-history-list-section">
                                        <h3>보유 종목별 손익 기여도 현황</h3>
                                        <div className="history-table-wrapper">
                                            <table className="modal-history-table">
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
                                                    {profitBreakdown.unrealizedList.length === 0 ? (
                                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>보유 중인 주식이 없습니다.</td></tr>
                                                    ) : (
                                                        profitBreakdown.unrealizedList.map((stk, i) => (
                                                            <tr key={i}>
                                                                <td style={{ fontWeight: '700' }}>{stk.name}</td>
                                                                <td>{stk.amount} 주</td>
                                                                <td>{stk.avgPrice.toLocaleString()} P</td>
                                                                <td>{stk.currentPrice.toLocaleString()} P</td>
                                                                <td className={stk.profit >= 0 ? 'profit-up' : 'profit-down'} style={{ fontWeight: '700' }}>{stk.profit > 0 ? '+' : ''}{stk.profit.toLocaleString()} P</td>
                                                                <td className={stk.rate >= 0 ? 'profit-up' : 'profit-down'} style={{ fontWeight: '700' }}>{stk.rate > 0 ? '+' : ''}{stk.rate.toFixed(2)}%</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="portfolio-section glass-panel">
                <div className="section-header"><h2>보유 주식 목록</h2></div>
                <div className="table-responsive">
                    <table className="portfolio-table">
                        <thead><tr><th>종목명</th><th>보유 수량</th><th>매수 평균가</th><th>현재가</th><th>평가 손익</th><th>수익률</th></tr></thead>
                        <tbody>
                            {portfolio.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>보유 중인 주식이 없습니다.</td></tr>
                            ) : (
                                portfolio.map((stock, idx) => {
                                    const name = stock.stockName || stock.name || '주식';
                                    const avgPrice = stock.averagePrice ?? stock.avgPrice ?? 0;
                                    const currentPrice = stock.currentPrice ?? stock.nowPrice ?? avgPrice;
                                    const amount = stock.amount ?? 0;
                                    const profit = stock.profit ?? ((currentPrice - avgPrice) * amount);
                                    const rate = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
                                    const isProfit = profit >= 0;
                                    return (
                                        <tr key={idx}>
                                            <td className="stock-name-cell font-bold">{name}</td>
                                            <td>{amount} 주</td>
                                            <td>{avgPrice.toLocaleString()} P</td>
                                            <td>{currentPrice.toLocaleString()} P</td>
                                            <td className={`font-bold ${isProfit ? 'profit-up' : 'profit-down'}`}>{isProfit ? '+' : ''}{profit.toLocaleString()} P</td>
                                            <td className={`font-bold ${isProfit ? 'profit-up' : 'profit-down'}`}>{isProfit ? '+' : ''}{rate.toFixed(2)}%</td>
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
