# CRT Themes

Retro-style themes with a monochrome flavor.

***Full workbench theming.***

![The same editor cycling through every palette](media/cycle.gif)

## Features

CRT Themes tries to capture some of the old-school visuals of cathode ray
tube-era computing monitors. Each theme is built from just **two colors** — a
foreground and a background — and everything else is derived from that pair
by a 2-bit design system.

The mixing math runs in the perceptually uniform OKLab color space, so the
intensity steps should look evenly spaced to the human eye no matter which two
colors a theme starts from.

## Included themes

![All eight palettes, same editor](media/montage.png)

Each name links to a full-size screenshot.

| Theme      | Foreground | Background | Style |
| ---------- | ---------- | ---------- | ----- |
| [CRT Green](media/green.png)   | `#33ff00`  | `#111111`  | Classic green phosphor |
| [CRT Amber](media/amber.png)   | `#ffb000`  | `#111111`  | Amber phosphor |
| [CRT Gray](media/gray.png)     | `#bbbbbb`  | `#111111`  | White/gray phosphor |
| [CRT Blue](media/blue.png)     | `#0099ff`  | `#111111`  | Blue phosphor |
| [CRT Red](media/red.png)       | `#ff2222`  | `#111111`  | Red phosphor |
| [CRT 64](media/64.png)         | `#6c5eb5`  | `#352879`  | Home-computer blue |
| [CRT Paper](media/paper.png)   | `#0f0f0f`  | `#f0f0f0`  | Light, ink on paper |
| [CRT Custom](media/custom.png) | your choice | your choice | See below |

## CRT Custom — your own two colors

The **CRT Custom** theme is generated from colors you pick:

1. Run *CRT Themes: Modify custom theme* from the command palette.
2. Enter a foreground and a background color (`#rgb` or `#rrggbb`).
3. The full theme is generated and applied immediately.

Alternatively, edit the color settings directly — the workbench restyles live as you change them.

Your custom colors are applied as color customizations in your user
`settings.json` (scoped to the CRT Custom theme). Avoid doing further manual changes here since they will be overwritten when the two base colors change. Rather use the built-in function *Developer: Generate Color Theme From Current Settings* and take it from there.

### Settings

- `crt-themes.foreground`: CRT Custom foreground color.
- `crt-themes.background`: CRT Custom background color.
- `crt-themes.dynamic`: apply the CRT Custom colors to your
  settings automatically whenever they change (default true).

### Commands

- *CRT Themes: Modify custom theme* — prompt for the two colors, generate
  and switch to CRT Custom.

## Known Issues

The amount of color attributes to customize in Visual Studio Code is huge.
Please report any mistakes in the theming system or improvement suggestions,
thx!

## Release Notes

### [0.9.0] - Unreleased

Complete rewrite of the theme generation — the first release in six years.
The look of every theme changes with this update. Published on the pre-release
channel ahead of 1.0.0 — 0.5.2 remains stable in the meantime.

- All workbench color keys classified into design-system roles; every value
  derived from just a foreground/background pair.
- Perceptual mixing in OKLab for evenly spaced intensity levels.
- Flatter, more retro look: one background surface, border-drawn depth,
  muted-block selections, reverse-video status bar and buttons.
- New CRT Custom dynamic theme with live application.
- Fixed the red theme file name issue.

### [0.5.2] - 2020-06-27

- More work on consistency.
- No borders on current line highlight.
- Improved red theme.

### [0.5.1] - 2020-03-07

- Improved legibility in the terminal.
- Improved consistency in use of color levels.

### [0.5.0] - 2020-03-02

- Initial release with a few basic themes.
