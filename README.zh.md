# epub-forge

[English](./README.en.md) · [한국어](./README.ko.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md)

**epub-forge** 是一款完全在浏览器中运行的文档转 EPUB 工具。把文档拖进页面，调整书名、作者、封面和排版设置，就可以下载生成好的 EPUB。所有文件都只在你的设备上处理，不会上传到服务器。

在线地址：https://jhste102lab.github.io/epub-forge/  
代码仓库：https://github.com/jhste102lab/epub-forge

## 功能亮点

- 支持转换 `.txt`、`.docx`、`.hwpx`、尽力兼容的 `.hwp`，以及包含这些文件的 `.zip` 压缩包。
- 一个输入文档生成一本 EPUB。
- 转换前可分别编辑每本书的标题、作者和封面。
- 批量统一设置字体、字号、页边距、段落间距、行高、首行缩进和断行重排规则。
- 将硬换行文本重新整理成更适合阅读的段落，同时保留空行。
- 将所选内置字体按实际用到的字符精简后嵌入 EPUB，让阅读器上的显示尽量保持一致。
- 支持单独下载某本 EPUB，也支持把整批结果打包成 ZIP 下载。
- 界面支持英语、韩语、简体中文和日语。
- 支持浅色和深色主题。

## 隐私说明

文档解析、封面处理、字体处理和 EPUB 生成都在浏览器本地完成。本应用以静态网站形式部署，不提供账号、云端存储、统计分析或服务器端转换功能。

## 内置字体

本仓库包含转换时使用的 4 个字体文件：

- Noto Serif KR
- Noto Sans KR
- Pretendard
- RIDIBatang

这些字体可在各自许可证允许的范围内用于商业用途。应用源码使用 MIT 许可证，但内置字体和第三方依赖仍遵循它们各自的许可证。详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

## 本地开发

环境要求：

- Node.js 22 或更高版本
- npm

```bash
npm ci
npm run dev
```

常用命令：

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run preview
```

## 部署

GitHub Pages 部署配置位于 [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)。

本仓库的公开访问地址预计为：

https://jhste102lab.github.io/epub-forge/

在 GitHub 上部署：

1. 将仓库设为 public。
2. 打开 **Settings → Pages**，将 **Source** 设置为 **GitHub Actions**。
3. 推送到 `master` 分支，或在 Actions 页面手动运行 **Deploy to GitHub Pages** 工作流。

如果仓库所有者、仓库名称或自定义域名发生变化，请同步更新：

- `package.json` 中的 `homepage`
- `vite.config.ts` 中的 `base`
- `scripts/prerender.mjs` 使用的 `SITE_URL` 或默认 URL
- README 文件中的在线地址

## 许可证

应用源码采用 MIT 许可证，详见 [LICENSE](./LICENSE)。第三方组件见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
