// Manual maintenance tool: `npm run sync-classification`
// Reconciles src/classification.ts with src/colorKeys.txt after running
// `npm run extract-color-keys`:
//   - keys present in both keep their existing (hand-tuned) role
//   - keys gone from colorKeys.txt (deprecated/removed) are dropped
//   - new keys get a heuristic first-guess role — review them visually
import * as fs from 'fs';
import * as path from 'path';
import type { TokenName } from './theme';

type Role = TokenName | null;

const root = path.resolve(__dirname, '..');
const classificationPath = path.join(root, 'src', 'classification.ts');
const colorKeysPath = path.join(root, 'src', 'colorKeys.txt');

const currentKeys = fs.readFileSync(colorKeysPath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'))
    .map(l => l.split(/\s+/)[0]);

// Parse the existing table (we own its format — one `'key': role,` per line).
// Hand-written comments are preserved across syncs: a trailing `// ...` on a
// key line, and any explanatory comment lines directly above a key (excluding
// the auto-generated `// <prefix>` group headers we re-emit ourselves).
const existing = new Map<string, Role>();
const trailingComments = new Map<string, string>();
const leadingComments = new Map<string, string[]>();
let pendingComments: string[] = [];
for (const line of fs.readFileSync(classificationPath, 'utf8').split('\n')) {
    const m = /^\s*'([^']+)':\s*(?:'(\w+)'|null),(.*)$/.exec(line);
    if (m) {
        const key = m[1];
        existing.set(key, (m[2] as TokenName | undefined) ?? null);
        const trailing = m[3].trim();
        if (trailing) { trailingComments.set(key, trailing); }
        const prefix = key.split('.')[0];
        const kept = pendingComments.filter(c => c !== `// ${prefix}`);
        if (kept.length) { leadingComments.set(key, kept); }
        pendingComments = [];
        continue;
    }
    const c = /^\s*(\/\/.*)$/.exec(line);
    pendingComments = c ? [...pendingComments, c[1].trim()] : [];
}

// First-guess classification for keys we have not seen before
function classify(key: string): Role {
    const k = key.toLowerCase().replace(/\d+$/, '');

    if (k.includes('shadow')) { return 'shadow'; }

    if (k.startsWith('editoroverviewruler')) {
        if (k.includes('border')) { return null; }
        return k.includes('error') ? 'alphaStrong' : 'alphaMid';
    }
    if (k.startsWith('minimap')) { return 'alphaMid'; }
    if (k.startsWith('merge') || k.startsWith('multidiff')) {
        if (k.includes('border')) { return 'borderSubtle'; }
        return k.includes('header') ? 'alphaStrong' : 'alphaMid';
    }

    if (k.includes('focusborder') || k.includes('focusoutline') || k.includes('activeoutline') ||
        k.includes('activeborder') || k.includes('selectedborder')) { return 'borderFocus'; }
    if (k.includes('border') || k.endsWith('outline') || k.includes('stroke')) { return 'borderSubtle'; }

    if (k.includes('badge')) { return k.endsWith('foreground') ? 'invertFg' : 'invertBg'; }

    if (k.endsWith('foreground')) {
        if (k.includes('inactive') || k.includes('placeholder') || k.includes('disabled') ||
            k.includes('description') || k.includes('deemphasized') || k.includes('unfocused') ||
            k.includes('offline') || k.includes('hidden')) { return 'fgMuted'; }
        if (k.includes('error') || k.includes('failed') || k.includes('invalid') || k.includes('conflict')) { return 'fgPrimary'; }
        if (k.includes('warning') || k.includes('queued') || k.includes('skipped')) { return 'fgSecondary'; }
        if (k.includes('info') || k.includes('hint') || k.includes('ignored') || k.includes('untracked')) { return 'fgTertiary'; }
        if (k.includes('active') || k.includes('selected') || k.includes('focus') ||
            k.includes('emphasized') || k.includes('prominent') || k.includes('header') ||
            k.includes('title') || k.includes('highlight')) { return 'fgPrimary'; }
        return 'fgSecondary';
    }

    if (k.endsWith('background')) {
        if (k.includes('drop')) { return 'alphaMid'; }
        if (k.includes('match') || k.includes('highlight') || k.includes('inserted') ||
            k.includes('removed') || k.includes('word') || k.includes('range') ||
            k.includes('snippet') || k.includes('tabstop')) { return 'alphaMid'; }
        if (k.includes('inactiveselection')) { return 'alphaMid'; }
        if (k.includes('selection') || k.includes('focus') || k.includes('selectedbackground') ||
            k.includes('activebackground') || k.includes('pressed')) { return 'selectionBg'; }
        if (k.includes('hover')) { return 'bgRaised'; }
        if (k.includes('error') || k.includes('warning') || k.includes('info') ||
            k.includes('added') || k.includes('modified') || k.includes('deleted')) { return 'alphaFaint'; }
        if (k.includes('widget') || k.includes('toolbar') || k.includes('sticky') ||
            k.startsWith('menu') || k.startsWith('dropdown') || k.startsWith('notification') ||
            k.startsWith('quickinput') || k.startsWith('chat') || k.startsWith('inlinechat') ||
            k.startsWith('interactive')) { return 'bgWidget'; }
        if (k.includes('header') || k.includes('secondary') || k.includes('tile') ||
            k.includes('embedded') || k.includes('block')) { return 'bgRaised'; }
        return 'bgBase';
    }

    if (k.includes('icon')) {
        if (k.includes('failed') || k.includes('errored') || k.includes('breakpoint')) { return 'fgPrimary'; }
        if (k.includes('passed') || k.includes('start')) { return 'fgSecondary'; }
        if (k.includes('skipped') || k.includes('unset') || k.includes('queued')) { return 'fgMuted'; }
        return 'fgSecondary';
    }

    return 'fgTertiary';
}

