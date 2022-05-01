import colors from 'chalk';
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
