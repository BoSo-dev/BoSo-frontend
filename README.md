# BoSo-frontend

K-패스, 기후동행카드 등 교통카드 정책을 통합하여 정책 요약, 개인별 정책 변경 To-Do, AI 챗봇을 제공하는 BoSo의 프론트엔드 저장소입니다.

공통 실행·개발·검증 기반에 이어 `feat/common-layout`에서 헤더·내비게이션·푸터·공통 UI와 반응형 레이아웃을 구성했습니다. 실제 정책·인증·To-Do·챗봇 기능은 후속 기능 브랜치에서 구현합니다.

## 기술 스택

- React 19, Vite 8, TypeScript 6(strict), React Router 7, 기본 CSS
- ESLint 10·typescript-eslint·React Hooks/Refresh 규칙
- Vitest 5·jsdom 26·React Testing Library
- npm 및 `package-lock.json`으로 설치 버전 관리
- Node.js 기준 버전: `.nvmrc`의 `22.14.0`. 지원 범위: 22.13 이상인 22.x, 24.x 또는 26 이상, npm 10 이상

초기 TypeScript 7은 `typescript-eslint`의 공식 지원 범위(`>=4.8.4 <6.1.0`) 밖이므로 6.0.3으로 조정했습니다. 설치된 Node 22.14를 유지하기 위해 Router 7과 jsdom 26을 선택했습니다. 최신 Router 8·jsdom 31은 더 높은 Node 패치 버전을 요구합니다. 백엔드에는 별도 프론트엔드 스택 지정이 없습니다.

## 빠른 시작

명령은 `BoSo-frontend` 루트에서 실행합니다. 백엔드·DB 없이 공통 화면과 메뉴 이동을 확인할 수 있습니다.

```sh
npm ci
npm run dev
```

개발 화면은 <http://localhost:5173>입니다. 서버는 localhost에 바인딩하고, 포트가 사용 중이면 자동 변경 대신 오류로 종료합니다. 종료는 `Ctrl+C`입니다. 미등록 경로에서는 안내와 홈 복귀 링크를 제공합니다.

PowerShell 실행 정책으로 `npm.ps1`이 차단되면 정책을 변경하지 않고 `npm.cmd`를 사용합니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

의존성 변경 시 `npm install`로 `package.json`과 `package-lock.json`을 함께 갱신하고, 복제·재설치는 `npm ci`를 사용합니다.

## 검증과 빌드

```sh
npm run check
npm run preview
```

`check`는 린트 → 타입 검사 → 테스트 → 빌드 → Git 공백 검사를 순서대로 실행하며 실패 시 중단합니다. PowerShell에서는 `npm.cmd run check`를 사용합니다.

| 명령 | 용도 |
| --- | --- |
| `npm run lint` | ESLint, 경고도 실패 처리 |
| `npm run typecheck` | 앱·Vite·Vitest 설정의 TypeScript 검사 |
| `npm test` | Vitest 일회 실행 |
| `npm run test:watch` | 테스트 감시 |
| `npm run build` | 타입 검사 후 `dist/` 빌드 |
| `npm run preview` | 빌드 결과를 `http://localhost:4173`에서 확인 |

preview는 운영 배포용 서버가 아닙니다. API 호출이 없는 기본 화면만 제공하므로 preview 포트의 백엔드 CORS는 추가하지 않았습니다. 배포 시 BrowserRouter의 직접 접근·새로고침을 위한 SPA fallback을 설정해야 합니다.

## 구조와 개발 순서

```text
src/
  main.tsx            # React·BrowserRouter 진입점
  app/                # 앱 조립·라우팅·메뉴·공통 레이아웃·전역 스타일
  pages/              # 홈 프레임·준비 안내·미등록 경로 안내
  shared/api/         # 공통 JSON 요청·오류 처리
  shared/config/      # 공개 환경변수 검증
  shared/ui/          # 버튼·링크 버튼·배지·카드·페이지 제목·빈 상태·아이콘
  shared/assets/      # 시제품에서 재사용한 캐릭터 이미지
  test/               # 테스트 공통 설정
index.html            # 한국어 HTML 진입점
vite.config.ts        # React 플러그인·개발/preview 서버
vitest.config.ts      # 테스트 실행 환경
eslint.config.mjs     # 린트 규칙
AGENTS.md             # 공통 개발·보안·협업 규칙
.agents/skills/       # 커밋·PR 스킬
docs/                 # 구조·개발 계획
.env.example          # 공개 API 주소 예시
```

