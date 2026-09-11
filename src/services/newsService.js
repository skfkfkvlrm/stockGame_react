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
    },

    /**
     * 무인 자동 뉴스 생성 스케줄러 (Auto News Generator)
     * 기본 주기: 3분 (180,000ms)
     * 최신 뉴스 발행 시각을 조회하여 3분 이상 경과했을 때만 RPC 호출 (다중 탭/유저 중복 방지)
     */
    startAutoNewsScheduler(intervalMs = 180000) {
        if (!isSupabaseMode) return () => {};

        const checkAndGenerate = async () => {
            try {
                // 1. 가장 최근에 발행된 뉴스의 생성 시각 확인
                const { data, error } = await supabase
                    .from('news')
                    .select('created_at')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!error && data && data.created_at) {
                    const lastCreatedTime = new Date(data.created_at).getTime();
                    const now = Date.now();
                    // 최근 뉴스가 발행된 지 아직 intervalMs(기본 3분)가 지나지 않았으면 스킵
                    if (now - lastCreatedTime < intervalMs) {
                        return;
                    }
                }

                // 2. intervalMs 이상 경과했거나 뉴스가 없으면 신규 AI 속보 자동 생성
                console.log('[newsService] ⏰ Auto-generating periodic AI stock market news...');
                await this.triggerNews();
            } catch (err) {
                console.warn('[newsService] Auto news scheduler cycle failed:', err);
            }
        };

        // 페이지 마운트 5초 후 최초 1회 체크, 이후 intervalMs 마다 주기적 실행
        const initialTimer = setTimeout(checkAndGenerate, 5000);
        const timerId = setInterval(checkAndGenerate, intervalMs);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(timerId);
        };
    }
};

export default newsService;
