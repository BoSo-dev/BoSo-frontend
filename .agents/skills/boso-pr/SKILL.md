---
name: boso-pr
description: Draft, create, or update a BoSo frontend pull request from the actual branch diff and verification results. Drafting does not authorize pushing, publishing, requesting reviewers, or merging.
---

# BoSo 프론트엔드 PR

프론트엔드 루트의 `AGENTS.md`, `README.md`, `package.json`을 읽는다. `.github/pull_request_template.md`가 있으면 따르되 없는 템플릿이나 백엔드 문서를 필수 절차로 가정하지 않는다. 본문 작성과 실제 게시 요청을 구분하고 기존 사용자 허용 범위를 유지한다.

1. 저장소 경로, `git status --short`, `git branch --show-current`와 실제 원격·refs를 확인한다. 원격 URL에 자격 증명이 있으면 출력에 노출하지 않는다. 원격 설정이나 인증 정보를 임의로 바꾸지 않는다.
2. 일반 세팅·기능·수정 PR의 base는 `develop`, 배포 PR은 `develop → main`이다. 사용자 지정 대상과 선행 PR 의존 관계를 우선한다. head가 `develop`이면 같은 브랜치를 base로 PR을 만들지 않고 실제 비교 대상과 요청 목적을 확인한다. 없는 base를 추측하거나 브랜치를 자동 생성·전환하지 않는다.
3. 확인한 refs로 `git log <base>..<head> --oneline`, `git diff <base>...<head>`를 읽는다. 미커밋 변경은 PR에 포함되지 않으므로 구분해 보고하고, 게시 요청만으로 자동 커밋하지 않는다. 원격 refs를 확인할 수 없으면 로컬 비교에 근거한 초안임을 표시한다.
4. 코드·설정·의존성 변경에는 `npm run check`로 린트·타입 검사·테스트·빌드·공백을 검사하고 화면 변경은 브라우저에서 확인한다. 문서·스킬만 변경되면 링크·명령·범위와 공백을 검토한다. PowerShell에서는 필요하면 `npm.cmd`를 사용한다. 실제 실행하지 않은 CI·백엔드 API·배포 검증을 성공으로 쓰지 않는다.
5. 제목은 `<type>(<scope>): <한국어 설명>`으로 작성한다. 본문에는 변경 전 문제와 결과, 검증 명령·결과, API·환경변수 영향, 의존 PR·미검증 사항을 담는다. 템플릿이 없으면 `변경 내용`, `검증`, `API·환경 설정`, `확인이 필요한 사항`을 기본 항목으로 사용한다. 비밀정보와 무관한 대화 이력은 넣지 않는다.
6. 게시 요청이 없으면 제목·base·head·본문 초안을 제공한다. 게시 요청이 있으면 `gh auth status` 또는 사용 가능한 GitHub 연결과 기존 PR을 확인해 중복 생성을 피한다. 인증이 없으면 초안까지 완성하고 필요한 조치를 보고한다.
7. 원격 head가 없거나 로컬 커밋이 앞서 있으면 push 권한을 확인하고 허용된 경우에만 `git push -u origin <branch>` 등을 수행한다. push가 허용되지 않았으면 초안을 유지하고 필요한 권한을 보고한다. 강제 push는 명시적 요청 없이 수행하지 않는다.
8. 게시 상태는 사용자 지시를 따르고 지정이 없으면 draft로 생성한다. `gh` 본문은 저장소 밖 임시 UTF-8 파일에 실제 줄바꿈으로 작성해 `--body-file`로 전달한다. 기존 PR 갱신 시 사용자 내용·이미지·이슈 링크를 보존한다. 게시 후 base·head·URL·상태를 확인해 보고한다.

스킬 사용이나 PR 게시 권한만으로 리뷰어 지정·리뷰 댓글 전송·merge를 수행하지 않는다. 게시 실패 시 원인을 확인하고 기존 PR 유무를 재확인하며, 인증·권한·base 문제가 해결되지 않으면 반복 게시 대신 완성한 초안과 필요한 조치를 보고한다.
