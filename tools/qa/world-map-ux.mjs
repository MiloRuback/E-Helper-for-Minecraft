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

const baseUrl = process.env.WORLD_QA_URL ?? "http://127.0.0.1:4173";
const screenshotPath = process.env.WORLD_QA_SCREENSHOT ?? join(process.cwd(), "world-map-qa.png");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function region(name, x, z, biome, structure) {
  return {
    fileName: name,
    x,
    z,
    chunks: 900 + Math.abs(x * 17 + z * 9),
    lastModified: new Date().toISOString(),
    sampledChunks: 48,
    minHeight: 49 + ((x + z) % 9),
    maxHeight: 118 + Math.abs(x - z) * 8,
    averageHeight: 72 + x * 5 - z * 3,
    topBiomes: [{ id: biome, count: 30 }],
    topStructures: structure ? [{ id: structure, count: 2 }] : [],
    samples: Array.from({ length: 48 }).map((_, index) => {
      const localX = (index * 7) % 32;
      const localZ = Math.floor((index * 11) % 32);
      return {
        chunkX: x * 32 + localX,
        chunkZ: z * 32 + localZ,
        averageHeight: 58 + ((index + x * 5 - z * 3) % 58),
        minHeight: 40,
        maxHeight: 128,
        biome,
        structures: structure && index % 17 === 0 ? [structure] : []
      };
    })
  };
}

async function canvasStats(page) {
  return page.locator("canvas.region-map").evaluate((canvas) => {
    const context = canvas.getContext("2d");
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    let nonBackground = 0;
    const step = Math.max(4, Math.floor((canvas.width * canvas.height) / 20000));
    for (let index = 0; index < canvas.width * canvas.height; index += step) {
      const offset = index * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      colors.add(`${r},${g},${b}`);
      if (!(r < 24 && g < 32 && b < 44)) nonBackground += 1;
    }
    return { width: canvas.width, height: canvas.height, colorCount: colors.size, nonBackground };
  });
}

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath || undefined
});
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate((mockWorld) => {
    localStorage.clear();
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
    localStorage.setItem("ehm:world", JSON.stringify(mockWorld));
  }, {
    ok: true,
    path: "C:\\Minecraft\\saves\\QA",
    name: "QA Terrain World",
    seed: "5906562593331154958",
    spawn: { x: 128, y: 72, z: -96 },
    gameMode: "Survival",
    dimensions: [
      {
        key: "overworld",
        label: "Overworld",
        path: "region",
        totalChunks: 4200,
        regions: [
          region("r.-1.-1.mca", -1, -1, "minecraft:forest", "minecraft:village"),
          region("r.0.-1.mca", 0, -1, "minecraft:plains", "minecraft:mineshaft"),
          region("r.-1.0.mca", -1, 0, "minecraft:river", ""),
          region("r.0.0.mca", 0, 0, "minecraft:mountains", "minecraft:stronghold")
        ]
      },
      { key: "nether", label: "Nether", path: "DIM-1/region", totalChunks: 0, regions: [] },
      { key: "end", label: "The End", path: "DIM1/region", totalChunks: 0, regions: [] }
    ]
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Mundos", exact: true }).first().click();
  await page.locator("canvas.region-map").waitFor({ state: "visible" });
  await page.waitForTimeout(900);
  const stats = await canvasStats(page);
  assert(stats.colorCount > 20, `World map appears visually flat: ${JSON.stringify(stats)}.`);
  assert(stats.nonBackground > 1000, `World map appears blank: ${JSON.stringify(stats)}.`);
  assert(await page.locator(".world-map-hud").isVisible(), "World map HUD is missing.");
  assert(await page.locator(".world-map-legend").isVisible(), "World map legend is missing.");
  await page.locator("canvas.region-map").click({ position: { x: 610, y: 320 } });
  await page.waitForTimeout(300);
  const targetText = await page.locator(".tool-panel").last().innerText();
  assert(/Estruturas|Structures/i.test(targetText), "Selected region panel does not show structures.");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(JSON.stringify({ ok: true, stats, screenshotPath }, null, 2));
} finally {
  await browser.close();
}
