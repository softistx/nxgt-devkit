---
'@nxgt/msw-graphql': minor
---

Serve GraphQL subscriptions over SSE: a subscription asked with `Accept: text/event-stream` runs with the schema's async-iterator resolvers and answers graphql-sse `next` / `complete` events, a refusal before the stream with a real HTTP status (and `extensions.http.headers`), and an error payload mid-stream. `control.reset()` ends live streams; `closeStreams(state)` does it alone. `MockState` gains `streams`.
