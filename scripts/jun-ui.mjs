#!/usr/bin/env node
import react from "@vitejs/plugin-react";
import { build as viteBuild } from "vite";
import { access, cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  return [
    "Usage:",
    "  jun-ui build <config.json> [--out <dir>] [--project-root <dir>]",
    "  jun-ui bundle-app <config.json> [--out <dir>] [--project-root <dir>]",
    "  jun-ui tokens [--out <dir>]",
    "  jun-ui verify-page <config-or-artifact> [--out <dir>] [--project-root <dir>] [--strict]",
    "  jun-ui doctor [--strict]",
    "",
    "The build command writes a file-openable artifact with relative assets.",
    "The tokens command writes the file-openable design token console.",
    "The verify-page command checks artifact shape and Design System token usage.",
  ].join("\n");
}

function parseFlags(argv) {
  const flags = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        index += 1;
      }
    } else {
      positionals.push(arg);
    }
  }
  return { flags, positionals };
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file) {
  const body = await readFile(file, "utf8");
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`Invalid JSON in ${file}: ${error.message}`);
  }
}

function assertString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Config field "${field}" must be a non-empty string`);
  }
  return value.trim();
}

function resolveOutDir({ config, flags, configPath, projectRoot }) {
  if (flags.out) {
    if (path.isAbsolute(flags.out)) return path.normalize(flags.out);
    return path.resolve(projectRoot || process.cwd(), flags.out);
  }
  const rawOut = config.out;
  if (!rawOut) {
    throw new Error('Provide an output directory with "out" in config or --out');
  }
  if (path.isAbsolute(rawOut)) return path.normalize(rawOut);
  const base = projectRoot || path.dirname(configPath);
  return path.resolve(base, rawOut);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolveOutputFileName(config) {
  const fileName = String(config.fileName || "index.html").trim();
  if (!fileName || path.isAbsolute(fileName) || fileName.includes("/") || fileName.includes("\\")) {
    throw new Error('Config field "fileName" must be a simple HTML filename');
  }
  if (!fileName.endsWith(".html")) {
    throw new Error('Config field "fileName" must end with .html');
  }
  return fileName;
}

function resolveAssetsDir(config) {
  const assetsDir = String(config.assetsDir || "assets").trim();
  if (!assetsDir || path.isAbsolute(assetsDir) || assetsDir.split(/[\\/]/).includes("..")) {
    throw new Error('Config field "assetsDir" must be a relative asset directory');
  }
  return assetsDir.split(/[\\/]/).filter(Boolean).join("/");
}

const tokenRegistryPath = path.join(repoRoot, "tokens", "jun-ui.tokens.json");

async function loadTokenRegistry() {
  const registry = await readJson(tokenRegistryPath);
  if (!Array.isArray(registry.tokens)) {
    throw new Error(`Token registry ${tokenRegistryPath} must include a tokens array`);
  }
  return registry;
}

function renderTokenCssVariables(registry) {
  const declarations = registry.tokens.map((token) => `  ${token.name}: ${token.value};`).join("\n");
  return `:root {
  color-scheme: light;
${declarations}
}`;
}

function hexToRgbTriple(value) {
  const hex = String(value).trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((channel) => channel + channel).join("") : hex.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function darkenTriple({ r, g, b }, amount) {
  const f = (channel) => Math.max(0, Math.min(255, Math.round(channel * (1 - amount))));
  return `${f(r)}, ${f(g)}, ${f(b)}`;
}

// Theme Semi Design System with jun-ui design tokens so Semi components match
// the jun-ui look instead of Semi's defaults. This is the "jun-ui = Semi +
// tokens" layer: jun-ui does not ship a parallel component framework, it themes
// Semi. Semi defines its vars on <body>, so target body[data-jun-ui-artifact]
// (present on every jun-ui artifact) to win on specificity regardless of
// stylesheet order.
//
// Color: Semi derives --semi-color-primary/link/focus and light tints from
// --semi-blue-5, so overriding the 5/6/7 steps recolors the whole primary
// family from --jun-ui-accent. Lighter tints (blue-0..4) and semantic
// orange/red/green stay Semi defaults.
//
// Geometry: Semi's radius ramp (buttons/inputs/tags use -small, cards use
// -medium) is re-derived from --jun-ui-radius so corners match jun-ui instead
// of Semi's 3/6/12px. Font family/size and control heights are hardcoded inside
// Semi component CSS (no variable to map), so they stay Semi-native — already
// consistent across Semi pages.
function renderSemiThemeBridge(registry) {
  const accent = registry.tokens.find((token) => token.name === "--jun-ui-accent");
  const rgb = accent ? hexToRgbTriple(accent.value) : null;
  if (!rgb) return "";
  const base = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  return `body[data-jun-ui-artifact] {
  --semi-blue-5: ${base};
  --semi-blue-6: ${darkenTriple(rgb, 0.12)};
  --semi-blue-7: ${darkenTriple(rgb, 0.24)};
  --semi-border-radius-small: calc(var(--jun-ui-radius) * 0.75);
  --semi-border-radius-medium: var(--jun-ui-radius);
  --semi-border-radius-large: calc(var(--jun-ui-radius) * 1.5);
}`;
}

// Token-driven layout primitives, injected into every artifact alongside the
// tokens. Pages compose vertical/horizontal rhythm from these instead of
// hand-rolling flex + gap, so spacing/alignment stay consistent by construction
// and a wrapper (e.g. Semi <Spin>) can no longer silently drop the gap. Apply
// jui-stack to a wrapper you control rather than relying on a parent's gap.
function renderLayoutUtilities() {
  return `.jui-stack {
  display: flex;
  flex-direction: column;
  gap: var(--jun-ui-stack-gap);
  min-width: 0;
}
.jui-stack--section { gap: var(--jun-ui-section-gap); }
.jui-stack--tight { gap: var(--jun-ui-inline-gap); }
.jui-stack--end { align-items: flex-end; }
.jui-stack--center { align-items: center; }
.jui-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jun-ui-action-gap);
  min-width: 0;
}
.jui-row--between { justify-content: space-between; }
.jui-row--end { justify-content: flex-end; }
.jui-row--start { align-items: flex-start; }
.jui-row--tight { gap: var(--jun-ui-inline-gap); }`;
}

function hasJunUiTokenDefinitions(text) {
  return /--jun-ui-bg\s*:/.test(text);
}

function groupTokens(registry) {
  const groups = new Map();
  for (const token of registry.tokens) {
    if (!groups.has(token.group)) groups.set(token.group, []);
    groups.get(token.group).push(token);
  }
  return groups;
}

function tokenGroupTitle(group) {
  const titles = {
    color: "颜色 token",
    type: "字体 token",
    spacing: "间距 token",
    radius: "圆角 token",
    border: "边框 token",
    shadow: "阴影 token",
  };
  return titles[group] || `${group} tokens`;
}

function tokenGroupNavLabel(group) {
  const labels = {
    color: "颜色",
    type: "字体",
    spacing: "间距",
    radius: "圆角",
    border: "边框",
    shadow: "阴影",
  };
  return labels[group] || group;
}

function tokenGroupIntro(group) {
  const intros = {
    color: "用于画布、面板、文字、分割线和操作强调的基础颜色。",
    type: "生成产品工具页面时使用的字号、字体栈和行高。",
    spacing: "用于页头、网格、堆叠、字段和移动端布局的密集间距。",
    radius: "让控件和面板保持紧凑一致的形状 token。",
    border: "用于面板、行、字段和操作强调的轻量分隔 token。",
    shadow: "用于主要框定表面的层级 token。",
  };
  return intros[group] || "用于生成 jun-ui 页面的一组设计 token。";
}

function asConfigArray(value) {
  return Array.isArray(value) ? value : [];
}

function resolveInputPath({ configPath, projectRoot }, value, field) {
  const rawValue = assertString(value, field);
  if (path.isAbsolute(rawValue)) return path.normalize(rawValue);
  const base = projectRoot || path.dirname(configPath);
  return path.resolve(base, rawValue);
}

function resolveDataScripts(config) {
  return asConfigArray(config.app?.dataScripts).map((script) => {
    const value = String(script || "").trim();
    if (!value || path.isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
      throw new Error('Config field "app.dataScripts" must contain relative output paths');
    }
    return value.split(/[\\/]/).filter(Boolean).join("/");
  });
}

function renderFinalIndexHtml(config, { jsFiles, cssFiles }) {
  const title = assertString(config.title, "title");
  const pageType = assertString(config.type, "type");
  const cssLinks = cssFiles
    .map((file) => `  <link rel="stylesheet" href="./${escapeHtml(file)}">`)
    .join("\n");
  const scripts = jsFiles.map((file) => `  <script src="./${escapeHtml(file)}"></script>`).join("\n");

  return `<!doctype html>
<html lang="${escapeHtml(config.lang || "en")}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="jun-ui Builder + Semi Design System">
  <title>${escapeHtml(title)}</title>
${cssLinks}
</head>
<body data-jun-ui-artifact data-page-type="${escapeHtml(pageType)}" data-component-system="Semi Design System">
  <div id="jun-ui-root">
${renderStaticFallback(config)}
  </div>
