import { execFile, spawn } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const root = process.cwd();
const execFileAsync = promisify(execFile);

function waitForRuntimeReady(child) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      reject(new Error(`runtime example did not become ready:\n${output}`));
    }, 30000);
    const cleanup = () => {
      clearTimeout(timer);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("exit", onExit);
      child.off("error", onError);
    };
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/Runtime example ready (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) {
        cleanup();
        resolve({ url: match[1], output });
      }
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`runtime example exited before ready with code ${code}:\n${output}`));
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", onExit);
    child.on("error", onError);
  });
}

async function stopRuntime(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 3000).unref();
  });
}

const requiredFiles = [
  "README.md",
  "AGENTS.md",
  "LICENSE",
  "package.json",
  "docs/builder.md",
  "docs/context7.md",
  "docs/delivery-lanes.md",
  "docs/design-system.md",
  "docs/problem-and-solution.md",
  "docs/prompts/2026-06-08-dual-lane-long-task.md",
  "scripts/jun-ui.mjs",
  "examples/static-artifact/README.md",
  "examples/static-artifact/jun-ui.page.json",
  "examples/runtime-app/README.md",
  "examples/runtime-app/index.html",
  "examples/runtime-app/server.mjs",
  "examples/runtime-app/src/main.jsx",
  "examples/runtime-app/src/styles.css",
  "skills/jun-ui-page-delivery/SKILL.md",
  "skills/jun-ui-page-delivery/references/builder-contract.md",
  "skills/jun-ui-page-delivery/references/delivery-contract.md",
  "templates/workbench/jun-ui.page.json",
  "templates/project-redesigns/five-project-redesign.manifest.json",
  "templates/project-redesigns/bundle-app-redesign-starter/README.md",
  "templates/project-redesigns/bundle-app-redesign-starter/shell.html",
  "templates/project-redesigns/bundle-app-redesign-starter/styles.css",
  "templates/project-redesigns/bundle-app-redesign-starter/app.jsx",
];

const removedFiles = [
  "jun-ui.css",
  "jun-ui.js",
  "vendor/spectrum.html",
  "examples/dashboard.html",
  "examples/form.html",
  "examples/detail.html",
  "docs/static-ui-decision-context.md",
  "docs/superpowers/specs/2026-06-04-jun-ui-design.md",
  "docs/superpowers/plans/2026-06-04-jun-ui-implementation.md",
  "skills/jun-ui-static-pages/SKILL.md",
  "skills/jun-ui-static-pages/references/usage-patterns.md",
];

const userFacingFiles = [
  "README.md",
  "AGENTS.md",
  "docs/builder.md",
  "docs/context7.md",
  "docs/delivery-lanes.md",
  "docs/design-system.md",
  "docs/problem-and-solution.md",
  "skills/jun-ui-page-delivery/SKILL.md",
  "skills/jun-ui-page-delivery/references/builder-contract.md",
  "skills/jun-ui-page-delivery/references/delivery-contract.md",
];

const requiredTerms = [
  "Semi Design System",
  "Context7",
  "Figma",
  "file://",
  "file-openable",
  "installable",
  "Builder",
];

const requiredCombinedTerms = [
  "Context7 CLI + Skills",
  "ctx7",
  "MCP is optional",
  "Stop before Semi implementation",
  "jun-ui build",
  "target project",
  "context7-docs",
  "context7-cli",
  "jun-ui doctor --strict",
  "fileName",
  "assetsDir",
  "actions",
  "bundle-app",
  "verify-page",
  "static artifact",
  "runtime app",
  "delivery lanes",
  "server-backed",
];

const requiredTokenGroups = ["color", "type", "spacing", "radius", "border", "shadow"];

const requiredBuilderTokens = [
  "--jun-ui-bg",
  "--jun-ui-panel",
  "--jun-ui-ink",
  "--jun-ui-muted",
  "--jun-ui-line",
  "--jun-ui-accent",
  "--jun-ui-radius",
  "--jun-ui-shadow",
];

const projectRedesignStarterDir = path.join(root, "templates/project-redesigns/bundle-app-redesign-starter");
const projectRedesignConfigNames = [
  "ai-radar-workbench.jun-ui.bundle.json",
  "personal-ops-today.jun-ui.bundle.json",
  "flowforge-cockpit.jun-ui.bundle.json",
  "flowforge-content-workspace.jun-ui.bundle.json",
  "macroPulse-macro-desk.jun-ui.bundle.json",
  "dubforge-workbench.jun-ui.bundle.json",
];
const projectRedesignExpectedConfigs = new Map([
  ["ai-radar-workbench.jun-ui.bundle.json", { type: "ai-radar-redesign", out: "app/workbench", fileName: "index.html" }],
  ["personal-ops-today.jun-ui.bundle.json", { type: "personal-ops-redesign", out: "site", fileName: "today.html" }],
  ["flowforge-cockpit.jun-ui.bundle.json", { type: "flowforge-redesign", out: "app/static", fileName: "index.html" }],
  [
    "flowforge-content-workspace.jun-ui.bundle.json",
    { type: "flowforge-content-redesign", out: "app/static", fileName: "content-workspace-prototype.html" },
  ],
  ["macroPulse-macro-desk.jun-ui.bundle.json", { type: "macropulse-redesign", out: "site", fileName: "macro-desk.html" }],
  ["dubforge-workbench.jun-ui.bundle.json", { type: "dubforge-redesign", out: "frontend/jun-ui-workbench", fileName: "index.html" }],
]);

const staleTerms = [
  "Spectrum Web Components",
  "Web Awesome",
  "Bootstrap",
  "no-build",
  "jun-ui.css",
  "jun-ui.js",
  "jun-ui-static-pages",
  "static-ui-decision-context",
  "when it is available",
  "another primary documentation source",
  "official Semi documentation",
  "working examples",
  "minimal file-openable renderer",
  "smoke renderer",
];

const errors = [];

