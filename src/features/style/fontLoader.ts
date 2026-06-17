import { fontOption, type FontId } from '../../core/fonts/catalog';

/**
 * Lazily load the selected preview font with the CSS Font Loading API, using the
 * very same self-hosted OTF that gets subset + embedded into the EPUB — so the
 * preview matches the output exactly. Only the chosen font is fetched (and the
 * worker reuses the same cached file when converting), keeping things light.
 */
const loaded = new Map<FontId, Promise<void>>();

export function loadFont(id: FontId): Promise<void> {
  let pending = loaded.get(id);
  if (!pending) {
    const option = fontOption(id);
    const url = `${import.meta.env.BASE_URL}${option.assetPath}`;
    const face = new FontFace(option.family, `url(${url})`);
    pending = face.load().then((loadedFace) => {
      document.fonts.add(loadedFace);
    });
    loaded.set(id, pending);
  }
  return pending;
}