const added: string[] = [];
const removed = [...existing.keys()].filter(k => !currentKeys.includes(k));

const groups = new Map<string, string[]>();
for (const key of currentKeys) {
    const prefix = key.split('.')[0];
    if (!groups.has(prefix)) { groups.set(prefix, []); }
    groups.get(prefix)!.push(key);
}

const lines: string[] = [];
lines.push('// Classification of every VS Code workbench color key onto the 2-bit');
lines.push('// design system. Hand-tune freely — this file is the source of truth.');
lines.push('// Sync against a new VS Code version with `npm run extract-color-keys`');
lines.push('// followed by `npm run sync-classification` (existing roles are kept).');
lines.push('// `null` means deliberately unset (VS Code default/derived value is fine).');
lines.push("import { TokenName } from './theme';");
lines.push('');
lines.push('export const workbenchClassification: Record<string, TokenName | null> = {');
for (const [prefix, groupKeys] of groups) {
    lines.push(`    // ${prefix}`);
    for (const key of groupKeys) {
        let role: Role;
        if (existing.has(key)) {
            role = existing.get(key)!;
        } else {
            role = classify(key);
            added.push(`${key} -> ${role}`);
        }
        for (const c of leadingComments.get(key) ?? []) {
            lines.push(`    ${c}`);
        }
        let line = `    '${key}': ${role === null ? 'null' : `'${role}'`},`;
        const trailing = trailingComments.get(key);
        if (trailing) { line += ` ${trailing}`; }
        lines.push(line);
    }
}
lines.push('};');
lines.push('');

fs.writeFileSync(classificationPath, lines.join('\n'));

console.log(`Synced ${currentKeys.length} keys (${existing.size} previously classified).`);
if (removed.length) {
    console.log(`Dropped ${removed.length} keys no longer in colorKeys.txt:`);
    removed.forEach(k => console.log(`  - ${k}`));
}
if (added.length) {
    console.log(`Added ${added.length} new keys with heuristic roles (review visually):`);
    added.forEach(k => console.log(`  + ${k}`));
}
if (!removed.length && !added.length) {
    console.log('Classification already in sync.');
}
