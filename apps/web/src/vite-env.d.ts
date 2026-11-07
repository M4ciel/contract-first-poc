/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `'true'` answers API calls in the browser with the contract's generated MSW handlers. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
