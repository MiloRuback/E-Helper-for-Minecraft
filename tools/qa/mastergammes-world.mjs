import { existsSync } from "node:fs";
import { join } from "node:path";

const worldPath =
  process.env.MASTERGAMMES_WORLD_PATH ??
  join(
    process.env.TEMP ?? process.env.TMP ?? "",
    "ehm-world-mastergammes-275",
    "MasterGammes 275"
  );

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  existsSync(worldPath),
  `MasterGammes world folder not found. Set MASTERGAMMES_WORLD_PATH. Checked: ${worldPath}`
);

const { inspectWorldFolder } = await import("../../dist-electron/main/worldScanner.js");
const startedAt = Date.now();
const summary = await inspectWorldFolder(worldPath);

assert(summary.ok, summary.error ?? "World scanner returned an unknown error.");
assert(summary.name, "World name was not read.");
assert(summary.dimensions?.length === 3, "Expected Overworld, Nether and End summaries.");

const dimensions = Object.fromEntries(summary.dimensions.map((dimension) => [dimension.key, dimension]));
assert(dimensions.overworld?.regions.length > 0, "Overworld regions were not detected.");
assert(dimensions.nether?.regions.length > 0, "Nether regions were not detected.");
assert(dimensions.end?.regions.length > 0, "End regions were not detected.");
assert(dimensions.overworld.totalChunks > 0, "Overworld chunks were not counted.");

const allRegions = summary.dimensions.flatMap((dimension) => dimension.regions);
const sampledRegions = allRegions.filter((region) => (region.sampledChunks ?? 0) > 0);
const biomeRegions = allRegions.filter((region) => (region.topBiomes?.length ?? 0) > 0);
const heightRegions = allRegions.filter((region) => region.averageHeight !== undefined);
const structureRegions = allRegions.filter(
  (region) => (region.topStructures?.length ?? 0) > 0
);
const sampleStructures = Array.from(
  new Set(
    structureRegions
      .flatMap((region) => region.topStructures ?? [])
      .map((structure) => structure.id)
  )
).slice(0, 12);

assert(sampledRegions.length > 0, "No chunk samples were read from the real world.");
assert(biomeRegions.length > 0, "No biome palettes were read from the real world.");
assert(heightRegions.length > 0, "No heightmap data was read from the real world.");
assert(
  !sampleStructures.some((structure) => structure.toLowerCase().includes("invalid")),
  `Invalid placeholder structures leaked into the result: ${sampleStructures.join(", ")}`
);

const result = {
  ok: true,
  worldPath,
  elapsedMs: Date.now() - startedAt,
  name: summary.name,
  seed: summary.seed,
  spawn: summary.spawn,
  gameMode: summary.gameMode,
  dimensions: summary.dimensions.map((dimension) => ({
    key: dimension.key,
    regions: dimension.regions.length,
    totalChunks: dimension.totalChunks,
    sampledRegions: dimension.regions.filter((region) => (region.sampledChunks ?? 0) > 0)
      .length
  })),
  sampledRegions: sampledRegions.length,
  biomeRegions: biomeRegions.length,
  heightRegions: heightRegions.length,
  structureRegions: structureRegions.length,
  sampleStructures
};

console.log(JSON.stringify(result, null, 2));