async function fileExists(file) {
  try {
    const filePath = path.isAbsolute(file) ? file : path.join(root, file);
    await lstat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function text(file) {
  return readFile(path.join(root, file), "utf8");
}

async function requireFile(file) {
  try {
    return await text(file);
  } catch {
    errors.push(`missing required file: ${file}`);
    return "";
  }
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

function findBareColorViolations(body, fileLabel, options = {}) {
  const {
    allowTokenDefinitions = false,
    allowReferenceDefinitions = false,
    includeNamedColors = true,
  } = options;
  const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, "");
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

function containsNativeControl(body) {
  return /<\s*(?:button|input|textarea|select)\b/i.test(body);
}

function hasNativeControlReset(body) {
  return /appearance\s*:\s*none/i.test(body);
}

for (const file of requiredFiles) {
  await requireFile(file);
}

for (const file of removedFiles) {
  if (await fileExists(file)) {
    errors.push(`removed legacy file still exists: ${file}`);
  }
}

const packageJson = JSON.parse(await requireFile("package.json"));
for (const term of ["ai-page-delivery", "semi-design", "context7", "figma", "file-openable", "runtime-app"]) {
  if (!JSON.stringify(packageJson).includes(term)) {
    errors.push(`package.json missing ${term}`);
  }
}
for (const dependency of [
  "@douyinfe/semi-icons",
  "@douyinfe/semi-ui",
  "@vitejs/plugin-react",
  "vite",
  "react",
  "react-dom",
]) {
  if (!packageJson.dependencies?.[dependency]) {
    errors.push(`package.json missing builder dependency ${dependency}`);
  }
}
if (packageJson.bin?.["jun-ui"] !== "scripts/jun-ui.mjs") {
  errors.push("package.json must expose the jun-ui builder bin");
}
if (!packageJson.scripts?.["build:page"]?.includes("scripts/jun-ui.mjs build")) {
  errors.push("package.json must expose a build:page script using jun-ui build");
}

let combinedUserFacingText = "";
for (const file of userFacingFiles) {
  const body = await requireFile(file);
  combinedUserFacingText += `\n${body}`;
  for (const term of requiredTerms) {
    if (term !== "file-openable" && !body.includes(term)) {
      errors.push(`${file} missing ${term}`);
    }
  }
  for (const term of staleTerms) {
    if (body.includes(term)) {
      errors.push(`${file} contains stale term ${term}`);
    }
  }
}

if (!combinedUserFacingText.includes("file-openable")) {
  errors.push("user-facing docs missing file-openable");
}

for (const term of requiredCombinedTerms) {
  if (!combinedUserFacingText.includes(term)) {
    errors.push(`user-facing docs missing ${term}`);
  }
}

const skill = await requireFile("skills/jun-ui-page-delivery/SKILL.md");
if (!skill.includes("name: jun-ui-page-delivery")) {
  errors.push("page delivery skill must use the jun-ui-page-delivery name");
}
if (!skill.includes("Use when") || !skill.includes("Semi Design System")) {
  errors.push("page delivery skill description must include concrete Semi page triggers");
}
if (!skill.includes("jun-ui build")) {
  errors.push("page delivery skill must route page work through jun-ui build");
}
if (!skill.includes("verify-page")) {
  errors.push("page delivery skill must require verify-page postflight validation");
}
if (!skill.includes("Lane Routing") || !skill.includes("runtime app")) {
  errors.push("page delivery skill must route static artifact and runtime app lanes");
}

const builderScript = await requireFile("scripts/jun-ui.mjs");
if (!builderScript.includes("ensureBundleTokenCss")) {
  errors.push("builder script must inject jun-ui token CSS into bundle-app artifacts");
}
if (!builderScript.includes("alias: dependencyAliases()")) {
  errors.push("bundle-app must resolve React and Semi from the centralized Builder dependencies");
}

const redesignManifestBody = await requireFile("templates/project-redesigns/five-project-redesign.manifest.json");
try {
  const redesignManifest = JSON.parse(redesignManifestBody);
  const projectIds = new Set((redesignManifest.projects || []).map((project) => project.id));
  for (const projectId of ["ai-radar", "personal-ops", "flowforge", "macroPulse", "dubforge"]) {
    if (!projectIds.has(projectId)) {
      errors.push(`five-project redesign manifest missing ${projectId}`);
    }
  }
  if (!JSON.stringify(redesignManifest).includes("bundle-app-redesign-starter")) {
    errors.push("five-project redesign manifest must reference the bundle-app redesign starter");
  }
} catch (error) {
  errors.push(`five-project redesign manifest must be valid JSON: ${error.message}`);
}

const redesignShell = await requireFile("templates/project-redesigns/bundle-app-redesign-starter/shell.html");
const redesignStyles = await requireFile("templates/project-redesigns/bundle-app-redesign-starter/styles.css");
const redesignEntry = await requireFile("templates/project-redesigns/bundle-app-redesign-starter/app.jsx");
if (!redesignShell.includes("data-jun-ui-static-fallback")) {
  errors.push("project redesign starter shell must include visible static fallback content");
}
if (!redesignShell.includes("<!-- jun-ui:styles -->") || !redesignShell.includes("<!-- jun-ui:scripts -->")) {
  errors.push("project redesign starter shell must include bundle-app asset placeholders");
}
errors.push(
  ...findInlineStyleColorViolations(redesignShell, "templates/project-redesigns/bundle-app-redesign-starter/shell.html", {
    allowReferenceDefinitions: false,
  }),
);
errors.push(
  ...findBareColorViolations(redesignStyles, "templates/project-redesigns/bundle-app-redesign-starter/styles.css", {
    allowTokenDefinitions: false,
    allowReferenceDefinitions: false,
  }),
);
for (const expected of [
  "@douyinfe/semi-ui",
  "@douyinfe/semi-icons",
  "profileForPage",
  "ai-radar-redesign",
  "personal-ops-redesign",
  "flowforge-redesign",
  "flowforge-content-redesign",
  "macropulse-redesign",
  "dubforge-redesign",
]) {
  if (!redesignEntry.includes(expected)) {
    errors.push(`project redesign starter entry missing ${expected}`);
  }
}
for (const configName of projectRedesignConfigNames) {
  const configPath = `templates/project-redesigns/bundle-app-redesign-starter/configs/${configName}`;
  const configBody = await requireFile(configPath);
  let config = {};
  try {
    config = JSON.parse(configBody);
  } catch (error) {
    errors.push(`${configPath} must be valid JSON: ${error.message}`);
    continue;
  }
  const expected = projectRedesignExpectedConfigs.get(configName);
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (config[field] !== expectedValue) {
      errors.push(`${configPath} must set ${field} to ${expectedValue}`);
    }
  }
  if (config.app?.html !== "shell.html" || config.app?.entry !== "app.jsx") {
    errors.push(`${configPath} must point to the shared starter shell and app entry`);
  }
  if (!Array.isArray(config.app?.styles) || !config.app.styles.includes("styles.css")) {
    errors.push(`${configPath} must include the shared starter styles`);
  }
  if (!config.assetsDir || config.assetsDir.includes("..")) {
    errors.push(`${configPath} must set a safe relative assetsDir`);
  }
}

const tokenRegistryBody = await requireFile("tokens/jun-ui.tokens.json");
let tokenRegistry = {};
try {
  tokenRegistry = JSON.parse(tokenRegistryBody);
} catch (error) {
  errors.push(`token registry must be valid JSON: ${error.message}`);
}
const tokenEntries = Array.isArray(tokenRegistry.tokens) ? tokenRegistry.tokens : [];
if (tokenEntries.length === 0) {
  errors.push("token registry must include a non-empty tokens array");
}
const tokenNames = new Set();
const tokenGroups = new Set();
for (const token of tokenEntries) {
  for (const field of ["name", "value", "group", "role", "usage"]) {
    if (typeof token[field] !== "string" || token[field].trim() === "") {
      errors.push(`token entry ${JSON.stringify(token.name || token)} missing ${field}`);
    }
  }
  if (token.name) {
    if (tokenNames.has(token.name)) {
      errors.push(`duplicate token name: ${token.name}`);
    }
    tokenNames.add(token.name);
  }
  if (token.group) {
    tokenGroups.add(token.group);
  }
}
for (const group of requiredTokenGroups) {
  if (!tokenGroups.has(group)) {
    errors.push(`token registry missing ${group} group`);
  }
}
for (const tokenName of requiredBuilderTokens) {
  if (!tokenNames.has(tokenName)) {
    errors.push(`token registry missing required Builder token ${tokenName}`);
  }
}
const requiredPolarisBaselineTokens = new Map([
  ["--jun-ui-bg", "#F6F6F7"],
  ["--jun-ui-panel", "#FFFFFF"],
  ["--jun-ui-ink", "#202223"],
  ["--jun-ui-muted", "#6D7175"],
  ["--jun-ui-line", "#D2D5D8"],
  ["--jun-ui-accent", "#2C6ECB"],
]);
for (const [tokenName, expectedValue] of requiredPolarisBaselineTokens) {
  const token = tokenEntries.find((entry) => entry.name === tokenName);
  if (token?.value !== expectedValue) {
    errors.push(`token registry ${tokenName} must use Polaris-like baseline ${expectedValue}`);
  }
}

let tokenSmokeDir;
try {
  tokenSmokeDir = await mkdtemp(path.join(tmpdir(), "jun-ui-token-smoke-"));
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "tokens",
    "--out",
    tokenSmokeDir,
  ]);
  const tokenHtml = await readFile(path.join(tokenSmokeDir, "index.html"), "utf8");
  if (!tokenHtml.includes("<!doctype html>") || !tokenHtml.includes("data-jun-ui-token-console")) {
    errors.push("token console smoke output must be a file-openable token console artifact");
  }
  if (!tokenHtml.includes("data-jun-ui-static-fallback")) {
    errors.push("token console smoke output must include static fallback content");
  }
  if (!tokenHtml.includes("./assets/")) {
    errors.push("token console smoke output must reference relative ./assets/ paths");
  }
  if (tokenHtml.includes('type="module"')) {
    errors.push("token console smoke output must not require module scripts for file:// rendering");
  }
  if (!tokenHtml.includes("file://")) {
    errors.push("token console smoke output must state file:// as the repository artifact target");
  }
  if (
    tokenHtml.includes('href="/') ||
    tokenHtml.includes('src="/') ||
    tokenHtml.includes('href="file://') ||
    tokenHtml.includes('src="file://')
  ) {
    errors.push("token console smoke output must not include absolute asset paths");
  }
  for (const expected of [
    "--jun-ui-bg",
    "--jun-ui-accent",
    "Token 控制台",
    "AI 复制块",
    "模式预览",
    "筛选",
    "参考风格对比",
    "应用场景对比",
    "同一页面真实片段",
    "侧边导航",
    "任务表格",
    "状态标签",
    "筛选表单",
    "趋势图表",
    "推荐基准",
    "当前默认 token 已采用 Polaris-like",
    "Polaris-like",
    "Primer-like",
    "Spectrum-like",
    "Atlassian-like",
  ]) {
    if (!tokenHtml.includes(expected)) {
      errors.push(`token console smoke output missing ${expected}`);
    }
  }
  const tokenAssets = await readdir(path.join(tokenSmokeDir, "assets"));
  if (!tokenAssets.some((asset) => asset.endsWith(".css"))) {
    errors.push("token console smoke output must include a CSS asset");
  }
  if (!tokenAssets.some((asset) => asset.endsWith(".js"))) {
    errors.push("token console smoke output must include a JavaScript asset");
  }
  if (!stdout.includes("Generated token console")) {
    errors.push("token console command must report a generated artifact");
  }
} catch (error) {
  errors.push(`token console smoke failed: ${error.message}`);
} finally {
  if (tokenSmokeDir) {
    await rm(tokenSmokeDir, { recursive: true, force: true });
  }
}

