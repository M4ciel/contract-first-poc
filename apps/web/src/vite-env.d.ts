/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `'true'` answers API calls in the browser with the contract's generated MSW handlers. */
  readonly VITE_USE_MOCKS?: string;
  /** Flagsmith client-side environment key. Without it, flags come from VITE_FLAG_* values. */
  readonly VITE_FLAGSMITH_ENVIRONMENT_KEY?: string;
  /** Flagsmith API, default `http://localhost:8000/api/v1/` (the compose service). */
  readonly VITE_FLAGSMITH_API_URL?: string;
  /** `'true'` turns booksV2 on when flags do not come from Flagsmith (mock mode, tests). */
  readonly VITE_FLAG_BOOKS_V2?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
