#!/usr/bin/env bash
# Rehearses the release flow against the local Verdaccio (`nx run @acme/infra:up`), with the same
# commands the release and preview workflows run:
#
#   1. release: `changeset version` + `changeset publish`        → dist-tag `latest`
#   2. preview: a pending changeset, `changeset version --snapshot preview`, the snapshot guard
#               and `changeset publish --tag preview --no-git-tag` → dist-tag `preview`
#   3. consumer: installs the published packages in an empty folder, like another repository would,
#               and checks that `workspace:*` became real versions.
#
# It works on a temporary clone of HEAD, so the version bumps and changelogs never touch your
# working tree. Verdaccio is a stand-in for the company's private registry; nothing leaves this
# machine. Running it again skips versions that already exist and publishes a new preview.
set -euo pipefail

REGISTRY="${REGISTRY_URL:-http://localhost:4873}"
PACKAGES=(@acme/api-types @acme/api-client @acme/inventory-client @acme/domain @acme/events)

if ! curl -sf "$REGISTRY/-/ping" >/dev/null; then
  echo "✖ No registry at $REGISTRY. Start it with: pnpm nx run @acme/infra:up" >&2
  exit 1
fi

root="$(git rev-parse --show-toplevel)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# A throwaway npmrc that sends every @acme package to Verdaccio. ~/.npmrc is never read or changed.
"$root/infra/scripts/registry-auth.sh" "$REGISTRY" "$work/.npmrc" >/dev/null
export NPM_CONFIG_USERCONFIG="$work/.npmrc" NX_DAEMON=false NX_NO_CLOUD=true

echo "› Cloning $(git -C "$root" rev-parse --short HEAD) and building the packages"
git clone --quiet --no-local "$root" "$work/repo"
cd "$work/repo"
pnpm install --frozen-lockfile --silent
pnpm nx run-many -t build --projects=tag:scope:contracts,tag:scope:domain --output-style=static >/dev/null

echo "› 1. Release (latest)"
pnpm --silent changeset version
pnpm --silent changeset publish

echo "› 2. Preview: a pending change, published as a snapshot"
cat >.changeset/preview-demo.md <<'EOF'
---
'@acme/api-types': minor
---

Preview of a contract change that is still alpha.
EOF
pnpm --silent changeset version --snapshot preview
# Snapshot guard: without a pending changeset, `version --snapshot` changes nothing and `publish`
# would push the normal version under the `preview` tag.
if ! grep --quiet --extended-regexp '"version": "[^"]+-preview-[0-9]+"' contracts/packages/*/package.json; then
  echo "✖ No pending changeset produced a preview version; nothing to publish." >&2
  exit 1
fi
pnpm --silent changeset publish --tag preview --no-git-tag

echo "› 3. Dist-tags"
for package in "${PACKAGES[@]}"; do
  echo "  $package: $(npm dist-tag ls "$package" --registry "$REGISTRY/" | tr '\n' ' ')"
done

echo "› 4. A consumer installs the released packages"
mkdir "$work/consumer" && cd "$work/consumer"
npm init --yes >/dev/null
npm install --silent --no-audit --no-fund "@acme/api-types@latest" "@acme/domain@latest" \
  "@acme/events@latest" zod
node --input-type=module -e "
  import { Loan } from '@acme/api-types';
  import { calculateDueDate } from '@acme/domain';
  import { LOAN_CREATED_V1 } from '@acme/events';
  const loan = Loan.parse({
    id: '0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b',
    bookId: '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a',
    status: 'lost',
    startedAt: '2026-01-10T12:00:00Z',
    dueAt: calculateDueDate(new Date('2026-01-10T12:00:00Z')).toISOString(),
  });
  console.log('  imports work: status', loan.status, '| due', loan.dueAt, '|', LOAN_CREATED_V1);
"
client_dependency="$(npm view "@acme/api-client@latest" dependencies.@acme/api-types --registry "$REGISTRY/")"
if [[ "$client_dependency" == workspace:* || -z "$client_dependency" ]]; then
  echo "✖ @acme/api-client depends on @acme/api-types '$client_dependency' instead of a version." >&2
  exit 1
fi
echo "  @acme/api-client depends on @acme/api-types $client_dependency (workspace:* was replaced)"

echo "✔ Released to latest, previewed to preview; latest still points to the release."