let verifyPageSmokeDir;
try {
  verifyPageSmokeDir = await mkdtemp(path.join(tmpdir(), "jun-ui-verify-page-smoke-"));
  const goodDir = path.join(verifyPageSmokeDir, "good");
  const badDir = path.join(verifyPageSmokeDir, "bad");
  await mkdir(path.join(goodDir, "assets"), { recursive: true });
  await mkdir(path.join(badDir, "assets"), { recursive: true });
  const goodHtml = `<!doctype html>
<html>
<head><link rel="stylesheet" href="./assets/index.css"></head>
<body data-jun-ui-artifact><main class="panel">Token page</main><script src="./assets/index.js"></script></body>
</html>`;
  const badHtml = `<!doctype html>
<html>
<head><link rel="stylesheet" href="./assets/index.css"></head>
<body data-jun-ui-artifact><main class="panel" style="color: #ff0000">Broken page</main><script src="./assets/index.js"></script></body>
</html>`;
  await writeFile(path.join(goodDir, "index.html"), goodHtml, "utf8");
  await writeFile(
    path.join(goodDir, "assets", "index.css"),
    `:root { --jun-ui-bg: #F6F6F7; --jun-ui-accent: #2C6ECB; --jun-ui-line: #D2D5D8; }
.panel { color: var(--jun-ui-accent); border-color: var(--jun-ui-line); white-space: nowrap; }`,
    "utf8",
  );
  await writeFile(path.join(goodDir, "assets", "index.js"), "window.__junUiVerifyGood = true;", "utf8");
  await writeFile(path.join(badDir, "index.html"), badHtml, "utf8");
  await writeFile(path.join(badDir, "assets", "index.css"), ".panel { color: #ff0000; }", "utf8");
  await writeFile(path.join(badDir, "assets", "index.js"), "window.__junUiVerifyBad = true;", "utf8");

  const { stdout: verifyStdout } = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "verify-page",
    goodDir,
    "--strict",
  ]);
  if (!verifyStdout.includes("jun-ui page verification passed")) {
    errors.push("verify-page strict smoke must report success for token-based artifact");
  }

  const { stdout: verifyHtmlStdout } = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "verify-page",
    path.join(goodDir, "index.html"),
    "--strict",
  ]);
  if (!verifyHtmlStdout.includes("jun-ui page verification passed")) {
    errors.push("verify-page strict smoke must support direct HTML artifact targets");
  }

  let badFailed = false;
  let badOutput = "";
  try {
    await execFileAsync(process.execPath, [
      path.join(root, "scripts/jun-ui.mjs"),
      "verify-page",
      badDir,
      "--strict",
    ]);
  } catch (error) {
    badFailed = true;
    badOutput = `${error.stdout || ""}\n${error.stderr || ""}`;
  }
  if (!badFailed) {
    errors.push("verify-page strict smoke must reject handwritten colors");
  }
  if (!badOutput.includes("bare color")) {
    errors.push("verify-page strict smoke must explain bare color violations");
  }

  const goodContractProject = path.join(verifyPageSmokeDir, "contract-good");
  const badContractProject = path.join(verifyPageSmokeDir, "contract-bad");
  const artifactOnlyProject = path.join(verifyPageSmokeDir, "artifact-only-bad");
  async function writeContractProject(projectDir, { badEntry = false } = {}) {
    const artifactDir = path.join(projectDir, "dist");
    const sourceDir = path.join(projectDir, "src");
    await mkdir(path.join(artifactDir, "assets"), { recursive: true });
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      path.join(projectDir, "jun-ui.bundle.json"),
      JSON.stringify({
        type: "contract-smoke",
        title: "Contract smoke",
        out: "dist",
        fileName: "index.html",
        assetsDir: "assets",
        app: {
          html: "src/shell.html",
          entry: "src/app.mjs",
          styles: ["src/styles.css"],
        },
      }, null, 2),
      "utf8",
    );
    await writeFile(
      path.join(sourceDir, "shell.html"),
      '<!doctype html><html><body data-jun-ui-artifact><main><button class="jui-button" type="button">OK</button></main></body></html>',
      "utf8",
    );
    await writeFile(
      path.join(sourceDir, "styles.css"),
      [
        ":root { --contract-bg: var(--jun-ui-bg); }",
        "button, input, textarea, select { appearance: none; }",
        ".jui-button { color: var(--jun-ui-accent); background: var(--jun-ui-panel); border-color: var(--jun-ui-line); }",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(sourceDir, "app.mjs"),
      badEntry
        ? 'document.body.insertAdjacentHTML("beforeend", `<button type="button">Bad dynamic action</button>`);'
        : 'const semiButtonExample = `<Button type="primary">Semi OK</Button>`;\nconst jsxNativeControl = <button className={`jui-button ${state ? "active" : ""}`} type="button">JSX OK</button>;\ndocument.body.insertAdjacentHTML("beforeend", `<button class="jui-button" type="button">Dynamic OK</button>`);',
      "utf8",
    );
    await writeFile(
      path.join(artifactDir, "index.html"),
      '<!doctype html><html><head><link rel="stylesheet" href="./assets/index.css"></head><body data-jun-ui-artifact><main><button class="jui-button" type="button">OK</button></main><script src="./assets/index.js"></script></body></html>',
      "utf8",
    );
    await writeFile(
      path.join(artifactDir, "assets", "index.css"),
      [
        ":root { --jun-ui-bg: #F6F6F7; --jun-ui-panel: #FFFFFF; --jun-ui-accent: #2C6ECB; --jun-ui-line: #D2D5D8; }",
        "button, input, textarea, select { appearance: none; }",
        ".jui-button { color: var(--jun-ui-accent); background: var(--jun-ui-panel); border-color: var(--jun-ui-line); }",
      ].join("\n"),
      "utf8",
    );
    await writeFile(path.join(artifactDir, "assets", "index.js"), "window.__contractSmoke = true;", "utf8");
  }
  await writeContractProject(goodContractProject);
  await writeContractProject(badContractProject, { badEntry: true });

  const { stdout: contractStdout } = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "verify-page",
    path.join(goodContractProject, "jun-ui.bundle.json"),
    "--project-root",
    goodContractProject,
    "--strict",
  ]);
  if (!contractStdout.includes("jun-ui page verification passed")) {
    errors.push("verify-page strict smoke must accept declared jun-ui controls");
  }

  let badContractFailed = false;
  let badContractOutput = "";
  try {
    await execFileAsync(process.execPath, [
      path.join(root, "scripts/jun-ui.mjs"),
      "verify-page",
      path.join(badContractProject, "jun-ui.bundle.json"),
      "--project-root",
      badContractProject,
      "--strict",
    ]);
  } catch (error) {
    badContractFailed = true;
    badContractOutput = `${error.stdout || ""}\n${error.stderr || ""}`;
  }
  if (!badContractFailed) {
    errors.push("verify-page strict smoke must reject uncontracted native controls in app entry files");
  }
  if (!badContractOutput.includes("native control")) {
    errors.push("verify-page strict smoke must explain native control contract violations");
  }

  await mkdir(path.join(artifactOnlyProject, "dist", "assets"), { recursive: true });
  const artifactOnlyConfig = path.join(artifactOnlyProject, "jun-ui.page.json");
  await writeFile(
    artifactOnlyConfig,
    JSON.stringify(
      {
        out: "dist",
        fileName: "index.html",
        assetsDir: "assets",
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(
    path.join(artifactOnlyProject, "dist", "index.html"),
    '<!doctype html><html><head><link rel="stylesheet" href="./assets/index.css"></head><body data-jun-ui-artifact><main><button class="bad-control" type="button">Bad</button></main></body></html>',
    "utf8",
  );
  await writeFile(
    path.join(artifactOnlyProject, "dist", "assets", "index.css"),
    [
      ":root { --jun-ui-bg: #F6F6F7; --jun-ui-panel: #FFFFFF; --jun-ui-accent: #2C6ECB; --jun-ui-line: #D2D5D8; }",
      "button, input, textarea, select { appearance: none; }",
    ].join("\n"),
    "utf8",
  );
  let artifactOnlyFailed = false;
  let artifactOnlyOutput = "";
  try {
    await execFileAsync(process.execPath, [
      path.join(root, "scripts/jun-ui.mjs"),
      "verify-page",
      artifactOnlyConfig,
      "--project-root",
      artifactOnlyProject,
      "--strict",
    ]);
  } catch (error) {
    artifactOnlyFailed = true;
    artifactOnlyOutput = `${error.stdout || ""}\n${error.stderr || ""}`;
  }
  if (!artifactOnlyFailed) {
    errors.push("verify-page strict smoke must reject uncontracted native controls in artifact-only config output");
  }
  if (!artifactOnlyOutput.includes("native control")) {
    errors.push("verify-page strict artifact-only smoke must explain native control violations");
  }
} catch (error) {
  errors.push(`verify-page smoke failed: ${error.message}`);
} finally {
  if (verifyPageSmokeDir) {
    await rm(verifyPageSmokeDir, { recursive: true, force: true });
  }
}

let builderSmokeDir;
try {
  builderSmokeDir = await mkdtemp(path.join(tmpdir(), "jun-ui-builder-smoke-"));
  const smokeConfig = path.join(root, "templates/workbench/jun-ui.page.json");
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "build",
    smokeConfig,
    "--out",
    builderSmokeDir,
  ]);
  const builtHtml = await readFile(path.join(builderSmokeDir, "index.html"), "utf8");
  if (!builtHtml.includes("<!doctype html>") || !builtHtml.includes("data-jun-ui-artifact")) {
    errors.push("builder smoke output must be a file-openable jun-ui artifact");
  }
  if (!builtHtml.includes("./assets/")) {
    errors.push("builder smoke output must reference bundled assets with relative ./assets/ paths");
  }
  if (builtHtml.includes('type="module"')) {
    errors.push("builder smoke output must not require module scripts for file:// rendering");
  }
  if (!builtHtml.includes('<script src="./assets/')) {
    errors.push("builder smoke output must load a classic bundled script");
  }
  if (!builtHtml.includes("data-jun-ui-static-fallback")) {
    errors.push("builder smoke output must include a nonblank static fallback");
  }
  const assets = await readdir(path.join(builderSmokeDir, "assets"));
  if (!assets.some((asset) => asset.endsWith(".js"))) {
    errors.push("builder smoke output must include a bundled JavaScript asset");
  }
  for (const asset of assets.filter((asset) => asset.endsWith(".js"))) {
    const jsBody = await readFile(path.join(builderSmokeDir, "assets", asset), "utf8");
    if (jsBody.includes("process.env.NODE_ENV")) {
      errors.push("builder smoke JavaScript must not require process.env in the browser");
    }
  }
  if (!assets.some((asset) => asset.endsWith(".css"))) {
    errors.push("builder smoke output must include a bundled CSS asset");
  }
  if (!stdout.includes("Built")) {
    errors.push("builder smoke command must report a built artifact");
  }
  const { stdout: verifyBuilderStdout } = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "verify-page",
    smokeConfig,
    "--out",
    builderSmokeDir,
    "--strict",
  ]);
  if (!verifyBuilderStdout.includes("jun-ui page verification passed")) {
    errors.push("builder smoke output must pass verify-page strict postflight");
  }
} catch (error) {
  errors.push(`builder smoke failed: ${error.message}`);
} finally {
  if (builderSmokeDir) {
    await rm(builderSmokeDir, { recursive: true, force: true });
  }
}

