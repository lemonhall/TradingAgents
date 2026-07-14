import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const html = read("index.html");
const css = read("styles.css");
const app = read("app.js");
const dataSource = read("graph-data.js");
const vendor = path.join(root, "vendor", "cytoscape.min.js");

assert.match(html, /id="workflow-canvas"/, "graph canvas is required");
assert.match(html, /id="node-inspector"/, "node inspector is required");
assert.match(html, /data-depth="1"/, "shallow depth control is required");
assert.match(html, /data-depth="3"/, "medium depth control is required");
assert.match(html, /data-depth="5"/, "deep depth control is required");
assert.match(html, /vendor\/cytoscape\.min\.js/, "Cytoscape must load locally");
assert.doesNotMatch(html, /https?:\/\//, "runtime HTML must not depend on a CDN");
assert.ok(fs.statSync(vendor).size > 100_000, "vendored Cytoscape asset looks incomplete");
assert.match(css, /@media\s*\(max-width:\s*760px\)/, "mobile layout is required");
assert.match(app, /cytoscape\s*\(/, "app must initialize Cytoscape");
assert.match(app, /runSimulation/, "step simulation is required");

const sandbox = { globalThis: {} };
vm.runInNewContext(dataSource, sandbox, { filename: "graph-data.js" });
const data = sandbox.globalThis.WorkflowData;
assert.ok(data, "graph data must export WorkflowData");
assert.ok(data.nodes.length >= 18, "workflow must expose all major nodes");
assert.ok(data.edges.some((edge) => edge.kind === "conditional"), "conditional routes required");
assert.ok(data.edges.some((edge) => edge.kind === "loop"), "loop routes required");
assert.ok(data.edges.some((edge) => edge.kind === "persistence"), "checkpoint routes required");

const requiredAgents = [
  "market", "sentiment", "news", "fundamentals", "bull", "bear",
  "research-manager", "trader", "aggressive", "conservative", "neutral",
  "portfolio-manager",
];
for (const id of requiredAgents) {
  const node = data.nodes.find((item) => item.id === id);
  assert.ok(node, `missing node: ${id}`);
  assert.ok(node.promptZh.length > 80, `${id} needs a substantial Chinese prompt`);
  assert.ok(node.promptEn.length > 40, `${id} needs its English source prompt`);
  assert.match(node.source, /^tradingagents\//, `${id} needs a source path`);
}

const allText = `${html}\n${css}\n${app}\n${dataSource}`;
assert.doesNotMatch(allText, /OPENAI_COMPATIBLE_API_KEY\s*=|sk-[A-Za-z0-9_-]{12,}/, "no API secrets allowed");

console.log(`workflow explorer contract passed: ${data.nodes.length} nodes, ${data.edges.length} edges`);
