#!/usr/bin/env bash
#
# Regenerate media/<palette>.png — one shot per shipped theme.
#
#   npm run screenshots            # all palettes
#   npm run screenshots -- Amber   # just the ones matching a substring
#
# Everything happens on a private X server, so it never touches the desktop and
# the shots are identical run to run: same window size, same file, same scroll
# position, same selection.
#
# Three things here are less obvious than they look:
#
#   * VS Code re-reads workbench.colorTheme from settings.json while running,
#     so the whole set comes out of ONE window. Nothing moves between frames,
#     which is what makes the montage line up and the GIF not jitter.
#   * VS Code on this box defaults to the Wayland backend and would ignore
#     DISPLAY, opening a window on the real desktop. --ozone-platform=x11 with
#     WAYLAND_DISPLAY unset pins it to the virtual server.
#   * The CLI cannot run commands, so a throwaway extension is generated into
#     the temp extensions dir to open the terminal, print the ANSI ramp and set
#     the selection. It is never part of the shipped extension.
#
# Requires: Xvfb, ImageMagick (import, magick), code. ffmpeg for the GIF.
set -euo pipefail
cd "$(dirname "$0")/.."

DISP=${DISP:-:99}
W=${W:-1500}
H=${H:-940}
FILE=${FILE:-src/crt.c}
SEL_LINE=${SEL_LINE:-21}          # 0-based: the printf line
OUT=media

for bin in Xvfb import magick code; do
    command -v "$bin" >/dev/null || { echo "missing: $bin" >&2; exit 1; }
done

TMP=$(mktemp -d -t crt-shots-XXXXXX)
XVFB_PID=""
cleanup() {
    # Bracket the first character so the pattern cannot match this script's own
    # command line, which contains $TMP too.
    local pat; pat=$(echo "$TMP" | sed 's|/\(.\)|/[\1]|2')
    # VS Code catches SIGTERM and tries a graceful shutdown, which hangs once
    # the X server it was drawing to is gone. Give it a moment, then insist.
    pkill -f "$pat" 2>/dev/null || true
    sleep 2
    pkill -9 -f "$pat" 2>/dev/null || true
    [ -n "$XVFB_PID" ] && kill "$XVFB_PID" 2>/dev/null || true
    rm -rf "$TMP"
}
trap cleanup EXIT

echo "==> packaging"
npm run package >/dev/null

mkdir -p "$TMP/user/User" "$TMP/ext"

# --- the look of the shot ----------------------------------------------------
cat > "$TMP/user/User/settings.json" <<JSON
{
  "workbench.colorTheme": "CRT Amber",
  "workbench.iconTheme": null,
  "terminal.integrated.shellIntegration.decorationsEnabled": "never",
  "chat.disableAIFeatures": true,
  "workbench.welcomePage.walkthroughs.openOnInstall": false,
  "editor.fontFamily": "'Cascadia Mono NF', 'DejaVu Sans Mono', monospace",
  "editor.fontSize": 14,
  "terminal.integrated.fontSize": 13,
  "security.workspace.trust.enabled": false,
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false,
  "workbench.layoutControl.enabled": false,
  "workbench.secondarySideBar.defaultVisibility": "hidden",
  "window.menuBarVisibility": "compact",
  "update.mode": "none",
  "telemetry.telemetryLevel": "off",
  "extensions.ignoreRecommendations": true,
  "window.commandCenter": false,
  "explorer.compactFolders": false,
  "git.openRepositoryInParentFolders": "never",
  "git.blame.statusBarItem.enabled": false,
  "files.exclude": {
    "**/.git": true, "**/.claude": true, "**/.vscode-test": true,
    "**/node_modules": true, "**/out": true, "**/build": true, "**/legacy": true
  }
}
JSON

# --- terminal content: the ANSI ramp, as a picture of itself -----------------
#
# The shell is started with --noprofile --rcfile so it picks up none of the
# user's own setup: a starship prompt puts the repo path, branch, node version
# and a clock in every shot, which dates them and says nothing about the theme.
# A bare "$ " is both cleaner and more in keeping with the subject matter.
cat > "$TMP/shotrc" <<'SH'
PS1='$ '
colors() {
    printf '\n'
    printf '  '; for i in 0 1 2 3 4 5 6 7; do printf "\033[4${i}m    \033[0m"; done; printf '  normal\n'
    printf '  '; for i in 0 1 2 3 4 5 6 7; do printf "\033[10${i}m    \033[0m"; done; printf '  bright\n\n'
    printf '  \033[32m✓\033[0m build   \033[33m●\033[0m 2 modified   \033[31m✗\033[0m 0 failing\n\n'
}
SH

# --- helper extension: the CLI has no way to run commands --------------------
mkdir -p "$TMP/ext/local.shot-helper-0.0.1"
cat > "$TMP/ext/local.shot-helper-0.0.1/package.json" <<'JSON'
{
  "name": "shot-helper", "publisher": "local", "version": "0.0.1",
  "engines": { "vscode": "^1.90.0" },
  "main": "./ext.js",
  "activationEvents": ["onStartupFinished"]
}
JSON
cat > "$TMP/ext/local.shot-helper-0.0.1/ext.js" <<'JS'
const vscode = require('vscode');
const wait = ms => new Promise(r => setTimeout(r, ms));

