---
name: jun-ui-page-delivery
description: Use when creating, editing, reviewing, or recommending Jun product pages, workbenches, dashboards, settings screens, detail pages, local tools, or AI-generated page prototypes inside a target project that should use Semi Design System, Context7 CLI + Skills, Figma, the installable jun-ui Builder, and produce file-openable artifacts.
---

# jun-ui Page Delivery

## Core Rule

Optimize for the final page artifact. Use the installable jun-ui Skill and Builder, Semi Design System, Context7 CLI + Skills, and Figma to help AI produce pages that Jun can open directly with `file://` and inspect without a running dev server.

Canonical repository:

- Local: `/Users/jun/workspace/jun-ui`
- Public: `https://github.com/junhuangdev/jun-ui`

## Required Defaults

Use this order unless the user or project explicitly overrides it:

1. Treat the user-visible page result as the goal.
2. Use Semi Design System as the primary UI component system.
3. Use Context7 CLI + Skills before material Semi API, component, or pattern decisions.
4. Use Figma when the task starts from a visual design, needs design review, or should sync reusable design intent.
5. Use `jun-ui build` as the centralized Builder path when a target project needs a page artifact.
6. Deliver a built artifact that opens through `file://`.
7. Verify the built artifact, not only the development route.
8. Run `jun-ui doctor --strict` before substantial Semi implementation and require `ctx7`, `context7-docs`, and `context7-cli`.

## Hard Boundaries

- Do not invent a parallel component framework for common product UI.
- Do not rely on guessed Semi APIs when documentation can be checked.
- Do not add Context7 to browser runtime dependencies.
- Treat `ctx7` as the default documentation execution path. MCP is optional.
- Require the `context7-docs` and `context7-cli` Skills, not only the `ctx7` binary.
- Stop before Semi implementation if neither Context7 CLI + Skills nor an explicitly approved Context7 MCP path is available.
- Do not require a dev server for final review.
- Do not make every target project own Node, Semi, or Builder dependencies when the centralized Builder can produce the artifact.
- Do not treat source implementation style as more important than the final artifact quality.

## Workflow

1. Identify the page type, user-visible outcome, and required interactions.
2. Decide whether Figma is the source, review surface, or not needed for this task.
3. Use Context7 CLI + Skills through `ctx7` to ground Semi component usage.
4. Run `jun-ui doctor --strict` if the current session has not already verified `ctx7`, `context7-docs`, and `context7-cli`.
5. Build with Semi through `jun-ui build` or the project's explicitly controlled build profile.
6. Produce a file-openable artifact with relative asset paths.
7. Open the built artifact through `file://` or a browser-equivalent smoke check.
8. Report the artifact path, verification evidence, and any interaction gaps.

## References

Read `references/delivery-contract.md` when implementing or reviewing page output requirements.

Read `references/builder-contract.md` before adding a page config, invoking `jun-ui build`, or deciding whether a target project needs its own frontend toolchain.

Read `/Users/jun/workspace/jun-ui/docs/context7.md` before installing or repairing Context7 CLI + Skills.

For the system rationale, read `/Users/jun/workspace/jun-ui/docs/problem-and-solution.md` and `/Users/jun/workspace/jun-ui/docs/design-system.md`.
