import { workbenchClassification } from './classification';

export interface SourceColors {
    bg: string;
    fg: string;
}

// The derived 2-bit palette — all theme mapping works from this.
// Everything is a solid color except the `alpha*` group, which exists only
// for the handful of VS Code keys that must be translucent because the
// renderer stacks them (editor decorations, scrollbar sliders, shadows).
export interface ColorTokens {
    // Backgrounds. In the flat retro look every surface is the raw bg;
    // the four names are kept as distinct classification roles so the
    // ladder can be re-expanded later by editing deriveTokens() alone.
    bgSunken: string;   // below base — panels/terminal/title bar wells
    bgBase: string;     // bg @ 100% — the editor surface
    bgRaised: string;   // sidebars, hover, line highlight
    bgWidget: string;   // floating widgets, menus, dropdowns

    // Foregrounds (fg side of the ladder)
    fgPrimary: string;   // fg @ 100%
    fgSecondary: string; // one rung down
    fgTertiary: string;  // two rungs down
    fgMuted: string;     // faintest readable rung

    // Inverted (badges, buttons, status bar)
    invertBg: string;
    invertFg: string;

    // Solid highlight block for selections and hover highlights — the least
    // intense fg rung. Keys classified selectionBg should pair their
    // foreground with fgPrimary so text keeps contrast against the block.
    selectionBg: string;
    borderSubtle: string;
    borderFocus: string;

    // Translucent — only for keys VS Code composites over other decorations
    alphaText: string;   // near-opaque fg: readable as text, but not 100%
                         // opaque, for *foreground* keys VS Code requires
                         // translucent (e.g. chat diff line colors)
    alphaStrong: string;
    alphaMid: string;
    alphaFaint: string;
    shadow: string;
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
// response curve modeled on human vision. The payoff here: the fg ladder's
// 0.25/0.50/0.70 mix fractions land as evenly-spaced perceived intensities
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

// ---------------------------------------------------------------------------
// Token derivation — the single place where the 2-bit ladder is tuned
// ---------------------------------------------------------------------------

/**
 * Derive the full ColorTokens palette from the user's two source colors.
 * All mix fractions and alpha levels live here and nowhere else:
 *
 * - fg ladder: perceptual mixes toward bg at 0 / 0.25 / 0.50 / 0.70 — the
 *   four "bit levels" of the design system.
 * - backgrounds: every surface is the raw bg (flat retro); depth is drawn
 *   with borders instead of tinted fills.
 * - selectionBg: the faintest fg rung reused as a solid highlight block.
 * - alpha*: translucent fg at three strengths, for keys VS Code composites
 *   over other content (decorations, scrollbar sliders).
 */
export function deriveTokens(src: SourceColors): ColorTokens {
    const bg = normalizeHex(src.bg);
    const fg = normalizeHex(src.fg);
    return {
        // Flat retro: there is exactly one surface color — the raw bg.
        // Elevation and grouping are expressed with borders, never with
        // tinted background mixes.
        bgSunken: bg,
        bgBase: bg,
        bgRaised: bg,
        bgWidget: bg,

        fgPrimary: fg,
        fgSecondary: mix(fg, bg, 0.25),
        fgTertiary: mix(fg, bg, 0.50),
        fgMuted: mix(fg, bg, 0.75),

        invertBg: fg,
        invertFg: bg,

        // = fgMuted: the faintest fg rung doubles as the highlight block,
        // leaving fgPrimary text 0.70 of the full fg/bg contrast
        selectionBg: withAlpha(fg, 0.50), //mix(fg, bg, 0.75),
        borderSubtle: mix(bg, fg, 0.25),
        borderFocus: mix(bg, fg, 0.75),

        alphaText: withAlpha(fg, 0.90),
        alphaStrong: withAlpha(fg, 0.33),
        alphaMid: withAlpha(fg, 0.16),
        alphaFaint: withAlpha(fg, 0.07),
        shadow: '#00000066',
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
 * takes precedence over the TextMate rules below). Kept deliberately coarse:
 * keywords/functions at full intensity, types and literals one rung down,
 * variables two rungs down, comments at the faintest rung — syntax "color"
 * is expressed as intensity plus bold/italic, like a real terminal.
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
 * Mirrors the intensity scheme of mapSemanticRules.
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
