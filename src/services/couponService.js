import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';
import useAuthStore from '../features/auth/store/useAuthStore';

export const couponService = {
    /**
     * 상점 판매 쿠폰 목록 조회
     */
    async getCoupons() {
        if (isSupabaseMode) {
            try {
                const { data, error } = await supabase
                    .from('coupons')
                    .select('*')
                    .order('price', { ascending: true });

                if (error) {
                    console.error('Fetch coupons error from Supabase:', error);
                    return [];
                }
                return (data || []).map(c => ({
                    id: c.id,
                    couponId: c.id,
                    couponCode: c.coupon_code,
                    name: c.name,
                    price: c.price,
                    status: c.status
                }));
            } catch (err) {
                console.error('getCoupons unexpected error:', err);
                return [];
            }
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
                if (error.code === 'PGRST202') {
                    throw new Error('쿠폰 구매 함수(buy_coupon)가 아직 Supabase DB에 등록되지 않았습니다. 관리자(SQL 실행)에게 문의하세요.');
                }
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
            let userId = null;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                    userId = session.user.id;
                } else {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user?.id) {
                        userId = user.id;
                    }
                }
            } catch (authErr) {
                console.warn('Session retrieval warning:', authErr);
            }

            // Fallback to Zustand Auth Store user ID
            if (!userId) {
                const storeUser = useAuthStore.getState().user;
                userId = storeUser?.id;
            }

            if (!userId) {
                return [];
            }

            const { data, error } = await supabase
                .from('user_coupons')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('user_coupons query warning:', error);
                return [];
            }

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
                if (error.code === 'PGRST202') {
                    throw new Error('쿠폰 사용 함수(use_coupon)가 아직 Supabase DB에 등록되지 않았습니다. 관리자(SQL 실행)에게 문의하세요.');
                }
                throw new Error(error.message || '쿠폰 사용 처리에 실패했습니다.');
            }
            return data;
        }

        const response = await api.patch(`/coupons/${purchaseId}/use`);
        return response.data;
    }
};

export default couponService;
