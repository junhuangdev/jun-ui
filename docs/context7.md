# Context7 Setup

Context7 is the required documentation path for the installable `jun-ui` Skill before substantial Semi Design System implementation.

It is an AI-side capability. It is not a browser runtime dependency, not a target project dependency, and not part of the final `file://` artifact written by the Builder. Figma remains the design and review surface when visual intent needs one shared place.

## Role

| Part | Role |
| --- | --- |
| `ctx7` CLI | Fetch current Semi Design System documentation before implementation. |
| `context7-docs` Skill | Tells AI when to use Context7 documentation lookup for library API decisions. |
| `context7-cli` Skill | Tells AI how to install, update, and operate `ctx7`. |
| `jun-ui doctor --strict` | Verifies the installable Builder environment has the required Context7 path. |

## Install

Install the CLI globally for the active Node user:

```bash
npm install -g ctx7@latest
```

Install the Context7 Skills globally into the universal agent skill directory:

```bash
ctx7 skills install /upstash/context7 context7-docs --global --universal --yes
ctx7 skills install /upstash/context7 context7-cli --global --universal --yes
```

The official `ctx7 setup --cli` path can also install a docs Skill, but it requires authentication unless an API key is provided. The direct Skills install path keeps the default `jun-ui` setup scriptable while still using official Context7 Skills.

## Verify

Run:

```bash
jun-ui doctor --strict
```

From this checkout:

```bash
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs doctor --strict
```

Expected checks:

```text
ok ctx7: ...
ok context7-docs skill: ...
ok context7-cli skill: ...
```

Before implementing Semi pages, resolve and query Semi through Context7:

```bash
ctx7 library "semi design" "button form table"
ctx7 docs /douyinfe/semi-design "Button Form Table basic usage"
```

Do not continue substantial Semi implementation if `jun-ui doctor --strict` reports missing Context7 checks, unless the user explicitly approves an MCP fallback for that task.
