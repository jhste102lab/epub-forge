import * as Comlink from 'comlink';
import type { ConversionApi } from './conversion.api';

let cached: Comlink.Remote<ConversionApi> | undefined;

/** Lazily spin up the conversion worker and return a Comlink proxy to it. */
export function getConversionApi(): Comlink.Remote<ConversionApi> {
  if (!cached) {
    const worker = new Worker(new URL('./conversion.worker.ts', import.meta.url), {
      type: 'module',
    });
    cached = Comlink.wrap<ConversionApi>(worker);
  }
  return cached;
}
