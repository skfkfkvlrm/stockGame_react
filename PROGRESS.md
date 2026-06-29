# 프론트엔드 프로젝트 진행 상황 (stockGame_react)

## 현재 상태: 트랙 B (React 마이그레이션) 1단계 진행 완료 🛠️

현재 `stockGame_react` 프로젝트는 백엔드의 REST API와 비동기 통신을 하기 위해 **SPA(Single Page Application)** 뼈대를 새롭게 구축한 상태입니다.

### 🚀 완료된 핵심 기능 (1단계)
1. **최신 React 환경 구축**
   - 가볍고 빠른 빌드 도구인 **Vite**를 사용하여 초기화 완료
2. **필수 통신 라이브러리 탑재**
   - 화면간 이동(라우팅): `react-router-dom`
   - 백엔드 REST 통신: `axios` 
     - 💡 `axiosConfig.js`를 통해 백엔드 주소(`http://localhost:8080`)와 쿠키 허용(`withCredentials: true`) 전역 세팅 완료
   - 실시간 웹소켓 통신: `@stomp/stompjs`, `sockjs-client`
3. **기초 스켈레톤 작성**
   - `src/App.jsx` 내부에 `BrowserRouter`와 `Routes`를 띄워 로그인, 주식 목록, 대시보드 등의 경로(Path)를 가안으로 설정

### 📌 향후 계획 (2단계 ~ 4단계)
1. **JSP 뷰 컴포넌트 변환 (2단계)**
   - 기존 스프링에 있던 JSP 파일들(Login.jsp, MyAssets.jsp, StockList.jsp 등)의 HTML/CSS 디자인 요소를 React의 JSX 형태로 변환
2. **데이터 연동 (3, 4단계)**
   - `useEffect`와 `useState`를 이용해 화면 진입 시 서버에서 JSON 데이터를 Fetching
   - WebSocket 클라이언트를 연결하여 실시간 호가 변동 및 개인 체결 알림 토스트 메시지 렌더링
   - 차트 라이브러리(ApexCharts 등)를 이용한 OHLCV 캔들스틱 차트 구현
