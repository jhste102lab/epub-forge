/// <reference types="vite/client" />

interface Window {
  /** Set by the prerendered per-language page to force the initial UI language. */
  __INITIAL_LANG__?: string;
}
