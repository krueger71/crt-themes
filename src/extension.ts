import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "fooext" is now active!');
	const disposable = vscode.commands.registerCommand('crt-themes.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from crt-themes!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
