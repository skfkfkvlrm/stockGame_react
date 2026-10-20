import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const newsService = {
    /**
     * 뉴스 목록 조회 (기본 500건: 최근 약 42시간 치 뉴스 전수 조회로 어제/오늘 뉴스 완벽 커버)
     */
    async getNews(limit = 500) {
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
     * [테스트/관리자] 가상 AI 시황 뉴스 즉시 생성 요청 (Google Gemini API 탑재 Edge Function 최우선 호출)
     */
    async triggerNews(options = {}) {
        if (isSupabaseMode) {
            // 1. Google Gemini 2.5 Flash Lite 탑재 Edge Function 최우선 호출
            try {
                const { data, error } = await supabase.functions.invoke('generate-news', {
                    body: options
                });
                if (!error && data) return data;
            } catch (fnErr) {
                console.warn('[newsService] Edge function invoke fallback:', fnErr);
            }

            // 2. Edge Function 장애 시 Supabase RPC generate_ai_news 폴백
            try {
                const { data, error } = await supabase.rpc('generate_ai_news', {
                    p_stock_id: options.stockId || options.stock_id || null,
                    p_sentiment: options.sentiment || options.forceSentiment || null
                });
                if (!error && data) {
                    return data;
                }
            } catch (rpcErr) {
                console.warn('[newsService] RPC generate_ai_news fallback failed:', rpcErr);
            }
        }
        return null;
    },

    /**
     * [Deprecated] 무인 자동 뉴스 생성 스케줄러
     * 서버 사이드 pg_cron ('auto-generate-news-job')으로 뉴스 자동 발행 책임이 100% 일원화되었으므로,
     * 클라이언트 이중 호출 충돌을 방지하기 위해 안전한 no-op 함수로 전환되었습니다.
     */
    startAutoNewsScheduler() {
        return () => {};
    }
};

export default newsService;