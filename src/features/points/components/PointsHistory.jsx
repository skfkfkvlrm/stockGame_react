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
                if (response.data && Array.isArray(response.data.data)) {
                    setHistory(response.data.data);
                } else {
                    setHistory([]);
                }
            } catch (err) {
                setError('내역을 불러올 수 없습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (isLoading) return <div className="points-history-container"><div className="loading-spinner">로딩 중...</div></div>;

    return (
        <div className="points-history-container">
            <header className="page-header">
                <h1 className="page-title">포인트 변동 이력</h1>
                <p className="page-subtitle">포인트 지급, 차감 및 주식/쿠폰 결제 변동 내역을 확인하세요.</p>
            </header>

            <div className="history-list glass-panel">
                {error ? (
                    <div className="error-msg">{error}</div>
                ) : history.length === 0 ? (
                    <div className="empty-msg" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        포인트 내역이 없습니다.
                    </div>
                ) : (
                    history.map((item, index) => {
                        const pointChange = item.pointChange ?? 0;
                        const isEarn = pointChange >= 0 || item.historyType === '지급' || item.historyType === '매도';
                        const colorClass = isEarn ? 'profit-up' : 'profit-down';
                        const formattedDate = item.historyDate ? new Date(item.historyDate).toLocaleString('ko-KR') : '-';
                        
                        return (
                            <div key={index} className="history-item">
                                <div className={`history-icon ${isEarn ? 'earn' : 'use'}`}>
                                    {isEarn ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                                </div>
                                <div className="history-details">
                                    <h3>{item.historyContent || item.historyType || '포인트 변동'}</h3>
                                    <div className="history-meta">
                                        <Clock size={14} />
                                        <span>{formattedDate}</span>
                                    </div>
                                </div>
                                <div className="history-amounts">
                                    <div className={`amount-change ${colorClass}`}>
                                        {pointChange > 0 ? '+' : ''}{pointChange.toLocaleString()} P
                                    </div>
                                    <div className="amount-balance">
                                        구분: {item.historyType || '기초 포인트'}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default PointsHistory;