${scripts}
</body>
</html>
`;
}

function renderStaticFallback(config) {
  const title = assertString(config.title, "title");
  const pageType = assertString(config.type, "type");
  const description = config.description || "Built with jun-ui and Semi Design System.";
  const metrics = Array.isArray(config.metrics) ? config.metrics : [];
  const sections = Array.isArray(config.sections) ? config.sections : [];
  const actions = Array.isArray(config.actions) ? config.actions : [];
  const postActionSections = Array.isArray(config.postActionSections) ? config.postActionSections : [];

  return `    <main class="jun-ui-shell" data-jun-ui-static-fallback>
      <header class="jun-ui-header">
        <div class="jun-ui-header-copy">
          <div class="jun-ui-kicker">jun-ui Builder · ${escapeHtml(pageType)}</div>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(description)}</p>
        </div>
        <span>Semi Design System</span>
      </header>
      <section class="jun-ui-grid" aria-label="Metrics">
${metrics
  .map(
    (metric) => `        <article class="jun-ui-card">
          <span class="jun-ui-muted">${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
${renderOptionalMutedParagraph(metric.note)}
        </article>`,
  )
  .join("\n")}
      </section>
      <section class="jun-ui-stack" aria-label="Sections">
${sections.map((section) => renderStaticSection(section)).join("\n")}
      </section>
${renderStaticActions(actions, config)}
${renderStaticSectionGroup(postActionSections, "Post action sections")}
    </main>`;
}

function renderOptionalMutedParagraph(value) {
  return value ? `          <p class="jun-ui-muted">${escapeHtml(value)}</p>` : "";
}

function renderStaticSection(section) {
  const body = section.body || section.description || "";
  return `        <article class="jun-ui-section">
          <h2>${escapeHtml(section.title)}</h2>
${renderOptionalMutedParagraph(body)}
          <ul>
${renderStaticItems(section.items)}
          </ul>
        </article>`;
}

function renderStaticSectionGroup(sections, label) {
  if (!sections.length) return "";
  return `      <section class="jun-ui-stack" aria-label="${escapeHtml(label)}">
${sections.map((section) => renderStaticSection(section)).join("\n")}
      </section>`;
}

function renderStaticItems(items) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return '            <li class="jun-ui-muted">No items configured.</li>';
  }
  return safeItems.map((item) => `            <li>${escapeHtml(item)}</li>`).join("\n");
}

function renderStaticActions(actions, config = {}) {
  if (!actions.length) return "";
  const title = config.actionsTitle || "Actions";
  const description =
    config.actionsDescription || "Copy an action prompt and send it to the expected Codex thread.";
  return `      <section class="jun-ui-stack" data-jun-ui-actions aria-label="Actions">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p class="jun-ui-muted">${escapeHtml(description)}</p>
        </div>
        <div class="jun-ui-action-grid">
${actions.map((action) => renderStaticAction(action)).join("\n")}
        </div>
        <textarea id="promptOutput" class="jui-textarea jun-ui-prompt-output" readonly placeholder="Choose an action to generate a prompt."></textarea>
      </section>`;
}

function renderStaticAction(action) {
  const prompt = escapeHtml(action.prompt || "");
  const actionId = escapeHtml(action.action_id || action.id || "");
  const sendTo = escapeHtml(action.send_to || "");
  return `          <article class="jun-ui-action-card" data-action="${actionId}">
            <div class="jun-ui-action-head">
              <strong>${escapeHtml(action.label || actionId || "Action")}</strong>
              ${action.role ? `<span>${escapeHtml(action.role)}</span>` : ""}
            </div>
            ${action.subject ? `<h3>${escapeHtml(action.subject)}</h3>` : ""}
            ${action.intent ? `<p>${escapeHtml(action.intent)}</p>` : ""}
            ${sendTo ? `<p class="jun-ui-muted">Send to: ${sendTo}</p>` : ""}
            ${action.cadence_hint ? `<p class="jun-ui-muted">${escapeHtml(action.cadence_hint)}</p>` : ""}
            <button class="jui-button" type="button" data-prompt="${prompt}" data-send-to="${sendTo}" data-action-id="${actionId}">复制指令</button>
          </article>`;
}

function assetLink(file) {
  return `  <link rel="stylesheet" href="./${escapeHtml(file)}">`;
}

function classicScript(file) {
  return `  <script src="./${escapeHtml(file)}"></script>`;
}

function ensureArtifactBodyAttributes(html, config) {
  const pageType = escapeHtml(assertString(config.type, "type"));
  const attrs = `data-jun-ui-artifact data-page-type="${pageType}" data-component-system="jun-ui bundle-app"`;
  if (!/<body\b/i.test(html)) {
    return html;
  }
  return html.replace(/<body([^>]*)>/i, (match, bodyAttrs) => {
    if (bodyAttrs.includes("data-jun-ui-artifact")) return match;
    return `<body${bodyAttrs} ${attrs}>`;
  });
}

function ensureGeneratorMeta(html) {
  if (html.includes('name="generator"')) return html;
  const meta = '  <meta name="generator" content="jun-ui bundle-app">';
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${meta}\n</head>`);
  }
  return html;
}

function injectHtmlAssets(html, { cssFiles, jsFiles, dataScripts }) {
  const cssBlock = cssFiles.map(assetLink).join("\n");
  const scriptBlock = [...dataScripts.map(classicScript), ...jsFiles.map(classicScript)].join("\n");
  let nextHtml = html;

  if (nextHtml.includes("<!-- jun-ui:styles -->")) {
    nextHtml = nextHtml.replace("<!-- jun-ui:styles -->", cssBlock);
  } else if (/<\/head>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<\/head>/i, `${cssBlock}\n</head>`);
  }

  if (nextHtml.includes("<!-- jun-ui:scripts -->")) {
    nextHtml = nextHtml.replace("<!-- jun-ui:scripts -->", scriptBlock);
  } else if (/<\/body>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<\/body>/i, `${scriptBlock}\n</body>`);
  }

  return nextHtml;
}

function renderBundledAppHtml(config, sourceHtml, { jsFiles, cssFiles, dataScripts }) {
  const withAssets = injectHtmlAssets(sourceHtml, { jsFiles, cssFiles, dataScripts });
  return ensureArtifactBodyAttributes(ensureGeneratorMeta(withAssets), config);
}

async function ensureBundleTokenCss({ tempOutDir, cssFiles, assetsDir }) {
  const registry = await loadTokenRegistry();
  const bridge = renderSemiThemeBridge(registry);
  const tokenCss = `${renderTokenCssVariables(registry)}\n\n${bridge ? `${bridge}\n\n` : ""}${renderLayoutUtilities()}\n\n`;
  if (cssFiles.length > 0) {
    const firstCssPath = path.join(tempOutDir, cssFiles[0]);
    const existingCss = await readFile(firstCssPath, "utf8");
    if (!hasJunUiTokenDefinitions(existingCss)) {
      await writeFile(firstCssPath, `${tokenCss}${existingCss}`, "utf8");
    }
    return cssFiles;
  }

  const tokenAsset = path.join(assetsDir, "tokens.css");
  await mkdir(path.dirname(path.join(tempOutDir, tokenAsset)), { recursive: true });
  await writeFile(path.join(tempOutDir, tokenAsset), tokenCss, "utf8");
  return [tokenAsset];
}

