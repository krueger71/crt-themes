import * as vscode from 'vscode';
import { SourceColors, generateTheme, normalizeHex } from './theme';

const THEME_NAME = 'CRT Custom';
const THEME_KEY = `[${THEME_NAME}]`;
const SECTIONS = [
	'workbench.colorCustomizations',
	'editor.tokenColorCustomizations',
	'editor.semanticTokenColorCustomizations',
] as const;

type SectionName = typeof SECTIONS[number];

export function activate(context: vscode.ExtensionContext) {

	// Commands
	context.subscriptions.push(
		vscode.commands.registerCommand('crt-themes.modifyCustomTheme', () => modifyCustomTheme()),
	);

	// Config change listener for dynamic mode
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(async e => {
			const relevant =
				e.affectsConfiguration('crt-themes.background') ||
				e.affectsConfiguration('crt-themes.foreground') ||
				e.affectsConfiguration('crt-themes.dynamic');

			if (!relevant) { return; }

			const cfg = vscode.workspace.getConfiguration('crt-themes');
			const dynamic = cfg.get<boolean>('dynamic', true);

			if (!dynamic) { return; }

			const bg = cfg.get<string>('background', '#000000');
			const fg = cfg.get<string>('foreground', '#ffffff');
			try {
				await applyCustomTheme({ bg, fg });
			} catch (err) {
				vscode.window.showErrorMessage(`CRT Themes: ${err instanceof Error ? err.message : err}`);
			}
		})
	);
}

export function deactivate() { }

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

export async function modifyCustomTheme(): Promise<void> {
	const cfg = vscode.workspace.getConfiguration('crt-themes');

	const fg = await promptColor('Foreground color', cfg.get<string>('foreground', '#ffffff'));
	if (fg === undefined) { return; }
	const bg = await promptColor('Background color', cfg.get<string>('background', '#000000'));
	if (bg === undefined) { return; }

	await cfg.update('foreground', fg, vscode.ConfigurationTarget.Global);
	await cfg.update('background', bg, vscode.ConfigurationTarget.Global);
	await applyCustomTheme({ bg, fg });

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

export async function applyCustomTheme(src: SourceColors): Promise<void> {
	const { workbenchColors, textMateRules, semanticRules } = generateTheme(src);
	const newValues: Record<SectionName, unknown> = {
		'workbench.colorCustomizations': workbenchColors,
		'editor.tokenColorCustomizations': { textMateRules },
		'editor.semanticTokenColorCustomizations': { enabled: true, rules: semanticRules },
	};

	const cfg = vscode.workspace.getConfiguration();
	for (const section of SECTIONS) {
		await cfg.update(
			section,
			{ ...globalValueOf(section), [THEME_KEY]: newValues[section] },
			vscode.ConfigurationTarget.Global,
		);
	}
}
