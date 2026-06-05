import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const root = process.cwd();
const execFileAsync = promisify(execFile);

const requiredFiles = [
  "README.md",
  "AGENTS.md",
  "LICENSE",
  "package.json",
  "docs/builder.md",
  "docs/context7.md",
  "docs/design-system.md",
  "docs/problem-and-solution.md",
  "scripts/jun-ui.mjs",
  "skills/jun-ui-page-delivery/SKILL.md",
  "skills/jun-ui-page-delivery/references/builder-contract.md",
  "skills/jun-ui-page-delivery/references/delivery-contract.md",
  "templates/workbench/jun-ui.page.json",
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
];

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

for (const file of requiredFiles) {
  await requireFile(file);
}

for (const file of removedFiles) {
  if (await fileExists(file)) {
    errors.push(`removed legacy file still exists: ${file}`);
  }
}

const packageJson = JSON.parse(await requireFile("package.json"));
for (const term of ["ai-page-delivery", "semi-design", "context7", "figma", "file-openable"]) {
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
} catch (error) {
  errors.push(`builder smoke failed: ${error.message}`);
} finally {
  if (builderSmokeDir) {
    await rm(builderSmokeDir, { recursive: true, force: true });
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
    ".bundle-output { color: rgb(18 128 92); }\n",
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
} catch (error) {
  errors.push(`bundle-app smoke failed: ${error.message}`);
} finally {
  if (bundleSmokeRoot) {
    await rm(bundleSmokeRoot, { recursive: true, force: true });
  }
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
