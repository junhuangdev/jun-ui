# jun-ui 使用项目修复审计（2026-06-13）

结论：当前发现 5 个目标项目、6 个静态页面/工作台在使用 `jun-ui`。本审计记录的是移除旧视觉 alias 兼容层前的基线：当时生成物能通过严格校验，并且包含 Semi token 与旧兼容层；现在 Builder 已不再输出旧兼容层，旧页面如果出问题，需要迁移页面源 CSS 到 Semi token 语义表达。

## 审计范围

本次只记录需要修复的项目和页面，不直接修改目标项目。

- 工作区：`/Users/jun/workspace`
- 重点项目：`ai-radar`、`personal-ops`、`flowforge`、`macroPulse`、`dubforge`
- 排除项：`jun-ui` 自身测试模板、`skill-ops` 报告快照、纯文档引用、`node_modules`、`.git`、临时目录
- 审计时间：2026-06-13，Asia/Shanghai

## 总览

| 优先级 | 项目 | 页面/产物 | 当前状态 | 后续修复 |
| --- | --- | --- | --- | --- |
| P1 | `ai-radar` | `app/workbench/index.html` | 当前产物已恢复并通过严格校验 | 迁移 `src/workbench/styles.css` 的旧视觉 token；保留 workbench 状态校验 |
| P1 | `personal-ops` | `site/today.html` | 严格校验通过，有非阻断 gap advisory | 迁移 `site/today-styles.css`；顺手处理 3 处 flex+gap literal |
| P1 | `flowforge` | `app/static/cockpit.html` | 严格校验通过 | 迁移 `app/static/cockpit.css`，该文件旧 token 使用量较高 |
| P1 | `flowforge` | `app/static/library.html` | 严格校验通过 | 迁移 `app/static/library.css`，该文件旧 token 使用量较高 |
| P1 | `macroPulse` | `site/macro-desk.html` | 严格校验通过，有非阻断 gap advisory | 迁移 `site/macro-desk.css`；顺手处理 4 处 flex+gap literal |
| P1 | `dubforge` | `frontend/jun-ui-workbench/index.html` | 严格校验通过，有非阻断 gap advisory | 迁移 `frontend/jun-ui-workbench/styles.css`；确认该目录当前为未跟踪状态后再提交 |

目前没有新的 P0 阻断项：按当前生成物检查，页面不是空白，token 兼容层存在，`verify-page --strict` 通过。`ai-radar` 是这次暴露问题的入口，已经通过兼容层和重新生成恢复当前产物，但源文件仍是后续修复重点。

## 逐项记录

### ai-radar

- 项目路径：`/Users/jun/workspace/ai-radar`
- 页面产物：`app/workbench/index.html`
- 生成 CSS：`app/workbench/workbench-assets/index.css`
- 源 CSS：`src/workbench/styles.css`
- 配置状态：没有稳定的 `jun-ui.bundle.json`；工作台由 `scripts/build-workbench-static.mjs` 生成临时 bundle 配置，默认 builder 指向 `/Users/jun/workspace/jun-ui/scripts/jun-ui.mjs`
- 当前校验：`jun-ui verify-page /Users/jun/workspace/ai-radar/app/workbench/index.html --strict` 通过
- 旧 token 依赖：存在，源文件顶部把 `--radar-*` 与 `--jui-*` 继续映射到 `--jun-ui-bg`、`--jun-ui-panel`、`--jun-ui-ink`、`--jun-ui-muted`、`--jun-ui-line`、`--jun-ui-border`、`--jun-ui-accent`、`--jun-ui-shadow`，并使用旧字体和行高 token
- 修复方向：把页面局部语义变量改为 Semi token 源头，例如背景、表面、文本、边框、状态、阴影、字号、行高；保留 `jui-*` 布局/交付变量时需要确认它们属于 delivery contract，而不是视觉别名

### personal-ops

- 项目路径：`/Users/jun/workspace/personal-ops`
- 配置：`site/jun-ui.bundle.json`
- 页面产物：`site/today.html`
- 生成 CSS：`site/today-assets/index.css`
- 源 CSS：`site/today-styles.css`
- 当前校验：`jun-ui verify-page site/jun-ui.bundle.json --project-root /Users/jun/workspace/personal-ops --strict` 通过
- 旧 token 依赖：存在，`--today-*` 仍映射到 `--jun-ui-bg`、`--jun-ui-panel`、`--jun-ui-ink`、`--jun-ui-muted`、`--jun-ui-line`、`--jun-ui-accent`、`--jun-ui-radius`、`--jun-ui-shadow`
- 非阻断 advisory：3 处 ad-hoc flex+gap literal，涉及 `.today-topbar`、`.today-section-head`、`.today-state-line`
- 修复方向：先迁移视觉 token，再把 advisory 中的 gap 改为 token 驱动或 `jui-row` / `jui-stack`

### flowforge

- 项目路径：`/Users/jun/workspace/flowforge`
- Cockpit 配置：`app/static/cockpit.jun-ui.json`
- Cockpit 页面：`app/static/cockpit.html`
- Cockpit 源 CSS：`app/static/cockpit.css`
- Library 配置：`app/static/library.jun-ui.json`
- Library 页面：`app/static/library.html`
- Library 源 CSS：`app/static/library.css`
- 当前校验：两个配置都通过 `verify-page --strict`
- 旧 token 依赖：存在，两个源 CSS 都大量使用 `--jun-ui-panel`、`--jun-ui-accent`、`--jun-ui-ink`、`--jun-ui-muted`、`--jun-ui-line`、`--jun-ui-radius`、`--jun-ui-shadow`、`--jun-ui-bg`、`--jun-ui-border`、`--jun-ui-font-*`、`--jun-ui-line-height-*`、`--jun-ui-item-gap`、`--jun-ui-micro-gap`
- 非阻断 advisory：当前严格校验没有输出 gap advisory
- 修复方向：这是迁移量最大的目标项目。长任务应先抽出 flowforge 页面局部语义 token 表，再替换 cockpit/library 共用语义变量，避免两个页面分叉

