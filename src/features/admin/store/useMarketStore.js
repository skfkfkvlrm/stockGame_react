import { create } from 'zustand';
import api from '../../../api/axios';
import { supabase, isSupabaseMode } from '../../../lib/supabaseClient';

let realtimeChannel = null;

const useMarketStore = create((set, get) => ({
    marketOpen: true,
    mode: 'AUTO',
    openTime: '09:00',
    closeTime: '15:30',
    callAuctionStartTime: '15:20',
    statusCode: 'OPEN',
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
                    set({
                        marketOpen: data.is_market_open,
                        mode: data.mode || 'AUTO',
                        openTime: data.open_time || '09:00',
                        closeTime: data.close_time || '15:30',
                        callAuctionStartTime: data.call_auction_start_time || '15:20',
                        statusCode: data.status_code || (data.is_market_open ? 'OPEN' : 'CLOSED'),
                        isLoading: false
                    });
                    return data;
                }
            } else {
                const res = await api.get('/stock/market/status');
                const data = res.data?.data;
                if (data) {
                    set({
                        marketOpen: data.marketOpen ?? true,
                        mode: data.mode || 'AUTO',
                        openTime: data.openTime || '09:00',
                        closeTime: data.closeTime || '15:30',
                        callAuctionStartTime: data.callAuctionStartTime || '15:20',
                        statusCode: data.statusCode || 'OPEN',
                        isLoading: false
                    });
                    return data;
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
                    set({
                        marketOpen: data.marketOpen,
                        mode: data.mode,
                        openTime: data.openTime,
                        closeTime: data.closeTime,
                        callAuctionStartTime: data.callAuctionStartTime,
                        statusCode: data.statusCode
                    });
                    return data.marketOpen;
                }
            } else {
                const res = await api.post('/stock/market/toggle');
                const data = res.data?.data;
                if (data) {
                    set({
                        marketOpen: data.marketOpen,
                        mode: data.mode,
                        openTime: data.openTime,
                        closeTime: data.closeTime,
                        callAuctionStartTime: data.callAuctionStartTime,
                        statusCode: data.statusCode
                    });
                    return data.marketOpen;
                }
            }
            return false;
        } catch (err) {
            console.error('Failed to toggle market status:', err);
            throw err;
        }
    },

    subscribeMarketEvents: () => {
        if (!isSupabaseMode) return;
        if (realtimeChannel) return;

        realtimeChannel = supabase
            .channel('realtime:market_settings_student')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'market_settings',
                    filter: 'id=eq.1'
                },
                (payload) => {
                    const row = payload.new;
                    if (row) {
                        set({
                            marketOpen: row.is_market_open,
                            mode: row.mode || 'AUTO',
                            openTime: row.open_time || '09:00',
                            closeTime: row.close_time || '15:30',
                            callAuctionStartTime: row.call_auction_start_time || '15:20',
                            statusCode: row.status_code || (row.is_market_open ? 'OPEN' : 'CLOSED')
                        });
                    }
                }
            )
            .subscribe();
    },

    unsubscribeMarketEvents: () => {
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }
    }
}));

export default useMarketStore;

