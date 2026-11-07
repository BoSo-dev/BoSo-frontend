# BoSo 프론트엔드 작업 지침

## 공통 기준

- React + Vite + TypeScript를 사용하는 BoSo 프론트엔드다. 의존성은 `package.json`, 재현 가능한 설치 버전은 `package-lock.json`을 기준으로 한다.
- 작업 전 경로, `git status --short`, `git branch --show-current`를 확인한다. 기존 변경사항과 참고 자료를 보존하고 관련 없는 파일은 수정하지 않는다.
- 형제 저장소 `../BoSo-server`는 API 계약과 공통 협업 규칙을 확인할 때 참고한다. 별도 요청 없이 백엔드 파일을 수정하지 않는다.
- 현재 실행·구조·기능 구현 완료를 구분하고 실제 수행한 검증만 보고한다. 명령과 구조를 바꾸면 README도 함께 갱신한다.
- 구조는 [docs/architecture.md](docs/architecture.md), 브랜치·역할·개발 순서는 [docs/development-plan.md](docs/development-plan.md)를 따른다. 개인 담당 구분을 다른 팀원의 작업을 제한하는 공통 규칙으로 적용하지 않는다.

## 실행과 검증

- Node.js 기준 버전은 `.nvmrc`다. 지원 범위는 `package.json`의 `engines`를 따른다. 패키지 관리자는 npm으로 통일한다.
- 설치: `npm ci`, 개발: `npm run dev`, 통합 검증: `npm run check`, 빌드 확인: `npm run preview`.
- 개별 검증은 `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`다. 테스트 감시는 `npm run test:watch`를 사용한다.
- PowerShell에서 실행 정책으로 npm이 차단되면 `npm.cmd`를 사용한다. 전역 실행 정책이나 개인 설정을 변경하지 않는다.
- 코드·설정·의존성 변경 후 `npm run check`를 실행한다. 문서·스킬만 변경되면 링크·명령·범위와 공백을 검사한다. 화면 변경은 브라우저에서도 확인하고 실행하지 못한 검증은 이유를 기록한다.
- 테스트는 대상 옆에 `*.test.ts(x)`로 두고 정상·오류·경계 동작을 검증한다. fetch 대역 테스트를 실제 백엔드·인증·배포 연동 성공으로 보고하지 않는다.
- `package.json`을 변경하면 npm으로 잠금 파일을 함께 갱신한다. `node_modules/`, `dist/`는 커밋하지 않는다.

## 코드와 API

- UTF-8, LF, 공백 2칸 들여쓰기를 사용한다. TypeScript strict 검사를 유지하고 불필요한 `any`와 타입 검사 무시를 피한다.
- React 컴포넌트·타입은 PascalCase, 함수·변수는 camelCase로 작성한다. 컴포넌트 파일은 `App.tsx`처럼 PascalCase, 진입점·설정 파일은 기존 이름을 따른다.
- 기존 코드의 작은따옴표와 세미콜론 생략 스타일을 따른다. `app → pages → features → shared` 의존 방향을 따르고 필요한 기능 폴더만 추가한다. `shared`에서 상위 계층을 import하지 않는다.
- 라우팅은 `app`, 경로별 화면은 `pages`, 도메인 로직은 `features/<기능>`, 재사용 UI·설정·API는 `shared`에 둔다. `features`와 `shared/ui`는 실제 구현 시 생성한다. 공통 API에 도메인 로직을 넣지 않는다.
- API는 백엔드의 실제 OpenAPI·Pydantic 계약을 기준으로 연동한다. `/api/v1`의 도메인 prefix만으로 존재하지 않는 엔드포인트·인증 방식을 추측하지 않는다.
- 공통 오류 필드는 `code`, `message`, `details`, `request_id`다. 서버가 소유하는 정책 대상·마감일·To-Do 상태 판정을 프론트엔드에서 별도로 확정하지 않는다.
- 정책 정보에는 공식 출처·검수일·적용 기간을 보존하고 예시 데이터와 실제 정책을 구분한다.

## 환경변수와 보안

- `.env`, `.env.*`는 Git에서 제외하고 공유 가능한 예시만 `.env.example`에 둔다. `VITE_API_BASE_URL`은 경로·인증정보 없는 백엔드 Origin이며 생략 시 `http://localhost:8000`이다. 앱 시작 시 값을 검증하며 변경 후 서버 재시작·운영 재빌드가 필요하다.
- `VITE_*` 값은 브라우저 번들에 공개된다. DB 연결 문자열, Supabase service role 키, JWT 서명 키, 외부 AI 비밀 키를 프론트엔드 코드·환경변수에 넣지 않는다.
- 토큰·비밀번호·개인정보·사용자 질문 원문을 로그·커밋·PR에 노출하지 않는다. 인증 정보 저장 방식은 실제 백엔드 계약과 함께 결정한다.
- 개인 도구 설정, 전역 Git 설정, 승인 정책을 프로젝트 구축을 위해 변경하지 않는다.

## Git과 협업

- 일반 작업 흐름은 `작업 브랜치 → develop → main`이다. 현재 사용자 허용 범위는 `BoSo-frontend`의 기존 `develop`뿐이다. 초기 설정 보강은 이 브랜치에서 진행하며 후속 브랜치 생성·전환과 백엔드·상위 계획 파일 수정은 하지 않는다. 다음 계획 단계는 개발자 B의 `feat/common-layout`이며 별도 작업 요청과 허용 범위에 따라 진행한다.
- 브랜치 생성·전환, commit, push, PR 게시, merge는 각각 사용자 요청과 허용 범위 안에서 수행한다. 명시적 요청 없이 사용자 변경 삭제, 강제 push, 기존 커밋 amend를 하지 않는다.
- 커밋·PR 제목은 `<type>(<scope>): <설명>`이며 설명·본문은 한국어를 기본으로 한다. 예: `chore(setup): 프론트엔드 최소 실행 환경 구성`.
- API·환경변수·공통 설정이 바뀌면 백엔드와 후속 작업에 미치는 영향과 의존 관계를 설명한다. 규칙이 충돌하면 사용자 지시를 우선하고 해결되지 않은 충돌을 보고한다.
- 커밋 작업 시 [.agents/skills/boso-commit/SKILL.md](.agents/skills/boso-commit/SKILL.md)를 읽고 적용한다.
- PR 작성·갱신 시 [.agents/skills/boso-pr/SKILL.md](.agents/skills/boso-pr/SKILL.md)를 읽고 적용한다.
- PR 전 실제 diff를 검토하고 수행한 검증과 미검증 사항을 기록한다. 스킬을 읽는 것 자체가 commit·push·PR 게시·merge 권한을 부여하지 않는다. 로컬 검증은 자동화했으며 GitHub CI·별도 Agent 설정·배포 설정은 아직 구성하지 않았다.
