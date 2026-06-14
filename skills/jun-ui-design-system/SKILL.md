---
name: jun-ui-design-system
description: Use when creating, editing, reviewing, or recommending product pages, workbenches, dashboards, settings screens, detail pages, local tools, AI-generated page prototypes, or server-backed web app surfaces that should enter the Jun UI Design System through Semi Design System, Context7 CLI + Skills, Figma, the installable jun-ui Builder, and the jun-ui static artifact/runtime app delivery lanes.
---

# jun-ui Design System

## Core Rule

Treat this Skill as the single AI entrypoint into the Jun UI Design System. Optimize for the final user-visible product UI, then use Semi Design System, Context7 CLI + Skills, Figma, the jun-ui Builder, and the Design System references to choose the right delivery lane:

- static artifact lane for pages Jun can open directly with `file://`;
- runtime app lane for UI that must read or write server state while the user is using it.

Canonical repository:

- Local: `/Users/jun/workspace/jun-ui`
- Public: `https://github.com/junhuangdev/jun-ui`

## Required Defaults

Use this order unless the user or project explicitly overrides it:

1. Treat the user-visible page result as the goal.
2. Decide the lane before choosing commands: static artifact or runtime app.
3. Use Semi Design System as the primary UI component system.
4. Use Context7 CLI + Skills before material Semi API, component, or pattern decisions.
5. Use Figma when the task starts from a visual design, needs design review, or should sync reusable design intent.
6. Use `jun-ui build` or `jun-ui bundle-app` when the request fits the static artifact lane.
7. Deliver a built artifact that opens through `file://` for static lane work.
8. Run `jun-ui verify-page <config-or-artifact> --strict` as postflight validation before reporting static lane delivery.
9. Use the target project's runtime stack when the UI requires server reads, writes, auth, uploads, background jobs, or shared state.
10. Verify the served URL and relevant server-backed behavior for runtime lane delivery.
11. Run `jun-ui doctor --strict` before substantial Semi implementation and require `ctx7`, `context7-docs`, and `context7-cli`.
12. For new or materially reshaped consumer projects, run `jun-ui doctor --strict --adoption-root <project-root>` after recording the startup choice; it must prove a `jun-ui adoption decision` exists.
13. For adopted consumer projects, run `jun-ui doctor --strict --consumer-root <project-root>` when adding or auditing project-level agent instructions; it must prove page/workbench/tool UI tasks route to this Skill and strict postflight.
14. Apply the interaction affordance hierarchy when composing controls: one solid primary per view, uniform secondary buttons, link-like inline shortcuts, openable cards distinct from buttons, and passive status that never looks clickable. See `references/affordance-hierarchy.md`.
15. Apply information architecture and visual hierarchy before composing layout: identify the page job, primary information, secondary information, tertiary information, primary action, and first-screen scan path. See `references/information-architecture.md`.
16. For scan card layouts, prefer readable column width over density; verify text, metadata, tags, and actions wrap inside the card and do not overflow.
17. For pages that consume `--jun-ui-*` delivery variables, make sure the final artifact or runtime URL includes the delivery token layer before page CSS.

## Lane Routing

Ask internally first: does this UI need runtime server reads or writes while the user is using it?

| Answer | Lane | Default move |
| --- | --- | --- |
| No | Static artifact | Use `jun-ui build` or `jun-ui bundle-app`, then `verify-page --strict`. |
| Yes | Runtime app | Use the target project's app/server stack, while enforcing Semi tokens, `jun-ui` delivery variables, and Semi patterns. |
| Unclear and costly if wrong | Ask once | Ask whether runtime server data is required. |

Do not make the user manually pick a lane when the request is clear. Respect explicit overrides such as "make this file-openable" or "this must be server-backed."

## Hard Boundaries

