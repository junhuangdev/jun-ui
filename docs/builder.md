# jun-ui Builder

The jun-ui Builder is the centralized build surface for the installable `jun-ui` Skill.

It lets AI use the jun-ui Design System, Semi Design System, Context7 CLI + Skills, and Figma rules from any target project without making that target project own the frontend toolchain.

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

## Contract

- Use `jun-ui build` from a target project, global Skill, or project-local Skill install.
- Keep the target project thin: it provides config, data, and the output location.
- Produce a final artifact that opens through `file://`.
- Keep asset paths relative so the output folder is movable.
- Do not add Context7, Figma, or builder dependencies to browser runtime output.
- Verify `ctx7`, `context7-docs`, and `context7-cli` with `jun-ui doctor --strict`.
- Stop before Semi implementation if Context7 CLI + Skills through `ctx7` is unavailable.

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

Rules:

- `config.out` resolves from the target project root when provided, otherwise from the config file directory.
- `--out` overrides `config.out` and resolves from the current working directory, or from `--project-root` when provided.
- `config.fileName` can set a simple HTML filename such as `today.html`; default is `index.html`.
- `config.assetsDir` can set a relative asset directory such as `today-assets`; default is `assets`.
- `config.actions` can add prompt-copy action cards for local workbenches and workflow entry pages.
- The Builder replaces only the target HTML file and the selected asset directory, so sibling files such as JSON reports stay intact.
- Vite, React, and Semi dependencies stay in `jun-ui`; target projects receive only built HTML, CSS, and JavaScript.
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