의존 방향은 `app → pages → features → shared`입니다. `features/`는 실제 기능 구현 시 생성합니다. 테스트는 대상 옆에 배치합니다. UTF-8/LF와 공백 2칸은 `.editorconfig`, Git 줄바꿈은 `.gitattributes`로 정의합니다.

- [개발 지침](AGENTS.md)
- [구조·라우팅·API 사용 기준](docs/architecture.md)
- [브랜치별 구현 범위와 협업 기준](docs/development-plan.md)

현재 사용자 요청에 따라 기존 `feat/common-layout`에서 작업합니다. 다른 브랜치를 생성·전환하거나 백엔드·상위 기획 파일을 수정하지 않습니다. 초기 설정은 `develop`에서 완료했으며 후속 기능은 별도 요청 범위에 따라 진행합니다.

## 공통 레이아웃과 UI

디자인은 작업 공간의 `BoSo_중간시제품.html`에 있는 파란색·연한 배경·둥근 패널·캐릭터와 5개 메뉴를 기준으로 했습니다. 내장 PNG를 `shared/assets`에 추출했으며 시제품의 샘플 데이터·로컬 저장·업무 로직은 복사하지 않았습니다. 새 패키지나 외부 폰트 요청도 추가하지 않았습니다.

- `app/layout`: 공통 Header·Footer·Outlet, 단일 main, 본문 바로가기
- `app/navigation.ts`: 홈·정책 변경·To-Do·AI 챗봇·내 정보의 경로와 표시 문구
- `shared/ui`: Button·LinkButton(primary/secondary/subtle), Badge, Card, PageHeading, EmptyState, Icon
- `app/styles.css`: 공통 색상 토큰·UI 스타일과 반응형 규칙

`/`는 홈 프레임이며 `/policies`, `/todos`, `/chat`, `/profile`은 공통 준비 안내로 연결합니다. 후속 기능에서는 각 경로의 안내 화면을 실제 페이지로 교체합니다. 미등록 주소에도 공통 레이아웃과 홈 복귀 안내를 표시합니다. 로그인·회원가입·알림 기능은 아직 구현하지 않았습니다.

헤더는 넓은 화면에서 한 줄, 760px 이하에서 브랜드와 메뉴를 두 줄로 배치합니다. 홈 카드는 모바일에서 세로로 전환하며 440px 이하에서는 여백·이미지 크기를 줄입니다. 키보드 포커스·현재 메뉴 표시·페이지 이동 시 본문 포커스와 제목 갱신·모션 감소 설정을 지원합니다. 페이지 컴포넌트에는 main을 중복 작성하지 않습니다.

## 백엔드 연동과 환경변수

형제 `BoSo-server`의 `AGENTS.md`, README, 구조·개발·브랜치·하네스 문서, Skills와 실제 설정·라우터·오류 코드를 참고했습니다. 백엔드는 FastAPI·SQLAlchemy·Alembic·Supabase PostgreSQL 기반입니다. Python·DB 구조와 검사 스크립트·CI는 복사하지 않았으며 백엔드 파일은 수정하지 않습니다.

| 항목 | 실제 백엔드 코드 기준 |
| --- | --- |
| 로컬 서버 | `http://localhost:8000` |
| 개발용 Swagger / OpenAPI | `/docs`, `/openapi.json`(production에서는 비활성화) |
| 상태 확인 | `GET /health/live`, `GET /health/ready`(DB 연결 검사) |
| 기능 API | `/api/v1/*`에 빈 도메인 라우터만 연결, 업무 엔드포인트 미구현 |
| CORS 기본 Origin | `http://localhost:3000`, `http://localhost:5173` |
| 인증 관련 CORS | `Authorization` 허용, `allow_credentials=False` |
| 오류 필드 | `code`, `message`, `details`, `request_id` |
| 요청 추적 | `X-Request-ID` 응답 헤더(CORS 노출) |

