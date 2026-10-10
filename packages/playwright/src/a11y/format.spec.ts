import { describe, expect, test } from 'bun:test';
import { formatViolations, type ViolationSummary } from './format';

const imageAlt: ViolationSummary = {
	id: 'image-alt',
	impact: 'critical',
	help: 'Images must have alternative text',
	helpUrl: 'https://dequeuniversity.com/rules/axe/4.13/image-alt',
	nodes: [
		{ html: '<img src="a.png">', target: ['img:nth-child(1)'] },
		{ html: '<img src="b.png">', target: ['img:nth-child(2)'] },
	],
};

describe('formatViolations', () => {
	test('one block per rule: id, impact, help, URL, then each node', () => {
		expect(
			formatViolations([imageAlt], {
				url: 'http://localhost/',
				tags: ['wcag2a', 'wcag2aa'],
			}),
		).toBe(
			[
				'1 accessibility violation on http://localhost/ (wcag2a, wcag2aa):',
				'',
				'1. image-alt [critical] Images must have alternative text',
				'   https://dequeuniversity.com/rules/axe/4.13/image-alt',
				'   - img:nth-child(1)',
				'     <img src="a.png">',
				'   - img:nth-child(2)',
				'     <img src="b.png">',
			].join('\n'),
		);
	});

	test('shows the first nodes and counts the rest', () => {
		const message = formatViolations([imageAlt], { maxNodes: 1 });
		expect(message).toContain('   - img:nth-child(1)');
		expect(message).not.toContain('img:nth-child(2)');
		expect(message).toContain('   … and 1 more node');
		expect(message.split('\n')[0]).toBe('1 accessibility violation:');
	});

	test('numbers several rules and pluralises', () => {
		const message = formatViolations([
			imageAlt,
			{
				...imageAlt,
				id: 'label',
				impact: null,
				help: 'Form elements must have labels',
			},
		]);
		expect(message.split('\n')[0]).toBe('2 accessibility violations:');
		expect(message).toContain(
			'2. label [unknown impact] Form elements must have labels',
		);
	});

	test('frames and shadow roots in a target, long HTML cut to one line', () => {
		const message = formatViolations([
			{
				...imageAlt,
				nodes: [
					{
						html: `<img\n  src="${'x'.repeat(300)}">`,
						target: ['iframe#app', ['my-card', 'img']],
					},
				],
			},
		]);
		expect(message).toContain('   - iframe#app -> my-card >>> img');
		const html = message.split('\n').at(-1) ?? '';
		expect(html.startsWith('     <img src="xxx')).toBe(true);
		expect(html.trim().length).toBe(200);
		expect(html.endsWith('…')).toBe(true);
	});
});