function renderReactSource(config) {
  const configJson = JSON.stringify(config, null, 2);

  return `import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Card, Space, Tag } from "@douyinfe/semi-ui";
import { IconFile, IconTickCircle } from "@douyinfe/semi-icons";
import "@douyinfe/semi-ui/dist/css/semi.min.css";
import "./styles.css";

const pageConfig = ${configJson};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function App() {
  const [inspected, setInspected] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [copiedAction, setCopiedAction] = useState("");
  const metrics = asArray(pageConfig.metrics);
  const sections = asArray(pageConfig.sections);
  const actions = asArray(pageConfig.actions);
  const postActionSections = asArray(pageConfig.postActionSections);
  const generatedAt = new Date().toISOString();

  async function copyActionPrompt(action) {
    const rawPrompt = action.prompt || "";
    const shouldAddDispatch = action.send_to && !rawPrompt.startsWith("建议发送到：");
    const dispatch = shouldAddDispatch ? \`建议发送到：\${action.send_to}\\n\\n\` : "";
    const combined = \`\${dispatch}\${rawPrompt}\`;
    setPrompt(combined);
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(combined);
        copied = true;
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = combined;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        textarea.remove();
      }
    } catch {
      copied = false;
    }
    setCopiedAction(copied ? action.action_id || action.id || "" : "");
  }

  return (
    <main className="jun-ui-shell" data-jun-ui-react-artifact>
      <header className="jun-ui-header">
        <div className="jun-ui-header-copy">
          <div className="jun-ui-kicker">
            <IconFile aria-hidden="true" />
            <span>jun-ui Builder · {pageConfig.type}</span>
          </div>
          <h1>{pageConfig.title}</h1>
          <p>{pageConfig.description || "Built with jun-ui and Semi Design System."}</p>
        </div>
        <Space align="center" wrap>
          <Tag color="blue">Semi Design System</Tag>
          <Tag color={inspected ? "green" : "grey"}>{inspected ? "verified" : "file-openable"}</Tag>
          <Button
            icon={<IconTickCircle />}
            theme="solid"
            type="primary"
            onClick={() => setInspected((value) => !value)}
          >
            {inspected ? "Checked" : "Check"}
          </Button>
        </Space>
      </header>

      <section className="jun-ui-grid" aria-label="Metrics">
        {metrics.length > 0 ? (
          metrics.map((metric, index) => (
            <Card key={\`\${metric.label || "metric"}-\${index}\`} className="jun-ui-card">
              <span className="jun-ui-muted">{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.note ? <p className="jun-ui-muted">{metric.note}</p> : null}
            </Card>
          ))
        ) : (
          <Card className="jun-ui-card">
            <span className="jun-ui-muted">No metrics configured.</span>
          </Card>
        )}
      </section>

      <section className="jun-ui-stack" aria-label="Sections">
        {sections.length > 0 ? (
          sections.map((section, index) => (
            <Card key={\`\${section.title || "section"}-\${index}\`} className="jun-ui-section">
              <h2>{section.title}</h2>
              {section.description ? <p className="jun-ui-muted">{section.description}</p> : null}
              <ul>
                {asArray(section.items).length > 0 ? (
                  asArray(section.items).map((item, itemIndex) => <li key={itemIndex}>{item}</li>)
                ) : (
                  <li className="jun-ui-muted">No items configured.</li>
                )}
              </ul>
            </Card>
          ))
        ) : (
          <Card className="jun-ui-section">
            <h2>Empty page</h2>
            <p className="jun-ui-muted">No sections configured.</p>
          </Card>
        )}
      </section>

      {actions.length > 0 ? (
        <section className="jun-ui-stack" data-jun-ui-actions aria-label="Actions">
          <div>
            <h2>{pageConfig.actionsTitle || "Actions"}</h2>
            <p className="jun-ui-muted">
              {pageConfig.actionsDescription || "Copy an action prompt and send it to the expected Codex thread."}
            </p>
          </div>
          <div className="jun-ui-action-grid">
            {actions.map((action, index) => {
              const actionId = action.action_id || action.id || \`action-\${index}\`;
              const isCopied = copiedAction === actionId;
              return (
                <Card key={actionId} className={\`jun-ui-action-card \${action.tone || ""}\`.trim()} data-action-id={actionId}>
                  <div className="jun-ui-action-head">
                    <strong>{action.label || actionId}</strong>
                    {action.role ? <Tag color="grey">{action.role}</Tag> : null}
                  </div>
                  {action.subject ? <h3>{action.subject}</h3> : null}
                  {action.intent ? <p>{action.intent}</p> : null}
                  {action.send_to ? <p className="jun-ui-muted">Send to: {action.send_to}</p> : null}
                  {action.cadence_hint ? <p className="jun-ui-muted">{action.cadence_hint}</p> : null}
                  <Button
                    data-action-id={actionId}
                    theme="solid"
                    type={action.tone === "primary" ? "primary" : "tertiary"}
                    onClick={() => copyActionPrompt(action)}
                  >
                    {isCopied ? "已复制" : "复制指令"}
                  </Button>
                </Card>
              );
            })}
          </div>
          <textarea
            id="promptOutput"
            className="jui-textarea jun-ui-prompt-output"
            readOnly
            value={prompt}
            placeholder="Choose an action to generate a prompt."
          />
        </section>
      ) : null}

      {postActionSections.length > 0 ? (
        <section className="jun-ui-stack" aria-label="Post action sections">
          {postActionSections.map((section, index) => (
            <Card key={\`\${section.title || "post-action-section"}-\${index}\`} className="jun-ui-section">
              <h2>{section.title}</h2>
              {section.description || section.body ? <p className="jun-ui-muted">{section.description || section.body}</p> : null}
              <ul>
                {asArray(section.items).length > 0 ? (
                  asArray(section.items).map((item, itemIndex) => <li key={itemIndex}>{item}</li>)
                ) : (
                  <li className="jun-ui-muted">No items configured.</li>
                )}
              </ul>
            </Card>
          ))}
        </section>
      ) : null}

      <footer>
        <p className="jun-ui-muted">Generated {generatedAt}. Runtime dependencies are bundled into this artifact.</p>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("jun-ui-root")).render(<App />);
`;
}

function renderStyles(registry) {
  return `${renderTokenCssVariables(registry)}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--jun-ui-bg);
  color: var(--jun-ui-ink);
  font-family: var(--jun-ui-font-sans);
  font-size: var(--jun-ui-font-size-body);
  line-height: var(--jun-ui-line-height-body);
  letter-spacing: 0;
}

button,
input,
textarea,
select {
  -webkit-appearance: none;
  appearance: none;
  font: inherit;
}

button {
  white-space: nowrap;
}

.jun-ui-shell {
  max-width: var(--jun-ui-page-max-width);
  margin: 0 auto;
  padding: var(--jun-ui-page-padding-block) var(--jun-ui-page-padding-inline) var(--jun-ui-page-padding-bottom);
}

.jun-ui-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jun-ui-header-gap);
  padding: var(--jun-ui-header-padding);
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
  box-shadow: var(--jun-ui-shadow);
}

.jun-ui-header-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.jun-ui-kicker {
  display: inline-flex;
  align-items: center;
  gap: var(--jun-ui-inline-gap);
  color: var(--jun-ui-muted);
  font-size: var(--jun-ui-font-size-kicker);
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: var(--jun-ui-font-size-h1);
  line-height: var(--jun-ui-line-height-heading);
}

h2 {
  font-size: var(--jun-ui-font-size-h2);
  line-height: var(--jun-ui-line-height-compact);
}

.jun-ui-muted {
  color: var(--jun-ui-muted);
  font-size: var(--jun-ui-font-size-kicker);
}

.jun-ui-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--jun-ui-grid-gap);
  margin-top: var(--jun-ui-section-gap);
}

.jun-ui-stack {
  display: grid;
  gap: var(--jun-ui-stack-gap);
  margin-top: var(--jun-ui-section-gap);
}

.jun-ui-card strong {
  display: block;
  margin-top: 5px;
  font-size: var(--jun-ui-font-size-metric);
  line-height: var(--jun-ui-line-height-heading);
}

.jun-ui-section ul {
  margin: 12px 0 0;
  padding-left: var(--jun-ui-list-indent);
}

.jun-ui-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--jun-ui-grid-gap);
}

.jun-ui-action-card {
  display: grid;
  gap: var(--jun-ui-action-gap);
  align-content: start;
  border-top: var(--jun-ui-action-border-width) solid var(--jun-ui-line);
}

.jun-ui-action-card.primary {
  border-top-color: var(--jun-ui-accent);
}

.jun-ui-action-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jun-ui-action-gap);
}

.jun-ui-action-card button {
  width: 100%;
}

.jun-ui-prompt-output {
  width: 100%;
  min-height: 96px;
  resize: vertical;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
  color: var(--jun-ui-ink);
  padding: var(--jun-ui-field-padding-block) var(--jun-ui-field-padding-inline);
  font: inherit;
  line-height: 1.45;
}

footer {
  margin-top: 18px;
}

@media (max-width: 720px) {
  .jun-ui-shell {
    padding: var(--jun-ui-page-padding-mobile-block) var(--jun-ui-page-padding-mobile-inline) var(--jun-ui-page-padding-mobile-bottom);
  }

  .jun-ui-header {
    display: grid;
  }

  h1 {
    font-size: var(--jun-ui-font-size-h1-mobile);
  }
}

${renderSemiThemeBridge(registry)}

${renderLayoutUtilities()}
`;
}

function renderTokenPreview(token) {
  if (token.group === "color") {
    return `<div class="token-swatch" style="background: var(${escapeHtml(token.name)})"></div>`;
  }
  if (token.group === "type") {
    if (token.name.includes("font-sans")) {
      return `<div class="token-type-sample" style="font-family: var(${escapeHtml(token.name)})">Aa</div>`;
    }
    if (token.name.includes("line-height")) {
      return `<div class="token-lines" style="line-height: var(${escapeHtml(token.name)})"><span>行高</span><span>示例文字</span></div>`;
    }
    return `<div class="token-type-sample" style="font-size: var(${escapeHtml(token.name)})">Ag</div>`;
  }
  if (token.group === "spacing") {
    return `<div class="token-spacing-track"><span style="width: var(${escapeHtml(token.name)})"></span></div>`;
  }
  if (token.group === "radius") {
    return `<div class="token-shape-sample" style="border-radius: var(${escapeHtml(token.name)})"></div>`;
  }
  if (token.group === "border") {
    return token.name.includes("width")
      ? `<div class="token-border-sample" style="border-top: var(${escapeHtml(token.name)}) solid var(--jun-ui-accent)"></div>`
      : `<div class="token-border-sample" style="border: var(${escapeHtml(token.name)})"></div>`;
  }
  if (token.group === "shadow") {
    return `<div class="token-shadow-sample" style="box-shadow: var(${escapeHtml(token.name)})"></div>`;
  }
  return '<div class="token-empty-sample"></div>';
}

function renderTokenCard(token) {
  const copyValue = `${token.name}: ${token.value};`;
  return `        <article class="token-card" data-token-card data-token-text="${escapeHtml(`${token.name} ${token.value} ${token.role} ${token.usage} ${token.group}`)}">
          ${renderTokenPreview(token)}
          <div class="token-card-copy">
            <code>${escapeHtml(token.name)}</code>
            <strong>${escapeHtml(token.role)}</strong>
            <span>${escapeHtml(token.value)}</span>
            <p>${escapeHtml(token.usage)}</p>
          </div>
          <button type="button" class="jui-button token-copy-button" data-copy-value="${escapeHtml(copyValue)}">复制</button>
        </article>`;
}

