#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  return [
    "Usage:",
    "  jun-ui build <config.json> [--out <dir>] [--project-root <dir>]",
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
  const rawOut = flags.out || config.out;
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

function listItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<li class="jun-ui-muted">No items configured.</li>';
  }
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
}

function renderArtifact(config) {
  const title = assertString(config.title, "title");
  const pageType = assertString(config.type, "type");
  const description = config.description || "Built with jun-ui.";
  const sections = Array.isArray(config.sections) ? config.sections : [];
  const metrics = Array.isArray(config.metrics) ? config.metrics : [];
  const generatedAt = new Date().toISOString();

  return `<!doctype html>
<html lang="${escapeHtml(config.lang || "en")}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="jun-ui Builder">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --jun-ui-bg: #f6f7f9;
      --jun-ui-panel: #ffffff;
      --jun-ui-ink: #20242a;
      --jun-ui-muted: #667085;
      --jun-ui-line: #d9dee7;
      --jun-ui-accent: #1f6feb;
      --jun-ui-good: #12805c;
      --jun-ui-warn: #9b6b18;
      --jun-ui-radius: 8px;
      --jun-ui-shadow: 0 12px 30px rgba(24, 36, 56, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--jun-ui-bg);
      color: var(--jun-ui-ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
      padding: 20px;
      border: 1px solid var(--jun-ui-line);
      border-radius: var(--jun-ui-radius);
      background: var(--jun-ui-panel);
      box-shadow: var(--jun-ui-shadow);
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 28px; line-height: 1.15; }
    h2 { font-size: 18px; }
    .jun-ui-kicker,
    .jun-ui-muted {
      color: var(--jun-ui-muted);
      font-size: 13px;
    }
    .jun-ui-stack { display: grid; gap: 16px; margin-top: 18px; }
    .jun-ui-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .jun-ui-panel {
      border: 1px solid var(--jun-ui-line);
      border-radius: var(--jun-ui-radius);
      background: var(--jun-ui-panel);
      padding: 16px;
      box-shadow: 0 6px 18px rgba(24, 36, 56, 0.05);
    }
    .jun-ui-metric strong {
      display: block;
      margin-top: 4px;
      font-size: 24px;
      line-height: 1.1;
    }
    .jun-ui-section ul {
      margin: 12px 0 0;
      padding-left: 18px;
    }
    .jun-ui-badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid #bcd1f6;
      border-radius: 999px;
      background: #eef5ff;
      color: var(--jun-ui-accent);
      font-size: 12px;
      font-weight: 700;
      padding: 4px 9px;
    }
    @media (max-width: 720px) {
      .jun-ui-header { display: grid; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body data-jun-ui-artifact data-page-type="${escapeHtml(pageType)}" data-component-system="Semi Design System">
  <main class="jun-ui-shell">
    <header class="jun-ui-header">
      <div>
        <p class="jun-ui-kicker">jun-ui Builder · ${escapeHtml(pageType)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="jun-ui-muted">${escapeHtml(description)}</p>
      </div>
      <span class="jun-ui-badge">file-openable artifact</span>
    </header>

    <section class="jun-ui-grid jun-ui-stack" aria-label="Metrics">
      ${metrics
        .map(
          (metric) => `<article class="jun-ui-panel jun-ui-metric">
        <span class="jun-ui-muted">${escapeHtml(metric.label)}</span>
        <strong>${escapeHtml(metric.value)}</strong>
        <p class="jun-ui-muted">${escapeHtml(metric.note || "")}</p>
      </article>`,
        )
        .join("\n")}
    </section>

    <section class="jun-ui-stack" aria-label="Sections">
      ${sections
        .map(
          (section) => `<article class="jun-ui-panel jun-ui-section">
        <h2>${escapeHtml(section.title)}</h2>
        <p class="jun-ui-muted">${escapeHtml(section.description || "")}</p>
        <ul>
          ${listItems(section.items)}
        </ul>
      </article>`,
        )
        .join("\n")}
    </section>

    <footer class="jun-ui-stack">
      <p class="jun-ui-muted">Generated ${escapeHtml(generatedAt)}. Runtime dependencies are bundled into this artifact.</p>
    </footer>
  </main>
</body>
</html>
`;
}

async function build(argv) {
  const { flags, positionals } = parseFlags(argv);
  const configArg = positionals[0];
  if (!configArg) throw new Error(`Missing config path.\n${usage()}`);
  const projectRoot = flags["project-root"] ? path.resolve(flags["project-root"]) : undefined;
  const configPath = path.resolve(projectRoot || process.cwd(), configArg);
  const config = await readJson(configPath);
  const outDir = resolveOutDir({ config, flags, configPath, projectRoot });
  await mkdir(outDir, { recursive: true });
  const html = renderArtifact(config);
  const outFile = path.join(outDir, "index.html");
  await writeFile(outFile, html, "utf8");
  console.log(`Built ${outFile}`);
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
