import * as vscode from 'vscode';
import { SourceColors, generateTheme } from './theme';

const THEME_NAME = 'CRT Custom';

export function activate(context: vscode.ExtensionContext) {

	// Commands
	context.subscriptions.push(
		vscode.commands.registerCommand('crt-themes.showColorKeys', showColorKeys),
		vscode.commands.registerCommand('crt-themes.createCustomTheme', createCustomTheme),
		vscode.commands.registerCommand('crt-themes.resetCustomizations', clearDynamicTheme),
	);

	// Config change listener for dynamic mode
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(async e => {
			const relevant =
				e.affectsConfiguration('crt-themes.background') ||
				e.affectsConfiguration('crt-themes.foreground') ||
				e.affectsConfiguration('crt-themes.dynamicApplication');

			if (!relevant) { return; }

			const cfg = vscode.workspace.getConfiguration('crt-themes');
			const dynamic = cfg.get<boolean>('dynamicApplication', false);

			if (!dynamic) { return; }

			const bg = cfg.get<string>('background', '#000000');
			const fg = cfg.get<string>('foreground', '#ffffff');
			await applyDynamicTheme({ bg, fg });
		})
	);
}

export function deactivate() { }

export async function showColorKeys(context: vscode.ExtensionContext) {
	// 1. Read the schema
	const schemaUri = vscode.Uri.parse('vscode://schemas/workbench-colors');
	const doc = await vscode.workspace.openTextDocument(schemaUri);
	const schema = JSON.parse(doc.getText());

	// 2. Extract and sort keys
	const keys: string[] = Object.keys(schema.properties ?? {}).sort();

	// 3. Optionally annotate with description
	const lines = keys.map(key => {
		const desc = schema.properties[key]?.description ?? '';
		return `${key.padEnd(60)} // ${desc}`;
	});

	const content = [
		`// VS Code workbench color tokens — ${keys.length} keys`,
		`// Generated: ${new Date().toISOString()}`,
		'',
		...lines,
	].join('\n');

	// 4. Open as a new untitled document
	const newDoc = await vscode.workspace.openTextDocument({
		language: 'javascript',  // gives you syntax highlighting on the comments
		content,
	});

	await vscode.window.showTextDocument(newDoc, { preview: false });
}

export async function createCustomTheme(context: vscode.ExtensionContext) {
	const cfg = vscode.workspace.getConfiguration('crt-themes');
	const dynamic = cfg.get<boolean>('dynamicApplication', false);

	if (!dynamic) { return; }

	const bg = cfg.get<string>('background', '#000000');
	const fg = cfg.get<string>('foreground', '#ffffff');
	await applyDynamicTheme({ bg, fg });
}

export async function applyDynamicTheme(src: SourceColors): Promise<void> {
	const { workbenchColors, textMateRules, semanticRules } = generateTheme(src);
	const cfg = vscode.workspace.getConfiguration();
	const target = vscode.ConfigurationTarget.Global;

	await cfg.update('workbench.colorCustomizations', {
		...cfg.get('workbench.colorCustomizations'),
		[`[${THEME_NAME}]`]: workbenchColors,
	}, target);

	await cfg.update('editor.tokenColorCustomizations', {
		...cfg.get('editor.tokenColorCustomizations'),
		[`[${THEME_NAME}]`]: { textMateRules },
	}, target);

	await cfg.update('editor.semanticTokenColorCustomizations', {
		...cfg.get('editor.semanticTokenColorCustomizations'),
		[`[${THEME_NAME}]`]: { enabled: true, rules: semanticRules },
	}, target);
}

export async function clearDynamicTheme(): Promise<void> {
	const cfg = vscode.workspace.getConfiguration();
	const target = vscode.ConfigurationTarget.Global;
	const key = `[${THEME_NAME}]`;

	for (const section of [
		'workbench.colorCustomizations',
		'editor.tokenColorCustomizations',
		'editor.semanticTokenColorCustomizations',
	]) {
		const current = { ...cfg.get<Record<string, unknown>>(section) };
		delete current[key];
		await cfg.update(section, current, target);
	}
}
