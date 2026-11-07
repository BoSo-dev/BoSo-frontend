# 개발 범위와 협업 기준

작업 공간의 `BoSo_frontend_plan.md`를 참고해 정리한 프론트엔드 저장소의 브랜치별 구현 범위다.

| 브랜치 | 범위 |
| --- | --- |
| `develop` | 초기 설정 점검·보강: 실행 환경, 지침·Skills, 구조, Router, API·환경변수, 린트·타입 검사·테스트·빌드 |
| `feat/common-layout` | 헤더·내비게이션·푸터·공통 UI·반응형 레이아웃 |
| `feat/policy-feed-ui` | 정책 목록·검색·필터·카드·변경사항 |
| `feat/auth-ui` | 회원가입·로그인·로그아웃·인증 상태·보호 페이지 |
| `feat/policy-detail-ui` | 정책 상세·AI 요약·조건·마감·출처·변경 전후 |
| `feat/user-profile-ui` | 거주지·생년월일·보유 카드·마이페이지·정보 수정 |
| `feat/policy-chatbot-ui` | 질문·응답·근거·로딩·오류 |
| `feat/personalized-todo-ui` | To-Do 목록·상세·완료·필터·진행 현황 |
| `feat/notification-ui` | 웹 내부 알림·읽음 처리·To-Do 연결 |
| `test/frontend-integration` | 실제 API·전체 사용자 흐름·예외·반응형 검증 |
| `chore/frontend-deploy` | 배포·빌드·환경변수·SPA fallback과 실제 환경 검증 |

기능 API 경로·응답·인증 계약은 실제 OpenAPI를 기준으로 조율한다.

현재 허용된 수정 범위는 `BoSo-frontend`의 기존 `develop`뿐이다. 이번 작업에서 후속 브랜치를 생성하거나 전환하지 않는다. 후속 기능은 해당 작업이 요청되고 브랜치 작업이 허용된 후 진행한다. 초기 보강을 `frontend-bootstrap`으로 미루던 이전 계획은 현재 `develop`의 초기 설정 보강으로 대체한다.

일반 통합 흐름은 `작업 브랜치 → develop → main`이다. 커밋·PR 제목은 `<type>(<scope>): <한국어 설명>`으로 작성하고 공통 파일 변경은 API·환경 설정과 다른 기능에 미치는 영향을 기록한다. 각 작업 브랜치의 PR은 `develop`, 배포 PR은 `main`을 대상으로 한다. 원격 쓰기·merge는 별도 허용 범위를 따른다.
