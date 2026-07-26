import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Vite proxy를 통해 백엔드로 전달됨
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: localStorage에서 JWT 토큰을 가져와 Authorization 헤더에 추가
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: 401 Unauthorized / 403 Forbidden 발생 시 세션 만료 처리 및 /login 자동 라우팅
api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.success === false) {
            if (response.data.message && response.data.message.includes('로그인')) {
                localStorage.removeItem('jwt_token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return response;
    },
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.error('Authentication required or session expired.');
            localStorage.removeItem('jwt_token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        } else if (!error.response) {
            console.error('Network or Setup Error: ', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
