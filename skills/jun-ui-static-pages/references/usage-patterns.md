# jun-ui Usage Patterns

## Imports

```html
<script
  type="module"
  src="https://jspm.dev/@spectrum-web-components/bundle/elements.js"
></script>

<link rel="stylesheet" href="./jun-ui.css">
<script type="module" src="./jun-ui.js"></script>
```

Adjust paths when copying `jun-ui.css` and `jun-ui.js` into another project.

## Product Page Skeleton

```html
<sp-theme system="spectrum" color="light" scale="medium">
  <jui-app-shell>
    <jui-page-header
      heading="Project Console"
      subheading="Overview and next actions"
    >
      <sp-button slot="actions" variant="accent">New Item</sp-button>
    </jui-page-header>

    <jui-grid>
      <jui-panel>
        <jui-stat label="Active" value="18" note="4 need attention"></jui-stat>
      </jui-panel>
      <jui-panel>
        <jui-stat label="Ready" value="7" note="Validated this week"></jui-stat>
      </jui-panel>
    </jui-grid>

    <jui-panel>
      <jui-section-title
        heading="Priority Queue"
        subheading="Work ordered by impact"
      ></jui-section-title>
    </jui-panel>
  </jui-app-shell>
</sp-theme>
```

## Form Page Pattern

```html
<sp-theme system="spectrum" color="light" scale="medium">
  <jui-app-shell width="narrow">
    <jui-page-header heading="Settings" subheading="Configure defaults">
      <sp-button slot="actions" variant="accent">Save</sp-button>
    </jui-page-header>

    <jui-panel>
      <jui-stack>
        <sp-textfield label="Name"></sp-textfield>
        <sp-picker label="Mode">
          <sp-menu-item selected>Automatic</sp-menu-item>
          <sp-menu-item>Manual</sp-menu-item>
        </sp-picker>
      </jui-stack>
    </jui-panel>
  </jui-app-shell>
</sp-theme>
```

## Choosing Fallbacks

| Need | Use |
| --- | --- |
| Product/tool page | `jun-ui` + Spectrum Web Components |
| Freer lightweight static page | Web Awesome |
| Mature grid/utilities fast | Bootstrap |
| Tiny local state | Alpine.js |
| Server partial refresh | htmx |

## Verification

Use a local static server and inspect the rendered page:

```bash
python3 -m http.server 8765
```

Then open the page and confirm:

- Main content is visible.
- `jui-*` elements have hydrated classes or generated content.
- Text does not overlap controls on desktop and mobile widths.
- No build step is needed to load the page.
