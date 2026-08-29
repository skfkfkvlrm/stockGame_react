import React, { useState, useEffect } from 'react';
import { Ticket, Sparkles, Crown, Heart, Gift, Star, Clock } from 'lucide-react';
import api from '../../../api/axios';
import useAuthStore from '../../auth/store/useAuthStore';
import './CouponStore.css';

const getCouponDetail = (name = '') => {
    if (name.includes('자리 교환')) {
        return {
            icon: <Ticket size={26} />,
            desc: '원하는 친구와 하루 동안 자리를 교환할 수 있는 인기 쿠폰입니다.',
            bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        };
    } else if (name.includes('청소')) {
        return {
            icon: <Sparkles size={26} />,
            desc: '오늘 학급 청소 당번을 면제받고 가벼운 마음으로 하교하세요.',
            bg: 'linear-gradient(135deg, #10b981, #059669)'
        };
    } else if (name.includes('뺏기')) {
        return {
            icon: <Crown size={26} />,
            desc: '학급 내 가장 원하는 명당 자리를 지정하여 이동할 수 있는 쿠폰입니다.',
            bg: 'linear-gradient(135deg, #f59e0b, #d97706)'
        };
    } else if (name.includes('안마')) {
        return {
            icon: <Heart size={26} />,
            desc: '지친 하루, 시원한 5분 안마 힐링 케어를 제공받을 수 있습니다.',
            bg: 'linear-gradient(135deg, #ec4899, #f43f5e)'
        };
    }
    return {
        icon: <Gift size={26} />,
        desc: '학급 활동에서 사용할 수 있는 유용한 특별 혜택 쿠폰입니다.',
        bg: 'linear-gradient(135deg, #8b5cf6, #a855f7)'
    };
};

import { useNavigate } from 'react-router-dom';

const CouponStore = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const fetchMe = useAuthStore((state) => state.fetchMe);
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const response = await api.get('/coupons');
                setCoupons(response.data.data);
            } catch (err) {
                setError('쿠폰 목록을 불러오는 데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchCoupons();
    }, []);

    const handleBuy = async (coupon) => {
        const couponId = coupon.couponId || coupon.id;
        if (!user || user.totalPoint < coupon.price) {
            alert('포인트가 부족합니다!');
            return;
        }

        const confirmMsg = `[${coupon.name}] 쿠폰을 구매하시겠습니까?\n\n` +
            `• 차감 포인트: ${coupon.price.toLocaleString()} P\n` +
            `• 구매 후 보유 잔여 포인트: ${(user.totalPoint - coupon.price).toLocaleString()} P\n\n` +
            `구매 완료 후 취소 및 포인트 환불은 불가합니다.`;

        if (!window.confirm(confirmMsg)) {
            return;
        }
        
        setIsSubmitting(true);
        try {
            const response = await api.post(`/coupons/${couponId}/buy`);
            alert(response.data?.data || `${coupon.name} 쿠폰을 성공적으로 구매했습니다!`);
            await fetchMe();
            navigate('/my-coupons');
        } catch (err) {
            alert(err.response?.data?.message || '쿠폰 구매에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="coupon-store-container"><div className="loading-spinner"></div></div>;
    if (error) return <div className="coupon-store-container"><div className="error-msg">{error}</div></div>;

    return (
        <div className="store-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">쿠폰 상점</h1>
                    <p className="page-subtitle">투자 수익으로 획득한 포인트로 특별한 혜택을 구매하세요.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="sub-tab-btn active" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary, #6366f1)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                        🛒 쿠폰 상점
                    </button>
                    <button className="sub-tab-btn" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'rgba(255,255,255,0.8)', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/my-coupons')}>
                        🎫 보유 쿠폰함
                    </button>
                </div>
            </header>

            <div className="points-status glass-panel">
                <div className="points-label">보유 현금 포인트 (Cash)</div>
                <div className="points-value">{user?.totalPoint?.toLocaleString() || 0} <span className="currency">P</span></div>
            </div>

            <div className="coupon-grid-wrapper glass-panel">
                <div className="coupon-grid">
                    {coupons.map(coupon => {
                        const cId = coupon.couponId || coupon.id;
                        const detail = getCouponDetail(coupon.name);
                        return (
                            <div key={cId} className="coupon-card glass-panel">
                                <div className="coupon-icon-wrapper" style={{ background: detail.bg, color: '#ffffff' }}>
                                    {detail.icon}
                                </div>
                                <h3 className="coupon-name">{coupon.name}</h3>
                                <p className="coupon-desc">{coupon.desc || detail.desc}</p>
                                <div className="coupon-footer">
                                    <div className="coupon-price">{coupon.price.toLocaleString()} P</div>
                                    {coupon.status === 'PAUSED' ? (
                                        <button className="buy-btn" style={{ background: '#94a3b8', cursor: 'not-allowed' }} disabled>
                                            판매 중지
                                        </button>
                                    ) : coupon.status === 'SOLD_OUT' ? (
                                        <button className="buy-btn" style={{ background: '#ef4444', cursor: 'not-allowed' }} disabled>
                                            품절/마감
                                        </button>
                                    ) : (
                                        <button 
                                            className="buy-btn" 
                                            onClick={() => handleBuy(coupon)}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? '처리중...' : '구매하기'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CouponStore;