function renderTokenSections(registry) {
  const groupOrder = ["color", "type", "spacing", "radius", "border", "shadow"];
  const grouped = groupTokens(registry);
  return groupOrder
    .filter((group) => grouped.has(group))
    .map((group) => {
      const tokens = grouped.get(group);
      return `    <section class="token-section" id="${escapeHtml(group)}">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${escapeHtml(tokenGroupNavLabel(group))}</p>
          <h2>${escapeHtml(tokenGroupTitle(group))}</h2>
        </div>
        <p>${escapeHtml(tokenGroupIntro(group))}</p>
      </div>
      <div class="token-grid">
${tokens.map(renderTokenCard).join("\n")}
      </div>
    </section>`;
    })
    .join("\n\n");
}

function renderTokenCssBlock(registry) {
  return `${renderTokenCssVariables(registry)}
`;
}

const referenceStyles = [
  {
    name: "Polaris-like",
    source: "Shopify Polaris",
    principle: "颜色只服务状态和注意力，主体接近黑白灰。",
    recommended: true,
    bg: "#F6F6F7",
    panel: "#FFFFFF",
    ink: "#202223",
    muted: "#6D7175",
    line: "#D2D5D8",
    accent: "#2C6ECB",
    accentText: "#FFFFFF",
    soft: "#EAF2FF",
    success: "#008060",
    warning: "#B98900",
  },
  {
    name: "Primer-like",
    source: "GitHub Primer",
    principle: "工程产品感强，中性色细腻，强调色偏功能而非装饰。",
    bg: "#F6F8FA",
    panel: "#FFFFFF",
    ink: "#1F2328",
    muted: "#656D76",
    line: "#D0D7DE",
    accent: "#0969DA",
    accentText: "#FFFFFF",
    soft: "#DDF4FF",
    success: "#1A7F37",
    warning: "#9A6700",
  },
  {
    name: "Spectrum-like",
    source: "Adobe Spectrum",
    principle: "专业工具气质，灰阶干净，蓝色只承担操作焦点。",
    bg: "#F8F8F8",
    panel: "#FFFFFF",
    ink: "#222222",
    muted: "#6E6E6E",
    line: "#DADADA",
    accent: "#0D66D0",
    accentText: "#FFFFFF",
    soft: "#E8F2FF",
    success: "#12805C",
    warning: "#946F00",
  },
  {
    name: "Atlassian-like",
    source: "Atlassian Design",
    principle: "复杂 SaaS 工作台，深蓝文字和蓝色操作形成稳定识别。",
    bg: "#F7F8F9",
    panel: "#FFFFFF",
    ink: "#172B4D",
    muted: "#626F86",
    line: "#DCDFE4",
    accent: "#0C66E4",
    accentText: "#FFFFFF",
    soft: "#E9F2FF",
    success: "#216E4E",
    warning: "#A54800",
  },
];

function renderReferenceStyle(style) {
  const customProperties = [
    ["--ref-bg", style.bg],
    ["--ref-panel", style.panel],
    ["--ref-ink", style.ink],
    ["--ref-muted", style.muted],
    ["--ref-line", style.line],
    ["--ref-accent", style.accent],
    ["--ref-accent-text", style.accentText],
    ["--ref-soft", style.soft],
    ["--ref-success", style.success],
    ["--ref-warning", style.warning],
  ]
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");
  return `        <article class="reference-card${style.recommended ? " is-recommended" : ""}" style="${escapeHtml(customProperties)}">
          <div class="reference-card-head">
            <div>
              <p class="eyebrow">${escapeHtml(style.source)}</p>
              <h3>${escapeHtml(style.name)}</h3>
            </div>
            <div class="reference-card-badges">
              ${style.recommended ? "<span>推荐基准</span>" : ""}
              <span>${escapeHtml(style.accent)}</span>
            </div>
          </div>
          <p>${escapeHtml(style.principle)}</p>
          <div class="reference-application" aria-label="${escapeHtml(style.name)} 应用场景对比">
            <aside class="reference-sidebar" aria-label="侧边导航">
              <strong>Ops</strong>
              <span class="is-active">信号</span>
              <span>任务</span>
              <span>系统</span>
            </aside>
            <div class="reference-main-preview">
              <div class="reference-app-topbar">
                <div>
                  <span>同一页面真实片段</span>
                  <strong>Design Ops</strong>
                </div>
                <button type="button" class="jui-button">新建任务</button>
              </div>
              <div class="reference-filterbar" aria-label="筛选表单">
                <span>筛选表单</span>
                <button type="button" class="jui-button">高优先级</button>
                <button type="button" class="jui-button">7 天</button>
                <button type="button" class="jui-button">待处理</button>
              </div>
              <div class="reference-tiles" aria-label="指标区">
                <div><span>待处理</span><strong>24</strong><small>+8%</small></div>
                <div><span>已完成</span><strong>71</strong><small>稳定</small></div>
                <div><span>风险</span><strong>3</strong><small>复查</small></div>
              </div>
              <section class="reference-chart" aria-label="趋势图表">
                <div class="reference-chart-head">
                  <span>趋势图表</span>
                  <strong>7d</strong>
                </div>
                <div class="reference-chart-bars">
                  <i style="--bar: 42%"></i>
                  <i style="--bar: 55%"></i>
                  <i style="--bar: 48%"></i>
                  <i style="--bar: 70%"></i>
                  <i style="--bar: 62%"></i>
                  <i style="--bar: 78%"></i>
                  <i style="--bar: 88%"></i>
                </div>
              </section>
              <section class="reference-table" aria-label="任务表格">
                <div class="reference-table-head">
                  <span>任务表格</span>
                  <span>Owner</span>
                  <span>状态标签</span>
                </div>
                <div class="reference-table-row">
                  <span>Token 审查</span>
                  <span>Jun</span>
                  <strong class="reference-status reference-status--success">就绪</strong>
                </div>
                <div class="reference-table-row">
                  <span>Agent 复制块</span>
                  <span>AI</span>
                  <strong class="reference-status reference-status--warning">复查</strong>
                </div>
              </section>
            </div>
          </div>
          <div class="reference-swatches" aria-label="${escapeHtml(style.name)} token 摘要">
            <span style="background: var(--ref-bg)"></span>
            <span style="background: var(--ref-panel)"></span>
            <span style="background: var(--ref-ink)"></span>
            <span style="background: var(--ref-muted)"></span>
            <span style="background: var(--ref-line)"></span>
            <span style="background: var(--ref-accent)"></span>
            <span style="background: var(--ref-success)"></span>
            <span style="background: var(--ref-warning)"></span>
          </div>
        </article>`;
}

function renderReferenceComparison() {
  return `    <section class="token-section reference-comparison" id="reference-comparison">
      <div class="section-heading">
        <div>
          <p class="eyebrow">调研对比</p>
          <h2>参考风格对比：应用场景对比</h2>
        </div>
        <p>同一页面真实片段，用四套成熟 design system 的气质做近似预览；当前默认 token 已采用 Polaris-like，其他方案保留为参照。</p>
      </div>
      <div class="reference-grid">
${referenceStyles.map(renderReferenceStyle).join("\n")}
      </div>
    </section>`;
}

