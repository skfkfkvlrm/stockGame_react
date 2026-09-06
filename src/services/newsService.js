import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const newsService = {
    /**
     * 뉴스 목록 조회
     */
    async getNews(limit = 50) {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('news')
                .select('*, stocks(id, name)')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

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
     * [테스트/관리자] 가상 AI 시황 뉴스 즉시 생성 요청 (Edge Function 호출)
     */
    async triggerNews(options = {}) {
        if (isSupabaseMode) {
            const { data, error } = await supabase.functions.invoke('generate-news', {
                body: options
            });
            if (error) throw error;
            return data;
        }
        return null;
    }
};

export default newsService;
