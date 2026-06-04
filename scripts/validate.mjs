import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredFiles = [
  "README.md",
  "LICENSE",
  "jun-ui.css",
  "jun-ui.js",
  "vendor/spectrum.html",
  "docs/design-system.md",
  "examples/dashboard.html",
  "examples/form.html",
  "examples/detail.html",
];

const errors = [];

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

const css = await requireFile("jun-ui.css");
const js = await requireFile("jun-ui.js");
const readme = await requireFile("README.md");
const designDoc = await requireFile("docs/design-system.md");
const vendor = await requireFile("vendor/spectrum.html");

for (const token of [
  "--jui-page-max",
  "--jui-gap",
  "--jui-panel-radius",
  "--jui-focus-ring",
  ".jui-shell",
  ".jui-panel",
  ".jui-toolbar",
  ".jui-grid",
  ".jui-stack",
]) {
  if (!css.includes(token)) errors.push(`jun-ui.css missing ${token}`);
}

for (const elementName of [
  "jui-app-shell",
  "jui-page-header",
  "jui-panel",
  "jui-section-title",
  "jui-stat",
  "jui-empty-state",
]) {
  if (!js.includes(`customElements.define("${elementName}"`)) {
    errors.push(`jun-ui.js does not register ${elementName}`);
  }
}

for (const banned of ["React", "Vite", "Tailwind", "webpack"]) {
  if (readme.includes(`requires ${banned}`) || designDoc.includes(`requires ${banned}`)) {
    errors.push(`docs imply a build dependency on ${banned}`);
  }
}

if (!vendor.includes("@spectrum-web-components/bundle/elements.js")) {
  errors.push("vendor/spectrum.html must document the Spectrum CDN bundle import");
}

const examples = await readdir(path.join(root, "examples"));
for (const file of examples.filter((name) => name.endsWith(".html"))) {
  const body = await text(`examples/${file}`);
  if (!body.includes("../jun-ui.css")) errors.push(`${file} does not import jun-ui.css`);
  if (!body.includes("../jun-ui.js")) errors.push(`${file} does not import jun-ui.js`);
  if (!body.includes("<sp-theme")) errors.push(`${file} does not use sp-theme`);
  if (!body.includes("<jui-")) errors.push(`${file} does not use jun-ui elements`);
}

const syntaxCheck = spawnSync(process.execPath, ["--check", "jun-ui.js"], {
  cwd: root,
  encoding: "utf8",
});
if (syntaxCheck.status !== 0) {
  errors.push(`jun-ui.js syntax check failed: ${syntaxCheck.stderr.trim()}`);
}

if (errors.length > 0) {
  console.error("jun-ui validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("jun-ui validation passed");
