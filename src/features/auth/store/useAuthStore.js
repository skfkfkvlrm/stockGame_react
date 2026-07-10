import { create } from 'zustand';
import api from '../../../api/axios';

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    checkAuthStatus: async () => {
        set({ isLoading: true });
        try {
            const token = localStorage.getItem('jwt_token');
            if (token) {
                // 추가 사용자 정보 조회
                const meResponse = await api.get('/members/me');
                if (meResponse.data && meResponse.data.success) {
                    set({ user: meResponse.data.data, isAuthenticated: true, error: null });
                } else {
                    localStorage.removeItem('jwt_token');
                    set({ user: null, isAuthenticated: false });
                }
            } else {
                set({ user: null, isAuthenticated: false });
            }
        } catch (error) {
            localStorage.removeItem('jwt_token');
            set({ user: null, isAuthenticated: false, error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (studentId, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/members/login', { studentId, password });
            if (response.data && response.data.success) {
                // message 필드에 token이 들어있음 (임시 구성)
                const token = response.data.message; 
                localStorage.setItem('jwt_token', token);
                set({ user: response.data.data, isAuthenticated: true });
                return { success: true };
            }
            return { success: false, message: response.data?.message || '로그인 실패' };
        } catch (error) {
            set({ error: error.response?.data?.message || '서버 에러가 발생했습니다.', isLoading: false });
            return { success: false, message: error.response?.data?.message || '로그인 실패' };
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            await api.post('/members/logout');
        } catch (error) {
            console.error(error);
        } finally {
            localStorage.removeItem('jwt_token');
            set({ user: null, isAuthenticated: false, error: null, isLoading: false });
        }
    }
}));

export default useAuthStore;
