export interface SourceColors {
    bg: string;
    fg: string;
}

// The derived 2-bit palette — all theme mapping works from this
export interface ColorTokens {
    // Backgrounds
    bgBase: string;  // bg @ 100%
    bgRaised: string;  // bg mixed slightly toward fg
    bgSunken: string;  // bg mixed slightly away from fg
    bgOverlay: string;  // bgBase + transparency

    // Foregrounds
    fgPrimary: string;  // fg @ 100%
    fgSecondary: string;  // fg @ ~70%
    fgTertiary: string;  // fg @ ~45%
    fgMuted: string;  // fg @ ~20%

    // Inverted (for badges, active tab highlights etc)
    invertBg: string;
    invertFg: string;

    // Transparent variants
    selectionBg: string;  // fgPrimary + low alpha (selection)
    highlightBg: string;  // fgPrimary + very low alpha (word highlight)
    borderSubtle: string;  // fgMuted + alpha
    borderFocus: string;  // fgPrimary + alpha
}

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

// Naive implementation — just hex alpha suffixes and simple mixing
// Replace with chroma-js later for perceptual accuracy

function mix(hex1: string, hex2: string, t: number): string {
    const a = hexToRgb(hex1);
    const b = hexToRgb(hex2);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return rgbToHex(r, g, bl);
}

function withAlpha(hex: string, alpha: number): string {
    return hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
}

function hexToRgb(hex: string) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function deriveTokens(src: SourceColors): ColorTokens {
    const { bg, fg } = src;
    return {
        bgBase: bg,
        bgRaised: mix(bg, fg, 0.05),
        bgSunken: mix(bg, fg, 0.02),
        bgOverlay: withAlpha(bg, 0.9),

        fgPrimary: fg,
        fgSecondary: mix(fg, bg, 0.30),
        fgTertiary: mix(fg, bg, 0.55),
        fgMuted: mix(fg, bg, 0.75),

        invertBg: fg,
        invertFg: bg,

        selectionBg: withAlpha(fg, 0.20),
        highlightBg: withAlpha(fg, 0.08),
        borderSubtle: withAlpha(fg, 0.15),
        borderFocus: withAlpha(fg, 0.60),
    };
}

export function generateTheme(src: SourceColors): GeneratedTheme {
    const tokens = deriveTokens(src);
    return {
        workbenchColors: mapWorkbenchColors(tokens),
        textMateRules: mapTextMateRules(tokens),
        semanticRules: mapSemanticRules(tokens),
    };
}

// Serialize to the .json format VS Code expects for a theme file
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

// Naive first pass — expand and tune over time
export function mapWorkbenchColors(t: ColorTokens): Record<string, string> {
    return {
        // Editor core
        'editor.background': t.bgBase,
        'editor.foreground': t.fgPrimary,
        'editor.selectionBackground': t.selectionBg,
        'editor.selectionHighlightBackground': t.highlightBg,
        'editor.wordHighlightBackground': t.highlightBg,
        'editor.lineHighlightBackground': t.bgRaised,
        'editorCursor.foreground': t.fgPrimary,
        'editorWhitespace.foreground': t.fgMuted,
        'editorIndentGuide.background1': t.borderSubtle,
        'editorIndentGuide.activeBackground1': t.borderFocus,

        // Sidebar
        'sideBar.background': t.bgRaised,
        'sideBar.foreground': t.fgSecondary,
        'sideBar.border': t.borderSubtle,
        'sideBarTitle.foreground': t.fgPrimary,

        // Activity bar
        'activityBar.background': t.bgSunken,
        'activityBar.foreground': t.fgPrimary,
        'activityBar.inactiveForeground': t.fgMuted,
        'activityBar.border': t.borderSubtle,

        // Status bar
        'statusBar.background': t.invertBg,
        'statusBar.foreground': t.invertFg,
        'statusBar.border': t.borderSubtle,
        'statusBarItem.hoverBackground': t.selectionBg,

        // Tabs
        'tab.activeBackground': t.bgBase,
        'tab.activeForeground': t.fgPrimary,
        'tab.inactiveBackground': t.bgRaised,
        'tab.inactiveForeground': t.fgMuted,
        'tab.border': t.borderSubtle,
        'tab.activeBorder': t.fgPrimary,

        // Title bar
        'titleBar.activeBackground': t.bgSunken,
        'titleBar.activeForeground': t.fgPrimary,
        'titleBar.inactiveBackground': t.bgSunken,
        'titleBar.inactiveForeground': t.fgMuted,
        'titleBar.border': t.borderSubtle,

        // Panel (terminal area)
        'panel.background': t.bgSunken,
        'panel.border': t.borderSubtle,
        'panelTitle.activeForeground': t.fgPrimary,
        'panelTitle.inactiveForeground': t.fgMuted,

        // Terminal
        'terminal.background': t.bgSunken,
        'terminal.foreground': t.fgPrimary,
        'terminalCursor.foreground': t.fgPrimary,

        // Input / dropdowns
        'input.background': t.bgSunken,
        'input.foreground': t.fgPrimary,
        'input.border': t.borderSubtle,
        'input.placeholderForeground': t.fgMuted,
        'inputOption.activeBorder': t.borderFocus,
        'dropdown.background': t.bgOverlay,
        'dropdown.foreground': t.fgPrimary,
        'dropdown.border': t.borderSubtle,

        // Lists / trees
        'list.activeSelectionBackground': t.selectionBg,
        'list.activeSelectionForeground': t.fgPrimary,
        'list.inactiveSelectionBackground': t.highlightBg,
        'list.hoverBackground': t.highlightBg,
        'list.focusBackground': t.selectionBg,
        'list.focusForeground': t.fgPrimary,

        // Scrollbar
        'scrollbarSlider.background': t.borderSubtle,
        'scrollbarSlider.hoverBackground': t.borderFocus,
        'scrollbarSlider.activeBackground': t.fgMuted,

        // Badges / highlights
        'badge.background': t.invertBg,
        'badge.foreground': t.invertFg,

        // Peek view
        'peekView.border': t.borderFocus,
        'peekViewEditor.background': t.bgSunken,
        'peekViewResult.background': t.bgRaised,

        // Notifications
        'notifications.background': t.bgOverlay,
        'notifications.foreground': t.fgPrimary,
        'notifications.border': t.borderSubtle,
    };
}

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
