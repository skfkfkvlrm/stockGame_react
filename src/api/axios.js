import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // 프록시 설정 덕분에 /api 로 시작하면 자동으로 백엔드로 전달됨
    withCredentials: true, // 세션 쿠키 유지를 위해 필수
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response Interceptor for global error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            // 서버에서 응답을 반환한 경우 (4xx, 5xx)
            if (error.response.status === 401) {
                // 인증 에러 시 (예: 세션 만료)
                console.error("Authentication required or session expired.");
                // TODO: useAuthStore의 logout 상태로 변경하거나 로그인 페이지로 리다이렉트 처리
            } else {
                console.error("API Error: ", error.response.data);
            }
        } else {
            console.error("Network or Setup Error: ", error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
