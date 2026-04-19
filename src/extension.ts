import * as vscode from 'vscode';
import * as crt from './crt';

export async function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('crt-themes.createCustomTheme', async () => {
		const cf = vscode.workspace.getConfiguration('crt-themes');
		const fg = cf.get('foreground');
		const bg = cf.get('background');

		const schemaUri = vscode.Uri.parse('vscode://schemas/workbench-colors');
		const doc = await vscode.workspace.openTextDocument(schemaUri);
		const schema = JSON.parse(doc.getText());
		const colorKeys = Object.keys(schema.properties ?? {});

		await dumpColorKeys(context);

		vscode.window.showInformationMessage(`CRT Themes! fg=${fg} bg=${bg} colors=${colorKeys.slice(0, 10)}`);
	});

	context.subscriptions.push(disposable);
}

export async function dumpColorKeys(context: vscode.ExtensionContext) {
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

export function deactivate() { }
