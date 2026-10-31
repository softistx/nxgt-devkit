---
"@nxgt/msw-graphql": minor
---

Widen the optional peers to the newest `@graphql-tools` majors: `@graphql-tools/mock` `^9.1.0 || ^10.0.0` and `@graphql-tools/schema` `^10.0.0 || ^11.0.0`. The `/schema` entry is tested against mock 10 and schema 11; the older majors stay accepted, as the API it uses did not change, but are not measured.