exports.activate = async function () {
    // The layout is restored from the profile before settings apply, so the
    // chat bar has to be closed rather than configured away.
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar').then(undefined, () => {});

    const t = vscode.window.createTerminal({
        name: 'crt',
        cwd: vscode.workspace.rootPath,
        shellPath: '/usr/bin/bash',
        shellArgs: ['--noprofile', '--rcfile', process.env.SHOT_RC, '-i'],
    });
    t.show(false);
    await wait(2000);
    t.sendText('clear');          // separately, so the command itself scrolls away
    await wait(600);
    t.sendText('colors');
    await wait(1500);

    const ed = vscode.window.visibleTextEditors[0];
    if (ed) {
        await vscode.window.showTextDocument(ed.document, { preserveFocus: false });
        const line = Number(process.env.SHOT_SEL_LINE || 0);
        ed.selection = new vscode.Selection(line, 4, line, 32);
        ed.revealRange(new vscode.Range(0, 0, 0, 0));
    }
};
JS

echo "==> starting X server on $DISP (${W}x${H})"
( trap '' USR1; setsid Xvfb "$DISP" -screen 0 "${W}x${H}x24" -nolisten tcp -ac >"$TMP/xvfb.log" 2>&1 & )
sleep 2
XVFB_PID=$(pgrep -f "Xvfb $DISP" | head -1)

echo "==> installing $(ls build/*.vsix | head -1)"
DISPLAY=$DISP code --user-data-dir "$TMP/user" --extensions-dir "$TMP/ext" \
    --install-extension "$(ls build/*.vsix | head -1)" >/dev/null 2>&1

echo "==> launching"
( env -u WAYLAND_DISPLAY DISPLAY=$DISP \
      SHOT_RC="$TMP/shotrc" SHOT_SEL_LINE="$SEL_LINE" \
      setsid code --ozone-platform=x11 \
      --user-data-dir "$TMP/user" --extensions-dir "$TMP/ext" \
      --disable-gpu --new-window . "$FILE" \
      >"$TMP/code.log" 2>&1 & )

# Wait for the frame to stop changing rather than guessing a duration: capture
# every 1.5s and compare ImageMagick signatures. Startup, theme switches and the
# terminal all settle the same way, so the same helper covers every wait.
settle() {
    local last="" sig n=0
    while [ $n -lt ${2:-30} ]; do
        sleep 1.5; n=$((n + 1))
        DISPLAY=$DISP import -window root "$TMP/probe.png" 2>/dev/null || continue
        sig=$(magick identify -format '%#' "$TMP/probe.png")
        [ "$sig" = "$last" ] && [ "$(magick identify -format '%k' "$TMP/probe.png")" -gt 500 ] && return 0
        last=$sig
    done
}

echo -n "==> waiting for workbench"
settle
echo " ok"

THEMES=$(node -p "require('./package.json').contributes.themes.map(t=>t.label).join('\n')")
[ $# -gt 0 ] && THEMES=$(echo "$THEMES" | grep -i "$1")

IFS=$'\n'
for theme in $THEMES; do
    slug=$(echo "$theme" | sed 's/^CRT //; s/ /-/g' | tr '[:upper:]' '[:lower:]')
    python3 - "$TMP/user/User/settings.json" "$theme" <<'PY'
import json, sys
p, theme = sys.argv[1], sys.argv[2]
s = json.load(open(p)); s['workbench.colorTheme'] = theme
json.dump(s, open(p, 'w'), indent=2)
PY
    sleep 1
    settle 8
    DISPLAY=$DISP import -window root "$TMP/raw.png"
    magick "$TMP/raw.png" -trim +repage -strip "$OUT/$slug.png"
    printf '    %-12s -> %s\n' "$theme" "$OUT/$slug.png"
done
unset IFS

# Contact sheet and palette cycle. Only worth doing for a full run — with a
# filter argument the set is incomplete and the montage would be misleading.
if [ $# -eq 0 ]; then
    # Derived from the manifest rather than hardcoded, so the contact sheet and
    # the GIF follow contributes.themes — the same order the Extensions view's
    # Set Color Theme picker shows, and the one the README table lists. It used
    # to be a separate hand-written list, which had drifted from both.
    ORDER=$(node -p "require('./package.json').contributes.themes.map(t=>t.label.replace(/^CRT /,'').replace(/ /g,'-').toLowerCase()).join(' ')")
    echo "==> assembling"
    magick montage $(for p in $ORDER; do echo "$OUT/$p.png"; done) \
        -tile 4x2 -geometry 360x225+4+4 -background '#111111' "$OUT/montage.png"
    # montage ignores -colors on the way out; quantise the finished sheet
    # instead. 256 colours across eight monochrome panels is visually lossless
    # (RMSE 0.006) and takes it from ~870KB to ~350KB.
    magick "$OUT/montage.png" -colors 256 -strip "$OUT/montage.png"
    printf '    montage      -> %s\n' "$OUT/montage.png"

    if command -v ffmpeg >/dev/null; then
        frames=$TMP/frames; mkdir -p "$frames"; i=0
        for p in $ORDER; do
            i=$((i + 1))
            magick "$OUT/$p.png" -resize 800x "$frames/$(printf %02d $i).png"
        done
        # One shared 64-colour palette across all frames: the whole point is that
        # only the hue changes, so per-frame palettes would make it flicker.
        ffmpeg -y -loglevel error -framerate 0.8 -pattern_type glob -i "$frames/*.png" \
            -vf "split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
            -loop 0 "$OUT/cycle.gif"
        printf '    cycle        -> %s\n' "$OUT/cycle.gif"
    fi
fi

echo "==> done"
