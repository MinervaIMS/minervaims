#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Fetches the /join media bundle into public/media/join/.
#
# The binaries are hosted rather than committed because this repository
# has never stored page media in git: every other page references its
# assets through a .asset.json manifest pointing at a hosted URL. The
# manifests in src/assets/join-*.asset.json expect these files at
# /media/join/<name>, which is what this script sets up.
#
# Run from the repository root:
#   bash scripts/fetch-join-media.sh
# ---------------------------------------------------------------------
set -euo pipefail

BUNDLE_URL="https://d2ol7oe51mr4n9.cloudfront.net/user_3H13FLjRWnDs4P1NNMiJ6JFtdTU/f038020c-2118-418a-b5fe-d9028bee5bc7.zip"
DEST="public/media/join"

mkdir -p "$DEST"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Fetching the /join media bundle ..."
curl -fsSL -o "$TMP/join-media.zip" "$BUNDLE_URL"
unzip -qo "$TMP/join-media.zip" -d "$TMP/x"

# The archive already carries the public/media/join prefix.
cp -f "$TMP/x/public/media/join/." "$DEST/" -r

echo "Installed into $DEST:"
ls -1 "$DEST"
echo
echo "Expected: 18 files, about 2.4 MB in total."
