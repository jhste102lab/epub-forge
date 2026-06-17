export default {
  app: {
    subtitle:
      'Your documents are never stored on a server or uploaded anywhere.\nThey are converted to EPUB right inside your browser.',
    skipped: 'Skipped unsupported files: {{names}}',
  },
  fonts: {
    'noto-serif-kr': 'Noto Serif (serif)',
    'noto-sans-kr': 'Noto Sans (sans-serif)',
    pretendard: 'Pretendard',
    ridibatang: 'RIDIBatang (serif)',
  },
  intake: {
    title: 'Drag files here, or click to choose',
    hint: 'Converts txt · docx · hwpx · hwp, or a zip of them, to EPUB.',
  },
  reflow: {
    legend: 'Paragraphs',
    join: 'Merge hard-wrapped lines into whole paragraphs',
    joinSpace: 'Add a space when joining lines',
    terminators: 'Characters that end a paragraph',
    exampleTitle: 'With your current settings, this becomes:',
    exampleLines: [
      '“Good morning.” he said',
      'She gave a small',
      'nod.',
      'Then the next scene begins',
    ],
  },
  style: {
    legend: 'Formatting (applies to all books)',
    font: 'Font',
    fontSize: 'Font size',
    lineHeight: 'Line spacing',
    marginLeft: 'Left margin',
    marginRight: 'Right margin',
    spacingTop: 'Space above paragraph',
    spacingBottom: 'Space below paragraph',
    indent: 'First-line indent',
  },
  preview: {
    title: 'Preview',
    caption: '{{font}} · {{size}}px',
    sample: [
      'The quick brown fox jumps over the lazy dog.',
      '“Check whether the font reads well.” 가나다 日本語 中文 123.',
      'Paragraph spacing, indent, and line spacing match the actual EPUB.',
    ],
  },
  batch: {
    count: '{{n}} files',
    convertAll: 'Convert all & download ZIP',
    converting: 'Converting… ({{done}}/{{total}})',
  },
  book: {
    cover: 'Choose cover image',
    coverAuto: 'Auto cover',
    coverReset: 'Remove cover',
    title: 'Title',
    author: 'Author',
    authorPlaceholder: '(optional)',
    remove: 'Remove',
    converting: 'Converting…',
    download: 'Convert',
  },
  theme: { toggle: 'Toggle light/dark' },
  language: { label: 'Language' },
  share: {
    save: 'Save settings',
    modalTitle: 'Link copied',
    modalMessage: 'Opening the copied link restores these settings.',
    close: 'Close',
  },
};
