import { execFile } from "node:child_process";
import { lstat, mkdtemp, readFile, rm } from "node:fs/promises";
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
}

if (errors.length > 0) {
  console.error("jun-ui validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("jun-ui validation passed");
