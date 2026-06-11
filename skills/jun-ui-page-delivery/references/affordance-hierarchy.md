# Interaction Affordance Hierarchy

Apply on every jun-ui page so "what is clickable" reads consistently. A page must use ONE visual language for interactivity: each interaction's **tier** decides its appearance. Violating the letter (one stray off-tier control) violates the spirit — the control set must read as a system, not a grab-bag.

## Tiers → Semi treatment

| Tier | Use for | Semi treatment | Rule |
| --- | --- | --- | --- |
| **Primary** | the single most important action in a view/section | `Button theme="solid" type="primary"` | at most **one** per view/section |
| **Secondary** | navigation, utilities, refresh, filters, toggles | `Button type="tertiary"` (or `theme="light"`) | **uniform size/shape** within a zone |
| **Inline shortcut** | jump to a related object, or "see all" overflow | `Button theme="borderless" size="small"` (accent for jumps, tertiary for overflow) | link-like, but still a real control |
| **Openable object** | content cards / list rows you click to open or drill into | a card/row with a hover state (cursor + border or elevation change) | distinct from buttons; **not button-shaped** |
| **Passive status** | counts, statuses, state labels | `Tag` / small muted or semantic-colored text | **must not look clickable** |

## Anti-patterns (reject in review)

- The **same action shown twice** in different styles (e.g. a `Tag` in the header and a text link in the body) → de-dupe to one canonical control.
- A **clickable element styled as a passive label** (e.g. a grey `Tag` that actually navigates) → give it a control affordance, or make it a real button.
- **Two or more solid primaries** competing in one view → demote all but one to secondary.
- **Mixed sizes for one tier** in one zone (a short `Tag` beside a taller `Button`).
- **Plain text links as primary navigation** when the page uses buttons elsewhere — match the established control language.

`verify-page --strict` surfaces more than one `theme="solid" type="primary"` Button per source file as a non-blocking advisory (a file is a coarse proxy for a view — multi-view files can be legitimate). The remaining anti-patterns are review-only; this document is their carrier.

## Semantic state colors

jun-ui exposes a single `--jun-ui-accent` and **no** semantic color tokens. Express warn / success / danger / lock states through Semi component props (`Tag color="orange|red|green|blue"`, `Banner type="danger|success"`, `Button type=...`), **never** bare colors in source CSS — `verify-page --strict` rejects bare page colors. Semi carries those colors in its own bundled CSS, which the strict source-CSS scan does not touch.

## Pre-delivery checklist

- [ ] Exactly one solid **primary** action per view/section?
- [ ] All **secondary** controls in a zone share size and shape?
- [ ] No action represented in **two different styles**, and no duplicate controls?
- [ ] Clickable things **look** clickable; passive status does **not** look clickable?
- [ ] Semantic colors via **Semi props**, not bare CSS?
