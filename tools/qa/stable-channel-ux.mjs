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

const baseUrl = process.env.STABLE_QA_URL ?? "http://127.0.0.1:4173";
const screenshotPath = process.env.STABLE_QA_SCREENSHOT ?? join(process.cwd(), "stable-channel-qa.png");
const mobileScreenshotPath = screenshotPath.replace(/(\.[^.]+)$/, "-mobile$1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() =>
    Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth
  );
  assert(overflow <= 4, `${label} layout has horizontal overflow (${overflow}px).`);
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
    localStorage.setItem(
      "ehm:profile",
      JSON.stringify({
        displayName: "Milo Ruback",
        email: "umruback@gmail.com",
        bio: "Desenvolvedora independente",
        pronouns: "Ela/Dela/Ele/Dela",
        minecraftUsername: "Miloooqwq",
        minecraftUuid: "",
        avatarUrl: ""
      })
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await page.locator(".home-profile-panel").waitFor({ state: "visible" });
  const navText = await page.locator(".nav-list").innerText();
  assert(/Seed Map/i.test(navText), "Stable channel should show Seed Map in navigation.");
  assert(!/Mundos|Worlds/i.test(navText), "Stable channel still shows world maps in navigation.");

  const moduleText = await page.locator(".module-grid").innerText();
  assert(/Seed Map/i.test(moduleText), "Stable home modules should show Seed Map.");
  assert(!/Mundos|Worlds/i.test(moduleText), "Stable home modules still show Worlds.");

  assert(await page.locator(".titlebar-avatar").isVisible(), "Titlebar user avatar is missing.");
  assert(await page.locator(".brand-avatar").isVisible(), "Sidebar user avatar is missing.");

  const profileText = await page.locator(".home-profile-panel").innerText();
  assert(profileText.includes("Milo Ruback"), "Home profile panel does not show display name.");
  assert(profileText.includes("@Miloooqwq"), "Home profile panel does not show Minecraft handle.");
  assert(profileText.includes("Ela/Dela/Ele/Dela"), "Home profile panel does not show pronouns.");
  assert(profileText.includes("Desenvolvedora independente"), "Home profile panel does not show bio.");

  await assertNoHorizontalOverflow(page, "Desktop stable");

  await page.getByRole("button", { name: "Seed Map", exact: true }).first().click();
  await page.locator("canvas.seed-canvas").waitFor({ state: "visible" });
  assert(await page.locator(".seed-library-panel").isVisible(), "Stable Seed Map is missing the seed library.");
  await page.getByRole("button", { name: "Início", exact: true }).first().click();
  await page.locator(".home-profile-panel").waitFor({ state: "visible" });
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".home-profile-panel").waitFor({ state: "visible" });
  await assertNoHorizontalOverflow(page, "Mobile stable");
  await page.screenshot({ path: mobileScreenshotPath, fullPage: true });

  console.log(
    JSON.stringify(
      {
        ok: true,
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