function renderTokenConsoleHtml(registry) {
  const grouped = groupTokens(registry);
  const groupCount = grouped.size;
  const tokenCount = registry.tokens.length;
  const cssBlock = renderTokenCssBlock(registry);
  const navItems = ["color", "type", "spacing", "radius", "border", "shadow"]
    .filter((group) => grouped.has(group))
    .map((group) => `<a href="#${escapeHtml(group)}">${escapeHtml(tokenGroupNavLabel(group))}</a>`)
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="jun-ui tokens">
  <title>jun-ui Token 控制台</title>
  <link rel="stylesheet" href="./assets/tokens.css">
</head>
<body data-jun-ui-token-console data-page-type="token-console" data-component-system="jun-ui tokens">
  <main class="token-shell" data-jun-ui-static-fallback>
    <header class="token-hero">
      <div class="hero-copy">
        <p class="eyebrow">jun-ui 设计系统</p>
        <h1>Token 控制台</h1>
        <p>给人审查的视觉 token，给 AI 生成页面时复用的稳定复制块，并明确以 file:// artifact 作为验收目标。</p>
      </div>
      <div class="health-grid" aria-label="Token 控制台状态">
        <div>
          <span>分组</span>
          <strong>${groupCount}</strong>
        </div>
        <div>
          <span>token 数</span>
          <strong>${tokenCount}</strong>
        </div>
        <div>
          <span>来源</span>
          <strong>JSON</strong>
        </div>
      </div>
    </header>

    <nav class="token-nav" aria-label="Token 分组">
      ${navItems}
    </nav>

    <section class="token-tools" aria-label="Token 工具">
      <label>
        <span>筛选</span>
        <input type="search" class="jui-input" data-token-filter placeholder="变量名、角色、值、用途">
      </label>
      <button type="button" class="jui-button copy-all-button" data-copy-target="aiCopyBlock">复制全部 token</button>
    </section>

${renderReferenceComparison()}

${renderTokenSections(registry)}

    <section class="token-section pattern-proof" id="pattern-proof">
      <div class="section-heading">
        <div>
          <p class="eyebrow">预览</p>
          <h2>模式预览</h2>
        </div>
        <p>用同一份 registry token 渲染一个紧凑的工作台片段。</p>
      </div>
      <div class="proof-surface">
        <div class="proof-header">
          <div>
            <span class="proof-kicker">AI Radar · workbench</span>
            <h3>每日信号复盘</h3>
            <p>扫描、比较并分发最高价值的更新。</p>
          </div>
          <button type="button" class="jui-button">查看</button>
        </div>
        <div class="proof-metrics">
          <div><span>信号</span><strong>42</strong></div>
          <div><span>优先级</span><strong>7</strong></div>
          <div><span>就绪</span><strong>file://</strong></div>
        </div>
        <div class="proof-rows" aria-label="预览行">
          <div><span>模型发布</span><strong>需要复查</strong></div>
          <div><span>设计系统</span><strong>稳定</strong></div>
          <div><span>Agent 工具</span><strong>观察</strong></div>
        </div>
      </div>
    </section>

    <section class="token-section ai-copy" id="ai-copy">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Agent 参考</p>
          <h2>AI 复制块</h2>
        </div>
        <p>后续页面生成需要精确复用 jun-ui 值时，复制这一段即可。</p>
      </div>
      <pre id="aiCopyBlock"><code>${escapeHtml(cssBlock)}</code></pre>
    </section>
  </main>
  <script src="./assets/tokens.js"></script>
</body>
</html>
`;
}

function renderTokenConsoleStyles(registry) {
  return `${renderTokenCssVariables(registry)}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--jun-ui-bg);
  color: var(--jun-ui-ink);
  font-family: var(--jun-ui-font-sans);
  font-size: var(--jun-ui-font-size-body);
  line-height: var(--jun-ui-line-height-body);
  letter-spacing: 0;
}

button,
input {
  -webkit-appearance: none;
  appearance: none;
  font: inherit;
}

button {
  min-height: 36px;
  border: 0;
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-accent);
  color: var(--jun-ui-panel);
  padding: 0 var(--jun-ui-field-padding-inline);
  cursor: pointer;
}

button:hover {
  filter: brightness(0.94);
}

.token-shell {
  width: min(var(--jun-ui-page-max-width), calc(100vw - 40px));
  margin: 0 auto;
  padding: var(--jun-ui-page-padding-block) 0 var(--jun-ui-page-padding-bottom);
}

.token-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  gap: var(--jun-ui-header-gap);
  align-items: stretch;
  padding: var(--jun-ui-header-padding);
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
  box-shadow: var(--jun-ui-shadow);
}

.hero-copy {
  display: grid;
  gap: var(--jun-ui-inline-gap);
  min-width: 0;
}

.eyebrow,
.hero-copy p,
.section-heading p,
.token-card p,
.token-card span,
.health-grid span,
.proof-kicker,
.proof-metrics span,
.proof-rows span,
.token-tools span {
  color: var(--jun-ui-muted);
}

.eyebrow {
  margin: 0;
  font-size: var(--jun-ui-font-size-kicker);
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font-size: var(--jun-ui-font-size-h1);
  line-height: var(--jun-ui-line-height-heading);
}

h2 {
  font-size: var(--jun-ui-font-size-h2);
  line-height: var(--jun-ui-line-height-compact);
}

h3 {
  font-size: var(--jun-ui-font-size-h2);
  line-height: var(--jun-ui-line-height-compact);
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--jun-ui-grid-gap);
}

.health-grid div {
  display: grid;
  align-content: center;
  min-height: 90px;
  padding: var(--jun-ui-field-padding-block) var(--jun-ui-field-padding-inline);
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-bg);
}

.health-grid strong {
  font-size: var(--jun-ui-font-size-metric);
  line-height: var(--jun-ui-line-height-heading);
}

.token-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--jun-ui-inline-gap);
  margin-top: var(--jun-ui-section-gap);
}

.token-nav a {
  color: var(--jun-ui-ink);
  text-decoration: none;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
  padding: 6px 10px;
}

.token-tools {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--jun-ui-grid-gap);
  margin-top: var(--jun-ui-section-gap);
}

.token-tools label {
  display: grid;
  gap: var(--jun-ui-inline-gap);
  min-width: min(100%, 420px);
}

.token-tools input {
  min-height: 38px;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
  color: var(--jun-ui-ink);
  padding: 0 var(--jun-ui-field-padding-inline);
}

.token-section {
  margin-top: calc(var(--jun-ui-section-gap) * 1.45);
}

.reference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 540px), 1fr));
  gap: var(--jun-ui-grid-gap);
}

.reference-card {
  display: grid;
  gap: var(--jun-ui-stack-gap);
  border: 1px solid var(--ref-line);
  border-radius: var(--jun-ui-radius);
  background: var(--ref-panel);
  color: var(--ref-ink);
  padding: var(--jun-ui-field-padding-inline);
  box-shadow: var(--jun-ui-shadow);
}

.reference-card.is-recommended {
  border-color: var(--ref-accent);
  box-shadow: var(--jun-ui-shadow);
}

.reference-card p,
.reference-card .eyebrow,
.reference-card span {
  color: var(--ref-muted);
}

.reference-card-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--jun-ui-action-gap);
}

.reference-card-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: 6px;
}

.reference-card-badges span {
  border: 1px solid var(--ref-line);
  border-radius: var(--jun-ui-radius);
  background: var(--ref-soft);
  color: var(--ref-accent);
  padding: 3px 7px;
  font-size: var(--jun-ui-font-size-kicker);
}

.reference-application {
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--ref-line);
  border-radius: var(--jun-ui-radius);
  background: var(--ref-bg);
  min-height: 390px;
}

.reference-sidebar {
  display: grid;
  align-content: start;
  gap: 6px;
  background: var(--ref-panel);
  border-right: 1px solid var(--ref-line);
  padding: 14px 10px;
}

.reference-sidebar strong {
  color: var(--ref-ink);
  font-size: 15px;
  line-height: var(--jun-ui-line-height-compact);
  margin-bottom: 6px;
}

.reference-sidebar span {
  border-radius: 6px;
  color: var(--ref-muted);
  padding: 6px 8px;
  font-size: 12px;
}

.reference-sidebar .is-active {
  background: var(--ref-soft);
  color: var(--ref-accent);
  font-weight: 650;
}

.reference-main-preview {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 12px;
}

.reference-app-topbar,
.reference-filterbar,
.reference-tiles div,
.reference-chart,
.reference-table {
  border: 1px solid var(--ref-line);
  border-radius: var(--jun-ui-radius);
  background: var(--ref-panel);
}

.reference-app-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
}

.reference-app-topbar div {
  display: grid;
  min-width: 0;
}

.reference-app-topbar strong {
  color: var(--ref-ink);
  font-size: 18px;
  line-height: var(--jun-ui-line-height-compact);
}

.reference-app-topbar button {
  min-height: 30px;
  flex: 0 0 auto;
  background: var(--ref-accent);
  color: var(--ref-accent-text);
  padding: 0 10px;
}

.reference-filterbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px;
}

.reference-filterbar span {
  flex: 1 1 72px;
  color: var(--ref-muted);
  font-size: 12px;
}

.reference-filterbar button {
  min-height: 26px;
  border: 1px solid var(--ref-line);
  background: var(--ref-bg);
  color: var(--ref-ink);
  padding: 0 8px;
  font-size: 12px;
}

.reference-tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.reference-tiles div {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 9px;
}

.reference-tiles strong {
  color: var(--ref-ink);
  font-size: 22px;
  line-height: var(--jun-ui-line-height-heading);
}

.reference-tiles small {
  color: var(--ref-accent);
  font-size: 11px;
}

.reference-chart {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.reference-chart-head {
  display: flex;
  justify-content: space-between;
  color: var(--ref-muted);
  font-size: 12px;
}

.reference-chart-head strong {
  color: var(--ref-accent);
}

.reference-chart-bars {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  align-items: end;
  min-height: 76px;
}

.reference-chart-bars i {
  display: block;
  height: var(--bar);
  min-height: 16px;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, var(--ref-accent), var(--ref-soft));
  border: 1px solid var(--ref-line);
}

.reference-table {
  display: grid;
  overflow: hidden;
}

.reference-table-head,
.reference-table-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(54px, 0.7fr) minmax(70px, 0.85fr);
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
}

.reference-table-head {
  background: var(--ref-bg);
  color: var(--ref-muted);
  font-size: 11px;
  font-weight: 650;
}

.reference-table-row {
  border-top: 1px solid var(--ref-line);
  color: var(--ref-ink);
  font-size: 12px;
}

.reference-table-row > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-status {
  justify-self: start;
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 11px;
  line-height: 1.5;
}

.reference-status--success {
  background: var(--ref-soft);
  background: color-mix(in srgb, var(--ref-success) 13%, var(--ref-panel));
  color: var(--ref-success);
}

.reference-status--warning {
  background: var(--ref-soft);
  background: color-mix(in srgb, var(--ref-warning) 14%, var(--ref-panel));
  color: var(--ref-warning);
}

