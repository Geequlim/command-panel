import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import * as vscode from 'vscode';
import { getConfiguration, PACKAGE_NAME } from './constants';
import { getFiles, TextStyle, wait } from './utils';

export class ProjectCreator {

	readonly terminalTitle = '创建 tiny-game';

	constructor(readonly context: vscode.ExtensionContext) {
		vscode.commands.registerCommand(`${PACKAGE_NAME}/create-project`, this.start.bind(this));
	}

	async start() {
		try {
			if (this.output) {
				this.output.dispose();
				this.output = undefined;
			}
			const p = await this.createProject();
			const choice = await vscode.window.showInformationMessage(`创建项目 ${p.project} 完成`, '立即打开', '完成');
			if (choice === '立即打开') {
				vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(path.join(p.root, 'project')), false);
			}
		} catch (error) {
			this.log();
			this.log(TextStyle.red('创建项目出错'));
			this.log(TextStyle.red(error));
		}
	}

	private async getProjectInfo() {
		let repo = (await vscode.window.showInputBox({
			title: '输入 git 项目地址',
			placeHolder: 'http://git.tinyfun.studio:81/tinyfun/<project>.git',
			ignoreFocusOut: true
		}));
		repo = (repo || '').trim();
		if (!repo) throw new Error('项目git地址不能为空');
		if (!repo.match(/^[A-Za-z0-9_\-]+\.git$/)) Error('项目git地址无效');

		const uri = await vscode.window.showOpenDialog({ title: "选择项目目录", openLabel: "选为项目目录", canSelectFiles: false, canSelectFolders: true, canSelectMany: false });
		if (!uri || !uri.length) throw new Error('请选择项目目录');
		const root = uri[0].fsPath;
		const ret = fs.readdirSync(root);
		if (ret.length) throw new Error('项目目录不为空');
		let name = (await vscode.window.showInputBox({
			title: '输入项目名称',
			placeHolder: '项目名称, 形如 大力出奇迹',
			ignoreFocusOut: true
		}));
		name = (name || '').trim();
		if (!name) throw new Error('项目名称不能为空');

		let project = (await vscode.window.showInputBox({
			title: '输入项目代号',
			value: path.basename(repo.replace('.git', '')),
			placeHolder: '项目代号，形如 dice-push',
			ignoreFocusOut: true
		}));
		project = (project || '').trim();
		if (!project) throw new Error('项目代号不能为空');
		if (!project.match(/^[A-Za-z0-9_\-]+$/)) {
			throw new Error('项目代号仅支持使用 A-Za-z0-9_-');
		}
		let appid = (await vscode.window.showInputBox({
			title: '输入后台分配的 appid',
			placeHolder: '形如 38061ea470834a3188a60b31af1275f6 暂未分配可直接回车跳过',
			ignoreFocusOut: true
		}));
		appid = (appid || '').trim();

		return {
			repo,
			project,
			name,
			appid,
			root
		};
	}

	private output?: vscode.OutputChannel;

	private log(...message: any[]) {
		if (!this.output) {
			this.output = vscode.window.createOutputChannel("创建 tiny-game 项目");
			this.output.show();
		}
		const text = message.join(' ');
		this.output.appendLine(text);
		console.log(text);
	}

	private async createProject() {
		this.log('开始创建项目');
		await wait(500);
		const p = await this.getProjectInfo();

		this.log('收集项目信息完成');
		this.log('\t', JSON.stringify(p, undefined, '\t').split('\n').join('\n\t'));

		const gitRepoDir = path.join(p.root, 'project');

		fs.mkdirSync(gitRepoDir, { recursive: true });
		process.chdir(gitRepoDir);

		this.log('配置 git 项目');
		let cmds = [
			`git init`,
			`git remote add origin "${p.repo}"`,
			`git remote add upstream "${getConfiguration("templateProjectRepo")}"`,
			'git fetch upstream',
			'git checkout upstream/master',
			'git checkout -b famework',
			'git checkout -b master',
		];
		for (const cmd of cmds) await this.exec(cmd);

		const replace = (file: string, patter: string | RegExp, content: string) => {
			let text = fs.readFileSync(file).toString('utf-8');
			text = text.replace(patter, content);
			fs.writeFileSync(file, text);
		};

		const copyFile = (src: string, dest: string) => {
			let dir = path.dirname(dest);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			fs.copyFileSync(src, dest);
		};

		const moveFile = (src: string, dest: string) => {
			let dir = path.dirname(dest);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			fs.renameSync(src, dest);
		};

		const modifyJSON = (file: string, action: (value: any) => void) => {
			const value = JSON.parse(fs.readFileSync(file, 'utf-8'));
			action(value);
			fs.writeFileSync(file, JSON.stringify(value, undefined, '\t'), 'utf-8');
		};

		const mklink = (target: string, path: string) => {
			try {
				if (process.platform === 'win32') {
					cp.execSync(`cmd /c mklink /D /J ${path} ${target}`);
				} else {
					cp.execSync(`ln -s ${path} ${target}`);
				}
			} catch (error) {
				console.error('错误', '无法创建目录链接: ', (error as Error)?.message || error);
				if (process.platform === 'win32') console.error('请检查: "本地安全策略（secpol.msc）/本地策略/用户权利分配/创建符号链接" 中是否包含当前用户');
			}
		};

		const templates = 'template';
		for (const f of fs.readdirSync(templates)) {
			moveFile(path.join(templates, f), `../${f}`);
		}
		fs.rmSync(templates, { force: true, recursive: true });
		fs.mkdirSync('.temp', { recursive: true });

		if (true) {
			this.log('调整项目参数');
			replace('config.yaml', /name:\s+.*/, `name: ${p.name}`);
			replace('config.yaml', /project:\s+.*/, `project: ${p.project}`);
			replace('config.yaml', /appid:\s+.*/, `appid: ${p.appid}`);
			replace('project.tiny', /\s+template\//g, ` ../`);
		}

		if (true) {
			this.log('调整 UI 配置');
			const uiProjectFile = `../UI/${p.project}.fairy`;
			moveFile('../UI/tiny-game-kit.fairy', uiProjectFile);
			replace(
				'publish.yaml',
				'project: template/UI/tiny-game-kit.fairy',
				`project: ${uiProjectFile}`
			);
			
			// 配置 ui 发布选项
			modifyJSON(
				path.resolve('../UI/settings/Publish.json'),
				value => {
					value.path = value.path.replace('../../', '../project/');
					value.codeGeneration.codePath = value.codeGeneration.codePath.replace('../../', '../project/');
				}
			);

			// 配置多语言
			modifyJSON(
				path.resolve('../UI/settings/i18n.json'),
				value => {
					for (const lang of value.langFiles) {
						lang.path = lang.path.replace('../../', '../project/');
					}
				}
			);

			// 设置导出目录
			const packageFiles = getFiles('../UI/assets/*/package.xml');
			for (const pkgXml of packageFiles) {
				replace(pkgXml, 'path="../../', 'path="../project/');
				replace(pkgXml, 'codePath="../../', 'codePath="../project/');
			}
			// 复制字体文件
			copyFile(path.resolve('../UI/assets/Game/res/江城圆体-600W.ttf'), path.resolve('Assets/res/Resources/fonts/main.ttf'));
		}

		if (true) {
			this.log('调整转表配置');
			const configFile = '../配置/excel-exporter.yaml';
			replace(configFile, /\.\.\/\.\./g, '../project' );
			modifyJSON('tools/package.json', value => {
				value.scripts['转表'] = 'cd ../../配置 && node ./binary.js ./excel-exporter.yaml';
			});
		}

		if (true) {
			this.log('调整 Unity 项目配置');
			replace('unity/ProjectSettings/ProjectSettings.asset', 'productName: tiny-game-kit', `productName: ${p.project}` );
		}

		if (true) {
			this.log('调整 VSCode 配置');
			modifyJSON('.vscode/settings.json', settings => {
				settings['window.title'] = '${dirty}${activeEditorShort}${separator}' + p.project + '${separator}${appName}';
			});
		}

		if (true) {
			this.log('创建软链接');
			mklink('Assets', path.join('laya', 'Assets'));
			mklink(path.join('Assets', 'res'), path.join('unity', 'Assets', 'res'));
		}

		if (true) {
			this.log('安装依赖');
			let depsDone = false;
			for (let i = 1; i <= 3; i++) {
				try {
					await this.exec('yarn install');
					depsDone = true;
					break;
				} catch (error) {
					if (i <= 3) {
						this.log(`安装依赖出错, 执行第${i}次重试`);
					}
				}
			}
			if (!depsDone) this.log('无法安装依赖库, 已忽略部分步骤。建议设置 yarn 源为国内镜像');
			if (depsDone) {
				this.log('构建 CLI 工具');
				await cp.execSync('yarn webpack --config tools/webpack.config.js --env esbuild=true target=ES2018', { stdio: 'inherit' });
			}
		}
		this.log('项目初始化完毕', p.project);

		await this.exec('git add .');
		await this.exec(`git commit -m"Initialize project ${p.project}"`);
		try {
			await this.exec('git push origin master');
		} catch (error) {
			this.log('推送到远程项目仓库出错', p.repo);
		}
		this.log(`创建 ${p.project} 项目完成`);
		return p;
	}

	exec(command: string) {
		return new Promise<void>((resolve, reject) => {
			this.log('>', command);
			const child = cp.exec(command);
			child.stdout?.setEncoding('utf8');
			const pipe = (chunk: string) => {
				const lines = chunk.split('\n');
				for (const line of lines) {
					this.log(TextStyle.green('\t', line));
				}
			};
			child.stdout?.on('data', pipe);
			child.stderr?.setEncoding('utf-8');
			child.stderr?.on('data', pipe);
			child.once('error', (error: { message: string; }) => {
				reject(new Error(`执行命令 ${command} 失败:\n${error && error.message ? error.message : error}`));
			});
			child.once('close', (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`执行命令 ${command} 失败, 运行结果为 ${code}`));
				}
			});
		});
	}

	dispose() {
	}

}
