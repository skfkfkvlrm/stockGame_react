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

    loginAsDemo: async () => {
        set({ isLoading: true, error: null });
        try {
            const user = await authService.loginAsDemo();
            set({ user, isAuthenticated: true, error: null });
            return { success: true, user };
        } catch (error) {
            const msg = error.message || '데모 로그인에 실패했습니다.';
            set({ error: msg, isLoading: false });
            return { success: false, message: msg };
        } finally {
            set({ isLoading: false });
        }
    },

    updateUserProfile: (profile) => {
        if (!profile) return;
        set((state) => ({
            user: state.user
                ? {
                    ...state.user,
                    totalPoint: profile.total_point !== undefined ? profile.total_point : (profile.totalPoint !== undefined ? profile.totalPoint : state.user.totalPoint),
                    totalCoupon: profile.total_coupon !== undefined ? profile.total_coupon : (profile.totalCoupon !== undefined ? profile.totalCoupon : state.user.totalCoupon),
                    name: profile.name ?? state.user.name,
                    grade: profile.grade ?? state.user.grade,
                    className: profile.class_name ?? profile.className ?? state.user.className,
                    classNumber: profile.class_number ?? profile.classNumber ?? state.user.classNumber,
                }
                : state.user
        }));
    },

    rechargeDemoPoints: async (amount = 1000000) => {
        try {
            const res = await authService.rechargeDemoPoints(amount);
            set((state) => ({
                user: state.user
                    ? { ...state.user, totalPoint: res.totalPoint }
                    : state.user
            }));
            return {
                success: true,
                rechargedAmount: res.rechargedAmount,
                totalPoint: res.totalPoint
            };
        } catch (error) {
            const msg = error.message || '포인트 충전에 실패했습니다.';
            return { success: false, message: msg };
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