let staticExampleSmokeDir;
try {
  staticExampleSmokeDir = await mkdtemp(path.join(tmpdir(), "jun-ui-static-example-"));
  const staticExampleConfig = path.join(root, "examples/static-artifact/jun-ui.page.json");
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "build",
    staticExampleConfig,
    "--out",
    staticExampleSmokeDir,
  ]);
  if (!stdout.includes("Built")) {
    errors.push("static artifact example build must report a built artifact");
  }
  const staticExampleHtml = await readFile(path.join(staticExampleSmokeDir, "index.html"), "utf8");
  for (const expected of [
    "data-jun-ui-artifact",
    "data-page-type=\"static-artifact-example\"",
    "jun-ui Static Artifact Example",
    "data-jun-ui-static-fallback",
    "./assets/",
  ]) {
    if (!staticExampleHtml.includes(expected)) {
      errors.push(`static artifact example output missing ${expected}`);
    }
  }
  const staticExampleAssets = await readdir(path.join(staticExampleSmokeDir, "assets"));
  if (!staticExampleAssets.some((asset) => asset.endsWith(".js"))) {
    errors.push("static artifact example output must include bundled JavaScript");
  }
  if (!staticExampleAssets.some((asset) => asset.endsWith(".css"))) {
    errors.push("static artifact example output must include bundled CSS");
  }
  const { stdout: verifyStaticExampleStdout } = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "verify-page",
    staticExampleConfig,
    "--out",
    staticExampleSmokeDir,
    "--strict",
  ]);
  if (!verifyStaticExampleStdout.includes("jun-ui page verification passed")) {
    errors.push("static artifact example must pass verify-page strict postflight");
  }
} catch (error) {
  errors.push(`static artifact example smoke failed: ${error.message}`);
} finally {
  if (staticExampleSmokeDir) {
    await rm(staticExampleSmokeDir, { recursive: true, force: true });
  }
}

