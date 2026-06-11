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
3. **CRT Custom dynamic theme** — a user-facing VS Code command lets the user pick their own `fg`/`bg`. The theme is applied as color customizations written into the user's `settings.json` (not as a `.json` theme file). Before writing, the extension backs up any existing `workbench.colorCustomizations` / `editor.tokenColorCustomizations` / `editor.semanticTokenColorCustomizations` values so they can be fully restored on reset.
4. **Perceptually accurate mixing** — the opacity/mix levels in the 2-bit design system should be derived from luminance-based mixing grounded in color science (e.g. OKLCH or similar perceptually uniform space) rather than linear RGB interpolation, so the four "bit levels" feel evenly spaced to the human eye.

When the `necromancer` work is complete, `src/crt.js` and `src/build.js` files can be deleted. Do not invest further effort in the legacy pipeline. The file `src/term.js` is a file that allows printing of colors in terminal and is used for visual tuning, should not be deleted. The file `src/crt.c` is just a file that is used to create screenshots of the theme in various settings. Don't delete that either.

## Architecture: two parallel pipelines (transitional state)

The repo is mid-migration. Both pipelines currently exist:

### 1. Legacy pipeline (`src/crt.js` + `src/build.js`) — to be deleted
No longer invoked by any npm script. `build.js` reads theme config from `package.json#config.themes` and passes `fg`/`bg` colors to `crtTemplate()` in `crt.js`, which derives a 16-level opacity ladder and maps workbench color attributes via a regex-based `color_map()` function. Kept only until the migration is fully validated.

The `src/crt.c` and `src/term.js` files are references — not part of the build and not worth updating.

### 2. New TypeScript pipeline (`src/theme.ts` + `src/classification.ts` + `src/build-themes.ts`) — wired into `npm run build`
`theme.ts` defines a structured `ColorTokens` interface — solid ladder rungs (bgSunken/bgBase/bgRaised/bgWidget, fgPrimary→fgMuted, invertBg/Fg, selectionBg, borderSubtle/Focus) plus a small `alpha*` group used only where VS Code's renderer requires translucency (stacking editor decorations, scrollbar sliders, shadows). `deriveTokens()` mixes all solids perceptually in OKLab. `src/classification.ts` assigns every workbench color key (from `src/colorKeys.txt`, regenerated via `npm run extract-color-keys`) a `TokenName` role or `null` (deliberately unset); it is meant to be hand-tuned — the table is the source of truth, and `npm run sync-classification` updates it for new VS Code versions without losing hand-tuned roles. `build-themes.ts` reads `package.json#config.themes`, writes `themes/CRT-<Name>-color-theme.json` for every entry, and warns about any colorKeys.txt key missing from the classification.

### Runtime extension (`src/extension.ts`)
The extension activates to support the **CRT Custom** theme's dynamic mode. When `crt-themes.dynamicApplication` is true, changing `crt-themes.foreground` or `crt-themes.background` triggers `applyDynamicTheme()`, which calls `generateTheme()` from `src/theme.ts` and writes the result to VS Code's global `workbench.colorCustomizations`, `editor.tokenColorCustomizations`, and `editor.semanticTokenColorCustomizations`. The `resetCustomizations` command removes those keys. The new TypeScript pipeline is already powering the live dynamic feature.

Before the first overwrite, `applyDynamicTheme()` backs up any pre-existing `[CRT Custom]` blocks into `context.globalState`; `resetCustomizations` restores them (or removes the blocks if nothing pre-existed). All settings writes go through `inspect().globalValue` rather than `get()` so workspace-scoped values never leak into user settings. The `createCustomTheme` command prompts for fg/bg, saves them, applies the theme, and switches `workbench.colorTheme` to CRT Custom.

## Adding or modifying a theme

- **Static themes** (Amber, Green, etc.): add/update an entry in `package.json#config.themes`, add a corresponding entry in `contributes.themes`, then run `npm run build`.
- **Per-key visual fixes**: change that key's role in `src/classification.ts` (one-line edit), rebuild.
- **Ladder/derivation tuning**: edit `deriveTokens()` in `src/theme.ts` — mix fractions and alpha levels live there.
- **Syntax highlighting**: edit `mapTextMateRules` / `mapSemanticRules` in `src/theme.ts`.

## Tests

Tests live in `src/test/`. `crt.test.ts` tests the legacy JS helpers (`rgbaStrToArray`, `rgbaArrayToStr`, `opaque`, `opaqueRgb`) by importing from `../crt`. `extension.test.ts` covers the dynamic theme apply/backup/reset round-trip against the real global settings of the test instance, plus `normalizeHex` validation. Tests run inside a VS Code process via `@vscode/test-electron` — they cannot run headless without a display.
