import React, { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import './MyCoupons.css';

const MyCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyCoupons();
    }, []);

    const fetchMyCoupons = async () => {
        try {
            const response = await api.get('/api/coupons/my');
            if (response.data.success) {
                setCoupons(response.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch my coupons', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">나의 쿠폰을 불러오는 중입니다...</div>;

    return (
        <div className="my-coupons-page">
            <h2>보유 쿠폰 내역</h2>
            <div className="coupon-list">
                {coupons.length > 0 ? (
                    coupons.map((coupon, index) => (
                        <div key={index} className="my-coupon-card">
                            <div className="my-coupon-info">
                                <h3 className="coupon-name">{coupon.name}</h3>
                                <span className={`coupon-status ${coupon.state === 'USED' ? 'used' : 'unused'}`}>
                                    {coupon.state === 'USED' ? '사용완료' : '사용가능'}
                                </span>
                            </div>
                            <div className="coupon-footer">
                                <span className="coupon-price">{coupon.price?.toLocaleString()} P</span>
                                <span className="coupon-date">{new Date(coupon.createdDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-message">보유 중인 쿠폰이 없습니다.</div>
                )}
            </div>
        </div>
    );
};

export default MyCoupons;
