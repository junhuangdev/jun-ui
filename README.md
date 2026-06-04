# jun-ui

`jun-ui` 是一套面向静态页面、无编译原型和本地工具的轻量 Design System wrapper。

它的目标不是重造完整组件库，而是给 AI 和人一个稳定的默认前端底座：直接写 HTML，引入 CSS 和 JS，就能得到一致的页面骨架、布局规则、信息层级和少量高频组合组件。

## 默认栈

| 层 | 默认 | 用途 |
| --- | --- | --- |
| 底层组件 | Spectrum Web Components | 表单、按钮、tabs、dialog、table |
| 产品骨架 | jun-ui | shell、header、panel、stat、empty state |
| 视觉规则 | `jun-ui.css` | tokens、间距、密度、边框、状态 |
| 小状态 | Alpine.js 可选 | 展开、筛选、局部开关 |
| 局部刷新 | htmx 可选 | 服务端 HTML 局部替换 |
| 兜底 | Web Awesome / Bootstrap | 特定组件或兼容需求 |

## 快速开始

把 `jun-ui.css` 和 `jun-ui.js` 放到页面能访问的位置，然后引入 Spectrum CDN：

```html
<script
  type="module"
  src="https://jspm.dev/@spectrum-web-components/bundle/elements.js"
></script>

<link rel="stylesheet" href="./jun-ui.css">
<script type="module" src="./jun-ui.js"></script>
```

页面结构：

```html
<sp-theme system="spectrum" color="light" scale="medium">
  <jui-app-shell>
    <jui-page-header
      heading="Project Console"
      subheading="Overview and next actions"
    >
      <sp-button slot="actions" variant="accent">New Item</sp-button>
    </jui-page-header>

    <jui-panel>
      <jui-section-title
        heading="Active Work"
        subheading="Items that need attention"
      ></jui-section-title>
    </jui-panel>
  </jui-app-shell>
</sp-theme>
```

## 设计原则

- 默认无编译：不用 React、Vite、Tailwind 或 webpack 才能启动。
- Design System 优先：先用 tokens、布局 primitives 和页面 patterns，再写页面细节。
- 不手搓常见控件：底层控件优先用 Spectrum Web Components。
- 少量自定义：`jun-ui` 只承载高频页面骨架和组合组件。
- 可替换底层：如果项目不适合 Spectrum，可以在页面级切到 Web Awesome 或 Bootstrap fallback。

## 本地验证

```bash
npm test
```

验证脚本会检查入口文件、示例页面、Spectrum CDN 引入、核心 tokens 和 custom elements 注册。

## 示例

- `examples/dashboard.html`
- `examples/form.html`
- `examples/detail.html`

这些文件可以直接用浏览器打开，也可以放到任意静态服务器下访问。
