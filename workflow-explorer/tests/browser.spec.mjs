import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const localPageUrl = pathToFileURL(path.resolve(here, "..", "index.html")).href;
const pageUrl = process.env.WORKFLOW_EXPLORER_URL || localPageUrl;
const artifacts = path.resolve(here, "..", "artifacts");

async function assertCanvasHasGraphPixels(page) {
  const samplePixels = () => page.evaluate(() => {
    const canvases = [...document.querySelectorAll("#workflow-canvas canvas")];
    let colored = 0;
    let opaque = 0;
    for (const canvas of canvases) {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context || !canvas.width || !canvas.height) continue;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const stride = Math.max(4, Math.floor(pixels.length / 80_000 / 4) * 4);
      for (let index = 0; index < pixels.length; index += stride) {
        const alpha = pixels[index + 3];
        if (alpha > 0) opaque += 1;
        if (alpha > 0 && (pixels[index] < 235 || pixels[index + 1] < 235 || pixels[index + 2] < 235)) colored += 1;
      }
    }
    return { canvasCount: canvases.length, colored, opaque };
  });

  await expect.poll(async () => {
    const result = await samplePixels();
    return result.canvasCount > 0 && result.opaque > 300 && result.colored > 100;
  }, { message: "Cytoscape should finish its first nonblank canvas frame" }).toBe(true);

  const result = await samplePixels();
  expect(result.canvasCount).toBeGreaterThan(0);
  expect(result.opaque).toBeGreaterThan(300);
  expect(result.colored).toBeGreaterThan(100);
}

async function clickGraphNode(page, id) {
  const point = await page.evaluate((nodeId) => {
    const node = globalThis.WorkflowExplorer.graph.$id(nodeId);
    const position = node.renderedPosition();
    const box = document.querySelector("#workflow-canvas").getBoundingClientRect();
    return { x: box.left + position.x, y: box.top + position.y };
  }, id);
  await page.mouse.click(point.x, point.y);
}

async function assertGraphFitsCanvas(page) {
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector("#workflow-canvas").getBoundingClientRect();
    const graph = globalThis.WorkflowExplorer.graph;
    const nodes = graph.nodes().map((node) => {
      const box = node.renderedBoundingBox();
      return { id: node.id(), x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2 };
    });
    return { width: canvas.width, height: canvas.height, nodes };
  });

  expect(layout.nodes).toHaveLength(19);
  for (const node of layout.nodes) {
    expect(node.x1, `${node.id} left edge`).toBeGreaterThanOrEqual(4);
    expect(node.y1, `${node.id} top edge`).toBeGreaterThanOrEqual(4);
    expect(node.x2, `${node.id} right edge`).toBeLessThanOrEqual(layout.width - 4);
    expect(node.y2, `${node.id} bottom edge`).toBeLessThanOrEqual(layout.height - 4);
  }
}

test("desktop graph renders and core interactions update state", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(pageUrl);
  await expect(page.locator("#workflow-canvas canvas").first()).toBeVisible();
  await assertCanvasHasGraphPixels(page);
  await assertGraphFitsCanvas(page);
  await page.screenshot({ path: path.join(artifacts, "desktop.png"), fullPage: true });

  await clickGraphNode(page, "market");
  await expect(page.locator("#detail-title")).toHaveText("市场分析师");
  await expect(page.locator("#detail-prompt")).toContainText("get_verified_market_snapshot");

  await page.getByRole("tab", { name: "英文原文" }).click();
  await expect(page.locator("#detail-prompt")).toContainText("verified_market_snapshot");

  await page.getByRole("button", { name: "深" }).click();
  await expect(page.locator("#research-turns")).toHaveText("10 次");
  await expect(page.locator("#risk-turns")).toHaveText("15 次");

  await page.getByRole("checkbox", { name: "基本面" }).uncheck();
  await expect.poll(() => page.evaluate(() => globalThis.WorkflowExplorer.graph.$id("fundamentals").length)).toBe(0);

  await page.getByRole("button", { name: "单步执行" }).click();
  await expect(page.locator("#simulation-status")).toContainText("运行输入");
  await expect.poll(() => page.evaluate(() => globalThis.WorkflowExplorer.graph.nodes(".active-step").length)).toBe(1);

  await page.screenshot({ path: path.join(artifacts, "desktop-interaction.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("mobile layout remains readable and interactive", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl);
  await expect(page.locator("#workflow-canvas canvas").first()).toBeVisible();
  await assertCanvasHasGraphPixels(page);
  await page.getByRole("button", { name: "中" }).click();
  await expect(page.locator("#round-summary")).toHaveText("3 + 3 轮");
  await page.evaluate(() => globalThis.WorkflowExplorer.selectNode("portfolio-manager"));
  await expect(page.locator("#detail-title")).toHaveText("投资组合经理");

  const overflow = await page.evaluate(() => {
    const header = document.querySelector(".app-header");
    const inspector = document.querySelector(".inspector");
    return {
      bodyWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      headerBottom: header.getBoundingClientRect().bottom,
      inspectorWidth: inspector.getBoundingClientRect().width,
    };
  });
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  expect(overflow.headerBottom).toBeGreaterThan(50);
  expect(overflow.inspectorWidth).toBeGreaterThan(350);

  await page.screenshot({ path: path.join(artifacts, "mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});
