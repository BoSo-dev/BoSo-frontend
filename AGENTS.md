# BoSo 프론트엔드 작업 지침

## 공통 기준

- React + Vite + TypeScript를 사용하는 BoSo 프론트엔드다. 의존성은 `package.json`, 재현 가능한 설치 버전은 `package-lock.json`을 기준으로 한다.
- 작업 전 경로, `git status --short`, `git branch --show-current`를 확인한다. 기존 변경사항과 참고 자료를 보존하고 관련 없는 파일은 수정하지 않는다.
- 형제 저장소 `../BoSo-server`는 API 계약과 공통 협업 규칙을 확인할 때 참고한다. 별도 요청 없이 백엔드 파일을 수정하지 않는다.
- 현재 실행·구조·기능 구현 완료를 구분하고 실제 수행한 검증만 보고한다. 명령과 구조를 바꾸면 README도 함께 갱신한다.

## 실행과 검증

- Node.js 기준 버전은 `.nvmrc`다. 지원 범위는 `package.json`의 `engines`를 따른다. 패키지 관리자는 npm으로 통일한다.
- 설치: `npm ci`, 개발: `npm run dev`, 타입 검사: `npm run typecheck`, 빌드: `npm run build`, 빌드 확인: `npm run preview`.
- PowerShell에서 실행 정책으로 npm이 차단되면 `npm.cmd`를 사용한다. 전역 실행 정책이나 개인 설정을 변경하지 않는다.
- 변경 후 관련 타입 검사·빌드와 `git diff --check`를 실행한다. 화면 변경은 브라우저에서도 확인하고 실행하지 못한 검증은 이유를 기록한다.
- `package.json`을 변경하면 npm으로 잠금 파일을 함께 갱신한다. `node_modules/`, `dist/`는 커밋하지 않는다.

## 코드와 API

- UTF-8, LF, 공백 2칸 들여쓰기를 사용한다. TypeScript strict 검사를 유지하고 불필요한 `any`와 타입 검사 무시를 피한다.
- React 컴포넌트·타입은 PascalCase, 함수·변수는 camelCase로 작성한다. 컴포넌트 파일은 `App.tsx`처럼 PascalCase, 진입점·설정 파일은 기존 이름을 따른다.
- 기존 코드의 작은따옴표와 세미콜론 생략 스타일을 따른다. 필요한 의존성과 파일만 추가하고 상세 폴더 구조는 별도 설계 시 정한다.
- API는 백엔드의 실제 OpenAPI·Pydantic 계약을 기준으로 연동한다. `/api/v1`의 도메인 prefix만으로 존재하지 않는 엔드포인트·인증 방식을 추측하지 않는다.
- 공통 오류 필드는 `code`, `message`, `details`, `request_id`다. 서버가 소유하는 정책 대상·마감일·To-Do 상태 판정을 프론트엔드에서 별도로 확정하지 않는다.
- 정책 정보에는 공식 출처·검수일·적용 기간을 보존하고 예시 데이터와 실제 정책을 구분한다.

## 환경변수와 보안

- `.env`, `.env.*`는 Git에서 제외하고 공유 가능한 예시만 `.env.example`에 둔다. 현재 앱 실행에는 환경변수가 필요 없다.
- `VITE_*` 값은 브라우저 번들에 공개된다. DB 연결 문자열, Supabase service role 키, JWT 서명 키, 외부 AI 비밀 키를 프론트엔드 코드·환경변수에 넣지 않는다.
- 토큰·비밀번호·개인정보·사용자 질문 원문을 로그·커밋·PR에 노출하지 않는다. 인증 정보 저장 방식은 실제 백엔드 계약과 함께 결정한다.
- 개인 도구 설정, 전역 Git 설정, 승인 정책을 프로젝트 구축을 위해 변경하지 않는다.

## Git과 협업

- 일반 작업 흐름은 `작업 브랜치 → develop → main`이다. 이번 최소 초기 환경과 커밋·PR 스킬 구축은 사용자 지시에 따라 현재 `develop`에서 수행한다. 나머지 후속 설정은 `frontend-bootstrap`에서 이어갈 예정이다.
- 브랜치 생성·전환, commit, push, PR 게시, merge는 각각 사용자 요청과 허용 범위 안에서 수행한다. 명시적 요청 없이 사용자 변경 삭제, 강제 push, 기존 커밋 amend를 하지 않는다.
- 커밋·PR 제목은 `<type>(<scope>): <설명>`이며 설명·본문은 한국어를 기본으로 한다. 예: `chore(setup): 프론트엔드 최소 실행 환경 구성`.
- API·환경변수·공통 설정이 바뀌면 백엔드와 후속 작업에 미치는 영향과 의존 관계를 설명한다. 규칙이 충돌하면 사용자 지시를 우선하고 해결되지 않은 충돌을 보고한다.
- 커밋 작업 시 [.agents/skills/boso-commit/SKILL.md](.agents/skills/boso-commit/SKILL.md)를 읽고 적용한다.
- PR 작성·갱신 시 [.agents/skills/boso-pr/SKILL.md](.agents/skills/boso-pr/SKILL.md)를 읽고 적용한다.
- PR 전 실제 diff를 검토하고 수행한 검증과 미검증 사항을 기록한다. 스킬을 읽는 것 자체가 commit·push·PR 게시·merge 권한을 부여하지 않는다. 추가 Agents·CI는 아직 구성하지 않았다.
