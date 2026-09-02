import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import api from '../../../api/axios';
import useAuthStore from '../../auth/store/useAuthStore';
import useMarketStore from '../../admin/store/useMarketStore';
import { useStompResilience, ConnectionStatus } from '../../core/hooks/useStompResilience';
import './StockDetail.css';

const StockDetail = () => {
    const { stockId } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);
    const marketOpen = useMarketStore((state) => state.marketOpen);
    const statusCode = useMarketStore((state) => state.statusCode);
    const openTime = useMarketStore((state) => state.openTime);
    const closeTime = useMarketStore((state) => state.closeTime);
    const fetchMarketStatus = useMarketStore((state) => state.fetchMarketStatus);
    
    const [stockInfo, setStockInfo] = useState(null);
    const [rawHistoryData, setRawHistoryData] = useState([]);
    const [chartData, setChartData] = useState([]);
    const ALL_TIMEFRAMES = [
        { id: '1M', label: '1분', days: 1/1440, desc: '최근 1분 시세' },
        { id: '3M', label: '3분', days: 3/1440, desc: '최근 3분 시세' },
        { id: '10M', label: '10분', days: 10/1440, desc: '최근 10분 시세' },
        { id: '1H', label: '1시간', days: 1/24, desc: '최근 1시간 시세' },
        { id: '3H', label: '3시간', days: 3/24, desc: '최근 3시간 시세' },
        { id: '6H', label: '6시간', days: 6/24, desc: '최근 6시간 시세' },
        { id: '12H', label: '12시간', days: 12/24, desc: '최근 12시간 시세' },
        { id: '1D', label: '1일', days: 1, desc: '오늘 장 시작 ~ 현재' },
        { id: '1W', label: '1주', days: 7, desc: '최근 7일간 시세' },
        { id: '1MO', label: '1개월', days: 30, desc: '최근 30일간 시세' },
        { id: '3MO', label: '3개월', days: 90, desc: '최근 90일간 시세' },
        { id: 'ALL', label: '전체', days: 0, desc: '상장 초기 ~ 현재' }
    ];
    const quickTabs = ['10M', '1H', '1D', '1W'];
    
    const [activeTimeframeId, setActiveTimeframeId] = useState('1D');
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const activeTimeframe = ALL_TIMEFRAMES.find(t => t.id === activeTimeframeId) || ALL_TIMEFRAMES[7];

    const [orderbook, setOrderbook] = useState({ buy: [], sell: [] });
    const [myOrders, setMyOrders] = useState([]);
    const [myStockAmount, setMyStockAmount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Toast notification
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const toastTimerRef = useRef(null);

    const showToast = (message, type = 'success') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ show: true, message, type });
        toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
    };
    
    const [tradeType, setTradeType] = useState('BUY'); // BUY or SELL
    const [price, setPrice] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mobile/Desktop Drag-to-Scroll for Detail Layout
    const scrollContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        // Prevent dragging when clicking interactive elements (buttons, inputs, order rows)
        if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(e.target.tagName) || e.target.closest('.order-row') || e.target.closest('.trade-form') || e.target.closest('.chart-controls-header')) {
            return;
        }
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const handleMouseLeaveOrUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll speed multiplier
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    // Fetch initial data
    const fetchAllData = async () => {
        try {
            const [infoRes, historyRes, orderbookRes, myOrdersRes, assetRes] = await Promise.all([
                api.get(`/stock/${stockId}`).catch(e => ({ data: { success: false, data: null } })),
                api.get(`/stock/${stockId}/history`).catch(e => ({ data: { success: false, data: [] } })),
                api.get(`/stock/${stockId}/orderbook`).catch(e => ({ data: { success: false, data: { sell: [], buy: [] } } })),
                api.get(`/stock/${stockId}/orders/my`).catch(e => ({ data: { success: false, data: [] } })),
                api.get('/asset').catch(e => ({ data: { success: false, data: null } }))
            ]);
            
            const info = infoRes.data?.data;
            if (!info) {
                setError('종목 정보를 불러올 수 없습니다.');
                setIsLoading(false);
                return;
            }

            setStockInfo(info);
            const initialPrice = info.nowPrice ?? info.pubPrice ?? 0;
            if (price === 0) setPrice(initialPrice);

            // Set my stock holding amount
            if (assetRes.data?.data?.myStocks) {
                const myStockItem = assetRes.data.data.myStocks.find(s => s.stockName === info.stockName);
                setMyStockAmount(myStockItem ? myStockItem.amount : 0);
            }

            const rawHistory = Array.isArray(historyRes.data?.data) ? historyRes.data.data : [];
            setRawHistoryData(rawHistory);

            const aggregateOrders = (orders) => {
                if (!Array.isArray(orders)) return [];
                const map = {};
                orders.forEach(o => {
                    if (!o || o.price === undefined) return;
                    if (!map[o.price]) map[o.price] = 0;
                    map[o.price] += (o.amount || 0);
                });
                return Object.entries(map).map(([p, amt]) => ({
                    price: parseInt(p),
                    amount: amt
                }));
            };

            const sellOrders = orderbookRes.data?.data?.sell || [];
            const buyOrders = orderbookRes.data?.data?.buy || [];

            const sellGrouped = aggregateOrders(sellOrders).sort((a, b) => b.price - a.price);
            const buyGrouped = aggregateOrders(buyOrders).sort((a, b) => b.price - a.price);

            setOrderbook({
                sell: sellGrouped.slice(-10),
                buy: buyGrouped.slice(0, 10)
            });

            if (Array.isArray(myOrdersRes.data?.data)) {
                setMyOrders(myOrdersRes.data.data);
            } else {
                setMyOrders([]);
            }
            
        } catch (err) {
            console.error('Fetch Stock Detail Error:', err);
            setError('데이터를 불러오는 데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [stockId]);

    // Resilience STOMP Hook
    const { status: wsStatus, retryCount } = useStompResilience({
        url: 'http://localhost:8082/ws',
        subscriptions: [
            {
                topic: `/topic/orders/${stockId}`,
                callback: (msg) => {
                    if (msg.body === 'ORDER_UPDATED' || msg.body === 'STATIC_VI_TRIGGERED' || msg.body === 'STATIC_VI_RELEASED') {
                        fetchAllData();
                        if (msg.body === 'STATIC_VI_TRIGGERED') {
                            showToast('정적 VI(변동성 완화장치)가 발동되었습니다. 2분간 단일가 매매로 전환됩니다.', 'error');
                        } else if (msg.body === 'STATIC_VI_RELEASED') {
                            showToast('정적 VI가 해제되어 정규장(연속매매)으로 복귀했습니다.', 'success');
                        }
                    }
                }
            }
        ],
        maxReconnectAttempts: 5
    });

    // 기간 게이지 및 원본 히스토리에 따른 차트 데이터 변환 (항상 최상단 훅 영역에서 실행)
    useEffect(() => {
        const initialPrice = stockInfo?.nowPrice ?? stockInfo?.pubPrice ?? 0;
        const currentStep = ALL_TIMEFRAMES.find(t => t.id === activeTimeframeId) || ALL_TIMEFRAMES[7];
        const now = Date.now();
        const cutoffTime = currentStep.days > 0 ? now - (currentStep.days * 24 * 60 * 60 * 1000) : 0;
        const isIntraday = activeTimeframeId.endsWith('M') || activeTimeframeId.endsWith('H') || activeTimeframeId === '1D';

        let filtered = rawHistoryData.filter(item => {
            const d = item.baseDate || item.date || item.createdDate;
            if (!d) return true;
            const itemTime = new Date(d).getTime();
            return itemTime >= cutoffTime;
        });

        if (filtered.length === 0) {
            filtered = [{ date: new Date(), price: initialPrice }];
        }

        
            if (!isIntraday) {
                // 일/주/월/전체: 실제 거래일의 OHLC 집계 (category x축용 문자열 라벨 사용)
                const dayGroups = {};
                filtered.forEach(item => {
                    const d = item.baseDate || item.date || item.createdDate;
                    const dateObj = new Date(d || Date.now());
                    const dateKey = d ? dateObj.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                    const label = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
                    const p = item.closePrice ?? item.price ?? initialPrice;
                    const open = item.openPrice ?? p;
                    const high = item.highPrice ?? Math.max(open, p);
                    const low = item.lowPrice ?? Math.min(open, p);
                    const close = item.closePrice ?? p;

                    if (!dayGroups[dateKey]) {
                        dayGroups[dateKey] = { label, rawTime: dateObj.getTime(), open, high, low, close };
                    } else {
                        dayGroups[dateKey].high = Math.max(dayGroups[dateKey].high, high);
                        dayGroups[dateKey].low = Math.min(dayGroups[dateKey].low, low);
                        dayGroups[dateKey].close = close;
                    }
                });

                let finalCandles;

                if (activeTimeframeId === '1W') {
                    // 1주: 7일 전체를 반드시 표시. 거래 없는 날은 null 캔들로 채움
                    finalCandles = [];
                    const rangeStart = new Date(cutoffTime);
                    const rangeEnd = new Date(now);
                    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
                        const dateKey = d.toISOString().slice(0, 10);
                        const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                        const g = dayGroups[dateKey];
                        finalCandles.push({
                            x: label,
                            y: g ? [g.open, g.high, g.low, g.close] : [null, null, null, null]
                        });
                    }
                } else {
                    // 1MO, 3MO, ALL: 실제 거래일만 표시
                    finalCandles = Object.values(dayGroups)
                        .sort((a, b) => a.rawTime - b.rawTime)
                        .map(g => ({ x: g.label, y: [g.open, g.high, g.low, g.close] }));
                }

                setChartData([{ data: finalCandles }]);
            } else {
                // 당일/시간 단위 (category x축용 시간 문자열 사용)
                const mappedCandle = filtered.map(item => {
                    const d = item.baseDate || item.date || item.createdDate;
                    const dateObj = new Date(d || Date.now());
                    const label = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                    const p = item.closePrice ?? item.price ?? initialPrice;
                    const open = item.openPrice ?? p;
                    const high = item.highPrice ?? Math.max(open, p);
                    const low = item.lowPrice ?? Math.min(open, p);
                    const close = item.closePrice ?? p;
                    return { x: label, y: [open, high, low, close] };
                });
                setChartData([{ data: mappedCandle }]);
            }
    }, [rawHistoryData, activeTimeframeId, stockInfo]);

    if (isLoading) return <div className="stock-detail-container"><div className="loading-spinner"></div></div>;
    if (error || !stockInfo) return <div className="stock-detail-container"><div className="error-msg">{error || '종목이 존재하지 않습니다.'}</div></div>;

    const isUp = (stockInfo.nowPrice - stockInfo.prevPrice) > 0;
    const changeAmount = stockInfo.nowPrice - stockInfo.prevPrice;
    const changeRate = stockInfo.prevPrice !== 0 ? ((changeAmount / stockInfo.prevPrice) * 100).toFixed(2) : 0;
    const colorClass = changeAmount > 0 ? 'profit-up' : changeAmount < 0 ? 'profit-down' : '';

    const handleQuantityChange = (e) => {
        const value = parseInt(e.target.value, 10);
        setQuantity(isNaN(value) || value < 1 ? '' : value);
    };

    const handlePriceChange = (e) => {
        const value = parseInt(e.target.value, 10);
        setPrice(isNaN(value) || value < 1 ? '' : value);
    };

    const handleOrderbookClick = (clickedPrice) => {
        setPrice(clickedPrice);
    };

    const handleTrade = async () => {
        const qty = quantity || 0;
        const prc = price || 0;
        if (qty <= 0 || prc <= 0) {
            showToast('올바른 가격과 수량을 입력해주세요.', 'error');
            return;
        }
        
        const totalAmount = prc * qty;
        
        if (tradeType === 'BUY' && totalAmount > (user?.totalPoint ?? user?.point ?? 0)) {
            showToast('주문 가능 포인트를 초과했습니다.', 'error');
            return;
        }
        
        if (tradeType === 'SELL' && qty > myStockAmount) {
            showToast(`보유 주식 수량(${myStockAmount}주)을 초과하여 매도할 수 없습니다.`, 'error');
            return;
        }

        const tradeTypeText = tradeType === 'BUY' ? '매수' : '매도';
        const confirmMessage = `[${stockInfo.name}] 종목을 다음과 같이 ${tradeTypeText} 주문하시겠습니까?\n\n` +
            `• 주문 유형: ${tradeTypeText} 주문\n` +
            `• 주문 가격: ${prc.toLocaleString()} P\n` +
            `• 주문 수량: ${qty.toLocaleString()} 주\n` +
            `• 총 주문 금액: ${totalAmount.toLocaleString()} P\n\n` +
            `확인 시 잔고 및 주문이 즉시 반영됩니다.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }
        
        setIsSubmitting(true);
        try {
            const endpoint = tradeType === 'BUY' ? '/orders/buy' : '/orders/sell';
            await api.post(endpoint, {
                stockId: parseInt(stockId),
                amount: qty,
                quantity: qty,
                price: prc
            });
            setIsSubmitting(false);
            const successMsg = tradeType === 'BUY' ? '매수 주문이 접수되었습니다.' : '매도 주문이 접수되었습니다.';
            showToast(successMsg, 'success');
            setQuantity(1);
            fetchAllData();
            checkAuthStatus();
        } catch (err) {
            setIsSubmitting(false);
            const errMsg = err.response?.data?.message || '주문 처리에 실패했습니다.';
            showToast(errMsg, 'error');
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('선택한 예약 주문을 정말 취소하시겠습니까?')) return;
        try {
            await api.post(`/orders/cancel?orderId=${orderId}&stockId=${stockId}`);
            showToast('주문이 취소되었습니다.', 'success');
            fetchAllData();
            checkAuthStatus();
        } catch (err) {
            const errMsg = err.response?.data?.message || '주문 취소 처리에 실패했습니다.';
            showToast(errMsg, 'error');
        }
    };

    const getTickAmount = (tfId) => {
        if (tfId === '10M') return 5;
        if (tfId === '1H' || tfId === '3H' || tfId === '6H' || tfId === '12H' || tfId === '1D') return 6;
        if (tfId === '1W') return 7; // 1주일은 7일 전체 표시
        if (tfId === '1MO') return 6;
        if (tfId === '3MO') return 6;
        return 6;
    };

    const currentStepConfig = ALL_TIMEFRAMES.find(t => t.id === activeTimeframeId) || ALL_TIMEFRAMES[7];
    const nowTime = Date.now();
    const minTime = currentStepConfig.days > 0 ? nowTime - (currentStepConfig.days * 24 * 60 * 60 * 1000) : undefined;

    const chartOptions = {
        chart: { 
            type: "candlestick", 
            background: 'transparent', 
            toolbar: { 
                show: false,
                autoSelected: 'pan' 
            }, 
            animations: { enabled: true, easing: 'easeinout', speed: 400 },
            zoom: { enabled: false },
            selection: { enabled: false }
        },
        theme: { mode: 'light' },
        stroke: { curve: "smooth", width: 1 },
        
        plotOptions: { 
            candlestick: { 
                colors: { upward: '#ff4757', downward: '#3b82f6' } 
            } 
        },
        xaxis: {
            type: 'category',
            labels: {
                style: { colors: '#64748b', fontSize: '0.8rem' },
                hideOverlappingLabels: true,
            }
        },
        yaxis: { 
            labels: { 
                style: { colors: '#64748b' }, 
                formatter: (v) => `${Math.round(v).toLocaleString()}원` 
            } 
        },
        grid: { 
            borderColor: '#cbd5e1', 
            strokeDashArray: 3,
            opacity: 0.8,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
        },
        tooltip: {
            theme: 'light',
            x: { format: 'yyyy-MM-dd HH:mm:ss' }
        }
    };

    const maxOrderAmount = Math.max(
        ...orderbook.buy.map(o => o.amount),
        ...orderbook.sell.map(o => o.amount),
        1
    );

    const mySellPrices = myOrders.filter(o => o.content === 'SELL' || o.content === '매도').map(o => o.price);
    const myBuyPrices = myOrders.filter(o => o.content === 'BUY' || o.content === '매수').map(o => o.price);

    const currentPriceVal = stockInfo?.nowPrice ?? stockInfo?.pubPrice ?? 0;
    const availablePoints = user?.totalPoint ?? user?.point ?? 0;
    const maxBuyQuantity = currentPriceVal > 0 ? Math.floor(availablePoints / currentPriceVal) : 0;

    return (
        <div className="stock-detail-container">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`trade-toast trade-toast--${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="trade-toast__close" onClick={() => setToast(t => ({ ...t, show: false }))}>✕</button>
                </div>
            )}

            <button className="back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} /> 뒤로 가기
            </button>
            
            <div 
                className={`detail-layout-scroll-wrapper ${isDragging ? 'dragging' : ''}`}
                ref={scrollContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeaveOrUp}
                onMouseUp={handleMouseLeaveOrUp}
                onMouseMove={handleMouseMove}
            >
                <div className="detail-layout">
                    {/* 1. Chart Section */}
                    <div className="chart-section">
                        <div className="glass-panel stock-header">
                            <div className="stock-title">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h1>{stockInfo.stockName}</h1>
                                    {stockInfo.marketStatus === 'STATIC_VI' && (
                                        <div style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: '#f59e0b',
                                            color: '#fff',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            letterSpacing: '0.02em',
                                            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                                            animation: 'pulse-amber 2s infinite'
                                        }}>
                                            정적 VI 발동 중
                                        </div>
                                    )}
                                    <div 
                                        className={`ws-status-badge status-${wsStatus ? wsStatus.toLowerCase() : 'disconnected'}`}
                                        title={
                                            wsStatus === ConnectionStatus.CONNECTED ? '실시간 시세 정상 연결됨' :
                                            wsStatus === ConnectionStatus.CONNECTING ? '실시간 시세 연결 중...' :
                                            wsStatus === ConnectionStatus.RECONNECTING ? `실시간 시세 재연결 중... (${retryCount}/5)` :
                                            wsStatus === ConnectionStatus.FAILED ? '실시간 연결 실패 (새로고침 필요)' : '연결 종료'
                                        }
                                    >
                                        <span className="ws-pulse-dot"></span>
                                    </div>
                                </div>
                                {stockInfo.content && (
                                    <p className="stock-description" style={{
                                        margin: '4px 0 0 0',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.4'
                                    }}>
                                        {stockInfo.content}
                                    </p>
                                )}
                            </div>
                            <div className="stock-price-info">
                                <h2 className={`current-price ${colorClass}`}>{stockInfo.nowPrice.toLocaleString()}</h2>
                                <span className={`price-change ${colorClass}`}>
                                    {isUp ? '+' : ''}{changeAmount.toLocaleString()} ({isUp ? '+' : ''}{changeRate}%)
                                </span>
                            </div>
                        </div>

                        {/* Chart Box with Timeframe Gauge & Type Selector */}
                        <div className="glass-panel chart-box">
                            <div className="chart-controls-header">
                                

                                <div className="chart-timeframe-controls" style={{ position: 'relative' }}>
                                    <div className="chart-timeframe-tabs">
                                        {quickTabs.map(id => {
                                            const tf = ALL_TIMEFRAMES.find(t => t.id === id);
                                            return (
                                                <button 
                                                    key={id}
                                                    type="button"
                                                    className={`timeframe-tab-btn ${activeTimeframeId === id ? 'active' : ''}`}
                                                    onClick={() => { setActiveTimeframeId(id); setIsPopoverOpen(false); }}
                                                >
                                                    {tf.label}
                                                </button>
                                            );
                                        })}
                                        <button 
                                            type="button"
                                            className={`timeframe-tab-btn ${!quickTabs.includes(activeTimeframeId) ? 'active' : ''}`}
                                            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                                        >
                                            {(!quickTabs.includes(activeTimeframeId)) ? activeTimeframe.label : '더보기 ▼'}
                                        </button>
                                    </div>

                                    {isPopoverOpen && (
                                        <div className="timeframe-popover" style={{
                                            position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                                            background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                                            padding: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50,
                                            width: '320px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>상세 기간 설정</span>
                                                <button onClick={() => setIsPopoverOpen(false)} style={{ background:'none', border:'none', cursor:'pointer' }}>✕</button>
                                            </div>
                                            
                                            <div className="popover-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                                {ALL_TIMEFRAMES.map(tf => (
                                                    <button
                                                        key={tf.id}
                                                        type="button"
                                                        className={`timeframe-tab-btn ${activeTimeframeId === tf.id ? 'active' : ''}`}
                                                        style={{ padding: '6px', fontSize: '0.75rem', width: '100%', border: '1px solid #e2e8f0' }}
                                                        onClick={() => { setActiveTimeframeId(tf.id); setIsPopoverOpen(false); }}
                                                    >
                                                        {tf.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="chart-canvas-wrapper" style={{ flexGrow: 1, minHeight: '300px' }}>
                                <ReactApexChart 
                                    key={`${chartType}-${activeTimeframeId}`}
                                    options={chartOptions} 
                                    series={chartData} 
                                    type="candlestick" 
                                    height="100%" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Orderbook Panel */}
                    <div className="glass-panel orderbook-panel">
                        <h3>호가</h3>
                        <div className="orderbook-container">
                            {orderbook.sell.length === 0 && orderbook.buy.length === 0 ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    minHeight: '260px',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85rem',
                                    textAlign: 'center',
                                    padding: '20px'
                                }}>
                                    <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📊</span>
                                    현재 접수된 실시간 매수/매도<br />대기 호가가 없습니다.
                                </div>
                            ) : (
                                <>
                                    {/* Sell Orders (Descending) */}
                                    {orderbook.sell.map((order, idx) => {
                                        const isMyOrder = mySellPrices.includes(order.price);
                                        return (
                                            <div key={`sell-${idx}`} className={`order-row sell ${isMyOrder ? 'my-order-row' : ''}`} onClick={() => handleOrderbookClick(order.price)}>
                                                <div className="bg-bar" style={{ width: `${(order.amount / maxOrderAmount) * 100}%` }}></div>
                                                <span className="order-price">
                                                    {order.price.toLocaleString()}
                                                    {isMyOrder && <span style={{ fontSize: '0.7rem', marginLeft: '4px', background: '#3b82f6', color: 'white', padding: '1px 4px', borderRadius: '4px' }}>내 예약</span>}
                                                </span>
                                                <span className="order-amount">{order.amount.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                    
                                    <div className="orderbook-divider"></div>

                                    {/* Buy Orders (Descending) */}
                                    {orderbook.buy.map((order, idx) => {
                                        const isMyOrder = myBuyPrices.includes(order.price);
                                        return (
                                            <div key={`buy-${idx}`} className={`order-row buy ${isMyOrder ? 'my-order-row' : ''}`} onClick={() => handleOrderbookClick(order.price)}>
                                                <div className="bg-bar" style={{ width: `${(order.amount / maxOrderAmount) * 100}%` }}></div>
                                                <span className="order-price">
                                                    {order.price.toLocaleString()}
                                                    {isMyOrder && <span style={{ fontSize: '0.7rem', marginLeft: '4px', background: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '4px' }}>내 예약</span>}
                                                </span>
                                                <span className="order-amount">{order.amount.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>

                    {/* 3. Trading Panel */}
                    <div className="glass-panel trading-panel">
                        <div className="trade-tabs">
                            <button 
                                type="button"
                                className={`trade-tab ${tradeType === 'BUY' ? 'active buy' : ''}`}
                                onClick={() => setTradeType('BUY')}
                            >
                                매수
                            </button>
                            <button 
                                type="button"
                                className={`trade-tab ${tradeType === 'SELL' ? 'active sell' : ''}`}
                                onClick={() => setTradeType('SELL')}
                            >
                                매도
                            </button>
                        </div>

                        <div className="trade-form">
                            <div className="form-group">
                                <label>주문 가능 수량</label>
                                <div className="available-points">
                                    <span className="points-value">
                                        {tradeType === 'BUY' 
                                            ? maxBuyQuantity.toLocaleString() 
                                            : myStockAmount.toLocaleString()}
                                    </span>
                                    <span className="points-unit">주</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>주문 단가 (P)</label>
                                <div className="price-control">
                                    <button type="button" onClick={() => setPrice(Math.max(50, (price || 0) - 50))}><Minus size={18}/></button>
                                    <input 
                                        type="number" 
                                        value={price} 
                                        onChange={handlePriceChange}
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                        step="50"
                                        min="1"
                                    />
                                    <button type="button" onClick={() => setPrice((price || 0) + 50)}><Plus size={18}/></button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>주문 수량 (주)</label>
                                <div className="quantity-control">
                                    <button type="button" onClick={() => setQuantity(Math.max(1, (quantity || 0) - 1))}><Minus size={18}/></button>
                                    <input 
                                        type="number" 
                                        value={quantity} 
                                        onChange={handleQuantityChange}
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                        min="1"
                                    />
                                    <button type="button" onClick={() => setQuantity((quantity || 0) + 1)}><Plus size={18}/></button>
                                </div>
                            </div>

                            <div className="form-group total-calc">
                                <label>총 주문 금액</label>
                                <div className="total-amount">
                                    {((price || 0) * (quantity || 0)).toLocaleString()} <span className="currency">P</span>
                                </div>
                            </div>

                            {statusCode === 'CALL_AUCTION' && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    textAlign: 'center',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    color: '#d97706',
                                    border: '1px solid #fcd34d'
                                }}>
                                    🔔 현재 장 마감 동시호가 접수 시간입니다. (주문은 접수되며, 15:30에 단일가로 일괄 체결됩니다)
                                </div>
                            )}

                            {stockInfo.marketStatus === 'STATIC_VI' && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    textAlign: 'center',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5'
                                }}>
                                    🚨 현재 이 종목은 가격 급변으로 정적 VI(변동성 완화장치)가 발동되었습니다. 2분간 단일가 매매로 주문이 접수됩니다.
                                </div>
                            )}

                            {(!marketOpen || (stockInfo.status && stockInfo.status !== 'LISTED')) && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    textAlign: 'center',
                                    background: !marketOpen ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: !marketOpen ? '#dc2626' : '#d97706',
                                    border: `1px solid ${!marketOpen ? '#fca5a5' : '#fcd34d'}`
                                }}>
                                    {!marketOpen 
                                        ? `🔴 현재 장 마감/휴장 중입니다 (${statusCode === 'HOLIDAY' ? '주말 휴장' : `정규장: ${openTime}~${closeTime}`}). 주문을 접수할 수 없습니다.` 
                                        : (stockInfo.status === 'SUSPENDED' ? '🟡 현재 이 종목은 거래가 정지되어 주문을 넣을 수 없습니다.' : '🔴 이 종목은 상장 폐지되어 거래가 불가능합니다.')
                                    }
                                </div>
                            )}

                            <button 
                                type="button"
                                className={`submit-trade-btn ${tradeType.toLowerCase()}`}
                                onClick={handleTrade}
                                disabled={isSubmitting || !marketOpen || (stockInfo.status && stockInfo.status !== 'LISTED')}
                                style={{
                                    opacity: (!marketOpen || (stockInfo.status && stockInfo.status !== 'LISTED')) ? 0.5 : 1,
                                    cursor: (!marketOpen || (stockInfo.status && stockInfo.status !== 'LISTED')) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isSubmitting 
                                    ? '처리 중...' 
                                    : !marketOpen 
                                        ? '장 마감 (주문 불가)' 
                                        : (stockInfo.status && stockInfo.status !== 'LISTED') 
                                            ? (stockInfo.status === 'SUSPENDED' ? '거래 정지됨' : '상장 폐지됨') 
                                            : (stockInfo.marketStatus === 'STATIC_VI'
                                                ? (tradeType === 'BUY' ? '단일가 매수 접수' : '단일가 매도 접수')
                                                : (statusCode === 'CALL_AUCTION' 
                                                    ? (tradeType === 'BUY' ? '동시호가 매수 접수' : '동시호가 매도 접수')
                                                    : (tradeType === 'BUY' ? '매수 주문' : '매도 주문')))
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. My Pending Orders Panel */}
            <div className="glass-panel my-orders-panel" style={{ marginTop: '24px', padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 내 미체결 (예약) 주문 목록 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(체결 전까지 취소 가능)</span>
                </h3>
                {myOrders.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem', background: 'var(--bg-main)', borderRadius: '10px', border: '1px dashed var(--bg-panel-border)' }}>
                        현재 체결 대기 중인 예약 주문이 없습니다.
                    </div>
                ) : (
                    <div className="my-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {myOrders.map(ord => {
                            const isBuy = ord.content === '매수';
                            return (
                                <div key={ord.orderId} className="my-order-item" style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    background: 'var(--bg-main)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--bg-panel-border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span className={`order-type-badge ${isBuy ? 'buy' : 'sell'}`} style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontWeight: '700',
                                            fontSize: '0.85rem',
                                            background: isBuy ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                            color: isBuy ? 'var(--accent-red)' : 'var(--accent-blue)'
                                        }}>
                                            {ord.content}
                                        </span>
                                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>
                                            {(ord.price || 0).toLocaleString()} P
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {ord.amount} 주
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {ord.createdDate ? new Date(ord.createdDate).toLocaleTimeString('ko-KR') : ''}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCancelOrder(ord.orderId)}
                                        style={{
                                            padding: '6px 14px',
                                            background: '#ef4444',
                                            color: 'white',
                                            borderRadius: '6px',
                                            fontWeight: '600',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            border: 'none',
                                            transition: 'opacity 0.15s ease'
                                        }}
                                    >
                                        주문 취소
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockDetail;
