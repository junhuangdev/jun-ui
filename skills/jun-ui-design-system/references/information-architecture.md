# Information Architecture And Visual Hierarchy

Use this reference before composing a Jun product page with Semi Design System, Context7, Figma, the installable `jun-ui-design-system` Skill, or the `jun-ui` Builder. It applies to `file://` file-openable static artifacts and server-backed runtime app surfaces.

## Required Pre-Composition Packet

Before choosing layout or components, write this packet in your working notes:

| Field | Required answer |
| --- | --- |
| Page job | One sentence: "This page lets the user..." |
| Primary information | The state, object, conclusion, metric, or decision the page exists to show. |
| Secondary information | Context needed to interpret the primary information. |
| Tertiary information | Metadata, audit detail, history, source paths, or rare settings. |
| Primary action | The one action that should be easiest to find. |
| Risk if missed | What goes wrong if the user misses the primary information. |

Do not start Semi implementation until this packet is coherent. Use Context7 CLI + Skills through `ctx7` for Semi API decisions after the packet is done. Use Figma when the hierarchy needs visual review.

## Weight-To-UI Mapping

| Weight | UI mapping |
| --- | --- |
| Primary information | First viewport, strongest title or metric treatment, largest useful region, closest to the primary action. |
| Secondary information | Nearby cards, summary rows, filters, or supporting charts with moderate type. |
| Tertiary information | Tabs, disclosure, compact tables, small muted text, lower page sections, or side panels. |
| Supporting chrome | Stable navigation, source labels, debug links, and footer text; quiet and consistent. |

Screen area must follow value. A low-use panel should not be larger or louder than the primary information. A primary conclusion should not be hidden in table text, a tiny badge, or a cramped card.

## Mandatory Review Checks

- The first screen answers: where am I, what matters, what changed, and what can I do next?
- The heading outline has one `h1`, clear `h2` sections, and no fake hierarchy made from random font sizes.
- Primary information appears before explanatory, decorative, audit, or debug material.
- Related controls stay near the content they affect.
- Secondary information supports the primary region without competing with it.
- Tertiary information is quiet, deferred, or compressed.
- Mobile stacking preserves relationships; paired facts do not separate across unrelated sections.
- A scan card grid reduces columns before becoming cramped; titles, metadata, tags, and actions stay inside each card with wrapping and overflow checks.
- The page still obeys the interaction affordance hierarchy in `affordance-hierarchy.md`.
- Static artifact work still ends in a file-openable `file://` result built by the Builder and checked with `verify-page --strict`.
- Runtime app work still verifies the served URL and at least one server-backed behavior.
- The final artifact or runtime URL defines the delivery token layer when page CSS consumes `--jun-ui-*`, and key layout gaps compute to px values instead of disappearing.

## Reject These Designs

- Equal-weight cards for unequal information.
- Oversized metadata, instructions, logs, or source paths.
- Tiny primary conclusions, tiny primary actions, or primary state hidden below the fold.
- Marketing-style heroes in operational tools, dashboards, settings, or workbenches.
- Detached filters, detached save buttons, or actions far away from affected content.
- More visual weight on navigation or controls than on the result area.
- A table-first page when the user needs a summary or recommendation first.
- scan cards whose titles, metadata, tags, buttons, or commands overflow because the grid packs too many columns.
- runtime or bundled pages whose cards or vertical stacks collapse because the `--jun-ui-*` delivery token layer is missing from the final page.

## Compact Review Prompt

Use this prompt before delivery:

```text
Review this page for information architecture and visual hierarchy. Identify the primary information, secondary information, tertiary information, primary action, first-screen scan path, heading outline, layout area balance, and any region where visual weight does not match information value. Reject the page if important content is small, late, detached, or visually weaker than low-use content.
```
