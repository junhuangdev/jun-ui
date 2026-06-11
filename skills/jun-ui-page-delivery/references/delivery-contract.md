# Delivery Contract

Use this reference when creating or reviewing Jun page artifacts through the installable jun-ui Skill and Builder.

For lane selection, read `/Users/jun/workspace/jun-ui/docs/delivery-lanes.md` first. This file defines the static artifact contract. Runtime apps use the same Design System, but the target project owns server behavior and runtime verification.

## Output Requirement

For the static artifact lane, the final page output must be directly openable through `file://`.

Acceptable shapes:

- a single HTML file with embedded or relative assets;
- a built folder such as `dist/` with `index.html` and relative asset paths.

The built artifact must not require a development server for final review. If the UI must read or write server state while the user is using it, use the runtime app lane instead.

## Required Stack Decisions

| Decision | Requirement |
| --- | --- |
| Component system | Use Semi Design System by default. |
| API grounding | Use Context7 CLI + Skills through `ctx7` before substantial Semi implementation. |
| MCP | MCP is optional; use it only as an approved alternate Context7 path. |
| Visual source or review | Use Figma when visual intent, review, or design-system sync matters. |
| Build | Use `jun-ui build` unless the target project explicitly owns a stronger build profile. |
| Verification | Run `jun-ui verify-page <config-or-artifact> --strict`, preferring the config when available, then test the built artifact. |

## Page Quality Bar

The artifact should:

- show the real page experience immediately;
- load all styles and scripts;
- keep product-tool layout dense, clear, and scannable;
- preserve expected controls and interactions;
- avoid broken asset paths;
- use `--jun-ui-*` tokens instead of handwritten UI colors;
- keep every native `button`, `input`, `textarea`, and `select` on a Semi or `jui-*` control contract;
- use consistent spacing, hierarchy, and state presentation;
- work when moved as a folder.

## Verification Checklist

Before delivery:

1. Build the page artifact.
2. Run `jun-ui verify-page <config-or-artifact> --strict`.
3. Fix any artifact-shape, asset-path, token-usage, bare-color, or native-control contract violations.
4. Open the built `index.html` or single-file artifact through `file://`.
5. Confirm the page is nonblank.
6. Confirm styles are loaded.
7. Confirm native controls render as designed, not as browser-default controls.
8. Confirm key interactions work.
9. Confirm no console errors block page use.
10. Report the exact artifact path and verifier result.

## Documentation Gate

Before substantial Semi implementation:

1. Use Context7 CLI + Skills through `ctx7`.
2. Record the Semi docs topic or component area checked.
3. Stop before Semi implementation if no Context7 path is available.
4. Do not replace this with generic web search or unverified model memory.

## Target Project Boundary

The target project should provide page intent, source data, and output location. The installable jun-ui Builder owns the reusable build behavior and writes the file-openable artifact back to that target project.

## Design System Consistency Rules

The Builder injects the Design System into every artifact: `--jun-ui-*` tokens, the Semi theme bridge (Semi components inherit the jun-ui accent and radius), and the `jui-stack` / `jui-row` layout utilities. Pages **consume** that system; they do not re-create or fork it. The recurring failure mode is a page that hand-rolls something the system already provides (its own blue, its own radius, its own pill, its own flex+gap) and so drifts out of sync. The rules below close that gap; `verify-page --strict` enforces or surfaces each one.

- **Controls.** Interactive React/runtime pages use Semi components (`Button`, `Switch`, `Checkbox`, `TextArea`, …). The static `build` lane may use `jui-*` control classes. Never ship a raw native `button` / `input` / `textarea` / `select` without a Semi output class, a `jui-*` class, or `data-jun-ui-control`. (hard gate)
- **Status tags.** Use the Semi `Tag` component for status labels and chips. Do not hand-roll tag spans (class names ending in `-pill` / `-chip`); these diverge from the themed Semi `Tag`. (advisory)
- **Color.** Use `--jun-ui-*` tokens; never bare page colors. Semi components inherit the accent automatically through the theme bridge — do not re-skin them with hardcoded blues. (hard gate)
- **Radius / geometry.** Comes from the theme bridge (`--jun-ui-radius`). Do not hardcode corner radii to re-create Semi defaults.
- **Layout.** Compose vertical/horizontal rhythm with `jui-stack` (`--section` / `--tight` / `--end` / `--center`) and `jui-row` (`--between` / `--end` / `--start` / `--tight`), whose gaps come from spacing tokens. Apply `jui-stack` to a wrapper you control so a parent wrapper (e.g. Semi `<Spin>`) cannot silently drop the gap. Prefer these over ad-hoc `display:flex; gap: <px>`.
- **Scroll regions.** A height-bounded content region must scroll, not clip: use `jui-scroll-y` (it bundles `overflow-y:auto`, `min-height:0`, a themed scrollbar, and end breathing room via `padding-bottom: var(--jun-ui-section-gap)`). Never leave `overflow:hidden` on a height-limited content area — it clips silently with no scrollbar. (hard gate)
- **Scroll end breathing room.** Content scrolled to the bottom must never sit flush against the container edge. `jui-scroll-y` bundles this, and the injected base CSS also bakes it into Semi SideSheet bodies (`body[data-jun-ui-artifact] .semi-sidesheet-body`), so SideSheets are covered with no per-page wrapper. Other scrollers that bypass the utility — Semi Modal, Drawer, Table body — still need explicit end padding (`padding-bottom: var(--jun-ui-section-gap)` on your innermost content wrapper). Recurring real-world defect; treat any flush-bottom scroll region as a review blocker, and fix it at the component layer (base CSS), not per page. (hard gate)
- **Do not fork the system.** Page source CSS must not redefine `--jun-ui-*` tokens or the `.jui-stack` / `.jui-row` utilities. Alias them into local variables if needed (`--my-accent: var(--jun-ui-accent)`), but consume, never redefine. (hard gate)
