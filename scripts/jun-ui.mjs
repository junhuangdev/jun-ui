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
    "  jun-ui doctor [--strict] [--consumer-root <dir>] [--adoption-root <dir>]",
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

function isPathInside(parentDir, candidatePath) {
  const relative = path.relative(path.resolve(parentDir), path.resolve(candidatePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
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
const semiCssPath = path.join(repoRoot, "node_modules", "@douyinfe", "semi-ui", "dist", "css", "semi.min.css");

async function loadTokenRegistry() {
  const registry = await readJson(tokenRegistryPath);
  if (!Array.isArray(registry.tokens)) {
    throw new Error(`Delivery token registry ${tokenRegistryPath} must include a tokens array`);
  }
  return registry;
}

async function loadSemiTokenEntries() {
  const css = await readFile(semiCssPath, "utf8");
  const entries = [];
  const seen = new Set();
  const tokenPattern = /(--semi-[\w-]+)\s*:\s*([^;}]+)/g;
  let match;
  while ((match = tokenPattern.exec(css)) !== null) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);
    const value = match[2].trim();
    entries.push({
      name,
      value,
      group: semiTokenGroup(name),
      role: semiTokenRole(name),
      usage: semiTokenUsage(name),
    });
  }
  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function semiTokenGroup(name) {
  if (name.startsWith("--semi-color-data-")) return "semi-data-color";
  if (name.startsWith("--semi-color-")) return "semi-semantic-color";
  if (name.startsWith("--semi-border-radius-")) return "semi-radius";
  if (name.startsWith("--semi-ai-") || name.startsWith("--semi-color-ai-")) return "semi-ai";
  if (/^--semi-(?:amber|blue|cyan|green|grey|indigo|light-blue|light-green|lime|orange|pink|purple|red|teal|violet|yellow)-/.test(name)) {
    return "semi-palette";
  }
  return "semi-core";
}

function semiTokenRole(name) {
  if (name.startsWith("--semi-color-text-")) return "Semi 文本层级";
  if (name.startsWith("--semi-color-bg-")) return "Semi 背景层级";
  if (name.startsWith("--semi-color-fill-")) return "Semi 填充层级";
  if (name.startsWith("--semi-color-border")) return "Semi 边框";
  if (name.startsWith("--semi-color-data-")) return "Semi 数据可视化色";
  if (name.startsWith("--semi-color-success")) return "Semi 成功状态";
  if (name.startsWith("--semi-color-warning")) return "Semi 警告状态";
  if (name.startsWith("--semi-color-danger")) return "Semi 危险状态";
  if (name.startsWith("--semi-color-primary")) return "Semi 主操作色";
  if (name.startsWith("--semi-border-radius-")) return "Semi 圆角阶梯";
  if (name.startsWith("--semi-ai-") || name.startsWith("--semi-color-ai-")) return "Semi AI 视觉 token";
  if (/^--semi-(?:amber|blue|cyan|green|grey|indigo|light-blue|light-green|lime|orange|pink|purple|red|teal|violet|yellow)-/.test(name)) {
    return "Semi 基础色阶";
  }
  return "Semi 系统 token";
}

function semiTokenUsage(name) {
  if (name.startsWith("--semi-color-text-")) return "直接按 Semi 文档用于标题、正文、辅助文字和禁用文字。";
  if (name.startsWith("--semi-color-bg-")) return "直接按 Semi 文档用于页面、面板、浮层和局部表面。";
  if (name.startsWith("--semi-color-fill-")) return "直接按 Semi 文档用于 hover、active、浅色控件和弱强调背景。";
  if (name.startsWith("--semi-color-data-")) return "用于图表、趋势、分组统计和可视化序列。";
  if (name.startsWith("--semi-color-success")) return "用于成功、完成、通过、已保存等状态。";
  if (name.startsWith("--semi-color-warning")) return "用于警告、待复查、风险提示和非阻断异常。";
  if (name.startsWith("--semi-color-danger")) return "用于错误、删除、失败和阻断异常。";
  if (name.startsWith("--semi-color-primary")) return "用于主操作、当前选中、链接焦点和核心交互。";
  if (name.startsWith("--semi-border-radius-")) return "用于 Semi 组件和自定义表面的圆角，不再通过 jun-ui token 转译。";
  return "直接使用 Semi Design System 的官方 token；需要语义时优先查 Context7/Semi 文档。";
}

function renderCssVariables(tokens) {
  const declarations = tokens.map((token) => `  ${token.name}: ${token.value};`).join("\n");
  return `:root {
  color-scheme: light;
${declarations}
}`;
}

function renderDeliveryTokenCssVariables(registry) {
  const declarations = registry.tokens.map((token) => `  ${token.name}: ${token.value};`).join("\n");
  return `:root {
${declarations}
}`;
}

function renderSystemTokenCss({ deliveryRegistry, semiTokens }) {
  return `${renderCssVariables(semiTokens)}

${renderDeliveryTokenCssVariables(deliveryRegistry)}`;
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
.jui-row--tight { gap: var(--jun-ui-inline-gap); }
.jui-scroll-y {
  overflow-y: auto;
  min-height: 0;
  scrollbar-gutter: stable;
  /* End breathing room: scrolled-to-bottom content must never sit flush
     against the container edge. Bundled here so pages cannot forget it. */
  padding-bottom: var(--jun-ui-section-gap);
}
.jui-scroll-y::-webkit-scrollbar {
  width: 10px;
}
.jui-scroll-y::-webkit-scrollbar-track {
  background: transparent;
}
.jui-scroll-y::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background-color: var(--semi-color-border);
  background-clip: padding-box;
}
.jui-scroll-y::-webkit-scrollbar-thumb:hover {
  background-color: var(--semi-color-text-2);
}
/* Semi SideSheet scrolls its own body (Semi default: padding 0 24px — zero
   bottom padding), bypassing .jui-scroll-y, so the contract's scroll end
   breathing room is baked in at the component layer instead of relying on a
   per-page wrapper that call sites keep forgetting. Riding on
   body[data-jun-ui-artifact] outranks Semi's own rule regardless of
   stylesheet order. */
body[data-jun-ui-artifact] .semi-sidesheet-body {
  padding-bottom: var(--jun-ui-section-gap);
}`;
}

function hasSemiTokenDefinitions(text) {
  return /--semi-color-bg-0\s*:/.test(text) && /--semi-color-primary\s*:/.test(text);
}

function hasDeliveryTokenDefinitions(text) {
  return /--jun-ui-page-max-width\s*:/.test(text) && /--jun-ui-grid-gap\s*:/.test(text);
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
    "semi-semantic-color": "Semi 语义颜色 token",
    "semi-data-color": "Semi 数据颜色 token",
    "semi-palette": "Semi 基础色阶 token",
    "semi-radius": "Semi 圆角 token",
    "semi-ai": "Semi AI token",
    "semi-core": "Semi 核心 token",
    delivery: "jun-ui 交付变量",
  };
  return titles[group] || `${group} tokens`;
}

function tokenGroupNavLabel(group) {
  const labels = {
    "semi-semantic-color": "语义色",
    "semi-data-color": "数据色",
    "semi-palette": "色阶",
    "semi-radius": "圆角",
    "semi-ai": "AI",
    "semi-core": "核心",
    delivery: "交付",
  };
  return labels[group] || group;
}

function tokenGroupIntro(group) {
  const intros = {
    "semi-semantic-color": "直接来自 Semi Design System，用于文字、背景、边框、主操作、状态和交互反馈。",
    "semi-data-color": "直接来自 Semi Design System，用于图表、趋势、分组统计和数据可视化。",
    "semi-palette": "Semi 的基础色阶，是语义 token 的底层色彩来源。",
    "semi-radius": "Semi 的圆角阶梯，组件和自定义表面都直接使用这些 token。",
    "semi-ai": "Semi 为 AI 场景提供的渐变和强调 token。",
    "semi-core": "Semi 暴露的其他系统 token。",
    delivery: "jun-ui 只保留文件交付、页面外壳、布局节奏和静态 artifact 需要的变量。",
  };
  return intros[group] || "来自 Semi Design System 的 token。";
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
  const deliveryRegistry = await loadTokenRegistry();
  const semiTokens = await loadSemiTokenEntries();
  const tokenCss = `${renderSystemTokenCss({ deliveryRegistry, semiTokens })}

${renderLayoutUtilities()}

`;
  if (cssFiles.length > 0) {
    const firstCssPath = path.join(tempOutDir, cssFiles[0]);
    const existingCss = await readFile(firstCssPath, "utf8");
    if (!hasSemiTokenDefinitions(existingCss) || !hasDeliveryTokenDefinitions(existingCss)) {
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

function renderStyles({ deliveryRegistry, semiTokens }) {
  return `${renderSystemTokenCss({ deliveryRegistry, semiTokens })}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--semi-color-bg-0);
  color: var(--semi-color-text-0);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
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
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
  box-shadow: 0 12px 32px var(--semi-color-shadow);
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
  color: var(--semi-color-text-2);
  font-size: 13px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 28px;
  line-height: 1.18;
}

