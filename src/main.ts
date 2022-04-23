import * as vscode from 'vscode';
import { TinyVSCodePlugin } from './TinyVSCodePlugin';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(new TinyVSCodePlugin(context));
}

export function deactivate() {}
