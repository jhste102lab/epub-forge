import { decodeSettings, encodeSettings, type ShareableSettings } from '../../core/settings/share';

const HASH_KEY = 's';

/** Read settings from the current URL hash, or `fallback` if none/invalid. */
export function readSharedSettings(fallback: ShareableSettings): ShareableSettings {
  const encoded = new URLSearchParams(window.location.hash.slice(1)).get(HASH_KEY);
  return encoded ? decodeSettings(encoded, fallback) : fallback;
}

/**
 * Mirror the current settings into the URL hash without adding history entries.
 * When the settings equal the defaults the hash is dropped, so a fresh visit
 * keeps a clean URL.
 */
export function syncSharedSettings(settings: ShareableSettings, defaults: ShareableSettings): void {
  const encoded = encodeSettings(settings);
  const hash = encoded === encodeSettings(defaults) ? '' : `#${HASH_KEY}=${encoded}`;
  if (hash !== window.location.hash) {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}${hash}`,
    );
  }
}