h2 {
  font-size: 18px;
  line-height: 1.25;
}

.jun-ui-muted {
  color: var(--semi-color-text-2);
  font-size: 13px;
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
  font-size: 24px;
  line-height: 1.18;
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
  border-top: var(--jun-ui-action-border-width) solid var(--semi-color-border);
}

.jun-ui-action-card.primary {
  border-top-color: var(--semi-color-primary);
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
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
  color: var(--semi-color-text-0);
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
    font-size: 24px;
  }
}

${renderLayoutUtilities()}
`;
}

function renderTokenPreview(token) {
  if (token.group === "semi-semantic-color" || token.group === "semi-data-color" || token.group === "semi-ai") {
    return `<div class="token-swatch" style="background: var(${escapeHtml(token.name)})"></div>`;
  }
  if (token.group === "semi-palette") {
    return `<div class="token-swatch" style="background: rgba(var(${escapeHtml(token.name)}), 1)"></div>`;
  }
  if (token.group === "semi-radius") {
    return `<div class="token-shape-sample" style="border-radius: var(${escapeHtml(token.name)})"></div>`;
  }
  if (token.group === "delivery") {
    if (/(?:gap|padding|width|indent)/.test(token.name)) {
      return `<div class="token-spacing-track"><span style="width: min(var(${escapeHtml(token.name)}), 100%)"></span></div>`;
    }
    if (token.name.includes("border-width")) {
      return `<div class="token-border-sample" style="border-top: var(${escapeHtml(token.name)}) solid var(--semi-color-primary)"></div>`;
    }
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
  const groupOrder = [
    "semi-semantic-color",
    "semi-data-color",
    "semi-radius",
    "semi-palette",
    "semi-ai",
    "semi-core",
    "delivery",
  ];
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

function combinedTokenRegistry({ deliveryRegistry, semiTokens }) {
  return {
    name: "semi-design-system",
    description: "Semi Design System 全量 token 面，加少量 jun-ui 文件交付变量。",
    tokens: [...semiTokens, ...deliveryRegistry.tokens],
  };
}

function renderTokenCssBlock({ deliveryRegistry, semiTokens }) {
  return `${renderSystemTokenCss({ deliveryRegistry, semiTokens })}
