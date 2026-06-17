import * as Comlink from 'comlink';
import hbSubsetWasmUrl from 'harfbuzzjs/hb-subset.wasm?url';
import { convertDocument } from '../core/convert/convertDocument';
import { createSubsetter, type Subsetter } from '../core/fonts/subset';
import type { ConversionApi, FontAsset, WorkerConvertOptions } from './conversion.api';

let subsetterPromise: Promise<Subsetter> | undefined;
function getSubsetter(): Promise<Subsetter> {
  subsetterPromise ??= fetch(hbSubsetWasmUrl)
    .then((response) => response.arrayBuffer())
    .then((bytes) => createSubsetter(bytes));
  return subsetterPromise;
}

const fontCache = new Map<string, Promise<Uint8Array>>();
function fetchFontSource(asset: FontAsset): Promise<Uint8Array> {
  const url = new URL(import.meta.env.BASE_URL + asset.assetPath, self.location.origin).href;
  let pending = fontCache.get(url);
  if (!pending) {
    pending = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`글꼴을 불러오지 못했습니다 (${response.status})`);
      return new Uint8Array(await response.arrayBuffer());
    });
    fontCache.set(url, pending);
  }
  return pending;
}

/**
 * Runs the conversion pipeline off the main thread so the UI never blocks
 * The harfbuzz subsetter and the selected font's
 * source are fetched and cached here, then the subset is embedded inside the
 * pure core pipeline.
 */
const api: ConversionApi = {
  async convert(file, options: WorkerConvertOptions = {}) {
    const { font, ...rest } = options;
    if (!font) return convertDocument(file, rest);
    const [sourceBytes, subsetter] = await Promise.all([fetchFontSource(font), getSubsetter()]);
    return convertDocument(file, {
      ...rest,
      embedFont: { family: font.family, sourceBytes, subsetter },
    });
  },
};

Comlink.expose(api);
