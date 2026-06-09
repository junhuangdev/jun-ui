# Token Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a file-openable mixed-audience token console for `jun-ui`.

**Architecture:** Add a structured token registry as the single source of truth. Generate Builder CSS and the token console page from that registry through `scripts/jun-ui.mjs`, then validate the registry and generated artifact through `scripts/validate.mjs`.

**Tech Stack:** Node.js ESM, static HTML/CSS/JS, existing `jun-ui` CLI, existing validation script.

---

## Files

| File | Responsibility |
| --- | --- |
| `tokens/jun-ui.tokens.json` | Source-of-truth token registry |
| `scripts/jun-ui.mjs` | Shared token loading, Builder CSS generation, `tokens` command |
| `scripts/validate.mjs` | Registry and artifact-shape validation |
| `dist/tokens/index.html` | Generated token console artifact |
| `dist/tokens/assets/` | Generated relative assets |

## Tasks

### Task 1: Add Failing Validation

- [ ] Add validation checks for `tokens/jun-ui.tokens.json`.
- [ ] Require color, type, spacing, radius, border, and shadow groups.
- [ ] Require current Builder tokens.
- [ ] Run `npm test` and confirm failure because the registry does not exist.

### Task 2: Add Registry And Shared CSS

- [ ] Create `tokens/jun-ui.tokens.json`.
- [ ] Add token loading helpers in `scripts/jun-ui.mjs`.
- [ ] Generate Builder `:root` CSS from the registry.
- [ ] Run `npm test` and confirm registry validation passes.

### Task 3: Add Token Console Command

- [ ] Add `jun-ui tokens` command.
- [ ] Generate `dist/tokens/index.html` and relative assets.
- [ ] Include static fallback content, token sections, pattern proof, and copy blocks.
- [ ] Run `node scripts/jun-ui.mjs tokens`.

### Task 4: Verify Final Artifact

- [ ] Run `npm test`.
- [ ] Inspect the generated artifact for relative asset paths and fallback content.
- [ ] Open the final page through a browser-equivalent check.
- [ ] Report the artifact path and any remaining gaps.

### Task 5: Add Reference Style Comparison

- [ ] Add validation checks that the token console includes four reference styles: Polaris-like, Primer-like, Spectrum-like, and Atlassian-like.
- [ ] Add a comparison section to the token console before the token catalog.
- [ ] Render the same compact workbench preview with each reference palette.
- [ ] Keep the current `jun-ui` token values unchanged until the user chooses a direction.
- [ ] Run `node scripts/jun-ui.mjs tokens` and `npm test`.
