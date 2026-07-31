import { workbenchClassification } from './classification';

export interface SourceColors {
    bg: string;
    fg: string;
}

// The derived 2-bit palette — all theme mapping works from this.
//
// The ladder is five evenly spaced solids — the background, a raised surface,
// and three text intensities:
//
//     bg ────── surface ── fgl ────── fgm ── fg
//     0.00       0.25     0.50       0.75   1.00
//
// The three top rungs are the ink, and all three are legible as text. Standard
// editor text is full fg (editor.foreground), secondary text is fgm, and
// de-emphasized text — comments, line numbers, inlay hints, disabled labels —
// is fgl.
//
// The surface rung is not ink; it is too dark to read as text and is only ever
// a background. It exists because some surfaces must be *opaque* and still
// separate from the editor — a hover popup cannot let code show through it —
// so chrome's translucency is not an option there. It sits at the same 0.25
// position as one unit of CHROME, which is why a widget and the border around
// it read as the same distance off the background.
//
// The ladder is symmetric, so it is read from whichever end a key's intent
// starts at: fgl is both "the faintest ink" and "one step up from the
// background". Inverted keys are free for the same reason — muted ink on an
// fg-colored surface is one step from bg toward fg, i.e. fgl again.
//
// The role names are kept as distinct entries even where they resolve to the
// same value: they are the vocabulary classification.ts speaks, and they
// record *intent* — fgSecondary and fgTertiary mean different things while
// both sitting on fgm. That also means the ladder can be re-expanded later by
// editing deriveTokens() alone, without touching the ~880-key table.
//
// Chrome is *not* one of the four. Borders, selection blocks and editor
// decorations are translucent and sit below fgl — partly because three text
// intensities exhaust the solid budget, but mainly because these keys paint
// over arbitrary content and were never solid colors to begin with. See the
// CHROME constant.
export interface ColorTokens {
    // Backgrounds. bg is the extreme of the ladder, so "sunken" cannot go any
    // lower — it stays on base, and only the raised pair steps up.
    bgSunken: string;   // below base — panels/terminal/title bar wells
    bgBase: string;     // bg @ 100% — the editor surface
    bgRaised: string;   // surface — headers, chips, hover fills, zen side panes
    bgWidget: string;   // surface — floating widgets, menus, dropdowns

    // The ink ladder — three legible text intensities.
    fgPrimary: string;   // fg  — standard editor text, keywords, emphasis
    fgSecondary: string; // fgm — the body-text workhorse
    fgTertiary: string;  // fgm
    fgMuted: string;     // fgl — comments, line numbers, hints, disabled

    // Inverted (badges, buttons, status bar)
    invertBg: string;
    invertFg: string;
    invertBgMuted: string; // inverted surface stepped one rung toward bg.
                           // Buttons rest here and light up to invertBg on
                           // hover; badges, which have to be seen rather than
                           // clicked, stay on invertBg throughout.

    // Chrome — translucent, below the ink ladder. Borders, dividers and
    // selection blocks read as the same faint level, which is what makes
    // elevation legible in a palette with no tinted surfaces. Keys classified
    // selectionBg pair with fgPrimary, which keeps full contrast against bg
    // because the block underneath is nearly transparent.
    selectionBg: string;
    selectionBgStrong: string; // two units — for a selection that has to hold
                               // its own next to a full-fg active border
    borderSubtle: string;
    borderFocus: string; // full fg — a focus ring is the one border that must
                         // never be missable

    // Translucent decorations, in units of CHROME
    alphaText: string;   // composites to fgm: readable as text, but not 100%
                         // opaque, for *foreground* keys VS Code requires
                         // translucent (e.g. chat diff line colors)
    alphaStrong: string; // one unit
    alphaMid: string;    // half a unit
    alphaFaint: string;  // quarter unit
    shadow: string;

