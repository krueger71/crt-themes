import * as vscode from 'vscode';
import { SourceColors, generateTheme, normalizeHex } from './theme';

const THEME_NAME = 'CRT Custom';
const THEME_KEY = `[${THEME_NAME}]`;
const BACKUP_STATE_KEY = 'crt-themes.customizationBackups';

const SECTIONS = [
	'workbench.colorCustomizations',
	'editor.tokenColorCustomizations',
	'editor.semanticTokenColorCustomizations',
] as const;

type SectionName = typeof SECTIONS[number];

// `value: undefined` is a valid backup ("nothing was there before us"),
// so presence of the entry — not its value — marks a taken backup.
type Backups = Partial<Record<SectionName, { value: unknown }>>;

export function activate(context: vscode.ExtensionContext) {

	// Commands
	context.subscriptions.push(
		vscode.commands.registerCommand('crt-themes.showColorKeys', showColorKeys),
		vscode.commands.registerCommand('crt-themes.createCustomTheme', () => createCustomTheme(context)),
		vscode.commands.registerCommand('crt-themes.resetCustomizations', () => clearDynamicTheme(context)),
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
			try {
				await applyDynamicTheme(context, { bg, fg });
			} catch (err) {
				vscode.window.showErrorMessage(`CRT Themes: ${err instanceof Error ? err.message : err}`);
			}
		})
	);
}

export function deactivate() { }

export async function showColorKeys() {
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

async function promptColor(prompt: string, value: string): Promise<string | undefined> {
	const input = await vscode.window.showInputBox({
		prompt: `${prompt} (#rgb or #rrggbb)`,
		value,
		validateInput: v => {
			try {
				normalizeHex(v);
				return undefined;
			} catch {
				return 'Use #rgb or #rrggbb, e.g. #ffb000';
			}
		},
	});
	return input === undefined ? undefined : normalizeHex(input);
}

export async function createCustomTheme(context: vscode.ExtensionContext): Promise<void> {
	const cfg = vscode.workspace.getConfiguration('crt-themes');

	const fg = await promptColor('Foreground color', cfg.get<string>('foreground', '#ffffff'));
	if (fg === undefined) { return; }
	const bg = await promptColor('Background color', cfg.get<string>('background', '#000000'));
	if (bg === undefined) { return; }

	await cfg.update('foreground', fg, vscode.ConfigurationTarget.Global);
	await cfg.update('background', bg, vscode.ConfigurationTarget.Global);
	await applyDynamicTheme(context, { bg, fg });

	// The customizations are scoped to [CRT Custom], so they only show
	// under that theme — switch to it.
	await vscode.workspace.getConfiguration()
		.update('workbench.colorTheme', THEME_NAME, vscode.ConfigurationTarget.Global);
}

// The merged view from cfg.get() would mix workspace values into what we
// write back to user settings — only ever work with the global value.
function globalValueOf(section: SectionName): Record<string, unknown> {
	const v = vscode.workspace.getConfiguration().inspect<Record<string, unknown>>(section)?.globalValue;
	return typeof v === 'object' && v !== null ? { ...v } : {};
}

export async function applyDynamicTheme(context: vscode.ExtensionContext, src: SourceColors): Promise<void> {
	const { workbenchColors, textMateRules, semanticRules } = generateTheme(src);
	const newValues: Record<SectionName, unknown> = {
		'workbench.colorCustomizations': workbenchColors,
		'editor.tokenColorCustomizations': { textMateRules },
		'editor.semanticTokenColorCustomizations': { enabled: true, rules: semanticRules },
	};

	// Before the first overwrite, back up any pre-existing [CRT Custom]
	// blocks so resetCustomizations can restore them. Persisted before
	// writing settings, so a failure in between loses nothing.
	const backups: Backups = { ...context.globalState.get<Backups>(BACKUP_STATE_KEY) };
	let backupsChanged = false;
	for (const section of SECTIONS) {
		if (!(section in backups)) {
			backups[section] = { value: globalValueOf(section)[THEME_KEY] };
			backupsChanged = true;
		}
	}
	if (backupsChanged) {
		await context.globalState.update(BACKUP_STATE_KEY, backups);
	}

	const cfg = vscode.workspace.getConfiguration();
	for (const section of SECTIONS) {
		await cfg.update(
			section,
			{ ...globalValueOf(section), [THEME_KEY]: newValues[section] },
			vscode.ConfigurationTarget.Global,
		);
	}
}

export async function clearDynamicTheme(context: vscode.ExtensionContext): Promise<void> {
	const backups = context.globalState.get<Backups>(BACKUP_STATE_KEY) ?? {};
	const cfg = vscode.workspace.getConfiguration();

	for (const section of SECTIONS) {
		const current = globalValueOf(section);
		const backup = backups[section];
		if (backup && backup.value !== undefined) {
			current[THEME_KEY] = backup.value;
		} else {
			delete current[THEME_KEY];
		}
		// Remove the section entirely rather than leaving an empty {} behind
		const value = Object.keys(current).length > 0 ? current : undefined;
		await cfg.update(section, value, vscode.ConfigurationTarget.Global);
	}

	await context.globalState.update(BACKUP_STATE_KEY, undefined);
}
