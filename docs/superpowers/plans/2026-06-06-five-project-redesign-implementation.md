# Five Project Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `ai-radar`, `personal-ops`, `flowforge`, `macroPulse`, and `dubforge` pages with the current `jun-ui` Design System while preserving each project's data and runtime contracts.

**Architecture:** Existing `bundle-app` projects keep their browser logic and output paths while their shell/styles move to `--jun-ui-*` tokens. Projects without a `jun-ui` artifact get a file-openable `bundle-app` artifact beside the existing app. The centralized `/Users/jun/workspace/jun-ui/scripts/jun-ui.mjs` Builder owns React, Semi, Vite, token injection, and strict postflight.

**Tech Stack:** `jun-ui bundle-app`, `jun-ui build`, Semi Design System, React through centralized Builder, project-local static data and existing test runners.

---

### Task 1: AI Radar Workbench

**Files:**
- Modify: `/Users/jun/workspace/ai-radar/app/workbench/shell.html`
- Modify: `/Users/jun/workspace/ai-radar/app/workbench/styles.css`
- Verify via existing: `/Users/jun/workspace/ai-radar/scripts/build-workbench-static.mjs`

- [ ] **Step 1: Verify RED**

Run:
```sh
cd /Users/jun/workspace/ai-radar
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page app/workbench --strict
```
Expected: FAIL on old bare colors or old token usage.

- [ ] **Step 2: Replace page-layer colors**

Convert the page CSS to aliases derived from `--jun-ui-*` tokens. Keep existing DOM IDs used by `/Users/jun/workspace/ai-radar/src/app.mjs`.

- [ ] **Step 3: Build and verify**

Run:
```sh
cd /Users/jun/workspace/ai-radar
npm run build:workbench
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page app/workbench --strict
npm test
```
Expected: PASS.

### Task 2: FlowForge Static Pages

**Files:**
- Modify: `/Users/jun/workspace/flowforge/app/static/styles.css`
- Modify: `/Users/jun/workspace/flowforge/app/static/content-workspace-prototype.css`
- Verify via existing: `/Users/jun/workspace/flowforge/scripts/build-static-pages.py`

- [ ] **Step 1: Verify RED**

Run both strict verifiers. Expected: FAIL on old bare colors or old token usage.

- [ ] **Step 2: Replace page-layer colors**

Convert both CSS files to aliases derived from `--jun-ui-*` tokens. Keep existing element IDs used by existing scripts.

- [ ] **Step 3: Build and verify**

Run:
```sh
cd /Users/jun/workspace/flowforge
python3 scripts/build-static-pages.py
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page app/static/index.jun-ui.json --project-root /Users/jun/workspace/flowforge --strict
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page app/static/content-workspace-prototype.jun-ui.json --project-root /Users/jun/workspace/flowforge --strict
```
Expected: PASS.

### Task 3: Personal Ops Today

**Files:**
- Modify: `/Users/jun/workspace/personal-ops/tools/render_today.py`
- Generated: `/Users/jun/workspace/personal-ops/site/today.html`
- Generated: `/Users/jun/workspace/personal-ops/site/jun-ui.page.json`

- [ ] **Step 1: Record baseline**

Run:
```sh
cd /Users/jun/workspace/personal-ops
python3 tools/render_today.py
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page site/jun-ui.page.json --project-root /Users/jun/workspace/personal-ops --strict
```
Expected: PASS, but content remains old information architecture.

- [ ] **Step 2: Reorder page intent**

Update config generation so recommendation, state quality, and action cards come before source detail. Keep action IDs stable and page read-only.

- [ ] **Step 3: Render and verify**

Run the same render and strict verify commands. Expected: PASS.

### Task 4: macroPulse Macro Desk

**Files:**
- Create: `/Users/jun/workspace/macroPulse/site/macro-desk.shell.html`
- Create: `/Users/jun/workspace/macroPulse/site/macro-desk.css`
- Create: `/Users/jun/workspace/macroPulse/site/macro-desk.jsx`
- Create: `/Users/jun/workspace/macroPulse/site/macro-desk.jun-ui.json`
- Generated: `/Users/jun/workspace/macroPulse/site/macro-desk.html`

- [ ] **Step 1: Verify RED**

Run:
```sh
test -f /Users/jun/workspace/macroPulse/site/macro-desk.html
```
Expected: FAIL because the artifact is missing.

- [ ] **Step 2: Add file-openable artifact source**

Create a compact macro desk preserving phase status, thesis review, evidence drivers, asset tabs, AI question lane, and saved notes.

- [ ] **Step 3: Build and verify**

Run:
```sh
cd /Users/jun/workspace/macroPulse
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs bundle-app site/macro-desk.jun-ui.json --project-root /Users/jun/workspace/macroPulse
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page site/macro-desk.jun-ui.json --project-root /Users/jun/workspace/macroPulse --strict
npm test
```
Expected: PASS.

### Task 5: DubForge Review Workbench

**Files:**
- Create: `/Users/jun/workspace/dubforge/frontend/jun-ui-workbench/shell.html`
- Create: `/Users/jun/workspace/dubforge/frontend/jun-ui-workbench/styles.css`
- Create: `/Users/jun/workspace/dubforge/frontend/jun-ui-workbench/app.jsx`
- Create: `/Users/jun/workspace/dubforge/frontend/jun-ui-workbench/jun-ui.bundle.json`
- Generated: `/Users/jun/workspace/dubforge/frontend/jun-ui-workbench/index.html`

- [ ] **Step 1: Verify RED**

Run:
```sh
test -f /Users/jun/workspace/dubforge/frontend/jun-ui-workbench/index.html
```
Expected: FAIL because the artifact is missing.

- [ ] **Step 2: Add file-openable review artifact**

Create a human-gated operations console preserving candidate discovery, production review, retrospective, closed-loop evidence, and AI contract meanings.

- [ ] **Step 3: Build and verify**

Run:
```sh
cd /Users/jun/workspace/dubforge
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs bundle-app frontend/jun-ui-workbench/jun-ui.bundle.json --project-root /Users/jun/workspace/dubforge
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page frontend/jun-ui-workbench/jun-ui.bundle.json --project-root /Users/jun/workspace/dubforge --strict
cd frontend && npm test
```
Expected: PASS.