const relativeOutName = `tmp/jun-ui-relative-out-${Date.now()}`;
const expectedRelativeOutDir = path.join(root, relativeOutName);
const misplacedRelativeOutDir = path.join(root, "templates", "workbench", relativeOutName);
try {
  await rm(expectedRelativeOutDir, { recursive: true, force: true });
  await rm(misplacedRelativeOutDir, { recursive: true, force: true });
  await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "build",
    path.join(root, "templates/workbench/jun-ui.page.json"),
    "--out",
    relativeOutName,
  ]);
  if (!(await fileExists(path.join(expectedRelativeOutDir, "index.html")))) {
    errors.push("--out relative path must resolve from the current working directory");
  }
  if (await fileExists(path.join(misplacedRelativeOutDir, "index.html"))) {
    errors.push("--out relative path must not resolve from the config file directory");
  }
} catch (error) {
  errors.push(`builder relative --out smoke failed: ${error.message}`);
} finally {
  await rm(expectedRelativeOutDir, { recursive: true, force: true });
  await rm(misplacedRelativeOutDir, { recursive: true, force: true });
}

let actionSmokeRoot;
try {
  actionSmokeRoot = await mkdtemp(path.join(tmpdir(), "jun-ui-action-smoke-"));
  const actionConfig = path.join(actionSmokeRoot, "jun-ui-action.page.json");
  const actionOutDir = path.join(actionSmokeRoot, "site");
  await mkdir(actionOutDir, { recursive: true });
  await writeFile(path.join(actionOutDir, "keep.json"), '{"keep":true}\n', "utf8");
  await writeFile(
    actionConfig,
    JSON.stringify(
      {
        type: "personal-ops-today",
        title: "Action Smoke",
        description: "Verify action cards and fixed output filename.",
        lang: "zh-CN",
        out: actionOutDir,
        fileName: "today.html",
        assetsDir: "today-assets",
        metrics: [{ label: "Action", value: "copy", note: "Prompt copy smoke." }],
        sections: [{ title: "Fallback Body", body: "Static fallback body text.", items: ["Fallback item"] }],
        actions: [
          {
            action_id: "refresh_today",
            label: "重新对账并刷新日报",
            role: "Ops Router",
            intent: "主动触发一次 repo 对账、项目发现和 Today 报表重刷。",
            send_to: "Personal Ops 线程",
            cadence_hint: "需要时手动触发",
            prompt: "Personal Ops action: refresh_today",
            tone: "primary",
          },
        ],
        postActionSections: [
          {
            title: "Source Detail",
            body: "Audit detail after actions.",
            items: ["source.md: /tmp/source.md"],
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  await execFileAsync(process.execPath, [path.join(root, "scripts/jun-ui.mjs"), "build", actionConfig]);
  const actionHtmlPath = path.join(actionOutDir, "today.html");
  const actionHtml = await readFile(actionHtmlPath, "utf8");
  if (!(await fileExists(path.join(actionOutDir, "keep.json")))) {
    errors.push("builder action smoke must preserve sibling files when using fileName");
  }
  if (await fileExists(path.join(actionOutDir, "index.html"))) {
    errors.push("builder action smoke must honor fileName instead of also writing index.html");
  }
  for (const expected of [
    "data-jun-ui-actions",
    "refresh_today",
    "重新对账并刷新日报",
    "Static fallback body text.",
    'data-action-id="refresh_today"',
    "Personal Ops action: refresh_today",
    "promptOutput",
    "Audit detail after actions.",
    '<script src="./today-assets/',
  ]) {
    if (!actionHtml.includes(expected)) {
      errors.push(`builder action smoke missing ${expected}`);
    }
  }
} catch (error) {
  errors.push(`builder action smoke failed: ${error.message}`);
} finally {
  if (actionSmokeRoot) {
    await rm(actionSmokeRoot, { recursive: true, force: true });
  }
}

let bundleSmokeRoot;
try {
  bundleSmokeRoot = await mkdtemp(path.join(tmpdir(), "jun-ui-bundle-smoke-"));
  const bundleSourceDir = path.join(bundleSmokeRoot, "source");
  const bundleOutDir = path.join(bundleSmokeRoot, "site");
  await mkdir(path.join(bundleSourceDir, "src"), { recursive: true });
  await mkdir(path.join(bundleSourceDir, "app"), { recursive: true });
  await mkdir(path.join(bundleOutDir, "data"), { recursive: true });
  await writeFile(path.join(bundleOutDir, "keep.json"), '{"keep":true}\n', "utf8");
  await writeFile(
    path.join(bundleOutDir, "data", "static-data.js"),
    'window.__JUN_UI_BUNDLE_SMOKE__ = { "message": "static data ready" };\n',
    "utf8",
  );
  await writeFile(
    path.join(bundleSourceDir, "src", "helper.mjs"),
    'export function message() { return window.__JUN_UI_BUNDLE_SMOKE__.message; }\n',
    "utf8",
  );
  await writeFile(
    path.join(bundleSourceDir, "src", "app.mjs"),
    'import { message } from "./helper.mjs";\ndocument.querySelector("#bundle-output").textContent = message();\n',
    "utf8",
  );
  await writeFile(
    path.join(bundleSourceDir, "app", "styles.css"),
    ".bundle-output { color: var(--jun-ui-accent); background: var(--jun-ui-bg); border-color: var(--jun-ui-line); }\n",
    "utf8",
  );
  await writeFile(
    path.join(bundleSourceDir, "app", "shell.html"),
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>Bundle Smoke</title><!-- jun-ui:styles --></head><body><main><p id="bundle-output" class="bundle-output">loading</p></main><!-- jun-ui:scripts --></body></html>\n',
    "utf8",
  );
  const bundleConfig = path.join(bundleSourceDir, "jun-ui.bundle.json");
  await writeFile(
    bundleConfig,
    JSON.stringify(
      {
        type: "bundle-smoke",
        title: "Bundle Smoke",
        out: bundleOutDir,
        fileName: "workbench.html",
        assetsDir: "workbench-assets",
        app: {
          html: "app/shell.html",
          entry: "src/app.mjs",
          styles: ["app/styles.css"],
          dataScripts: ["data/static-data.js"],
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  const bundleResult = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "bundle-app",
    bundleConfig,
    "--project-root",
    bundleSourceDir,
  ]);
  if (`${bundleResult.stdout}\n${bundleResult.stderr}`.includes("inlineDynamicImports")) {
    errors.push("bundle-app smoke must not emit inlineDynamicImports warnings");
  }
  const bundleHtml = await readFile(path.join(bundleOutDir, "workbench.html"), "utf8");
  if (!(await fileExists(path.join(bundleOutDir, "keep.json")))) {
    errors.push("bundle-app smoke must preserve sibling files");
  }
  for (const expected of [
    "data-jun-ui-artifact",
    "data-page-type=\"bundle-smoke\"",
    '<script src="./data/static-data.js"></script>',
    '<script src="./workbench-assets/',
    '<link rel="stylesheet" href="./workbench-assets/',
    "bundle-output",
  ]) {
    if (!bundleHtml.includes(expected)) {
      errors.push(`bundle-app smoke missing ${expected}`);
    }
  }
  if (bundleHtml.includes('type="module"')) {
    errors.push("bundle-app smoke must not emit module scripts");
  }
  const bundleAssets = await readdir(path.join(bundleOutDir, "workbench-assets"));
  if (!bundleAssets.some((asset) => asset.endsWith(".js"))) {
    errors.push("bundle-app smoke must include bundled JavaScript");
  }
  if (!bundleAssets.some((asset) => asset.endsWith(".css"))) {
    errors.push("bundle-app smoke must include bundled CSS");
  }
  const bundleCssBodies = [];
  for (const asset of bundleAssets.filter((asset) => asset.endsWith(".css"))) {
    bundleCssBodies.push(await readFile(path.join(bundleOutDir, "workbench-assets", asset), "utf8"));
  }
  const combinedBundleCss = bundleCssBodies.join("\n");
  for (const expected of ["--jun-ui-bg", "--jun-ui-accent", "--jun-ui-line"]) {
    if (!new RegExp(`${expected}:`).test(combinedBundleCss)) {
      errors.push(`bundle-app smoke CSS missing injected token definition ${expected}`);
    }
  }
  const { stdout: verifyBundleStdout } = await execFileAsync(process.execPath, [
    path.join(root, "scripts/jun-ui.mjs"),
    "verify-page",
    bundleConfig,
    "--project-root",
    bundleSourceDir,
    "--strict",
  ]);
  if (!verifyBundleStdout.includes("jun-ui page verification passed")) {
    errors.push("bundle-app smoke output must pass verify-page strict postflight");
  }
} catch (error) {
  errors.push(`bundle-app smoke failed: ${error.message}`);
} finally {
  if (bundleSmokeRoot) {
    await rm(bundleSmokeRoot, { recursive: true, force: true });
  }
}

let projectRedesignSmokeRoot;
try {
  projectRedesignSmokeRoot = await mkdtemp(path.join(tmpdir(), "jun-ui-project-redesign-starter-"));
  for (const configName of projectRedesignConfigNames) {
    const configRel = path.join("configs", configName);
    const configPath = path.join(projectRedesignStarterDir, configRel);
    const config = JSON.parse(await readFile(configPath, "utf8"));
    const outputFileName = config.fileName || "index.html";
    const assetsDir = config.assetsDir || "assets";
    const outDir = path.join(projectRedesignSmokeRoot, configName.replace(/[^a-z0-9]+/gi, "-"));
    await execFileAsync(process.execPath, [
      path.join(root, "scripts/jun-ui.mjs"),
      "bundle-app",
      configRel,
      "--project-root",
      projectRedesignStarterDir,
      "--out",
      outDir,
    ]);
    const outputHtml = await readFile(path.join(outDir, outputFileName), "utf8");
    for (const expected of [
      "data-jun-ui-artifact",
      `data-page-type="${config.type}"`,
      "data-jun-ui-static-fallback",
      "semi-action-strip",
      `./${assetsDir}/`,
    ]) {
      if (!outputHtml.includes(expected)) {
        errors.push(`project redesign starter ${configName} output missing ${expected}`);
      }
    }
    if (outputHtml.includes('type="module"')) {
      errors.push(`project redesign starter ${configName} output must not emit module scripts`);
    }
    const outputAssets = await readdir(path.join(outDir, assetsDir));
    if (!outputAssets.some((asset) => asset.endsWith(".js"))) {
      errors.push(`project redesign starter ${configName} output must include bundled JavaScript`);
    }
    if (!outputAssets.some((asset) => asset.endsWith(".css"))) {
      errors.push(`project redesign starter ${configName} output must include bundled CSS`);
    }
    const cssBodies = [];
    for (const asset of outputAssets.filter((asset) => asset.endsWith(".css"))) {
      cssBodies.push(await readFile(path.join(outDir, assetsDir, asset), "utf8"));
    }
    if (!/--jun-ui-bg:/.test(cssBodies.join("\n"))) {
      errors.push(`project redesign starter ${configName} CSS must include injected jun-ui tokens`);
    }
    const { stdout: verifyRedesignStdout } = await execFileAsync(process.execPath, [
      path.join(root, "scripts/jun-ui.mjs"),
      "verify-page",
      configRel,
      "--project-root",
      projectRedesignStarterDir,
      "--out",
      outDir,
      "--strict",
    ]);
    if (!verifyRedesignStdout.includes("jun-ui page verification passed")) {
      errors.push(`project redesign starter ${configName} must pass verify-page strict postflight`);
    }
  }
} catch (error) {
  errors.push(`project redesign starter smoke failed: ${error.stdout || ""}\n${error.stderr || ""}\n${error.message}`);
} finally {
  if (projectRedesignSmokeRoot) {
    await rm(projectRedesignSmokeRoot, { recursive: true, force: true });
  }
}

const runtimeExampleHtml = await requireFile("examples/runtime-app/index.html");
const runtimeExampleClient = await requireFile("examples/runtime-app/src/main.jsx");
const runtimeExampleStyles = await requireFile("examples/runtime-app/src/styles.css");
for (const expected of [
  "data-jun-ui-runtime-example",
  "data-jun-ui-runtime-fallback",
  "/jun-ui-tokens.css",
  "/src/main.jsx",
]) {
  if (!runtimeExampleHtml.includes(expected)) {
    errors.push(`runtime app example HTML missing ${expected}`);
  }
}
for (const expected of [
  "@douyinfe/semi-ui",
  "@douyinfe/semi-icons",
  "/api/state",
  "/api/refresh",
  "Toast.success",
]) {
  if (!runtimeExampleClient.includes(expected)) {
    errors.push(`runtime app example client missing ${expected}`);
  }
}
if (containsNativeControl(runtimeExampleHtml) && !hasNativeControlReset(runtimeExampleStyles)) {
  errors.push("runtime app example native controls must be normalized with appearance: none");
}
errors.push(
  ...findBareColorViolations(runtimeExampleStyles, "examples/runtime-app/src/styles.css", {
    allowTokenDefinitions: false,
    allowReferenceDefinitions: false,
  }),
);

let runtimeExampleProcess;
try {
  runtimeExampleProcess = spawn(process.execPath, [path.join(root, "examples/runtime-app/server.mjs")], {
    cwd: root,
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const { url } = await waitForRuntimeReady(runtimeExampleProcess);

  const htmlResponse = await fetch(url);
  const servedHtml = await htmlResponse.text();
  if (!htmlResponse.ok || !servedHtml.includes("data-jun-ui-runtime-fallback")) {
    errors.push("runtime app example server must serve nonblank HTML fallback");
  }

  const tokenResponse = await fetch(`${url}/jun-ui-tokens.css`);
  const tokenCss = await tokenResponse.text();
  if (!tokenResponse.ok || !tokenCss.includes("--jun-ui-bg:") || !tokenCss.includes("--jun-ui-accent:")) {
    errors.push("runtime app example must serve shared jun-ui token CSS");
  }

  const stateResponse = await fetch(`${url}/api/state`);
  const beforeState = await stateResponse.json();
  if (!stateResponse.ok || beforeState.mode !== "runtime") {
    errors.push("runtime app example GET /api/state must return runtime state");
  }

  const refreshResponse = await fetch(`${url}/api/refresh`, { method: "POST" });
  const refreshPayload = await refreshResponse.json();
  if (!refreshResponse.ok || refreshPayload.ok !== true) {
    errors.push("runtime app example POST /api/refresh must succeed");
  }
  if (refreshPayload.state.savedCount !== beforeState.savedCount + 1) {
    errors.push("runtime app example POST /api/refresh must mutate server state");
  }
} catch (error) {
  errors.push(`runtime app example smoke failed: ${error.message}`);
} finally {
  await stopRuntime(runtimeExampleProcess);
}

const shouldCheckGlobalSkill = homedir() === "/Users/jun" || process.env.JUN_UI_REQUIRE_GLOBAL_SKILL === "1";
if (shouldCheckGlobalSkill) {
  const globalSkillPath = "/Users/jun/.codex/skills/jun-ui-page-delivery/SKILL.md";
  try {
    const globalSkill = await readFile(globalSkillPath, "utf8");
    if (!globalSkill.includes("name: jun-ui-page-delivery")) {
      errors.push("global jun-ui page delivery skill has wrong skill name");
    }
  } catch {
    errors.push(`missing global skill entrypoint: ${globalSkillPath}`);
  }

  if (await fileExists("/Users/jun/.codex/skills/jun-ui-static-pages")) {
    errors.push("old global jun-ui-static-pages skill entrypoint still exists");
  }

  try {
    const { stdout: doctorOutput } = await execFileAsync(process.execPath, [
      path.join(root, "scripts/jun-ui.mjs"),
      "doctor",
      "--strict",
    ]);
    for (const expected of [
      "ok ctx7:",
      "ok context7-docs skill:",
      "ok context7-cli skill:",
    ]) {
      if (!doctorOutput.includes(expected)) {
        errors.push(`doctor --strict missing ${expected}`);
      }
    }
  } catch (error) {
    errors.push(`doctor --strict failed: ${error.stdout || error.message}`);
  }
}

if (errors.length > 0) {
  console.error("jun-ui validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("jun-ui validation passed");
