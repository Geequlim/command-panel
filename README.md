## 命令面板
![](media/screenshot.png)

用于一键执行项目常用指令，可以根据项目需要配置指令。当项目内存在 `.vscode/commands.yaml` 文件时激活该功能，此文件用于配置面板内的命令。
```typescript
interface ICommand {
	/** 命令名称, 展示在命令面板中的标题 */
	name: string;
	/** 命令执行终端面板的标题 */
	title?: string;
	/** 命令描述，命令名称后的灰色描述信息 */
	description?: string;
	/** 鼠标悬浮后的提示信息 */
	tooltip?: string;
	/** 命令的执行内容，用于包含子任务可以不填 */
	command?: string | string[];
	/** 子任务列表 */
	actions?: ICommand[];
}
```
<details>
<summary>查看配置示例</summary>

```yaml
# .vscode/commands.yaml
- name: LayaAir 开发
  actions:
  - name: dev
    description: 启动开发编译服务
    command: yarn concurrently -k "yarn serve" "yarn webpack --config laya/webpack.config.js --watch --env esbuild=true entry=develop ws=3102"
  - name: dev:full
    description: 编译全部平台组件
    command: yarn concurrently -k "yarn serve" "yarn webpack --config laya/webpack.config.js --watch --env esbuild=true entry=all ws=3102"
  - name: 生成 Laya3D 代码
    description: 从 Unity 导出的资源生成绑定代码
    command: node tools/bin/cli.js laya laya/laya3d.yaml
  - name: FairyGUI 导出
    description: 需要激活专业版本 FairyGUI
    command: node tools/bin/cli.js fairygui laya

- name: CLI 工具
  actions:
  - name: dev
    description: 启动编译服务
    command: yarn webpack --config tools/webpack.config.js --watch --env esbuild=true target=ES2020

- name: Unity 开发
  actions:
  - name: dev
    description: 启动开发编译服务
    command: yarn concurrently -k "yarn serve" "yarn webpack --config unity/webpack.config.js --watch --env ws=3102 esbuild=true entry=dev"
  - name: dev:full
    description: 启动编译全部服务
    command: yarn concurrently -k "yarn serve" "yarn webpack --config laya/webpack.config.js --watch --env esbuild=true entry=all ws=3102"
```
</details>
