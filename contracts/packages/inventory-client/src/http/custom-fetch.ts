/**
 * Orval mutator: every generated inventory call goes through `customFetch`. The base URL and the
 * `fetch` implementation are set at runtime with `configureInventoryClient`, so one build of this
 * package works in every environment (local MiniStack, CI, production) and a consumer can sign
 * requests (for example AWS SigV4) by passing its own `fetch`.
 */
export interface InventoryClientConfig {
  /** Origin and base path of the inventory API, for example the API Gateway stage URL. */
  readonly baseUrl: string;
  /** Defaults to the global `fetch`, looked up on every call (so test interceptors apply). */
  readonly fetch?: typeof fetch;
}

let current: InventoryClientConfig | undefined;

export const configureInventoryClient = (config: InventoryClientConfig): void => {
  current = { ...config, baseUrl: config.baseUrl.replace(/\/+$/, '') };
};

/** Same response shape as Orval's default fetch client: `{ data, status, headers }`. */
export const customFetch = async <T>(path: string, init: RequestInit): Promise<T> => {
  if (!current) {
    throw new Error('Call configureInventoryClient({ baseUrl }) before using the inventory client');
  }
  const doFetch = current.fetch ?? globalThis.fetch;
  const response = await doFetch(`${current.baseUrl}${path}`, init);
  const body = [204, 205, 304].includes(response.status) ? null : await response.text();
  const data: unknown = body ? JSON.parse(body) : {};
  return { data, status: response.status, headers: response.headers } as T;
};
