/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
type Nullable<T> = T | null | undefined;

const PROJECT_FILE = 'project.tiny';
const PACKAGE_NAME = 'games.tinyfun.vscode';

interface ICommand {
	/** 命令名称, 展示在命令面板中的标题 */
	name: string;
	/** 命令描述，命令名称后的灰色描述信息 */
	description?: string;
	/** 鼠标悬浮后的提示信息 */
	tooltip?: string;
	/** 命令的执行内容，用于包含子任务可以不填 */
	command?: string | string[];
	/** 子任务列表 */
	actions?: ICommand[];
}

interface ITinyProjectConfigs {
	[key: string]: ICommand
}

export class TinyVSCodePlugin {
	private output = vscode.window.createOutputChannel(PACKAGE_NAME);
	private panels: ActionPanel[] = [];

	get workspace(): Nullable<vscode.WorkspaceFolder> {
		if (!vscode.workspace.workspaceFolders) return null;
		return vscode.workspace.workspaceFolders.find(w => fs.existsSync(path.join(w.uri.fsPath, PROJECT_FILE)));
	}
	constructor(readonly context: vscode.ExtensionContext) {
		if (this.workspace) {
			vscode.commands.registerCommand(`${PACKAGE_NAME}/item/context/run`, (item: TreeItem) => {
				const cmd = item.options as Required<ICommand>;
				return this.runCommand(cmd.command, cmd.name);
			});
			vscode.commands.registerCommand(`${PACKAGE_NAME}/run-command`, (item: TreeItem) => {
				const cmd = item.options as Required<ICommand>;
				return this.runCommand(cmd.command, item.label as string);
			});

			this.panels = [
				new ActionPanel(this.workspace, 'games.tinyfun.vscode.view.develop'),
				new ActionPanel(this.workspace, 'games.tinyfun.vscode.view.publish'),
				new ActionPanel(this.workspace, 'games.tinyfun.vscode.view.tools'),
			];
			
			vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.workspace, 'project.tiny')).onDidChange(this.refresh.bind(this));
			this.refresh();
		}
	}

	private runCommand(command: string | string[], title: string) {
		return new Promise<void>((resolve, reject) => {
			let existingTerminal = vscode.window.terminals.find(t => t.name === title);
			if (existingTerminal) {
				existingTerminal.dispose();
			}
			let terminal = vscode.window.createTerminal(title);
			let cmds: string[] = [];
			if (Array.isArray(command)) cmds = command.slice();
			if (typeof command === 'string') cmds = [command];
			cmds.forEach(cmd => terminal.sendText(cmd, true));
			terminal.show();
			resolve();
		});
	}

	private refresh() {
		const workspace = this.workspace as vscode.WorkspaceFolder;
		const projectFile = path.join(workspace.uri.fsPath, PROJECT_FILE);
		try {
			const project = yaml.load(fs.readFileSync(projectFile, 'utf8')) as ITinyProjectConfigs;
			for (const panel of this.panels) {
				const parts = panel.viewId.split('.');
				panel.refresh(project[parts[parts.length - 1]]);
			}
		} catch (error) {
			this.output.appendLine(`解析项目文件出错:\n${error}`);
		}
	}

	dispose() {

	}
}

class TreeItem extends vscode.TreeItem {
	children: TreeItem[] = [];
	options?: ICommand;
	readonly parent: Nullable<TreeItem>;
	constructor(title: string, parent: Nullable<TreeItem>, collapsibleState: vscode.TreeItemCollapsibleState) {
		super(title, collapsibleState);
		this.parent = parent;
	}
}

class ActionPanel implements vscode.TreeDataProvider<TreeItem> {

	private root?: TreeItem;
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | null | void> = this._onDidChangeTreeData.event;

	constructor(readonly workspace: vscode.WorkspaceFolder, readonly viewId: string) {
		vscode.window.registerTreeDataProvider(viewId, this);
	}

	refresh(actions: ICommand) {
		this.root = this.parseCommand(actions, null);
		this._onDidChangeTreeData.fire(null);
	}

	private parseCommand(cmd: ICommand, parent: Nullable<TreeItem>): TreeItem {
		const item = new TreeItem(cmd.name, parent, cmd.actions?.length ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
		item.options = cmd;
		item.tooltip = cmd.tooltip;
		item.description = cmd.description;
		item.contextValue = cmd.command ? `games.tinyfun.vscode.view.item.runnable` : 'games.tinyfun.vscode.view.item.group';
		if (cmd.actions?.length) {
			for (const sc of cmd.actions) {
				item.children.push(this.parseCommand(sc, item));
			}
		}
		return item;
	}

	getParent(element: TreeItem): vscode.ProviderResult<TreeItem> {
		return element.parent;
	}

	getTreeItem(element: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: TreeItem): vscode.ProviderResult<TreeItem[]> {
		element = element || this.root;
		return element?.children || [];
	}
}
