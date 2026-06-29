# 📈 SchoolStock (React Frontend)

Vite와 React를 기반으로 구축된 SchoolStock 프론트엔드 어플리케이션입니다. 
기존 JSP 기반의 모노리틱 아키텍처에서 SPA(Single Page Application) 형태로 완전히 분리/마이그레이션 되었습니다.

## ✨ 주요 기능 및 화면 (Migration 완료)

- **로그인 및 회원가입** (`/login`, `/register`): Spring Boot 백엔드와 세션 기반 API 통신.
- **메인 대시보드** (`/`): 내 자산 현황, 총 보유 포인트/쿠폰 정보 요약 제공.
- **주식 목록 및 상세** (`/stocks`, `/stocks/:id`):
  - 전체 주식 종목 시세 조회
  - 개별 종목 OHLCV 과거 차트 시각화 (ApexCharts 적용)
  - 매수/매도 실시간 폼 지원 및 체결 시 알림 연동 (진행 중)
- **내 포인트 내역** (`/history`): 입출금 및 매매 내역 제공.
- **시장 뉴스** (`/news`): 실시간 시장 변동 뉴스.
- **쿠폰 상점** (`/coupons`): 상점 내 쿠폰 구매.

## 🚀 기술 스택

- **Core**: React 18, Vite
- **Routing**: React Router DOM (v6)
- **Styling**: Vanilla CSS (CSS Modules / Global CSS)
- **HTTP Client**: Axios (with credentials, Interceptors)
- **Charts**: ApexCharts (`react-apexcharts`)
- **WebSocket (추후 고도화)**: `@stomp/stompjs` 기반 실시간 호가/알림 연동

## 📦 실행 방법

1. 의존성 패키지 설치
```bash
npm install
```

2. 개발 서버 실행 (디폴트 포트: 5173)
```bash
npm run dev
```

> **Note**: 백엔드 API와의 통신을 위해 Spring Boot 서버(디폴트 포트: 8882)가 실행 중이어야 합니다. `vite.config.js`에 프록시가 설정되어 있어 CORS 이슈를 방지합니다.
