# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A VS Code extension that ships retro monochrome (CRT-style) color themes. All themes are built from just two colors — a foreground and a background — using a 2-bit design system with multiple opacity/mix levels derived from that pair.

## Commands

```bash
npm run compile          # TypeScript → out/
npm run build            # compile + regenerate all theme JSON files in themes/
npm run lint             # eslint src/
npm test                 # compile + lint + run vscode-test suite
npm run package          # vsce package → build/*.vsix
npm run clean            # rm build/ themes/ out/
npm run screenshots      # regenerate media/*.png + montage + cycle.gif on a
                         # private X server (needs Xvfb, ImageMagick, ffmpeg);
                         # takes a substring to shoot one palette

# Manual maintenance, when updating for a new VS Code release:
npm run extract-color-keys   # launch VS Code (needs a display), dump its workbench
                             # color schema → src/colorKeys.txt (extensions disabled,
                             # deprecated keys skipped)
npm run sync-classification  # reconcile src/classification.ts with colorKeys.txt:
                             # keeps existing roles, drops removed keys, adds new keys
                             # with heuristic first-guess roles (review those visually)
```

There is no watch-and-reload dev server. To test theme changes in VS Code, run `npm run build` then install the extension from the generated `.vsix` or reload the Extension Development Host.

## The `necromancer` branch goal

The `necromancer` branch replaces the old legacy pipeline entirely. The old approach required heavy manual tuning because VS Code color properties were mapped ad-hoc via regex. The new approach **classifies** all VS Code color properties up front, then derives every concrete color value algorithmically from just two inputs — a foreground and a background.

Specific goals, in order:

1. **Classified color properties** — every VS Code workbench/TextMate/semantic key is assigned to a role (e.g. `fgPrimary`, `bgRaised`, `borderSubtle`) so that arbitrary `fg`/`bg` pairs always produce a coherent result without manual tweaking.
2. **Static themes** — replace the legacy-generated `themes/*.json` files for the existing palette variants (Amber, Green, Blue, etc.) using the new TypeScript pipeline.
3. **CRT Custom theme** — a user-facing VS Code command lets the user pick their own `fg`/`bg`. The theme is applied as color customizations written into the user's `settings.json` (not as a `.json` theme file), and only ever by that command. There is no backup/restore step: every write is nested under a `[CRT Custom]` theme scope inside `workbench.colorCustomizations` / `editor.tokenColorCustomizations` / `editor.semanticTokenColorCustomizations` and merged over the existing global value, so customizations belonging to other themes are never touched and removing the block by hand is a complete undo.
4. **Perceptually accurate mixing** — the opacity/mix levels in the 2-bit design system should be derived from luminance-based mixing grounded in color science (e.g. OKLCH or similar perceptually uniform space) rather than linear RGB interpolation, so the four "bit levels" hold their intended spacing to the human eye for any fg/bg pair.

   The spacing is a uniform 0.25 the whole way (0.25 / 0.50 / 0.75 / 1.00), but only the top three rungs are *ink*. Treating all four as text levels was measured against every shipped palette and rejected: it leaves only two text-legible rungs and dims body text badly on the low-contrast pairs (Red, Blue, 64). The 0.25 rung is a background instead, and exists in both forms — solid as `RUNG_SURFACE`, translucent as `CHROME` — which is also what makes "one level lower" well defined for a key that has run out of ink rungs. See `RUNG_SURFACE` / `RUNG_FGL` / `RUNG_FGM` in `src/theme.ts`.

The legacy JS pipeline (`src/crt.js` + `src/build.js`) has been deleted. The file `src/term.js` is a standalone file that allows printing of colors in terminal and is used for visual tuning, should not be deleted. The file `src/crt.c` is the fixture `npm run screenshots` opens in the editor — it is what appears in every shipped screenshot, so its contents are load-bearing for the marketplace page. Don't delete that either. Neither is part of the build.

## Architecture

