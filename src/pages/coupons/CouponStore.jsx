import React, { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import './CouponStore.css';

const CouponStore = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const response = await api.get('/api/coupons');
            if (response.data.success) {
                setCoupons(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch coupons', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyCoupon = async (couponId) => {
        if (!window.confirm('이 쿠폰을 구매하시겠습니까?')) return;
        
        try {
            const response = await api.post(`/api/coupons/${couponId}/buy`);
            if (response.data.success) {
                alert('쿠폰 구매에 성공했습니다!');
                fetchCoupons(); // 목록 갱신
            } else {
                alert(response.data.message || '쿠폰 구매 실패');
            }
        } catch (error) {
            console.error('Buy Coupon Error:', error);
            alert(error.response?.data?.message || '오류가 발생했습니다.');
        }
    };

    if (loading) return <div className="loading">쿠폰 상점 데이터를 불러오는 중입니다...</div>;

    return (
        <div className="store-page">
            <h2>쿠폰 상점</h2>
            <div className="coupon-grid">
                {coupons.length > 0 ? (
                    coupons.map(coupon => (
                        <div key={coupon.couponId} className="coupon-card">
                            <h3 className="coupon-name">{coupon.name}</h3>
                            <p className="coupon-desc">{coupon.description}</p>
                            <div className="coupon-footer">
                                <span className="coupon-price">{coupon.price?.toLocaleString()} P</span>
                                <button onClick={() => handleBuyCoupon(coupon.couponId)} className="buy-btn">구매하기</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-message">현재 판매 중인 쿠폰이 없습니다.</div>
                )}
            </div>
        </div>
    );
};

export default CouponStore;
