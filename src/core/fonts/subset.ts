/**
 * Font subsetting via harfbuzz's `hb-subset` WebAssembly module. Reduces a full
 * font to only the glyphs a Book needs (sfnt in, sfnt out — no woff2 codec).
 * Pure WebAssembly: the same code runs in the browser worker and in Node tests;
 * each environment only differs in how it hands us the wasm bytes.
 *
 * The subset call sequence mirrors harfbuzz's documented hb-subset API and is
 * adapted from the MIT-licensed `subset-font` package.
 *
 */

interface HarfbuzzExports {
  readonly memory: WebAssembly.Memory;
  malloc(bytes: number): number;
  free(ptr: number): void;
  hb_blob_create(
    data: number,
    length: number,
    mode: number,
    userData: number,
    destroy: number,
  ): number;
  hb_blob_destroy(blob: number): void;
  hb_blob_get_data(blob: number, length: number): number;
  hb_blob_get_length(blob: number): number;
  hb_face_create(blob: number, index: number): number;
  hb_face_destroy(face: number): void;
  hb_face_reference_blob(face: number): number;
  hb_subset_input_create_or_fail(): number;
  hb_subset_input_destroy(input: number): void;
  hb_subset_input_unicode_set(input: number): number;
  hb_subset_input_set(input: number, setType: number): number;
  hb_set_clear(set: number): void;
  hb_set_invert(set: number): void;
  hb_set_add(set: number, codepoint: number): void;
  hb_subset_or_fail(face: number, input: number): number;
}

const HB_MEMORY_MODE_WRITABLE = 2;
const HB_SUBSET_SETS_LAYOUT_FEATURE_TAG = 6;

/** Subset `fontBytes` to the glyphs needed for `text`, returning sfnt bytes. */
export type Subsetter = (fontBytes: Uint8Array, text: string) => Uint8Array;

/** Instantiate harfbuzz once from the given wasm and return a reusable subsetter. */
export async function createSubsetter(wasm: BufferSource): Promise<Subsetter> {
  const { instance } = await WebAssembly.instantiate(wasm);
  const hb = instance.exports as unknown as HarfbuzzExports;
  return (fontBytes, text) => subset(hb, fontBytes, text);
}

function subset(hb: HarfbuzzExports, fontBytes: Uint8Array, text: string): Uint8Array {
  const input = hb.hb_subset_input_create_or_fail();
  if (input === 0) throw new Error('글꼴 처리에 실패했습니다 (subset input).');

  const fontPtr = hb.malloc(fontBytes.byteLength);
  new Uint8Array(hb.memory.buffer).set(fontBytes, fontPtr);
  const blob = hb.hb_blob_create(fontPtr, fontBytes.byteLength, HB_MEMORY_MODE_WRITABLE, 0, 0);
  const face = hb.hb_face_create(blob, 0);
  hb.hb_blob_destroy(blob);

  // Keep all OpenType layout features (equivalent to --layout-features=*).
  const layoutFeatures = hb.hb_subset_input_set(input, HB_SUBSET_SETS_LAYOUT_FEATURE_TAG);
  hb.hb_set_clear(layoutFeatures);
  hb.hb_set_invert(layoutFeatures);

  const unicodes = hb.hb_subset_input_unicode_set(input);
  for (const char of text) {
    hb.hb_set_add(unicodes, char.codePointAt(0) ?? 0);
  }

  let subsetFace = 0;
  try {
    subsetFace = hb.hb_subset_or_fail(face, input);
    if (subsetFace === 0) throw new Error('글꼴 서브셋 생성에 실패했습니다.');
  } finally {
    hb.hb_subset_input_destroy(input);
  }

  const resultBlob = hb.hb_face_reference_blob(subsetFace);
  const offset = hb.hb_blob_get_data(resultBlob, 0);
  const length = hb.hb_blob_get_length(resultBlob);
  // Copy out of wasm memory before freeing.
  const out = new Uint8Array(hb.memory.buffer, offset, length).slice();

  hb.hb_blob_destroy(resultBlob);
  hb.hb_face_destroy(subsetFace);
  hb.hb_face_destroy(face);
  hb.free(fontPtr);
  return out;
}

/**
 * The unique characters a Book needs, gathered from its Title, author, and body.
 * A small set of always-useful characters is included so common punctuation and
 * spacing render even if absent from the text.
 */
export function usedCharacters(parts: Iterable<string>): string {
  const chars = new Set<string>(' \n\t.,!?…“”‘’"\'()[]—-');
  for (const part of parts) {
    for (const ch of part) chars.add(ch);
  }
  return [...chars].join('');
}
