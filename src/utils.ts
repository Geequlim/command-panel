import colors from 'chalk';
import * as glob from 'fast-glob';
import * as path from 'path';
import * as fs from 'fs';

export function wait(duration: number) {
	return new Promise(resolve => setTimeout(resolve, duration));
}

export const TextStyle = {
	green(...args: any[]) {
		return colors.green(args.join(' '));
	},
	red(...args: any[]) {
		return colors.red(args.join(' '));
	},
	yellow(...args: any[]) {
		return colors.yellow(args.join(' '));
	},
	grey(...args: any[]) {
		return colors.grey(args.join(' '));
	},
	bold(...args: any[]) {
		return colors.bold(args.join(' '));
	},
	default(...args: any[]) {
		return args.join(' ');
	}
};

//#region path and file
interface NormalizedFileFilter {
	include?: string | string[];
	exclude?: string | string[];
}
export type FileFilter = NormalizedFileFilter | string[] | string;
export type FileFilterOptions = {
	root?: string;
	files?: FileFilter;
	include?: string | string[];
	exclude?: string | string[];
};

export function normalizePattern(pattern: string, root?: string) {
	if (root) pattern = path.join(root, pattern);
	if (fs.existsSync(pattern) && fs.statSync(pattern).isDirectory()) {
		pattern = pattern + '/**/*';
	}
	return normalizePath(pattern).replace(/\s\(\d+\)/, '*'); // <- Windows 自动命名 'xxx (1)' 时不能精确匹配，这里换成通配符
}

export function normalizePath(path: string) {
	return path.replace(/\\/g, '/').replace(new RegExp('//', 'g'), '/');
}

export function getFiles(rule: FileFilter | FileFilterOptions, root?: string) {
	if (typeof rule === 'object' && rule) {
		root = root || (rule as FileFilterOptions).root;
		if ((rule as FileFilterOptions).files) {
			(rule as any) = (rule as FileFilterOptions).files;
		}
	}
	const filter = getNormalizedFileFilter(rule as FileFilter, root);
	const exclude = glob.sync(filter.exclude);
	let files = glob.sync(filter.include).filter(f => exclude.indexOf(f) == -1);
	files = files.map(p => normalizePath(p));
	return files;
}

export function mergeFileFilters(...filters: FileFilter[]) {
	const ret: { include: string[], exclude: string[]; } = { include: [], exclude: [] };
	for (const f of filters) {
		const ff = getNormalizedFileFilter(f);
		ret.include = ret.include.concat(ff.include);
		ret.exclude = ret.exclude.concat(ff.exclude);
	}
	ret.include = Array.from(new Set<string>(ret.include));
	ret.exclude = Array.from(new Set<string>(ret.exclude));
	return ret;
}

export function getNormalizedFileFilter(pattern: string | string[] | NormalizedFileFilter | { files: string | string[]; }, root?: string) {
	const ret: { include: string[], exclude: string[]; } = { include: [], exclude: [] };
	if (pattern && typeof pattern === 'object' && (pattern as { files: string | string[]; }).files) {
		pattern = (pattern as { files: string | string[]; }).files;
	}

	if (Array.isArray(pattern)) {
		ret.include = pattern.filter(p => !p.startsWith('!')).map(p => normalizePattern(p, root));
		ret.exclude = pattern.filter(p => p.startsWith('!')).map(p => normalizePattern(p.substring(1, p.length), root));
	} else if (typeof pattern === 'string') {
		if (!pattern.startsWith('!')) ret.include = [normalizePattern(pattern, root)];
	} else if (pattern && typeof pattern === 'object') {
		const np = (pattern as NormalizedFileFilter);
		if (np.include) {
			if (typeof np.include === 'string') {
				ret.include = [normalizePattern(np.include, root)];
			} else if (Array.isArray(np.include)) {
				ret.include = np.include.map(p => normalizePattern(p, root));
			}
		}
		if (np.exclude) {
			if (typeof np.exclude === 'string') {
				ret.exclude = [normalizePattern(np.exclude, root)];
			} else if (Array.isArray(np.exclude)) {
				ret.exclude = np.exclude.map(p => normalizePattern(p, root));
			}
		}
	}
	ret.exclude = ret.exclude.concat(ret.include.filter(p => p.startsWith('!')).map(p => p.substring(1, p.length)));
	ret.include = ret.include.filter(p => !p.startsWith('!'));
	return ret;
}
//#endregion
