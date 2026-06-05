#!/usr/bin/env node
import react from "@vitejs/plugin-react";
import { build as viteBuild } from "vite";
import { access, cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
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
    "  jun-ui doctor [--strict]",
    "",
    "The build command writes a file-openable artifact with relative assets.",
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
${renderStaticActions(actions)}
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

function renderStaticItems(items) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return '            <li class="jun-ui-muted">No items configured.</li>';
  }
  return safeItems.map((item) => `            <li>${escapeHtml(item)}</li>`).join("\n");
}

function renderStaticActions(actions) {
  if (!actions.length) return "";
  return `      <section class="jun-ui-stack" data-jun-ui-actions aria-label="Actions">
        <div>
          <h2>Actions</h2>
          <p class="jun-ui-muted">Copy an action prompt and send it to the expected Codex thread.</p>
        </div>
        <div class="jun-ui-action-grid">
${actions.map((action) => renderStaticAction(action)).join("\n")}
        </div>
        <textarea id="promptOutput" class="jun-ui-prompt-output" readonly placeholder="Choose an action to generate a prompt."></textarea>
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
            <button type="button" data-prompt="${prompt}" data-send-to="${sendTo}" data-action-id="${actionId}">复制指令</button>
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
            <h2>Actions</h2>
            <p className="jun-ui-muted">Copy an action prompt and send it to the expected Codex thread.</p>
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
            className="jun-ui-prompt-output"
            readOnly
            value={prompt}
            placeholder="Choose an action to generate a prompt."
          />
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

function renderStyles() {
  return `:root {
  color-scheme: light;
  --jun-ui-bg: #f5f6f8;
  --jun-ui-panel: #ffffff;
  --jun-ui-ink: #1f2329;
  --jun-ui-muted: #646a73;
  --jun-ui-line: #d8dde6;
  --jun-ui-accent: #1a66ff;
  --jun-ui-radius: 8px;
  --jun-ui-shadow: 0 12px 32px rgba(31, 35, 41, 0.08);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--jun-ui-bg);
  color: var(--jun-ui-ink);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
  letter-spacing: 0;
}

.jun-ui-shell {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 20px 56px;
}

.jun-ui-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 22px;
  border: 1px solid var(--jun-ui-line);
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
  gap: 6px;
  color: var(--jun-ui-muted);
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
  color: var(--jun-ui-muted);
  font-size: 13px;
}

.jun-ui-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.jun-ui-stack {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.jun-ui-card strong {
  display: block;
  margin-top: 5px;
  font-size: 24px;
  line-height: 1.12;
}

.jun-ui-section ul {
  margin: 12px 0 0;
  padding-left: 18px;
}

.jun-ui-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.jun-ui-action-card {
  display: grid;
  gap: 10px;
  align-content: start;
  border-top: 4px solid var(--jun-ui-line);
}

.jun-ui-action-card.primary {
  border-top-color: var(--jun-ui-accent);
}

.jun-ui-action-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.jun-ui-action-card button {
  width: 100%;
}

.jun-ui-prompt-output {
  width: 100%;
  min-height: 96px;
  resize: vertical;
  border: 1px solid var(--jun-ui-line);
  border-radius: var(--jun-ui-radius);
  background: var(--jun-ui-panel);
  color: var(--jun-ui-ink);
  padding: 10px 12px;
  font: inherit;
  line-height: 1.45;
}

footer {
  margin-top: 18px;
}

@media (max-width: 720px) {
  .jun-ui-shell {
    padding: 18px 12px 40px;
  }

  .jun-ui-header {
    display: grid;
  }

  h1 {
    font-size: 24px;
  }
}
`;
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
  await mkdir(srcDir, { recursive: true });
  await writeFile(path.join(srcDir, "main.jsx"), renderReactSource(config), "utf8");
  await writeFile(path.join(srcDir, "styles.css"), renderStyles(), "utf8");
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
    const cssFiles = builtFiles.filter((file) => file.endsWith(".css")).sort();
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
