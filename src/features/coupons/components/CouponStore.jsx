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

const CouponStore = () => {
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
        
        setIsSubmitting(true);
        try {
            const response = await api.post(`/coupons/${couponId}/buy`);
            alert(response.data?.data || `${coupon.name} 쿠폰을 구매했습니다!`);
            fetchMe();
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
            <header className="page-header">
                <h1 className="page-title">쿠폰 상점</h1>
                <p className="page-subtitle">투자 수익으로 획득한 포인트로 특별한 혜택을 구매하세요.</p>
            </header>

            <div className="points-status glass-panel">
                <div className="points-label">내 주문 가능 포인트</div>
                <div className="points-value">{user?.totalPoint?.toLocaleString() || 0} <span className="currency">P</span></div>
            </div>

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
                                <button 
                                    className="buy-btn" 
                                    onClick={() => handleBuy(coupon)}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? '처리중...' : '구매하기'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CouponStore;
