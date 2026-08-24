import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Clock, CheckCircle } from 'lucide-react';
import api from '../../../api/axios';
import './MyCoupons.css';

const MyCoupons = () => {
    const navigate = useNavigate();
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

    const [isUsing, setIsUsing] = useState(false);

    const handleUse = async (item) => {
        const purchaseId = item.couponPurchaseId;
        const name = item.name || item.coupon?.name || '쿠폰';

        if (!purchaseId) {
            alert('쿠폰 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.');
            return;
        }

        if (!window.confirm(`'${name}' 쿠폰을 지금 사용하시겠습니까?\n사용 후 취소는 불가능합니다.`)) {
            return;
        }

        setIsUsing(true);
        try {
            await api.patch(`/coupons/${purchaseId}/use`);
            alert(`'${name}' 쿠폰 사용이 완료되었습니다!`);
            // 목록 새로고침
            const response = await api.get('/coupons/my');
            setMyCoupons(response.data.data || []);
        } catch (err) {
            alert(err.response?.data?.message || '쿠폰 사용 처리 중 오류가 발생했습니다.');
        } finally {
            setIsUsing(false);
        }
    };

    if (isLoading) return <div className="my-coupons-container"><div className="loading-spinner"></div></div>;
    if (error) return <div className="my-coupons-container"><div className="error-msg">{error}</div></div>;

    return (
        <div className="store-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">보유 쿠폰함</h1>
                    <p className="page-subtitle">보유 중인 쿠폰을 확인하고 사용하세요.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="sub-tab-btn" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'rgba(255,255,255,0.8)', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/coupons')}>
                        🛒 쿠폰 상점
                    </button>
                    <button className="sub-tab-btn active" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary, #6366f1)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                        🎫 보유 쿠폰함
                    </button>
                </div>
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
                                disabled={!isUnused || isUsing}
                                onClick={() => handleUse(item)}
                            >
                                {isUnused ? (isUsing ? '처리 중...' : '사용하기') : (isWaiting ? '승인 대기' : '사용 완료')}
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
