# Change Log

## [1.0.0] - 2026-06-12

Complete rewrite of the theme generation — the first release in six years. The
look of every theme changes with this update.

- Every VS Code workbench color key is now classified into a small set of
  design-system roles, and all concrete values are derived from just two
  colors (foreground and background). Any color pair produces a coherent,
  fully themed workbench — no per-theme hand tuning.
- Perceptual color mixing in OKLab: the foreground intensity levels are
  evenly spaced to the human eye regardless of palette.
- Flatter, more retro look: a single background surface everywhere, with
  depth drawn by borders instead of tinted fills. Selections and hover
  highlights are solid blocks of the lowest foreground intensity; the status
  bar, badges and buttons render in full reverse video.
- New **CRT Custom** dynamic theme: pick your own foreground/background with
  the *CRT Themes: Create custom theme* command, or edit the
  `crt-themes.foreground` / `crt-themes.background` settings with
  `crt-themes.dynamicApplication` enabled to restyle the workbench live.
- Safe by default: before CRT Custom writes any color customizations to your
  settings, existing values are backed up. *CRT Themes: Reset Custom
  Overrides* restores them exactly.
- Fixed the red theme file name issue.

## [0.5.2] - 2020-06-27

- More work on consistency.
- No borders on current line highlight.
- Improved red theme.

## [0.5.1] - 2020-03-07

- Improved legibility in the terminal.
- Improved consistency in use of color levels.

## [0.5.0] - 2020-03-02

- Initial release with a few basic themes.
