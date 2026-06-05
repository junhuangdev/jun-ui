# jun-ui Agent Instructions

This repository is Jun's installable AI page-building Skill, Design System, and Builder. It exists to help AI build high-quality pages inside a target project and produce final artifacts that can be opened directly with `file://`.

## Scope

- Use these instructions for changes inside `/Users/jun/workspace/jun-ui`.
- Project-local rules add repository context only. They do not weaken global agent rules.
- For Jun page work, use the installed `jun-ui-page-delivery` Skill as the execution entrypoint.

## Current Direction

- Primary component system: Semi Design System.
- AI documentation mode: Context7 CLI + Skills using `ctx7`.
- Design and review surface: Figma.
- Builder command: `jun-ui build <config.json>`.
- Acceptance target: a final page artifact that opens through `file://` and preserves expected UI behavior.

## Problem And Solution Boundary

- The problem is AI page delivery: speed, quality, consistency, and directly inspectable results.
- The installable Skill, Semi Design System, Context7 CLI + Skills, Figma, and Builder are the selected solution for that problem.
- Do not reframe the project around implementation purity. The final artifact and review experience matter more than whether source files were compiled.

## Context7 Rule

- Treat Context7 as an AI documentation aid, not a runtime dependency.
- Use Context7 CLI + Skills as the required documentation mode before materially changing Semi component usage.
- Use `ctx7` to resolve and fetch Semi documentation. MCP is optional.
- Stop before Semi implementation if neither Context7 CLI + Skills nor an explicitly approved Context7 MCP path is available.
- Do not add Context7 to browser runtime dependencies or generated page artifacts.

## Figma Rule

- Use Figma when the task starts from a design, needs visual review, or needs a shared design-system artifact.
- When calling Figma tools, load the required Figma skills first.
- Figma is not mandatory for every small page, but it is part of the selected solution when visual intent or review matters.

## Design System Rules

- Semi owns the UI component surface: layout components, forms, navigation, tables, overlays, controls, and product-grade interaction primitives.
- `jun-ui` owns the delivery contract: problem framing, templates, Builder profile, Skill instructions, Figma handoff rules, and artifact verification.
- Target projects own page intent, source data, and output location.
- Add reusable templates or Skill references when repeated AI work needs stronger guidance.
- Do not create a parallel component framework inside this repository.

## Builder Rule

- Prefer `jun-ui build` for static pages, workbenches, dashboards, settings screens, and detail pages in a target project.
- Keep Node, Semi, and build dependencies centralized in this installable Builder instead of copying them into every target project.
- A target project may add a small page config, but it should not become a `jun-ui` subproject.

## File-Openable Compatibility

- Final page artifacts must be openable through `file://`.
- Built asset paths must be relative.
- A dev server is acceptable during development, but it must not be required for final review.
- Browser verification should inspect the built artifact, not only the development URL.

## Verification Gate

Before claiming repository changes are ready, run:

```sh
npm test
```

For generated page templates or Builder changes, also run `jun-ui build` against a template and open the built artifact in a browser or headless browser. Confirm the page is nonblank, styles load, and key interactions work without a dev server.

## Skill Packaging

- The bundled Skill lives at `skills/jun-ui-page-delivery/SKILL.md`.
- Keep Skill instructions aligned with `README.md`, `docs/problem-and-solution.md`, and `docs/design-system.md`.
- The active local install path is `/Users/jun/.codex/skills/jun-ui-page-delivery`.
- When updating the Skill, verify the installed or symlinked copy points to the intended source.

## File Naming

- Use `AGENTS.md` for project-level agent instructions.
- If a request says `agent.md`, interpret it as `AGENTS.md` unless the user explicitly asks for a lowercase file.
