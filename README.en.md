# epub-forge

[English](./README.en.md) · [한국어](./README.ko.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md)

**epub-forge** is a browser-only document-to-EPUB converter. Drop documents into the page, adjust book details and typography, and download finished EPUB files. Your files stay on your device; nothing is uploaded to a server.

Live site: https://jhste102lab.github.io/epub-forge/  
Repository: https://github.com/jhste102lab/epub-forge

## Features

- Convert `.txt`, `.docx`, `.hwpx`, best-effort `.hwp`, and `.zip` bundles.
- One input document or one image-only ZIP becomes one EPUB book; multiple ZIPs stay separate.
- Edit each book's title, author, and cover. Choose a cover file, drop it on the thumbnail, or focus the thumbnail and paste an image.
- Apply batch-wide typography: font, size, margins, paragraph spacing, line height, indent, and reflow rules.
- Rejoin hard-wrapped lines into readable paragraphs while preserving blank lines.
- Embed a subset of the selected bundled font so the EPUB renders consistently on reader devices.
- Download one EPUB at a time or download the whole batch as a ZIP.
- Use the UI in English, Korean, Simplified Chinese, or Japanese.
- Light and dark themes.

### Image ZIPs

Image ZIPs support JPEG, PNG, and WebP. Pages are naturally sorted by their full archive paths (`1`, `2`, `10`) and keep their original bytes and resolution. The actual image format is detected from its bytes, not its filename. Text typography and font embedding do not apply to image pages.

ZIPs containing supported documents retain the existing one-document-per-book behavior and report skipped images. Other image formats are rejected rather than silently losing pages. WebP is an EPUB core image format, but older readers may not support it. A selected or generated cover is added before all original pages, including any cover already inside the ZIP.

## Privacy

All parsing, cover handling, font processing, and EPUB generation run in the browser. The app is hosted as a static site and does not provide accounts, storage, analytics, or server-side conversion.

## Bundled fonts

The repository includes four font files used by the converter:

- Noto Serif KR
- Noto Sans KR
- Pretendard
- RIDIBatang

These fonts are free for commercial use under their own licenses. The application source code is MIT licensed, but bundled fonts and third-party packages remain under their respective licenses. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Development

Requirements:

- Node.js 22+
- npm

```bash
npm ci
npm run dev
```

Useful commands:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run preview
```

## Deployment

GitHub Pages deployment is configured in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

For this repository, the public site is expected at:

https://jhste102lab.github.io/epub-forge/

To deploy from GitHub:

1. Make the repository public.
2. In GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `master` or run the **Deploy to GitHub Pages** workflow manually from the Actions tab.

If the repository owner, repository name, or custom domain changes, update:

- `homepage` in `package.json`
- `base` in `vite.config.ts`
- `SITE_URL` used by `scripts/prerender.mjs` or its default URL
- the live-site link in the README files

## License

MIT for the application source code. See [LICENSE](./LICENSE). Third-party components are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
