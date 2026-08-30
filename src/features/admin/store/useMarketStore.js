import { create } from 'zustand';
import api from '../../../api/axios';

const useMarketStore = create((set) => ({
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
            set({ isLoading: false });
            return null;
        } catch (err) {
            console.error('Failed to fetch market status in student store:', err);
            set({ isLoading: false });
            return null;
        }
    }
}));

export default useMarketStore;

