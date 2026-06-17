# epub-forge

[English](./README.en.md) · [한국어](./README.ko.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md)

**epub-forge** は、ブラウザだけで動く文書→EPUB 変換ツールです。文書をページに入れ、書名・著者・表紙・組版を調整して、完成した EPUB をダウンロードできます。ファイルは手元の端末内で処理され、サーバーへアップロードされません。

公開サイト: https://jhste102lab.github.io/epub-forge/  
リポジトリ: https://github.com/jhste102lab/epub-forge

## 主な機能

- `.txt`、`.docx`、`.hwpx`、ベストエフォート対応の `.hwp`、およびそれらを含む `.zip` を変換。
- 入力文書 1 つにつき EPUB 1 冊を生成。
- 変換前に各書籍のタイトル、著者、表紙を編集。
- フォント、文字サイズ、左右余白、段落間隔、行間、字下げ、改行の整形ルールを一括設定。
- 不自然に改行された本文を読みやすい段落に整え、空行は保持。
- 選択した同梱フォントを必要な文字だけに絞って EPUB に埋め込み、リーダー端末でも表示をできるだけ揃える。
- EPUB を個別にダウンロード、または全件を ZIP でまとめてダウンロード。
- 英語、韓国語、簡体字中国語、日本語 UI に対応。
- ライト/ダークテーマに対応。

## プライバシー

文書の解析、表紙処理、フォント処理、EPUB 生成はすべてブラウザ内で実行されます。このアプリは静的サイトとして配信され、アカウント、クラウド保存、アクセス解析、サーバー側変換機能はありません。

## 同梱フォント

このリポジトリには、変換に使用する 4 つのフォントファイルが含まれています。

- Noto Serif KR
- Noto Sans KR
- Pretendard
- RIDIBatang

各フォントは、それぞれのライセンスに従って商用利用できます。アプリのソースコードは MIT ライセンスですが、同梱フォントとサードパーティパッケージは各自のライセンスに従います。詳しくは [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) を確認してください。

## 開発

必要な環境:

- Node.js 22 以上
- npm

```bash
npm ci
npm run dev
```

よく使うコマンド:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run preview
```

## デプロイ

GitHub Pages のデプロイ設定は [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) にあります。

このリポジトリの公開サイトは次の URL を想定しています。

https://jhste102lab.github.io/epub-forge/

GitHub でデプロイする手順:

1. リポジトリを public にします。
2. GitHub の **Settings → Pages** で **Source** を **GitHub Actions** に設定します。
3. `master` ブランチへ push するか、Actions タブから **Deploy to GitHub Pages** ワークフローを手動実行します。

リポジトリの所有者、リポジトリ名、カスタムドメインが変わる場合は、次も更新してください。

- `package.json` の `homepage`
- `vite.config.ts` の `base`
- `scripts/prerender.mjs` で使う `SITE_URL` または既定 URL
- README ファイル内の公開サイト URL

## ライセンス

アプリのソースコードは MIT ライセンスです。[LICENSE](./LICENSE) を確認してください。サードパーティ構成要素は [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) にまとめています。
