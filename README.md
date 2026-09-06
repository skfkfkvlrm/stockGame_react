# 📈 StockGame React (Student Portal Frontend SPA)

Vite + React 기반으로 구축된 **학생 주식 모의투자 시뮬레이션 포털 웹 애플리케이션**입니다.  
기존 Spring Cloud MSA 백엔드와 차세대 Supabase BaaS 백엔드를 모두 지원하는 **하이브리드 듀얼 런(Dual-Run Adapter Pattern)** 아키텍처를 탑재하고 있습니다.

[![GitHub Repo](https://img.shields.io/badge/GitHub-stockGame__react-181717?logo=github)](https://github.com/skfkfkvlrm/stockGame_react)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646C9A?logo=vite)](https://vitejs.dev/)
[![Dual Run](https://img.shields.io/badge/Backend-Supabase_%7C_Spring_Cloud-success)]()

---

## 📌 1. 듀얼 백엔드 어댑터 아키텍처 (Dual-Run Mode)

환경 변수(`VITE_BACKEND_TYPE`) 설정 하나로 기존 Spring Boot 백엔드와 신규 Supabase BaaS 백엔드를 투명하게 스위칭할 수 있습니다.

```mermaid
graph TD
    UI[React 컴포넌트 / UI Layer] --> ADAPTER[Service Adapter Layer]
    ADAPTER -->|VITE_BACKEND_TYPE=supabase| SUPA[Supabase SDK & Realtime]
    ADAPTER -->|VITE_BACKEND_TYPE=spring| SPRING[Axios REST & STOMP WebSocket]
    SUPA --> SB_BACKEND[Supabase BaaS :54321]
    SPRING --> MSA_BACKEND[Spring Cloud Gateway :8000]
```

| 백엔드 모드 | 환경 변수 설정 | 인증 체계 | 실시간 호가/체결 통신 |
|:---|:---|:---|:---|
| **Supabase BaaS (신규 권장)** | `VITE_BACKEND_TYPE=supabase` | Supabase GoTrue Auth (가상 이메일 투명 매핑) | Supabase Realtime Engine (WAL 푸시) |
| **Spring Cloud MSA (레거시)** | `VITE_BACKEND_TYPE=spring` | Spring Security JWT 토큰 (Member Service) | `@stomp/stompjs` + SockJS (`/topic/orders`) |

---

## ✨ 2. 주요 기능 및 화면 (학생 전용)

| 페이지 | 경로 | 주요 기능 및 실시간 연동 |
|:---|:---|:---|
| **로그인 / 회원가입** | `/login`, `/register` | 학번·이름·학년·반·번호 입력, 실시간 학번 중복 검사, 가입 시 100,000 P 자동 지급 |
| **메인 대시보드** | `/` | 내 총순자산, 보유 현금 포인트, 주식 평가손익 요약 카드, 자산 변동 Realtime 수신 |
| **주식 목록** | `/stocks` | 21개 상장 종목 실시간 시세 및 체결 거래량 그리드 |
| **주식 상세 및 트레이딩** | `/stocks/:id` | **10단계 실시간 호가창**, 지정가 매수/매도 주문 접수, 실시간 잔여분 체결, 내 미체결 주문 취소 및 즉시 환불 |
| **포인트 변동 내역** | `/history` | 매수 차감, 매도 입금, 취소 환불, 최초 지급금 등 원장 이력 타임라인 |
| **실시간 랭킹** | `/ranking` | 전체 학생 총순자산 기준 실시간 리더보드 순위 |
| **가상 경제 뉴스** | `/news` | LLM 기반 가상 경제 뉴스 피드 및 종목별 호재/악재 감정 점수 |
| **쿠폰 상점 & 내 쿠폰함** | `/coupons`, `/my-coupons` | 포인트로 실물/학급 쿠폰 구매 및 보유 쿠폰함 확인 |

---

## 🚀 3. 기술 스택

| 분류 | 기술 |
|---|---|
| **Core** | React 19, Vite 6 |
| **Routing** | React Router DOM v7 |
| **상태 관리** | Zustand (`useAuthStore`, `useMarketStore`) |
| **BaaS SDK** | `@supabase/supabase-js` (^2.115.0) |
| **HTTP Client** | Axios (Spring Cloud 모드용 인터셉터 탑재) |
| **Real-time** | Supabase Realtime Engine & `@stomp/stompjs` (SockJS) |
| **Charts** | ApexCharts (`react-apexcharts`) |
| **Styling & UI** | Vanilla CSS (도메인별 모듈 CSS), `lucide-react` |

---

## 📁 4. 프로젝트 구조

```text
src/
├── api/                         # Spring Boot용 Axios 인터셉터
├── lib/                         # 싱글톤 SDK 클라이언트
│   └── supabaseClient.js        # Supabase 클라이언트 인스턴스
├── services/                    # 듀얼 런 서비스 어댑터 계층 (신규)
│   ├── authService.js           # Supabase GoTrue & Spring Auth 스위처
│   ├── stockService.js          # 주식 목록, 10단계 호가창, 주문 체결 RPC
│   └── assetService.js          # 개인 자산 및 포인트 변동 이력 어댑터
├── features/                    # 도메인 주도 Feature 컴포넌트
│   ├── auth/                    # 로그인, 회원가입, 세션 스토어
│   ├── core/                    # Navbar, Sidebar, Protected Route
│   ├── dashboard/               # 메인 대시보드
│   ├── stocks/                  # 주식 목록(StockList) & 상세 호가창(StockDetail)
│   ├── points/                  # 포인트 변동 이력
│   ├── news/                    # 가상 경제 뉴스
│   ├── ranking/                 # 실시간 랭킹
│   └── coupons/                 # 쿠폰 상점 및 보유 쿠폰함
└── App.jsx                      # 전역 라우팅
```

---

## 🔒 5. 프론트엔드 안전 가드 (Guardrails)

1. **React 훅 호출 순서 무결성 (`Rules of Hooks`)**:
   - `if (isLoading) return` 등의 조건부 조기 반환 아래에 훅을 절대 배치하지 않고 컴포넌트 최상단에 100% 선언.
2. **음수 입력 원천 차단 (Zero-Tolerance Negative Input)**:
   - 주문 단가, 주문 수량 필드에서 키보드 `-` 및 `e` 키를 `onKeyDown` 이벤트에서 즉시 차단.
3. **실시간 채널 클린업**:
   - `useEffect` 언마운트 시 `supabase.removeChannel()`을 명시적으로 호출하여 메모리 누수 및 좀비 웹소켓 방지.

---

## 📦 6. 실행 방법

### ① 환경 변수 설정 (`.env`)
```env
# 백엔드 스위치: 'supabase' 또는 'spring'
VITE_BACKEND_TYPE=supabase

# Supabase BaaS 연결 설정 (기본값)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Spring Cloud 연결 설정 (레거시 모드용)
VITE_API_BASE_URL=http://localhost:8000
```

### ② 의존성 설치 및 개발 서버 구동
```bash
# 의존성 설치
npm install

# 개발 서버 구동 (기본 포트: 5173)
npm run dev

# 프로덕션 빌드 검증
npm run build
```

---

## 🔗 7. 관련 레포지토리
- 🚀 차세대 백엔드: [stockGame_supabase](https://github.com/skfkfkvlrm/stockGame_supabase)
- 👩‍🏫 관리자 전용 웹: [stockGame_admin_react](https://github.com/skfkfkvlrm/stockGame_admin_react)
- 🏛️ 레거시 보존 백엔드 (v1): [stockGame_mechanism](https://github.com/skfkfkvlrm/stockGame_mechanism)
- 📚 마스터 기획서 및 감사 보고서: [skfkfkvlrm-json-lib](https://github.com/skfkfkvlrm/skfkfkvlrm-json-lib)
