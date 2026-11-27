# 프론트엔드 구조

HTML·CSS·Vanilla JavaScript를 사용하며 Node 내장 통합기로 단일 HTML을 만든다. React·Vite·TypeScript·React Router·Vitest는 제거했다. 기존 공통 레이아웃·CSS·PNG는 전환해 재사용했다.

## 배치와 확장

- index.html: 공통 헤더·내비게이션·푸터, home/placeholder template, 공개 JSON 설정
- src/app.js: 해시 경로·DOM 조립·본문 포커스·현재 메뉴·제목
- src/services.js: API·공통 오류·실행 모드·메모리 상태
- src/styles.css, src/assets/: 기존 디자인과 캐릭터
- scripts/build.mjs, scripts/serve.mjs: 통합 생성과 로컬 확인
- tests/foundation.test.mjs: Node 내장 테스트

빈 도메인 폴더나 공통 UI JS는 만들지 않는다. 기능 규모에 따라 src/auth.js 등을 추가하고 일반 script를 app 진입점보다 먼저 연결한다. 업무 요청·시연 처리는 해당 기능에 두고 공통 클라이언트에 도메인 분기를 늘리지 않는다.

## 화면과 상태

경로는 #/home, #/todos, #/policies, #/chat, #/profile, #/notifications다. 홈 외에는 준비 안내이며 잘못된 주소도 안내한다. BrowserRouter와 서버 fallback은 필요하지 않다. 후속 화면은 template과 라우트 정의를 확장한다.

main 한 곳에 template을 복제하고 외부 값은 textContent로 바인딩한다. card·button·badge·page-heading·empty-state CSS 클래스로 UI를 재사용한다. 헤더·푸터는 이동 때 다시 만들지 않는다. 최종 와이어프레임의 주요 메뉴 4개와 알림·내 정보 진입점을 반영했다.

BoSo.store는 getState/setState/subscribe를 제공한다. 얕은 불변 스냅샷이며 중첩 객체도 교체한다. 새로고침 시 초기화하고 인증·localStorage 영속화는 아직 없다. 후속 시연 저장에는 버전·초기화 방법을 두고 실제 토큰과 분리한다.

## 서비스와 보안

boso-config JSON은 mode(auto/demo/live), apiBaseUrl(기본 http://localhost:8000)을 제공한다. 주소는 HTTP(S) origin만 허용한다. 전부 공개되므로 비밀정보는 금지하며 .env 자동 주입은 없다.

BoSo.services는 mode와 request(path, options)를 제공한다. 파일은 항상 demo, HTTP(S) auto는 live다. demo 요청은 현재 미구현 오류이며 기능별 로컬 처리를 후속 추가한다. live 오류를 시연 성공으로 숨기지 않는다. 현재 화면은 API를 호출하지 않는다.

HTTP 클라이언트는 서버 내부 경로, JSON·헤더·AbortSignal, 쿠키 전달, 빈 응답과 공통 오류를 처리한다. 외부 origin·redirect·자동 재시도는 허용하지 않는다. ApiError는 status/code/message/details/requestId를 제공한다. 비 JSON 오류 원문은 표시하지 않으며 네트워크·취소 오류는 그대로 전달한다. 도메인 응답 검증은 기능 구현 시 추가한다.

서버의 /api/v1 라우터와 실제 기능 모듈·OpenAPI로 계약을 확인한다. 회원·정책 등 기능이 있으므로 빈 라우터뿐이라는 과거 설명은 적용하지 않는다. FastAPI·DB·Gemini는 서버에 유지하며 이 전환에서 업무 API를 추정하거나 호출하지 않는다.

인증은 Bearer·refresh 쿠키·CSRF·허용 Origin 등 현행 계약을 함께 검증해야 한다. credentials: include만으로 로그인은 완성되지 않는다. 파일의 null origin·쿠키 제약을 이유로 백엔드 보안을 완화하지 않는다. 직접 실행은 시연 데이터로 핵심 흐름을 제공하고 실제 인증·DB·AI는 HTTP(S)에서 검증한다.

## 통합·검증

통합기는 CSS link와 일반 script를 인라인으로 바꾸고 PNG를 data URI로 넣는다. 동일 입력은 동일 출력이며 결과는 dist/BoSo.html이다. 외부 파일·프로젝트 밖 경로·ES module·CSS url/@import는 오류로 중단한다. HTML은 이중따옴표 속성과 ./ 경로를 유지한다.

dev는 매 요청마다 통합하며 preview는 디스크 결과를 보여준다. 둘 다 127.0.0.1 개발 서버이고 임의 파일·API 프록시를 제공하지 않는다. 자동 새로고침은 없다. 과거 dist 출력은 자동 삭제하지 않으며 제출 시 BoSo.html만 선택한다.

npm run check는 린트·Node 테스트·빌드·공백을 검사한다. 파일 모드 네트워크 차단, 요청·오류·취소·상태, CSS/JS/PNG 내장과 외부 참조 거부를 테스트한다. 실제 서버 통합과 최종 핵심 기능 시연은 후속 단계다. 화면은 file·HTTP·모바일·키보드도 확인한다.
