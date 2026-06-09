# Prompt: jun-ui Dual-Lane Long Task

Use this prompt to start the implementation task after the design docs are in place.

```text
We are in /Users/jun/workspace/jun-ui.

Goal:
Upgrade jun-ui from a file-openable page delivery system into a dual-lane Design System delivery system that remains simple for other projects to use through the globally installed Agent/Skill.

Context:
- Current static artifact behavior must continue to work.
- The existing token console must remain available and file-openable.
- Other projects should keep a foolproof usage model: users ask for a page or web system, and the global jun-ui-page-delivery Skill chooses the right lane.
- Static pages, dashboards, workbenches, reports, and snapshot-backed tools should use the static artifact lane.
- Server-backed systems with runtime API reads/writes, auth, sessions, uploads, mutations, jobs, or shared state should use the runtime app lane.
- jun-ui should not become a full-stack framework. Target projects own server, database, auth, routes, deployment, and business state.

Read first:
- /Users/jun/workspace/jun-ui/docs/delivery-lanes.md
- /Users/jun/workspace/jun-ui/README.md
- /Users/jun/workspace/jun-ui/docs/design-system.md
- /Users/jun/workspace/jun-ui/docs/builder.md
- /Users/jun/workspace/jun-ui/skills/jun-ui-page-delivery/SKILL.md
- /Users/jun/workspace/jun-ui/skills/jun-ui-page-delivery/references/delivery-contract.md
- /Users/jun/workspace/jun-ui/skills/jun-ui-page-delivery/references/builder-contract.md

Milestones:
1. Align docs and Skill text around two lanes: static artifact and runtime app.
2. Add or update validation so the active docs and Skill cannot drift back to static-only language.
3. Add a static example inside this repository that demonstrates the static artifact lane.
4. Add a runtime example inside this repository that demonstrates the same Design System in a small server-backed app.
5. Keep the token console working as a static artifact and link it as the shared token reference.
6. Verify the repository with npm test.
7. For static artifacts, run the relevant jun-ui build/token command and verify-page --strict.
8. For the runtime example, start the local server, open or smoke-test the URL, prove it is nonblank, and prove at least one runtime interaction reads or writes server state.

Acceptance:
- Other projects still use jun-ui through the global Agent/Skill without needing to manually pick a lane in normal cases.
- The static lane still produces file:// openable artifacts.
- The runtime lane has a concrete local example with server-backed behavior.
- Documentation clearly says jun-ui owns the Design System contract, while target projects own runtime server concerns.
- Verification output is reported with exact commands and paths/URLs.
```
