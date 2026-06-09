# Five-Project jun-ui Redesign Pack

## Summary

Redo `ai-radar`, `personal-ops`, `flowforge`, `macroPulse`, and `dubforge` as current `jun-ui` Design System pages while preserving each project's business contract and final file-openable artifact target.

## Shared Contract

| Rule | Requirement |
| --- | --- |
| UI system | Use `jun-ui` + Semi Design System through the centralized Builder. |
| Token usage | Target CSS must reference `--jun-ui-*` tokens or aliases derived from them. Do not define page color literals in target CSS. |
| Artifact | Final pages must open through `file://` with relative assets and classic scripts. |
| Verification | Run `jun-ui verify-page <config-or-artifact> --strict` before reporting a page done. |
| Runtime boundary | Do not move Builder, React, Semi, Vite, Context7, or Figma dependencies into target projects. |
| Safety | Preserve existing dirty worktree changes. Do not replace unrelated project files. |

`bundle-app` now injects the shared `--jun-ui-*` token definitions into the bundled CSS. Target project CSS should only consume the tokens.

## Starter Template

Use `templates/project-redesigns/bundle-app-redesign-starter/` as the shared starter for target-project implementation. It includes:

- `shell.html`: static fallback and dense workbench layout.
- `styles.css`: token-only shell styles.
- `app.jsx`: a small Semi-powered action strip using Builder-owned React/Semi dependencies.
- `configs/*.json`: project-specific `bundle-app` configs for the five redesign targets.

This starter is not the final delivery state. It is the migration seed for replacing each target page while preserving that project's data, DOM, build, and verification contracts.

## Project Plan

| Project | Target artifact | Lane | Status |
| --- | --- | --- | --- |
| `ai-radar` | `app/workbench/index.html` | Rebuild existing `bundle-app` page | Needs redesign; strict verification currently fails on old colors. |
| `personal-ops` | `site/today.html` | Upgrade current Builder page or move to richer `bundle-app` shell | Current strict verification passes; still needs visual/information architecture redo. |
| `flowforge` | `app/static/index.html`, `app/static/content-workspace-prototype.html` | Rebuild existing `bundle-app` pages | Needs redesign; strict verification currently fails on old colors. |
| `macroPulse` | `site/macro-desk.html` | Add new file-openable `jun-ui` artifact beside Next app | No `jun-ui` artifact yet. |
| `dubforge` | `frontend/jun-ui-workbench/index.html` | Add new file-openable review artifact beside Vite app | No `jun-ui` artifact yet; production app remains Arco/Vite until separately migrated. |

## ai-radar

### Preserve

- Engineering root stays `/Users/jun/workspace/ai-radar`.
- Obsidian remains the sink, not the app root.
- `scripts/build-workbench-static.mjs` remains the rebuild command.
- `data/static-data.js`, `data/index.json`, and `data/status.json` remain the direct-open data snapshot.
- Existing DOM IDs used by `src/app.mjs` stay stable unless the JS is updated in the same change.

### Redesign

- Replace old `jui-*` shell classes with project-neutral `jun-ui` token aliases.
- Keep the report catalog, freshness status, current-view bar, evidence list, goal matrix, observation pool, source list, and prompt lab.
- Reframe the page as a dense news triage workbench: left report rail, main report body, right action rail.
- Make stale bundle, static fallback, and live-data fallback states first-screen visible.

### Commands

```sh
cd /Users/jun/workspace/ai-radar
npm run build:workbench
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page app/workbench --strict
npm test
```

## personal-ops

### Preserve

- `tools/render_today.py` stays the refresh entry.
- Backend remains `/Users/jun/Documents/Obsidian/90_System/Personal Ops`.
- The page remains read-only and must not write backend state.
- Action IDs in `actions.md` remain stable.

### Redesign

- Treat the page as a personal secretary console, not a task board.
- Put the recommendation, state quality, and action buttons above long source detail.
- Keep source files and reconciliation details lower on the page.
- If richer layout is needed, move from simple `jun-ui build` config to a `bundle-app` shell while keeping `render_today.py` as the single refresh command.

### Commands

```sh
cd /Users/jun/workspace/personal-ops
python3 tools/render_today.py
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page site/jun-ui.page.json --project-root /Users/jun/workspace/personal-ops --strict
```

## flowforge

### Preserve

- `scripts/build-static-pages.py` remains the build entry.
- `*.shell.html` remain source files.
- `index.html` and `content-workspace-prototype.html` remain generated artifacts.
- Local-only and no-external-action boundaries stay visible.
- Existing element IDs used by `app/static/app.js` and `content-workspace-prototype.js` stay stable unless those scripts change in the same patch.

### Redesign

- Replace `--jui-*` and FlowForge hardcoded colors with aliases derived from `--jun-ui-*`.
- Keep two page purposes distinct:
  - `index.html`: local growth-system cockpit.
  - `content-workspace-prototype.html`: staged content workspace.
- Make human gates, Codex handoff, and local runtime limitations visible without explanatory clutter.

### Commands

```sh
cd /Users/jun/workspace/flowforge
python3 scripts/build-static-pages.py
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page app/static/index.jun-ui.json --project-root /Users/jun/workspace/flowforge --strict
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page app/static/content-workspace-prototype.jun-ui.json --project-root /Users/jun/workspace/flowforge --strict
```

## macroPulse

### Preserve

- The Next app remains the product/runtime surface.
- Existing macro seed and reflection logic remain source data.
- No server is required for final review of the new artifact.

### Redesign

- Add a file-openable `jun-ui` artifact, proposed path `site/macro-desk.html`.
- Use a calmer operational desk instead of the current dark terminal styling.
- Keep core modules: phase status, gold thesis review, evidence drivers, asset tabs, AI question lane, and saved notes.
- Build with `bundle-app` from a small shell, CSS, and ESM entry that reuses or snapshots current seed data.

### Commands

```sh
cd /Users/jun/workspace/macroPulse
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs bundle-app site/macro-desk.jun-ui.json --project-root /Users/jun/workspace/macroPulse
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page site/macro-desk.jun-ui.json --project-root /Users/jun/workspace/macroPulse --strict
npm test
```

## dubforge

### Preserve

- Existing React/Vite/Arco production app stays intact.
- Human gates remain explicit.
- Candidate discovery, production review, retrospective, and closed-loop status stay visible.
- Existing AI contract attributes and meanings should be mirrored where the static artifact represents the same workflow.

### Redesign

- Add a file-openable review artifact, proposed path `frontend/jun-ui-workbench/index.html`.
- The artifact should be a human-gated operations console, not a marketing page.
- Layout target: left workflow rail, center active gap/queue, right gate evidence and next action.
- Use mocked or static snapshots from existing frontend mocks first; live API migration is a later choice.

### Commands

```sh
cd /Users/jun/workspace/dubforge
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs bundle-app frontend/jun-ui-workbench/jun-ui.bundle.json --project-root /Users/jun/workspace/dubforge
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page frontend/jun-ui-workbench/jun-ui.bundle.json --project-root /Users/jun/workspace/dubforge --strict
cd frontend && npm test
```

## Completion Gate

The full objective is complete only when all five project artifacts exist in their target repositories, all strict `verify-page` commands pass, and the relevant project tests still pass or any skipped test is explicitly justified.
