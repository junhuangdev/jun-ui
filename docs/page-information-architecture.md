# Page Information Architecture And Visual Hierarchy

This document defines how `jun-ui` pages decide what deserves attention before choosing Semi Design System components, Builder output, or runtime layout. It is part of the installable `jun-ui-page-delivery` Skill contract for both `file://` file-openable static artifact work and server-backed runtime app work.

## One-Line Rule

Decide the information weight before drawing the page: primary information gets the first scan path, largest meaningful region, strongest type treatment, and closest action; secondary information supports it; tertiary information stays quiet or moves behind tabs, disclosure, tables, or detail views.

## Source Model

The rule is based on stable product-design sources:

| Source | What `jun-ui` adopts |
| --- | --- |
| [NN/g visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) | Hierarchy comes from contrast, scale, and grouping; if everything is emphasized, nothing is. |
| [NN/g proximity](https://www.nngroup.com/articles/gestalt-proximity/) | Related things must sit together; distant controls and facts are missed during task-focused scanning. |
| [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Show frequent and important options first; defer rare or advanced detail. |
| [W3C WAI headings](https://www.w3.org/WAI/tutorials/page-structure/headings/) | Heading order communicates page structure and supports navigation. |
| [W3C cognitive page structure](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o2p03-page-structure/) | Clear regions, headings, and visual cues reduce cognitive load. |
| [IBM Carbon 2x Grid](https://carbondesignsystem.com/elements/2x-grid/overview/) and [spacing](https://carbondesignsystem.com/elements/spacing/overview/) | Grid and spacing scales create reliable density and relationships. |
| [GOV.UK Design System](https://design-system.service.gov.uk/) | Reusable styles, components, and patterns prevent teams from repeating solved service-design work. |
| [The Design of Everyday Things](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/) | Affordances, signifiers, constraints, and feedback make interaction understandable. |
| [Information Architecture, 4th Edition](https://www.oreilly.com/library/view/information-architecture-4th/9781491913529/) | Organization, labeling, navigation, search, and metadata form the structure people use to find meaning. |

Context7 still owns Semi API grounding. Use Context7 CLI + Skills through `ctx7` before material Semi implementation. Figma is the review surface when visual intent or design-system discussion matters. The Builder owns static artifact output; target projects own runtime app servers.

## Information Weight Tiers

Every page starts with a weight table. Do not choose a card grid, hero block, table, or font scale until this table is clear.

| Tier | Meaning | Layout Treatment | Type Treatment |
| --- | --- | --- | --- |
| Primary information | What the user came to decide, understand, or act on now. | First viewport, first scan path, largest useful region, close to the primary action. | Page title, key metric, current state, or concise decision text. |
| Secondary information | Context needed to interpret the primary information. | Near the primary region, grouped by task, visible without competing. | Section title, normal body, compact metric, filter label. |
| Tertiary information | Audit detail, metadata, long history, references, and rare controls. | Tables, tabs, accordions, side panels, or lower page sections. | Muted body, small metadata, table text, tags. |
| Supporting chrome | Navigation, source labels, footers, debug links, and system furniture. | Stable frame or quiet edge region. | Small, muted, consistent across pages. |

Primary information is not always a metric. In a report it may be the conclusion. In a settings screen it may be the current configuration and save state. In a detail page it may be the object identity, risk, owner, and next action. In a runtime app it may be the live state and the mutation path.

## Page Design Workflow

1. Write the page job in one sentence: "This page lets the user..."
2. Identify the top three user questions the first screen must answer.
3. Fill the information weight table: primary information, secondary information, tertiary information, supporting chrome.
4. Choose the page pattern: dashboard, workbench, detail, settings, form, report, or runtime app surface.
5. Place primary information before decorative, explanatory, or low-use material.
6. Choose Semi Design System components and Semi `--semi-*` visual tokens after the hierarchy is set; use `--jun-ui-*` only for delivery layout variables.
7. Use Figma for visual review when hierarchy, density, or handoff needs human inspection.
8. For static artifacts, build with the `jun-ui` Builder and verify the file-openable `file://` result. For runtime apps, verify the served app and relevant server-backed behavior.

## Layout Rules

- The primary region must answer "where am I?", "what matters?", and "what can I do next?" without scrolling on normal desktop viewports.
- A secondary panel must not take more visual area or stronger typography than the primary region unless the user task explicitly makes it primary.
- Avoid equal-weight dashboards where every card uses the same size, same title level, and same emphasis. Equal cards imply equal importance.
- Keep controls close to the object or region they affect. A filter far from the list, or a save action far from the edited form, breaks proximity.
- Use tabs or segmented views for genuinely different task modes. Use sections for one task with multiple supporting groups.
- Use disclosure for rare detail. Do not make audit logs, source paths, long descriptions, or debug metadata larger than current state.
- Preserve grouping on mobile. When columns stack, related controls and facts must remain adjacent.
- Use one scroll region per surface, as defined in the delivery contract.

## Typography Rules

- One `h1` per page. It names the page or object, not a marketing slogan.
- `h2` labels major sections. It should be smaller than the page title and larger than body text.
- Metric-size text is reserved for short values that are genuinely primary or key secondary status.
- Metadata, timestamps, IDs, source paths, and helper text use muted body or kicker treatment.
- Do not use hero-scale type inside dense product tools, compact panels, tables, or sidebars.
- Do not scale font size with viewport width. Use responsive layout, wrapping, and density changes instead.
- The heading outline should read like a short abstract of the page.

## First-Screen Tests

Use these checks before delivery:

| Test | Pass Signal | Failure Signal |
| --- | --- | --- |
| Five-second scan | The user can name the page job, current state, primary item, and next action. | The eye lands on decoration, metadata, or secondary panels first. |
| Squint test | Primary region remains visually dominant when text is blurred. | Every region has equal weight, or a low-value region dominates. |
| Outline test | `h1` and `h2` labels form a coherent page summary. | Headings skip levels, repeat labels, or hide the main task. |
| Area test | Screen space roughly follows information value. | Low-use detail gets the largest area; high-value content is cramped. |
| Proximity test | Controls sit near the content they affect. | The action or filter feels detached from its target. |
| Mobile stack test | Related items remain adjacent after columns collapse. | The second half of a pair is pushed far below unrelated content. |

## Anti-Patterns

- A huge welcome, explanation, or decorative hero on an operational page while the actual work is below the fold.
- Large muted metadata and small primary conclusion.
- A grid of cards where source count, debug info, recommendations, and primary status all look equally important.
- Primary action duplicated in multiple styles.
- Dense tables placed before a summary that explains what the table means.
- Filters, tabs, and controls that are visually stronger than the result they manipulate.
- Empty states that spend more space explaining the system than showing how to proceed.

## Relationship To Existing Rules

This document sits above `skills/jun-ui-page-delivery/references/affordance-hierarchy.md`. Information architecture decides what matters. Visual hierarchy decides how strongly it appears. Affordance hierarchy decides how interactive controls look. Delivery verification then checks tokens, native controls, asset shape, scroll rules, and file-openable or runtime acceptance.
