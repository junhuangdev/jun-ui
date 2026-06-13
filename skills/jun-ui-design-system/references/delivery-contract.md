# Delivery Contract

Use this reference when creating or reviewing Jun page artifacts through the installable `jun-ui-design-system` Skill and Builder.

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
| Information architecture | Identify primary information, secondary information, tertiary information, and primary action before layout. |
| Build | Use `jun-ui build` unless the target project explicitly owns a stronger build profile. |
| Verification | Run `jun-ui verify-page <config-or-artifact> --strict`, preferring the config when available, then test the built artifact. |

## Page Quality Bar

The artifact should:

- show the real page experience immediately;
- load all styles and scripts;
- keep product-tool layout dense, clear, and scannable;
- make visual hierarchy match information value;
- place primary information before secondary information, tertiary metadata, decoration, and debug detail;
- preserve expected controls and interactions;
- avoid broken asset paths;
- use Semi `--semi-*` tokens instead of handwritten UI colors, with `--jun-ui-*` limited to delivery layout variables;
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

The Builder injects the Design System into every artifact: Semi's `--semi-*` token surface, the small `--jun-ui-*` delivery-variable layer, and the `jui-stack` / `jui-row` layout utilities. Semi owns component semantics, visual color, radius, states, and data colors; `jun-ui` owns file-openable delivery, page shell, spacing utilities, and verification. Pages **consume** that system; they do not re-create or fork it. The recurring failure mode is a page that hand-rolls something the system already provides (its own blue, its own radius, its own pill, its own flex+gap) and so drifts out of sync. The rules below close that gap; `verify-page --strict` enforces or surfaces each one.

- **Controls.** Interactive React/runtime pages use Semi components (`Button`, `Switch`, `Checkbox`, `TextArea`, …). The static `build` lane may use `jui-*` control classes. Never ship a raw native `button` / `input` / `textarea` / `select` without a Semi output class, a `jui-*` class, or `data-jun-ui-control`. (hard gate)
- **Status tags.** Use the Semi `Tag` component for status labels and chips. Do not hand-roll tag spans (class names ending in `-pill` / `-chip`); these diverge from the themed Semi `Tag`. (advisory)
- **Color.** Use Semi `--semi-*` tokens; never bare page colors. Use Context7/Semi docs when choosing which semantic token fits text, background, border, status, or data visualization. (hard gate)
- **Legacy visual aliases.** 旧视觉 alias 不再由 Builder 输出，也不是新页面可用的 Design System 合约。旧页面如果因此失效，迁移页面源 CSS 到 Semi `--semi-*` token 和少量 `--jun-ui-*` delivery-variable；不要恢复兼容层。 (hard gate)
- **Radius / geometry.** Use Semi radius tokens such as `--semi-border-radius-medium`. Do not hardcode corner radii to re-create Semi defaults; `verify-page --strict` surfaces literal radii in source CSS as advisories (`var(...)` aliases, `0`, `50%` circles, and `999px` pills pass). (advisory)
- **Layout.** Compose vertical/horizontal rhythm with `jui-stack` (`--section` / `--tight` / `--end` / `--center`) and `jui-row` (`--between` / `--end` / `--start` / `--tight`), whose gaps come from `jun-ui` delivery variables. Apply `jui-stack` to a wrapper you control so a parent wrapper (e.g. Semi `<Spin>`) cannot silently drop the gap. Prefer these over ad-hoc `display:flex; gap: <px>`; `verify-page --strict` reports a per-file summary of literal-gap flex rules as an advisory (token-driven `gap: var(...)` passes). (advisory)
- **Delivery token layer.** The final artifact or runtime URL must define the `--jun-ui-*` delivery-variable layer whenever page CSS consumes those variables. Builder artifacts and `bundle-app` outputs get this from the Builder; runtime apps must serve the shared token CSS or another Design System-owned token sheet before page CSS. Do not hide a missing token layer with page-local fallback values; fix the Builder/runtime token source. `verify-page --strict` rejects artifacts that use `--jun-ui-*` variables without defining the delivery token layer. (hard gate)
- **Scroll regions.** A height-bounded content region must scroll, not clip: use `jui-scroll-y` (it bundles `overflow-y:auto`, `min-height:0`, a themed scrollbar, and end breathing room via `padding-bottom: var(--jun-ui-section-gap)`). Never leave `overflow:hidden` on a height-limited content area — it clips silently with no scrollbar. `verify-page --strict` surfaces height-bounded `overflow:hidden` rules in source CSS as advisories; review each one (decorative crops like thumbnails are the only acceptable case). (hard gate)
- **Single scroll region.** One surface (the page, a SideSheet, a Modal) gets exactly **one** vertical scroller. Nested scrollbars — an inner `max-height` scroller inside an already-scrolling body — break content overview, hijack wheel/trackpad scrolling, and hit assistive-tech and touch users hardest (Baymard "inline scroll areas", NN/g scrolling guidelines). To keep actions visible while content scrolls, pin them with the component's footer slot (`SideSheet` / `Modal` `footer` prop) instead of bounding the content's height; on plain pages use sticky positioning. `verify-page --strict` surfaces viewport-bound `max-height` rules in source CSS as advisories — each one is a nested-scroll candidate. (hard gate)
- **Scroll end breathing room.** Content scrolled to the bottom must never sit flush against the container edge. `jui-scroll-y` bundles this, and the injected base CSS also bakes it into Semi SideSheet bodies (`body[data-jun-ui-artifact] .semi-sidesheet-body`), so SideSheets are covered with no per-page wrapper. Other scrollers that bypass the utility — Semi Modal, Drawer, Table body — still need explicit end padding (`padding-bottom: var(--jun-ui-section-gap)` on your innermost content wrapper). Recurring real-world defect; treat any flush-bottom scroll region as a review blocker, and fix it at the component layer (base CSS), not per page. (hard gate)
- **Do not fork the system.** Page source CSS must not redefine Semi `--semi-*` tokens, `--jun-ui-*` delivery variables, or the `.jui-stack` / `.jui-row` utilities. Alias them into local variables if needed (`--panel-bg: var(--semi-color-bg-1)`), but consume, never redefine. (hard gate)
- **Information weight before layout.** A page must classify primary information, secondary information, tertiary information, and primary action before composition. Primary information gets the first scan path, largest useful region, strongest appropriate typography, and closest action. Secondary information supports it. Tertiary information moves to quiet text, compact tables, tabs, disclosure, side panels, or lower sections. A page fails review when low-use content is visually larger, louder, or earlier than the real task state or conclusion. (hard gate)
- **Scan cards and overflow.** A scan card grid must favor readability over item density: use a content-card minimum around 320-360px (`minmax(min(100%, 340px), 1fr)` is the default), put `min-width: 0` on flex/grid children that hold text, use `overflow-wrap: anywhere` for titles, metadata, IDs, and commands, and let footer metadata/actions wrap. `verify-page --strict` surfaces cramped card-grid columns as advisories; real browser overflow (`scrollWidth > clientWidth`, clipped text, collapsed gap, or buttons escaping a card) is a review blocker. (hard gate)
