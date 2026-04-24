import * as fs from 'fs';
import * as path from 'path';
import { toThemeJson } from './theme';

const themes = [
    { name: 'CRT Amber', file: 'crt-amber.json', uiTheme: 'vs-dark' as const, bg: '#0d0800', fg: '#ffb000' },
    { name: 'CRT Green', file: 'crt-green.json', uiTheme: 'vs-dark' as const, bg: '#0d0800', fg: '#33ff33' },
    { name: 'CRT Custom', file: 'crt-custom.json', uiTheme: 'vs-dark' as const, bg: '#000000', fg: '#ffffff' },
    // add more here
];

const outDir = path.resolve(__dirname, '../themes');
fs.mkdirSync(outDir, { recursive: true });

for (const theme of themes) {
    const json = toThemeJson(theme.name, theme.uiTheme, { bg: theme.bg, fg: theme.fg });
    const outPath = path.join(outDir, theme.file);
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2));
    console.log(`✓ ${theme.file}`);
}
