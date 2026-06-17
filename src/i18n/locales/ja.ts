export default {
  app: {
    subtitle:
      '文書はサーバーに保存されず、どこにもアップロードされません。\nあなたのブラウザ内でそのまま EPUB に変換されます。',
    skipped: '対応していないためスキップしたファイル: {{names}}',
  },
  fonts: {
    'noto-serif-kr': 'Noto Serif（明朝）',
    'noto-sans-kr': 'Noto Sans（ゴシック）',
    pretendard: 'Pretendard',
    ridibatang: 'RIDIBatang（明朝）',
  },
  intake: {
    title: 'ファイルをここにドラッグ、またはクリックして選択',
    hint: 'txt・docx・hwpx・hwp、またはそれらを含む zip を EPUB に変換します。',
  },
  reflow: {
    legend: '段落の整形',
    join: '改行で切れた文を一つの段落に結合',
    joinSpace: '行を結合するときに空白を入れる',
    terminators: '段落の終わりとみなす文字',
    exampleTitle: '今の設定だと、こう整形されます：',
    exampleLines: [
      '「おはよう。」と彼は言った',
      '彼女は小さく',
      'うなずいた。',
      'そして次の場面が始まる',
    ],
  },
  style: {
    legend: '書式（すべての本に適用）',
    font: 'フォント',
    fontSize: '文字サイズ',
    lineHeight: '行間',
    marginLeft: '左余白',
    marginRight: '右余白',
    spacingTop: '段落の上の間隔',
    spacingBottom: '段落の下の間隔',
    indent: '行頭の字下げ',
  },
  preview: {
    title: 'プレビュー',
    caption: '{{font}} · {{size}}px',
    sample: [
      'いろはにほへと ちりぬるを。',
      '「読みやすいフォントか確認しましょう。」The quick brown fox. 가나다 中文 123.',
      '段落間隔・字下げ・行間が実際の EPUB と同じに見えます。',
    ],
  },
  batch: {
    count: '{{n}}個',
    convertAll: 'すべて変換して ZIP をダウンロード',
    converting: '変換中… ({{done}}/{{total}})',
  },
  book: {
    cover: '表紙画像を選択',
    coverAuto: '自動表紙',
    coverReset: '表紙を削除',
    title: 'タイトル',
    author: '著者',
    authorPlaceholder: '（任意）',
    remove: '削除',
    converting: '変換中…',
    download: '変換',
  },
  theme: { toggle: 'ライト／ダーク切り替え' },
  language: { label: '言語' },
  share: {
    save: '設定を保存',
    modalTitle: 'リンクをコピーしました',
    modalMessage: 'コピーした URL を開くと、この設定がそのまま再現されます。',
    close: '閉じる',
  },
};
