#!/usr/bin/env bash
#
# Removes Bubblewrap's generated full-screen "logo" splash (the LauncherActivity
# splash shown while the web view loads) by overwriting every generated
# splash.png with a 1x1 transparent pixel. The OS-level Android 12+ splash
# (launcher icon on #14245C) is separate and cannot be removed — see README.
#
# Run this AFTER every `bubblewrap init` / `bubblewrap update`, then `bubblewrap build`.
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLANK="$HERE/assets/blank.png"
RES="$HERE/app/src/main/res"

if [[ ! -d "$RES" ]]; then
  echo "error: $RES not found. Run 'bubblewrap init' / 'bubblewrap update' first." >&2
  exit 1
fi

count=0
# Bubblewrap names it splash.png across drawable-* density folders; some
# shell versions also emit splashscreen*.png. Match both.
while IFS= read -r -d '' f; do
  cp "$BLANK" "$f"
  count=$((count + 1))
  echo "blanked  $f"
done < <(find "$RES" -type f \( -name 'splash.png' -o -name 'splashscreen*.png' \) -print0)

if [[ "$count" -eq 0 ]]; then
  echo "note: no splash.png found under $RES — nothing to blank (ok if this shell version has no LauncherActivity splash)."
else
  echo "done: blanked $count splash image(s)."
fi
