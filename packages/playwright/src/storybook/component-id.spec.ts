import { describe, expect, test } from 'bun:test';
import { componentId, titleToComponentId } from './component-id';

describe('componentId', () => {
	test('drops the story part of a story id', () => {
		expect(componentId('form-fields-textfield--default')).toBe(
			'form-fields-textfield',
		);
	});
});

describe('titleToComponentId', () => {
	test.each([
		['Form fields/TextField', 'form-fields-textfield'],
		['Buttons & actions/Button', 'buttons-actions-button'],
		['Rich widgets/Charts/BarChart', 'rich-widgets-charts-barchart'],
		[
			'Data table, filter & lists/DataTable',
			'data-table-filter-lists-datatable',
		],
	])('%s → %s', (title, id) => {
		expect(titleToComponentId(title)).toBe(id);
	});
});
