import { expect, test } from 'bun:test';
import { graphql } from 'graphql';
import { buildMockSchema } from './index';

const typeDefs = `
	scalar Date
	type Query { a: String, d: Date, n: Int }
`;

test('resolvers win and everything else is generated', async () => {
	const schema = buildMockSchema({
		typeDefs,
		mocks: { Date: () => '1999-12-31' },
		resolvers: { Query: { a: () => 'mine' } },
	});
	const { data } = await graphql({ schema, source: '{ a d n }' });
	expect(data?.a).toBe('mine');
	expect(data?.d).toBe('1999-12-31');
	expect(typeof data?.n).toBe('number');
});