.reference-swatches {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 5px;
}

.reference-swatches span {
  aspect-ratio: 1;
  border: 1px solid var(--ref-line);
  border-radius: 5px;
}

.section-heading {
  display: grid;
  grid-template-columns: minmax(180px, 280px) minmax(0, 1fr);
  gap: var(--jun-ui-header-gap);
  align-items: end;
  margin-bottom: var(--jun-ui-grid-gap);
}

.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--jun-ui-grid-gap);
}

.token-card {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr) auto;
  gap: var(--jun-ui-action-gap);
  align-items: center;
  min-height: 116px;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
  padding: var(--jun-ui-field-padding-inline);
}

.token-card[hidden] {
  display: none;
}

.token-card-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.token-card code,
.ai-copy code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}

.token-card code {
  color: var(--jun-ui-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.token-card strong {
  line-height: var(--jun-ui-line-height-compact);
}

.token-card p {
  font-size: var(--jun-ui-font-size-kicker);
}

.token-copy-button {
  min-width: 58px;
  background: var(--jun-ui-bg);
  color: var(--jun-ui-ink);
  border: var(--jun-ui-border);
}

.token-swatch,
.token-shape-sample,
.token-border-sample,
.token-shadow-sample,
.token-empty-sample {
  width: 50px;
  height: 50px;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
}

.token-type-sample {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-bg);
  overflow: hidden;
}

.token-lines {
  display: grid;
  align-content: center;
  width: 50px;
  height: 50px;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-bg);
  padding: 4px;
  font-size: 10px;
}

.token-spacing-track {
  width: 50px;
  height: 50px;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-bg);
  padding: 8px;
}

.token-spacing-track span {
  display: block;
  max-width: 100%;
  height: 100%;
  border-radius: 4px;
  background: var(--jun-ui-accent);
}

.token-shadow-sample {
  box-shadow: var(--jun-ui-shadow);
}

.proof-surface {
  display: grid;
  gap: var(--jun-ui-stack-gap);
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
  box-shadow: var(--jun-ui-shadow);
  padding: var(--jun-ui-header-padding);
}

.proof-header {
  display: flex;
  justify-content: space-between;
  gap: var(--jun-ui-header-gap);
}

.proof-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--jun-ui-grid-gap);
}

.proof-metrics div {
  display: grid;
  padding: var(--jun-ui-field-padding-block) var(--jun-ui-field-padding-inline);
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-bg);
}

.proof-metrics strong {
  font-size: var(--jun-ui-font-size-metric);
  line-height: var(--jun-ui-line-height-heading);
}

.proof-rows {
  display: grid;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  overflow: hidden;
}

.proof-rows div {
  display: flex;
  justify-content: space-between;
  gap: var(--jun-ui-grid-gap);
  padding: var(--jun-ui-field-padding-block) var(--jun-ui-field-padding-inline);
  background: var(--jun-ui-panel);
}

.proof-rows div + div {
  border-top: var(--jun-ui-border);
}

.ai-copy pre {
  margin: 0;
  max-height: 360px;
  overflow: auto;
  border: var(--jun-ui-border);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
  padding: var(--jun-ui-header-padding);
}

@media (max-width: 760px) {
  .token-shell {
    width: calc(100vw - 24px);
    padding: var(--jun-ui-page-padding-mobile-block) 0 var(--jun-ui-page-padding-mobile-bottom);
  }

  .token-hero,
  .section-heading,
  .token-tools,
  .proof-header {
    display: grid;
  }

  .health-grid,
  .proof-metrics {
    grid-template-columns: 1fr;
  }

  .reference-application {
    grid-template-columns: 1fr;
  }

  .reference-sidebar {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-right: 0;
    border-bottom: 1px solid var(--ref-line);
  }

  .reference-sidebar strong {
    margin-bottom: 0;
  }

  .reference-tiles {
    grid-template-columns: 1fr;
  }

  .reference-app-topbar {
    align-items: start;
  }

  .reference-table-head,
  .reference-table-row {
    grid-template-columns: minmax(0, 1fr) minmax(42px, 0.55fr) minmax(58px, 0.65fr);
    gap: 6px;
    padding: 8px;
  }

  .token-card {
    grid-template-columns: 50px minmax(0, 1fr);
  }

  .token-copy-button {
    grid-column: 1 / -1;
  }

  h1 {
    font-size: var(--jun-ui-font-size-h1-mobile);
  }
}
`;
}

function renderTokenConsoleScript() {
  return `(() => {
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    return Promise.resolve();
  }

  document.querySelectorAll("[data-copy-value]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyText(button.getAttribute("data-copy-value") || "");
      const previous = button.textContent;
      button.textContent = "已复制";
      window.setTimeout(() => {
        button.textContent = previous;
      }, 1200);
    });
  });

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.getAttribute("data-copy-target") || "");
      await copyText(target ? target.textContent.trim() : "");
      const previous = button.textContent;
      button.textContent = "已复制";
      window.setTimeout(() => {
        button.textContent = previous;
      }, 1200);
    });
  });

  const filter = document.querySelector("[data-token-filter]");
  if (filter) {
    filter.addEventListener("input", () => {
      const query = filter.value.trim().toLowerCase();
      document.querySelectorAll("[data-token-card]").forEach((card) => {
        const text = (card.getAttribute("data-token-text") || "").toLowerCase();
        card.hidden = Boolean(query && !text.includes(query));
      });
    });
  }
})();`;
}

function dependencyAliases() {
  const packageNames = [
    "@douyinfe/semi-icons",
    "@douyinfe/semi-ui",
    "react",
    "react-dom",
  ];
  return Object.fromEntries(
    packageNames.map((packageName) => [packageName, path.join(repoRoot, "node_modules", packageName)]),
  );
}

async function writeViteProject({ config, tempRoot }) {
  const srcDir = path.join(tempRoot, "src");
  const tokenRegistry = await loadTokenRegistry();
  await mkdir(srcDir, { recursive: true });
  await writeFile(path.join(srcDir, "main.jsx"), renderReactSource(config), "utf8");
  await writeFile(path.join(srcDir, "styles.css"), renderStyles(tokenRegistry), "utf8");
}

async function listBuiltFiles(dir, prefix = "") {
  const entries = await readdir(path.join(dir, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listBuiltFiles(dir, relativePath)));
    } else {
      files.push(relativePath.split(path.sep).join("/"));
    }
  }
  return files;
}

async function moveRootAssetsToAssetsDir(outDir, assetsDir) {
  const assetDir = path.join(outDir, assetsDir);
  await mkdir(assetDir, { recursive: true });
  const entries = await readdir(outDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || (!entry.name.endsWith(".js") && !entry.name.endsWith(".css"))) {
      continue;
    }
    await rename(path.join(outDir, entry.name), path.join(assetDir, entry.name));
  }
}

async function statRequired(file) {
  try {
    return await stat(file);
  } catch {
    throw new Error(`Path does not exist: ${file}`);
  }
}

async function listFilesRecursive(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function resolveVerifySourceFiles({ config, configPath, projectRoot }) {
  if (!config.app || typeof config.app !== "object") return [];
  const files = [];
  if (config.app.html) {
    files.push(resolveInputPath({ configPath, projectRoot }, config.app.html, "app.html"));
  }
  if (config.app.entry) {
    files.push(resolveInputPath({ configPath, projectRoot }, config.app.entry, "app.entry"));
  }
  for (const [index, style] of asConfigArray(config.app.styles).entries()) {
    files.push(resolveInputPath({ configPath, projectRoot }, style, `app.styles[${index}]`));
  }
  return files;
}

async function resolveVerifyTarget(argv) {
  const { flags, positionals } = parseFlags(argv);
  const targetArg = positionals[0];
  if (!targetArg) throw new Error(`Missing config or artifact path.\n${usage()}`);
  const projectRoot = flags["project-root"] ? path.resolve(flags["project-root"]) : undefined;
  const targetPath = path.resolve(projectRoot || process.cwd(), targetArg);
  const targetStat = await statRequired(targetPath);
  if (targetStat.isDirectory()) {
    return {
      artifactDir: targetPath,
      outputFileName: "index.html",
      sourceFiles: [],
      strict: Boolean(flags.strict),
      scanArtifactCssColors: true,
    };
  }
  if (/\.html?$/i.test(targetPath)) {
    return {
      artifactDir: path.dirname(targetPath),
      outputFileName: path.basename(targetPath),
      sourceFiles: [],
      strict: Boolean(flags.strict),
      scanArtifactCssColors: true,
    };
  }
  const configPath = targetPath;
  const config = await readJson(configPath);
  return {
    artifactDir: resolveOutDir({ config, flags, configPath, projectRoot }),
    outputFileName: resolveOutputFileName(config),
    sourceFiles: resolveVerifySourceFiles({ config, configPath, projectRoot }),
    strict: Boolean(flags.strict),
    scanArtifactCssColors: false,
  };
}

function findAssetPathViolations(html) {
  const violations = [];
  const assetPattern = /\b(?:href|src)=["']([^"']+)["']/gi;
  let match;
  while ((match = assetPattern.exec(html))) {
    const assetPath = match[1].trim();
    if (
      assetPath.startsWith("/") ||
      assetPath.startsWith("//") ||
      assetPath.startsWith("file://")
    ) {
      violations.push(`absolute asset path is not file-openable: ${assetPath}`);
    }
  }
  return violations;
}

function removeAllowedCustomPropertyColorDefinitions(line, { allowTokenDefinitions, allowReferenceDefinitions }) {
  if (!allowTokenDefinitions && !allowReferenceDefinitions) return line;
  const prefixes = [];
  if (allowTokenDefinitions) prefixes.push("--jun-ui-");
  if (allowReferenceDefinitions) prefixes.push("--ref-");
  const prefixPattern = `(?:${prefixes.map((prefix) => prefix.replaceAll("-", "\\-")).join("|")})`;
  return line.replace(new RegExp(`${prefixPattern}[\\w-]*\\s*:[^;}]*(?:;|$|(?=}))`, "gi"), "");
}

function stripCssPropertyNames(line) {
  return line.replace(/(^|[;{])\s*(?:--)?[a-zA-Z_-][\w-]*\s*:/g, "$1");
}

function findBareColorViolations(text, fileLabel, options = {}) {
  const {
    allowTokenDefinitions = false,
    allowReferenceDefinitions = false,
    includeNamedColors = true,
  } = options;
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = withoutComments.split(/\r?\n/);
  const violations = [];
  const patterns = [
    { label: "hex", regex: /#[0-9a-fA-F]{3,8}\b/g },
    { label: "functional", regex: /\b(?:rgb|rgba|hsl|hsla|lab|lch|oklab|oklch)\s*\(/gi },
  ];
  if (includeNamedColors) {
    patterns.push({
      label: "named",
      regex: /\b(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|cyan|magenta|lime|navy|teal|maroon|olive|silver|gold)\b/gi,
    });
  }
  for (const [index, originalLine] of lines.entries()) {
    const line = removeAllowedCustomPropertyColorDefinitions(originalLine, {
      allowTokenDefinitions,
      allowReferenceDefinitions,
    });
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      const searchLine = pattern.label === "named" ? stripCssPropertyNames(line) : line;
      const match = pattern.regex.exec(searchLine);
      if (match) {
        violations.push(`bare color ${match[0]} in ${fileLabel}:${index + 1}`);
        break;
      }
    }
  }
  return violations;
}

function findInlineStyleColorViolations(html, fileLabel, { allowReferenceDefinitions }) {
  const violations = [];
  const stylePattern = /\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi;
  let match;
  while ((match = stylePattern.exec(html))) {
    const line = html.slice(0, match.index).split(/\r?\n/).length;
    violations.push(
      ...findBareColorViolations(match[2], `${fileLabel}:inline-style:${line}`, {
        allowTokenDefinitions: true,
        allowReferenceDefinitions,
      }),
    );
  }
  return violations;
}

function extractNativeControlClass(attrs = "") {
  const match = attrs.match(/\bclass(?:Name)?\s*=\s*(?:\{\s*)?(["'`])([\s\S]*?)\1/i);
  return match?.[2] || "";
}

