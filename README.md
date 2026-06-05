# jun-ui

`jun-ui` is Jun's installable AI page-building Skill, Design System, and Builder.

Its purpose is to let AI enter any target project, use Semi Design System with Context7 CLI + Skills and Figma guidance, and write back a final file-openable page artifact. The target project should not have to own the frontend toolchain.

## Positioning

`jun-ui` separates the problem from the solution.

| Layer | Definition |
| --- | --- |
| Problem | AI needs a fast, stable way to create high-quality pages inside a target project that Jun can directly inspect and use. |
| Solution | Installable `jun-ui-page-delivery` Skill + Semi Design System + Context7 CLI + Skills + Figma + centralized Builder. |
| Acceptance | A built page artifact opens through `file://`, renders correctly, and preserves expected interactions. |

This repository is not a hand-built component library. It is the source of truth for the installable Skill, the Design System rules, the Builder command, and the artifact contract that lets AI produce pages in other projects.

## Core Stack

| Part | Role |
| --- | --- |
| Semi Design System | Primary UI component system for product-grade pages and interactions. |
| Context7 CLI + Skills | Required AI documentation mode for checking Semi APIs, examples, and component usage through `ctx7` before implementation. |
| Figma | Design intent, review surface, and design-system bridge when visual work needs a shared source. |
| Builder | Centralized `jun-ui build` command that compiles page intent into directly openable artifacts. |
| `jun-ui-page-delivery` Skill | Installable AI entrypoint for choosing the page path, using Semi correctly, and validating the final artifact. |

## Delivery Contract

Every generated page must optimize for the final user-visible result:

- Use Semi Design System as the default component system.
- Use Context7 CLI + Skills before material Semi API or pattern decisions.
- Treat `ctx7` as the default documentation execution path. MCP is optional.
- Verify `ctx7`, `context7-docs`, and `context7-cli` with `jun-ui doctor --strict`.
- Stop before Semi implementation if neither Context7 CLI + Skills nor an approved Context7 MCP path is available.
- Use Figma when the task starts from a visual design, needs design review, or should sync product UI intent.
- Use the Builder instead of making every target project own Node, Semi, and build dependencies.
- Allow compilation when it improves speed or quality.
- Produce a final artifact that opens with `file://`.
- Keep built asset references relative so the artifact can be moved as a folder.
- Verify the page renders nonblank and key interactions work outside the dev server.

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
