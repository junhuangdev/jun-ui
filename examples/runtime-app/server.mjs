#!/usr/bin/env node
import react from "@vitejs/plugin-react";
import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const exampleRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(exampleRoot, "../..");
const tokenRegistryPath = path.join(repoRoot, "tokens", "jun-ui.tokens.json");

const state = {
  mode: "runtime",
  status: "online",
  queueDepth: 3,
  savedCount: 0,
  lastRefresh: "2026-06-08T00:00:00.000Z",
  checks: [
    { name: "API route", status: "ready" },
    { name: "Shared tokens", status: "ready" },
    { name: "Semi UI", status: "ready" }
  ]
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

async function sendTokenCss(response) {
  const registry = JSON.parse(await readFile(tokenRegistryPath, "utf8"));
  const declarations = registry.tokens.map((token) => `  ${token.name}: ${token.value};`).join("\n");
  response.writeHead(200, {
    "content-type": "text/css; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(`:root {\n  color-scheme: light;\n${declarations}\n}\n`);
}

const vite = await createViteServer({
  root: exampleRoot,
  appType: "spa",
  configFile: false,
  logLevel: "error",
  plugins: [react()],
  resolve: {
    alias: {
      "@douyinfe/semi-icons": path.join(repoRoot, "node_modules", "@douyinfe", "semi-icons"),
      "@douyinfe/semi-ui": path.join(repoRoot, "node_modules", "@douyinfe", "semi-ui"),
      react: path.join(repoRoot, "node_modules", "react"),
      "react-dom": path.join(repoRoot, "node_modules", "react-dom")
    },
    dedupe: ["react", "react-dom"]
  },
  server: {
    middlewareMode: true
  }
});

const server = createHttpServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");

    if (url.pathname === "/api/state" && request.method === "GET") {
      sendJson(response, 200, state);
      return;
    }

    if (url.pathname === "/api/refresh" && request.method === "POST") {
      state.savedCount += 1;
      state.queueDepth = Math.max(0, state.queueDepth - 1);
      state.lastRefresh = new Date().toISOString();
      sendJson(response, 200, {
        ok: true,
        state
      });
      return;
    }

    if (url.pathname === "/jun-ui-tokens.css" && request.method === "GET") {
      await sendTokenCss(response);
      return;
    }

    vite.middlewares(request, response, (error) => {
      if (error) {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end(error.stack || error.message);
      }
    });
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error.stack || error.message);
  }
});

const requestedPort = Number(process.env.PORT || 4178);
server.listen(requestedPort, "127.0.0.1", () => {
  const address = server.address();
  console.log(`Runtime example ready http://127.0.0.1:${address.port}`);
});

async function shutdown() {
  await vite.close();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
