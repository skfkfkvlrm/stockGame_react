import { create } from 'zustand';
import api from '../../../api/axios';
import { supabase, isSupabaseMode } from '../../../lib/supabaseClient';

let realtimeChannel = null;
let periodicTimer = null;

/**
 * 한국 표준시(KST, UTC+9) 기준 시장 운영 상태 동적 계산 함수
 */
export function calculateMarketStatus(settings) {
    if (!settings) {
        return { marketOpen: false, statusCode: 'CLOSED' };
    }

    const mode = settings.mode || 'AUTO';
    if (mode === 'MANUAL') {
        const isOpen = settings.marketOpen ?? settings.is_market_open ?? false;
        return {
            marketOpen: isOpen,
            statusCode: settings.statusCode || settings.status_code || (isOpen ? 'OPEN' : 'MANUAL_PAUSE')
        };
    }

    // AUTO 모드: 한국 표준시(KST, UTC+9) 기준 요일 및 운영 시간 실시간 판별
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kst = new Date(utc + (9 * 3600000));

    const day = kst.getDay(); // 0: 일요일, 6: 토요일
    if (day === 0 || day === 6) {
        return { marketOpen: false, statusCode: 'HOLIDAY' };
    }

    const currentHHMM = `${String(kst.getHours()).padStart(2, '0')}:${String(kst.getMinutes()).padStart(2, '0')}`;
    const open = settings.openTime || settings.open_time || '09:00';
    const close = settings.closeTime || settings.close_time || '15:30';
    const auctionStart = settings.callAuctionStartTime || settings.call_auction_start_time || '15:20';

    if (currentHHMM < open || currentHHMM >= close) {
        return { marketOpen: false, statusCode: 'CLOSED' };
    }
    if (currentHHMM >= auctionStart && currentHHMM < close) {
        return { marketOpen: true, statusCode: 'CALL_AUCTION' };
    }
    return { marketOpen: true, statusCode: 'OPEN' };
}

const initialComputed = calculateMarketStatus({
    mode: 'AUTO',
    openTime: '09:00',
    closeTime: '15:30',
    callAuctionStartTime: '15:20'
});

