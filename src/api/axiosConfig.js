import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8882',
    withCredentials: true, // 세션 쿠키 등 인증 정보를 주고받기 위해 필수
});

// 응답 인터셉터: 401 Unauthorized 발생 시 로그인 페이지로 이동
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
