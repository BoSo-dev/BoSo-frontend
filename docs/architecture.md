# 프론트엔드 구조

React + Vite SPA로 구성하고 React Router의 선언형 라우팅을 사용한다. 서버 업무 규칙과 인증 정책은 실제 OpenAPI 계약을 기준으로 연결한다.

## 배치와 의존 방향

```text
src/
  main.tsx              # React·BrowserRouter 진입점
  app/                  # 앱 조립·라우팅·전역 스타일
  pages/                # URL에 연결되는 화면
    home/               # 현재 기본 실행 확인 화면
    not-found/          # 미등록 경로 안내
  shared/
    api/                # 공통 JSON 요청·오류·서버 주소 연결
    config/             # 공개 환경변수 검증
  test/                 # 테스트 공통 설정
```

의존 방향은 `app → pages → features → shared`를 기본으로 한다. 현재 기능이 없으므로 `features/`는 생성하지 않았다. 기능 구현 시 `features/auth`, `features/user-profile`, `features/personalized-todo` 등 해당 기능 디렉터리를 추가한다. 다른 기능의 내부 파일을 직접 참조하기보다 필요한 계약을 명시적으로 공유한다. `shared`는 `pages`, `features`, `app`을 import하지 않는다.

`feat/common-layout`에서는 `app`에 공통 레이아웃을 연결하고 재사용 UI를 `shared/ui`에 추가한다. 페이지는 기능을 조합하며 공통 API 클라이언트에 도메인 로직을 넣지 않는다. 사용처 없는 빈 폴더·공용 컴포넌트는 미리 만들지 않는다.

컴포넌트 파일은 PascalCase, 그 외 TypeScript 파일은 camelCase를 사용한다. 테스트는 검증 대상 옆에 `*.test.ts`, `*.test.tsx`로 둔다. 현재는 상대 경로 import를 사용한다.

## 라우팅

현재 등록 경로는 `/`와 미등록 경로 처리(`*`)뿐이다. 로그인·정책·To-Do 등 서비스 URL은 기능 구현 시 합의해 추가한다. 기본 확인 화면은 서비스 홈 UI가 아니다. 인증 상태·보호 경로·토큰 저장은 아직 구현하지 않았다.

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
