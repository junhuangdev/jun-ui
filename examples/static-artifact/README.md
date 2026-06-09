# Static Artifact Example

This example shows the static artifact lane.

Use it when the requested UI can be generated from build-time data, local snapshots, reports, or bundled client logic, and the final review target is a `file://` openable artifact.

## Build

```bash
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs build examples/static-artifact/jun-ui.page.json
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page examples/static-artifact/jun-ui.page.json --strict
```

The config writes the artifact to:

```text
/Users/jun/workspace/jun-ui/dist/examples/static-artifact/index.html
```

## Contract

- Uses the centralized Builder.
- Produces relative assets.
- Opens through `file://`.
- Preserves the token and native-control checks in `verify-page --strict`.