### Theme generation (`src/theme.ts` + `src/classification.ts` + `src/build-themes.ts`) — wired into `npm run build`
`theme.ts` defines a structured `ColorTokens` interface — solid ladder rungs (bgSunken/bgBase/bgRaised/bgWidget, fgPrimary→fgMuted, invertBg/Fg, selectionBg, borderSubtle/Focus), a small `alpha*` group used only where VS Code's renderer requires translucency (stacking editor decorations, scrollbar sliders, shadows), and two ramps (`ansi*`, `graphLane*`). `deriveTokens()` mixes all solids perceptually in OKLab.

**The ladder is five evenly spaced solids** — `bg` (0.00), `surface` (0.25), `fgl` (0.50), `fgm` (0.75), `fg` (1.00). The top three are the ink, and all three are legible as text, which is the constraint that fixes their placement. Standard editor text is full `fg` (`editor.foreground`), secondary text and most workbench body text is `fgm`, and de-emphasized text — comments, line numbers, inlay hints, disabled labels — is `fgl`. Syntax highlighting maps straight onto the same three rungs. The ladder is symmetric, so inverted variants are free — muted ink on an fg-colored surface is one step from bg toward fg, i.e. `fgl` again.

**`surface` is never text** — it is far too dark to read at 1.2–1.9:1 against bg. It exists for the surfaces that must be *opaque* and still separate from the editor: hover popups, the suggest widget, menus, section headers, code chips, sticky scroll, and the side panes of the centered/Zen layout (`editorPane.background`). Chrome's translucency is not an option there, because a popup cannot let the code underneath show through. `bgSunken` and `bgBase` stay on raw bg — bg is the end of the ladder, so "sunken" has nowhere to go; only `bgRaised`/`bgWidget` step up. The legacy pipeline used a 0.20 sRGB mix for exactly these keys, which is what 0.25 in OKLab reproduces.

**Chrome is translucent, and shares the 0.25 position with `surface`.** Borders, selection blocks, shadows and editor decorations sit *below* `fgl`, in units of the `CHROME` constant, so a widget and the border around it read as the same distance off the background. Translucency is not a workaround for the budget: these keys paint over arbitrary content — `editor.selectionBackground` is composited over syntax-colored text — so a solid value was always wrong for them. Solids are ink; alphas are surface treatment. Making a selection block solid at `fgl` was tried and reverted: primary text on it measures 1.5–3.4:1 across the palettes, worse than the comments it would be highlighting.

**Ramps are the one exception to the ladder: intensity encoding *identity* rather than emphasis.** Two subsystems have to tell N things apart with nothing but brightness — the sixteen terminal ANSI slots (`ansi*`) and the five branch lanes in the source control graph (`graphLane1..5`). Both are spread over `(fgl, fg]` so every step stays legible, with steps finer than the ladder's own resolution. ANSI orders the seven chromatic pairs by the perceived luminance of the real ANSI colors (blue darkest → white brightest) and puts each bright variant a half-step above its dark twin; `ansiBlack` is the exception and stays on bg, because programs use it as a *background* (`\e[40m`) where an ink value would paint solid blocks. Do not add ramps for anything else — the ladder is the design.

The many role names are kept anyway, and are what `classification.ts` speaks. They record *intent* — `fgSecondary` and `fgTertiary` mean different things while both resolving to `fgm` — and they mean the ladder can be re-expanded by editing `deriveTokens()` alone, without touching the ~880-key table. Do not collapse the roles down to the underlying rungs.