`;
}

function renderSemiUsageGuide() {
  return `    <section class="token-section usage-guide" id="usage-guide">
      <div class="section-heading">
        <div>
          <p class="eyebrow">使用边界</p>
          <h2>全量 Semi token 面</h2>
        </div>
        <p>Semi Design System 是唯一组件和视觉 token 来源；Context7 用来查 Semi 官方文档，jun-ui 只负责 Builder、file:// artifact、验证和少量交付变量。</p>
      </div>
      <div class="usage-grid">
        <article>
          <strong>文字与层级</strong>
          <p>使用 <code>--semi-color-text-0</code> 到 <code>--semi-color-text-3</code>，不要再经过 jun-ui 自定义文字 token。</p>
        </article>
        <article>
          <strong>背景与表面</strong>
          <p>使用 <code>--semi-color-bg-0</code> 到 <code>--semi-color-bg-4</code> 和 <code>--semi-color-fill-*</code>。</p>
        </article>
        <article>
          <strong>状态与数据</strong>
          <p>成功、警告、危险、信息、数据可视化直接使用 <code>--semi-color-success</code>、<code>--semi-color-warning</code>、<code>--semi-color-danger</code> 和 <code>--semi-color-data-*</code>。</p>
        </article>
        <article>
          <strong>jun-ui 交付变量</strong>
          <p><code>--jun-ui-*</code> 只用于页面最大宽度、外边距、区块间距、滚动留白和 artifact 外壳。</p>
        </article>
      </div>
    </section>`;
}

function renderTokenConsoleHtml({ deliveryRegistry, semiTokens }) {
  const registry = combinedTokenRegistry({ deliveryRegistry, semiTokens });
  const grouped = groupTokens(registry);
  const groupCount = grouped.size;
  const tokenCount = registry.tokens.length;
  const cssBlock = renderTokenCssBlock({ deliveryRegistry, semiTokens });
  const navItems = [
    ["usage-guide", "说明"],
    ...[
      "semi-semantic-color",
      "semi-data-color",
      "semi-radius",
      "semi-palette",
      "semi-ai",
      "semi-core",
      "delivery",
    ]
      .filter((group) => grouped.has(group))
      .map((group) => [group, tokenGroupNavLabel(group)]),
  ]
    .map(([href, label]) => `<a href="#${escapeHtml(href)}">${escapeHtml(label)}</a>`)
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="jun-ui Semi token surface">
  <title>Semi Token 控制台</title>
  <link rel="stylesheet" href="./assets/tokens.css">
</head>
<body data-jun-ui-token-console data-page-type="token-console" data-component-system="Semi Design System">
  <main class="token-shell" data-jun-ui-static-fallback>
    <header class="token-hero">
      <div class="hero-copy">
        <p class="eyebrow">Semi Design System · jun-ui delivery</p>
        <h1>Semi Token 控制台</h1>
        <p>直接使用 Semi 的全量 token 面和官方组件语义；jun-ui 只保留 file:// artifact、Builder、验证和交付布局变量。</p>
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
          <strong>Semi</strong>
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
      <button type="button" class="jui-button copy-all-button" data-copy-target="aiCopyBlock">复制 Semi token 面</button>
    </section>

${renderSemiUsageGuide()}

${renderTokenSections(registry)}

    <section class="token-section pattern-proof" id="pattern-proof">
      <div class="section-heading">
        <div>
          <p class="eyebrow">预览</p>
          <h2>模式预览</h2>
        </div>
        <p>用 Semi token 加 jun-ui 交付变量渲染一个紧凑的工作台片段。</p>
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
        <p>后续页面生成需要精确复用 Semi token 面和 jun-ui 交付变量时，复制这一段即可。</p>
      </div>
      <pre id="aiCopyBlock"><code>${escapeHtml(cssBlock)}</code></pre>
    </section>
  </main>
  <script src="./assets/tokens.js"></script>
</body>
</html>
`;
}

