import * as assert from 'assert';
import * as vscode from 'vscode';
import { applyDynamicTheme, clearDynamicTheme } from '../extension';
import { normalizeHex } from '../theme';

const THEME_KEY = '[CRT Custom]';
const SECTIONS = [
	'workbench.colorCustomizations',
	'editor.tokenColorCustomizations',
	'editor.semanticTokenColorCustomizations',
];

// applyDynamicTheme/clearDynamicTheme only use globalState off the context,
// so an in-memory stand-in is enough to exercise backup/restore.
function fakeContext(): vscode.ExtensionContext {
	const state = new Map<string, unknown>();
	return {
		globalState: {
			get: (key: string) => state.get(key),
			update: (key: string, value: unknown) => {
				if (value === undefined) {
					state.delete(key);
				} else {
					state.set(key, value);
				}
				return Promise.resolve();
			},
		},
	} as unknown as vscode.ExtensionContext;
}

function globalValueOf(section: string): Record<string, unknown> {
	const v = vscode.workspace.getConfiguration().inspect<Record<string, unknown>>(section)?.globalValue;
	return typeof v === 'object' && v !== null ? v : {};
}

suite('Dynamic theme customizations', () => {
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

	test('apply writes scoped block, reset restores pre-existing values', async () => {
		const cfg = vscode.workspace.getConfiguration();
		const preExisting = { 'editor.background': '#123456' };
		await cfg.update('workbench.colorCustomizations', {
			[THEME_KEY]: preExisting,
			'unrelatedKey': '#abcdef',
		}, vscode.ConfigurationTarget.Global);

		const ctx = fakeContext();
		await applyDynamicTheme(ctx, { fg: '#ffb000', bg: '#111111' });

		let colors = globalValueOf('workbench.colorCustomizations');
		const block = colors[THEME_KEY] as Record<string, string>;
		assert.strictEqual(block['editor.background'], '#111111', 'theme block is overwritten');
		assert.strictEqual(colors['unrelatedKey'], '#abcdef', 'sibling keys survive apply');
		assert.ok(globalValueOf('editor.tokenColorCustomizations')[THEME_KEY], 'token block written');
		assert.ok(globalValueOf('editor.semanticTokenColorCustomizations')[THEME_KEY], 'semantic block written');

		// Re-apply with other colors — backup must keep the original values
		await applyDynamicTheme(ctx, { fg: '#33ff00', bg: '#000000' });

		await clearDynamicTheme(ctx);

		colors = globalValueOf('workbench.colorCustomizations');
		assert.deepStrictEqual(colors[THEME_KEY], preExisting, 'pre-existing block restored on reset');
		assert.strictEqual(colors['unrelatedKey'], '#abcdef', 'sibling keys survive reset');
		assert.strictEqual(
			vscode.workspace.getConfiguration().inspect('editor.tokenColorCustomizations')?.globalValue,
			undefined, 'empty sections are removed entirely');
	});

	test('reset deletes block when nothing pre-existed', async () => {
		const ctx = fakeContext();
		await applyDynamicTheme(ctx, { fg: '#ffffff', bg: '#000000' });
		assert.ok(globalValueOf('workbench.colorCustomizations')[THEME_KEY]);

		await clearDynamicTheme(ctx);
		for (const section of SECTIONS) {
			assert.strictEqual(globalValueOf(section)[THEME_KEY], undefined, `${section} block removed`);
		}
	});

	test('apply rejects malformed colors without touching settings', async () => {
		const before = JSON.stringify(globalValueOf('workbench.colorCustomizations'));
		await assert.rejects(
			() => applyDynamicTheme(fakeContext(), { fg: 'amber', bg: '#111111' }),
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
