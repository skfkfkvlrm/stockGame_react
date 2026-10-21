import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import assetService from '../../../services/assetService';
import useAuthStore from '../../auth/store/useAuthStore';
import './PointsHistory.css';

const formatReasonType = (reason) => {
    switch (reason) {
        case 'INITIAL_GRANT': return '회원가입 축하 기초 투자금 지급';
        case 'STOCK_SELL_SETTLEMENT': return '[매도 체결] 주식 매도 정산';
        case 'STOCK_BUY_ESCROW': return '[매수 주문] 주식 매수';
        case 'STOCK_BUY_CANCEL_REFUND': return '[주문 취소] 주식 주문 환불';
        case 'STOCK_BUY_DIFF_REFUND': return '[체결 차액] 주식 환불';
        case 'COUPON_PURCHASE': return '상점 쿠폰 구매';
        case 'ADMIN_GRANT': return '관리자 지급';
        case 'ADMIN_DEDUCT': return '관리자 차감';
        case 'ADMIN_ROLLBACK': return '관리자 복구';
        default: return reason || '변동 내역';
    }
};

const PointsHistory = () => {
    const user = useAuthStore((state) => state.user);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await assetService.getHistory(user?.id);
                setHistory(Array.isArray(data) ? data : []);
            } catch (err) {
                setError('내역을 불러올 수 없습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [user?.id]);

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
                        const pointChange = item.pointChange ?? item.amount ?? 0;
                        const isEarn = pointChange >= 0 || item.historyType === '지급' || item.historyType === '매도' || item.reason === 'INITIAL_GRANT' || item.reason === 'STOCK_SELL_SETTLEMENT';
                        const colorClass = isEarn ? 'profit-up' : 'profit-down';
                        const rawDate = item.historyDate || item.createdDate;
                        const formattedDate = rawDate ? new Date(rawDate).toLocaleString('ko-KR') : '-';
                        
                        const rawBalance = item.balanceAfter ?? item.currentPoint;
                        const hasBalance = rawBalance !== undefined && rawBalance !== null;
                        const displaySubText = hasBalance
                            ? `잔액 ${Number(rawBalance).toLocaleString()} P`
                            : (item.historyType || formatReasonType(item.reason));

                        return (
                            <div key={index} className="history-item">
                                <div className={`history-icon ${isEarn ? 'earn' : 'use'}`}>
                                    {isEarn ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                                </div>
                                <div className="history-details">
                                    <h3>{item.historyContent || item.description || item.historyType || formatReasonType(item.reason)}</h3>
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
                                        {displaySubText}
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