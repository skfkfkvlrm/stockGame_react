import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const stockService = {
    /**
     * 주식 종목 전체 목록 조회
     */
    async getStocks() {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('stocks')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;

            // 종목별 체결 거래량 집계
            const { data: tradeData } = await supabase
                .from('order_trades')
                .select('stock_id, amount');

            const volumeMap = {};
            if (tradeData) {
                tradeData.forEach(t => {
                    volumeMap[t.stock_id] = (volumeMap[t.stock_id] || 0) + (t.amount || 0);
                });
            }

            return (data || []).map(s => ({
                id: s.id,
                stockId: s.id,
                name: s.name,
                stockName: s.name,
                content: s.content || '',
                nowPrice: s.current_price,
                price: s.current_price,
                prevPrice: s.prev_price,
                pubPrice: s.publication_price,
                pubAmount: s.publication_balance,
                tradeVolume: volumeMap[s.id] || 0,
                highLimitPrice: s.high_limit_price,
                lowLimitPrice: s.low_limit_price,
                marketStatus: s.market_status,
                status: s.status,
                createdAt: s.created_at
            }));
        }

        const res = await api.get('/stock');
        return res.data?.data || [];
    },

    /**
     * 특정 종목 상세 정보 조회
     */
    async getStockDetail(stockId) {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('stocks')
                .select('*')
                .eq('id', stockId)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                stockId: data.id,
                name: data.name,
                stockName: data.name,
                content: data.content || '',
                nowPrice: data.current_price,
                prevPrice: data.prev_price,
                pubPrice: data.publication_price,
                pubAmount: data.publication_balance,
                highLimitPrice: data.high_limit_price,
                lowLimitPrice: data.low_limit_price,
                marketStatus: data.market_status,
                status: data.status,
                createdAt: data.created_at
            };
        }

        const res = await api.get(`/stock/${stockId}`);
        return res.data?.data;
    },

    /**
     * 특정 종목 10단계 호가창 데이터 조회
     */
    async getOrderbook(stockId) {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('stock_id', stockId)
                .in('status', ['PENDING', 'PARTIAL']);

            if (error) throw error;

            const sellOrders = [];
            const buyOrders = [];

            (data || []).forEach(o => {
                if (o.order_type === 'SELL') {
                    sellOrders.push({ price: o.price, amount: o.remain_amount });
                } else if (o.order_type === 'BUY') {
                    buyOrders.push({ price: o.price, amount: o.remain_amount });
                }
            });

            return { sell: sellOrders, buy: buyOrders };
        }

        const res = await api.get(`/stock/${stockId}/orderbook`);
        return res.data?.data || { sell: [], buy: [] };
    },

    /**
     * 특정 종목 내 미체결 주문 목록 조회
     */
    async getMyOrders(stockId, userId) {
        if (isSupabaseMode) {
            let targetUserId = userId;
            if (!targetUserId) {
                const { data: { session } } = await supabase.auth.getSession();
                targetUserId = session?.user?.id;
            }
            if (!targetUserId) return [];

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('stock_id', stockId)
                .eq('user_id', targetUserId)
                .in('status', ['PENDING', 'PARTIAL'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(o => {
                const isBuy = o.order_type === 'BUY';
                return {
                    orderId: o.id,
                    id: o.id,
                    stockId: o.stock_id,
                    price: o.price,
                    amount: o.remain_amount,
                    initialAmount: o.amount,
                    type: o.order_type,
                    orderType: o.order_type,
                    content: isBuy ? '매수' : '매도',
                    status: o.status,
                    createdDate: o.created_at
                };
            });
        }

        const res = await api.get(`/stock/${stockId}/orders/my`);
        return res.data?.data || [];
    },

    /**
     * 종목 시세 히스토리 조회
     */
    async getStockHistory(stockId) {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('stock_price_history')
                .select('*')
                .eq('stock_id', stockId)
                .order('base_date', { ascending: true });

            if (error) throw error;

            return (data || []).map(h => ({
                date: h.base_date,
                baseDate: h.base_date,
                openPrice: h.open_price,
                highPrice: h.high_price,
                lowPrice: h.low_price,
                closePrice: h.close_price,
                price: h.close_price,
                volume: h.volume
            }));
        }

        const res = await api.get(`/stock/${stockId}/history`);
        return res.data?.data || [];
    },

    /**
     * 지정가 호가 주문 접수 및 원자적 체결 실행 (RPC)
     */
    async placeOrder({ stockId, orderType, price, amount }) {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('place_and_match_order', {
                p_stock_id: parseInt(stockId, 10),
                p_order_type: orderType,
                p_price: parseInt(price, 10),
                p_amount: parseInt(amount, 10)
            });

            if (error) {
                throw new Error(error.message || '주문 체결 중 오류가 발생했습니다.');
            }

            return data;
        }

        const endpoint = orderType === 'BUY' ? '/orders/buy' : '/orders/sell';
        const res = await api.post(endpoint, {
            stockId: parseInt(stockId, 10),
            amount: parseInt(amount, 10),
            quantity: parseInt(amount, 10),
            price: parseInt(price, 10)
        });
        return res.data;
    },

    /**
     * 미체결 주문 취소 및 자산 환불 (RPC)
     */
    async cancelOrder(orderId, stockId) {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('cancel_stock_order', {
                p_order_id: parseInt(orderId, 10)
            });

            if (error) {
                throw new Error(error.message || '주문 취소 중 오류가 발생했습니다.');
            }

            return data;
        }

        const res = await api.post(`/orders/cancel?orderId=${orderId}&stockId=${stockId}`);
        return res.data;
    },

    /**
     * Supabase Realtime 호가 및 체결 변동 구독
     */
    subscribeOrderbook(stockId, onUpdate) {
        if (!isSupabaseMode || !stockId) {
            return () => {};
        }

        const channel = supabase
            .channel(`orderbook_realtime_${stockId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `stock_id=eq.${stockId}` },
                (payload) => {
                    onUpdate('ORDER_UPDATED', payload);
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'order_trades', filter: `stock_id=eq.${stockId}` },
                (payload) => {
                    onUpdate('TRADE_UPDATED', payload);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};

export default stockService;