    // Explicitly off, which is not the same as unset. An absent key falls back
    // to VS Code's own registered default, and a few of those are hardcoded
    // greys with no relation to the palette — editor.lineHighlightBorder
    // paints #282828 on every dark theme. null in the classification means "we
    // never set this"; this means "we set it to nothing".
    transparent: string;

    // Ramps — intensity used to encode *identity* rather than emphasis.
    //
    // A few subsystems have to tell N things apart and have nothing but
    // brightness to do it with: terminal ANSI colors, and the branch lanes in
    // the source control graph. These are the only places the theme uses a
    // value that is not a ladder rung, and they are deliberately spread over
    // the legible half of the range so that everything on a ramp still reads.
    ansiBlack: string;
    ansiRed: string;
    ansiGreen: string;
    ansiYellow: string;
    ansiBlue: string;
    ansiMagenta: string;
    ansiCyan: string;
    ansiWhite: string;
    ansiBrightBlack: string;
    ansiBrightRed: string;
    ansiBrightGreen: string;
    ansiBrightYellow: string;
    ansiBrightBlue: string;
    ansiBrightMagenta: string;
    ansiBrightCyan: string;
    ansiBrightWhite: string;

    graphLane1: string;
    graphLane2: string;
    graphLane3: string;
    graphLane4: string;
    graphLane5: string;
}

export type TokenName = keyof ColorTokens;

// What the generator produces for a complete theme
export interface GeneratedTheme {
    workbenchColors: Record<string, string>;
    textMateRules: TextMateRule[];
    semanticRules: Record<string, SemanticTokenRule>;
}

export interface TextMateRule {
    name?: string;
    scope: string | string[];
    settings: {
        foreground?: string;
        background?: string;
        fontStyle?: string;  // "bold", "italic", "underline", "" to reset
    };
}

