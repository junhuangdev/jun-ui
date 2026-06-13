# Runtime App Example

This example shows the runtime app lane.

Use it when the UI must read or write server state while the user is using it. The target project owns the server and API. `jun-ui` owns the Design System contract: Semi components, Semi tokens, delivery variables, page composition, states, and verification discipline.

## Run

```bash
node examples/runtime-app/server.mjs
```

Then open:

```text
http://127.0.0.1:4178
```

## API

```bash
curl http://127.0.0.1:4178/api/state
curl -X POST http://127.0.0.1:4178/api/refresh
```

The POST endpoint mutates in-memory server state. The React UI calls both endpoints, so the example is not just a static artifact served over HTTP.

## Contract

- Uses a project-owned runtime server.
- Uses Semi Design System in the client.
- Loads Semi `--semi-*` tokens from the centralized Semi CSS and `--jun-ui-*` delivery variables from `tokens/jun-ui.tokens.json`.
- Shows loading, error, and saved runtime states.
- Proves server-backed behavior through `/api/state` and `/api/refresh`.
