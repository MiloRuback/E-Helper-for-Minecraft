import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const playwrightRoot = process.env.PLAYWRIGHT_REQUIRE_ROOT;
const require = createRequire(playwrightRoot ? join(playwrightRoot, "package.json") : import.meta.url);
const { chromium } = require("playwright");

const chromePath =
  process.env.PLAYWRIGHT_CHROME_PATH ??
  [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].find((candidate) => existsSync(candidate));

const baseUrl = process.env.SEED_MAP_QA_URL ?? "http://127.0.0.1:4173";
const screenshotPath = process.env.SEED_MAP_QA_SCREENSHOT ?? join(process.cwd(), "seed-map-qa.png");
const mobileScreenshotPath = screenshotPath.replace(/(\.[^.]+)$/, "-mobile$1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseRgb(value) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

async function canvasStats(page) {
  return page.locator("canvas.seed-canvas").evaluate((canvas) => {
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const data = context.getImageData(0, 0, width, height).data;
    const colors = new Set();
    let nonBackground = 0;
    const step = Math.max(4, Math.floor((width * height) / 20000));
    for (let index = 0; index < width * height; index += step) {
      const offset = index * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      colors.add(`${r},${g},${b}`);
      if (!(r < 24 && g < 32 && b < 44)) nonBackground += 1;
    }
    return { width, height, colorCount: colors.size, nonBackground };
  });
}

async function countCanvasColor(page, rgb) {
  return page.locator("canvas.seed-canvas").evaluate((canvas, target) => {
    const context = canvas.getContext("2d");
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hits = 0;
    const step = Math.max(4, Math.floor((canvas.width * canvas.height) / 60000));
    for (let index = 0; index < canvas.width * canvas.height; index += step) {
      const offset = index * 4;
      if (
        Math.abs(data[offset] - target[0]) <= 2 &&
        Math.abs(data[offset + 1] - target[1]) <= 2 &&
        Math.abs(data[offset + 2] - target[2]) <= 2
      ) {
        hits += 1;
      }
    }
    return hits;
  }, rgb);
}

async function markerAverage(page, box) {
  return page.locator("canvas.seed-canvas").evaluate((canvas, markerBox) => {
    const context = canvas.getContext("2d");
    const scaleX = canvas.width / canvas.getBoundingClientRect().width;
    const scaleY = canvas.height / canvas.getBoundingClientRect().height;
    const x = Math.max(0, Math.floor(markerBox.x * scaleX));
    const y = Math.max(0, Math.floor(markerBox.y * scaleY));
    const size = Math.max(4, Math.floor(markerBox.size * Math.min(scaleX, scaleY)));
    const data = context.getImageData(x, y, Math.min(size, canvas.width - x), Math.min(size, canvas.height - y)).data;
    let r = 0;
    let g = 0;
    let b = 0;
    const pixels = data.length / 4;
    for (let index = 0; index < data.length; index += 4) {
      r += data[index];
      g += data[index + 1];
      b += data[index + 2];
    }
    return [r / pixels, g / pixels, b / pixels];
  }, box);
}

function colorDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath || undefined
});
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem(
      "ehm:settings",
      JSON.stringify({
        language: "pt-br",
        theme: "dark",
        firstRunCompleted: true,
        driveSync: false,
        microsoftLinked: false,
        supabaseEnabled: true
      })
    );
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Seed Map", exact: true }).first().click();
  await page.locator("canvas.seed-canvas").waitFor({ state: "visible" });
  await page.waitForTimeout(1400);

  const overworldStats = await canvasStats(page);
  assert(overworldStats.width > 900, "Seed canvas width is too small.");
  assert(overworldStats.height > 500, "Seed canvas height is too small.");
  assert(overworldStats.colorCount > 12, "Seed canvas appears visually flat.");
  assert(overworldStats.nonBackground > 1000, "Seed canvas appears blank.");

  const featureCount = await page.locator(".feature-toggle").count();
  assert(featureCount >= 29, `Expected Chunkbase-style feature toggles, found ${featureCount}.`);
  const featureImageCount = await page.locator(".feature-toggle img.feature-icon").count();
  assert(featureImageCount === featureCount, `Expected image icons for every feature, found ${featureImageCount}/${featureCount}.`);

  const exactTitleCount = await page.locator('.feature-toggle[title*="Cubiomes"]').count();
  assert(exactTitleCount >= 10, `Expected exact Cubiomes feature metadata in Java mode, found ${exactTitleCount}.`);

  const legendCount = await page.locator(".seed-legend button").count();
  assert(legendCount >= 4, `Expected visible biome legend entries, found ${legendCount}.`);

  const firstSwatch = await page.locator(".seed-legend button i").first().evaluate((node) =>
    getComputedStyle(node).backgroundColor
  );
  const rgb = parseRgb(firstSwatch);
  assert(Boolean(rgb), `Could not parse first legend swatch color: ${firstSwatch}`);
  const colorHits = await countCanvasColor(page, rgb);
  assert(colorHits > 0, "First legend swatch color does not appear in the canvas.");

  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas.seed-canvas");
    return Number(canvas?.dataset.markerCount ?? 0) > 0 && Boolean(canvas?.dataset.firstMarker);
  });
  const markerProbe = await page.locator("canvas.seed-canvas").evaluate((canvas) => {
    const [x, y, size] = (canvas.dataset.firstMarker || "").split(",").map(Number);
    return { x, y, size };
  });
  const canvasBox = await page.locator("canvas.seed-canvas").boundingBox();
  assert(Boolean(canvasBox), "Canvas bounding box was unavailable.");
  await page.mouse.move(canvasBox.x + markerProbe.x + markerProbe.size / 2, canvasBox.y + markerProbe.y + markerProbe.size / 2);
  await page.locator(".seed-marker-tooltip").waitFor({ state: "visible" });
  const tooltipText = await page.locator(".seed-marker-tooltip").innerText();
  assert(/X\s+-?\d+/i.test(tooltipText) && /Z\s+-?\d+/i.test(tooltipText), "Marker tooltip does not show coordinates.");
  assert(/Visitado|Visited/i.test(tooltipText), "Marker tooltip does not show visited checkbox.");
  const averageBeforeVisited = await markerAverage(page, markerProbe);
  await page.locator(".seed-visited-toggle input").check();
  await page.waitForTimeout(250);
  const averageAfterVisited = await markerAverage(page, markerProbe);
  assert(colorDistance(averageBeforeVisited, averageAfterVisited) > 3, "Visited marker did not visually change on canvas.");
  const visitedStorage = await page.evaluate(() =>
    Object.entries(localStorage).filter(([key]) => key.startsWith("ehm:seedMapVisited:v1:"))
  );
  assert(visitedStorage.some(([, value]) => value.includes("true")), "Visited marker was not persisted locally.");

  const contentScrollBefore = await page.locator(".content").evaluate((node) => {
    node.scrollTop = 120;
    return node.scrollTop;
  });
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(250);
  const contentScrollAfter = await page.locator(".content").evaluate((node) => node.scrollTop);
  assert(
    Math.abs(contentScrollAfter - contentScrollBefore) <= 1,
    `Mouse wheel over map scrolled page content (${contentScrollBefore} -> ${contentScrollAfter}).`
  );

  const panStart = Date.now();
  await page.mouse.move(canvasBox.x + 420, canvasBox.y + 280);
  await page.mouse.down();
  for (let step = 0; step < 18; step += 1) {
    await page.mouse.move(canvasBox.x + 420 + step * 10, canvasBox.y + 280 + step * 3);
  }
  await page.mouse.up();
  const panElapsed = Date.now() - panStart;
  assert(panElapsed < 2500, `Pan interaction was too slow (${panElapsed}ms).`);

  await page.getByRole("button", { name: /Limpar|Clear/i }).click();
  const activeAfterClear = await page.locator(".feature-toggle.active").count();
  assert(activeAfterClear === 0, "Clear did not disable all visible feature toggles.");
  await page.getByRole("button", { name: /Selecionar tudo|Select all/i }).click();
  const activeAfterSelectAll = await page.locator(".feature-toggle.active").count();
  assert(activeAfterSelectAll === featureCount, "Select all did not re-enable all visible feature toggles.");

  await page.getByRole("button", { name: "Nether" }).click();
  await page.waitForTimeout(900);
  assert(await page.getByRole("button", { name: /Fortaleza|Fortress/i }).isVisible(), "Nether features are missing.");
  const netherStats = await canvasStats(page);
  assert(netherStats.colorCount >= 5, "Nether map did not render enough biome colors.");

  await page.getByRole("button", { name: "End" }).click();
  await page.waitForTimeout(900);
  assert(await page.getByRole("button", { name: /Cidade do End|End City/i }).isVisible(), "End features are missing.");
  const endStats = await canvasStats(page);
  assert(endStats.colorCount >= 4, "End map did not render enough biome colors.");

  await page.getByRole("button", { name: "Overworld" }).click();
  await page.locator("label:has-text('Edicao') select").selectOption("bedrock");
  await page.waitForTimeout(700);
  const bedrockStats = await canvasStats(page);
  assert(bedrockStats.colorCount > 10, "Bedrock estimated map appears visually flat.");
  const bedrockExactTitles = await page.locator('.feature-toggle[title*="Cubiomes"]').count();
  assert(bedrockExactTitles === 0, "Bedrock mode should not expose exact Cubiomes feature metadata.");
  const bedrockHudText = await page.locator(".map-hud").innerText();
  assert(/Bedrock em modo estimado|Bedrock estimated/i.test(bedrockHudText), "Bedrock HUD did not explain estimated mode.");
  await page.locator("label:has-text('Edicao') select").selectOption("java");
  await page.waitForTimeout(500);
  await page.getByTitle("Zoom in").click();
  await page.getByTitle("Zoom in").click();
  await page.waitForTimeout(350);
  const hudText = await page.locator(".map-hud").innerText();
  assert(/Java Cubiomes|Cubiomes|Bedrock|Fallback/i.test(hudText), "Map HUD lost engine status.");

  await page.locator(".content").evaluate((node) => {
    node.scrollTop = 0;
  });
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Seed Map/i }).last().click();
  await page.locator("canvas.seed-canvas").waitFor({ state: "visible" });
  await page.waitForTimeout(1200);
  const mobileStats = await canvasStats(page);
  assert(mobileStats.width > 260, "Mobile canvas width is too small.");
  assert(mobileStats.height >= 420, "Mobile canvas height is too small.");
  assert(mobileStats.colorCount > 8, "Mobile canvas appears visually flat.");
  const mobileFeatureImageCount = await page.locator(".feature-toggle img.feature-icon").count();
  assert(mobileFeatureImageCount >= 20, "Mobile feature icon grid did not render enough image icons.");
  const horizontalOverflow = await page.evaluate(() =>
    Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth
  );
  assert(horizontalOverflow <= 4, `Mobile layout has horizontal overflow (${horizontalOverflow}px).`);
  await page.screenshot({ path: mobileScreenshotPath, fullPage: true });

  console.log(
    JSON.stringify(
      {
        ok: true,
        featureCount,
        exactTitleCount,
        legendCount,
        overworldStats,
        netherStats,
        endStats,
        bedrockStats,
        mobileStats,
        screenshotPath,
        mobileScreenshotPath
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