- Do not invent a parallel component framework for common product UI.
- Do not rely on guessed Semi APIs when documentation can be checked.
- Do not add Context7 to browser runtime dependencies.
- Treat `ctx7` as the default documentation execution path. MCP is optional.
- Require the `context7-docs` and `context7-cli` Skills, not only the `ctx7` binary.
- Stop before Semi implementation if neither Context7 CLI + Skills nor an explicitly approved Context7 MCP path is available.
- Do not require a dev server for final review.
- Do not require a dev server for final review of static artifacts.
- Do not force a server-backed workflow into a static artifact when it needs runtime reads or writes.
- Do not make every target project own Node, Semi, or Builder dependencies when the centralized Builder can produce the artifact.
- Do not make `jun-ui` own target-project server, database, auth, deployment, or business state.
- Do not treat source implementation style as more important than the final artifact quality.
- Do not report a page complete if `jun-ui verify-page <config-or-artifact> --strict` fails. Fix token, asset, or artifact-shape violations first.
- Do not handwrite page colors when a Semi `--semi-*` token exists. Strict postflight should reject bare page colors unless the exception is explicit and local to a non-UI asset such as a chart series or external brand mark. Use `--jun-ui-*` only for delivery layout variables.
- Do not restore old visual alias compatibility in the Builder. 旧视觉 alias 不再是输出合约; migrate old page CSS to Semi `--semi-*` tokens and delivery variables instead.
- Do not define project-local visual token namespaces or local visual aliases such as `--ck-*`, `--prod-*`, `--ff-*`, `--panel-bg`, or `--font-size-meta` in target project CSS. Page CSS must consume Semi `--semi-*` visual tokens and `--jun-ui-*` delivery/layout variables directly; `verify-page --strict` rejects project-local visual custom property definitions.
- Do not treat token injection as enough for delivery. Every native `button`, `input`, `textarea`, or `select` must either be a Semi component output or explicitly carry a `jui-*` control class / `data-jun-ui-control` marker, with `appearance: none` covered by source CSS.
- Prefer running `jun-ui verify-page` against the page config instead of only the built HTML when a config exists, because config verification can inspect HTML shell, app entry, and source CSS before bundling.
- Do not mix clickable affordances. Keep one solid primary per view, a uniform secondary-button treatment, openable cards visually distinct from buttons, and passive status labels that never look like controls. Do not show the same action twice in two different styles. See `references/affordance-hierarchy.md`.
- Do not let low-use content dominate the page. Metadata, debug detail, source paths, explanatory copy, navigation chrome, or secondary information must not be visually larger, louder, or earlier than primary information unless the task explicitly makes it primary. See `references/information-architecture.md`.
- Do not report a page complete if the final artifact or runtime URL consumes `--jun-ui-*` variables but does not define the `jun-ui` delivery token layer. Fix the Builder or runtime token sheet instead of hiding the defect with page-local fallback values.
- Do not force every consumer project to adopt jun-ui by default. Force the adoption decision gate instead: ask Jun whether the project/page work should use `jun-ui-design-system`, record `jun-ui adoption decision: adopted`, `jun-ui adoption decision: deferred`, or `jun-ui adoption decision: not-suitable`, and preserve a reopen path for deferred/not-suitable decisions.
- Do not treat a consumer project as ready for Design System work unless its agent instructions route product page, workbench, dashboard, settings screen, detail page, or local tool UI tasks to `jun-ui-design-system`, require Semi Design System, forbid project-local visual tokens, and require `verify-page --strict`. Use `jun-ui doctor --strict --consumer-root <project-root>` to enforce this.
- Do not treat a new or materially reshaped project as having passed the startup decision gate unless `jun-ui doctor --strict --adoption-root <project-root>` passes. `jun-ui verify-page <config-or-artifact> --strict --project-root <project-root>` also enforces this gate for external projects before accepting page delivery.

## Workflow

1. Identify the page type, user-visible outcome, and required interactions.
2. Classify the information architecture: page job, primary information, secondary information, tertiary information, primary action, and risk if the primary information is missed.
3. Map visual hierarchy before implementation: first-screen scan path, heading outline, layout area, typography scale, grouping, and action proximity.
4. Decide whether Figma is the source, review surface, or not needed for this task.
5. Use Context7 CLI + Skills through `ctx7` to ground Semi component usage.
6. Run `jun-ui doctor --strict` if the current session has not already verified `ctx7`, `context7-docs`, and `context7-cli`.
7. When starting or materially reshaping a target project, record one startup choice: `jun-ui adoption decision: adopted`, `jun-ui adoption decision: deferred`, or `jun-ui adoption decision: not-suitable`. Deferred/not-suitable records must include `Reason:` and `Reopen path:`.
8. Run `jun-ui doctor --strict --adoption-root <project-root>` so the project-level agent instructions prove the decision gate happened.
9. When the target project is adopted, run `jun-ui doctor --strict --consumer-root <project-root>` so the project-level agent instructions prove they will invoke this Skill and strict page verification for UI work.
10. For static artifacts, build with Semi through `jun-ui build`, `jun-ui bundle-app`, or the project's explicitly controlled static build profile.
11. For static artifacts, produce a file-openable artifact with relative asset paths.
12. For static artifacts, run `jun-ui verify-page <config-or-artifact> --strict` against the page config when available, otherwise the built artifact.
13. For static artifacts, open the built artifact through `file://` or a browser-equivalent smoke check.
14. For runtime apps, use the target project's server/app stack and verify the served URL plus at least one runtime state path.
15. Confirm native controls are not leaking browser-default UI, the visual hierarchy matches information value, and report the artifact path or runtime URL, verification evidence, and any interaction gaps.
16. Confirm the built artifact or runtime URL defines the `--jun-ui-*` delivery token layer whenever page CSS consumes those variables.
17. Confirm scan card grids and compact panels do not create text overflow, escaped actions, collapsed gaps, or cramped columns in the inspected viewport.

## References

Read `references/delivery-contract.md` when implementing or reviewing page output requirements.

Read `references/builder-contract.md` before adding a page config, invoking `jun-ui build`, or deciding whether a target project needs its own frontend toolchain.

Read `references/affordance-hierarchy.md` when composing or reviewing interactive controls — buttons, navigation, filters, inline shortcuts, openable cards, or status labels — so the page uses one consistent clickable language.

Read `references/information-architecture.md` before composing or reviewing page layout — titles, summary regions, metrics, cards, tables, filters, forms, tabs, and first-screen hierarchy — so primary information is visually stronger than secondary information.

Read `/Users/jun/workspace/jun-ui/docs/delivery-lanes.md` before changing lane routing or deciding between static artifact and runtime app delivery.

Read `/Users/jun/workspace/jun-ui/docs/context7.md` before installing or repairing Context7 CLI + Skills.

For the system rationale, read `/Users/jun/workspace/jun-ui/docs/problem-and-solution.md` and `/Users/jun/workspace/jun-ui/docs/design-system.md`.
