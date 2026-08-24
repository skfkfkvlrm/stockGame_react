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
    const [chartData, setChartData] = useState([]);
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
    
    // Trading state
    const [tradeType, setTradeType] = useState('BUY'); // BUY or SELL
    const [price, setPrice] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            const mappedHistory = rawHistory.map(item => ({
                x: item.date ? new Date(item.date).getTime() : Date.now(),
                y: [item.price ?? initialPrice, item.price ?? initialPrice, item.price ?? initialPrice, item.price ?? initialPrice]
            }));
            setChartData([{ data: mappedHistory }]);

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
                    if (msg.body === 'ORDER_UPDATED') {
                        fetchAllData();
                    }
                }
            }
        ],
        maxReconnectAttempts: 5
    });

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

    const chartOptions = {
        chart: { type: 'candlestick', background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
        theme: { mode: 'light' },
        plotOptions: { candlestick: { colors: { upward: '#ff4757', downward: '#3b82f6' } } },
        xaxis: { type: 'datetime', labels: { style: { colors: '#64748b' } } },
        yaxis: { labels: { style: { colors: '#64748b' }, formatter: (v) => v.toLocaleString() } },
        grid: { borderColor: 'rgba(0,0,0,0.05)' }
    };

    const maxOrderAmount = Math.max(
        ...orderbook.buy.map(o => o.amount),
        ...orderbook.sell.map(o => o.amount),
        1
    );

    const mySellPrices = myOrders.filter(o => o.content === 'SELL' || o.content === '매도').map(o => o.price);
    const myBuyPrices = myOrders.filter(o => o.content === 'BUY' || o.content === '매수').map(o => o.price);

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
            
            <div className="detail-layout">
                {/* 1. Chart Section */}
                <div className="chart-section">
                    <div className="glass-panel stock-header">
                        <div className="stock-title">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h1>{stockInfo.stockName}</h1>
                                <div className={`ws-status-badge status-${wsStatus ? wsStatus.toLowerCase() : 'disconnected'}`}>
                                    {wsStatus === ConnectionStatus.CONNECTED && '🟢 실시간 시세 연결됨'}
                                    {wsStatus === ConnectionStatus.CONNECTING && '🟡 연결 중...'}
                                    {wsStatus === ConnectionStatus.RECONNECTING && `🟡 재연결 중... (${retryCount}/5)`}
                                    {wsStatus === ConnectionStatus.FAILED && '🔴 실시간 연결 실패 (새로고침 필요)'}
                                    {wsStatus === ConnectionStatus.DISCONNECTED && '⚪ 연결 종료'}
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

                    <div className="glass-panel chart-box">
                        <ReactApexChart options={chartOptions} series={chartData} type="candlestick" height="100%" />
                    </div>
                </div>

                {/* 2. Orderbook Panel */}
                <div className="glass-panel orderbook-panel">
                    <h3>호가</h3>
                    <div className="orderbook-container">
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
                            <label>{tradeType === 'BUY' ? '주문 가능 포인트' : '주문 가능 수량'}</label>
                            <div className="available-points">
                                <span className="points-value">
                                    {tradeType === 'BUY' 
                                        ? (user?.totalPoint ?? user?.point ?? 0).toLocaleString() 
                                        : myStockAmount.toLocaleString()}
                                </span>
                                <span className="points-unit">
                                    {tradeType === 'BUY' ? 'P' : '주'}
                                </span>
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
                            {isSubmitting ? '처리 중...' : !marketOpen ? '장 마감 (주문 불가)' : (stockInfo.status && stockInfo.status !== 'LISTED') ? (stockInfo.status === 'SUSPENDED' ? '거래 정지됨' : '상장 폐지됨') : (tradeType === 'BUY' ? '매수 주문' : '매도 주문')}
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. My Pending Orders Panel */}
            <div className="glass-panel my-orders-panel" style={{ marginTop: '24px', padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 내 미체결 (예약) 주문 목록 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(체결 전까지 취소 가능)</span>
                </h3>
                {myOrders.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
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



