import axios from 'axios';

const api = axios.create({
    baseURL: '', // vite proxy를 통해 백엔드로 전달됨
    withCredentials: true, // 세션 쿠키 등 인증 정보를 주고받기 위해 필수
});

// 응답 인터셉터: 401 Unauthorized 발생 시 로그인 페이지로 이동하거나,
// 200 OK이지만 success: false 이고 메시지가 "로그인이 필요합니다."인 경우 리다이렉트
api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.success === false) {
            if (response.data.message && response.data.message.includes('로그인')) {
                window.location.href = '/login';
            }
        }
        return response;
    },
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
