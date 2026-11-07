# 프론트엔드 구조

React + Vite SPA로 구성하고 React Router의 선언형 라우팅을 사용한다. 서버 업무 규칙과 인증 정책은 실제 OpenAPI 계약을 기준으로 연결한다.

## 배치와 의존 방향

```text
src/
  main.tsx              # React·BrowserRouter 진입점
  app/                  # 앱 조립·라우팅·메뉴 설정·전역 스타일
    layout/             # AppLayout·Header·Footer
  pages/                # URL에 연결되는 화면
    home/               # 공통 홈 프레임·서비스 준비 안내
    coming-soon/        # 미구현 메뉴의 공통 준비 안내
    not-found/          # 미등록 경로 안내
  shared/
    api/                # 공통 JSON 요청·오류·서버 주소 연결
    config/             # 공개 환경변수 검증
    ui/                 # Button·LinkButton·Badge·Card·PageHeading·EmptyState·Icon
    assets/             # HTML 시제품에서 재사용한 캐릭터 PNG
  test/                 # 테스트 공통 설정
```

의존 방향은 `app → pages → features → shared`를 기본으로 한다. 현재 기능이 없으므로 `features/`는 생성하지 않았다. 기능 구현 시 `features/auth`, `features/user-profile`, `features/personalized-todo` 등 해당 기능 디렉터리를 추가한다. 다른 기능의 내부 파일을 직접 참조하기보다 필요한 계약을 명시적으로 공유한다. `shared`는 `pages`, `features`, `app`을 import하지 않는다.

`app/layout/AppLayout.tsx`는 헤더·본문 Outlet·푸터를 조립한다. 본문 main은 레이아웃에 한 번만 두고 페이지는 본문 내용만 반환한다. 페이지 이동 시 제목과 본문 포커스를 갱신한다. 재사용 UI는 `shared/ui`에 두고 도메인 로직을 넣지 않는다.

디자인은 작업 공간의 `BoSo_중간시제품.html`에서 파란색 `#0877f8`, 배경 `#f5f8fe`, 둥근 패널·메뉴·캐릭터를 참고했다. 내장 PNG 두 개는 `shared/assets`로 추출했으며 원본을 수정하지 않았다. 샘플 정책·프로필·To-Do·챗봇 로직은 이식하지 않았다. 외부 폰트·이미지 요청이나 추가 패키지는 없다.

전역 CSS 토큰과 스타일은 `app/styles.css`에 둔다. 최대 너비 1180px, 760px 이하에서 2행 헤더·세로 카드 배치, 440px 이하에서 여백·캐릭터 크기를 조정한다. 키보드 포커스, 본문 바로가기, 현재 메뉴 `aria-current`, 모션 감소 설정을 지원한다.

컴포넌트 파일은 PascalCase, 그 외 TypeScript 파일은 camelCase를 사용한다. 테스트는 검증 대상 옆에 `*.test.ts`, `*.test.tsx`로 둔다. 현재는 상대 경로 import를 사용한다.

## 라우팅

`app/navigation.ts`에서 5개 메뉴를 관리한다. `/`는 홈 프레임, `/policies`, `/todos`, `/chat`, `/profile`은 공통 준비 안내 화면이며 `*`는 미등록 경로다. 이 경로는 프론트엔드 URL이며 백엔드 API 경로를 의미하지 않는다. 후속 기능은 해당 Route의 준비 안내를 실제 페이지로 교체한다. 인증 상태·보호 경로·토큰 저장·로그인 URL은 아직 구현하지 않았다.

BrowserRouter를 사용하므로 운영 호스팅은 직접 접근·새로고침 시 SPA의 `index.html`로 fallback해야 한다. 해당 배포 설정은 `chore/frontend-deploy`에서 검증한다.

## 환경변수와 API

- `VITE_API_BASE_URL`은 `/api/v1`을 포함하지 않는 백엔드 Origin이다. 생략하면 `http://localhost:8000`이다. 경로·인증정보·쿼리·fragment가 있는 값은 거부한다.
- 공개 변수만 `.env.example`에 두고 `.env`와 모드별 파일은 커밋하지 않는다. Vite의 환경변수는 빌드 시 반영된다.
- `shared/api`의 `api<T>(path, options)`를 사용한다. `path`는 `/`로 시작하는 내부 경로이며 실제 서버 계약을 확인한 뒤 작성한다.
- `options.json`으로 JSON을 전달하고 헤더·`AbortSignal`을 지정할 수 있다. 인증 토큰을 자동 저장·주입·갱신하지 않는다. 쿠키는 전달하지 않으며 자동 재시도·redirect를 허용하지 않는다.
- `ApiError`는 HTTP 상태와 `code`, `message`, `details`, `requestId`를 제공한다. `requestId`는 서버의 `request_id` 또는 `X-Request-ID`에서 가져온다. 비 JSON 오류는 원문을 노출하지 않는 기본 오류로 처리한다.
- 204·205는 `undefined`, JSON이 아닌 성공 응답은 `INVALID_RESPONSE`다. 네트워크 실패와 취소는 fetch 오류를 그대로 전달해 HTTP 오류와 구분한다.
- 응답 타입 `T`는 정적 타입이며 런타임 스키마 검증이 아니다. 기능별 계약이 정해지면 필요한 검증을 해당 기능에서 추가한다. 파일·스트리밍 응답은 현재 JSON 클라이언트의 범위 밖이다.

현재 구현된 서버 경로는 `GET /health/live`, `GET /health/ready`다. 후자는 DB 연결을 검사한다. 기능 API는 `/api/v1/*`에 빈 라우터만 있으며 경로를 추측해 구현하지 않는다. 서버의 실제 호출은 이번 기반 테스트에서 수행하지 않는다.

## 검증

`npm run check`는 린트 → 타입 검사 → 테스트 → 빌드 → Git 공백 검사 순서로 실패 시 중단한다. ESLint는 TypeScript·React Hooks·React Refresh 권장 규칙을 사용한다. 스타일은 `.editorconfig`와 기존 코드 규칙을 따르며 별도 formatter는 추가하지 않았다.

Vitest·jsdom·React Testing Library로 미등록 경로에서 홈 복귀, 공개 설정 검증, JSON·빈 응답·공통 오류·네트워크 실패·취소를 검사한다. API 테스트는 fetch 대역을 사용하며 `/test`는 실제 업무 API가 아니다. 실제 백엔드 통합, 브라우저 E2E와 반응형 검증은 후속 단계다.
