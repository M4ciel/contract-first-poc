// Turns a feature flag on or off in the local Flagsmith through its admin API: the same call the
// Flagsmith UI (http://localhost:8000) makes when you flip the toggle. The backend downloads the
// environment every few seconds, so the change is live without a restart.
//
// Usage: node infra/scripts/set-flag.ts <flag> <on|off>     (or: nx run @acme/infra:flag --args="booksV2 on")
const FLAGS = ['booksV2'] as const;

const API = process.env['FLAGSMITH_URL'] ?? 'http://localhost:8000/api/v1';
// Example-only values seeded by infra/flagsmith/seed.py (see compose.yaml).
const EMAIL = process.env['FLAGSMITH_ADMIN_EMAIL'] ?? 'admin@example.test';
const PASSWORD = process.env['FLAGSMITH_ADMIN_PASSWORD'] ?? 'acme-local-admin';
const ENVIRONMENT_KEY = process.env['FLAGSMITH_CLIENT_KEY'] ?? 'acmeLocalClientKey';

const [flag, state] = process.argv.slice(2);
if (!flag || !(FLAGS as readonly string[]).includes(flag) || (state !== 'on' && state !== 'off')) {
  console.error(`Usage: set-flag.ts <${FLAGS.join('|')}> <on|off>`);
  process.exit(1);
}

const call = async <T>(path: string, init: RequestInit = {}, token?: string): Promise<T> => {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Token ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
};

const { key } = await call<{ key: string }>('/auth/login/', {
  method: 'POST',
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const states = await call<{ results: Array<{ id: number }> }>(
  `/environments/${ENVIRONMENT_KEY}/featurestates/?feature_name=${flag}`,
  {},
  key,
);
const featureState = states.results[0];
if (!featureState) throw new Error(`${flag} not found in Flagsmith. Is the environment up?`);

await call(
  `/environments/${ENVIRONMENT_KEY}/featurestates/${featureState.id}/`,
  { method: 'PATCH', body: JSON.stringify({ enabled: state === 'on' }) },
  key,
);
console.log(`✔ ${flag} is now ${state}; the backend picks it up within a few seconds.`);
