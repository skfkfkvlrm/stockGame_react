import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import ReactApexChart from 'react-apexcharts';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './StockDetail.css';

const StockDetail = () => {
    const { stockId } = useParams();
    const navigate = useNavigate();

    const [stockInfo, setStockInfo] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [orderType, setOrderType] = useState('buy'); // 'buy' or 'sell'
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');
    const [orderMsg, setOrderMsg] = useState('');

    useEffect(() => {
        fetchStockDetail();
        fetchStockHistory();
        connectWebSocket();

        return () => {
            // Cleanup WebSocket connection if needed
        };
    }, [stockId]);

    const fetchStockDetail = async () => {
        try {
            const response = await api.get(`/api/stock/${stockId}`);
            if (response.data.success) {
                setStockInfo(response.data.data);
                setPrice(response.data.data.currentPrice); // 초기 주문 가격 설정
            }
        } catch (error) {
            console.error('Failed to fetch stock detail', error);
        }
    };

    const fetchStockHistory = async () => {
        try {
            const response = await api.get(`/api/stock/${stockId}/history`);
            if (response.data.success) {
                // historyData expected format: [{ recordedAt, openPrice, highPrice, lowPrice, closePrice }]
                const formattedData = response.data.data.map(item => ({
                    x: new Date(item.recordedAt).getTime(),
                    y: [item.openPrice, item.highPrice, item.lowPrice, item.closePrice]
                }));
                setChartData([{ data: formattedData }]);
            }
        } catch (error) {
            console.error('Failed to fetch stock history', error);
        }
    };

    const connectWebSocket = () => {
        const socket = new SockJS('http://localhost:8882/ws');
        const stompClient = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                // 현재 종목 호가창 구독
                stompClient.subscribe(`/topic/orders/${stockId}`, (msg) => {
                    // Update stock info based on msg.body if needed
                    fetchStockDetail(); // 단순화를 위해 재조회
                });
                
                // 내 체결 알림 구독
                stompClient.subscribe('/user/queue/notifications', (msg) => {
                    alert('알림: ' + msg.body);
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            }
        });
        stompClient.activate();
    };

    const handleOrder = async (e) => {
        e.preventDefault();
        setOrderMsg('');
        
        if (!amount || !price) {
            setOrderMsg('수량과 가격을 입력해주세요.');
            return;
        }

        const endpoint = orderType === 'buy' ? '/api/orders/buy' : '/api/orders/sell';
        
        try {
            const response = await api.post(endpoint, {
                stockId: parseInt(stockId, 10),
                amount: parseInt(amount, 10),
                price: parseInt(price, 10)
            });
            if (response.data.success) {
                alert(`${orderType === 'buy' ? '매수' : '매도'} 주문이 접수되었습니다.`);
                setAmount('');
                fetchStockDetail();
            } else {
                setOrderMsg(response.data.message || '주문 실패');
            }
        } catch (error) {
            console.error('Order Error:', error);
            setOrderMsg(error.response?.data?.message || '주문 처리 중 오류 발생');
        }
    };

    const chartOptions = {
        chart: { type: 'candlestick', height: 350 },
        title: { text: '주가 변동 차트', align: 'left' },
        xaxis: { type: 'datetime' },
        yaxis: { tooltip: { enabled: true } }
    };

    if (!stockInfo) return <div className="loading">데이터를 불러오는 중입니다...</div>;

    const priceDiff = stockInfo.currentPrice - stockInfo.averagePrice; // 이전가 대비로 수정 필요할 수 있음
    // 임시로 현재가와 매수평균가 차이로 표시
    
    return (
        <div className="stock-detail-page">
            <header className="detail-header">
                <button onClick={() => navigate('/stocks')} className="back-btn">← 뒤로가기</button>
                <h2>{stockInfo.stockName}</h2>
                <div className="price-info">
                    <span className="current-price">{stockInfo.currentPrice?.toLocaleString()} P</span>
                    {/* 등락률 계산 정보가 있으면 표시 */}
                </div>
            </header>

            <div className="detail-content">
                <section className="chart-section">
                    <ReactApexChart options={chartOptions} series={chartData} type="candlestick" height={350} />
                </section>

                <section className="order-section">
                    <div className="order-tabs">
                        <button className={`tab-btn ${orderType === 'buy' ? 'active buy' : ''}`} onClick={() => setOrderType('buy')}>매수</button>
                        <button className={`tab-btn ${orderType === 'sell' ? 'active sell' : ''}`} onClick={() => setOrderType('sell')}>매도</button>
                    </div>

                    <form className="order-form" onSubmit={handleOrder}>
                        <div className="form-group">
                            <label>주문 가격</label>
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>주문 수량</label>
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        </div>
                        
                        {orderMsg && <div className="order-msg">{orderMsg}</div>}

                        <button type="submit" className={`submit-order-btn ${orderType}`}>
                            {orderType === 'buy' ? '매수 주문' : '매도 주문'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default StockDetail;