`alphaFor()` solves for the alpha that lands on a given mix fraction; it is not the fraction itself, because the renderer composites in gamma sRGB while the rungs come from OKLab. For saturated pairs the target is off the sRGB segment entirely, so it takes the least-squares projection — residual OKLab ΔE ≤ 0.025, worst case 0.054 on CRT Custom. `src/classification.ts` assigns every workbench color key (from `src/colorKeys.txt`, regenerated via `npm run extract-color-keys`) a `TokenName` role or `null` (deliberately unset); note that `null` and the `transparent` token are different things — an absent key falls back to VS Code's registered default, which for a few keys is a hardcoded grey with no relation to the palette (`editor.lineHighlightBorder` paints `#282828`), so "off" has to be said explicitly. The table is meant to be hand-tuned — the table is the source of truth, and `npm run sync-classification` updates it for new VS Code versions without losing hand-tuned roles. `build-themes.ts` reads `package.json#config.themes`, writes `themes/CRT-<Name>-color-theme.json` for every entry, and warns about any colorKeys.txt key missing from the classification.

### Runtime extension (`src/extension.ts`)
The extension exists for one command, **`crt-themes.modifyCustomTheme`**. It prompts for fg/bg (pre-filled with the current pair), calls `applyCustomTheme()` — which runs `generateTheme()` from `src/theme.ts` and writes the result under the `[CRT Custom]` scope of VS Code's global `workbench.colorCustomizations`, `editor.tokenColorCustomizations` and `editor.semanticTokenColorCustomizations` — then saves the colors and switches `workbench.colorTheme` to CRT Custom.

**Every write is user-initiated. There is deliberately no config-change listener.** An earlier design auto-applied when `crt-themes.foreground`/`background` changed, gated on a `crt-themes.dynamic` setting. It was removed rather than fixed: settings-driven writes of ~1100 lines meant unbounded races that all end in a mangled `settings.json`, which is not a defensible risk for a theme. Concretely, `cfg.update()` on the colors re-entered the listener, so the command raced up to three concurrent applies against itself — and one of them read a half-updated pair (new fg, old bg); overlapping applies interleaved across the three sections, leaving workbench chrome on one palette and syntax on another; a mid-apply failure had no rollback; and the read-modify-write of each whole section could drop a concurrent edit from another window or Settings Sync, breaking the promise that other themes' customizations are never touched. All of it disappears when the only writer is a command the user just ran. Editing the colors by hand now does nothing until the command is run, which their `package.json` descriptions say outright.

**The command is the only thing that creates the `[CRT Custom]` block.** An apply is ~1100 lines in the user's `settings.json`, so `modifyCustomTheme` shows a modal (`confirmFirstWrite()`) before the first write. Whether it has been accepted is derived from the settings — `needsFirstWriteWarning()` checks whether any of the three sections already holds a `[CRT Custom]` key — not from a stored flag: a flag would stay set after the user hand-deleted the block, silently re-adding 1100 lines, and would not travel with Settings Sync. Deleting the block therefore restores the warning, which is the point.

Three things harden the one write path, all aimed at never leaving a half-applied theme:

- **`dirtySettingsDocument()` pre-flight.** VS Code refuses to write while `settings.json` has unsaved changes ("Unable to write into user settings because the file has unsaved changes"), and that failure lands *between* section writes. It is checked after the prompts, not before, because only the state at the moment of writing matters; the user is offered *Save and continue*.
- **Widest write first.** `applyCustomTheme()` runs before the fg/bg and `workbench.colorTheme` updates, so a failure on the big block means the command touched nothing at all. Any error is reported with the note that re-running rewrites the whole block — a partial apply is self-healing on retry.
- **Idempotent sections.** Each section is skipped when the generated block already equals the stored one, so re-running while fine-tuning is cheap and Settings Sync is not handed three unchanged blocks.

The fg/bg colors are read and written through `inspect().globalValue` rather than `get()`, so a workspace-scoped color can never be baked into the user-level customizations. `applyCustomTheme()` stays UI-free so tests can call it directly; the `applying` re-entrancy guard lives in the command.

## Adding or modifying a theme

- **Static themes** (Amber, Green, etc.): add/update an entry in `package.json#config.themes`, add a corresponding entry in `contributes.themes`, then run `npm run build`.
- **Per-key visual fixes**: change that key's role in `src/classification.ts` (one-line edit), rebuild.
- **Ladder/derivation tuning**: edit `deriveTokens()` in `src/theme.ts` — mix fractions and alpha levels live there.
- **Syntax highlighting**: edit `mapTextMateRules` / `mapSemanticRules` in `src/theme.ts`.

