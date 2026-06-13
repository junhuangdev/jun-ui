# Information Hierarchy Long Task Prompt

Use this prompt when a future agent needs to continue improving `jun-ui` as a page-design knowledge base rather than only a component wrapper.

## Objective

Improve AI page design quality in `jun-ui` by studying information architecture, visual hierarchy, interaction design, and design-system practice, then turning the learning into durable Skill guidance, Design System docs, templates, examples, and validation checks.

## Background

The recurring failure is not missing components. The failure is bad information weighting: secondary information gets large type or large regions, important information becomes small or late, and pages read as equal-weight blocks instead of task-oriented product surfaces.

`jun-ui` should solve this at the AI guidance layer:

- decide primary information, secondary information, and tertiary information before layout;
- map information weight to region size, typography, grouping, and controls;
- keep Semi Design System as the component surface;
- use Context7 CLI + Skills through `ctx7` before material Semi implementation;
- use Figma when visual review matters;
- preserve static artifact and runtime app delivery lanes;
- keep final static artifacts file-openable through `file://`;
- keep `verify-page --strict` as the static postflight gate.

## Source Study Plan

Use these sources first:

| Source | Study focus |
| --- | --- |
| NN/g visual hierarchy | Contrast, scale, grouping, squint test, attention order. |
| NN/g proximity and Gestalt principles | How spacing and grouping communicate relationships. |
| NN/g progressive disclosure | How to keep primary tasks visible and defer rare detail. |
| W3C WAI headings and page structure | How semantic structure supports scanning and accessibility. |
| IBM Carbon grid and spacing | How tokenized spacing/grid systems create consistent density. |
| GOV.UK Design System | How patterns and components prevent repeated service-design mistakes. |
| Apple HIG and Material Design | Typography, layout, adaptive behavior, and platform-grade hierarchy. |
| Don Norman, The Design of Everyday Things | Affordances, signifiers, constraints, mapping, feedback. |
| Rosenfeld/Morville/Arango, Information Architecture | Organization, labeling, navigation, search, metadata, findability. |

## Execution Plan

1. Inspect current `jun-ui` docs, Skill references, templates, examples, and validation script.
2. Build a source-backed principle map: information weight, layout region, typography, grouping, action proximity, disclosure, responsive regrouping.
3. Update `docs/page-information-architecture.md` with stable rules and source links.
4. Add or update `skills/jun-ui-page-delivery/references/information-architecture.md` as the fast execution checklist.
5. Wire the reference into `skills/jun-ui-page-delivery/SKILL.md`, `docs/design-system.md`, `docs/problem-and-solution.md`, and delivery docs.
6. Add validation checks so the new rule remains part of user-facing docs and the Skill.
7. Improve starter templates only after the rules are documented. Keep template changes focused on first-screen hierarchy, heading outline, and weight-to-region mapping.
8. Run `npm test`. If generated artifacts are affected, also run the relevant `jun-ui build` or `jun-ui bundle-app` smoke and `jun-ui verify-page --strict`.
9. Report source links, changed files, verification evidence, and any unrelated repository drift separately.

## Acceptance Criteria

- The repository has a clear information architecture and visual hierarchy doctrine.
- The installable Skill tells agents to classify primary information and secondary information before composing UI.
- The delivery contract rejects pages where visual weight contradicts information value.
- Future page work has a compact review checklist for first-screen hierarchy.
- `npm test` either passes or reports unrelated pre-existing blockers with exact failure text.