function renderTokenConsoleStyles({ deliveryRegistry, semiTokens }) {
  return `${renderSystemTokenCss({ deliveryRegistry, semiTokens })}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--semi-color-bg-0);
  color: var(--semi-color-text-0);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
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
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-primary);
  color: var(--semi-color-bg-1);
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
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
  box-shadow: 0 12px 32px var(--semi-color-shadow);
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
  color: var(--semi-color-text-2);
}

.eyebrow {
  margin: 0;
  font-size: 13px;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font-size: 28px;
  line-height: 1.18;
}

h2 {
  font-size: 18px;
  line-height: 1.25;
}

h3 {
  font-size: 18px;
  line-height: 1.25;
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
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-0);
}

.health-grid strong {
  font-size: 24px;
  line-height: 1.18;
}

.token-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--jun-ui-inline-gap);
  margin-top: var(--jun-ui-section-gap);
}

.token-nav a {
  color: var(--semi-color-text-0);
  text-decoration: none;
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
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
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
  color: var(--semi-color-text-0);
  padding: 0 var(--jun-ui-field-padding-inline);
}

.token-section {
  margin-top: calc(var(--jun-ui-section-gap) * 1.45);
}

.usage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--jun-ui-grid-gap);
}

.usage-grid article {
  display: grid;
  gap: var(--jun-ui-inline-gap);
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
  padding: var(--jun-ui-field-padding-inline);
}

.usage-grid p {
  color: var(--semi-color-text-2);
  font-size: 13px;
}

.usage-grid code {
  color: var(--semi-color-primary);
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
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
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
  color: var(--semi-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.token-card strong {
  line-height: 1.25;
}

.token-card p {
  font-size: 13px;
}

.token-copy-button {
  min-width: 58px;
  background: var(--semi-color-bg-0);
  color: var(--semi-color-text-0);
  border: 1px solid var(--semi-color-border);
}

.token-swatch,
.token-shape-sample,
.token-border-sample,
.token-shadow-sample,
.token-empty-sample {
  width: 50px;
  height: 50px;
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
}

.token-type-sample {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-0);
  overflow: hidden;
}

.token-lines {
  display: grid;
  align-content: center;
  width: 50px;
  height: 50px;
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-0);
  padding: 4px;
  font-size: 10px;
}

.token-spacing-track {
  width: 50px;
  height: 50px;
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-0);
  padding: 8px;
}

.token-spacing-track span {
  display: block;
  max-width: 100%;
  height: 100%;
  border-radius: 4px;
  background: var(--semi-color-primary);
}

.token-shadow-sample {
  box-shadow: 0 12px 32px var(--semi-color-shadow);
}

.proof-surface {
  display: grid;
  gap: var(--jun-ui-stack-gap);
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
  box-shadow: 0 12px 32px var(--semi-color-shadow);
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
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-0);
}

.proof-metrics strong {
  font-size: 24px;
  line-height: 1.18;
}

.proof-rows {
  display: grid;
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  overflow: hidden;
}

.proof-rows div {
  display: flex;
  justify-content: space-between;
  gap: var(--jun-ui-grid-gap);
  padding: var(--jun-ui-field-padding-block) var(--jun-ui-field-padding-inline);
  background: var(--semi-color-bg-1);
}

.proof-rows div + div {
  border-top: 1px solid var(--semi-color-border);
}

.ai-copy pre {
  margin: 0;
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--semi-color-border);
  border-radius: var(--semi-border-radius-medium);
  background: var(--semi-color-bg-1);
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

  .token-card {
    grid-template-columns: 50px minmax(0, 1fr);
  }

  .token-copy-button {
    grid-column: 1 / -1;
  }

  h1 {
    font-size: 24px;
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
    "react-markdown",
    "remark-gfm",
  ];
  return Object.fromEntries(
    packageNames.map((packageName) => [packageName, path.join(repoRoot, "node_modules", packageName)]),
  );
}

async function writeViteProject({ config, tempRoot }) {
  const srcDir = path.join(tempRoot, "src");
  const deliveryRegistry = await loadTokenRegistry();
  const semiTokens = await loadSemiTokenEntries();
  await mkdir(srcDir, { recursive: true });
  await writeFile(path.join(srcDir, "main.jsx"), renderReactSource(config), "utf8");
  await writeFile(path.join(srcDir, "styles.css"), renderStyles({ deliveryRegistry, semiTokens }), "utf8");
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
      projectRoot,
      strict: Boolean(flags.strict),
      scanArtifactCssColors: true,
    };
  }
  if (/\.html?$/i.test(targetPath)) {
    return {
      artifactDir: path.dirname(targetPath),
      outputFileName: path.basename(targetPath),
      sourceFiles: [],
      projectRoot,
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
    projectRoot,
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
  if (allowTokenDefinitions) prefixes.push("--semi-");
  if (allowReferenceDefinitions) prefixes.push("--ref-");
  const prefixPattern = `(?:${prefixes.map((prefix) => prefix.replaceAll("-", "\\-")).join("|")})`;
  return line.replace(new RegExp(`${prefixPattern}[\\w-]*\\s*:[^;}]*(?:;|$|(?=}))`, "gi"), "");
}

function stripCssPropertyNames(line) {
  return line.replace(/(^|[;{])\s*(?:--)?[a-zA-Z_-][\w-]*\s*:/g, "$1");
}

function stripTokenVariableColorUsages(line) {
  return line
    .replace(/\b(?:rgb|rgba|hsl|hsla|lab|lch|oklab|oklch)\s*\(\s*var\(--(?:semi|jun-ui|ref)-[\w-]+\)\s*(?:,[^)]*)?\)/gi, "")
    .replace(/var\(--(?:semi|jun-ui|ref)-[\w-]+(?:\s*,\s*[^)]*)?\)/gi, "");
}

function stripSemiVendorRules(text) {
  return text.replace(/[^{}]*\.semi-[^{]*\{[^{}]*\}/g, "");
}

function isTransparentHexColor(value) {
  const hex = value.toLowerCase();
  return hex === "#0000" || hex === "#00000000";
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
    const line = stripTokenVariableColorUsages(removeAllowedCustomPropertyColorDefinitions(originalLine, {
      allowTokenDefinitions,
      allowReferenceDefinitions,
    }));
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      const searchLine = pattern.label === "named" ? stripCssPropertyNames(line) : line;
      let match;
      while ((match = pattern.regex.exec(searchLine)) !== null) {
        if (pattern.label === "hex" && isTransparentHexColor(match[0])) continue;
        violations.push(`bare color ${match[0]} in ${fileLabel}:${index + 1}`);
        break;
      }
      if (violations.at(-1)?.endsWith(`${fileLabel}:${index + 1}`)) break;
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

// Hard gate: a page must consume the Design System, not fork it. Flag source CSS
// that redefines Semi tokens, jun-ui delivery variables, or .jui-stack / .jui-row
// layout utilities (these are provided by the builder; redefining them drifts
// the system).
function findSystemPrimitiveOverrides(text, fileLabel) {
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const violations = [];
  for (const [index, line] of withoutComments.split(/\r?\n/).entries()) {
    if (/(?:^|[;{]|\s)--semi-[\w-]+\s*:/.test(line)) {
      violations.push(`page CSS must consume Semi tokens via var(--semi-*), not redefine them, in ${fileLabel}:${index + 1}`);
    }
    if (/(?:^|[;{]|\s)--jun-ui-[\w-]+\s*:/.test(line)) {
      violations.push(`page CSS must consume jun-ui delivery variables via var(--jun-ui-*), not redefine them, in ${fileLabel}:${index + 1}`);
    }
    if (/(?:^|}|,)\s*\.jui-(?:stack|row)(?:--[\w-]+)?\s*[,{]/.test(line)) {
      violations.push(`page CSS must not redefine the jun-ui layout utility .jui-stack / .jui-row in ${fileLabel}:${index + 1}`);
    }
  }
  return violations;
}

function findProjectLocalVisualTokenDefinitions(text, fileLabel) {
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const violations = [];
  for (const [index, line] of withoutComments.split(/\r?\n/).entries()) {
    const propertyPattern = /(?:^|[;{])\s*(--[\w-]+)\s*:/g;
    let match;
    while ((match = propertyPattern.exec(line)) !== null) {
      const propertyName = match[1];
      if (propertyName.startsWith("--semi-") || propertyName.startsWith("--jun-ui-")) continue;
      violations.push(
        `project-local visual token definition "${propertyName}" in ${fileLabel}:${index + 1}; consume Semi --semi-* tokens and jun-ui delivery variables directly instead`,
      );
    }
  }
  return violations;
}

// Advisory (non-blocking): surface hand-rolled status-tag spans (class names
// ending in -pill / -chip) so they get migrated to the Semi Tag component
// instead of silently diverging from the Design System.
function findHandRolledTagAdvisories(text, fileLabel) {
  const advisories = [];
  const seen = new Set();
  const pattern = /class(?:Name)?\s*=\s*("|')([^"']*\b[\w-]+-(?:pill|chip)\b[^"']*)\1/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const className = match[2].trim();
    if (/\bsemi-/.test(className) || seen.has(className)) continue;
    seen.add(className);
    advisories.push(`hand-rolled status tag "${className}" — use the Semi Tag component in ${fileLabel}`);
  }
  return advisories;
}

// Advisory (non-blocking): surface CSS rules that bound height and also set
// overflow hidden — the delivery contract's clipped-scroll-region gate.
// Static analysis cannot tell a content region from a decorative crop
// (thumbnail, avatar, image mask), so this surfaces candidates for review
// instead of blocking the build.
function findClippedScrollAdvisories(text, fileLabel) {
  const advisories = [];
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(withoutComments)) !== null) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    const body = match[2];
    if (!/overflow(?:-y)?\s*:\s*hidden/.test(body)) continue;
    if (!/(?:^|[;\s])(?:max-)?height\s*:\s*(?!auto\b|none\b|fit-content\b|min-content\b|max-content\b)/.test(body)) {
      continue;
    }
    advisories.push(
      `height-bounded rule "${selector}" hides overflow — a content region must scroll (jui-scroll-y); keep hidden only for decorative crops, in ${fileLabel}`,
    );
  }
  return advisories;
}

// Advisory (non-blocking): surface viewport-bound max-height rules in source
// CSS — the signature of an inner scroller nested inside an already-scrolling
// surface (sheet/modal body). The contract allows one scroll region per
// surface; pinned actions belong in the component's footer slot instead.
function findNestedScrollAdvisories(text, fileLabel) {
  const advisories = [];
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(withoutComments)) !== null) {
    if (!/max-height\s*:\s*[^;}]*[\d.]vh/.test(match[2])) continue;
    const selector = match[1].trim().replace(/\s+/g, " ");
    advisories.push(
      `viewport-bound max-height on "${selector}" — usually an inner scroller; keep one scroll region per surface and pin actions with the component footer slot (e.g. SideSheet footer), in ${fileLabel}`,
    );
  }
  return advisories;
}

// Advisory (non-blocking): surface hardcoded corner radii in source CSS.
// Radius comes from Semi tokens; literal values drift from the system. Allowed
// idioms: token/alias consumption (var/calc), 0,
// 50% circles, and 999px/9999px pills — none of those re-create Semi
// defaults by hand.
function findHardcodedRadiusAdvisories(text, fileLabel) {
  const advisories = [];
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(withoutComments)) !== null) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    const declPattern = /border(?:-[a-z]+)*-radius\s*:\s*([^;}]+)/g;
    let decl;
    while ((decl = declPattern.exec(match[2])) !== null) {
      const value = decl[1].trim();
      if (/var\(/.test(value)) continue;
      if (/^(0|50%|9{3,4}px|inherit|initial|unset)$/.test(value)) continue;
      advisories.push(
        `hardcoded corner radius "${value}" on "${selector}" — consume var(--semi-border-radius-medium) (or a local alias) instead, in ${fileLabel}`,
      );
    }
  }
  return advisories;
}

// Advisory (non-blocking, aggregated per file): surface ad-hoc flex+gap
// rules using literal gaps. The contract prefers jui-stack / jui-row (or at
// least token-driven gap values) so page rhythm stays system-owned. Existing
// pages can carry many of these, so report one summary line per file instead
// of one line per rule.
function findAdHocFlexGapAdvisories(text, fileLabel) {
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  const selectors = [];
  let match;
  while ((match = rulePattern.exec(withoutComments)) !== null) {
    const body = match[2];
    if (!/display\s*:\s*(?:inline-)?flex/.test(body)) continue;
    if (!/(?:^|[;\s])gap\s*:\s*[\d.]+(?:px|rem|em)/.test(body)) continue;
    selectors.push(match[1].trim().replace(/\s+/g, " "));
  }
  if (selectors.length === 0) return [];
  const sample = selectors.slice(0, 3).map((selector) => `"${selector}"`).join(", ");
  return [
    `${selectors.length} ad-hoc flex+gap rule(s) with literal gaps (e.g. ${sample}) — prefer jui-stack / jui-row or token-driven gap values, in ${fileLabel}`,
  ];
}

// Advisory (non-blocking): scan cards need enough inline space for a title,
// one-line summary, metadata, and a small action without forcing text or
// buttons outside the card. A selector with both card + grid is a strong
// enough signal to surface undersized minmax() columns for review.
function findCrampedScanCardGridAdvisories(text, fileLabel) {
  const advisories = [];
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(withoutComments)) !== null) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    if (!/card/i.test(selector) || !/grid/i.test(selector)) continue;
    const body = match[2];
    if (!/display\s*:\s*grid/.test(body)) continue;
    const columns = body.match(/grid-template-columns\s*:\s*([^;}]+)/)?.[1]?.trim();
    if (!columns) continue;

    const pxValues = Array.from(columns.matchAll(/minmax\(\s*(?:min\(\s*100%\s*,\s*)?([\d.]+)px/g)).map(
      (value) => Number(value[1]),
    );
    const hasZeroMin = /minmax\(\s*0\s*,/.test(columns);
    const hasNarrowMin = pxValues.some((value) => Number.isFinite(value) && value < 320);
    if (!hasZeroMin && !hasNarrowMin) continue;

    advisories.push(
      `scan card grid "${selector}" uses cramped columns (${columns}) — use a min column around 320-360px such as minmax(min(100%, 340px), 1fr), and verify card text/actions do not overflow, in ${fileLabel}`,
    );
  }
  return advisories;
}

// Advisory (non-blocking): the affordance hierarchy allows one solid primary
// action per view/section. A file is a coarse proxy for a view, so more than
// one solid primary Button in one source file is surfaced for review rather
// than blocked — multi-view files can be legitimate.
function findMultiplePrimaryAdvisories(text, fileLabel) {
  const tags = text.match(/<Button\b[^>]*>/g) ?? [];
  const solidPrimaries = tags.filter(
    (tag) => /theme\s*=\s*["']solid["']/.test(tag) && /type\s*=\s*["']primary["']/.test(tag),
  );
  if (solidPrimaries.length <= 1) return [];
  return [
    `${solidPrimaries.length} solid primary Buttons in one file — the affordance hierarchy allows one per view/section; demote extras or confirm they sit in separate views, in ${fileLabel}`,
  ];
}

async function verifyPage(argv) {
  const { artifactDir, outputFileName, sourceFiles, projectRoot, strict, scanArtifactCssColors } = await resolveVerifyTarget(argv);
  const htmlPath = path.join(artifactDir, outputFileName);
  const html = await readFile(htmlPath, "utf8");
  const artifactFiles = await listFilesRecursive(artifactDir);
  const cssFiles = artifactFiles.filter((file) => file.endsWith(".css")).sort();
  const cssBodies = [];
  for (const cssFile of cssFiles) {
    cssBodies.push([cssFile, await readFile(cssFile, "utf8")]);
  }
  const errors = [];
  const advisories = [];
  const isTokenConsole = html.includes("data-jun-ui-token-console");

  if (strict && projectRoot && !isPathInside(repoRoot, projectRoot)) {
    const adoptionCheck = await checkAdoptionDecisionGate(projectRoot);
    if (!adoptionCheck.ok) {
      errors.push(`adoption decision gate: ${adoptionCheck.detail}`);
    }
  }

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
  if (!combinedArtifactText.includes("--semi-")) {
    errors.push("artifact must use Semi Design System tokens");
  }
  if (!hasSemiTokenDefinitions(combinedArtifactText)) {
    errors.push("artifact must define Semi Design System tokens");
  }
  if (/var\(\s*--jun-ui-[\w-]+/.test(combinedArtifactText) && !hasDeliveryTokenDefinitions(combinedArtifactText)) {
    errors.push("artifact uses jun-ui delivery variables but does not define the jun-ui delivery token layer");
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
          advisories.push(...findHandRolledTagAdvisories(body, relativeSource));
        }
        if (sourceFile.endsWith(".css")) {
          errors.push(
            ...findBareColorViolations(body, relativeSource, {
              allowTokenDefinitions: false,
              allowReferenceDefinitions: false,
            }),
          );
          errors.push(...findSystemPrimitiveOverrides(body, relativeSource));
          errors.push(...findProjectLocalVisualTokenDefinitions(body, relativeSource));
          advisories.push(...findClippedScrollAdvisories(body, relativeSource));
          advisories.push(...findNestedScrollAdvisories(body, relativeSource));
          advisories.push(...findHardcodedRadiusAdvisories(body, relativeSource));
          advisories.push(...findAdHocFlexGapAdvisories(body, relativeSource));
          advisories.push(...findCrampedScanCardGridAdvisories(body, relativeSource));
        }
        if (/\.(?:mjs|js|jsx|ts|tsx)$/i.test(sourceFile)) {
          errors.push(...findNativeControlContractViolations(body, relativeSource));
          advisories.push(...findHandRolledTagAdvisories(body, relativeSource));
          advisories.push(...findMultiplePrimaryAdvisories(body, relativeSource));
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
            ...findBareColorViolations(stripSemiVendorRules(body), path.relative(process.cwd(), cssFile) || cssFile, {
              allowTokenDefinitions: true,
              allowReferenceDefinitions: isTokenConsole,
            }),
          );
        }
      }
    }
  }

  if (advisories.length > 0) {
    console.warn(
      `jun-ui DS advisories (${advisories.length}, non-blocking):\n${advisories.map((advisory) => `- ${advisory}`).join("\n")}`,
    );
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
  const deliveryRegistry = await loadTokenRegistry();
  const semiTokens = await loadSemiTokenEntries();
  await mkdir(outDir, { recursive: true });
  await rm(path.join(outDir, "index.html"), { force: true });
  await rm(assetsDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });
  await writeFile(path.join(outDir, "index.html"), renderTokenConsoleHtml({ deliveryRegistry, semiTokens }), "utf8");
  await writeFile(path.join(assetsDir, "tokens.css"), renderTokenConsoleStyles({ deliveryRegistry, semiTokens }), "utf8");
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
  if (flags["consumer-root"]) {
    checks.push(await checkConsumerProjectContract(path.resolve(String(flags["consumer-root"]))));
  }
  if (flags["adoption-root"]) {
    checks.push(await checkAdoptionDecisionGate(path.resolve(String(flags["adoption-root"]))));
  }
  for (const check of checks) {
    console.log(`${check.ok ? "ok" : "missing"} ${check.name}: ${check.detail}`);
  }
  if (flags.strict && checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

const consumerInstructionFiles = [
  "AGENTS.md",
  ".codex/AGENTS.md",
  ".agents/AGENTS.md",
  ".claude/CLAUDE.md",
  "CLAUDE.md",
];

const consumerContractTerms = [
  {
    id: "jun-ui-design-system",
    label: "jun-ui-design-system Skill routing",
    matches: (body) => /\buse\s+(?:the\s+)?`?jun-ui-design-system`?\b/i.test(body) || /必须.*jun-ui-design-system/i.test(body),
  },
  {
    id: "Semi Design System",
    label: "Semi Design System usage",
    matches: (body) => /\buse\s+Semi Design System\b/i.test(body) || /必须.*Semi Design System/i.test(body) || /Semi UI/i.test(body),
  },
  {
    id: "verify-page --strict",
    label: "strict verify-page postflight",
    matches: (body) => body.includes("verify-page") && body.includes("--strict"),
  },
  {
    id: "project-local visual token",
    label: "no project-local visual tokens",
    matches: (body) =>
      /\bdo not define project-local visual tokens\b/i.test(body) ||
      /\bforbid[^\n.]*project-local visual token/i.test(body) ||
      /不得[^\n。]*project-local visual token/i.test(body) ||
      /禁止[^\n。]*project-local visual token/i.test(body) ||
      body.includes("不得在项目 CSS 中定义 `project-local visual token`"),
  },
];

function parseActiveAdoptionDecisions(body) {
  const decisions = [];
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]\s*)?jun-ui adoption decision\s*:\s*(adopted|deferred|not-suitable|not suitable)\s*$/i);
    if (!match) continue;
    decisions.push(match[1].toLowerCase().replace(" ", "-"));
  }
  return [...new Set(decisions)];
}

async function readConsumerInstructionSet(consumerRoot) {
  const bodies = [];
  const foundFiles = [];
  for (const relativeFile of consumerInstructionFiles) {
    const absoluteFile = path.join(consumerRoot, relativeFile);
    if (!(await exists(absoluteFile))) continue;
    foundFiles.push(relativeFile);
    bodies.push(await readFile(absoluteFile, "utf8"));
  }
  return {
    foundFiles,
    combined: bodies.join("\n"),
  };
}

async function checkConsumerProjectContract(consumerRoot) {
  const { foundFiles, combined } = await readConsumerInstructionSet(consumerRoot);
  if (!foundFiles.length) {
    return {
      name: "consumer project contract",
      ok: false,
      detail: `${consumerRoot} has no agent instruction file (${consumerInstructionFiles.join(", ")})`,
    };
  }
  const activeDecisions = parseActiveAdoptionDecisions(combined);
  if (activeDecisions.length !== 1 || activeDecisions[0] !== "adopted") {
    return {
      name: "consumer project contract",
      ok: false,
      detail: activeDecisions.length === 0
        ? `${consumerRoot} missing active line "jun-ui adoption decision: adopted" in ${foundFiles.join(", ")}`
        : `${consumerRoot} has active jun-ui adoption decision ${activeDecisions.join(", ")}; expected adopted in ${foundFiles.join(", ")}`,
    };
  }
  const missing = consumerContractTerms
    .filter((term) => !term.matches(combined))
    .map((term) => `${term.id} (${term.label})`);
  return {
    name: "consumer project contract",
    ok: missing.length === 0,
    detail: missing.length
      ? `${consumerRoot} missing ${missing.join(", ")} in ${foundFiles.join(", ")}`
      : `${consumerRoot} via ${foundFiles.join(", ")}`,
  };
}

async function checkAdoptionDecisionGate(consumerRoot) {
  const { foundFiles, combined } = await readConsumerInstructionSet(consumerRoot);
  if (!foundFiles.length) {
    return {
      name: "adoption decision gate",
      ok: false,
      detail: `${consumerRoot} has no agent instruction file (${consumerInstructionFiles.join(", ")})`,
    };
  }

  if (!combined.toLowerCase().includes("jun-ui adoption decision")) {
    return {
      name: "adoption decision gate",
      ok: false,
      detail: `${consumerRoot} missing jun-ui adoption decision in ${foundFiles.join(", ")}`,
    };
  }

  const activeDecisions = parseActiveAdoptionDecisions(combined);
  if (activeDecisions.length !== 1) {
    return {
      name: "adoption decision gate",
      ok: false,
      detail: activeDecisions.length === 0
        ? `${consumerRoot} has jun-ui adoption decision text but no supported active decision line in ${foundFiles.join(", ")}`
        : `${consumerRoot} has conflicting active jun-ui adoption decisions ${activeDecisions.join(", ")} in ${foundFiles.join(", ")}`,
    };
  }
  const decision = activeDecisions[0];
  const adopted = decision === "adopted";
  const deferred = decision === "deferred";
  const notSuitable = decision === "not-suitable";

  if (adopted) {
    const consumerCheck = await checkConsumerProjectContract(consumerRoot);
    return {
      name: "adoption decision gate",
      ok: consumerCheck.ok,
      detail: consumerCheck.ok
        ? `${consumerRoot} adopted via ${foundFiles.join(", ")}`
        : `${consumerRoot} says jun-ui adoption decision: adopted, but ${consumerCheck.detail}`,
    };
  }

  if (deferred || notSuitable) {
    const missing = [];
    if (!/\breason\s*:/i.test(combined) && !combined.includes("原因")) missing.push("Reason");
    if (!/\breopen path\s*:/i.test(combined) && !combined.includes("重新启用")) missing.push("Reopen path");
    return {
      name: "adoption decision gate",
      ok: missing.length === 0,
      detail: missing.length
        ? `${consumerRoot} missing ${missing.join(", ")} for jun-ui adoption decision in ${foundFiles.join(", ")}`
        : `${consumerRoot} recorded ${decision} via ${foundFiles.join(", ")}`,
    };
  }

  return {
    name: "adoption decision gate",
    ok: false,
    detail: `${consumerRoot} has unsupported jun-ui adoption decision ${decision} in ${foundFiles.join(", ")}`,
  };
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
