import * as vscode from 'vscode';
import { CommandPanel } from './command-panel';
import { ProjectCreator } from './project-creator';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(new CommandPanel(context));
	context.subscriptions.push(new ProjectCreator(context));
}

export function deactivate() {}
