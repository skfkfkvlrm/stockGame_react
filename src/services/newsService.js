import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const newsService = {
    /**
     * 뉴스 목록 조회
     */
    async getNews(limit = 50) {
        if (isSupabaseMode) {
            let { data, error } = await supabase
                .from('news')
                .select('*, stocks(id, name)')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            // 만약 뉴스가 비어있다면 자동 1건 생성 (Self-Healing Auto-Seed)
            if (!data || data.length === 0) {
                try {
                    await supabase.rpc('generate_ai_news', { p_stock_id: null, p_sentiment: null });
                    const retry = await supabase
                        .from('news')
                        .select('*, stocks(id, name)')
                        .order('created_at', { ascending: false })
                        .limit(limit);
                    if (retry.data && retry.data.length > 0) {
                        data = retry.data;
                    }
                } catch (seedErr) {
                    console.warn('[newsService] Auto-seed news fallback failed:', seedErr);
                }
            }

            return (data || []).map(n => ({
                id: n.id,
                newsId: n.id,
                stockId: n.stock_id,
                stockName: n.stocks?.name || '',
                title: n.headline,
                headline: n.headline,
                content: n.content,
                sentiment: n.sentiment,
                impactRate: n.impact_rate,
                createdDate: n.created_at,
                createdAt: n.created_at
            }));
        }

        const res = await api.get('/news');
        return res.data?.data || [];
    },

    /**
     * Supabase Realtime 뉴스 신규 발행 이벤트 실시간 구독
     */
    subscribeNews(onInsert) {
        if (!isSupabaseMode) {
            return () => {};
        }

        const channel = supabase
            .channel('realtime_news_feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'news' },
                async (payload) => {
                    let stockName = '';
                    if (payload.new && payload.new.stock_id) {
                        try {
                            const { data: stock } = await supabase
                                .from('stocks')
                                .select('name')
                                .eq('id', payload.new.stock_id)
                                .single();
                            if (stock) stockName = stock.name;
                        } catch (e) {
                            console.warn('[newsService] Stock name fetch failed:', e);
                        }
                    }

                    const formatted = {
                        id: payload.new.id,
                        newsId: payload.new.id,
                        stockId: payload.new.stock_id,
                        stockName: stockName,
                        title: payload.new.headline,
                        headline: payload.new.headline,
                        content: payload.new.content,
                        sentiment: payload.new.sentiment,
                        impactRate: payload.new.impact_rate,
                        createdDate: payload.new.created_at,
                        createdAt: payload.new.created_at
                    };

                    onInsert(formatted);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * [테스트/관리자] 가상 AI 시황 뉴스 즉시 생성 요청 (Supabase RPC 및 Edge Function 호환)
     */
    async triggerNews(options = {}) {
        if (isSupabaseMode) {
            try {
                // 1. Supabase RPC generate_ai_news 직접 호출
                const { data, error } = await supabase.rpc('generate_ai_news', {
                    p_stock_id: options.stockId || options.stock_id || null,
                    p_sentiment: options.sentiment || options.forceSentiment || null
                });
                if (!error && data) {
                    return data;
                }
            } catch (rpcErr) {
                console.warn('[newsService] RPC generate_ai_news fallback:', rpcErr);
            }

            // 2. Edge Function 호출 폴백 (배포되어 있을 경우)
            try {
                const { data, error } = await supabase.functions.invoke('generate-news', {
                    body: options
                });
                if (!error) return data;
            } catch (fnErr) {
                console.warn('[newsService] Edge function invoke fallback failed:', fnErr);
            }
        }
        return null;
    }
};

export default newsService;
