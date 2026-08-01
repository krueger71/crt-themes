import * as fs from 'fs';
import * as path from 'path';
import { toThemeJson } from './theme';
import { workbenchClassification } from './classification';

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const themes: Record<string, { type: 'dark' | 'light'; fg: string; bg: string }> =
    pkg.config.themes;

// Coverage check: every key VS Code exposes should be classified, so no
// default colors bleed through the monochrome design.
const colorKeysPath = path.join(root, 'src', 'colorKeys.txt');
const knownKeys = fs.readFileSync(colorKeysPath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'))
    .map(l => l.split(/\s+/)[0]);
const unclassified = knownKeys.filter(k => !(k in workbenchClassification));
if (unclassified.length > 0) {
    console.warn(`⚠ ${unclassified.length} workbench color keys are not classified:`);
    for (const k of unclassified) {
        console.warn(`    ${k}`);
    }
}

// And the other direction: a classified key VS Code has never heard of is
// silently ignored at load time, so a typo in a hand-tuned entry would be
// invisible. `npm run sync-classification` drops removed keys, but the table
// is edited by hand between syncs.
const known = new Set(knownKeys);
const unknown = Object.keys(workbenchClassification).filter(k => !known.has(k));
if (unknown.length > 0) {
    console.warn(`⚠ ${unknown.length} classified keys are unknown to VS Code (typo, or removed upstream):`);
    for (const k of unknown) {
        console.warn(`    ${k}`);
    }
}

// "CRT Amber" -> CRT-Amber-color-theme.json. Shared by the write below and the
// manifest check above it, so the two cannot drift apart.
const themeFile = (name: string) => `${name.replace(/\s+/g, '-')}-color-theme.json`;

// The two halves of the manifest have to agree. `config.themes` drives what
// gets generated; `contributes.themes` is what VS Code actually offers. A theme
// listed in one but not the other fails silently either way — a generated file
// nobody can select, or a contributed path that does not exist — and neither
// shows up until someone goes looking in the theme picker.
interface ThemeContribution { label: string; uiTheme: string; path: string }
const contributions: ThemeContribution[] = pkg.contributes?.themes ?? [];
const contributed = new Map(contributions.map(c => [c.label, c]));

for (const [name, cfg] of Object.entries(themes)) {
    const c = contributed.get(name);
    if (!c) {
        console.warn(`⚠ "${name}" is generated but missing from contributes.themes — VS Code will never offer it`);
        continue;
    }
    const wantUiTheme = cfg.type === 'light' ? 'vs' : 'vs-dark';
    if (c.uiTheme !== wantUiTheme) {
        console.warn(`⚠ "${name}" is "${cfg.type}" in config.themes but uiTheme "${c.uiTheme}" in contributes.themes`);
    }
    const wantPath = `./themes/${themeFile(name)}`;
    if (c.path !== wantPath) {
        console.warn(`⚠ "${name}" is contributed as ${c.path}, but the build writes ${wantPath}`);
    }
}

for (const c of contributions) {
    if (!(c.label in themes)) {
        console.warn(`⚠ "${c.label}" is contributed but has no config.themes entry — its file is never generated`);
    }
}

const outDir = path.join(root, 'themes');
fs.mkdirSync(outDir, { recursive: true });

for (const [name, cfg] of Object.entries(themes)) {
    const uiTheme = cfg.type === 'light' ? 'vs' : 'vs-dark';
    const json = toThemeJson(name, uiTheme, { bg: cfg.bg, fg: cfg.fg });
    const file = themeFile(name);
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(json, null, 2) + '\n');
    console.log(`✓ ${file} (fg ${cfg.fg} on bg ${cfg.bg})`);
}
