# BoSo 프론트엔드 작업 지침

## 시작과 범위

- HTML + CSS + Vanilla JavaScript 프로젝트다. 명령·구조는 package.json, README.md, docs/architecture.md로 확인한다.
- 작업 전 경로·현재 브랜치·git status를 확인한다. 사용자 변경·기획 자료를 보존한다. 형제 ../BoSo-server는 계약 확인용이며 수정하지 않는다.
- 현재 브랜치는 사용자 지정을 따른다. 후속 기능 범위와 선행 조건은 docs/development-plan.md에서 확인하며 임의로 브랜치를 전환하지 않는다.
- 실제 필요한 파일만 만든다. 미사용 폴더·프레임워크·패키지·개인 Agent 설정을 추가하지 않는다.

## 코드와 단일 파일

- UTF-8, LF, 공백 2칸, 작은따옴표·세미콜론 생략을 따른다. 함수·변수는 camelCase, 클래스는 PascalCase, 파일명은 소문자와 필요한 하이픈을 사용한다.
- 공통 HTML·template은 index.html, 이동·화면 조립은 src/app.js, API·상태는 src/services.js, 인증은 src/auth.js, 프로필 서비스·화면 연결은 src/profile.js, 스타일은 src/styles.css에 둔다. 실제 기능이 커질 때만 JS 파일을 추가한다.
- 브라우저 코드는 일반 script와 IIFE로 작성한다. 공유 연결점은 window.BoSo다. 외부 ES module·동적 import·CDN·런타임 HTML fetch에 의존하지 않는다.
- 정책 서비스·화면 연결은 src/policies.js에 둔다. 현재 정책 HTTP 목록·상세·요약 계약이 없으므로 실제 모드는 준비 안내만 표시하고 추정 경로를 호출하지 않는다. 계약 확정 후 서비스와 응답 검증을 함께 추가한다.
- 공통 UI는 시맨틱 HTML·CSS·template으로 재사용한다. 외부 입력은 textContent로 표시하고 검증 없는 innerHTML 삽입을 피한다.
- 해시 경로를 사용하고 main은 하나만 둔다. 키보드 이동·현재 메뉴·제목·모바일 레이아웃을 유지한다. 디자인은 기존 스타일·캐릭터와 최종 와이어프레임을 참고한다.
- 통합기는 이중따옴표 HTML 속성과 ./ 로컬 경로를 지원한다. 이미지는 HTML img에 두며 CSS url·@import는 사용하지 않는다. 새 형식은 통합기와 테스트도 확장한다.
- 결과물은 dist/BoSo.html 하나다. 외부 자원 없이 직접 열려야 하며 Node는 개발·빌드에만 사용한다.

## API·보안

- API 경로·입출력·인증은 서버 코드와 OpenAPI로 확인한다. 정책 대상·마감일·To-Do 상태 판단을 임의로 재정의하지 않는다. 공식 출처·검수일·적용 기간과 시연 데이터 구분을 보존한다.
- boso-config는 공개 JSON이다. .env 자동 로딩은 없다. DB 주소·Supabase service role·JWT 서명 키·Gemini 키·비밀번호를 넣지 않는다. 서버 .env를 복사하지 않는다.
- 파일 실행은 항상 demo이며 네트워크를 호출하지 않는다. 실제 모드 실패를 demo 성공으로 바꾸지 않는다. 시연 데이터는 실제 사용자·정책과 구분한다.
- 공개 API는 BoSo.services.request, 보호 API는 BoSo.auth.request(path, options)를 사용한다. JSON은 json, 취소는 signal, 추가 헤더는 headers로 전달한다. 오류 필드는 code/message/details/request_id다.
- access token·CSRF 값은 인증 모듈의 메모리에만 두고 store·localStorage·sessionStorage·URL·로그에 넣지 않는다. refresh 쿠키는 서버가 관리한다. 로그인·갱신·로그아웃은 실제 서버 계약을 따른다.
- 파일 모드 계정은 메모리에 salt·PBKDF2 digest만 저장하며 새로고침하면 초기화한다. 평문 비밀번호를 저장하지 않는다. file:// 인증을 위해 서버 Origin·CORS 보안을 완화하지 않는다.
- 실제 프로필은 인증 API로만 읽고 저장하며 localStorage에 넣지 않는다. 시연 프로필만 버전·사용자별 키로 저장하고 초기화를 제공한다. 저장소 차단·손상은 메모리로 처리하고 화면에 유지 범위를 안내한다.
- 화면을 벗어나면 진행 중인 프로필 요청을 취소하고, 계정이 바뀐 뒤 도착한 응답을 표시하지 않는다. 실제 모드의 나이·입력 완성 여부는 서버 응답을 사용한다.
- 토큰·비밀번호·개인정보·질문 원문을 로그·커밋·PR에 노출하지 않는다. 실제 서버 없이 DB·Gemini·계정 인증이 동작한다고 보고하지 않는다.
- 정책 시연은 모든 화면에서 예시임을 표시한다. 작성한 요약은 실제 AI 결과로 표시하지 않고, 예시 출처 주소는 연결하지 않는다. 실제 출처·검수일·적용 기간과 예시 자료를 섞지 않는다. 검색 조건은 해시에 인코딩하고 외부 값은 textContent로 표시한다.

## 실행과 검증

- 설치 npm ci, 개발 npm run dev, 전체 검사 npm run check, 생성 npm run build, 빌드 확인 npm run preview.
- PowerShell 실행 정책으로 차단되면 npm.cmd를 사용한다. 개인·전역 Git 설정이나 실행 정책을 임의로 바꾸지 않는다.
- Node 기준은 .nvmrc다. 의존성 변경은 npm으로 잠금 파일도 갱신한다. node_modules/·dist/·.env*는 커밋하지 않는다.
- 코드·설정 변경 후 check로 린트·Node 테스트·빌드·공백을 확인한다. 의미 있는 정상·오류·경계 조건은 tests/foundation.test.mjs에서 검증하고 기능이 늘면 필요한 테스트만 확장한다.
- 화면 변경은 HTTP(S)와 단일 HTML 직접 실행을 확인한다. 모바일·키보드·잘못된 주소·외부 자원 없는 실행을 검사한다. API 대역과 실제 통합 결과를 구분하고 미검증 이유를 보고한다.
- 문서·스킬만 바뀌면 링크·명령·범위·공백과 사용 가능한 스킬 검증 도구로 확인한다.

## 협업

- 일반 흐름은 작업 브랜치 → develop → main이다. 이력을 보존하며 브랜치 생성·전환, commit, push, PR 게시, merge는 각각 사용자 요청 범위에서만 수행한다.
- 사용자 변경 삭제, 강제 push, 기존 커밋 amend는 임의로 하지 않는다. 공통 파일·공개 설정·계약 변경은 후속 기능 영향을 기록한다.
- 커밋·PR 제목은 <type>(<scope>): <한국어 설명>이다. 커밋 시 .agents/skills/boso-commit/SKILL.md, PR 작성 시 .agents/skills/boso-pr/SKILL.md를 읽는다. 스킬 읽기는 Git 쓰기 권한을 부여하지 않는다.
- 지침과 README는 실제 명령·구조와 함께 갱신한다. Python·DB·마이그레이션 전용 규칙을 복사하지 않는다. 충돌 시 사용자 지시를 우선하고 미해결 충돌은 보고한다.
