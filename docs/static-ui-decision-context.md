# Static UI Decision Context

Last updated: 2026-06-05

This document preserves the decision context from the static UI library discussion so a new AI session can continue without replaying the full comparison.

## One-Line Conclusion

For Jun's static product/tool pages, the default direction is `jun-ui`: native HTML, `jun-ui.css`, `jun-ui.js`, Spectrum Web Components underneath, and the `jun-ui-static-pages` Skill as the AI entrypoint.

## Current Canonical Stack

| Layer | Default | Why |
| --- | --- | --- |
| AI entrypoint | `jun-ui-static-pages` Skill | Stronger than a passive doc; forces agents to start from this system |
| Page wrapper | `jun-ui.css` + `jun-ui.js` | Shared tokens, layout, shell, panels, stats, empty states |
| Base controls | Spectrum Web Components | No React build pipeline, strong Design System base, accessible controls |
| Page state | Alpine.js optional | Small local interactions without a framework |
| Partial updates | htmx optional | Server-rendered fragments when a backend exists |
| Lightweight fallback | Web Awesome | Good for freer pages where Spectrum feels too product-tool oriented |
| Compatibility fallback | Bootstrap | Only for mature grid/utilities or speed; not the default visual direction |

Default rule: if the target can stay no-build, do not introduce React, Vite, Tailwind, webpack, or another build pipeline.

## What We Were Optimizing For

- Pages must be usable from the filesystem with `file://` when possible.
- The first screen should be the actual tool or dashboard, not a landing page.
- AI should assemble from stable patterns instead of inventing one-off HTML every time.
- The Design System should carry layout, density, hierarchy, tokens, and common page patterns.
- Components should be broad enough for dashboards, settings pages, detail pages, forms, queues, and local workbenches.
- Generated pages should feel operational and quiet, not marketing-like or Bootstrap-first.
- Repeated patterns should move into `jun-ui`, not be copied across downstream pages.

## Why `jun-ui` Exists

Using only a component library was not enough. Component libraries provide controls, but AI still tends to make inconsistent page shells, spacing, density, cards, headers, and state presentation.

`jun-ui` is the project-level wrapper that gives AI a stable page language:

- `jun-ui.css` owns tokens, spacing, density, layout primitives, status styles, and product-tool visual tone.
- `jun-ui.js` owns high-frequency `jui-*` custom elements.
- `examples/` owns copyable templates for dashboard, form, and detail pages.
- `skills/jun-ui-static-pages/` owns the stronger AI runtime instruction.

The goal is not to re-create a full component library. The goal is to create a stable page-level system that can sit above a no-build base component set.

## Current Repository Facts

- Local repo: `/Users/jun/workspace/jun-ui`
- Public repo: `https://github.com/junhuangdev/jun-ui`
- Default branch: `main`
- Project agent rules: `AGENTS.md`
- Design doc: `docs/design-system.md`
- Skill entrypoint: `skills/jun-ui-static-pages/SKILL.md`
- Local Codex Skill path: `/Users/jun/.codex/skills/jun-ui-static-pages`
- Core files: `jun-ui.css`, `jun-ui.js`, `vendor/spectrum.html`
- Examples: `examples/dashboard.html`, `examples/form.html`, `examples/detail.html`

## Rules For Future AI Sessions

1. Load `jun-ui-static-pages` before creating, editing, reviewing, or recommending no-build static pages for Jun.
2. Inspect `/Users/jun/workspace/jun-ui` before choosing an external UI library.
3. Start from the closest example: dashboard, form, or detail.
4. Use `jui-*` shell, header, toolbar, panel, grid, stack, stats, empty states, forms, lists, and detail patterns before hand-rolling equivalents.
5. Use Spectrum Web Components for base controls such as buttons, inputs, tabs, dialogs, pickers, menus, and tables.
6. Add page-specific CSS only for layout polish that does not belong in the shared system.
7. If the same structure appears in multiple pages, extend `jun-ui` instead of duplicating it.
8. Keep final examples directly openable through `file://`.
9. Use a local static server only for review convenience or when testing browser behavior that `file://` cannot represent accurately.
10. Do not copy long Design System rules into downstream pages; keep reusable rules in `jun-ui`.

## Historical Comparison Notes

These notes explain how we got here. They are not the current implementation target.