export interface SemanticTokenRule {
    foreground?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

// ---------------------------------------------------------------------------
// Color math — sRGB <-> OKLab so mixing is perceptually uniform
//
// All blending happens in OKLab (Björn Ottosson, 2020,
// https://bottosson.github.io/posts/oklab/), a color space designed so that
// equal numeric steps look like equal visual steps. Naive blending in 8-bit
// sRGB fails at this twice: sRGB values are gamma-encoded (so averaging them
// doesn't even average physical light), and even physically-linear light
// doesn't match how the eye perceives lightness differences. OKLab fixes the
// first by converting through linear RGB, and the second with a cube-root
// response curve modeled on human vision. The payoff here: the ink ladder's
// 0.50/0.75/1.00 mix fractions land as evenly-spaced perceived intensities
// for any fg/bg pair the user picks.
// ---------------------------------------------------------------------------

/**
 * Validate a CSS-style hex color and expand it to lowercase #rrggbb.
 * Accepts #rgb and #rrggbb, with or without the leading '#'.
 */
export function normalizeHex(hex: string): string {
    const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
    if (!m) {
        throw new Error(`Invalid color "${hex}" — expected #rgb or #rrggbb`);
    }
    let h = m[1].toLowerCase();
    if (h.length === 3) {
        h = h.split('').map(c => c + c).join('');
    }
    return '#' + h;
}

/** Parse #rrggbb into its three 0–255 channel values. */
function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(normalizeHex(hex).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Format three channel values as #rrggbb. Values are rounded and clamped to
 * 0–255, which is also what clips out-of-gamut OKLab results back to sRGB.
 */
function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
        .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Decode one 0–255 sRGB channel to linear light in 0–1. This is the standard
 * sRGB transfer function (IEC 61966-2-1): a short linear segment near black,
 * then a 2.4-exponent power curve. Stored sRGB values are gamma-encoded, so
 * any physically meaningful math has to happen on this linear form.
 */
function srgbToLinear(c: number): number {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Inverse of srgbToLinear: encode linear light back to a 0–255 sRGB channel. */
function linearToSrgb(v: number): number {
    const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return c * 255;
}

// [L, a, b]: L = perceived lightness (0 black .. 1 white), a/b = the two
// opponent chroma axes (green–red / blue–yellow). For our monochrome mixes
// a and b mostly just carry the hue tint along while L does the work.
type OkLab = [number, number, number];

/**
 * sRGB hex -> OKLab. Two matrix steps with a cube root in between, using the
 * constants published in Ottosson's reference implementation: linear sRGB is
 * projected onto an LMS-like cone response, the cube root applies the
 * perceptual lightness curve, and the second matrix maps that to [L, a, b].
 */
function hexToOklab(hex: string): OkLab {
    const [r8, g8, b8] = hexToRgb(hex);
    const r = srgbToLinear(r8), g = srgbToLinear(g8), b = srgbToLinear(b8);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
}

/**
 * OKLab -> sRGB hex: the inverse matrices, with cubing undoing the cube
 * root. Results outside the sRGB gamut are clamped per channel in rgbToHex.
 */
function oklabToHex([L, a, b]: OkLab): string {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return rgbToHex(
        linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
    );
}

/**
 * Step a color down in perceptual lightness by dL (OKLab L units, where the
 * whole black-to-white range is 1.0), keeping its hue/chroma. Clamps at the
 * gamut edge (a pure-black bg stays black).
 */
export function darken(hex: string, dL: number): string {
    const [L, a, b] = hexToOklab(hex);
    return oklabToHex([Math.max(0, L - dL), a, b]);
}

/**
 * Perceptual mix: straight-line interpolation between the two colors in
 * OKLab, so t=0.5 looks halfway between them rather than being a numeric
 * average of gamma-encoded bytes. t may extrapolate outside [0,1] (result
 * clamped to gamut). This is what makes the ladder fractions in
 * deriveTokens() hold visually for any user-picked fg/bg pair.
 */
export function mix(hex1: string, hex2: string, t: number): string {
    const a = hexToOklab(hex1);
    const b = hexToOklab(hex2);
    return oklabToHex([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ]);
}

/**
 * Append an alpha channel (0–1) to a hex color, producing #rrggbbaa. Unlike
 * mix(), the final color is composited by VS Code's renderer at draw time,
 * so these stack — which is exactly why the alpha* tokens exist.
 */
export function withAlpha(hex: string, alpha: number): string {
    return normalizeHex(hex) + Math.round(alpha * 255).toString(16).padStart(2, '0');
}

/**
 * Find the alpha that makes `fg` over `bg` land on the ladder rung at mix
 * fraction `f` — i.e. the translucent equivalent of mix(bg, fg, f).
 *
 * The two are not the same number. mix() interpolates in OKLab, while VS
 * Code's renderer composites the way every compositor does: a straight
 * per-channel lerp of the gamma-encoded sRGB bytes. So the alpha has to be
 * solved for rather than copied from f.
 *
 * The rung is generally not *on* the sRGB segment between bg and fg (OKLab
 * bows away from it — a mix of amber and near-black gains blue that neither
 * endpoint has), so there is no exact answer. This takes the least-squares
 * projection onto the segment, which is the closest a single alpha can get.
 */
export function alphaFor(bg: string, fg: string, f: number): number {
    const b = hexToRgb(bg);
    const g = hexToRgb(fg);
    const t = hexToRgb(mix(bg, fg, f));
    let num = 0, den = 0;
    for (let c = 0; c < 3; c++) {
        const d = g[c] - b[c];
        num += d * (t[c] - b[c]);
        den += d * d;
    }
    // fg === bg: no segment to project onto, and no contrast to recover.
    if (den === 0) { return f; }
    return Math.max(0, Math.min(1, num / den));
}

// ---------------------------------------------------------------------------
// Token derivation — the single place where the 2-bit ladder is tuned
// ---------------------------------------------------------------------------

/**
 * The ink ladder: three text intensities, as mix fractions from bg toward fg.
 * The steps are a uniform 0.25 apart, so the levels are evenly spaced in
 * perceived lightness — this is where goal 4's "evenly spaced bit levels"
 * actually applies. CHROME continues the same spacing one step below fgl,
 * which is what makes "one level lower" a well-defined move for a key that
 * has run out of ink rungs (see editorLineNumber.foreground).
 *
 *     bg ────── surface ── fgl ────── fgm ── fg
 *     0.00       0.25     0.50       0.75   1.00
 *
 * All three are legible as text; that is the point of the ladder and the
 * constraint that fixes RUNG_FGL. Below about 0.45 comments stop reading on
 * the low-contrast palettes, and above about 0.60 the three levels stop being
 * distinguishable from each other.
 *
 * OKLab is what makes the spacing hold: it guarantees the chosen fractions
 * look the same for any fg/bg pair the user picks.
 */
const RUNG_SURFACE = 0.25; // opaque raised surfaces — never text
const RUNG_FGL = 0.50;  // de-emphasized: comments, line numbers, hints, disabled
const RUNG_FGM = 0.75;  // secondary: strings, types, variables, workbench body

/**
 * Chrome sits *below* the ink ladder, and is translucent rather than solid.
 * It shares the 0.25 position with RUNG_SURFACE — the same step off the
 * background, drawn with alpha instead of a fill.
 *
 * Chrome cannot share a rung with the ink: once fgl is
 * bright enough to read as a comment it is far too bright to be a block you
 * draw text on top of (fgPrimary on an fgl block measures 1.5–3.4:1 across
 * the shipped palettes — worse than the comments it would be highlighting).
 *
 * Translucency is the right answer here rather than a workaround for the
 * budget. These keys paint over arbitrary content — editor.selectionBackground
 * is composited over syntax-colored text — so a solid value was always wrong
 * for them. Solids are ink; alphas are surface treatment.
 */
const CHROME = 0.25;    // one "unit" of chrome, as a bg->fg mix fraction

/**
 * Derive the full ColorTokens palette from the user's two source colors.
 * All mix fractions and alpha levels live here and nowhere else.
 *
 * Five solid values come out — bg, surface, fgl, fgm, fg. Most backgrounds are
 * the raw bg (flat retro; depth is mostly drawn with borders rather than with
 * tinted fills); surface is reserved for the things that have to be opaque and
 * separate. The top three are the ink ladder: every text role lands on one of
 * them, with full fg for standard editor text, keywords and emphasis. Chrome
 * does not get a solid value at all — see CHROME.
 */
export function deriveTokens(src: SourceColors): ColorTokens {
    const bg = normalizeHex(src.bg);
    const fg = normalizeHex(src.fg);

    const surface = mix(bg, fg, RUNG_SURFACE);
    const fgl = mix(bg, fg, RUNG_FGL);
    const fgm = mix(bg, fg, RUNG_FGM);

    // Chrome and decorations, in units of CHROME. Keeping them on a shared
    // scale means stacked decorations accumulate in steps rather than
    // drifting to arbitrary in-between values: two stacked half-units land on
    // one full unit, a half over a full lands on one and a half.
    //
    // "Land on" is approximate for saturated pairs, since no single alpha can
    // reach an off-segment target (see alphaFor). Measured across the shipped
    // palettes the residual is OKLab dE <= 0.025 — well under one step, and
    // mostly chroma rather than lightness. CRT Custom, yellow on blue and so
    // the furthest hue travel, is the worst case at 0.054.
    const chrome = (units: number) => withAlpha(fg, alphaFor(bg, fg, CHROME * units));

    // Ramps. Both live in (fgl, fg] so that every step stays legible; only the
    // spacing differs, because the two ramps carry a different number of
    // things. Steps this fine are below the ladder's resolution on purpose —
    // the point is to tell lanes and ANSI slots apart, not to rank them.
    const ramp = (i: number, n: number) => mix(bg, fg, RUNG_FGL + (i / n) * (1 - RUNG_FGL));

    // ANSI has sixteen slots and no hue to spend, so hue becomes intensity.
    // The seven chromatic pairs are ordered by the perceived luminance of the
    // real ANSI colors (blue darkest, white brightest), and each bright variant
    // is one half-step above its dark twin — enough to tell "\e[31m" from
    // "\e[91m" without either becoming unreadable. Black is the exception: it
    // stays on bg because programs use it as a *background* (\e[40m), where a
    // visible ink value would paint solid blocks across the terminal.
    const ansi = (rank: number, bright: 0 | 1) => ramp(2 * rank + bright + 1, 14);

    return {
        bgSunken: bg,
        bgBase: bg,
        bgRaised: surface,
        bgWidget: surface,

        // The ink ladder. fgSecondary and fgTertiary share fgm: the roles stay
        // distinct in classification.ts as a record of intent, but three text
        // levels is the budget, and comments have the stronger claim on fgl.
        fgPrimary: fg,
        fgSecondary: fgm,
        fgTertiary: fgm,
        fgMuted: fgl,

        invertBg: fg,
        invertFg: bg,
        invertBgMuted: fgm,

        // Translucent, so text drawn over these keeps its full contrast
        // against bg instead of fighting a bright block.
        selectionBg: chrome(1),
        selectionBgStrong: chrome(2),
        borderSubtle: chrome(1),
        borderFocus: fg,

        alphaText: withAlpha(fg, alphaFor(bg, fg, RUNG_FGM)),
        alphaStrong: chrome(1),
        alphaMid: chrome(0.5),
        alphaFaint: chrome(0.25),
        shadow: chrome(1),

        transparent: '#00000000',

        ansiBlack: bg,
        ansiBrightBlack: fgl,
        ansiBlue: ansi(0, 0),
        ansiBrightBlue: ansi(0, 1),
        ansiRed: ansi(1, 0),
        ansiBrightRed: ansi(1, 1),
        ansiMagenta: ansi(2, 0),
        ansiBrightMagenta: ansi(2, 1),
        ansiGreen: ansi(3, 0),
        ansiBrightGreen: ansi(3, 1),
        ansiCyan: ansi(4, 0),
        ansiBrightCyan: ansi(4, 1),
        ansiYellow: ansi(5, 0),
        ansiBrightYellow: ansi(5, 1),
        ansiWhite: ansi(6, 0),
        ansiBrightWhite: ansi(6, 1),

        // Five lanes, so the steps are wide enough to follow a branch line
        // across the graph. Lanes 1 and 5 land on fgl+0.1 and fg.
        graphLane1: ramp(1, 5),
        graphLane2: ramp(2, 5),
        graphLane3: ramp(3, 5),
        graphLane4: ramp(4, 5),
        graphLane5: ramp(5, 5),
    };
}

/**
 * Generate everything a theme needs (workbench colors, TextMate rules,
 * semantic token rules) from a fg/bg pair. Used by both the static theme
 * builder and the dynamic CRT Custom feature in extension.ts.
 */
export function generateTheme(src: SourceColors): GeneratedTheme {
    const tokens = deriveTokens(src);
    return {
        workbenchColors: mapWorkbenchColors(tokens),
        textMateRules: mapTextMateRules(tokens),
        semanticRules: mapSemanticRules(tokens),
    };
}

/**
 * Serialize a generated theme to the object shape VS Code expects in a
 * *-color-theme.json file. `uiTheme` is the value from the theme's
 * package.json contribution and decides the light/dark type flag.
 */
export function toThemeJson(name: string, uiTheme: 'vs' | 'vs-dark' | 'hc-black', src: SourceColors) {
    const { workbenchColors, textMateRules, semanticRules } = generateTheme(src);
    return {
        name,
        type: uiTheme === 'vs' ? 'light' : 'dark',
        semanticHighlighting: true,
        colors: workbenchColors,
        tokenColors: textMateRules,
        semanticTokenColors: semanticRules,
    };
}

/**
 * Resolve the full classification table against a derived palette: every
 * workbench key gets the concrete value of its assigned role. Keys
 * classified as null are deliberately left unset so VS Code falls back to
 * its own defaults/derived values.
 */
export function mapWorkbenchColors(t: ColorTokens): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, role] of Object.entries(workbenchClassification)) {
        if (role === null) { continue; }
        out[key] = t[role];
    }
    return out;
}

