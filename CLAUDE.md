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
3. **CRT Custom dynamic theme** — a user-facing VS Code command lets the user pick their own `fg`/`bg`. The theme is applied as color customizations written into the user's `settings.json` (not as a `.json` theme file). There is no backup/restore step: every write is nested under a `[CRT Custom]` theme scope inside `workbench.colorCustomizations` / `editor.tokenColorCustomizations` / `editor.semanticTokenColorCustomizations` and merged over the existing global value, so customizations belonging to other themes are never touched and removing the block by hand is a complete undo.
4. **Perceptually accurate mixing** — the opacity/mix levels in the 2-bit design system should be derived from luminance-based mixing grounded in color science (e.g. OKLCH or similar perceptually uniform space) rather than linear RGB interpolation, so the four "bit levels" feel evenly spaced to the human eye.

The legacy JS pipeline (`src/crt.js` + `src/build.js`) has been deleted. The file `src/term.js` is a standalone file that allows printing of colors in terminal and is used for visual tuning, should not be deleted. The file `src/crt.c` is just a file that is used to create screenshots of the theme in various settings. Don't delete that either. Neither is part of the build.

## Architecture

### Theme generation (`src/theme.ts` + `src/classification.ts` + `src/build-themes.ts`) — wired into `npm run build`
`theme.ts` defines a structured `ColorTokens` interface — solid ladder rungs (bgSunken/bgBase/bgRaised/bgWidget, fgPrimary→fgMuted, invertBg/Fg, selectionBg, borderSubtle/Focus) plus a small `alpha*` group used only where VS Code's renderer requires translucency (stacking editor decorations, scrollbar sliders, shadows). `deriveTokens()` mixes all solids perceptually in OKLab. `src/classification.ts` assigns every workbench color key (from `src/colorKeys.txt`, regenerated via `npm run extract-color-keys`) a `TokenName` role or `null` (deliberately unset); it is meant to be hand-tuned — the table is the source of truth, and `npm run sync-classification` updates it for new VS Code versions without losing hand-tuned roles. `build-themes.ts` reads `package.json#config.themes`, writes `themes/CRT-<Name>-color-theme.json` for every entry, and warns about any colorKeys.txt key missing from the classification.

### Runtime extension (`src/extension.ts`)
The extension activates to support the **CRT Custom** theme's dynamic mode. When `crt-themes.dynamic` is true, changing `crt-themes.foreground`, `crt-themes.background` or `crt-themes.dynamic` itself triggers `applyCustomTheme()`, which calls `generateTheme()` from `src/theme.ts` and writes the result under the `[CRT Custom]` scope of VS Code's global `workbench.colorCustomizations`, `editor.tokenColorCustomizations`, and `editor.semanticTokenColorCustomizations`.

All settings writes go through `inspect().globalValue` rather than `get()` so workspace-scoped values never leak into user settings. The `modifyCustomTheme` command prompts for fg/bg, saves them, applies the theme, and switches `workbench.colorTheme` to CRT Custom.

## Adding or modifying a theme

- **Static themes** (Amber, Green, etc.): add/update an entry in `package.json#config.themes`, add a corresponding entry in `contributes.themes`, then run `npm run build`.
- **Per-key visual fixes**: change that key's role in `src/classification.ts` (one-line edit), rebuild.
- **Ladder/derivation tuning**: edit `deriveTokens()` in `src/theme.ts` — mix fractions and alpha levels live there.
- **Syntax highlighting**: edit `mapTextMateRules` / `mapSemanticRules` in `src/theme.ts`.

## Tests

Tests live in `src/test/`. `extension.test.ts` covers the dynamic theme apply round-trip against the real global settings of the test instance, plus `normalizeHex` validation. Tests run inside a VS Code process via `@vscode/test-electron` — they cannot run headless without a display.

## CI and releasing

Two GitHub Actions workflows in `.github/workflows/`. They are excluded from the
packaged extension via `.vscodeignore`.

### `ci.yml` — feedback on every push

Triggers on `push` to any branch, on `pull_request`, and manually. The `push`
trigger is deliberately written as `branches: ['**']` rather than a bare `push:` —
a bare trigger also fires on tags, which would run CI a second time alongside
`publish.yml` on every release.

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
