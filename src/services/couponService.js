import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const couponService = {
    /**
     * 상점 판매 쿠폰 목록 조회
     */
    async getCoupons() {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            return (data || []).map(c => ({
                id: c.id,
                couponId: c.id,
                couponCode: c.coupon_code,
                name: c.name,
                price: c.price,
                status: c.status
            }));
        }

        const response = await api.get('/coupons');
        return response.data?.data || [];
    },

    /**
     * 쿠폰 구매
     */
    async buyCoupon(couponId) {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('buy_coupon', {
                p_coupon_id: Number(couponId)
            });

            if (error) {
                throw new Error(error.message || '쿠폰 구매에 실패했습니다.');
            }
            return data;
        }

        const response = await api.post(`/coupons/${couponId}/buy`);
        return response.data;
    },

    /**
     * 내가 보유한 쿠폰 목록 조회
     */
    async getMyCoupons() {
        if (isSupabaseMode) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('user_coupons')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(c => ({
                id: c.id,
                couponPurchaseId: c.id,
                couponId: c.coupon_id,
                name: c.name,
                price: c.purchase_price,
                state: c.status === 'UNUSED' ? '사용전' : (c.status === 'USED' ? '사용' : '취소'),
                status: c.status,
                createdDate: c.created_at,
                usedDate: c.used_at
            }));
        }

        const response = await api.get('/coupons/my');
        return response.data?.data || [];
    },

    /**
     * 쿠폰 사용 처리
     */
    async useCoupon(purchaseId) {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('use_coupon', {
                p_purchase_id: Number(purchaseId)
            });

            if (error) {
                throw new Error(error.message || '쿠폰 사용 처리에 실패했습니다.');
            }
            return data;
        }

        const response = await api.patch(`/coupons/${purchaseId}/use`);
        return response.data;
    }
};

export default couponService;
