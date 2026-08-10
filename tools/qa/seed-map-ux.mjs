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

  const exactCount = await page.locator(".feature-toggle i").count();
  assert(exactCount >= 10, `Expected exact Cubiomes badges in Java mode, found ${exactCount}.`);

  const legendCount = await page.locator(".seed-legend button").count();
  assert(legendCount >= 4, `Expected visible biome legend entries, found ${legendCount}.`);

  const firstSwatch = await page.locator(".seed-legend button i").first().evaluate((node) =>
    getComputedStyle(node).backgroundColor
  );
  const rgb = parseRgb(firstSwatch);
  assert(Boolean(rgb), `Could not parse first legend swatch color: ${firstSwatch}`);
  const colorHits = await countCanvasColor(page, rgb);
  assert(colorHits > 0, "First legend swatch color does not appear in the canvas.");

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
  const bedrockExactBadges = await page.locator(".feature-toggle i").count();
  assert(bedrockExactBadges === 0, "Bedrock mode should not show exact Cubiomes badges.");
  const bedrockHudText = await page.locator(".map-hud").innerText();
  assert(/Bedrock em modo estimado|Bedrock estimated/i.test(bedrockHudText), "Bedrock HUD did not explain estimated mode.");
  await page.locator("label:has-text('Edicao') select").selectOption("java");
  await page.waitForTimeout(500);
  await page.getByTitle("Zoom in").click();
  await page.getByTitle("Zoom in").click();
  await page.waitForTimeout(350);
  const hudText = await page.locator(".map-hud").innerText();
  assert(/Java Cubiomes|Cubiomes|Bedrock|Fallback/i.test(hudText), "Map HUD lost engine status.");

  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(
    JSON.stringify(
      {
        ok: true,
        featureCount,
        exactCount,
        legendCount,
        overworldStats,
        netherStats,
        endStats,
        bedrockStats,
        screenshotPath
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
