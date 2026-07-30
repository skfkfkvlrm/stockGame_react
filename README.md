# 📈 StockGame React (Frontend SPA)

Vite + React 기반으로 구축된 **학생 주식 모의투자 시뮬레이션 프론트엔드**입니다.  
기존 JSP 기반의 모놀리식 아키텍처에서 SPA(Single Page Application) 형태로 완전히 분리/마이그레이션 되었습니다.

---

## ✨ 주요 기능 및 화면

### 학생 전용 페이지

| 페이지 | 경로 | 설명 |
|---|---|---|
| **로그인** | `/login` | Spring Boot 백엔드와 JWT 기반 API 통신 |
| **메인 대시보드** | `/` | 내 자산 현황, 총 보유 포인트/쿠폰 정보 요약 |
| **주식 목록** | `/stocks` | 전체 종목 시세 조회 (실시간 업데이트) |
| **주식 상세 · 거래** | `/stocks/:id` | OHLCV 차트(ApexCharts), 매수/매도 주문 폼, 실시간 호가창 |
| **포인트 내역** | `/history` | 입출금 및 매매 내역 |
| **실시간 랭킹** | `/ranking` | 학생 자산 순위 실시간 조회 |
| **시장 뉴스** | `/news` | 실시간 시장 변동 뉴스 |
| **쿠폰 상점** | `/coupons` | 포인트로 쿠폰 구매 |
| **내 쿠폰함** | `/my-coupons` | 구매한 쿠폰 리스트 및 상태 확인 |

### 🛡️ 관리자 전용 패널 (`/admin`) ★신규

| 탭 | 기능 |
|---|---|
| **학생 관리** | 학생 목록 조회 · 포인트 지급/차감 모달 · 상세 포트폴리오(자산·보유주식) 조회 |
| **주식 종목 관리** | 신규 종목 상장 · 발행가/잔량 수정 · 종목 삭제(상장폐지) · 시장 개장/휴장 원터치 토글 |
| **쿠폰 상품 관리** | 등록된 쿠폰 상품 목록 및 판매 상태 확인 |

> 관리자 전용 Zustand 스토어(`useMarketStore`)로 시장 개장/휴장 토글 시 사이드바 뱃지가 **0.1초 내 실시간 동기화**

---

## 🚀 기술 스택

| 분류 | 기술 |
|---|---|
| **Core** | React 19, Vite 6 |
| **Routing** | React Router DOM v7 |
| **상태 관리** | Zustand (`useAuthStore`, `useMarketStore`) |
| **Styling** | Vanilla CSS (도메인별 모듈 CSS) |
| **HTTP Client** | Axios (with credentials, 401 Interceptor) |
| **Charts** | ApexCharts (`react-apexcharts`) |
| **WebSocket** | `@stomp/stompjs` + `sockjs-client` 기반 실시간 호가/알림 |
| **Icons** | `lucide-react` |

---

## 📂 프로젝트 구조 (DDD Feature 기반)

```
src/
 └── features/
      ├── admin/             # 관리자 패널 ★신규
      │   ├── components/    # AdminDashboard.jsx (학생·주식·쿠폰 관리)
      │   └── store/
      │       └── useMarketStore.js  # 시장 개장/휴장 전역 상태 ★신규
      ├── auth/              # 로그인, useAuthStore
      ├── core/              # 레이아웃, Sidebar, App 라우팅
      ├── coupons/           # 쿠폰 상점 / 내 쿠폰함
      ├── dashboard/         # 메인 대시보드
      ├── news/              # 시장 뉴스
      ├── points/            # 포인트 내역
      ├── ranking/           # 실시간 랭킹
      └── stocks/            # 주식 목록 / 상세 거래 페이지
```

---

## 🔒 보안 — 음수 입력 원천 차단

수량·포인트 입력 시 음수(`-`) 입력이 이중으로 차단됩니다.

| 계층 | 방어 방법 |
|---|---|
| **키보드 이벤트** | `onKeyDown`에서 `-` 및 `e` 키 즉시 차단 |
| **HTML 속성** | `min="1"` (수량·포인트), `min="0"` (발행잔량) |

적용 파일: `StockDetail.jsx` (주문 단가·수량), `AdminDashboard.jsx` (포인트·발행가·잔량)

---

## 📦 실행 방법

1. **의존성 패키지 설치**
   ```bash
   npm install
   ```

2. **개발 서버 실행** (기본 포트: `5173`)
   ```bash
   npm run dev
   ```

> **Note**: 백엔드 API와의 통신을 위해 Spring Boot 서버 (`http://localhost:8882`)가 실행 중이어야 합니다.  
> Axios `baseURL`이 `http://localhost:8882`로 고정 설정되어 있습니다.

---

## 🌿 Git 브랜치 전략

| 브랜치 | 설명 |
|---|---|
| `main` | 안정화 릴리즈 브랜치 |
| `feature/admin-student-management` | 학생 관리 대시보드 UI 및 포인트/포트폴리오 모달 (→ [PR #4](https://github.com/skfkfkvlrm/stockGame_react/pull/4)) |
| `feature/admin-stock-management` | 주식 종목 CRUD 모달 및 시장 토글 제어 (→ [PR #5](https://github.com/skfkfkvlrm/stockGame_react/pull/5)) |
| `feature/market-sidebar-and-ui-resilience` | 사이드바 실시간 연동·음수 차단·UI 강화 (→ [PR #6](https://github.com/skfkfkvlrm/stockGame_react/pull/6)) |

---

## 📋 최근 변경 이력 (Changelog)

| 날짜 | 내용 |
|---|---|
| 2026-07-30 | 관리자 패널 (`/admin`) 학생·주식·쿠폰 관리 탭 전체 구현 |
| 2026-07-30 | `useMarketStore` Zustand 스토어 신규 생성 — 사이드바 실시간 시장 상태 연동 |
| 2026-07-30 | 수량·포인트 입력 시 음수 키보드 입력 원천 차단 (`StockDetail.jsx`, `AdminDashboard.jsx`) |
| 2026-07-30 | 쿠폰 상품 관리 탭 목록 복구 |
| 2026-07-26 | WebSocket Resilience 강화 및 401 Interceptor 구현 |
