import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../../../api/axios';
import useAuthStore from '../../auth/store/useAuthStore';
import './StockDetail.css';

const StockDetail = () => {
    const { stockId } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);
    
    const [stockInfo, setStockInfo] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [orderbook, setOrderbook] = useState({ buy: [], sell: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Trading state
    const [tradeType, setTradeType] = useState('BUY'); // BUY or SELL
    const [price, setPrice] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch initial data
    const fetchAllData = async () => {
        try {
            const [infoRes, historyRes, orderbookRes] = await Promise.all([
                api.get(`/stock/${stockId}`),
                api.get(`/stock/${stockId}/history`),
                api.get(`/stock/${stockId}/orderbook`)
            ]);
            
            const info = infoRes.data.data;
            setStockInfo(info);
            // Default price to current market price if not set
            if (price === 0) setPrice(info.nowPrice || info.pubPrice);

            // Map history data to Candlestick format
            const mappedHistory = historyRes.data.data.map(item => ({
                x: new Date(item.date).getTime(),
                y: [item.price, item.price, item.price, item.price] // Mocking OHLC with closing price for now since DB only has one price per day
            }));
            setChartData([{ data: mappedHistory }]);

            // Map orderbook
            // Group and aggregate orders by price
            const aggregateOrders = (orders) => {
                const map = {};
                orders.forEach(o => {
                    if (!map[o.price]) map[o.price] = 0;
                    map[o.price] += o.amount;
                });
                return Object.entries(map).map(([p, amt]) => ({
                    price: parseInt(p),
                    amount: amt
                }));
            };

            const sellGrouped = aggregateOrders(orderbookRes.data.data.sell || [])
                                .sort((a, b) => b.price - a.price); // Descending for sell
            const buyGrouped = aggregateOrders(orderbookRes.data.data.buy || [])
                                .sort((a, b) => b.price - a.price); // Descending for buy

            setOrderbook({
                sell: sellGrouped.slice(-10), // Take closest 10
                buy: buyGrouped.slice(0, 10)  // Take closest 10
            });
            
            // Re-fetch user points
            await checkAuthStatus();
            
        } catch (err) {
            console.error(err);
            setError('데이터를 불러오는 데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // STOMP WebSocket Connection
    useEffect(() => {
        fetchAllData();

        const stompClient = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8882/ws'),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('Connected to WS');
                stompClient.subscribe(`/topic/orders/${stockId}`, (msg) => {
                    if (msg.body === 'ORDER_UPDATED') {
                        // Refetch data on update
                        fetchAllData();
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker error: ' + frame.headers['message']);
            }
        });

        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stockId]);

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
            alert('올바른 가격과 수량을 입력해주세요.');
            return;
        }
        
        const totalAmount = prc * qty;
        
        if (tradeType === 'BUY' && totalAmount > (user?.point || 0)) {
            alert('주문 가능 포인트를 초과했습니다.');
            return;
        }
        
        setIsSubmitting(true);
        try {
            const endpoint = tradeType === 'BUY' ? '/orders/buy' : '/orders/sell';
            const response = await api.post(endpoint, {
                stockId: parseInt(stockId),
                quantity: qty,
                price: prc
            });
            alert(response.data?.data || '주문이 접수되었습니다.');
            setQuantity(1);
        } catch (err) {
            alert(err.response?.data?.message || '주문 처리에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
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

    return (
        <div className="stock-detail-container">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} /> 뒤로 가기
            </button>
            
            <div className="detail-layout">
                {/* 1. Chart Section */}
                <div className="chart-section">
                    <div className="glass-panel stock-header">
                        <div className="stock-title">
                            <h1>{stockInfo.stockName}</h1>
                            <span className="stock-code">{stockInfo.content}</span>
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
                        {orderbook.sell.map((order, idx) => (
                            <div key={`sell-${idx}`} className="order-row sell" onClick={() => handleOrderbookClick(order.price)}>
                                <div className="bg-bar" style={{ width: `${(order.amount / maxOrderAmount) * 100}%` }}></div>
                                <span className="order-price">{order.price.toLocaleString()}</span>
                                <span className="order-amount">{order.amount.toLocaleString()}</span>
                            </div>
                        ))}
                        
                        <div className="orderbook-divider"></div>

                        {/* Buy Orders (Descending) */}
                        {orderbook.buy.map((order, idx) => (
                            <div key={`buy-${idx}`} className="order-row buy" onClick={() => handleOrderbookClick(order.price)}>
                                <div className="bg-bar" style={{ width: `${(order.amount / maxOrderAmount) * 100}%` }}></div>
                                <span className="order-price">{order.price.toLocaleString()}</span>
                                <span className="order-amount">{order.amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Trading Panel */}
                <div className="glass-panel trading-panel">
                    <div className="trade-tabs">
                        <button 
                            className={`trade-tab ${tradeType === 'BUY' ? 'active buy' : ''}`}
                            onClick={() => setTradeType('BUY')}
                        >
                            매수
                        </button>
                        <button 
                            className={`trade-tab ${tradeType === 'SELL' ? 'active sell' : ''}`}
                            onClick={() => setTradeType('SELL')}
                        >
                            매도
                        </button>
                    </div>

                    <div className="trade-form">
                        <div className="form-group">
                            <label>주문 가능 포인트 / 주식 수</label>
                            <div className="available-points">
                                {tradeType === 'BUY' 
                                    ? `${(user?.point || 0).toLocaleString()} P` 
                                    : '보유 주식 (서버에서 가져와야함)'}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>주문 단가 (P)</label>
                            <div className="price-control">
                                <button type="button" onClick={() => setPrice(Math.max(1, (price || 0) - 1))}><Minus size={18}/></button>
                                <input 
                                    type="number" 
                                    value={price} 
                                    onChange={handlePriceChange}
                                    min="1"
                                />
                                <button type="button" onClick={() => setPrice((price || 0) + 1)}><Plus size={18}/></button>
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

                        <button 
                            className={`submit-trade-btn ${tradeType.toLowerCase()}`}
                            onClick={handleTrade}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '처리 중...' : (tradeType === 'BUY' ? '매수 주문' : '매도 주문')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockDetail;
