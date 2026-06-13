# jun-ui Builder

The jun-ui Builder is the centralized build surface for the static artifact lane of the installable `jun-ui` Skill.

It lets AI use the jun-ui Design System, Semi Design System, Context7 CLI + Skills, and Figma rules from any target project without making that target project own the frontend toolchain when the requested output can be accepted as a file-openable artifact.

Runtime apps are different: the target project owns the server runtime, routes, data, auth, and deployment. The Builder can provide reference artifacts or static examples, but it is not the runtime app server.

## Command

```bash
jun-ui build <config.json>
```

The local repository command is:

```bash
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs build <config.json>
```

## Responsibility

| Part | Owner |
| --- | --- |
| Node, npm, build tooling | jun-ui Builder |
| Semi Design System usage | jun-ui Skill, Context7, and Builder profile |
| Figma design review path | jun-ui Skill |
| Page intent and source data | target project |
| Final file-openable artifact | written back to target project |
| Runtime server behavior | target project, not the Builder |

## Contract

- Use `jun-ui build` from a target project, global Skill, or project-local Skill install.
- Keep the target project thin: it provides config, data, and the output location.
- Produce a final artifact that opens through `file://`.
- Keep asset paths relative so the output folder is movable.
- Do not add Context7, Figma, or builder dependencies to browser runtime output.
- Run `jun-ui verify-page <config-or-artifact> --strict` after build and before delivery.
- Verify `ctx7`, `context7-docs`, and `context7-cli` with `jun-ui doctor --strict`.
- Stop before Semi implementation if Context7 CLI + Skills through `ctx7` is unavailable.

For runtime app work, use `docs/delivery-lanes.md` first. The app should still follow the Design System contract, but final verification should prove the served URL and server-backed behavior instead of only checking a built artifact.

## Context7 Gate

The Builder environment should pass:

```bash
jun-ui doctor --strict
```

This checks the installable Builder root, the `ctx7` CLI, and the two Context7 Skills used by AI: `context7-docs` and `context7-cli`.

If the check fails, install the required AI-side Context7 path before implementing substantial Semi Design System pages:

```bash
npm install -g ctx7@latest
ctx7 skills install /upstash/context7 context7-docs --global --universal --yes
ctx7 skills install /upstash/context7 context7-cli --global --universal --yes
```

## Current Builder Slice

The current Builder uses Vite library mode to bundle React and Semi Design System into classic IIFE JavaScript plus CSS. It writes a final HTML file with relative asset paths and a static fallback inside `#jun-ui-root`, so the page is visible through `file://` before React takes over.

The `jun-ui build` interface stays stable:

```bash
jun-ui build <config.json> [--out <dir>] [--project-root <dir>]
```

The postflight verifier checks the built artifact and Design System token usage:

```bash
jun-ui verify-page <config-or-artifact> [--out <dir>] [--project-root <dir>] [--strict]
```

When passed a config file, it verifies the configured output and scans target project source styles declared by the config. When passed an artifact directory, it verifies `index.html` and local CSS directly. Strict mode rejects handwritten UI colors where Semi `--semi-*` tokens should be used.

For an existing target-project workbench that already has its own browser client, use:

```bash
jun-ui bundle-app <config.json> [--out <dir>] [--project-root <dir>]
```

Rules:

- `config.out` resolves from the target project root when provided, otherwise from the config file directory.
- `--out` overrides `config.out` and resolves from the current working directory, or from `--project-root` when provided.
- `config.fileName` can set a simple HTML filename such as `today.html`; default is `index.html`.
- `config.assetsDir` can set a relative asset directory such as `today-assets`; default is `assets`.
- `config.actions` can add prompt-copy action cards for local workbenches and workflow entry pages.
- The Builder replaces only the target HTML file and the selected asset directory, so sibling files such as JSON reports stay intact.
- Vite, React, and Semi dependencies stay in `jun-ui`; target projects receive only built HTML, CSS, and JavaScript.
- `bundle-app` entries may import React, Semi Design System, and Semi icons from the centralized Builder dependencies instead of adding those packages to the target project.
- `bundle-app` injects Semi's `--semi-*` token surface plus the small `--jun-ui-*` delivery-variable layer into the bundled CSS. Target project styles should reference Semi visual tokens and delivery variables instead of defining their own color values.
- The browser output must not require module scripts, a dev server, Context7, or Figma.

## Config Shape

```json
{
  "type": "personal-ops-today",
  "title": "Personal Ops V1 今日入口",
  "description": "2026-06-05 · 工作流 V1",
  "lang": "zh-CN",
  "out": "site",
  "fileName": "today.html",
  "assetsDir": "today-assets",
  "metrics": [
    { "label": "主推", "value": "dubforge", "note": "today's focus" }
  ],
  "sections": [
    { "title": "今日结论", "body": "Start with the smallest useful action.", "items": ["Read source data first"] }
  ],
  "actions": [
    {
      "action_id": "refresh_today",
      "label": "重新对账并刷新日报",
      "role": "Ops Router",
      "intent": "Refresh the local report without writing backend state.",
      "send_to": "Personal Ops 线程",
      "cadence_hint": "需要时手动触发",
      "prompt": "Personal Ops action: refresh_today",
      "tone": "primary"
    }
  ]
}
```

## Bundle-App Config Shape

```json
{
  "type": "ai-radar-workbench",
  "title": "AI 信息雷达工作台",
  "out": "app/workbench",
  "fileName": "index.html",
  "assetsDir": "workbench-assets",
  "app": {
    "html": "app/workbench/shell.html",
    "entry": "src/app.mjs",
    "styles": ["app/workbench/styles.css"],
    "dataScripts": ["data/static-data.js"]
  }
}
```

`bundle-app` expects the HTML shell to contain optional `<!-- jun-ui:styles -->` and `<!-- jun-ui:scripts -->` placeholders. It injects bundled CSS, static data scripts, and bundled classic JavaScript there. The target project can generate `data/static-data.js` before calling the Builder so the final folder can run without server fetches.
