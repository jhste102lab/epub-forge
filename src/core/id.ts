/**
 * Generate a UUID. Uses `crypto.randomUUID()` when available, but falls back to
 * a manual v4 for **insecure contexts** — e.g. opening the dev server over a LAN
 * IP (`http://192.168.x.x`) rather than `localhost`, where `crypto.randomUUID`
 * is undefined.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
