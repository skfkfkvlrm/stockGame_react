import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080', // 백엔드 서버 주소
    withCredentials: true, // 세션 쿠키 등 인증 정보를 주고받기 위해 필수
});

export default api;
