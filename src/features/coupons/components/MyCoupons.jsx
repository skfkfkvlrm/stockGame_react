import React, { useState, useEffect } from 'react';
import { Ticket, Clock, CheckCircle } from 'lucide-react';
import api from '../../../api/axios';
import './MyCoupons.css';

const MyCoupons = () => {
    const [myCoupons, setMyCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchMyCoupons = async () => {
            try {
                const response = await api.get('/coupons/my');
                setMyCoupons(response.data.data);
            } catch (err) {
                setError('보유 쿠폰 목록을 불러오는 데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMyCoupons();
    }, []);

    const handleUse = (coupon) => {
        alert(`${coupon.coupon?.name || '쿠폰'}을(를) 사용 요청했습니다. (선생님 승인 대기)`);
    };

    if (isLoading) return <div className="my-coupons-container"><div className="loading-spinner"></div></div>;
    if (error) return <div className="my-coupons-container"><div className="error-msg">{error}</div></div>;

    return (
        <div className="store-container">
            <header className="page-header">
                <h1 className="page-title">내 쿠폰함</h1>
                <p className="page-subtitle">보유 중인 쿠폰을 확인하고 사용하세요.</p>
            </header>

            <div className="coupon-grid">
                {myCoupons.length === 0 ? (
                    <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>
                        보유 중인 쿠폰이 없습니다.
                    </div>
                ) : (
                    myCoupons.map((item, idx) => {
                        const couponName = item.name || item.coupon?.name || '쿠폰';
                        const rawState = item.state || item.status || '사용전';
                        const isUnused = rawState === '사용전' || rawState === 'UNUSED' || rawState === '미사용';
                        const isWaiting = rawState === '대기' || rawState === 'WAITING';
                        const isUsed = rawState === '사용' || rawState === 'USED';

                        const keyId = item.couponPurchaseId || item.id || item.purchaseId || item.couponId || idx;
                        const dateStr = item.createdDate ? new Date(item.createdDate).toLocaleDateString() : new Date().toLocaleDateString();

                        return (
                        <div key={keyId} className={`coupon-card glass-panel ${isUsed ? 'used' : ''}`}>
                            <div className="coupon-icon" style={{ backgroundColor: '#8b5cf6' }}>
                                <Ticket />
                            </div>
                            <div className="coupon-info">
                                <h3>{couponName}</h3>
                                <p className="purchase-date">구매일: {dateStr}</p>
                            </div>
                            <div className="coupon-status">
                                {isUnused && <span className="badge badge-unused">사용 가능</span>}
                                {isWaiting && <span className="badge badge-waiting"><Clock size={12}/> 대기중</span>}
                                {isUsed && <span className="badge badge-used"><CheckCircle size={12}/> 사용 완료</span>}
                            </div>
                            <button 
                                className="use-btn" 
                                disabled={!isUnused}
                                onClick={() => handleUse(item)}
                            >
                                {isUnused ? '사용하기' : (isWaiting ? '승인 대기' : '사용 완료')}
                            </button>
                        </div>
                    );
                })
                )}
            </div>
        </div>
    );
};

export default MyCoupons;
