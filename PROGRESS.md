# 프론트엔드 프로젝트 진행 상황 (stockGame_react)

## 현재 상태: 트랙 B (React 마이그레이션) 1단계 진행 완료 🛠️

현재 `stockGame_react` 프로젝트는 백엔드의 REST API와 비동기 통신을 하기 위해 **SPA(Single Page Application)** 뼈대를 새롭게 구축한 상태입니다.

### 🚀 완료된 핵심 기능
1. **최신 React 환경 구축 (1단계)**
   - 가볍고 빠른 빌드 도구인 **Vite**를 사용하여 초기화 완료
2. **필수 통신 라이브러리 탑재 (1단계)**
   - 화면간 이동(라우팅): `react-router-dom`
   - 백엔드 REST 통신: `axios` 
     - 💡 `axiosConfig.js`를 통해 백엔드 주소(`http://localhost:8080`)와 쿠키 허용(`withCredentials: true`) 전역 세팅 완료
   - 실시간 웹소켓 통신: `@stomp/stompjs`, `sockjs-client`
3. **핵심 뷰 컴포넌트 JSX 변환 (2단계)**
   - `Sidebar` 및 `MainLayout`으로 공통 화면 네비게이션 구조 이관
   - `Login.jsx` (기존 Login.jsp 폼 이관)
   - `Dashboard.jsx` (기존 MyAssets.jsp 자산 대시보드 구조 이관)
   - `StockList.jsx` (기존 StockList.jsp 종목 목록 및 등락률 조건부 렌더링 이관)
4. **백엔드 REST API 데이터 연동 (3, 4단계) - 완료 및 테스트 통과 🎉**
   - `axiosConfig.js` 인터셉터를 통한 401 Unauthorized 에러 방어 및 8882 포트 프록시 매핑 완비
   - 백엔드(Spring Boot)에 CORS 전역 개방 완료 (`CorsConfigurationSource` 적용)
   - `useEffect`와 `useState`를 이용해 화면 진입 시 서버에서 JSON 데이터를 Fetching하여 상태 업데이트 구현 완료 (`/api/members/me`, `/api/asset/`, `/api/stock`, `/api/members/login` 연동)
   - 로그인, 대시보드, 주식 목록 화면 브라우저 통합 테스트 통과 확인 (세션 쿠키 및 데이터 정상 렌더링)

### 🔥 최신 스프린트 진행 상황
- `[x]` `vite.config.js` 프록시 설정 하드코딩 제거 (`.env` 파일 추가 및 `loadEnv` 적용 완료)
- `[x]` `StockDetail.jsx` WebSocket 연결 누수(cleanup) 해결 (기반영됨 확인 완료)

### 📌 향후 계획 (5단계)
1. **나머지 컴포넌트 순차 변환 및 연동**
   - 주식 상세(차트 및 호가창 `StockDetail.jsp`), 뉴스, 회원가입, 포인트 내역 등
2. **실시간 데이터 바인딩 고도화**
   - WebSocket 클라이언트를 연결하여 실시간 호가 변동 및 개인 체결 알림 토스트 메시지 렌더링
   - 차트 라이브러리(ApexCharts 등)를 이용한 OHLCV 캔들스틱 차트 구현
3. **최근 픽스 내역**
   - `vite.config.js`에 프록시 설정 반영하여 `/api`, `/ws` 상대 경로로 호출 구조 개편 완료
   - `StockDetail.jsx`의 웹소켓 `deactivate()` 누락에 의한 좀비 커넥션(메모리 누수) 해결 완료 (`frontend_phase1_result.md` 참고)
