# epub-forge

[English](./README.en.md) · [한국어](./README.ko.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md)

**epub-forge**는 브라우저에서만 동작하는 문서→EPUB 변환 도구입니다. 문서를 넣고, 책 정보와 글꼴/여백을 조정한 뒤, 완성된 EPUB 파일을 내려받을 수 있습니다. 파일은 사용자의 기기 안에서만 처리되며 서버로 업로드되지 않습니다.

서비스 링크: https://jhste102lab.github.io/epub-forge/  
저장소: https://github.com/jhste102lab/epub-forge

## 주요 기능

- `.txt`, `.docx`, `.hwpx`, 베스트에포트 방식의 `.hwp`, 그리고 이 파일들이 들어 있는 `.zip` 변환.
- 입력 문서 1개를 EPUB 책 1권으로 변환.
- 변환 전에 각 책의 제목, 저자, 표지를 수정.
- 전체 책에 공통으로 적용되는 글꼴, 글자 크기, 여백, 문단 간격, 줄 간격, 들여쓰기, 줄 합치기 규칙 설정.
- 줄바꿈이 많은 원문을 읽기 좋은 문단으로 다시 정리하고 빈 줄은 유지.
- 선택한 내장 글꼴을 필요한 글자만 추려 EPUB에 포함해 리더기에서도 최대한 같은 모양으로 표시.
- EPUB을 개별로 내려받거나 전체를 ZIP으로 한 번에 내려받기.
- 영어, 한국어, 중국어 간체, 일본어 UI 지원.
- 라이트/다크 테마 지원.

## 개인정보 보호

문서 읽기, 표지 처리, 글꼴 처리, EPUB 생성은 모두 브라우저 안에서 실행됩니다. 이 앱은 정적 사이트로 배포되며 계정, 저장소, 분석 스크립트, 서버 변환 기능을 제공하지 않습니다.

## 포함된 글꼴

이 저장소에는 변환에 사용하는 글꼴 파일 4개가 포함되어 있습니다.

- Noto Serif KR
- Noto Sans KR
- Pretendard
- RIDIBatang

각 글꼴은 해당 라이선스에 따라 상업적 이용이 가능합니다. 앱 소스 코드는 MIT 라이선스이지만, 포함된 글꼴과 서드파티 패키지는 각각의 라이선스를 따릅니다. 자세한 내용은 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)를 확인하세요.

## 개발

필요한 환경:

- Node.js 22 이상
- npm

```bash
npm ci
npm run dev
```

자주 쓰는 명령어:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run preview
```

## 배포

GitHub Pages 배포는 [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)에 설정되어 있습니다.

이 저장소의 공개 사이트 주소는 다음과 같습니다.

https://jhste102lab.github.io/epub-forge/

GitHub에서 배포하려면:

1. 저장소를 public으로 전환합니다.
2. GitHub의 **Settings → Pages**에서 **Source**를 **GitHub Actions**로 설정합니다.
3. `master` 브랜치에 push하거나 Actions 탭에서 **Deploy to GitHub Pages** 워크플로를 직접 실행합니다.

저장소 소유자, 저장소 이름, 커스텀 도메인이 바뀌면 다음 항목도 함께 수정하세요.

- `package.json`의 `homepage`
- `vite.config.ts`의 `base`
- `scripts/prerender.mjs`에서 사용하는 `SITE_URL` 또는 기본 URL
- README 파일의 서비스 링크

## 라이선스

앱 소스 코드는 MIT 라이선스입니다. [LICENSE](./LICENSE)를 확인하세요. 서드파티 구성 요소는 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)에 정리되어 있습니다.
