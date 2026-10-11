import { addMocksToSchema, type IMocks } from '@graphql-tools/mock';
import {
	type IExecutableSchemaDefinition,
	makeExecutableSchema,
} from '@graphql-tools/schema';
import type { GraphQLSchema } from 'graphql';

export type MockSchemaOptions<TContext = unknown> = {
	/** The SDL, from `loadSdl()` or a string. */
	typeDefs: IExecutableSchemaDefinition<TContext>['typeDefs'];
	/** Hand-written resolvers: what they return wins over a generated mock. */
	resolvers?: IExecutableSchemaDefinition<TContext>['resolvers'];
	/** Generated values by type name, typically one per custom scalar. */
	mocks?: IMocks;
};

/**
 * An executable schema whose resolvers answer where they exist and whose
 * every other field is generated from its type: `makeExecutableSchema`, then
 * `addMocksToSchema` with `preserveResolvers`.
 */
export function buildMockSchema<TContext = unknown>(
	options: MockSchemaOptions<TContext>,
): GraphQLSchema {
	const { typeDefs, resolvers, mocks } = options;
	return addMocksToSchema({
		schema: makeExecutableSchema<TContext>({ typeDefs, resolvers }),
		mocks,
		preserveResolvers: true,
	});
}