/**
 * Semantic-token highlighting (used when a language server provides tokens;
 * takes precedence over the TextMate rules below). Kept deliberately coarse,
 * and mapped straight onto the three ink rungs: keywords, functions and
 * operators at full fg; strings, types and variables at fgm; comments,
 * decorators and punctuation at fgl. Bold and italic carry what intensity
 * alone cannot.
 *
 * That is not a limitation worked around but the behaviour of the hardware
 * being imitated: a monochrome terminal separated tokens with intensity plus
 * attributes, never with hue.
 */
export function mapSemanticRules(t: ColorTokens): Record<string, SemanticTokenRule> {
    return {
        'comment': { foreground: t.fgMuted, italic: true },
        'keyword': { foreground: t.fgPrimary, bold: true },
        'string': { foreground: t.fgSecondary },
        'number': { foreground: t.fgSecondary },
        'operator': { foreground: t.fgPrimary },
        'type': { foreground: t.fgSecondary },
        'class': { foreground: t.fgSecondary },
        'interface': { foreground: t.fgSecondary },
        'enum': { foreground: t.fgSecondary },
        'enumMember': { foreground: t.fgTertiary },
        'function': { foreground: t.fgPrimary },
        'method': { foreground: t.fgPrimary },
        'property': { foreground: t.fgTertiary },
        'variable': { foreground: t.fgTertiary },
        'variable.readonly': { foreground: t.fgTertiary, italic: true },
        'parameter': { foreground: t.fgTertiary, italic: true },
        'namespace': { foreground: t.fgSecondary },
        'decorator': { foreground: t.fgMuted, italic: true },
    };
}

