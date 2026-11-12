#!/usr/bin/env bash
# Downloads the pinned oasdiff release into contracts/.cache and verifies its SHA-256 against
# oasdiff.checksums before it is ever executed. Safe to run repeatedly; prints the binary path.
set -euo pipefail

OASDIFF_VERSION=1.34.1

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cache="$(cd "$here/../.." && pwd)/.cache/oasdiff/$OASDIFF_VERSION"
binary="$cache/oasdiff"

case "$(uname -s)/$(uname -m)" in
  Linux/x86_64) platform=linux_amd64 ;;
  Linux/aarch64 | Linux/arm64) platform=linux_arm64 ;;
  Darwin/*) platform=darwin_all ;;
  *) echo "Unsupported platform: $(uname -s)/$(uname -m)" >&2; exit 1 ;;
esac
asset="oasdiff_${OASDIFF_VERSION}_${platform}.tar.gz"

expected="$(awk -v asset="$asset" '$2 == asset { print $1 }' "$here/oasdiff.checksums")"
if [ -z "$expected" ]; then
  echo "No pinned checksum for $asset in oasdiff.checksums" >&2
  exit 1
fi

sha256() {
  if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# The archive is kept next to the binary, so a cached binary is re-verified on every run.
if [ ! -x "$binary" ] || [ "$(sha256 "$cache/$asset")" != "$expected" ]; then
  rm -rf "$cache" && mkdir -p "$cache"
  url="https://github.com/oasdiff/oasdiff/releases/download/v${OASDIFF_VERSION}/${asset}"
  echo "Downloading $url" >&2
  curl --fail --silent --show-error --location --retry 3 --output "$cache/$asset" "$url"
  actual="$(sha256 "$cache/$asset")"
  if [ "$actual" != "$expected" ]; then
    rm -rf "$cache"
    echo "Checksum mismatch for $asset: expected $expected, got $actual" >&2
    exit 1
  fi
  tar -xzf "$cache/$asset" -C "$cache" oasdiff
  chmod +x "$binary"
fi

echo "$binary"
