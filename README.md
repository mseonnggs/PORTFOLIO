# 장미선 포트폴리오

기존 원본 3개 파일을 보존하고 `site/` 안에 구현한 HTML/CSS/JavaScript 정적 사이트입니다. GitHub 푸시와 외부 배포는 수행하지 않았습니다.

## 실행

```powershell
cd C:\Portfolio\site
npm.cmd run dev
```

접속: http://127.0.0.1:4173

페이지 순서는 표지 → About Me(소개) → 역량·경력 → 회사별 작업물 → 개인 프로젝트 → 연락처입니다. 목차에는 번호 없이 페이지 제목을 표시하며, 현재/전체 페이지 번호는 하단에 유지합니다. 각 섹션을 세로로 이어 배치하고 메뉴·이전/다음·좌우 방향키로 해당 위치까지 부드럽게 스크롤합니다. PC는 하단 이동 바 위의 본문 영역을, 모바일은 문서 전체를 스크롤합니다. 모션 줄이기 설정에서는 즉시 이동합니다.

`app.js` 상단의 `SCROLL_MOTION`에서 속도를 조절합니다. 현재 기본 시간은 420ms, 최대 1000ms이며 이동 거리의 제곱근에 `distanceFactor: 6`을 곱해 시간을 더합니다. 가속·감속은 양 끝의 속도와 가속도가 0인 smootherstep 곡선을 사용합니다. 새 메뉴를 선택하면 현재 위치에서 새 목적지로 이동하며, 휠·터치·직접 조작 시 자동 스크롤을 취소합니다. 스크롤 중 실제 보이는 섹션에 맞춰 메뉴·진행 표시가 갱신되고, 완료한 뒤 해당 섹션으로 키보드 포커스가 이동합니다.

Node.js로 실행하며 런타임 외부 의존성이 없습니다. 동일 포트가 이미 실행 중이면 기존 주소를 사용하거나 `$env:PORT='4174'`로 변경합니다.

## 콘텐츠 수정

`data.json` 한곳에서 관리합니다.

- `profile`: 소개·이메일·전화번호
- `companies`: 회사·기간·직책·주요직무·담당 업무
- `earlierCareers`: 이전 영업관리·운영 경력. 원래 직무를 보존합니다.
- `works`: 작업물 ID·회사·이름·유형·용도·담당 범위·파일명·이미지 경로·설명
- `projects`: 프로젝트 소개·역할·화면·실제 URL·PDF 경로
- `pages`: 목차·순서·페이지와 작업물 연결

회사별 `works.company`에는 `rtm`, `angel`, `safenet`을 사용합니다. 불명확한 회사는 `null`을 유지합니다. 새로운 작업물은 `works`에 등록하고 해당 페이지의 `workIds`에 ID를 추가합니다. 이미지가 많아지면 `pages`에 company 페이지를 더해 분산하세요. 현재는 18페이지이며 총 페이지 수와 진행률·목차는 자동 갱신됩니다.

`coverPage`에서 새 표지의 문구·사진·연도·키워드를 수정합니다. 표지 가이드를 배경 이미지로 사용하지 않고 HTML 텍스트와 CSS 요소로 구성했습니다. `assets/profile/cover-portrait.png`는 제공된 두 번째 사진의 원본 복사본이며, 흑백은 CSS 필터로만 표시합니다. 손글씨 타이틀은 로컬 Sedgwick Ave Display와 동봉 OFL 라이선스를 사용합니다. 미세한 종이 질감은 CSS의 SVG 노이즈로 표현합니다. 표지의 이름에만 부드러운 하강 애니메이션을 적용하며 모션 줄이기 설정에서는 생략합니다. 기존 소개 정보와 프로필 사진은 다음 About Me 페이지에 유지합니다.

## 이미지를 넣는 방법

