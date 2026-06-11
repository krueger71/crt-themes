// Manual maintenance tool: `npm run extract-color-keys`
// Launches a VS Code instance (via @vscode/test-electron, same as the test
// suite — needs a display) and dumps the workbench color schema of that
// VS Code version into src/colorKeys.txt. Run when updating the extension
// for a new VS Code release, then `npm run sync-classification`.
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    const root = path.resolve(__dirname, '../..');
    await runTests({
        extensionDevelopmentPath: root,
        extensionTestsPath: path.resolve(__dirname, 'main'),
        launchArgs: ['--disable-extensions', '--disable-workspace-trust'],
    });
}

main().catch(err => {
    console.error('Failed to extract color keys:', err);
    process.exit(1);
});
