// Runs inside the VS Code extension host (started by runner.ts) and writes
// the live workbench color schema to src/colorKeys.txt, skipping keys the
// schema marks as deprecated.
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface SchemaProperty {
    description?: string;
    markdownDescription?: string;
    deprecationMessage?: string;
    markdownDeprecationMessage?: string;
}

export async function run(): Promise<void> {
    const uri = vscode.Uri.parse('vscode://schemas/workbench-colors');
    const doc = await vscode.workspace.openTextDocument(uri);
    const schema = JSON.parse(doc.getText());
    const props: Record<string, SchemaProperty> = schema.properties ?? {};

    const all = Object.keys(props).sort();
    const keys = all.filter(k => !props[k].deprecationMessage && !props[k].markdownDeprecationMessage);
    const deprecated = all.length - keys.length;

    const lines = keys.map(key => {
        const desc = (props[key].description ?? props[key].markdownDescription ?? '').replace(/\s+/g, ' ');
        return `${key.padEnd(60)} // ${desc}`;
    });

    const content = [
        `// VS Code workbench color tokens — ${keys.length} keys (${deprecated} deprecated keys skipped)`,
        `// VS Code ${vscode.version}, generated ${new Date().toISOString()} by \`npm run extract-color-keys\``,
        '',
        ...lines,
        '',
    ].join('\n');

    const out = path.resolve(__dirname, '../../src/colorKeys.txt');
    fs.writeFileSync(out, content);
    console.log(`Wrote ${keys.length} keys (VS Code ${vscode.version}, ${deprecated} deprecated skipped) to ${out}`);
}
