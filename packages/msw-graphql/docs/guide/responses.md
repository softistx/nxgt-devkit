# Responses

Small `Response` builders for the msw handlers you write by hand beside the
GraphQL one: a REST endpoint, a token refresh, a health check.

```ts
import { http } from 'msw';
import { notFound, ok, unauthorized } from '@nxgt/msw-graphql/response';

export const rest = [
	http.get('https://api.example.com/health', () => ok({ up: true })),
	http.post('https://auth.example.com/refresh', () => unauthorized('Session expired.')),
	http.get('https://api.example.com/files/:id', () => notFound('No such file.')),
];
```

| Export | Status | Body |
| --- | --- | --- |
| `ok(body)` | 200 | `body` as JSON |
| `created(body)` | 201 | `body` as JSON |
| `noContent()` | 204 | none |
| `badRequest(message)` | 400 | `{ timestamp, status, message }` |
| `unauthorized(message)` | 401 | same shape |
| `forbidden(message)` | 403 | same shape |
| `notFound(message)` | 404 | same shape |
| `graphqlErrors(errors, status = 200)` | `status` | `{ errors }` |

`{ timestamp, status, message }` is the shape of a REST error (`timestamp` is
a `Date`, serialised as an ISO string).

`graphqlErrors` is for a hand-written GraphQL handler that must answer an
error without going through the executor:

```ts
import { graphqlErrors } from '@nxgt/msw-graphql/response';

graphqlErrors([{ message: 'forbidden', extensions: { code: 'FORBIDDEN', http: { status: 403 } } }], 403);
```

There are no JWT helpers: they would carry each app's issuer, secret and
audience. To fail or override a GraphQL operation in a test, use the
[control](control.md) instead.
