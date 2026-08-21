import { create } from 'zustand';
import api from '../../../api/axios';

const useMarketStore = create((set) => ({
    marketOpen: true,
    isLoading: false,

    fetchMarketStatus: async () => {
        try {
            set({ isLoading: true });
            const res = await api.get('/stock/admin/market/status');
            const isOpen = res.data?.data?.marketOpen ?? true;
            set({ marketOpen: isOpen, isLoading: false });
            return isOpen;
        } catch (err) {
            console.error('Failed to fetch market status in store:', err);
            set({ isLoading: false });
            return true;
        }
    },

    toggleMarketStatus: async () => {
        try {
            set({ isLoading: true });
            const res = await api.post('/stock/admin/market/toggle');
            const isOpen = res.data?.data?.marketOpen;
            set({ marketOpen: isOpen, isLoading: false });
            return isOpen;
        } catch (err) {
            console.error('Failed to toggle market status in store:', err);
            set({ isLoading: false });
            throw err;
        }
    }
}));

export default useMarketStore;
