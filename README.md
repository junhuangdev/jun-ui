# jun-ui

`jun-ui` is Jun's installable AI page-building Skill, Design System, and Builder.

Its purpose is to let AI enter any target project, use Semi Design System with Context7 CLI + Skills and Figma guidance, and create the right product UI output for the request. Static pages still write back final file-openable artifacts. Server-backed web systems use the same Design System contract inside a target-project-owned runtime app.

## Positioning

`jun-ui` separates the problem from the solution.

| Layer | Definition |
| --- | --- |
| Problem | AI needs a fast, stable way to create high-quality product UI inside a target project that Jun can directly inspect and use. |
| Solution | Installable `jun-ui-page-delivery` Skill + Semi Design System + Context7 CLI + Skills + Figma + centralized Builder + runtime UI contract. |
| Acceptance | Static artifacts open through `file://`; runtime apps work through their project-owned server URL. |

This repository is not a hand-built component library. It is the source of truth for the installable Skill, the Design System rules, the Builder command, and the artifact contract that lets AI produce pages in other projects.

## Core Stack

| Part | Role |
| --- | --- |
| Semi Design System | Primary UI component system for product-grade pages and interactions. |
| Context7 CLI + Skills | Required AI documentation mode for checking Semi APIs, examples, and component usage through `ctx7` before implementation. |
| Figma | Design intent, review surface, and design-system bridge when visual work needs a shared source. |
| Builder | Centralized `jun-ui build` command that compiles page intent into directly openable artifacts. |
| Runtime UI contract | Shared rules for using the same Design System inside target-project-owned web apps. |
| `jun-ui-page-delivery` Skill | Installable AI entrypoint for choosing static artifact vs runtime app, using Semi correctly, and validating the result. |

## Delivery Lanes

`jun-ui` has two valid delivery lanes:

| Lane | When to use | Acceptance |
| --- | --- | --- |
| Static artifact | Reports, dashboards, workbenches, token pages, local tools, and snapshot-backed prototypes. | Built artifact opens through `file://` and passes `verify-page --strict`. |
| Runtime app | UI that needs server reads or writes while the user is using it. | Project-owned local or deployed URL works, and runtime behavior is verified. |

Read `docs/delivery-lanes.md` before changing lane routing, examples, or Skill instructions.

## Delivery Contract

Every generated page must optimize for the final user-visible result:

- Use Semi Design System as the default component system.
- Use Context7 CLI + Skills before material Semi API or pattern decisions.
- Treat `ctx7` as the default documentation execution path. MCP is optional.
- Verify `ctx7`, `context7-docs`, and `context7-cli` with `jun-ui doctor --strict`.
- Stop before Semi implementation if neither Context7 CLI + Skills nor an approved Context7 MCP path is available.
- Use Figma when the task starts from a visual design, needs design review, or should sync product UI intent.
- Use the Builder instead of making every target project own Node, Semi, and build dependencies when the request fits the static artifact lane.
- Use the target project's runtime stack when the request needs server-backed reads, writes, auth, uploads, jobs, or shared state.
- Allow compilation when it improves speed or quality.
- For static artifacts, produce a final artifact that opens with `file://`.
- For runtime apps, verify the local or deployed URL and the relevant server-backed behavior.

## AI Skill

The active Skill entrypoint is:

```text
skills/jun-ui-page-delivery/SKILL.md
```

Local Codex install path:

```text
/Users/jun/.codex/skills/jun-ui-page-delivery
```

Use this Skill for Jun page work before choosing templates, package setup, or implementation details.

## Builder

The Builder command is:

```bash
jun-ui build <config.json>
```

From this checkout:

```bash
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs build <config.json>
```

The target project provides page intent, data, and an output path. `jun-ui` owns the builder environment and writes back the final file-openable artifact.

Current Builder output uses Semi Design System components bundled by Vite into classic IIFE JavaScript and CSS. The generated HTML keeps relative asset paths and includes a static fallback so the page is nonblank even before JavaScript runs through `file://`.

The default output is `index.html` plus `assets/`, but a target project can set `fileName`, `assetsDir`, and `actions` in its page config. This supports workflow entry pages such as `site/today.html` with `site/today-assets/` while preserving sibling files like `site/today.json`.

For complex existing workbenches, the Builder also exposes:

```bash
jun-ui bundle-app <config.json>
```

`bundle-app` takes a target project's HTML shell, ESM entry, CSS files, and optional static data scripts, then writes a file-openable artifact with classic bundled JavaScript and relative assets. This keeps React, Vite, and build tooling in `jun-ui` instead of the target project.

After a page is built, run the postflight verifier:

```bash
jun-ui verify-page <config-or-artifact> --strict
```

From this checkout:

```bash
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page <config-or-artifact> --strict
```

`verify-page` checks the final artifact shape and Design System token usage. In strict mode it rejects handwritten colors in target project source styles or artifact-only CSS, so generated pages do not drift away from `--jun-ui-*` tokens.

Repository-owned generated pages follow the same rule. A local HTTP server is acceptable for temporary preview, but final acceptance for `jun-ui` artifacts such as the token console is the built file-openable output, not the server route.

The token console command is:

```bash
jun-ui tokens
```

From this checkout:

```bash
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs tokens
```

It writes the mixed human-and-AI token reference to `dist/tokens/index.html` with relative assets.

## Examples

This repository keeps three visible examples for the two-lane contract:

| Example | Lane | How to try it |
| --- | --- | --- |
| `examples/static-artifact` | Static artifact | Run `jun-ui build examples/static-artifact/jun-ui.page.json`, then open `dist/examples/static-artifact/index.html`. |
| `examples/runtime-app` | Runtime app | Run `node examples/runtime-app/server.mjs`, then open `http://127.0.0.1:4178`. |
| `dist/tokens/index.html` | Static artifact | Run `jun-ui tokens`, then open the token console through `file://`. |

## Context7 Setup

Install the AI-side documentation path once:

```bash
npm install -g ctx7@latest
ctx7 skills install /upstash/context7 context7-docs --global --universal --yes
ctx7 skills install /upstash/context7 context7-cli --global --universal --yes
jun-ui doctor --strict
```

Context7 is not added to browser runtime output or target project dependencies.

## Documents

- `docs/problem-and-solution.md`: separates the page-building problem from the selected solution.
- `docs/delivery-lanes.md`: defines static artifact and runtime app lanes.
- `docs/design-system.md`: defines the current Design System roles, boundaries, and delivery contract.
- `docs/builder.md`: defines the centralized Builder command and target project boundary.
- `docs/context7.md`: defines the required `ctx7`, `context7-docs`, and `context7-cli` setup and verification path.
- `skills/jun-ui-page-delivery/references/delivery-contract.md`: concise Skill reference for artifact requirements.
- `skills/jun-ui-page-delivery/references/builder-contract.md`: concise Skill reference for `jun-ui build`.

## Verification

```bash
npm test
```

The validation script checks that active documentation and Skill instructions reflect the current Semi + Context7 + Figma direction, and that removed legacy entrypoints are not present in the active repository.

For Builder or repository-owned artifact changes, also generate the relevant output and inspect the built HTML folder as a file-openable artifact. Server preview can help during development, but it does not replace the file protocol contract. For target project pages, run `jun-ui verify-page <config-or-artifact> --strict` before reporting delivery.
