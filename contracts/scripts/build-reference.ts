/**
 * API reference portal: one static page (artifacts/reference/index.html) that renders every API
 * bundle with Scalar. Generated from the same bundles as the code, so the documentation cannot
 * drift from the contract. Open the file in a browser; nothing is served or uploaded.
 *
 * Scalar is loaded from a CDN at an exact version with a Subresource Integrity hash: the browser
 * refuses the script if its content ever changes.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SCALAR_VERSION = '1.76.0';
const SCALAR_URL = `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}/dist/browser/standalone.js`;
const SCALAR_INTEGRITY = 'sha384-oH1C0RwqcwbVXkC+r8A+4qRoyEUQdtxAzOwumkxZtQBBcsy61FOoPt7B50OVJYYQ';

const root = join(import.meta.dirname, '..');
const apis = [
  { slug: 'library', title: 'Acme Library API (public)' },
  { slug: 'inventory', title: 'Acme Inventory API (internal)' },
];

const sources = apis.map(({ slug, title }) => ({
  slug,
  title,
  content: readFileSync(join(root, 'artifacts', `${slug}.bundle.yaml`), 'utf8'),
}));

// `</script>` inside the embedded YAML would end the script element early.
const json = JSON.stringify({ sources, theme: 'default', hideClientButton: true }).replaceAll(
  '</',
  '<\\/',
);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Acme API reference</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="${SCALAR_URL}" integrity="${SCALAR_INTEGRITY}" crossorigin="anonymous"></script>
    <script>
      Scalar.createApiReference('#app', ${json});
    </script>
  </body>
</html>
`;

const output = join(root, 'artifacts', 'reference');
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'index.html'), html);
console.log(
  `[reference] ${join('artifacts', 'reference', 'index.html')} (${apis.map((api) => api.slug).join(', ')})`,
);
