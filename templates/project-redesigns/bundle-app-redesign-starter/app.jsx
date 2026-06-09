import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Space, Typography } from "@douyinfe/semi-ui";
import { IconCopy, IconRefresh, IconTickCircle } from "@douyinfe/semi-icons";
import "@douyinfe/semi-ui/dist/css/semi.min.css";

const profiles = {
  "ai-radar-redesign": {
    title: "AI Radar Workbench",
    summary: "Dense news triage with report freshness, evidence, source context, and prompt actions visible on the first screen.",
    primary: "Report triage body",
    primaryNote: "Keep report catalog, current view, observation pool, source list, and generated report body together.",
    secondary: "Freshness and evidence",
    secondaryNote: "Surface live data, static snapshot, stale bundle, and fallback status before long report detail.",
    action: "Prompt lab",
    actionNote: "Keep copyable prompts and next research actions near the active report.",
    modes: [
      ["report", "报告"],
      ["evidence", "证据"],
      ["prompt", "Prompt"],
    ],
    prompt: "AI Radar redesign pass: rebuild the workbench page with jun-ui bundle-app while preserving data/static-data.js, report query semantics, and stale-bundle visibility.",
  },
  "personal-ops-redesign": {
    title: "Personal Ops Today",
    summary: "A secretary-style Today console that puts recommendation, state quality, and low-friction actions before source detail.",
    primary: "Today recommendation",
    primaryNote: "Show primary focus, backup focus, state quality, and next action as the top decision surface.",
    secondary: "Reconciliation context",
    secondaryNote: "Move repo scan, source files, and backend drift evidence below the working recommendation.",
    action: "Read-only actions",
    actionNote: "Preserve action IDs and prompt-copy behavior without writing backend state from the page.",
    modes: [
      ["today", "今日"],
      ["quality", "质量"],
      ["actions", "动作"],
    ],
    prompt: "Personal Ops redesign pass: rebuild site/today.html as a secretary console, keep tools/render_today.py as the single refresh path, and preserve read-only action IDs.",
  },
  "flowforge-redesign": {
    title: "FlowForge Local Cockpit",
    summary: "A local growth-system cockpit that separates trialable state, Codex handoff, human gates, and no-external-action boundaries.",
    primary: "Local runtime cockpit",
    primaryNote: "Keep local API state, structured handoff, and visible interaction outputs in the same work surface.",
    secondary: "Boundary evidence",
    secondaryNote: "Make local-only status, external publishing limits, and server availability explicit.",
    action: "Codex handoff",
    actionNote: "Keep copyable handoff prompts and next fixed workflow action near the queue.",
    modes: [
      ["state", "状态"],
      ["handoff", "交接"],
      ["limits", "边界"],
    ],
    prompt: "FlowForge redesign pass: rebuild app/static/index.html with jun-ui bundle-app, preserve local-only behavior, API state hooks, and Codex handoff outputs.",
  },
  "flowforge-content-redesign": {
    title: "FlowForge Content Workspace",
    summary: "A staged content workspace for high-frequency AI content scenes, candidate cards, prompt output, and local-only review.",
    primary: "Content pipeline",
    primaryNote: "Separate candidate selection, draft generation, review, and reuse into visible stages.",
    secondary: "Source and reuse",
    secondaryNote: "Keep scenario, audience, template, and output evidence visible while iterating.",
    action: "Prompt output",
    actionNote: "Keep generated prompts visible even when clipboard access is restricted.",
    modes: [
      ["candidate", "选题"],
      ["draft", "草稿"],
      ["review", "复用"],
    ],
    prompt: "FlowForge content redesign pass: rebuild content-workspace-prototype.html with jun-ui bundle-app while preserving visible prompt output and local-only interaction handlers.",
  },
  "macropulse-redesign": {
    title: "macroPulse Macro Desk",
    summary: "A calm macro observation desk for phase status, thesis review, evidence drivers, AI questions, and saved notes.",
    primary: "Macro phase desk",
    primaryNote: "Keep phase state, active thesis, asset tabs, and current risk readout in a compact operational layout.",
    secondary: "Evidence drivers",
    secondaryNote: "Show source drivers and reflection notes as evidence, not terminal-style decoration.",
    action: "AI question lane",
    actionNote: "Keep next questions and saved notes close to the thesis review.",
    modes: [
      ["phase", "阶段"],
      ["drivers", "驱动"],
      ["questions", "问题"],
    ],
    prompt: "macroPulse redesign pass: add site/macro-desk.html as a file-openable jun-ui bundle, preserving macro seed and reflection concepts beside the Next app.",
  },
  "dubforge-redesign": {
    title: "DubForge Human-Gated Console",
    summary: "A restricted Agent operations console for candidate discovery, production review, retrospective, and closed-loop evidence.",
    primary: "Active gap and queue",
    primaryNote: "Show the workflow gap, queue state, and missing-stage inputs before lower-priority settings.",
    secondary: "Gate evidence",
    secondaryNote: "Mirror AI contract meanings, production review status, and closed-loop readiness evidence.",
    action: "Human gate",
    actionNote: "Keep approve, hold, and next review prompts explicit; the page is not an autonomous publisher.",
    modes: [
      ["candidates", "候选"],
      ["review", "审核"],
      ["loop", "闭环"],
    ],
    prompt: "DubForge redesign pass: add frontend/jun-ui-workbench/index.html as a file-openable human-gated console, preserving existing Vite/Arco app behavior.",
  },
  "project-redesign-starter": {
    title: "Project Redesign Starter",
    summary: "A shared bundle-app seed for rebuilding local workbenches with jun-ui tokens, Semi controls, and file-openable output.",
    primary: "Primary work area",
    primaryNote: "Replace this panel with the target project's central queue, report, or task surface.",
    secondary: "Evidence lane",
    secondaryNote: "Expose freshness, source, and gap evidence near the active work.",
    action: "Next action",
    actionNote: "Keep human-gated next actions copyable and visible.",
    modes: [
      ["overview", "Overview"],
      ["evidence", "Evidence"],
      ["action", "Action"],
    ],
    prompt: "jun-ui redesign pass: replace the project page layer while preserving target data contracts, output paths, and strict verification.",
  },
};

