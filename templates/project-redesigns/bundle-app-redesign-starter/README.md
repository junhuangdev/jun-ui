# Bundle-App Redesign Starter

This starter is the shared execution seed for rebuilding existing project pages with the current `jun-ui` Design System.

It is meant for pages that already own source data and browser behavior, but should not own React, Semi, Vite, or Builder dependencies. The target project copies a config plus the shell, style, and entry files, then runs `jun-ui bundle-app`.

## Files

| File | Purpose |
| --- | --- |
| `shell.html` | File-openable static fallback and layout placeholders. |
| `styles.css` | Token-only page shell styles. |
| `app.jsx` | Small Semi-powered action strip and mode switcher. |
| `configs/*.json` | Project-specific bundle configs for the five-project redesign. |

## Verification

From this repository:

```sh
node scripts/jun-ui.mjs bundle-app templates/project-redesigns/bundle-app-redesign-starter/configs/ai-radar-workbench.jun-ui.bundle.json --project-root templates/project-redesigns/bundle-app-redesign-starter --out /tmp/jun-ui-redesign-ai-radar
node scripts/jun-ui.mjs verify-page templates/project-redesigns/bundle-app-redesign-starter/configs/ai-radar-workbench.jun-ui.bundle.json --project-root templates/project-redesigns/bundle-app-redesign-starter --out /tmp/jun-ui-redesign-ai-radar --strict
```

For target project delivery, use the project-specific commands in `docs/project-redesigns/2026-06-06-five-project-jun-ui-redesign.md`.

