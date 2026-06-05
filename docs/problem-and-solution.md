# Problem And Solution

This document is the source of truth for the current `jun-ui` direction: an installable AI page-building Skill, Design System, and Builder.

## Problem

Jun needs AI to quickly build high-quality product pages, tool pages, dashboards, settings screens, detail pages, workbenches, and prototypes inside a target project.

The problem is not choosing an implementation style. The problem is result quality and delivery speed:

- AI should not rebuild page structure from scratch every time.
- AI should use a strong component system instead of guessing UI primitives.
- AI should ground component usage in current documentation.
- Visual intent should have a place to live and be reviewed.
- The final page should be directly inspectable without starting a dev server.

## Acceptance Target

The output of a successful page task is a built artifact that opens with `file://`.

The reviewer should be able to open the artifact, see the full page, and test expected interactions. A development server can be used during creation, but it is not the final acceptance surface.

## Selected Solution

The selected solution is:

| Part | Purpose |
| --- | --- |
| Semi Design System | Main component system for building product-grade pages quickly. |
| Context7 CLI + Skills | Required AI documentation path for accurate Semi API and pattern usage through `ctx7`. |
| Figma | Design source, visual review surface, and design-system collaboration bridge. |
| Builder | Centralized `jun-ui build` command that lets AI use modern UI tooling while still delivering directly openable artifacts. |
| `jun-ui-page-delivery` Skill | Installable entrypoint that tells AI how to combine the solution parts inside a target project. |

## Why This Works

Semi provides broad page and component coverage. Context7 CLI + Skills reduces wrong API guesses by making `ctx7` the default documentation execution path. MCP is optional. Figma keeps visual intent and review separate from implementation details. The Builder allows richer implementation when needed while preserving a simple file-openable review artifact.

## Repository Responsibility

This repository should hold:

- the problem and solution definition;
- Skill instructions for AI page delivery;
- templates and references for repeated page work;
- Builder command and build-output requirements;
- validation rules that prevent stale guidance from returning.

It should not grow into a separate component framework or target project adapter collection. The value is installable AI guidance, centralized Builder behavior, delivery quality, and repeatability.
