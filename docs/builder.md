# jun-ui Builder

The jun-ui Builder is the centralized build surface for the installable `jun-ui` Skill.

It lets AI use the jun-ui Design System, Semi Design System, Context7 CLI + Skills, and Figma rules from any target project without making that target project own the frontend toolchain.

## Command

```bash
jun-ui build <config.json>
```

The local repository command is:

```bash
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs build <config.json>
```

## Responsibility

| Part | Owner |
| --- | --- |
| Node, npm, build tooling | jun-ui Builder |
| Semi Design System usage | jun-ui Skill, Context7, and Builder profile |
| Figma design review path | jun-ui Skill |
| Page intent and source data | target project |
| Final file-openable artifact | written back to target project |

## Contract

- Use `jun-ui build` from a target project, global Skill, or project-local Skill install.
- Keep the target project thin: it provides config, data, and the output location.
- Produce a final artifact that opens through `file://`.
- Keep asset paths relative so the output folder is movable.
- Do not add Context7, Figma, or builder dependencies to browser runtime output.
- Verify `ctx7`, `context7-docs`, and `context7-cli` with `jun-ui doctor --strict`.
- Stop before Semi implementation if Context7 CLI + Skills through `ctx7` is unavailable.

## Context7 Gate

The Builder environment should pass:

```bash
jun-ui doctor --strict
```

This checks the installable Builder root, the `ctx7` CLI, and the two Context7 Skills used by AI: `context7-docs` and `context7-cli`.

If the check fails, install the required AI-side Context7 path before implementing substantial Semi Design System pages:

```bash
npm install -g ctx7@latest
ctx7 skills install /upstash/context7 context7-docs --global --universal --yes
ctx7 skills install /upstash/context7 context7-cli --global --universal --yes
```

## Current Builder Slice

The current Builder uses Vite library mode to bundle React and Semi Design System into classic IIFE JavaScript plus CSS. It writes a final `index.html` with relative `./assets/` paths and a static fallback inside `#jun-ui-root`, so the page is visible through `file://` before React takes over.

The `jun-ui build` interface stays stable:

```bash
jun-ui build <config.json> [--out <dir>] [--project-root <dir>]
```

Rules:

- `config.out` resolves from the target project root when provided, otherwise from the config file directory.
- `--out` overrides `config.out` and resolves from the current working directory, or from `--project-root` when provided.
- Vite, React, and Semi dependencies stay in `jun-ui`; target projects receive only built HTML, CSS, and JavaScript.
- The browser output must not require module scripts, a dev server, Context7, or Figma.
