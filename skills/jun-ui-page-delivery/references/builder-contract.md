# Builder Contract

Use this reference when a target project needs a static page, workbench, dashboard, settings screen, or detail page built through the installable jun-ui Skill.

## Default Command

```bash
jun-ui build <config.json>
```

From the source checkout:

```bash
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs build <config.json>
```

The current Builder bundles React and Semi Design System through Vite into classic IIFE JavaScript plus CSS. The final `index.html` uses relative `./assets/` paths and includes a static fallback so it is visible through `file://` before React takes over.

## Division Of Responsibility

| Concern | Owner |
| --- | --- |
| Page intent, source data, output path | target project |
| Semi Design System selection and page composition | jun-ui Skill |
| Context7 CLI + Skills grounding through `ctx7` | jun-ui Skill |
| Figma review or design handoff | jun-ui Skill |
| Node tooling and build execution | jun-ui Builder |
| Final file-openable artifact | jun-ui Builder writes it into the target project |

## Requirements

- Use the Builder instead of making every target project install its own page toolchain.
- Keep generated assets relative.
- Confirm the built output opens through `file://`.
- Do not require module scripts for final review.
- Keep a nonblank static fallback in the generated HTML.
- Do not add Context7 or Figma to runtime output.
- Run `jun-ui doctor --strict` before substantial Semi implementation.
- Require `ctx7`, `context7-docs`, and `context7-cli`.
- MCP is optional.
- Stop before Semi implementation if `ctx7` or an explicitly approved Context7 MCP path is unavailable.

## Context7 Check

```bash
jun-ui doctor --strict
ctx7 library "semi design" "button form table"
ctx7 docs /douyinfe/semi-design "Button Form Table basic usage"
```

Stop before Semi implementation if the Context7 CLI + Skills path is missing and the user has not explicitly approved an MCP fallback.

## Builder Config Shape

Minimum fields:

```json
{
  "type": "workbench",
  "title": "AI Radar Workbench",
  "out": "./app/workbench"
}
```

Optional fields such as `description`, `metrics`, and `sections` can guide the initial artifact. Target projects can create this config manually, or AI can create it during the first jun-ui page task.