1. 아래 폴더에 실제 제작 이미지를 저장합니다.
2. `data.json`에서 해당 `works` 항목의 `image`를 `assets/works/rtm/rtm-digital.jpg`처럼 지정합니다.
3. 필요하면 `preview`에 대표 부분 이미지 경로를 지정합니다. `image`는 항상 전체 원본입니다.
4. `filename`, `description`, `purpose`, `role`, `status`를 실제 자료에 맞춰 갱신합니다. 별도 레이아웃 수정은 필요 없습니다.

| 자료 | 폴더 |
| --- | --- |
| 알티엠 웹·SNS·광고, 기업 소개서·카탈로그 | `assets/works/rtm/` |
| 제주엔젤 상세페이지·가로 배너, 명함·스티커·안내물 | `assets/works/angel/` |
| 세이프넷 촬영·배너, 잡지·카탈로그·포스터 | `assets/works/safenet/` |
| 회사 미확인 간판·POP 및 뷰티 상세페이지 | `assets/works/unassigned/` |
| 추가 프로젝트 캡처 | `assets/projects/` |
| 꼬리별지도·PulseHealth 상세 PDF | `assets/documents/` |

유형: `banner` 가로형, `poster` 전체 보기, `editorial` 책자·펼침면, `photo` 사진, `detail` 긴 상세페이지, `sign` 사인, `online` 온라인 콘텐츠. 실제 이미지는 `object-fit: contain` 또는 원래 너비·높이로 표시합니다. `detail`만 대표 부분이 보이며 클릭하면 전체 길이를 스크롤합니다. 누락·잘못된 경로는 깨진 아이콘 대신 준비 중 영역으로 표시합니다.

프로젝트 PDF 2개와 PulseHealth 실제 URL은 추가된 PDF에서 확인해 이미 연결했습니다. 추후 바꾸려면 `projects[].pdf`, `projects[].url`을 수정하세요. PDF에서 추출한 원본 화면과 RTM 상세페이지도 연결되어 있습니다. RTM 상세페이지의 제작 시기·개별 담당 범위는 `works`의 `rtm-detail`에서 확인·보완해 주세요. 회사 연결의 근거는 `companySource`에 있습니다. 추가된 로컬 폰트를 우선 사용합니다.

`scripts/prepare-assets.py`는 추가된 로컬 원본을 복사하고 PDF 안의 실제 이미지를 추출하는 재현용 스크립트입니다. PyMuPDF가 필요하며 이미지 수정이나 가상 화면 생성은 하지 않습니다.

## 확인·빌드

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd install
npm.cmd test
```

테스트는 로컬 서버가 실행 중인 상태에서 Playwright와 설치된 Chrome을 사용합니다. `TEST_BROWSER_CHANNEL`로 채널을 바꿀 수 있습니다. `dist/`에는 배포에 필요한 정적 파일과 에셋만 복사하며 원본 이력서는 포함하지 않습니다. 이번 단계에서는 배포하지 않습니다.

`tests/portfolio.cjs`는 콘텐츠·반응형·기존 동작을, `tests/scrolling.cjs`는 실제 스크롤 위치·가속/감속·연속 입력·수동 중단·리사이즈·모션 줄이기를 검증합니다. `tests/cover.cjs`는 표지 배치·사진 비율·키워드 간섭·이름 모션과 About Me 연결을 확인합니다. `npm.cmd test`가 세 검사를 차례로 실행합니다.

## 자료와 검증

`docs/SOURCES.md`: 근거·누락·자료 확인 범위. `docs/QA.md`: 실행한 검증과 제한. `test-results/`: 자동 검증 결과와 PC·모바일 캡처. `DESIGN.md`: 충돌을 정리한 실제 디자인 기준.

이력서 원본·개인 주소·생년월일·연봉은 제공 화면이나 빌드에 포함하지 않습니다. 로컬 서버도 `site`의 공개 파일과 `assets`만 제공합니다. 업무 연락처는 요청에 따라 이력서 확인 값을 사용합니다.