## Tests

Tests live in `src/test/`. `extension.test.ts` covers the CRT Custom apply round-trip against the real global settings of the test instance — scoped writes, sibling keys surviving, the first-write warning tracking the block, and the idempotent skip — plus `normalizeHex` validation. Tests run inside a VS Code process via `@vscode/test-electron` — they cannot run headless without a display.

## CI and releasing

Two GitHub Actions workflows in `.github/workflows/`. They are excluded from the
packaged extension via `.vscodeignore`.

### `ci.yml` — feedback on every push

Triggers on `push` to `master`, on `pull_request`, and manually. The two event
triggers are scoped to cover disjoint sets deliberately: a branch with an open
PR would otherwise fire both on every push and run the whole suite twice. Work
in progress is covered by its pull request, `master` by push. The cost is that a
branch with no PR open gets no CI — `workflow_dispatch` is the escape hatch.

Note that `push` must always name branches explicitly; a bare `push:` also fires
on tags, which would run CI alongside `publish.yml` on every release.

Steps: `npm ci` → `npm test` (under `xvfb-run -a`) → `npm run package` → upload
the `.vsix` as an artifact. The repo is public, so standard-runner minutes are
free; the workflow is tuned for wall-clock feedback and low noise, not cost.

Three things there are non-obvious:

- **`concurrency` with `cancel-in-progress`** — pushing again supersedes the
  previous run on that branch. Theme tuning tends to produce bursts of pushes,
  and only the tip commit's result is interesting.
- **`.vscode-test` is deliberately not cached.** It looks like the obvious
  optimization, but measured on a real run the VS Code download is 323 MB in
  ~7s (the runners sit next to the Azure-hosted update service), while saving
  the cache costs ~5s and restoring it costs about as much. The whole job is
  ~45s; caching buys nothing and would pin the suite to a stale VS Code, when
  tracking current stable is exactly what a theme following new color keys
  wants.
- **No fast/slow job split.** It looks tempting, but `pretest` already runs
  `compile` and `lint` before `vscode-test` starts, so type and lint errors fail
  without ever fetching VS Code. A split would only duplicate `npm ci`.

### `publish.yml` — marketplace release

Triggers only on pushing a `v*` tag — there is deliberately no
`workflow_dispatch`, because a manual run has no tag to check the version
against. Runs the test suite, then `npx vsce publish`, authenticated with the
`VSCE_PAT` repo secret.

The marketplace has **no semver pre-release tags** — versions must be plain
`major.minor.patch`, and a given version can live on only one channel. The
channel is therefore carried by the version number itself, following the
convention VS Code documents:

- **odd minor → pre-release** (`--pre-release` flag), e.g. `0.9.x`
- **even minor → stable**, e.g. `1.0.0`

The `Determine channel` step derives the flag from that parity, so releasing
never depends on remembering a flag. `Check tag matches package.json` fails the
run when the git tag disagrees with the manifest version — publishing the wrong
version is unrecoverable, since marketplace versions are permanently consumed.

Tags are refs to commits, not to branches, so the workflow does not care which
branch a tag is on. But `vsce` rewrites relative README image links to
`https://github.com/<repo>/raw/HEAD/...`, and `HEAD` there means the repo's
**default branch** — so `media/*.png` must exist on master for the marketplace
page to render.

Release checklist: bump `package.json` (and the lockfile's two `version` fields),
date the `CHANGELOG.md` / `README.md` entries, merge to master, then
`git tag -s vX.Y.Z && git push --follow-tags`.

**Publishing is the user's to trigger, never autonomous.**

## Reference

The reference for VS Code colors lives here and should be consulted for UX guidelines and influence the theme generation (as much as possible, given the limitations of a 2-bit design system): https://code.visualstudio.com/api/references/theme-color
