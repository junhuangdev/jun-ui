# jun-ui Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a no-build static-page Design System wrapper that future Codex sessions use as the default frontend entrypoint.

**Architecture:** Keep the library HTML-first. Spectrum Web Components supplies low-level controls, while `jun-ui.css` and `jun-ui.js` supply page-level tokens, patterns, and custom elements.

**Tech Stack:** Native HTML, CSS custom properties, vanilla custom elements, Spectrum Web Components CDN, Node validation script, GitHub public repository.

---

### Task 1: Validation Harness

**Files:**
- Create: `package.json`
- Create: `scripts/validate.mjs`

- [x] **Step 1: Write failing validation**

Create `scripts/validate.mjs` to require the library entry files, examples, core CSS tokens, registered custom elements, and Spectrum CDN snippet.

- [x] **Step 2: Run validation to verify failure**

Run: `npm test`

Expected: failure listing missing files and missing tokens.

- [x] **Step 3: Keep validation as project gate**

Add `"test": "node scripts/validate.mjs"` to `package.json`.

### Task 2: Library Entry Files

**Files:**
- Create: `jun-ui.css`
- Create: `jun-ui.js`
- Create: `vendor/spectrum.html`

- [x] **Step 1: Add CSS tokens and layout primitives**

Define `--jui-page-max`, `--jui-gap`, `--jui-panel-radius`, `--jui-focus-ring`, `.jui-shell`, `.jui-panel`, `.jui-toolbar`, `.jui-grid`, and `.jui-stack`.

- [x] **Step 2: Add custom elements**

Register `jui-app-shell`, `jui-page-header`, `jui-panel`, `jui-section-title`, `jui-stat`, and `jui-empty-state`.

- [x] **Step 3: Add Spectrum CDN snippet**

Document the no-build Spectrum import in `vendor/spectrum.html`.

### Task 3: Docs And Examples

**Files:**
- Create: `README.md`
- Create: `docs/design-system.md`
- Create: `examples/dashboard.html`
- Create: `examples/form.html`
- Create: `examples/detail.html`

- [x] **Step 1: Document default stack**

State that `jun-ui` is the default static-page Design System wrapper, Spectrum is the low-level component system, and Web Awesome / Bootstrap are fallbacks.

- [x] **Step 2: Add examples**

Create directly openable dashboard, form, and detail pages that import Spectrum, `jun-ui.css`, and `jun-ui.js`.

### Task 4: Verification And Publishing

**Files:**
- Modify: Git repository metadata
- Add: global memory supplement after publish

- [x] **Step 1: Run static validation**

Run: `npm test`

Expected: `jun-ui validation passed`.

- [x] **Step 2: Render examples**

Serve the repository with `python3 -m http.server 8765` and use Chrome headless to dump DOM for each example and capture a dashboard screenshot.

- [ ] **Step 3: Publish**

Create public GitHub repo `jun-ui`, commit the library, and push `main`.

- [ ] **Step 4: Update memory**

Add an ad-hoc memory note saying future no-build static product pages default to `/Users/jun/workspace/jun-ui`.
