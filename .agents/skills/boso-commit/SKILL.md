---
name: boso-commit
description: Prepare and create a scoped BoSo frontend Git commit when the user requests a commit. Review the actual diff, run relevant frontend checks, and preserve unrelated work.
---

# BoSo 프론트엔드 커밋

프론트엔드 루트의 `AGENTS.md`, `README.md`, `package.json`을 읽는다. 커밋 메시지 제안이나 절차 설명만 요청한 경우 Git 상태를 변경하지 않는다. 이 스킬을 읽는 것 자체는 커밋·push 권한을 부여하지 않는다.

1. 저장소 경로, `git status --short`, `git branch --show-current`, `git diff`, `git diff --cached`를 확인한다. untracked 파일은 내용을 별도로 읽고 형제 `BoSo-server`의 변경을 섞지 않는다.
2. 사용자 지정 브랜치를 우선한다. `develop`에서 작업하라는 요청이 있으면 그 브랜치를 유지한다. 일반 작업은 작업 브랜치에서 진행하되, 브랜치 생성·전환이 현재 허용 범위에 없으면 임의로 수행하지 않고 필요한 조치를 보고한다.
3. 요청 범위의 변경만 고른다. 사용자 문서·이미지와 다른 작업을 보존하고, 기존 staged 변경을 임의로 unstage하거나 함께 커밋하지 않는다. 무관한 staged 변경이 있으면 보존한 채 요청한 경로만 커밋할 수 있는지 검토하고 분리할 수 없으면 충돌 범위를 보고한다.
4. 코드·설정·의존성 변경에는 `npm run check`로 린트·타입 검사·테스트·빌드·공백을 검사한다. 화면 변경은 브라우저에서 확인한다. 문서·스킬만 변경되면 링크·명령·범위와 `git diff --check`를 확인하고, 스킬 검증 도구가 있으면 함께 사용한다. PowerShell 실행 정책으로 npm이 차단되면 `npm.cmd`를 사용한다. 실패는 수정하거나 구체적인 미검증 사유로 남긴다.
5. `package.json` 변경 시 `package-lock.json`의 동반 변경을 확인한다. `.env`·비밀정보·`node_modules/`·`dist/`를 제외하고 `git add -- <paths>`로 경로를 명시해 stage한다. `git add .`를 기본으로 사용하지 않는다. 실제 커밋 대상 diff와 `git diff --cached --check`를 재확인한다.
6. `<type>(<scope>): <한국어 설명>` 제목으로 요청된 범위만 커밋한다. 예: `chore(setup): 프론트엔드 커밋·PR 스킬 구성`. type은 실제 diff에 맞춰 `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci` 등을 사용한다.
7. `git log -1 --oneline`, `git status --short`로 결과를 확인하고 브랜치·해시·검증 결과·남은 변경을 보고한다. push·PR 게시·merge는 각각 허용된 경우에만 수행한다.

커밋 실패 시 훅을 건너뛰거나 사용자 Git 설정을 바꾸지 않는다. 인증·서명·작성자 설정 문제가 해결되지 않으면 완료된 검증과 필요한 조치를 보고한다. 명시적 요청 없이 amend·이력 재작성으로 해결하지 않는다.
