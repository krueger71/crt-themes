import * as assert from 'assert';
import * as vscode from 'vscode';
import { applyCustomTheme, needsFirstWriteWarning } from '../extension';
import { normalizeHex } from '../theme';

const THEME_KEY = '[CRT Custom]';
const SECTIONS = [
	'workbench.colorCustomizations',
	'editor.tokenColorCustomizations',
	'editor.semanticTokenColorCustomizations',
];

function globalValueOf(section: string): Record<string, unknown> {
	const v = vscode.workspace.getConfiguration().inspect<Record<string, unknown>>(section)?.globalValue;
	return typeof v === 'object' && v !== null ? v : {};
}

suite('CRT Custom customizations', () => {
	// Global settings persist across tests in the shared test profile —
	// start every test from a clean slate.
	setup(async () => {
		for (const section of SECTIONS) {
			await vscode.workspace.getConfiguration()
				.update(section, undefined, vscode.ConfigurationTarget.Global);
		}
	});

	suiteTeardown(async () => {
		for (const section of SECTIONS) {
			await vscode.workspace.getConfiguration()
				.update(section, undefined, vscode.ConfigurationTarget.Global);
		}
	});

	test('apply writes scoped block', async () => {
		const cfg = vscode.workspace.getConfiguration();
		const preExisting = { 'editor.background': '#123456' };
		await cfg.update('workbench.colorCustomizations', {
			[THEME_KEY]: preExisting,
			'unrelatedKey': '#abcdef',
		}, vscode.ConfigurationTarget.Global);

		await applyCustomTheme({ fg: '#ffb000', bg: '#111111' });

		let colors = globalValueOf('workbench.colorCustomizations');
		const block = colors[THEME_KEY] as Record<string, string>;
		assert.strictEqual(block['editor.background'], '#111111', 'theme block is overwritten');
		assert.strictEqual(colors['unrelatedKey'], '#abcdef', 'sibling keys survive apply');
		assert.ok(globalValueOf('editor.tokenColorCustomizations')[THEME_KEY], 'token block written');
		assert.ok(globalValueOf('editor.semanticTokenColorCustomizations')[THEME_KEY], 'semantic block written');
	});

	test('first-write warning is needed until the block exists, and not after', async () => {
		assert.ok(needsFirstWriteWarning(), 'warn on a clean profile');

		await applyCustomTheme({ fg: '#ffb000', bg: '#111111' });
		assert.ok(!needsFirstWriteWarning(), 'silent once the user has opted in');

		// Removing the block by hand is the documented complete undo, so the
		// warning has to come back with it.
		for (const section of SECTIONS) {
			await vscode.workspace.getConfiguration()
				.update(section, undefined, vscode.ConfigurationTarget.Global);
		}
		assert.ok(needsFirstWriteWarning(), 'warn again after the block is deleted');
	});

	// Re-running the command with unchanged colors is the common case while
	// fine-tuning, and it must not rewrite ~1100 lines for nothing.
	test('re-applying the same colors leaves settings untouched', async () => {
		await applyCustomTheme({ fg: '#ffb000', bg: '#111111' });
		const before = SECTIONS.map(s => JSON.stringify(globalValueOf(s)));

		await applyCustomTheme({ fg: '#ffb000', bg: '#111111' });
		assert.deepStrictEqual(SECTIONS.map(s => JSON.stringify(globalValueOf(s))), before);
	});

	test('changing one color rewrites every section', async () => {
		await applyCustomTheme({ fg: '#ffb000', bg: '#111111' });
		const before = SECTIONS.map(s => JSON.stringify(globalValueOf(s)));

		await applyCustomTheme({ fg: '#33ff33', bg: '#111111' });
		SECTIONS.forEach((s, i) => assert.notStrictEqual(
			JSON.stringify(globalValueOf(s)), before[i], `${s} follows the new color`));
	});

	test('apply rejects malformed colors without touching settings', async () => {
		const before = JSON.stringify(globalValueOf('workbench.colorCustomizations'));
		await assert.rejects(
			() => applyCustomTheme({ fg: 'amber', bg: '#111111' }),
			/Invalid color/);
		assert.strictEqual(JSON.stringify(globalValueOf('workbench.colorCustomizations')), before);
	});
});

suite('Color parsing', () => {
	test('normalizeHex accepts #rgb and #rrggbb', () => {
		assert.strictEqual(normalizeHex('#fff'), '#ffffff');
		assert.strictEqual(normalizeHex('#FFB000'), '#ffb000');
		assert.strictEqual(normalizeHex('ffb000'), '#ffb000');
	});

	test('normalizeHex rejects garbage', () => {
		for (const bad of ['red', '#ff', '#fffff', '#ffb00x', '']) {
			assert.throws(() => normalizeHex(bad), /Invalid color/, `should reject "${bad}"`);
		}
	});
});
