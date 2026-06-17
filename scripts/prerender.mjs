// Post-build SEO step: emit per-language static HTML (title, description, OG,
// canonical, hreflang) plus sitemap.xml and robots.txt. The interactive app is
// the same everywhere; only the crawler-facing markup and initial language differ.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SITE = (process.env.SITE_URL ?? 'https://jhste102lab.github.io/epub-forge').replace(
  /\/$/,
  '',
);
const LANGS = ['en', 'ko', 'ja', 'zh'];

const META = {
  en: {
    title: 'epub-forge — Convert documents to EPUB in your browser',
    desc: 'Convert txt, docx, hwpx and hwp files to EPUB books entirely in your browser. Nothing is uploaded.',
    ogLocale: 'en_US',
  },
  ko: {
    title: 'epub-forge — 브라우저에서 문서를 EPUB으로 변환',
    desc: 'txt·docx·hwpx·hwp 문서를 브라우저 안에서 바로 EPUB으로 변환합니다. 파일은 어디에도 업로드되지 않습니다.',
    ogLocale: 'ko_KR',
  },
  ja: {
    title: 'epub-forge — ブラウザで文書を EPUB に変換',
    desc: 'txt・docx・hwpx・hwp をブラウザ内でそのまま EPUB に変換します。ファイルはアップロードされません。',
    ogLocale: 'ja_JP',
  },
  zh: {
    title: 'epub-forge — 在浏览器中将文档转换为 EPUB',
    desc: '在浏览器中直接将 txt、docx、hwpx、hwp 转换为 EPUB，文件不会上传到任何服务器。',
    ogLocale: 'zh_CN',
  },
};

const template = readFileSync('dist/index.html', 'utf8');

function hreflangLinks() {
  return [
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}/" />`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
  ].join('\n    ');
}

function jsonLd(lang, url) {
  const meta = META[lang];
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'epub-forge',
    url,
    description: meta.desc,
    inLanguage: lang,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function buildHtml(lang, url, forceLang) {
  const meta = META[lang];
  const head = [
    `<link rel="canonical" href="${url}" />`,
    hreflangLinks(),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${meta.title}" />`,
    `<meta property="og:description" content="${meta.desc}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}/logo.svg" />`,
    `<meta property="og:locale" content="${meta.ogLocale}" />`,
    `<meta name="twitter:card" content="summary" />`,
    jsonLd(lang, url),
    forceLang ? `<script>window.__INITIAL_LANG__ = ${JSON.stringify(lang)};</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ');

  return template
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`)
    .replace(
      /<meta name="description"[^>]*\/>/,
      `<meta name="description" content="${meta.desc}" />`,
    )
    .replace('</head>', `    ${head}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"></div>\n    <noscript><h1>epub-forge</h1><p>${meta.desc}</p></noscript>`,
    );
}

// Root is x-default (English markup, no forced language so detection runs).
writeFileSync('dist/index.html', buildHtml('en', `${SITE}/`, false));
for (const lang of LANGS) {
  mkdirSync(`dist/${lang}`, { recursive: true });
  writeFileSync(`dist/${lang}/index.html`, buildHtml(lang, `${SITE}/${lang}/`, true));
}

const urls = [`${SITE}/`, ...LANGS.map((l) => `${SITE}/${l}/`)];
writeFileSync(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);
writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`prerender: wrote root + ${LANGS.join(', ')} + sitemap.xml + robots.txt`);
