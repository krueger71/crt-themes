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
```

There is no watch-and-reload dev server. To test theme changes in VS Code, run `npm run build` then install the extension from the generated `.vsix` or reload the Extension Development Host.

## The `necromancer` branch goal

The `necromancer` branch replaces the old legacy pipeline entirely. The old approach required heavy manual tuning because VS Code color properties were mapped ad-hoc via regex. The new approach **classifies** all VS Code color properties up front, then derives every concrete color value algorithmically from just two inputs — a foreground and a background.

Specific goals, in order:

1. **Classified color properties** — every VS Code workbench/TextMate/semantic key is assigned to a role (e.g. `fgPrimary`, `bgRaised`, `borderSubtle`) so that arbitrary `fg`/`bg` pairs always produce a coherent result without manual tweaking.
2. **Static themes** — replace the legacy-generated `themes/*.json` files for the existing palette variants (Amber, Green, Blue, etc.) using the new TypeScript pipeline.
3. **CRT Custom dynamic theme** — a user-facing VS Code command lets the user pick their own `fg`/`bg`. The theme is applied as color customizations written into the user's `settings.json` (not as a `.json` theme file). Before writing, the extension backs up any existing `workbench.colorCustomizations` / `editor.tokenColorCustomizations` / `editor.semanticTokenColorCustomizations` values so they can be fully restored on reset.
4. **Perceptually accurate mixing** — the opacity/mix levels in the 2-bit design system should be derived from luminance-based mixing grounded in color science (e.g. OKLCH or similar perceptually uniform space) rather than linear RGB interpolation, so the four "bit levels" feel evenly spaced to the human eye.

When the `necromancer` work is complete, `src/crt.js`, `src/build.js`, and the legacy `src/crt.c` / `src/term.js` scratch files can be deleted. Do not invest further effort in the legacy pipeline.

## Architecture: two parallel pipelines (transitional state)

The repo is mid-migration. Both pipelines currently exist:

### 1. Legacy pipeline (`src/crt.js` + `src/build.js`) — to be deleted
The `npm run build` script calls `node src/build.js <VariantName>` once per theme (Amber, Blue, Green, etc.). `build.js` reads theme config from `package.json#config.themes` and passes `fg`/`bg` colors to `crtTemplate()` in `crt.js`. `crtTemplate` derives a 16-level opacity ladder from the foreground color and maps every VS Code workbench color attribute via a regex-based `color_map()` function. Output goes to `themes/CRT-<Name>-color-theme.json`. The `themes/` directory is generated — do not hand-edit those files.

The `src/crt.c` and `src/term.js` files are reference/scratch — not part of the build and not worth updating.

### 2. New TypeScript pipeline (`src/theme.ts` + `src/build-themes.ts`) — the target
`theme.ts` defines a structured `ColorTokens` interface (bgBase, bgRaised, fgPrimary, fgSecondary, fgTertiary, fgMuted, invertBg/Fg, selectionBg, highlightBg, borderSubtle, borderFocus) derived by `deriveTokens()`. Color mapping is split into three explicit functions: `mapWorkbenchColors`, `mapTextMateRules`, `mapSemanticRules`. `build-themes.ts` uses `toThemeJson()` to write new theme files. This pipeline is not yet wired into `npm run build`.

### Runtime extension (`src/extension.ts`)
The extension activates to support the **CRT Custom** theme's dynamic mode. When `crt-themes.dynamicApplication` is true, changing `crt-themes.foreground` or `crt-themes.background` triggers `applyDynamicTheme()`, which calls `generateTheme()` from `src/theme.ts` and writes the result to VS Code's global `workbench.colorCustomizations`, `editor.tokenColorCustomizations`, and `editor.semanticTokenColorCustomizations`. The `resetCustomizations` command removes those keys. The new TypeScript pipeline is already powering the live dynamic feature.

Backup/restore of the user's pre-existing customizations before `applyDynamicTheme()` overwrites them is a planned but not-yet-implemented safety feature.

## Adding or modifying a theme

- **Static themes** (Amber, Green, etc.): once the new pipeline is wired in, add/update an entry in `package.json#config.themes`, add a corresponding entry in `contributes.themes`, then run `npm run build`.
- **Dynamic/Custom theme logic**: edit `src/theme.ts` (`mapWorkbenchColors`, `mapTextMateRules`, `mapSemanticRules`, or `deriveTokens`).

## Tests

Tests live in `src/test/`. `crt.test.ts` tests the legacy JS helpers (`rgbaStrToArray`, `rgbaArrayToStr`, `opaque`, `opaqueRgb`) by importing from `../crt`. `extension.test.ts` is a stub. Tests run inside a VS Code process via `@vscode/test-electron` — they cannot run headless without a display.
