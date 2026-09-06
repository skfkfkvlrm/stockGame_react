import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const assetService = {
    /**
     * 학생 개인 총 자산 및 보유 주식 잔고 요약 조회
     */
    async getMyAsset(userId) {
        if (isSupabaseMode) {
            if (!userId) {
                return {
                    totalAsset: 100000,
                    totalPoint: 100000,
                    availablePoints: 100000,
                    totalProfit: 0,
                    myStocks: []
                };
            }

            // 1. 프로필 가용 포인트 조회
            const { data: profile } = await supabase
                .from('profiles')
                .select('total_point')
                .eq('id', userId)
                .single();

            const totalPoint = profile?.total_point ?? 0;

            // 2. 보유 주식 목록 및 종목 정보 JOIN 조회
            const { data: holdings, error } = await supabase
                .from('user_holdings')
                .select(`
                    id,
                    amount,
                    locked_amount,
                    average_price,
                    total_invested_amount,
                    stock:stocks (
                        id,
                        name,
                        current_price,
                        prev_price,
                        status
                    )
                `)
                .eq('user_id', userId);

            if (error) {
                console.error('Fetch user holdings error:', error);
            }

            let stockEvaluationTotal = 0;
            let totalInvested = 0;

            const myStocks = (holdings || []).map(h => {
                const stock = h.stock || {};
                const currentPrice = stock.current_price || 0;
                const totalShares = (h.amount || 0) + (h.locked_amount || 0);
                const evalPrice = currentPrice * totalShares;
                const invested = Number(h.total_invested_amount || 0);
                const profit = evalPrice - invested;
                const profitRate = invested > 0 ? ((profit / invested) * 100) : 0;

                stockEvaluationTotal += evalPrice;
                totalInvested += invested;

                return {
                    stockId: stock.id,
                    stockName: stock.name,
                    amount: h.amount,
                    lockedAmount: h.locked_amount,
                    totalAmount: totalShares,
                    averagePrice: h.average_price,
                    nowPrice: currentPrice,
                    prevPrice: stock.prev_price || currentPrice,
                    evalPrice: evalPrice,
                    profit: profit,
                    profitRate: profitRate
                };
            });

            const totalAsset = totalPoint + stockEvaluationTotal;
            const totalProfit = stockEvaluationTotal - totalInvested;

            return {
                totalAsset,
                totalPoint,
                availablePoints: totalPoint,
                totalProfit,
                myStocks,
                portfolio: myStocks
            };
        }

        const res = await api.get('/asset').catch(() => ({ data: { data: null } }));
        return res.data?.data || null;
    },

    /**
     * 학생 포인트 및 자산 변동 이력 조회
     */
    async getHistory(userId) {
        if (isSupabaseMode) {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('point_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Fetch point transactions error:', error);
                return [];
            }

            return (data || []).map(tx => ({
                id: tx.id,
                amount: tx.amount,
                balanceAfter: tx.balance_after,
                reason: tx.reason_type,
                historyContent: tx.description || tx.reason_type,
                description: tx.description,
                createdDate: tx.created_at
            }));
        }

        const res = await api.get('/history').catch(() => ({ data: { data: [] } }));
        return Array.isArray(res.data?.data) ? res.data.data : [];
    }
};

export default assetService;
