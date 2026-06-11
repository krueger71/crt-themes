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

const outDir = path.join(root, 'themes');
fs.mkdirSync(outDir, { recursive: true });

for (const [name, cfg] of Object.entries(themes)) {
    const uiTheme = cfg.type === 'light' ? 'vs' : 'vs-dark';
    const json = toThemeJson(name, uiTheme, { bg: cfg.bg, fg: cfg.fg });
    // "CRT Amber" -> themes/CRT-Amber-color-theme.json (matches contributes.themes)
    const file = `${name.replace(/\s+/g, '-')}-color-theme.json`;
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(json, null, 2) + '\n');
    console.log(`✓ ${file} (fg ${cfg.fg} on bg ${cfg.bg})`);
}