선택적으로 공개 설정 예시를 복사합니다. 기존 `.env`는 덮어쓰지 않습니다.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`VITE_API_BASE_URL`은 경로·인증정보·쿼리·fragment 없는 HTTP(S) Origin이며 기본값은 `http://localhost:8000`입니다. `/api/v1`을 포함하지 않습니다. 앱 시작 시 검증하며 변경 후 개발 서버 재시작·운영 재빌드가 필요합니다.

`src/shared/api`는 fetch 기반 JSON 클라이언트입니다. `api<T>(path, { method, json, headers, signal })`로 호출하며 경로는 `/`로 시작해야 합니다. 기능 경로는 실제 OpenAPI 확인 후 지정하고 현재 화면에서 자동 API 요청은 하지 않습니다. 프록시는 사용하지 않으며 연동 시 실제 `CORS_ORIGINS`를 확인합니다.

`ApiError`는 `status`, `code`, `message`, `details`, `requestId`를 제공합니다. 비 JSON 성공 응답은 형식 오류, 204·205는 `undefined`이며 네트워크·취소 오류는 그대로 전달합니다. 토큰 저장·자동 갱신·재시도와 쿠키 전달은 구현하지 않았습니다. 제네릭 타입은 런타임 응답 검증을 대신하지 않습니다.

`.env`·`.env.*`는 Git에서 제외합니다. `VITE_*`는 브라우저 번들에 공개되므로 DB 주소, Supabase service role 키, JWT 서명 키, 외부 AI 비밀 키를 넣지 않습니다. 서버의 `.env`를 복사하지 않습니다.

## 커밋·PR 스킬

- [boso-commit](.agents/skills/boso-commit/SKILL.md): diff 검토·관련 검증·경로별 staging·요청된 커밋
- [boso-pr](.agents/skills/boso-pr/SKILL.md): base·head·실제 diff 확인·한국어 초안·허용된 게시/갱신

```text
$boso-commit 현재 변경을 검증하고 커밋해줘.
$boso-pr 현재 브랜치의 PR 제목과 본문을 작성해줘.
```

두 번째 요청은 초안 작성만 허용합니다. commit·push·PR 게시·merge는 각각 사용자 요청과 기존 허용 범위를 따릅니다. 일반 흐름은 `작업 브랜치 → develop → main`, 제목은 `<type>(<scope>): <한국어 설명>`입니다. 코드·설정 변경은 `npm run check`, 문서·스킬 변경은 링크·명령·공백과 사용 가능한 스킬 검증 도구로 확인합니다.

## 검증 한계와 남은 작업

테스트는 라우팅과 공통 API·설정의 정상·오류·경계 동작을 확인하며 API 요청은 fetch 대역입니다. 실제 백엔드·인증·DB·배포·브라우저 E2E·반응형 통합 검증을 완료했다는 의미가 아닙니다. 로컬 검증은 자동화했지만 GitHub CI·별도 Agent 설정·배포·Docker는 구성하지 않았습니다.

설치 시 `npm audit`에서 린트 도구의 전이 의존성 `minimatch`에 중간 등급 취약점이 보고됐습니다. 현재 요구 범위는 10.x이고 수정 버전은 11.0.1 이상이므로 강제 major override나 무리한 도구 하향 변경은 적용하지 않았습니다. 개발 도구 갱신 시 재확인해야 합니다. 운영 의존성은 `npm audit --omit=dev`로 별도 확인합니다.

## 공식 참고

- [Vite 시작 안내](https://vite.dev/guide/)
- [Vite 환경변수](https://vite.dev/guide/env-and-mode)
- [React Router 선언형 설치](https://reactrouter.com/start/declarative/installation)
- [typescript-eslint 설정](https://typescript-eslint.io/getting-started/)
- [Vitest 시작 안내](https://vitest.dev/guide/)
- [React Testing Library 설정](https://testing-library.com/docs/react-testing-library/setup/)
