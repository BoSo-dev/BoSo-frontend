# 프론트엔드 구조

HTML·CSS·Vanilla JavaScript를 사용하며 Node 내장 통합기로 단일 HTML을 만든다. React·Vite·TypeScript·React Router·Vitest는 제거했다. 기존 공통 레이아웃·CSS·PNG는 전환해 재사용했다.

## 배치와 확장

- index.html: 공통 헤더·내비게이션·푸터, home/placeholder template, 공개 JSON 설정
- src/app.js: 해시 경로·DOM 조립·본문 포커스·현재 메뉴·제목
- src/services.js: API·공통 오류·실행 모드·메모리 상태
- src/auth.js: 서버 인증 계약·토큰 수명·시연 계정 처리
- src/profile.js: 프로필 계약·시연 저장·마이페이지 화면 연결
- src/styles.css, src/assets/: 기존 디자인과 캐릭터
- scripts/build.mjs, scripts/serve.mjs: 통합 생성과 로컬 확인
- tests/foundation.test.mjs: Node 내장 테스트

빈 도메인 폴더나 공통 UI JS는 만들지 않는다. services → auth → profile → app 순서로 일반 script를 연결한다. 후속 업무 요청·시연 처리는 해당 기능에 두고 공통 클라이언트에 도메인 분기를 늘리지 않는다.

## 화면과 상태

경로는 #/home, #/login, #/signup, #/todos, #/policies, #/chat, #/profile, #/notifications다. 홈·인증·프로필 외에는 준비 안내다. todos/chat/profile/notifications는 로그인 확인 후 표시한다. 비로그인은 로그인으로 이동하고 next는 내부 보호 경로의 허용 목록으로만 복귀한다. 서버 복원 중에는 대기, 연결 실패 시에는 재시도·로그인 진입을 제공한다. 잘못된 주소는 별도 안내하며 BrowserRouter·서버 fallback은 필요하지 않다.

main 한 곳에 template을 복제하고 외부 값은 textContent로 바인딩한다. card·button·badge·page-heading·empty-state CSS 클래스로 UI를 재사용한다. 헤더·푸터는 이동 때 다시 만들지 않는다. 최종 와이어프레임의 주요 메뉴 4개와 알림·내 정보 진입점을 반영했다.

BoSo.store는 getState/setState/subscribe를 제공한다. 얕은 불변 스냅샷이며 중첩 객체도 교체한다. auth에는 loading/anonymous/authenticated/unavailable 상태·공개 사용자 정보·안내만 둔다. 토큰은 store에 넣지 않는다. 실제 모드는 새로고침 때 서버 쿠키로 복원하고 시연은 계정·로그인을 초기화한다. 인증에는 localStorage·sessionStorage를 사용하지 않는다.

## 서비스와 보안

