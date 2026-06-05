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
| Semi Design System usage | jun-ui Skill and Context7 |
| Figma design review path | jun-ui Skill |
| Page intent and source data | target project |
| Final file-openable artifact | written back to target project |

## Contract

- Use `jun-ui build` from a target project, global Skill, or project-local Skill install.
- Keep the target project thin: it provides config, data, and the output location.
- Produce a final artifact that opens through `file://`.
- Keep asset paths relative so the output folder is movable.
- Do not add Context7, Figma, or builder dependencies to browser runtime output.
- Stop before Semi implementation if Context7 CLI + Skills through `ctx7` is unavailable.

## Current Builder Slice

The current Builder has a minimal file-openable renderer and `doctor` command. It establishes the installable command surface and artifact contract. The next implementation layer should replace the smoke renderer with the Semi-powered build profile while preserving the same `jun-ui build` interface.
