import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import api from '../../../api/axios';
import useAuthStore from '../../auth/store/useAuthStore';
import './StockDetail.css';

// MOCK CHART DATA & CONFIG (Moved outside to prevent re-renders)
const chartOptions = {
    chart: { type: 'candlestick', background: 'transparent', toolbar: { show: false } },
    theme: { mode: 'light' },
    plotOptions: {
        candlestick: {
            colors: {
                upward: '#ff4757', // Red for Up (Korea)
                downward: '#3b82f6' // Blue for Down
            }
        }
    },
    xaxis: { type: 'datetime', labels: { style: { colors: '#64748b' } } },
    yaxis: { labels: { style: { colors: '#64748b' }, formatter: (value) => value.toLocaleString() } },
    grid: { borderColor: 'rgba(0,0,0,0.05)' }
};

const chartSeries = [{
    data: [
        { x: new Date('2024-01-01').getTime(), y: [73000, 74500, 72500, 74000] },
        { x: new Date('2024-01-02').getTime(), y: [74000, 75500, 73500, 75000] },
        { x: new Date('2024-01-03').getTime(), y: [75000, 76000, 74500, 74800] },
        { x: new Date('2024-01-04').getTime(), y: [74800, 75500, 74000, 75000] },
        { x: new Date('2024-01-05').getTime(), y: [75000, 75500, 74500, 75000] }
    ]
}];

const StockDetail = () => {
    const { stockId } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const [tradeType, setTradeType] = useState('BUY'); // BUY or SELL
    const [quantity, setQuantity] = useState(1);
    
    const [stockInfo, setStockInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchStockDetail = async () => {
            try {
                const response = await api.get(`/stock/${stockId}`);
                setStockInfo(response.data.data);
            } catch (err) {
                setError('주식 정보를 불러오는 데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchStockDetail();
    }, [stockId]);

    if (isLoading) return <div className="stock-detail-container"><div className="loading-spinner"></div></div>;
    if (error || !stockInfo) return <div className="stock-detail-container"><div className="error-msg">{error || '종목이 존재하지 않습니다.'}</div></div>;

    const isUp = stockInfo.changeRate > 0;
    const colorClass = isUp ? 'profit-up' : stockInfo.changeRate < 0 ? 'profit-down' : '';

    const handleQuantityChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (isNaN(value) || value < 1) {
            setQuantity('');
        } else {
            setQuantity(value);
        }
    };

    const handleTrade = async () => {
        const qty = quantity || 0;
        if (qty <= 0) {
            alert('올바른 수량을 입력해주세요.');
            return;
        }
        const totalAmount = stockInfo.price * qty;
        
        if (tradeType === 'BUY' && totalAmount > (user?.totalPoint || 0)) {
            alert('주문 가능 포인트를 초과했습니다.');
            return;
        }
        
        setIsSubmitting(true);
        try {
            const endpoint = tradeType === 'BUY' ? '/orders/buy' : '/orders/sell';
            const response = await api.post(endpoint, {
                stockId: parseInt(stockId),
                quantity: qty,
                price: stockInfo.price
            });
            alert(response.data?.data || `${stockInfo.name} ${qty}주 ${tradeType === 'BUY' ? '매수' : '매도'} 주문이 접수되었습니다.`);
            // After successful trade, you might want to refresh user's info or go back
            // For now, just reset quantity
            setQuantity(1);
        } catch (err) {
            alert(err.response?.data?.message || '주문 처리에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="stock-detail-container">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} /> 뒤로 가기
            </button>
            
            <div className="detail-layout">
                {/* Left: Chart & Info */}
                <div className="chart-section">
                    <div className="glass-panel stock-header">
                        <div className="stock-title">
                            <h1>{stockInfo.name}</h1>
                            <span className="stock-code">{stockInfo.code}</span>
                        </div>
                        <div className="stock-price-info">
                            <h2 className={`current-price ${colorClass}`}>{stockInfo.price.toLocaleString()}</h2>
                            <span className={`price-change ${colorClass}`}>
                                {isUp ? '+' : ''}{stockInfo.change.toLocaleString()} ({isUp ? '+' : ''}{stockInfo.changeRate}%)
                            </span>
                        </div>
                    </div>

                    <div className="glass-panel chart-box">
                        <ReactApexChart options={chartOptions} series={chartSeries} type="candlestick" height={400} />
                    </div>
                </div>

                {/* Right: Trading Panel */}
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
                            <label>주문 가능 포인트</label>
                            <div className="available-points">1,500,000 P</div>
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
                                {(stockInfo.price * (quantity || 0)).toLocaleString()} <span className="currency">P</span>
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
