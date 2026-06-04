# jun-ui Design System

`jun-ui` 的设计系统目标是让静态页面快速进入可用状态，同时保持稳定的信息层级和产品工具气质。

## 适用范围

优先用于：

- 本地工作台
- AI 生成的静态原型
- 管理台、设置页、表单页、详情页
- 不值得引入完整前端构建链的小工具

不优先用于：

- 强品牌营销页
- 高度动画化的体验页
- 已经有成熟项目内 Design System 的应用

## 分层

| 层 | 责任 |
| --- | --- |
| Spectrum Web Components | 可访问控件和基础组件 |
| Spectrum tokens | 颜色、字号、间距和主题语义 |
| `jun-ui.css` | 页面级 tokens、布局 primitives、状态样式 |
| `jun-ui.js` | 高频组合 custom elements |
| examples | AI 和人可复用的页面模板 |

## 核心 tokens

| Token | 用途 |
| --- | --- |
| `--jui-page-max` | 页面最大宽度 |
| `--jui-gap` | 页面默认网格间距 |
| `--jui-panel-radius` | panel 圆角，默认 8px |
| `--jui-focus-ring` | 键盘焦点样式 |

## Layout primitives

| Class / Element | 用途 |
| --- | --- |
| `.jui-shell` / `<jui-app-shell>` | 页面外层容器 |
| `.jui-toolbar` | 顶部操作区 |
| `.jui-panel` / `<jui-panel>` | 内容面板 |
| `.jui-grid` | 响应式网格 |
| `.jui-stack` | 垂直节奏 |

## 组件规则

- Button、input、tabs、dialog、table 等底层控件交给 Spectrum。
- `jun-ui` 只做页面骨架和高频组合。
- 自定义组件使用 `jui-` 前缀，避免和底层库冲突。
- 组件默认使用 light DOM，让页面 CSS 可以直接治理布局。
- 组件应支持无 JavaScript 降级：核心内容在 HTML 中仍可读。

## 页面模式

第一版固定三类模板：

- Dashboard：概览、指标、列表、行动项。
- Form：设置、字段、保存操作。
- Detail：标题、元信息、分区、侧栏上下文。

后续新页面应先判断是否能归入这三类，再新增 pattern。

## 兜底策略

Web Awesome 保留为更自由的轻页面候选。Bootstrap 5 只在需要成熟 grid、utility class 或兼容速度时使用。默认静态产品页从 `jun-ui` 开始。
