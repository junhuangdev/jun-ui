# Delivery Contract

Use this reference when creating or reviewing Jun page artifacts through the installable jun-ui Skill and Builder.

## Output Requirement

The final page output must be directly openable through `file://`.

Acceptable shapes:

- a single HTML file with embedded or relative assets;
- a built folder such as `dist/` with `index.html` and relative asset paths.

The built artifact must not require a development server for final review.

## Required Stack Decisions

| Decision | Requirement |
| --- | --- |
| Component system | Use Semi Design System by default. |
| API grounding | Use Context7 CLI + Skills through `ctx7` before substantial Semi implementation. |
| MCP | MCP is optional; use it only as an approved alternate Context7 path. |
| Visual source or review | Use Figma when visual intent, review, or design-system sync matters. |
| Build | Use `jun-ui build` unless the target project explicitly owns a stronger build profile. |
| Verification | Test the built artifact, not only the dev route. |

## Page Quality Bar

The artifact should:

- show the real page experience immediately;
- load all styles and scripts;
- keep product-tool layout dense, clear, and scannable;
- preserve expected controls and interactions;
- avoid broken asset paths;
- use consistent spacing, hierarchy, and state presentation;
- work when moved as a folder.

## Verification Checklist

Before delivery:

1. Build the page artifact.
2. Open the built `index.html` or single-file artifact through `file://`.
3. Confirm the page is nonblank.
4. Confirm styles are loaded.
5. Confirm key interactions work.
6. Confirm no console errors block page use.
7. Report the exact artifact path.

## Documentation Gate

Before substantial Semi implementation:

1. Use Context7 CLI + Skills through `ctx7`.
2. Record the Semi docs topic or component area checked.
3. Stop before Semi implementation if no Context7 path is available.
4. Do not replace this with generic web search or unverified model memory.

## Target Project Boundary

The target project should provide page intent, source data, and output location. The installable jun-ui Builder owns the reusable build behavior and writes the file-openable artifact back to that target project.
