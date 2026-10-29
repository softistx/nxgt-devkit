import { GraphQLHttpError } from '../src/errors';
import { buildMockSchema } from '../src/schema';

/** A tiny API for the specs: two queries, one mutation, a custom scalar. */
export const typeDefs = /* GraphQL */ `
	scalar Date
	type Student { id: ID!, name: String!, born: Date!, grade: Int! }
	type Query {
		student(id: ID!): Student
		students: [Student!]!
		whoami: String
		boom: String
		plain: String
	}
	type Mutation { removeStudent(id: ID!): Boolean! }
	type Event { type: String!, text: String }
	type Subscription { events: Event!, denied: Event!, flaky: Event! }
`;

export const schema = buildMockSchema<{ token: string | null }>({
	typeDefs,
	mocks: { Date: () => '2020-01-01' },
	resolvers: {
		Subscription: {
			events: {
				subscribe: async function* () {
					yield { events: { type: 'delta', text: 'hi' } };
					yield { events: { type: 'delta', text: ' there' } };
				},
			},
			denied: {
				subscribe: () => {
					throw new GraphQLHttpError('rate-limited', 429, {
						http: { status: 429, headers: { 'retry-after': '30' } },
					});
				},
			},
			flaky: {
				subscribe: async function* () {
					yield { flaky: { type: 'delta', text: 'one' } };
					throw new Error('upstream lost');
				},
			},
		},
		Query: {
			student: (_root, { id }: { id: string }) => {
				if (id === '404') throw new GraphQLHttpError('not-found', 404);
				return { id, name: 'Ada' };
			},
			whoami: (_root, _args, context) => context.token,
			plain: () => {
				throw new Error('plain failure');
			},
			boom: () => {
				throw new GraphQLHttpError('teapot', 418, { hint: 'tea' });
			},
		},
	},
});

export function post(
	body: unknown,
	headers: Record<string, string> = {},
): Request {
	return new Request('http://api.test/graphql', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body),
	});
}
