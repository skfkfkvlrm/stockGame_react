import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import ReactApexChart from 'react-apexcharts';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'react-toastify';
import './StockDetail.css';

const StockDetail = () => {
    const { stockId } = useParams();
    const navigate = useNavigate();

    const [stockInfo, setStockInfo] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [orderType, setOrderType] = useState('buy'); // 'buy' or 'sell'
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');

    useEffect(() => {
        fetchStockDetail();
        fetchStockHistory();
        const stompClient = connectWebSocket();

        return () => {
            if (stompClient) {
                stompClient.deactivate();
            }
        };
    }, [stockId]);

    const fetchStockDetail = async () => {
        try {
            const response = await api.get(`/api/stock/${stockId}`);
            if (response.data.success) {
                setStockInfo(response.data.data);
                setPrice(response.data.data.nowPrice);
            }
        } catch (error) {
            console.error('Failed to fetch stock detail', error);
            toast.error('주식 상세 정보를 불러오는데 실패했습니다.');
        }
    };

    const fetchStockHistory = async () => {
        try {
            const response = await api.get(`/api/stock/${stockId}/history`);
            if (response.data.success) {
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
        const socket = new SockJS('/ws');
        const stompClient = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                stompClient.subscribe(`/topic/orders/${stockId}`, (msg) => {
                    fetchStockDetail();
                });
                
                stompClient.subscribe('/user/queue/notifications', (msg) => {
                    toast.info(`🔔 ${msg.body}`);
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
            }
        });
        stompClient.activate();
        return stompClient;
    };

    const handleOrder = async (e) => {
        e.preventDefault();
        
        if (!amount || !price) {
            toast.warn('수량과 가격을 입력해주세요.');
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
                toast.success(`${orderType === 'buy' ? '매수' : '매도'} 주문이 접수되었습니다.`);
                setAmount('');
                fetchStockDetail();
            } else {
                toast.error(response.data.message || '주문 실패');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || '주문 처리 중 오류 발생');
        }
    };

    const chartOptions = {
        chart: { 
            type: 'candlestick', 
            height: 350,
            background: 'transparent',
            toolbar: { show: false }
        },
        theme: { mode: 'dark' },
        title: { 
            text: '실시간 주가 변동', 
            align: 'left',
            style: { color: 'var(--text-main)', fontSize: '16px', fontWeight: 500 }
        },
        xaxis: { 
            type: 'datetime',
            labels: { style: { colors: 'var(--text-muted)' } }
        },
        yaxis: { 
            tooltip: { enabled: true },
            labels: { style: { colors: 'var(--text-muted)' } }
        },
        plotOptions: {
            candlestick: {
                colors: {
                    upward: '#ff4d4f', // Red for UP (Korea)
                    downward: '#1890ff' // Blue for DOWN
                }
            }
        },
        grid: {
            borderColor: 'rgba(255,255,255,0.05)',
        }
    };

    if (!stockInfo) return <div className="loading">데이터를 불러오는 중입니다...</div>;

    const diff = stockInfo.nowPrice - stockInfo.averagePrice;
    const isUp = diff >= 0;

    return (
        <div className="stock-detail-page">
            <header className="detail-header">
                <div className="header-top">
                    <button onClick={() => navigate('/stocks')} className="back-btn">← 목록으로</button>
                    <h2 className="stock-title">{stockInfo.stockName}</h2>
                </div>
                <div className="price-info-card glass-panel">
                    <div className="current-price-wrap">
                        <span className="label">현재가</span>
                        <span className="current-price">{stockInfo.nowPrice?.toLocaleString()} P</span>
                    </div>
                </div>
            </header>

            <div className="detail-content">
                <section className="chart-section glass-panel">
                    <ReactApexChart options={chartOptions} series={chartData} type="candlestick" height={350} />
                </section>

                <section className="order-section glass-panel">
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

                        <button type="submit" className={`submit-order-btn ${orderType}`}>
                            {orderType === 'buy' ? '매수 주문 실행' : '매도 주문 실행'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default StockDetail;
