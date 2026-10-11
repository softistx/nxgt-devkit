import { expect, test } from 'bun:test';
import { statusOfErrors } from './override';

test('the status comes from the first error that carries one', () => {
	expect(
		statusOfErrors([
			null,
			'text',
			{ message: 'a' },
			{ extensions: { http: { status: 418 } } },
			{ extensions: { http: { status: 500 } } },
		]),
	).toBe(418);
});

test('no usable status: undefined', () => {
	expect(statusOfErrors(undefined)).toBeUndefined();
	expect(statusOfErrors([])).toBeUndefined();
	expect(
		statusOfErrors([
			{ extensions: { http: { status: '404' } } },
			{ extensions: null },
		]),
	).toBeUndefined();
});
