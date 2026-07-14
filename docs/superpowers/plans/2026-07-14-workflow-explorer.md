# TradingAgents Workflow Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy an interactive, Chinese-first browser visualization of the real TradingAgents LangGraph workflow.

**Architecture:** A build-free static site lives in `workflow-explorer/`. Cytoscape.js renders a source-derived graph; `graph-data.js` owns node, edge, prompt, state, and routing metadata; `app.js` owns filtering, simulation, selection, and rendering. All runtime assets are local so the page works offline and can be deployed as a static Vercel project.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, Cytoscape.js 3.30.x, Node.js contract tests, Playwright with system Chrome, Vercel CLI.

---

### Task 1: Static Contract Test

**Files:**
- Create: `workflow-explorer/tests/smoke.mjs`

- [x] Write a Node test that requires the HTML shell, local Cytoscape asset, graph data, bilingual prompts, core route types, and no secret material.
- [x] Run `node workflow-explorer/tests/smoke.mjs`.
- [x] Confirm RED fails because `workflow-explorer/index.html` does not exist.

### Task 2: Source-Derived Graph Data

**Files:**
- Create: `workflow-explorer/graph-data.js`
- Create: `workflow-explorer/vendor/cytoscape.min.js`

- [x] Model input, analyst, tool, research, trader, risk, manager, memory, checkpoint, and output nodes.
- [x] Store each node's source file, model tier, state inputs/outputs, tools, routing rule, Chinese prompt translation, and English source prompt.
- [x] Model fixed, conditional, loop, persistence, and memory edges.
- [x] Vendor Cytoscape.js into `workflow-explorer/vendor/` and avoid CDN references.

### Task 3: Interactive Page

**Files:**
- Create: `workflow-explorer/index.html`
- Create: `workflow-explorer/styles.css`
- Create: `workflow-explorer/app.js`

- [x] Build a dense application shell with analyst filters, research-depth control, simulation controls, graph canvas, legend, and node inspector.
- [x] Render the graph with stable preset positions, phase colors, edge styles, pan, zoom, fit, and selection focus.
- [x] Rebuild analyst sequencing when filters change and update loop labels for Shallow, Medium, and Deep.
- [x] Implement step-through simulation with active/completed styling and readable status.
- [x] Show Chinese prompt by default, English source in a second tab, plus inputs, outputs, tools, routing, and source path.
- [x] Preserve usable layouts at desktop and mobile widths without overlapping text or controls.

### Task 4: Verification

**Files:**
- Modify: `.gitignore`

- [x] Add `.vercel/` to ignore local deployment metadata.
- [x] Run `node workflow-explorer/tests/smoke.mjs`; expect all contract checks to pass.
- [x] Run `git diff --check` and UTF-8/mojibake scans for all Chinese files.
- [x] Open the local page with Playwright and system Chrome at 1440x900 and 390x844.
- [x] Verify graph pixels are nonblank, node selection changes the inspector, depth/filter controls change graph state, simulation advances, and browser console/errors are empty.
- [x] Save desktop and mobile screenshots under `workflow-explorer/artifacts/` for visual inspection, then exclude artifacts from deployment or Git.

### Task 5: Git And Vercel Deployment

**Files:**
- Create: `workflow-explorer/vercel.json`

- [x] Configure static clean URLs and security headers without adding a build step.
- [ ] Commit only the explorer, plan, and `.gitignore` changes; push `main` to the personal fork.
- [ ] Run `vercel --prod --yes` from `workflow-explorer`.
- [ ] Open the production URL with Playwright and system Chrome and repeat the core interaction and console checks.
- [ ] Report the production URL and exact verification evidence.
