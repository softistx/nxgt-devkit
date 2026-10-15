import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, within } from 'storybook/test';

type Args = { label: string };

const meta = {
	title: 'Fixture/Button',
	render: ({ label }) => {
		const button = document.createElement('button');
		button.textContent = label;
		return button;
	},
	args: { label: 'Save' },
} satisfies Meta<Args>;
export default meta;

type Story = StoryObj<Args>;

export const Rendered: Story = {};

export const Played: Story = {
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).getByRole('button', { name: 'Save' }),
		).toBeVisible();
	},
};

export const Previewed: Story = { tags: ['preview'] };
