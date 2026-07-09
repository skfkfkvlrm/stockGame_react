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
            const response = await api.get('/auth/status');
            // 응답 포맷: { isAuthenticated: boolean, username: string, role: string }
            if (response.data.isAuthenticated) {
                // 추가 사용자 정보 조회 (옵션)
                const meResponse = await api.get('/members/me');
                set({ user: meResponse.data.data, isAuthenticated: true, error: null });
            } else {
                set({ user: null, isAuthenticated: false });
            }
        } catch (error) {
            set({ user: null, isAuthenticated: false, error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (studentId, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/members/login', { studentId, password });
            // ApiResponse<StudentResponse> 구조 가정
            if (response.data && response.data.data) {
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
            set({ user: null, isAuthenticated: false, error: null });
        } catch (error) {
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    }
}));

export default useAuthStore;
