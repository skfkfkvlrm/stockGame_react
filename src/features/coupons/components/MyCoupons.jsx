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
                    myCoupons.map(item => {
                        const coupon = item.coupon || item;
                        return (
                        <div key={item.id} className={`coupon-card glass-panel ${item.status === 'USED' ? 'used' : ''}`}>
                            <div className="coupon-icon" style={{ backgroundColor: coupon.color || '#8b5cf6' }}>
                                {coupon.icon || <Ticket />}
                            </div>
                            <div className="coupon-info">
                                <h3>{coupon.name}</h3>
                                <p className="purchase-date">구매일: {new Date(item.purchaseDate || Date.now()).toLocaleDateString()}</p>
                            </div>
                            <div className="coupon-status">
                                {item.status === 'UNUSED' && <span className="badge badge-unused">사용 가능</span>}
                                {item.status === 'WAITING' && <span className="badge badge-waiting"><Clock size={12}/> 대기중</span>}
                                {item.status === 'USED' && <span className="badge badge-used"><CheckCircle size={12}/> 사용 완료</span>}
                            </div>
                            <button 
                                className="use-btn" 
                                disabled={item.status !== 'UNUSED'}
                                onClick={() => handleUse(item)}
                            >
                                {item.status === 'UNUSED' ? '사용하기' : (item.status === 'WAITING' ? '승인 대기' : '사용 완료')}
                            </button>
                        </div>
                    )})
                )}
            </div>
        </div>
    );
};

export default MyCoupons;
