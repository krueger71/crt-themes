import * as vscode from 'vscode';
import { SourceColors, generateTheme, normalizeHex } from './theme';

const THEME_NAME = 'CRT Custom';
const THEME_KEY = `[${THEME_NAME}]`;

// Fallbacks mirror the contributed defaults in package.json; used only if
// those defaults are somehow absent.
const DEFAULT_FG = '#fecc02';
const DEFAULT_BG = '#006aa7';
const SECTIONS = [
	'workbench.colorCustomizations',
	'editor.tokenColorCustomizations',
	'editor.semanticTokenColorCustomizations',
] as const;

type SectionName = typeof SECTIONS[number];

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('crt-themes.modifyCustomTheme', () => modifyCustomTheme()),
	);
}

export function deactivate() { }

/**
 * Read a color the same way the customizations are read and written: global
 * only. get() would merge a workspace value over it, and since the generated
 * customizations always land in *user* settings, a workspace-scoped color
 * would otherwise be baked into every other window.
 */
function globalColor(cfg: vscode.WorkspaceConfiguration, key: string, fallback: string): string {
	const v = cfg.inspect<string>(key);
	return v?.globalValue ?? v?.defaultValue ?? fallback;
}

/**
 * True until the [CRT Custom] block exists in the user's settings, i.e. until
 * they have accepted what this theme writes there.
 *
 * Deliberately derived from the settings themselves rather than a stored
 * "already warned" flag. A flag would follow the install, not the settings:
 * it would stay set after the user deleted the block by hand (the documented
 * complete undo), suppressing the warning when 1100 lines are about to come
 * back, and it would not travel with Settings Sync to a second machine that
 * already has the block.
 */
export function needsFirstWriteWarning(): boolean {
	return !SECTIONS.some(section => THEME_KEY in globalValueOf(section));
}

/**
 * Confirm the first write. Only the command asks — editing settings is left
 * undisturbed, since the listener now never creates the block, only maintains
 * one the user already opted into.
 */
async function confirmFirstWrite(): Promise<boolean> {
	if (!needsFirstWriteWarning()) { return true; }

	const choice = await vscode.window.showWarningMessage(
		'CRT Custom is generated into your user settings.json — about 1100 lines of color customizations.',
		{
			modal: true,
			detail: 'They are written under a "[CRT Custom]" section, so customizations belonging to '
				+ 'other themes are left alone, and deleting that section removes this theme completely.\n\n'
				+ 'This prompt only appears until the section exists.',
		},
		'Continue',
	);
	return choice === 'Continue';
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

/**
 * The open settings.json, if it has unsaved changes. VS Code's configuration
 * editing refuses to write while the file is dirty ("Unable to write into user
 * settings because the file has unsaved changes"), and an apply that fails
 * part-way through leaves the workbench on one palette and the syntax on
 * another. Checking up front turns that into a clean abort.
 */
function dirtySettingsDocument(): vscode.TextDocument | undefined {
	return vscode.workspace.textDocuments.find(doc =>
		doc.isDirty
		&& doc.uri.path.endsWith('/settings.json')
		// vscode-userdata is the user settings file; the path check keeps
		// remote/portable installs, where it arrives as file:, from slipping by.
		&& (doc.uri.scheme === 'vscode-userdata' || doc.uri.path.includes('/User/')));
}

// Guards against a second invocation landing while the first is still writing.
// The prompts are modal, so this only matters on a slow machine where the
// writes themselves take a while.
let applying = false;

export async function modifyCustomTheme(): Promise<void> {
	if (applying) {
		vscode.window.showInformationMessage('CRT Themes: still applying the previous change.');
		return;
	}

	// Ask before the color prompts, not after — cancelling should not cost
	// the user two dialogs' worth of typing.
	if (!await confirmFirstWrite()) { return; }

	const cfg = vscode.workspace.getConfiguration('crt-themes');

	const fg = await promptColor('Foreground color', globalColor(cfg, 'foreground', DEFAULT_FG));
	if (fg === undefined) { return; }
	const bg = await promptColor('Background color', globalColor(cfg, 'background', DEFAULT_BG));
	if (bg === undefined) { return; }

	// Checked here rather than before the prompts because it is only the state
	// at the moment of writing that matters — the file can be edited while the
	// input boxes are up.
	const dirty = dirtySettingsDocument();
	if (dirty) {
		const choice = await vscode.window.showWarningMessage(
			'Your settings.json has unsaved changes, which stops VS Code from writing to it.',
			{ modal: true, detail: 'Save it first, then CRT Custom can be applied.' },
			'Save and continue',
		);
		if (choice !== 'Save and continue') { return; }
		if (!await dirty.save()) {
			vscode.window.showErrorMessage('CRT Themes: could not save settings.json — nothing was changed.');
			return;
		}
	}

	applying = true;
	try {
		// Widest write first: if the ~1100-line block cannot be written, the
		// command has touched nothing at all.
		await applyCustomTheme({ bg, fg });
		await cfg.update('foreground', fg, vscode.ConfigurationTarget.Global);
		await cfg.update('background', bg, vscode.ConfigurationTarget.Global);

		// The customizations are scoped to [CRT Custom], so they only show
		// under that theme — switch to it.
		await vscode.workspace.getConfiguration()
			.update('workbench.colorTheme', THEME_NAME, vscode.ConfigurationTarget.Global);
	} catch (err) {
		vscode.window.showErrorMessage(
			`CRT Themes: could not write settings — ${err instanceof Error ? err.message : err}. `
			+ 'Running the command again rewrites the whole block.');
	} finally {
		applying = false;
	}
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
		const current = globalValueOf(section);

		// Re-running with the same colors is a no-op. Skipping the write keeps
		// the command cheap to repeat while fine-tuning, and keeps Settings
		// Sync from shipping three unchanged blocks around.
		if (JSON.stringify(current[THEME_KEY]) === JSON.stringify(newValues[section])) { continue; }

		await cfg.update(
			section,
			{ ...current, [THEME_KEY]: newValues[section] },
			vscode.ConfigurationTarget.Global,
		);
	}
}
