# jun-ui Delivery Lanes

`jun-ui` supports two product UI delivery lanes: static artifacts and runtime apps. The Design System is shared; the runtime and acceptance contract are different.

## Goal

Other projects should keep using `jun-ui` in a simple way. A user can ask an agent to build a page or system, and the globally installed, installable `jun-ui-design-system` Skill should choose the right lane unless the request is genuinely ambiguous.

## Lanes

| Lane | Use when | Output | Owner |
| --- | --- | --- | --- |
| Static artifact | The page can use build-time data, snapshots, local JSON, reports, or bundled client logic. | `file://` openable HTML plus relative assets. | `jun-ui` Builder writes the artifact. |
| Runtime app | The UI must read or write server state while the user is using it. | A project-owned app served by localhost or deployment. | Target project owns server, routes, data, auth, and deploy. |

The same Design System applies to both lanes: Semi Design System, Semi `--semi-*` visual tokens, a small `--jun-ui-*` delivery-variable layer, Context7 CLI + Skills for Semi usage, Figma when visual review matters, and the `jun-ui-design-system` Skill as the AI entrypoint.

## AI Routing Rule

The agent should ask one routing question internally first:

> Does this UI need runtime server reads or writes while the user is using it?

If no, use the static artifact lane. If yes, use the runtime app lane. If the answer cannot be inferred and choosing wrong would cause material rework, ask the user one direct question: "Does this need to read or write server data at runtime?"

## Static Artifact Lane

Use this lane for:

- reports, dashboards, token pages, local workbenches, and product prototypes;
- pages backed by generated JSON, Markdown, CSV, or other local snapshots;
- client-heavy pages that can still be bundled into a movable artifact;
- review surfaces where `file://` inspection is the acceptance target.

Default commands:

```bash
jun-ui build <config.json>
jun-ui bundle-app <config.json>
jun-ui verify-page <config-or-artifact> --strict
```

Acceptance:

- the artifact opens through `file://`;
- assets are relative;
- no dev server is required for final review;
- the page is nonblank and styled;
- key interactions work;
- strict verification passes.

## Runtime App Lane

Use this lane for:

- login, permissions, or user sessions;
- saving forms, workflow mutations, uploads, or comments;
- live API data, background jobs, polling, or streaming;
- multi-user workflows or shared state;
- product surfaces that are meant to run as a maintained web app.

In this lane, `jun-ui` is not the server framework. The target project owns the runtime stack. `jun-ui` provides the UI contract:

- Semi Design System is the default component system.
- Semi `--semi-*` tokens are the page visual token source; `--jun-ui-*` variables remain limited to artifact delivery, page shell, and layout rhythm.
- Runtime CSS that consumes `--jun-ui-*` must be served after the shared `jun-ui` token CSS or another Design System-owned token sheet, so missing delivery variables cannot collapse gaps, padding, or card widths.
- Context7 CLI + Skills are used before material Semi API decisions.
- Figma is used when visual source or review matters.
- Native controls must be Semi output or carry an explicit `jui-*` / `data-jun-ui-control` contract.
- Runtime verification must prove the local or deployed URL works, not just that source code looks right.

Future runtime validation should check the same Design System concerns as `verify-page`, plus runtime behavior such as API reachability, loading state, mutation success, and error state visibility.

## User Experience

The intended user flow is:

1. The user asks for a static page, dashboard, tool, workbench, or web system.
2. The global Agent instructions route page work into `jun-ui-design-system`.
3. The Skill classifies the request as static artifact or runtime app.
4. The agent proceeds without asking if the lane is clear.
5. The agent asks only one lane question when the request is ambiguous and the wrong lane would be costly.
6. The final delivery reports the lane, output path or URL, verification evidence, and remaining gaps.

Users can still override the lane explicitly with phrases such as "make this file-openable" or "this must be a server-backed app."

## Repository Examples

This repository should keep three visible examples:

| Example | Lane | Purpose |
| --- | --- | --- |
| `examples/static-artifact` | Static artifact | Shows the simplest `jun-ui build` path and writes to `dist/examples/static-artifact`. |
| `examples/runtime-app` | Runtime app | Shows a small server-backed product surface using the same Design System. |
| `dist/tokens/index.html` | Static artifact | Shows the Semi token surface and `jun-ui` delivery variables, and should remain directly openable. |

The token console can also be linked from the runtime example as the shared Semi token reference. It does not need to become server-backed. Runtime examples should read the generated Semi token CSS plus delivery variables, not redefine a separate token set.

## Non-Goals

- Do not turn `jun-ui` into a full-stack framework.
- Do not move target-project server, database, auth, or deployment ownership into `jun-ui`.
- Do not weaken the existing static artifact lane.
- Do not require every target project to install Design System build dependencies when the centralized Builder is enough.
- Do not make users manually select a lane when the agent can infer it.
