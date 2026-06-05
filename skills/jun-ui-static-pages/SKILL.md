---
name: jun-ui-static-pages
description: Use when creating, editing, reviewing, or recommending no-build static HTML pages, local tool UIs, dashboards, settings screens, detail pages, or AI-generated frontend prototypes for Jun.
---

# jun-ui Static Pages

## Core Rule

For no-build static product pages, start from `jun-ui` before choosing an external component library or writing ad hoc UI.

Canonical library:

- Local: `/Users/jun/workspace/jun-ui`
- Public: `https://github.com/junhuangdev/jun-ui`

## Required Defaults

Use this order unless the user or project explicitly overrides it:

1. Use `jun-ui.css` and `jun-ui.js` as the page-level Design System entrypoint.
2. Use Spectrum Web Components as the default low-level component system.
3. Use `jui-*` patterns before hand-rolling shell, header, toolbar, panel, grid, stack, stats, empty states, forms, lists, or detail layouts.
4. Add Alpine.js only for small client-side state.
5. Add htmx only for server-rendered partial updates.
6. Use Web Awesome for freer lightweight pages when Spectrum feels too product-tool oriented.
7. Use Bootstrap only as a fallback for mature utilities, grid, or compatibility speed.

## Hard Boundaries

- Do not introduce React, Vite, Tailwind, webpack, or another build pipeline for static pages unless the current project clearly requires it.
- Do not hand-roll repeated UI structure before checking `jun-ui` examples and patterns.
- Do not make Bootstrap the first default for Jun's static product/tool pages.
- Do not copy long Design System rules into the target page; keep reusable rules in `jun-ui`.

## Workflow

1. Inspect `/Users/jun/workspace/jun-ui` for current files and examples.
2. Pick the closest example: dashboard, form, or detail.
3. Build with native HTML plus `jun-ui.css`, `jun-ui.js`, and Spectrum CDN imports.
4. Add page-specific CSS only for layout polish that does not belong in `jun-ui`.
5. If a pattern repeats, update `jun-ui` instead of duplicating it in the page.
6. Verify the page renders nonblank and that `jui-*` custom elements hydrate.

## References

For copyable page skeletons and element patterns, read `references/usage-patterns.md`.

For the full design-system rationale, read `/Users/jun/workspace/jun-ui/docs/design-system.md`.