### macroPulse

- 项目路径：`/Users/jun/workspace/macroPulse`
- 配置：`site/macro-desk.jun-ui.json`
- 页面产物：`site/macro-desk.html`
- 生成 CSS：`site/macro-desk-assets/index.css`
- 源 CSS：`site/macro-desk.css`
- 当前校验：`jun-ui verify-page site/macro-desk.jun-ui.json --project-root /Users/jun/workspace/macroPulse --strict` 通过
- 旧 token 依赖：存在，`--mp-*` 仍映射到 `--jun-ui-bg`、`--jun-ui-panel`、`--jun-ui-ink`、`--jun-ui-muted`、`--jun-ui-line`、`--jun-ui-accent`、`--jun-ui-accent-soft`、`--jun-ui-radius`、`--jun-ui-shadow`
- 非阻断 advisory：4 处 ad-hoc flex+gap literal，涉及 `.mp-panel-head`、`.mp-question-bank`、`.mp-save-actions, .mp-header-actions`
- 修复方向：迁移 `--mp-*` 的视觉源头，同时处理 gap advisory；由于 `site/` 当前是未跟踪目录，长任务需要先确认提交边界

### dubforge

- 项目路径：`/Users/jun/workspace/dubforge`
- 配置：`frontend/jun-ui-workbench/jun-ui.bundle.json`
- 页面产物：`frontend/jun-ui-workbench/index.html`
- 生成 CSS：`frontend/jun-ui-workbench/assets/index.css`
- 源 CSS：`frontend/jun-ui-workbench/styles.css`
- 当前校验：`jun-ui verify-page frontend/jun-ui-workbench/jun-ui.bundle.json --project-root /Users/jun/workspace/dubforge --strict` 通过
- 旧 token 依赖：存在，`--df-*` 仍映射到 `--jun-ui-bg`、`--jun-ui-panel`、`--jun-ui-ink`、`--jun-ui-muted`、`--jun-ui-line`、`--jun-ui-accent`、`--jun-ui-accent-soft`、`--jun-ui-radius`、`--jun-ui-shadow`
- 非阻断 advisory：2 处 ad-hoc flex+gap literal，涉及 `.df-panel-head`、`.df-button-row`
- 修复方向：先确认 `frontend/jun-ui-workbench/` 的未跟踪状态是否应纳入 dubforge 提交，再迁移视觉 token 和 gap advisory

## 当前生成物状态

已检查以下生成 CSS，全部存在：

- `ai-radar/app/workbench/workbench-assets/index.css`
- `personal-ops/site/today-assets/index.css`
- `flowforge/app/static/cockpit-assets/index.css`
- `flowforge/app/static/library-assets/index.css`
- `macroPulse/site/macro-desk-assets/index.css`
- `dubforge/frontend/jun-ui-workbench/assets/index.css`

检查结果（历史基线，兼容层移除前）：

- 全部包含 Semi token，例如 `--semi-color-bg-0`
- 全部包含旧别名兼容层，例如 `--jun-ui-bg`、`--jun-ui-panel`、`--jun-ui-ink`
- 这说明当时页面不会仅因为旧别名缺失而立即失效；兼容层移除后，源文件必须迁移，不能再依赖 Builder 提供这些历史变量

## 目标仓库状态风险

长任务开始前必须先记录每个目标仓库的 `git status --short`，不要回滚用户或其他任务的改动。

| 项目 | 当前工作树风险 |
| --- | --- |
| `ai-radar` | 大量已修改和未跟踪文件；其中包含本轮重新生成的 `app/workbench/*` |
| `personal-ops` | `site/today-*` 生成物已有修改 |
| `flowforge` | 页面源、生成物、后端、文档、测试均有既有修改 |
| `macroPulse` | `site/` 当前未跟踪，且 app 源文件已有修改 |
| `dubforge` | `frontend/jun-ui-workbench/` 当前未跟踪，且前后端大量文件已有修改 |

## 后续长任务建议顺序

1. 在每个目标仓库内单独冻结 `git status --short`，明确哪些是已有改动。
2. 对每个页面先跑当前 `jun-ui verify-page --strict`，保存基线。
3. 只改对应页面源 CSS 的局部语义变量，把旧 `--jun-ui-*` 视觉别名替换为 Semi token。
4. 保留真正属于 `jun-ui` delivery contract 的布局变量；不要把所有旧变量机械替换成 Semi。
5. 顺手处理 `personal-ops`、`macroPulse`、`dubforge` 的非阻断 flex+gap advisory。
6. 重新生成页面产物，并再次跑 `verify-page --strict`。
7. 对 `ai-radar` 额外跑 workbench 状态/报告到位检查，并用浏览器打开生成 artifact 做一次视觉 smoke。
8. 每个目标项目单独提交或单独 PR，不要把五个项目混进同一个提交边界。

## 可复用审计命令

```sh
rg -n -- '--jun-ui-(bg|panel|ink|muted|line|accent|radius|border|shadow|font|line-height|micro-gap|item-gap)' <source-css>
```

```sh
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page <config-or-html> --project-root <target-project> --strict
```

```sh
node /Users/jun/workspace/jun-ui/scripts/jun-ui.mjs verify-page /Users/jun/workspace/ai-radar/app/workbench/index.html --strict
```
