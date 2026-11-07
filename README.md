# BoSo-frontend

K-패스, 기후동행카드 등 교통카드 정책을 통합하여 정책 요약, 개인별 정책 변경 To-Do, AI 챗봇을 제공하는 BoSo의 프론트엔드 저장소입니다.

현재 `develop`에는 React 기본 확인 화면과 최소 실행 환경만 구성합니다. 회원가입·정책 조회·To-Do·챗봇 등 서비스 기능과 UI, API 호출은 아직 구현하지 않았습니다.

## 기술 스택

- React 19, Vite 8, TypeScript 7(strict), 기본 CSS
- npm 및 `package-lock.json`으로 설치 버전 관리
- Node.js 기준 버전: `.nvmrc`의 `22.14.0`(구축·검증 버전). 지원 범위: Node.js 22.12 이상인 22.x 또는 24 이상, npm 10 이상

기존 백엔드 문서에는 별도로 확정된 프론트엔드 스택이 없어 요청한 React + Vite + TypeScript를 적용했습니다. Vite의 React TypeScript 실행에 필요한 의존성만 사용합니다.

## 실행 방법

아래 명령은 `BoSo-frontend` 루트에서 실행합니다. 백엔드와 DB 없이 기본 화면을 실행할 수 있으며, 현재 필요한 환경변수는 없습니다.

```sh
npm ci
npm run dev
```

개발 화면: <http://localhost:5173>. 서버는 localhost에만 바인딩하고, 포트가 사용 중이면 자동 변경 대신 오류로 종료합니다. 종료는 `Ctrl+C`입니다.

PowerShell에서 `npm.ps1` 실행 정책 오류가 발생하면 전역 정책을 변경하지 말고 다음 명령을 사용합니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

최초 구축 시에는 `npm install`로 잠금 파일을 생성했습니다. 이후 복제한 환경은 `npm ci`를 사용하고, 의존성 추가·변경 시에는 `npm install`로 `package.json`과 `package-lock.json`을 함께 갱신합니다.

## 검증과 빌드

```sh
npm run typecheck
npm run build
git diff --check
npm run preview
```

`build`는 TypeScript 검사 후 `dist/`에 정적 파일을 생성합니다. `preview`는 빌드 결과를 <http://localhost:4173>에서 확인하는 로컬 서버이며 운영 배포용 서버가 아닙니다. 현재 기본 화면만 제공하므로 preview 포트의 백엔드 CORS 설정은 추가하지 않았습니다.

## 현재 파일 구성

```text
src/
  App.tsx             # 기본 실행 확인 화면
  main.tsx            # React 진입점
  index.css           # 최소 기본 스타일
index.html            # 한국어 HTML 진입점
vite.config.ts        # React 플러그인·개발/preview 서버
tsconfig*.json        # 앱·Vite 설정의 TypeScript 검사
package.json          # 실행 명령·필수 의존성
package-lock.json     # 재현 가능한 의존성 버전
AGENTS.md             # 기본 개발·보안·협업 규칙
```

상세 폴더 아키텍처를 미리 만들지 않고 진입점과 기본 화면만 배치했습니다. UTF-8/LF와 공백 2칸은 `.editorconfig`, Git 줄바꿈은 `.gitattributes`로 정의합니다.

## 백엔드 참고와 연동 기준

형제 저장소 `../BoSo-server`의 `AGENTS.md`, `README.md`, `pyproject.toml`, `.editorconfig`, `.gitattributes`, `.gitignore`, `.env.example`, `docs/architecture.md`, `docs/branch-strategy.md`, `docs/implementation-plan.md`, `docs/harness.md`와 실제 앱 설정·라우터·오류 처리 코드를 확인했습니다.

- 백엔드는 FastAPI + SQLAlchemy + Alembic + Supabase PostgreSQL이며 `app/api`, `app/core`, `app/modules`, `alembic`, `tests`, `scripts`로 구성됩니다.
- 기존 Python 코드는 snake_case 함수·모듈, PascalCase 클래스, 공백 4칸 및 Ruff 규칙을 사용합니다. 프론트엔드에는 React·TypeScript의 PascalCase 컴포넌트·타입, camelCase 함수·변수, 공백 2칸을 적용합니다.
- 백엔드의 `.agents/skills/boso-commit`, `boso-pr`, 검사 스크립트, GitHub CI·PR 템플릿은 참고만 했습니다. Python·DB 전용 구조와 하네스를 복사하지 않았습니다.
- 일반 협업 흐름은 작업 브랜치에서 `develop`으로 PR, 배포 시 `develop → main`입니다. 이번 초기 구축은 사용자 요청대로 `develop`에서 진행하며 후속 설정은 `frontend-bootstrap`에서 진행할 예정입니다. 자동 commit·push·merge·브랜치 생성은 하지 않습니다.
- 변경사항 보존, 한국어 커밋·PR, 실제 검증 결과 보고, 비밀정보 비노출을 공통 규칙으로 적용합니다. 자세한 프론트엔드 규칙은 [AGENTS.md](AGENTS.md)를 확인하세요.

로컬 백엔드 실행 시 확인할 기본 정보는 다음과 같습니다. 이번 프론트엔드 구축에서는 서버나 DB를 실행·변경하지 않습니다.

| 항목 | 실제 백엔드 코드 기준 |
| --- | --- |
| 기본 서버 주소 | `http://localhost:8000`(uvicorn 기본 실행) |
| 개발용 Swagger / OpenAPI | `/docs`, `/openapi.json`(production에서는 비활성화) |
| 상태 확인 | `GET /health/live`, `GET /health/ready`(DB 연결 검사) |
| 기능 API | `/api/v1/*`에 빈 도메인 라우터만 연결됨. 업무 엔드포인트 미구현 |
| CORS 기본 허용 Origin | `http://localhost:3000`, `http://localhost:5173` |
| 인증 관련 CORS | `Authorization` 헤더 허용, `allow_credentials=False`. 실제 인증 API·저장 방식 미확정 |
| 오류 필드 | `code`, `message`, `details`, `request_id` |
| 요청 추적 | 응답의 `X-Request-ID` 헤더(CORS 노출됨) |

도메인 prefix만으로 API를 추측하지 않고 실제 OpenAPI 계약을 확인한 뒤 연동합니다. CORS는 백엔드의 `CORS_ORIGINS` 환경변수로 변경될 수 있으므로 연동 시 실제 허용 Origin을 확인합니다. 이번에는 공통 API 클라이언트, 프록시, API 주소 환경변수를 추가하지 않았습니다.

`.env`와 `.env.*`는 Git에서 제외하고, 필요해지면 비밀이 없는 `.env.example`을 추가합니다. `VITE_*`는 브라우저 번들에 공개되므로 DB 주소, Supabase service role 키, JWT 서명 키, 외부 AI 비밀 키를 넣지 않습니다. 서버의 `.env`를 프론트엔드로 복사하지 않습니다.

## 후속 작업: frontend-bootstrap

- 상세 프론트엔드 폴더 아키텍처
- React Router와 공통 API 클라이언트, 확인된 계약 기반 환경변수
- 추가 코드 품질 도구와 테스트 자동화·CI
- 프론트엔드 전용 Skills·Agents 구성
- 하네스 엔지니어링 환경 전체 구축

실제 서비스 기능과 UI는 기본 설정 이후 각 기능 작업에서 구현합니다.

## 공식 참고

- [Vite 시작 안내와 Node.js 요구사항](https://vite.dev/guide/)
- [Vite 환경변수와 공개 범위](https://vite.dev/guide/env-and-mode)
