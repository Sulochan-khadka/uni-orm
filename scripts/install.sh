#!/usr/bin/env bash
set -euo pipefail

REPO="Sulochan-khadka/uni-orm"           # <-- change if your repo differs
BIN_NAME="uni-orm"                       # final CLI name on PATH
VERSION="${UNIORM_VERSION:-latest}"

ansi_red()   { printf "\033[31m%s\033[0m\n" "$*"; }
ansi_green() { printf "\033[32m%s\033[0m\n" "$*"; }

# Resolve release tag
if [ "$VERSION" = "latest" ]; then
  TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep -o '"tag_name": *"[^"]*"' | cut -d'"' -f4)
else
  TAG="$VERSION"
fi
[ -n "${TAG:-}" ] || { ansi_red "Could not resolve release tag"; exit 1; }

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) ansi_red "Unsupported arch: $ARCH"; exit 1 ;;
esac

case "$OS" in
  linux)   FILE="$BIN_NAME-node18-linux-$ARCH" ;;
  darwin)  FILE="$BIN_NAME-node18-macos-$ARCH" ;;
  *) ansi_red "Unsupported OS: $OS"; exit 1 ;;
esac

URL="https://github.com/$REPO/releases/download/$TAG/$FILE"
TMP="$(mktemp -d)"
DEST="/usr/local/bin/$BIN_NAME"

echo "Downloading $URL"
curl -fL "$URL" -o "$TMP/$BIN_NAME"
chmod +x "$TMP/$BIN_NAME"

# Need sudo if /usr/local/bin not writable
if [ ! -w "$(dirname "$DEST")" ]; then
  echo "Installing to $DEST (sudo may prompt)…"
  sudo mv "$TMP/$BIN_NAME" "$DEST"
else
  mv "$TMP/$BIN_NAME" "$DEST"
fi

rm -rf "$TMP"
ansi_green "Installed $BIN_NAME => $(command -v $BIN_NAME)"
$BIN_NAME --version || true
