# Hono Validation and Error Handling

Date: 2026-08-31

## Decision

Use **Zod 4 + `@hono/zod-validator`** for request validation.

This is the narrowest fit for the stated requirement to use Zod before parameterized route handlers. It is Hono's documented Zod integration, supports the installed Hono 4.13.5, is actively maintained, and has substantially more direct ecosystem usage than the newer generic adapter. Its default HTTP 400 failure response is acceptable because non-200 response bodies are not part of the stable application contract.

The initial `GET /api/health` route can use a strict empty query schema to establish the middleware convention and reject unsupported query parameters. Future endpoints should validate their actual JSON, query, path, header, cookie, or form inputs.

## Hono 4.13.5 Behavior

### Unmatched routes

Hono handles an unmatched route itself, but its default is plain text `404 Not Found` with HTTP 404. The exact default is visible in the [Hono 4.13.5 source](https://github.com/honojs/hono/blob/v4.13.5/src/hono-base.ts), and the official API documents [`app.notFound()`](https://hono.dev/docs/api/hono#not-found) as the customization point.

Consequently, Hono provides the required transport fallback. A project that wanted stable JSON for non-200 responses could configure `app.notFound` explicitly, for example:

```ts
app.notFound((c) =>
  c.json(
    {
      status: 'NOT_FOUND',
      data: null,
      message: 'Resource not found',
    },
    404,
  ),
)
```

### Uncaught errors

Hono catches handler and middleware errors. Its [4.13.5 default error handler](https://github.com/honojs/hono/blob/v4.13.5/src/hono-base.ts) preserves the response from errors exposing `getResponse()` (including `HTTPException`); otherwise it logs the error and returns plain text `Internal Server Error` with HTTP 500. [`app.onError()`](https://hono.dev/docs/api/hono#error-handling) replaces that handler.

A JSON-envelope handler should preserve `HTTPException.status`; otherwise malformed input that Hono correctly classifies as HTTP 400 can accidentally become HTTP 500:

```ts
import { HTTPException } from 'hono/http-exception'

app.onError((error, c) => {
  const httpStatus = error instanceof HTTPException ? error.status : 500

  return c.json(
    {
      status: httpStatus === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      data: null,
      message: httpStatus === 500 ? 'Internal server error' : error.message,
    },
    httpStatus,
  )
})
```

This is compatible with the clarified contract: handled business outcomes can use HTTP 200 and an internal `status`, while routing, malformed transport input, and uncaught failures retain meaningful 4xx/5xx HTTP status codes.

### Request validation

Request schema validation is not automatic. Hono's official [validation guide](https://hono.dev/docs/guides/validation) defines validation as middleware placed before the final route handler. Supported targets include `json`, `query`, `header`, `param`, `cookie`, and `form`; the handler reads parsed output through `c.req.valid(target)`.

The official [`@hono/zod-validator` usage](https://github.com/honojs/middleware/tree/main/packages/zod-validator) is:

```ts
app.post('/author', zValidator('json', schema), (c) => {
  const input = c.req.valid('json')
  // input has the schema's parsed output type
})
```

Therefore the user's recollection is correct: Zod validation can and should run as route middleware before business logic. For JSON/form targets the request must also carry the matching `Content-Type`; Hono's [core validator source](https://github.com/honojs/hono/blob/v4.13.5/src/validator/validator.ts) otherwise supplies an empty object. Malformed JSON is raised as an `HTTPException(400)` by that same core middleware.

### Validator failure behavior

`@hono/zod-validator` calls Zod's asynchronous safe parser. On schema failure, its [published implementation](https://github.com/honojs/middleware/blob/main/packages/zod-validator/src/index.ts) directly returns `c.json(result, 400)`, where `result` is Zod's `{ success: false, error }`. It does **not** throw and therefore does not flow through `app.onError`.

Its documented hook can enforce a custom error envelope when an application requires one:

```ts
const validateJson = <Schema extends z.ZodType>(schema: Schema) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          status: 'INVALID_INPUT',
          data: null,
          message: 'Invalid request',
        },
        400,
      )
    }
  })
```

Foundry does not use that hook because validation failures are transport-level responses and only their HTTP 400 status is stable. The frontend must not expose raw Zod issues as toast text.

## Library Comparison

### Measurement method

Measurements were taken on **2026-08-31**. npm volume uses one shared completed week, **2026-08-23 through 2026-08-29**, from npm's official downloads API. Stars are the counts displayed by the official GitHub repositories on the measurement date. Versions and publish times come from npm registry metadata; latest repository activity comes from the official GitHub commit feeds.

npm downloads include transitive installs and are an ecosystem-footprint signal, not proof of intentional use. Direct adoption is therefore evidenced separately with current projects' own GitHub manifests.

| Combination | npm downloads/week | GitHub stars | Latest package / maintenance | Direct adoption evidence | Assessment |
| --- | ---: | ---: | --- | --- | --- |
| **Zod + `@hono/zod-validator`** | [`zod`: 274,747,331](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/zod); [`@hono/zod-validator`: 3,922,196](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/%40hono%2Fzod-validator) | [Zod: 43,712](https://github.com/colinhacks/zod); [Hono middleware: 976](https://github.com/honojs/middleware) | [`zod` 4.5.4](https://registry.npmjs.org/zod), published 2026-08-29; [`@hono/zod-validator` 0.9.0](https://registry.npmjs.org/%40hono%2Fzod-validator), published 2026-07-15. Latest commits: [Zod 2026-08-30](https://github.com/colinhacks/zod/commits/main.atom), [Hono middleware 2026-08-31](https://github.com/honojs/middleware/commits/main.atom). | The current [Hollo manifest](https://github.com/fedify-dev/hollo/blob/main/package.json) directly declares Hono, Zod 4, and `@hono/zod-validator` 0.9.0. The current [LikeC4 playground manifest](https://github.com/likec4/likec4/blob/master/apps/playground/package.json) independently declares the same integration through its workspace catalog. | Best fit. Zod-specific, officially documented, current, and the most broadly adopted adapter measured. |
| **Zod + `@hono/standard-validator`** | [`zod`: 274,747,331](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/zod); [`@hono/standard-validator`: 769,743](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/%40hono%2Fstandard-validator) | [Zod: 43,712](https://github.com/colinhacks/zod); [Hono middleware: 976](https://github.com/honojs/middleware) | [`@hono/standard-validator` 0.4.0](https://registry.npmjs.org/%40hono%2Fstandard-validator), published 2026-08-05; the middleware repository's latest commit was 2026-08-31. | [Documenso's current auth manifest](https://github.com/documenso/documenso/blob/main/packages/auth/package.json) directly declares Zod and `@hono/standard-validator`; its [Remix app manifest](https://github.com/documenso/documenso/blob/main/apps/remix/package.json) directly declares Hono and the adapter. [Mastra's deployer manifest](https://github.com/mastra-ai/mastra/blob/main/packages/deployer/package.json) also declares Zod, Hono, and the adapter. | Technically sound and gives schema-library portability. The extra abstraction has no present payoff because this project explicitly chose Zod. Its default failure is still a non-envelope HTTP 400 and needs a hook. |
| **Valibot + `@hono/standard-validator`** | [`valibot`: 18,519,867](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/valibot); [`@hono/standard-validator`: 769,743](https://api.npmjs.org/downloads/point/2026-08-23:2026-08-29/%40hono%2Fstandard-validator) | [Valibot: 8,973](https://github.com/open-circle/valibot); [Hono middleware: 976](https://github.com/honojs/middleware) | [`valibot` 1.4.2](https://registry.npmjs.org/valibot), published 2026-06-28; latest [Valibot commit 2026-08-20](https://github.com/open-circle/valibot/commits/main.atom). | Hono's official [standard-validator README](https://github.com/honojs/middleware/tree/main/packages/standard-validator) demonstrates a Valibot schema. The current [hono-openapi manifest](https://github.com/rhinobase/hono-openapi/blob/main/package.json) directly declares Valibot and `@hono/standard-validator` for its integration and tests. | Modern and viable, especially where modular bundle size is a deciding constraint. It contradicts the explicit Zod requirement and has materially less measured adoption, so it is not the choice here. |

The two Hono adapters share the [same actively maintained monorepository](https://github.com/honojs/middleware). `@hono/zod-validator` 0.9.0 accepts Zod `^3.25.0 || ^4.0.0` and Hono `>=4.11.2`; `@hono/standard-validator` 0.4.0 accepts Hono `>=4.11.2` plus a Standard Schema implementation. Both therefore support Foundry's Hono 4.13.5. The generic adapter's [source](https://github.com/honojs/middleware/blob/main/packages/standard-validator/src/index.ts) confirms that it accepts Standard Schema schemas, including the official Zod and Valibot examples, and returns `{ data, error, success: false }` with HTTP 400 unless a hook overrides it.

## Implementation Consequences

- Add direct runtime dependencies on `zod` 4 and `@hono/zod-validator` 0.9.
- Use `zValidator` directly for request targets; its HTTP 400 body is not a stable application contract.
- Keep successful business responses on HTTP 200 with `status: 'SUCCESS'`; keep route misses, malformed requests, validation failures, and uncaught errors on their meaningful 4xx/5xx transport statuses unless the product explicitly classifies a particular validation result as a handled business outcome.
- Keep Hono's default `notFound` and error handlers; frontend code branches on their HTTP status without consuming the body.
- Test the exact envelope for health success and test only the raw HTTP status for schema-invalid input and unmatched routes.
- Reconsider `@hono/standard-validator` only if the project gains a concrete need to swap or mix schema libraries. Portability alone is not enough reason to add an abstraction today.

## Sources

- [Hono 4.13.5 application source](https://github.com/honojs/hono/blob/v4.13.5/src/hono-base.ts)
- [Hono 4.13.5 core validator source](https://github.com/honojs/hono/blob/v4.13.5/src/validator/validator.ts)
- [Hono application API](https://hono.dev/docs/api/hono)
- [Hono validation guide](https://hono.dev/docs/guides/validation)
- [`@hono/zod-validator` official README and source](https://github.com/honojs/middleware/tree/main/packages/zod-validator)
- [`@hono/standard-validator` official README and source](https://github.com/honojs/middleware/tree/main/packages/standard-validator)
- [npm registry metadata](https://registry.npmjs.org/) and [npm downloads API](https://github.com/npm/registry/blob/main/docs/download-counts.md)