function profileForPage() {
  const pageType = document.body?.dataset?.pageType || "project-redesign-starter";
  return profiles[pageType] || profiles["project-redesign-starter"];
}

function applyProfile(profile) {
  const bindings = [
    ["[data-profile-title]", profile.title],
    ["[data-profile-summary]", profile.summary],
    ["[data-profile-primary]", profile.primary],
    ["[data-profile-primary-note]", profile.primaryNote],
    ["[data-profile-secondary]", profile.secondary],
    ["[data-profile-secondary-note]", profile.secondaryNote],
    ["[data-profile-action]", profile.action],
    ["[data-profile-action-note]", profile.actionNote],
  ];
  for (const [selector, value] of bindings) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function SemiActionStrip() {
  const profile = useMemo(profileForPage, []);
  const [mode, setMode] = useState(profile.modes[0][0]);
  const [message, setMessage] = useState("Select a mode or copy the migration prompt.");
  const { Text } = Typography;
  const activeMode = profile.modes.find(([key]) => key === mode) || profile.modes[0];

  const copyPrompt = async () => {
    await copyText(profile.prompt);
    setMessage("Migration prompt copied. Paste it into the target project rewrite thread.");
  };

  return React.createElement(
    "div",
    { className: "semi-control-panel" },
    React.createElement(
      "div",
      { className: "semi-control-head" },
      React.createElement(Text, { strong: true }, profile.title),
      React.createElement(
        Space,
        null,
        React.createElement(Button, {
          type: "primary",
          icon: React.createElement(IconCopy),
          onClick: copyPrompt,
          "aria-label": "Copy migration prompt",
        }, "复制迁移提示"),
        React.createElement(Button, {
          type: "secondary",
          icon: React.createElement(IconRefresh),
          onClick: () => setMessage("Re-run the target project build, then verify the artifact with --strict."),
          "aria-label": "Show rebuild gate",
        }, "重跑构建"),
        React.createElement(Button, {
          type: "tertiary",
          icon: React.createElement(IconTickCircle),
          onClick: () => setMessage("Gate checklist acknowledged for this redesign seed."),
          "aria-label": "Acknowledge gate checklist",
        }, "核对门禁"),
      ),
    ),
    React.createElement(
      "div",
      { className: "semi-mode-row", role: "group", "aria-label": "Redesign modes" },
      profile.modes.map(([key, label]) =>
        React.createElement(Button, {
          key,
          type: key === mode ? "primary" : "tertiary",
          onClick: () => {
            setMode(key);
            setMessage(`Active mode: ${label}`);
          },
        }, label),
      ),
    ),
    React.createElement("p", { className: "semi-mode-note" }, `Active mode: ${activeMode[1]}`),
    React.createElement("p", { className: "semi-output", id: "starter-output" }, message),
  );
}

const profile = profileForPage();
applyProfile(profile);
const host = document.querySelector("#semi-action-strip");
if (host) {
  createRoot(host).render(React.createElement(SemiActionStrip));
}

