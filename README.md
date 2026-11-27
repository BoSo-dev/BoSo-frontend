# BoSo-frontend

K-패스·기후동행카드 등 교통 정책 요약, 개인별 To-Do, AI 챗봇을 제공할 BoSo의 프론트엔드입니다. 단일 HTML 제출을 위해 HTML + CSS + Vanilla JavaScript로 전환했습니다.

현재는 공통 헤더·푸터·반응형 홈, 해시 메뉴 이동, API·상태 기반과 통합 파일 생성만 구현했습니다. 실제 회원·정책·To-Do·챗봇·알림 및 시연 데이터는 후속 작업입니다.

## 실행

Node.js 기준 버전은 `.nvmrc`의 22.14.0이며 npm 10 이상을 사용합니다. 프론트엔드 루트에서 실행합니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

`http://localhost:5173`에서 확인합니다. 수정 후 브라우저를 새로고침하고 종료는 Ctrl+C입니다. macOS/Linux에서는 npm을 사용합니다. 포트 충돌 시 자동 변경하지 않습니다.

## 검증·빌드·제출

```powershell
npm.cmd run check
npm.cmd run preview
```

check는 ESLint → Node 내장 테스트 → 통합 빌드 → Git 공백 검사를 실행합니다. preview는 빌드 파일을 `http://localhost:4173`에서 보여줍니다. 빌드만 하려면 `npm.cmd run build`를 사용합니다.

**제출 파일은 `dist/BoSo.html` 하나**입니다. CSS·일반 JS·PNG를 포함하므로 복사 후 더블클릭으로 열 수 있습니다. 열람자에게 Node.js나 node_modules는 필요 없습니다. 개발용 index.html과 과거 Vite 출력은 제출하지 않습니다.

현재 결과물은 공통 화면과 이동이 동작하는 기반입니다. 최종 핵심 서비스 기능이 완성됐다는 뜻은 아니며 후속 개발과 오프라인 검증이 필요합니다.

## 최소 구조

```text
index.html                 공통 레이아웃·화면 template·공개 설정
src/app.js                 해시 이동·DOM 화면 조립
src/services.js            API·실행 모드·메모리 상태
src/styles.css             기존 디자인·공통 UI·반응형 스타일
src/assets/                기존 캐릭터 PNG 2개
scripts/build.mjs          단일 HTML 생성
scripts/serve.mjs          로컬 개발·preview 서버
tests/foundation.test.mjs   API·모드·상태·통합 파일 검증
```

프레임워크·Router·번들러는 사용하지 않습니다. ESLint만 개발 의존성으로 유지하고 테스트·빌드는 Node 내장 기능을 사용합니다. 홈 외의 메뉴는 준비 안내입니다.

## 실행 모드와 API

index.html의 boso-config에 공개 설정을 둡니다.

```json
{"mode":"auto","apiBaseUrl":"http://localhost:8000"}
```

auto는 HTTP(S)에서 서버 연동 모드, file://에서는 시연 모드입니다. demo로 명시할 수도 있습니다. 파일 직접 실행은 live 설정에도 항상 시연 모드이며 네트워크 요청을 보내지 않습니다. 현재 시연 요청은 DEMO_NOT_IMPLEMENTED를 반환하고 기능별 로컬 처리는 후속 구현합니다. 서버 연결 실패를 시연 성공으로 바꾸지 않습니다. 하단의 모드 표시는 실제 연결 성공을 뜻하지 않습니다.

HTTP 클라이언트는 쿠키 전달(credentials: include), JSON·오류 처리와 취소 신호를 지원합니다. 실제 인증·CSRF 주입·토큰 갱신·보호 화면은 미구현입니다. 실제 업무 경로는 서버 코드와 OpenAPI 확인 후 추가합니다.

실제 회원 인증·DB·Gemini는 FastAPI와 네트워크가 필요합니다. 파일 origin은 null이므로 현재 서버 Origin·CORS·쿠키 정책과 맞지 않습니다. 서버 보안을 완화하지 않고 HTTP(S)에서 실제 연동을 검증합니다. 로컬 API 개발에는 서버 기본 CORS와 일치하는 localhost:5173을 사용합니다. 127.0.0.1 또는 preview의 4173은 별도 origin이므로 기본 허용 대상이 아닙니다. 오프라인 제출은 명시적인 샘플 데이터로 핵심 흐름을 구현해야 합니다.

API 주소는 경로 없는 HTTP(S) origin만 허용합니다. 설정은 전부 공개되므로 DB 비밀번호·JWT 서명 키·Gemini 키를 넣지 않습니다. Vite .env.example은 제거했고 .env 자동 로딩은 없습니다. 기존 개인 .env는 수정하지 않습니다. 설정 변경 후 재빌드하세요.

## 개발 규칙

- [개발 지침](AGENTS.md)
- [구조와 확장](docs/architecture.md)
- [브랜치·담당·선행 조건](docs/development-plan.md)
- [커밋 스킬](.agents/skills/boso-commit/SKILL.md), [PR 스킬](.agents/skills/boso-pr/SKILL.md)

UTF-8·LF·공백 2칸을 사용합니다. 백엔드 공통 오류·보안·Git 규칙을 참고하되 Python·DB 설정은 도입하지 않습니다. 형제 서버와 기획 원본은 수정하지 않습니다. commit·push·merge는 자동 수행하지 않습니다.

API 테스트는 대역이며 실제 인증·DB·Gemini 통합 성공을 의미하지 않습니다. Docker·운영 배포·CI·추가 Agent 환경은 이번 범위에 없습니다.
