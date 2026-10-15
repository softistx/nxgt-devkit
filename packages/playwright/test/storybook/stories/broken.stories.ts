import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, within } from 'storybook/test';

const meta = {
	title: 'Fixture/Broken',
	tags: ['expected-failure'],
	render: () => {
		const p = document.createElement('p');
		p.textContent = 'Present text';
		return p;
	},
} satisfies Meta;
export default meta;

export const Broken: StoryObj = {
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).getByText('Text that is not rendered anywhere'),
		).toBeVisible();
	},
};
