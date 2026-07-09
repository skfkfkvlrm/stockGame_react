import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import api from '../../../api/axios';
import './PointsHistory.css';

const PointsHistory = () => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get('/history');
                setHistory(response.data.data);
            } catch (err) {
                setError('포인트 내역을 불러오는 데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (isLoading) return <div className="points-history-container"><div className="loading-spinner">로딩 중...</div></div>;
    if (error) return <div className="points-history-container"><div className="error-msg">{error}</div></div>;

    return (
        <div className="points-history-container">
            <header className="page-header">
                <h1 className="page-title">포인트 내역</h1>
                <p className="page-subtitle">포인트 적립 및 사용 내역을 확인하세요.</p>
            </header>

            <div className="history-list glass-panel">
                {history.map(item => {
                    const isEarn = item.type === 'EARN';
                    const colorClass = isEarn ? 'profit-up' : 'profit-down';
                    
                    return (
                        <div key={item.id} className="history-item">
                            <div className={`history-icon ${isEarn ? 'earn' : 'use'}`}>
                                {isEarn ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                            </div>
                            <div className="history-details">
                                <h3>{item.desc}</h3>
                                <div className="history-meta">
                                    <Clock size={14} />
                                    <span>{item.date}</span>
                                </div>
                            </div>
                            <div className="history-amounts">
                                <div className={`amount-change ${colorClass}`}>
                                    {isEarn ? '+' : ''}{item.amount.toLocaleString()} P
                                </div>
                                <div className="amount-balance">
                                    잔액: {item.balance.toLocaleString()} P
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PointsHistory;
