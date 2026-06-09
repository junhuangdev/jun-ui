# Problem And Solution

This document is the source of truth for the current `jun-ui` direction: an installable AI page-building Skill, Design System, Builder, and runtime UI contract.

## Problem

Jun needs AI to quickly build high-quality product pages, tool pages, dashboards, settings screens, detail pages, workbenches, prototypes, and server-backed web app surfaces inside a target project.

The problem is not choosing an implementation style. The problem is result quality and delivery speed:

- AI should not rebuild page structure from scratch every time.
- AI should use a strong component system instead of guessing UI primitives.
- AI should ground component usage in current documentation.
- Visual intent should have a place to live and be reviewed.
- Static outputs should be directly inspectable without starting a dev server.
- Runtime app outputs should reuse the same Design System while keeping server ownership in the target project.

## Acceptance Target

The output of a successful page task depends on the delivery lane:

| Lane | Acceptance |
| --- | --- |
| Static artifact | A built artifact opens with `file://`, renders correctly, and preserves expected interactions. |
| Runtime app | A project-owned local or deployed URL renders correctly and proves required server-backed behavior. |

The reviewer should be able to inspect the result without reconstructing the implementation process. A development server can be used during creation. For static artifacts it is not the final acceptance surface. For runtime apps it is the product surface that must be verified.

## Selected Solution

The selected solution is:

| Part | Purpose |
| --- | --- |
| Semi Design System | Main component system for building product-grade pages quickly. |
| Context7 CLI + Skills | Required AI documentation path for accurate Semi API and pattern usage through `ctx7`. |
| Figma | Design source, visual review surface, and design-system collaboration bridge. |
| Builder | Centralized `jun-ui build` command that lets AI use modern UI tooling while still delivering directly openable artifacts. |
| Runtime UI contract | Rules for using the same tokens, Semi patterns, states, and verification discipline inside server-backed apps. |
| `jun-ui-page-delivery` Skill | Installable entrypoint that tells AI how to choose the correct lane and combine the solution parts inside a target project. |

## Why This Works

Semi provides broad page and component coverage. Context7 CLI + Skills reduces wrong API guesses by making `ctx7` the default documentation execution path. MCP is optional. Figma keeps visual intent and review separate from implementation details. The Builder allows richer implementation when needed while preserving a simple file-openable review artifact. The runtime UI contract extends the same Design System into server-backed apps without making `jun-ui` own the server.

## Repository Responsibility

This repository should hold:

- the problem and solution definition;
- Skill instructions for AI page delivery;
- templates and references for repeated page work;
- Builder command and build-output requirements;
- runtime UI rules and examples;
- validation rules that prevent stale guidance from returning.

It should not grow into a separate component framework, full-stack framework, or target project adapter collection. The value is installable AI guidance, centralized Builder behavior for static artifacts, runtime UI consistency for server-backed apps, delivery quality, and repeatability.
