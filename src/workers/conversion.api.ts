import type { ConvertOptions, ConvertResult } from '../core/convert/convertDocument';
import type { FileLike } from '../core/parse/types';

/** The selected font to embed, identified by family + the source asset path. */
export interface FontAsset {
  readonly family: string;
  /** Path of the full source woff2, relative to the app base URL. */
  readonly assetPath: string;
}

/** Convert options as seen by the worker: the font is passed by asset, not bytes. */
export type WorkerConvertOptions = Omit<ConvertOptions, 'embedFont'> & {
  readonly font?: FontAsset;
};

/** The contract exposed by the conversion worker and consumed via Comlink. */
export interface ConversionApi {
  convert(file: FileLike, options?: WorkerConvertOptions): Promise<ConvertResult>;
}