const useMarketStore = create((set, get) => ({
    marketOpen: initialComputed.marketOpen,
    mode: 'AUTO',
    openTime: '09:00',
    closeTime: '15:30',
    callAuctionStartTime: '15:20',
    statusCode: initialComputed.statusCode,
    isLoading: false,

    fetchMarketStatus: async () => {
        try {
            set({ isLoading: true });
            if (isSupabaseMode) {
                const { data, error } = await supabase
                    .from('market_settings')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (data && !error) {
                    const computed = calculateMarketStatus(data);
                    set({
                        marketOpen: computed.marketOpen,
                        mode: data.mode || 'AUTO',
                        openTime: data.open_time || '09:00',
                        closeTime: data.close_time || '15:30',
                        callAuctionStartTime: data.call_auction_start_time || '15:20',
                        statusCode: computed.statusCode,
                        isLoading: false
                    });
                    return { ...data, marketOpen: computed.marketOpen, statusCode: computed.statusCode };
                }
            } else {
                const res = await api.get('/stock/market/status');
                const data = res.data?.data;
                if (data) {
                    const computed = calculateMarketStatus(data);
                    set({
                        marketOpen: computed.marketOpen,
                        mode: data.mode || 'AUTO',
                        openTime: data.openTime || '09:00',
                        closeTime: data.closeTime || '15:30',
                        callAuctionStartTime: data.callAuctionStartTime || '15:20',
                        statusCode: computed.statusCode,
                        isLoading: false
                    });
                    return { ...data, marketOpen: computed.marketOpen, statusCode: computed.statusCode };
                }
            }
            set({ isLoading: false });
            return null;
        } catch (err) {
            console.error('Failed to fetch market status in student store:', err);
            set({ isLoading: false });
            return null;
        }
    },

    toggleMarketStatus: async () => {
        try {
            if (isSupabaseMode) {
                const { data, error } = await supabase.rpc('admin_toggle_market');
                if (error) throw error;
                if (data) {
                    const computed = calculateMarketStatus(data);
                    set({
                        marketOpen: computed.marketOpen,
                        mode: data.mode,
                        openTime: data.openTime,
                        closeTime: data.closeTime,
                        callAuctionStartTime: data.callAuctionStartTime,
                        statusCode: computed.statusCode
                    });
                    return computed.marketOpen;
                }
            } else {
                const res = await api.post('/stock/market/toggle');
                const data = res.data?.data;
                if (data) {
                    const computed = calculateMarketStatus(data);
                    set({
                        marketOpen: computed.marketOpen,
                        mode: data.mode,
                        openTime: data.openTime,
                        closeTime: data.closeTime,
                        callAuctionStartTime: data.callAuctionStartTime,
                        statusCode: computed.statusCode
                    });
                    return computed.marketOpen;
                }
            }
            return false;
        } catch (err) {
            console.error('Failed to toggle market status:', err);
            throw err;
        }
    },

    updateMarketSettings: async (newSettings) => {
        try {
            set({ isLoading: true });
            if (isSupabaseMode) {
                const { data, error } = await supabase.rpc('admin_update_market_settings', {
                    p_mode: newSettings.mode || 'AUTO',
                    p_open_time: newSettings.openTime || '09:00',
                    p_close_time: newSettings.closeTime || '15:30',
                    p_call_auction_start_time: newSettings.callAuctionStartTime || '15:20'
                });
                if (error) throw new Error(error.message || '시장 설정 저장 실패');
                if (data) {
                    const computed = calculateMarketStatus(data);
                    set({
                        marketOpen: computed.marketOpen,
                        mode: data.mode,
                        openTime: data.openTime,
                        closeTime: data.closeTime,
                        callAuctionStartTime: data.callAuctionStartTime || '15:20',
                        statusCode: computed.statusCode,
                        isLoading: false
                    });
                    return data;
                }
            } else {
                const res = await api.put('/admin/market/settings', newSettings);
                const data = res.data?.data;
                if (data) {
                    const computed = calculateMarketStatus(data);
                    set({
                        marketOpen: computed.marketOpen,
                        mode: data.mode,
                        openTime: data.openTime,
                        closeTime: data.closeTime,
                        callAuctionStartTime: data.callAuctionStartTime || '15:20',
                        statusCode: computed.statusCode,
                        isLoading: false
                    });
                    return data;
                }
            }
            set({ isLoading: false });
        } catch (err) {
            console.error('Failed to update market settings in store:', err);
            set({ isLoading: false });
            throw err;
        }
    },
    subscribeMarketEvents: () => {
        if (!periodicTimer) {
            // 30초 주기 AUTO 모드 시간 자동 갱신 (09:00, 15:20, 15:30 실시간 무인 전환)
            periodicTimer = setInterval(() => {
                const state = get();
                if (state.mode === 'AUTO') {
                    const computed = calculateMarketStatus(state);
                    if (computed.marketOpen !== state.marketOpen || computed.statusCode !== state.statusCode) {
                        set({
                            marketOpen: computed.marketOpen,
                            statusCode: computed.statusCode
                        });
                    }
                }
            }, 30000);
        }

        if (!isSupabaseMode) return;
        if (realtimeChannel) return;

        realtimeChannel = supabase
            .channel('realtime:market_settings_student')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'market_settings'
                },
                (payload) => {
                    const row = payload.new;
                    if (row && (row.id === 1 || row.id === '1')) {
                        const computed = calculateMarketStatus(row);
                        set({
                            marketOpen: computed.marketOpen,
                            mode: row.mode || 'AUTO',
                            openTime: row.open_time || '09:00',
                            closeTime: row.close_time || '15:30',
                            callAuctionStartTime: row.call_auction_start_time || '15:20',
                            statusCode: computed.statusCode
                        });
                    }
                }
            )
            .subscribe();
    },

    unsubscribeMarketEvents: () => {
        if (periodicTimer) {
            clearInterval(periodicTimer);
            periodicTimer = null;
        }
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }
    }
}));

export default useMarketStore;

