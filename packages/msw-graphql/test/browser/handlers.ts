import { bearerToken, createExecutor, graphqlEndpoint } from '../../src';
import { schema } from '../schema';

// The real executor against the specs' schema: what an app's handlers are.
const execute = createExecutor({
	schema,
	context: (request) => ({ token: bearerToken(request) }),
});

export const handlers = [graphqlEndpoint('*/graphql', execute)];