function hasDeclaredControlContract(attrs = "") {
  if (/\bdata-jun-ui-control\b/i.test(attrs)) return true;
  const className = extractNativeControlClass(attrs);
  return /(^|\s)(?:jui-(?:button|input|textarea|select|checkbox|radio|switch|segmented__button)|semi-[\w-]+)/.test(className);
}

function isHiddenNativeControl(tag, attrs = "") {
  return tag.toLowerCase() === "input" && /\btype\s*=\s*(["'])hidden\1/i.test(attrs);
}

function findNativeControlContractViolations(text, fileLabel) {
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const violations = [];
  const controlPattern = /<\s*(button|input|textarea|select)\b([^>]*)>/g;
  let match;
  while ((match = controlPattern.exec(withoutComments))) {
    const tag = match[1].toLowerCase();
    const attrs = match[2] || "";
    if (isHiddenNativeControl(tag, attrs)) continue;
    if (hasDeclaredControlContract(attrs)) continue;
    const line = withoutComments.slice(0, match.index).split(/\r?\n/).length;
    const id = attrs.match(/\bid\s*=\s*(["'`])([^"'`]*)\1/i)?.[2];
    const className = extractNativeControlClass(attrs);
    const detail = [
      id ? `id=${id}` : "",
      className ? `class=${className}` : "missing class",
    ].filter(Boolean).join(", ");
    violations.push(
      `native control <${tag}> must use a jun-ui or Semi control contract in ${fileLabel}:${line}${detail ? ` (${detail})` : ""}`,
    );
  }
  return violations;
}

function containsNativeControl(text) {
  return /<\s*(?:button|input|textarea|select)\b/.test(text);
}

function hasNativeControlReset(text) {
  return /appearance\s*:\s*none/i.test(text);
}

async function verifyPage(argv) {
  const { artifactDir, outputFileName, sourceFiles, strict, scanArtifactCssColors } = await resolveVerifyTarget(argv);
  const htmlPath = path.join(artifactDir, outputFileName);
  const html = await readFile(htmlPath, "utf8");
  const artifactFiles = await listFilesRecursive(artifactDir);
  const cssFiles = artifactFiles.filter((file) => file.endsWith(".css")).sort();
  const cssBodies = [];
  for (const cssFile of cssFiles) {
    cssBodies.push([cssFile, await readFile(cssFile, "utf8")]);
  }
  const errors = [];
  const isTokenConsole = html.includes("data-jun-ui-token-console");

  if (!html.includes("data-jun-ui-artifact") && !isTokenConsole) {
    errors.push("artifact must include data-jun-ui-artifact or data-jun-ui-token-console");
  }
  if (!html.includes("data-jun-ui-static-fallback") && !/<main\b/i.test(html)) {
    errors.push("artifact must include visible static fallback content");
  }
  if (/type\s*=\s*["']module["']/i.test(html)) {
    errors.push("artifact must not require module scripts for file:// rendering");
  }
  errors.push(...findAssetPathViolations(html));

  const combinedArtifactText = [html, ...cssBodies.map(([, body]) => body)].join("\n");
  if (!combinedArtifactText.includes("--jun-ui-")) {
    errors.push("artifact must use --jun-ui-* Design System tokens");
  }
  if (!hasJunUiTokenDefinitions(combinedArtifactText)) {
    errors.push("artifact must define --jun-ui-* Design System tokens");
  }

  if (strict) {
    if (sourceFiles.length > 0) {
      const sourceBodies = [];
      for (const sourceFile of sourceFiles) {
        sourceBodies.push([sourceFile, await readFile(sourceFile, "utf8")]);
      }
      const sourceControlText = sourceBodies
        .filter(([sourceFile]) => !sourceFile.endsWith(".css"))
        .map(([, body]) => body)
        .join("\n");
      const sourceStyleText = sourceBodies
        .filter(([sourceFile]) => sourceFile.endsWith(".css"))
        .map(([, body]) => body)
        .join("\n");
      if (containsNativeControl(sourceControlText) && !hasNativeControlReset(sourceStyleText)) {
        errors.push("native controls must be normalized with appearance: none in source CSS");
      }
      for (const [sourceFile, body] of sourceBodies) {
        const relativeSource = path.relative(process.cwd(), sourceFile) || sourceFile;
        if (sourceFile.endsWith(".html") || sourceFile.endsWith(".htm")) {
          errors.push(
            ...findInlineStyleColorViolations(body, relativeSource, {
              allowReferenceDefinitions: false,
            }),
          );
          errors.push(...findNativeControlContractViolations(body, relativeSource));
        }
        if (sourceFile.endsWith(".css")) {
          errors.push(
            ...findBareColorViolations(body, relativeSource, {
              allowTokenDefinitions: false,
              allowReferenceDefinitions: false,
            }),
          );
        }
        if (/\.(?:mjs|js|jsx|ts|tsx)$/i.test(sourceFile)) {
          errors.push(...findNativeControlContractViolations(body, relativeSource));
        }
      }
    } else {
      const artifactStyleText = cssBodies.map(([, body]) => body).join("\n");
      if (containsNativeControl(html) && !hasNativeControlReset(artifactStyleText)) {
        errors.push("native controls must be normalized with appearance: none in artifact CSS");
      }
      errors.push(...findNativeControlContractViolations(html, path.relative(process.cwd(), htmlPath) || htmlPath));
      errors.push(
        ...findInlineStyleColorViolations(html, path.relative(process.cwd(), htmlPath) || htmlPath, {
          allowReferenceDefinitions: isTokenConsole,
        }),
      );
      if (scanArtifactCssColors) {
        for (const [cssFile, body] of cssBodies) {
          errors.push(
            ...findBareColorViolations(body, path.relative(process.cwd(), cssFile) || cssFile, {
              allowTokenDefinitions: true,
              allowReferenceDefinitions: isTokenConsole,
            }),
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`jun-ui page verification failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
  console.log(`jun-ui page verification passed ${htmlPath}`);
}

async function buildSemiArtifact({ config, outDir, outputFileName, assetsDir }) {
  const tempBase = path.join(repoRoot, "tmp");
  await mkdir(tempBase, { recursive: true });
  const tempRoot = await mkdtemp(path.join(tempBase, "jun-ui-semi-build-"));
  const tempOutDir = path.join(tempRoot, "dist");
  try {
    await writeViteProject({ config, tempRoot });
    await viteBuild({
      root: tempRoot,
      base: "./",
      configFile: false,
      define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
      },
      mode: "production",
      publicDir: false,
      logLevel: "silent",
      plugins: [react()],
      resolve: {
        alias: dependencyAliases(),
        dedupe: ["react", "react-dom"],
      },
      build: {
        outDir: tempOutDir,
        assetsDir,
        emptyOutDir: true,
        lib: {
          entry: path.join(tempRoot, "src", "main.jsx"),
          name: "JunUiArtifact",
          formats: ["iife"],
          fileName: "index",
          cssFileName: "index",
        },
      },
    });
    await moveRootAssetsToAssetsDir(tempOutDir, assetsDir);
    const builtFiles = await listBuiltFiles(tempOutDir);
    const jsFiles = builtFiles.filter((file) => file.endsWith(".js")).sort();
    const cssFiles = builtFiles.filter((file) => file.endsWith(".css")).sort();
    if (jsFiles.length === 0 || cssFiles.length === 0) {
      throw new Error("Semi Builder did not produce JavaScript and CSS assets");
    }
    await writeFile(path.join(tempOutDir, outputFileName), renderFinalIndexHtml(config, { jsFiles, cssFiles }), "utf8");
    await mkdir(outDir, { recursive: true });
    await rm(path.join(outDir, outputFileName), { force: true });
    await rm(path.join(outDir, assetsDir), { recursive: true, force: true });
    await cp(path.join(tempOutDir, outputFileName), path.join(outDir, outputFileName));
    await mkdir(path.dirname(path.join(outDir, assetsDir)), { recursive: true });
    await cp(path.join(tempOutDir, assetsDir), path.join(outDir, assetsDir), { recursive: true });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function buildAppBundleArtifact({ config, configPath, projectRoot, outDir, outputFileName, assetsDir }) {
  if (!config.app || typeof config.app !== "object") {
    throw new Error('Config field "app" is required for bundle-app');
  }
  const htmlPath = resolveInputPath({ configPath, projectRoot }, config.app.html, "app.html");
  const entryPath = resolveInputPath({ configPath, projectRoot }, config.app.entry, "app.entry");
  const stylePaths = asConfigArray(config.app.styles).map((style, index) =>
    resolveInputPath({ configPath, projectRoot }, style, `app.styles[${index}]`),
  );
  const dataScripts = resolveDataScripts(config);
  const sourceHtml = await readFile(htmlPath, "utf8");
  const tempBase = path.join(repoRoot, "tmp");
  await mkdir(tempBase, { recursive: true });
  const tempRoot = await mkdtemp(path.join(tempBase, "jun-ui-app-build-"));
  const tempOutDir = path.join(tempRoot, "dist");
  const tempEntry = path.join(tempRoot, "main.js");

  try {
    const imports = [
      ...stylePaths.map((stylePath) => `import ${JSON.stringify(stylePath)};`),
      `import ${JSON.stringify(entryPath)};`,
    ].join("\n");
    await writeFile(tempEntry, `${imports}\n`, "utf8");
    await viteBuild({
      root: tempRoot,
      base: "./",
      configFile: false,
      define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
      },
      mode: "production",
      publicDir: false,
      logLevel: "silent",
      resolve: {
        alias: dependencyAliases(),
        dedupe: ["react", "react-dom"],
      },
      build: {
        outDir: tempOutDir,
        assetsDir,
        emptyOutDir: true,
        lib: {
          entry: tempEntry,
          name: "JunUiBundledApp",
          formats: ["iife"],
          fileName: "index",
          cssFileName: "index",
        },
      },
    });
    await moveRootAssetsToAssetsDir(tempOutDir, assetsDir);
    const builtFiles = await listBuiltFiles(tempOutDir);
    const jsFiles = builtFiles.filter((file) => file.endsWith(".js")).sort();
    const cssFiles = await ensureBundleTokenCss({
      tempOutDir,
      cssFiles: builtFiles.filter((file) => file.endsWith(".css")).sort(),
      assetsDir,
    });
    if (jsFiles.length === 0) {
      throw new Error("bundle-app did not produce a JavaScript asset");
    }
    await writeFile(
      path.join(tempOutDir, outputFileName),
      renderBundledAppHtml(config, sourceHtml, { jsFiles, cssFiles, dataScripts }),
      "utf8",
    );
    await mkdir(outDir, { recursive: true });
    await rm(path.join(outDir, outputFileName), { force: true });
    await rm(path.join(outDir, assetsDir), { recursive: true, force: true });
    await cp(path.join(tempOutDir, outputFileName), path.join(outDir, outputFileName));
    await mkdir(path.dirname(path.join(outDir, assetsDir)), { recursive: true });
    await cp(path.join(tempOutDir, assetsDir), path.join(outDir, assetsDir), { recursive: true });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function build(argv) {
  const { flags, positionals } = parseFlags(argv);
  const configArg = positionals[0];
  if (!configArg) throw new Error(`Missing config path.\n${usage()}`);
  const projectRoot = flags["project-root"] ? path.resolve(flags["project-root"]) : undefined;
  const configPath = path.resolve(projectRoot || process.cwd(), configArg);
  const config = await readJson(configPath);
  const outDir = resolveOutDir({ config, flags, configPath, projectRoot });
  const outputFileName = resolveOutputFileName(config);
  const assetsDir = resolveAssetsDir(config);
  assertString(config.title, "title");
  assertString(config.type, "type");
  await buildSemiArtifact({ config, outDir, outputFileName, assetsDir });
  console.log(`Built ${path.join(outDir, outputFileName)}`);
}

async function bundleApp(argv) {
  const { flags, positionals } = parseFlags(argv);
  const configArg = positionals[0];
  if (!configArg) throw new Error(`Missing config path.\n${usage()}`);
  const projectRoot = flags["project-root"] ? path.resolve(flags["project-root"]) : undefined;
  const configPath = path.resolve(projectRoot || process.cwd(), configArg);
  const config = await readJson(configPath);
  const outDir = resolveOutDir({ config, flags, configPath, projectRoot });
  const outputFileName = resolveOutputFileName(config);
  const assetsDir = resolveAssetsDir(config);
  assertString(config.title, "title");
  assertString(config.type, "type");
  await buildAppBundleArtifact({ config, configPath, projectRoot, outDir, outputFileName, assetsDir });
  console.log(`Bundled ${path.join(outDir, outputFileName)}`);
}

async function tokens(argv) {
  const { flags } = parseFlags(argv);
  const outDir = flags.out
    ? path.isAbsolute(flags.out)
      ? path.normalize(flags.out)
      : path.resolve(process.cwd(), flags.out)
    : path.join(repoRoot, "dist", "tokens");
  const assetsDir = path.join(outDir, "assets");
  const registry = await loadTokenRegistry();
  await mkdir(outDir, { recursive: true });
  await rm(path.join(outDir, "index.html"), { force: true });
  await rm(assetsDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });
  await writeFile(path.join(outDir, "index.html"), renderTokenConsoleHtml(registry), "utf8");
  await writeFile(path.join(assetsDir, "tokens.css"), renderTokenConsoleStyles(registry), "utf8");
  await writeFile(path.join(assetsDir, "tokens.js"), renderTokenConsoleScript(), "utf8");
  console.log(`Generated token console ${path.join(outDir, "index.html")}`);
}

async function doctor(argv) {
  const { flags } = parseFlags(argv);
  const checks = [];
  checks.push({ name: "node", ok: true, detail: process.version });
  checks.push({ name: "jun-ui root", ok: await exists(repoRoot), detail: repoRoot });
  const ctx7Path = await findOnPath("ctx7");
  checks.push({
    name: "ctx7",
    ok: Boolean(ctx7Path),
    detail: ctx7Path || "missing; install Context7 CLI + Skills before substantial Semi implementation",
  });
  for (const skillName of ["context7-docs", "context7-cli"]) {
    const skillPath = await findSkill(skillName);
    checks.push({
      name: `${skillName} skill`,
      ok: Boolean(skillPath),
      detail: skillPath || "missing; install Context7 CLI + Skills before substantial Semi implementation",
    });
  }
  for (const check of checks) {
    console.log(`${check.ok ? "ok" : "missing"} ${check.name}: ${check.detail}`);
  }
  if (flags.strict && checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

async function findOnPath(command) {
  const pathEnv = process.env.PATH || "";
  const candidates = pathEnv.split(path.delimiter).map((dir) => path.join(dir, command));
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return "";
}

async function findSkill(skillName) {
  const cwd = process.cwd();
  const home = homedir();
  const roots = [
    path.join(cwd, ".agents", "skills"),
    path.join(cwd, ".codex", "skills"),
    path.join(home, ".agents", "skills"),
    path.join(home, ".codex", "skills"),
  ];
  for (const root of roots) {
    const skillPath = path.join(root, skillName, "SKILL.md");
    if (await exists(skillPath)) return skillPath;
  }
  return "";
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }
  if (command === "build") {
    await build(rest);
    return;
  }
  if (command === "bundle-app") {
    await bundleApp(rest);
    return;
  }
  if (command === "tokens") {
    await tokens(rest);
    return;
  }
  if (command === "verify-page") {
    await verifyPage(rest);
    return;
  }
  if (command === "doctor") {
    await doctor(rest);
    return;
  }
  throw new Error(`Unknown command "${command}".\n${usage()}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
