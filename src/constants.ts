import * as vscode from 'vscode';

export type Nullable<T> = T | null | undefined;
export const PROJECT_FILE = 'project.tiny';
export const PACKAGE_NAME = 'games.tinyfun.vscode';
export const CONFIG_CONTAINER = 'tinyfun';

export function getConfiguration<T>(name: string, defaultValue?: T) {
	return vscode.workspace.getConfiguration(CONFIG_CONTAINER).get(name, defaultValue) || defaultValue;
}
