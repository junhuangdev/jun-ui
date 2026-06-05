# jun-ui Agent Instructions

This repository is Jun's canonical no-build Design System wrapper for static product pages, local tools, dashboards, settings screens, detail pages, and AI-generated HTML-first prototypes.

## Scope

- Use these instructions for changes inside `/Users/jun/workspace/jun-ui`.
- Project-local rules add repository context only. They do not weaken global agent rules.
- For downstream static pages, prefer the installed `jun-ui-static-pages` Skill as the execution entrypoint.

## Canonical Direction

- Default stack: native HTML, `jun-ui.css`, `jun-ui.js`, and Spectrum Web Components.
- Default page-level Design System: `jun-ui`.
- Default low-level controls: Spectrum Web Components.
- Optional small state: Alpine.js.
- Optional server-rendered partial updates: htmx.
- Lighter/free-form fallback: Web Awesome.
- Compatibility/speed fallback: Bootstrap.
- Do not introduce React, Vite, Tailwind, webpack, or another build pipeline unless the user explicitly asks or the target project already requires it.

## Context7 Rule

- Treat Context7 as an AI documentation aid, not a runtime dependency.
- Before materially changing Spectrum, Web Awesome, Bootstrap, Alpine.js, or htmx usage, use Context7 if available.
- If Context7 is unavailable, verify with official docs, local examples, or installed package types before implementing.
- Do not add Context7 to browser pages, npm runtime dependencies, or generated static artifacts.

## Design System Rules

- `jun-ui.css` owns tokens, density, layout primitives, responsive behavior, and product-tool visual language.
- `jun-ui.js` owns high-frequency `jui-*` custom elements.
- Spectrum owns buttons, inputs, tabs, dialogs, tables, menus, and other accessible base controls.
- Examples under `examples/` are source templates for AI and human reuse.
- Add page-specific CSS only for layout polish that does not belong in the shared system.
- If a pattern repeats across pages, move it into `jun-ui` instead of duplicating it.

## Page Patterns

- Dashboard: shell, header, metric cards, primary queue, action rail.
- Form: header, grouped fields, validation states, save/cancel actions.
- Detail: title, metadata, main content, timeline/history, right-side context.

Use `jui-*` shell, panel, grid, stack, section title, stat, and empty-state patterns before hand-rolling equivalent structure.

## Static Compatibility

- Example pages must open directly from the filesystem with `file://`.
- Keep CDN imports documented in `vendor/spectrum.html`.
- Do not require a local server for final examples.
- Dev servers are acceptable only as review convenience.

## Verification Gate

Before claiming repository changes are ready, run:

```sh
npm test
```

For custom element changes, also check syntax:

```sh
node --check jun-ui.js
```

For visual or example changes, open the relevant `examples/*.html` page in a browser or use a headless browser smoke check. Confirm the page renders nonblank and `jui-*` elements hydrate.

## Skill Packaging

- The bundled Skill lives at `skills/jun-ui-static-pages/SKILL.md`.
- Keep Skill instructions aligned with `README.md`, `docs/design-system.md`, `jun-ui.css`, `jun-ui.js`, and `examples/`.
- The active local install path is `/Users/jun/.codex/skills/jun-ui-static-pages`.
- When updating the Skill, verify the installed or symlinked copy still points to the intended source.

## File Naming

- Use `AGENTS.md` for project-level agent instructions.
- If a request says `agent.md`, interpret it as `AGENTS.md` unless the user explicitly asks for a lowercase file.
