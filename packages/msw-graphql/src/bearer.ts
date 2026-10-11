/** The token of an `Authorization: Bearer <token>` header, else null. */
export function bearerToken(request: Request): string | null {
	return (
		request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1] ?? null
	);
}
