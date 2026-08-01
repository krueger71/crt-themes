# Change Log

## [0.9.0] - Unreleased

Complete rewrite of the theme generation — the first release in six years. The
look of every theme changes with this update.

Published on the pre-release channel ahead of the 1.0.0 stable release. Version
0.5.2 remains stable in the meantime; use *Switch to Pre-Release Version* on the
extension page to try this one, and *Install Another Version* to go back.

- Every VS Code workbench color key is now classified into a small set of
  design-system roles, and all concrete values are derived from just two
  colors (foreground and background). Any color pair produces a coherent,
  fully themed workbench — no per-theme hand tuning.
- Perceptual color mixing in OKLab: the foreground intensity levels are
  evenly spaced to the human eye regardless of palette.
- Flatter, more retro look: the editor, sidebars and panels all share one
  background, with a single raised surface for the things that have to be
  opaque and separate — popups, menus, the suggest widget and the side panes
  of the centred layout. Selections, borders and editor decorations are
  translucent instead, so text keeps its contrast over them. Badges render in
  reverse video; the status bar and buttons sit one intensity below it and
  brighten on hover.
- The sixteen terminal ANSI colors are spread across the legible intensity
  range rather than collapsed onto two levels: the seven chromatic pairs are
  ordered by the perceived brightness of the real ANSI colors, with each
  bright variant a half-step above its dark twin. The branch lanes in the
  source control graph get the same treatment.
- New **CRT Custom** theme: pick your own foreground/background with the
  *CRT Themes: Modify custom theme* command. Re-running it is pre-filled with
  your current pair, so fine-tuning is quick. Because it writes about 1100
  lines into your `settings.json`, it asks for confirmation the first time —
  and only until the block exists, so changing colors afterwards is never
  interrupted. The colors are applied only by the command; editing the
  `crt-themes.foreground` / `crt-themes.background` settings by hand takes
  effect the next time you run it.
- Checking every classified key against VS Code's own defaults turned up a
  number of places where something was being drawn in the background color
  and was therefore invisible: indentation and bracket guides, every mark on
  the overview ruler, terminal command decorations, toggled toolbar buttons,
  test coverage highlighting, and the branch badges in the source control
  graph, which had the same color for the label and the chip behind it. List
  hover, focus and selection are now three distinct levels instead of one,
  and the three regions of a merge conflict can be told apart.
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