boso-config JSON은 mode(auto/demo/live), apiBaseUrl(기본 http://localhost:8000)을 제공한다. 주소는 HTTP(S) origin만 허용한다. 전부 공개되므로 비밀정보는 금지하며 .env 자동 주입은 없다.

BoSo.services는 공개 요청 기반이다. 파일은 항상 demo, HTTP(S) auto는 live다. demo 계정은 auth 모듈이 처리하고 다른 demo 요청은 미구현 오류다. live 시작 시 인증 복원을 요청하며 오류를 시연 성공으로 숨기지 않는다.

HTTP 클라이언트는 서버 내부 경로, JSON·헤더·AbortSignal, 쿠키 전달, 빈 응답과 공통 오류를 처리한다. 외부 origin·redirect·자동 재시도는 허용하지 않는다. ApiError는 status/code/message/details/requestId를 제공한다. 비 JSON 오류 원문은 표시하지 않으며 네트워크·취소 오류는 그대로 전달한다. 도메인 응답 검증은 기능 구현 시 추가한다.

인증은 실제 app/modules/auth/router.py·schemas.py·dependencies.py·service.py·cookies.py를 기준으로 구현했다. 다른 기능도 실제 모듈·OpenAPI를 확인한다. FastAPI·DB·Gemini는 서버에 유지한다.

BoSo.auth는 initialize/signup/login/logout/enterDemo/request를 제공한다. 실제 모드는 CSRF JSON bootstrap → refresh(JSON·X-CSRF-Token) → Bearer me로 복원한다. access·CSRF 값은 모듈의 메모리, refresh 쿠키는 서버에 둔다. 보호 요청은 auth.request를 사용한다. 토큰 만료·401에는 동일 탭에서 refresh를 공유하고 한 번 재시도하며, 사용자 식별자가 바뀌거나 인증이 거부되면 해제한다. 로그아웃 이후 늦은 응답은 generation으로 폐기한다. 네트워크·CSRF 실패를 성공 처리하지 않는다.

시연 회원가입은 무작위 salt·PBKDF2로 비밀번호를 메모리에서 비교하며 영속 저장하지 않는다. 시연 계정 버튼은 명시적인 샘플 사용자다. 파일의 null origin·쿠키 제약을 이유로 백엔드 보안을 완화하지 않는다. 실제 인증·DB·AI와 여러 탭의 갱신 경합은 HTTP(S)·서버 통합 단계에서 검증한다.

## 프로필

createProfile은 load/save/resetDemo를 제공하고 BoSo.profile에 연결한다. 실제 모드에서는 auth.request로 /api/v1/me와 /api/v1/me/options를 조회하고, PATCH /api/v1/me에 birth_date/region_code/transport_cards/transport_modes만 전송한다. 옵션은 실제 응답에서 구성하고 나이·기준일·입력 완성 여부·미입력 목록은 서버 값을 표시한다. 실제 계약은 users/router.py·schemas.py·service.py·constants.py로 확인했다.

시연은 서버의 선택 코드·배타 조건과 날짜 범위를 따른다. 한국 날짜로 나이·입력 상태를 계산하되 정책 자격 판정은 하지 않는다. 사용자별 메모리와 boso.demo.profile.v1.<사용자 ID> 키를 사용한다. 저장 레코드는 버전·입력 4개 필드·수정 시각만 포함한다. 실제 모드는 저장소에 접근하지 않는다. 차단·손상·쓰기 실패 시 메모리로 유지하며 초기화는 현재 시연 사용자 키만 삭제한다.

mountProfile은 조회·요약·편집·취소·저장·오류/재시도 UI를 연결하고 정리 함수를 반환한다. app은 화면 교체 전에 정리하여 요청을 취소한다. 요청마다 15초 제한을 새로 만들고, 인증 상태 객체가 바뀌면 늦은 결과를 폐기한다. 로그인 완료 처리 다음에 조회를 시작한다. 저장 실패 시 입력은 유지하며 재조회로 서버 저장 상태를 확인한다. 실제 DB와의 통합 검증은 별도다.

## 통합·검증

통합기는 CSS link와 일반 script를 인라인으로 바꾸고 PNG를 data URI로 넣는다. 동일 입력은 동일 출력이며 결과는 dist/BoSo.html이다. 외부 파일·프로젝트 밖 경로·ES module·CSS url/@import는 오류로 중단한다. HTML은 이중따옴표 속성과 ./ 경로를 유지한다.

dev는 매 요청마다 통합하며 preview는 디스크 결과를 보여준다. 둘 다 127.0.0.1 개발 서버이고 임의 파일·API 프록시를 제공하지 않는다. 자동 새로고침은 없다. 과거 dist 출력은 자동 삭제하지 않으며 제출 시 BoSo.html만 선택한다.

npm run check는 린트·Node 테스트·빌드·공백을 검사한다. 파일 모드 네트워크 차단, 요청·오류·취소·상태, CSS/JS/PNG 내장과 외부 참조 거부를 테스트한다. 실제 서버 통합과 최종 핵심 기능 시연은 후속 단계다. 화면은 file·HTTP·모바일·키보드도 확인한다.
