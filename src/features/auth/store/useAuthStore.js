import { create } from 'zustand';
import authService from '../../../services/authService';

const initialToken = localStorage.getItem('jwt_token');

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: !!initialToken,
    isLoading: !!initialToken,
    error: null,

    fetchMe: async () => {
        try {
            const user = await authService.getCurrentUser();
            if (user) {
                set({ user, isAuthenticated: true });
            }
        } catch (error) {
            console.error('Silent refresh user info error:', error);
        }
    },

    checkAuthStatus: async () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
        }

        set({ isLoading: true });
        try {
            const user = await authService.getCurrentUser();
            if (user) {
                set({ user, isAuthenticated: true, error: null });
            } else {
                localStorage.removeItem('jwt_token');
                set({ user: null, isAuthenticated: false });
            }
        } catch (error) {
            console.error('Check Auth Status Error:', error);
            localStorage.removeItem('jwt_token');
            set({ user: null, isAuthenticated: false, error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (studentId, password) => {
        set({ isLoading: true, error: null });
        try {
            const user = await authService.login(studentId, password);
            set({ user, isAuthenticated: true, error: null });
            return { success: true };
        } catch (error) {
            const msg = error.message || '로그인에 실패했습니다.';
            set({ error: msg, isLoading: false });
            return { success: false, message: msg };
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('jwt_token');
            set({ user: null, isAuthenticated: false, error: null, isLoading: false });
        }
    }
}));

export default useAuthStore;
