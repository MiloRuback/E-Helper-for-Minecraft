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

const baseUrl = process.env.SKIN_QA_URL ?? "http://127.0.0.1:4173";
const screenshotPath = process.env.SKIN_QA_SCREENSHOT ?? join(process.cwd(), "skin-library-qa.png");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function skinCanvasStats(page) {
  return page.locator("canvas.skin-canvas").evaluate((canvas) => {
    const context = canvas.getContext("2d");
    const data = context.getImageData(0, 0, 64, 64).data;
    const colors = new Set();
    let opaque = 0;
    for (let index = 0; index < 64 * 64; index += 1) {
      const offset = index * 4;
      if (data[offset + 3] <= 0) continue;
      opaque += 1;
      colors.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]},${data[offset + 3]}`);
    }
    return { opaque, colorCount: colors.size };
  });
}

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath || undefined
});
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
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
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Skins", exact: true }).first().click();
  await page.locator("canvas.skin-canvas").waitFor({ state: "visible" });
  await page.waitForTimeout(1200);

  const steveStats = await skinCanvasStats(page);
  assert(steveStats.opaque > 900, `Original Steve template looks too empty: ${JSON.stringify(steveStats)}.`);
  assert(steveStats.colorCount > 12, `Original Steve template lacks color detail: ${JSON.stringify(steveStats)}.`);

  await page.getByRole("button", { name: "Alex" }).click();
  await page.waitForTimeout(700);
  const alexStats = await skinCanvasStats(page);
  assert(alexStats.opaque > 900, `Original Alex template looks too empty: ${JSON.stringify(alexStats)}.`);
  assert(alexStats.colorCount > 12, `Original Alex template lacks color detail: ${JSON.stringify(alexStats)}.`);

  assert(await page.locator("text=Biblioteca de skins").isVisible(), "Cloud skin library is missing.");
  assert(await page.getByRole("button", { name: /Salvar agora|Save now/i }).isVisible(), "Cloud save button is missing.");
  assert(await page.getByRole("button", { name: /Atualizar|Refresh/i }).isVisible(), "Cloud refresh button is missing.");

  const horizontalOverflow = await page.evaluate(() =>
    Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth
  );
  assert(horizontalOverflow <= 4, `Skin page has horizontal overflow (${horizontalOverflow}px).`);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(JSON.stringify({ ok: true, steveStats, alexStats, screenshotPath }, null, 2));
} finally {
  await browser.close();
}
