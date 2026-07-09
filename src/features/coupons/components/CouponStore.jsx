import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Clock } from 'lucide-react';
import api from '../../../api/axios';
import useAuthStore from '../../auth/store/useAuthStore';
import './CouponStore.css';

const CouponStore = () => {
    const user = useAuthStore((state) => state.user);
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
        if (!user || user.totalPoint < coupon.price) {
            alert('포인트가 부족합니다!');
            return;
        }
        
        setIsSubmitting(true);
        try {
            const response = await api.post(`/coupons/${coupon.id}/buy`);
            alert(response.data?.data || `${coupon.name} 쿠폰을 구매했습니다!`);
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
                {coupons.map(coupon => (
                    <div key={coupon.id} className="coupon-card glass-panel">
                        <div className="coupon-icon-wrapper">
                            <Star size={24} />
                        </div>
                        <h3 className="coupon-name">{coupon.name}</h3>
                        <p className="coupon-desc">{coupon.desc}</p>
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
                ))}
            </div>
        </div>
    );
};

export default CouponStore;
