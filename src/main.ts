import * as vscode from 'vscode';
import { CommandPanel } from './command-panel';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(new CommandPanel(context));
}

export function deactivate() {}
