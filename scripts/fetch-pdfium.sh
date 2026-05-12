#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PDFIUM_DIR="$ROOT_DIR/src-tauri/resources/pdfium"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$PDFIUM_DIR"

download() {
  local name="$1"
  local url="https://github.com/bblanchon/pdfium-binaries/releases/latest/download/$name"
  curl -L "$url" -o "$TMP_DIR/$name"
}

download pdfium-mac-univ.tgz
download pdfium-win-x64.tgz
download pdfium-linux-x64.tgz

tar -xzf "$TMP_DIR/pdfium-mac-univ.tgz" -C "$PDFIUM_DIR" --strip-components 1 lib/libpdfium.dylib
tar -xzf "$TMP_DIR/pdfium-win-x64.tgz" -C "$PDFIUM_DIR" --strip-components 1 bin/pdfium.dll
tar -xzf "$TMP_DIR/pdfium-linux-x64.tgz" -C "$PDFIUM_DIR" --strip-components 1 lib/libpdfium.so
tar -xzf "$TMP_DIR/pdfium-mac-univ.tgz" -C "$PDFIUM_DIR" LICENSE VERSION licenses

echo "Pdfium binaries updated in $PDFIUM_DIR"