/**
 * TextMate-scope highlighting — the grammar-based fallback that covers
 * languages (and the many cases) where no semantic tokens are available.
 * Mirrors the three-rung intensity scheme of mapSemanticRules.
 */
export function mapTextMateRules(t: ColorTokens): TextMateRule[] {
    return [
        {
            name: 'Comment',
            scope: ['comment', 'punctuation.definition.comment'],
            settings: { foreground: t.fgMuted, fontStyle: 'italic' },
        },
        {
            name: 'Keyword',
            scope: ['keyword', 'keyword.control', 'storage.type', 'storage.modifier'],
            settings: { foreground: t.fgPrimary, fontStyle: 'bold' },
        },
        {
            name: 'String',
            scope: ['string', 'string.quoted'],
            settings: { foreground: t.fgSecondary },
        },
        {
            name: 'Number / Constant',
            scope: ['constant.numeric', 'constant.language', 'constant.character'],
            settings: { foreground: t.fgSecondary },
        },
        {
            name: 'Type / Class',
            scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'],
            settings: { foreground: t.fgSecondary },
        },
        {
            name: 'Function',
            scope: ['entity.name.function', 'support.function'],
            settings: { foreground: t.fgPrimary },
        },
        {
            name: 'Variable',
            scope: ['variable', 'variable.other'],
            settings: { foreground: t.fgTertiary },
        },
        {
            name: 'Parameter',
            scope: ['variable.parameter'],
            settings: { foreground: t.fgTertiary, fontStyle: 'italic' },
        },
        {
            name: 'Punctuation',
            scope: ['punctuation', 'meta.brace'],
            settings: { foreground: t.fgMuted },
        },
        {
            name: 'Operator',
            scope: ['keyword.operator'],
            settings: { foreground: t.fgPrimary },
        },
        {
            name: 'Tag',
            scope: ['entity.name.tag', 'meta.tag'],
            settings: { foreground: t.fgPrimary },
        },
        {
            name: 'Attribute',
            scope: ['entity.other.attribute-name'],
            settings: { foreground: t.fgSecondary },
        },
    ];
}