| Option | Historical finding | Current role |
| --- | --- | --- |
| Web Awesome | Good no-build component option, modern enough, useful for lighter/free-form pages | Fallback, not the main product-tool default |
| Bootstrap | Very practical and file-friendly, but visually generic and not good enough as the default look | Compatibility fallback only |
| MUI | Huge ecosystem and AI training surface, but React/build-oriented and showed small visual issues in demo composition | Comparison reference only |
| Ant Design | Broad, familiar, good AI training surface, but React/build-oriented and showed minor page-level imperfections | Comparison reference only |
| Arco Design | Good modern React system, smaller build artifact than Semi in the old comparison | Fallback/reference for React build-to-file work |
| Semi Design | Strong Design System, AI-friendly with docs, scored best in the old React system demo | Relevant if a future project explicitly needs React build-to-file |
| Spectrum Web Components | No-build base controls with strong design-system semantics | Current default base layer under `jun-ui` |

The temporary comparison project `/Users/jun/workspace/ui-library-demos` was deleted after the decision. Do not depend on its files or local server.

## React Build-To-File Branch

There was a separate exploration of React component libraries where the output could be built into a single static artifact and opened by `file://`.

Historical result:

- Semi Design was preferred over Arco for the React build-to-file branch.
- Arco remained a strong fallback when smaller artifact size or simpler output matters.
- MUI and Ant Design had large ecosystems, but demo composition had visible small issues.
- The React comparison used Vite single-file output and was useful for evaluating component coverage, not for the current no-build `jun-ui` direction.

Use this branch only when a project explicitly needs React or has already chosen a React build pipeline. It should not override the default no-build `jun-ui` route.

## Context7 Rule

Context7 is useful as an AI documentation dependency. It should not become a browser dependency or runtime dependency.

Use Context7 when available to verify:

- Spectrum Web Components imports and component APIs.
- Web Awesome usage and CDN/import rules.
- Bootstrap utility or component behavior.
- Alpine.js and htmx usage.
- Semi or Arco APIs if a future React build-to-file project explicitly uses them.

If Context7 is unavailable, fall back to official docs, local examples, installed package types, and direct browser checks.

## File-System Compatibility

The key distinction:

- No-build static page: HTML directly imports `jun-ui.css`, `jun-ui.js`, and Spectrum CDN. This is the default.
- Build-to-file page: a build step may bundle React/component-library code into a final static artifact. This is acceptable only when the project already needs a build pipeline.

For `jun-ui`, examples should keep working directly from `file://`. Use relative paths and avoid server-only assumptions.

## Page Quality Bar

Static pages built from `jun-ui` should:

- show real tool UI immediately;
- use dense but readable operational layout;
- avoid marketing hero sections unless explicitly requested;
- avoid nested cards;
- avoid decorative gradient/orb backgrounds;
- keep cards at 8px radius or less unless the system changes;
- keep text from overflowing or overlapping at desktop and mobile widths;
- use icons/components where appropriate instead of ad hoc controls;
- keep visual language consistent across pages.

## Verification Gate

Before claiming `jun-ui` changes are ready:

```sh
npm test
```

For custom element changes:

```sh
node --check jun-ui.js
```

For visual/example changes:

- Open the relevant `examples/*.html` page in a browser, or use a headless browser smoke check.
- Confirm the page is nonblank.
- Confirm `jui-*` elements hydrate.
- Check desktop and mobile widths for overlap or clipped text.
- Confirm no build step is needed for the final example.

## Known Risks And Watch Items

- Spectrum CDN availability affects direct examples that import from CDN. If offline use becomes important, add a documented vendoring strategy.
- Web Components APIs may be less familiar to AI than React APIs. The Skill and examples must stay concrete and copyable.
- `jun-ui` should not grow into a full component framework. Keep it focused on page-level patterns and high-frequency composition.
- Bootstrap should not creep back in as the default just because it is fast.
- React library conclusions should stay separate from the no-build default. Semi is relevant for React build-to-file work, not for default `jun-ui` pages.
- Context7 availability can vary by session. Always have an official-docs/local-types fallback.
- If examples start requiring a local server, the core no-build promise has been weakened.

## Suggested Next Work

1. Strengthen `jun-ui` examples with richer real-world dashboard/detail/form cases.
2. Add more `jui-*` patterns only when repeated downstream pages prove the need.
3. Add visual smoke checks for examples if page quality starts drifting.
4. Keep `AGENTS.md`, `README.md`, `docs/design-system.md`, and the Skill aligned whenever the default stack changes.
5. Consider documenting an offline/vendor mode for Spectrum if `file://` plus remote CDN is not enough.

## Do Not Recreate

- Do not recreate `/Users/jun/workspace/ui-library-demos` unless a new comparison is explicitly requested.
- Do not re-open the MUI/Antd/Arco/Semi comparison as the default path for no-build static pages.
- Do not treat Bootstrap as the default Design System.
- Do not treat Context7 as a page dependency.
- Do not introduce build tooling just to get a component library when `jun-ui` can satisfy the page.
