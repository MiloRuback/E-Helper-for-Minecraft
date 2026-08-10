import { promises as fs } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import type {
  DimensionSummary,
  RegionSummary,
  WorldDimensionKey,
  WorldSummary
} from "../shared/contracts.js";

const REGION_SECTOR_BYTES = 4096;
const REGION_CHUNK_COUNT = 1024;
const MAX_SAMPLED_CHUNKS_PER_REGION = 48;

interface ChunkLocation {
  index: number;
  offset: number;
  sectors: number;
}

interface ChunkSample {
  localX: number;
  localZ: number;
  averageHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  biomes: string[];
  structures: string[];
}

interface RegionAnalysis {
  chunks: number;
  sampledChunks: number;
  minHeight?: number;
  maxHeight?: number;
  averageHeight?: number;
  topBiomes?: Array<{
    id: string;
    count: number;
  }>;
  topStructures?: Array<{
    id: string;
    count: number;
  }>;
  samples: ChunkSample[];
}

interface HeightStats {
  average?: number;
  min?: number;
  max?: number;
}

type PrismarineNbtParser = {
  parse: (data: Buffer) => Promise<{ parsed?: unknown } | unknown>;
  simplify: (value: unknown) => Record<string, unknown>;
};

let prismarineNbtParser: Promise<PrismarineNbtParser> | null = null;

export async function inspectWorldFolder(folderPath: string): Promise<WorldSummary> {
  try {
    const level = await parseLevelDat(path.join(folderPath, "level.dat"));
    const dimensions = await Promise.all([
      scanDimension("overworld", "Overworld", path.join(folderPath, "region")),
      scanDimension("nether", "Nether", path.join(folderPath, "DIM-1", "region")),
      scanDimension("end", "The End", path.join(folderPath, "DIM1", "region"))
    ]);

    return {
      ok: true,
      path: folderPath,
      name: level.name ?? path.basename(folderPath),
      seed: level.seed,
      spawn: level.spawn,
      gameMode: level.gameMode,
      dimensions
    };
  } catch (error) {
    return {
      ok: false,
      path: folderPath,
      error: error instanceof Error ? error.message : "Falha ao ler o mundo."
    };
  }
}

async function parseLevelDat(levelPath: string) {
  const exists = await existsPath(levelPath);
  if (!exists) {
    return {
      name: undefined,
      seed: undefined,
      spawn: undefined,
      gameMode: undefined
    };
  }

  const raw = await fs.readFile(levelPath);
  const nbt = (await import("prismarine-nbt")) as unknown as {
    parse: (data: Buffer) => Promise<{ parsed?: unknown } | unknown>;
    simplify: (value: unknown) => Record<string, unknown>;
  };

  const buffers = [raw, tryInflate(raw, "gunzip"), tryInflate(raw, "inflate")].filter(
    Boolean
  ) as Buffer[];

  for (const buffer of buffers) {
    try {
      const parsed = await nbt.parse(buffer);
      const simplified = nbt.simplify(
        typeof parsed === "object" && parsed !== null && "parsed" in parsed
          ? (parsed as { parsed?: unknown }).parsed
          : parsed
      );
      const data = (simplified.Data ?? simplified) as Record<string, unknown>;
      const worldGen = (data.WorldGenSettings ?? {}) as Record<string, unknown>;

      return {
        name: valueAsString(data.LevelName),
        seed: valueAsString(worldGen.seed ?? data.RandomSeed),
        spawn: {
          x: valueAsNumber(data.SpawnX),
          y: valueAsNumber(data.SpawnY),
          z: valueAsNumber(data.SpawnZ)
        },
        gameMode: gameModeName(valueAsNumber(data.GameType))
      };
    } catch {
      continue;
    }
  }

  return {
    name: undefined,
    seed: undefined,
    spawn: undefined,
    gameMode: undefined
  };
}

function tryInflate(buffer: Buffer, type: "gunzip" | "inflate") {
  try {
    return type === "gunzip" ? zlib.gunzipSync(buffer) : zlib.inflateSync(buffer);
  } catch {
    return null;
  }
}

async function scanDimension(
  key: WorldDimensionKey,
  label: string,
  regionPath: string
): Promise<DimensionSummary> {
  const exists = await existsPath(regionPath);
  if (!exists) {
    return { key, label, path: null, regions: [], totalChunks: 0 };
  }

  const files = await fs.readdir(regionPath);
  const regions: RegionSummary[] = [];

  for (const fileName of files) {
    const match = /^r\.(-?\d+)\.(-?\d+)\.mca$/i.exec(fileName);
    if (!match) continue;

    const fullPath = path.join(regionPath, fileName);
    const stat = await fs.stat(fullPath);
    const analysis = await analyzeRegionFile(fullPath);
    regions.push({
      fileName,
      x: Number(match[1]),
      z: Number(match[2]),
      chunks: analysis.chunks,
      lastModified: stat.mtime.toISOString(),
      sampledChunks: analysis.sampledChunks || undefined,
      minHeight: analysis.minHeight,
      maxHeight: analysis.maxHeight,
      averageHeight: analysis.averageHeight,
      topBiomes: analysis.topBiomes,
      topStructures: analysis.topStructures,
      samples: analysis.samples.map((sample) => ({
        chunkX: Number(match[1]) * 32 + sample.localX,
        chunkZ: Number(match[2]) * 32 + sample.localZ,
        minHeight: sample.minHeight,
        maxHeight: sample.maxHeight,
        averageHeight: sample.averageHeight,
        biome: sample.biomes[0],
        structures: sample.structures
      }))
    });
  }

  regions.sort((a, b) => a.z - b.z || a.x - b.x);

  return {
    key,
    label,
    path: regionPath,
    regions,
    totalChunks: regions.reduce((sum, region) => sum + region.chunks, 0)
  };
}

async function analyzeRegionFile(filePath: string): Promise<RegionAnalysis> {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(REGION_SECTOR_BYTES);
    await handle.read(buffer, 0, REGION_SECTOR_BYTES, 0);
    const locations: ChunkLocation[] = [];
    for (let i = 0; i < REGION_CHUNK_COUNT; i += 1) {
      const offset = buffer.readUIntBE(i * 4, 3);
      const sectorCount = buffer[i * 4 + 3];
      if (offset > 0 && sectorCount > 0) {
        locations.push({ index: i, offset, sectors: sectorCount });
      }
    }

    const heightValues: number[] = [];
    const biomeCounts = new Map<string, number>();
    const structureCounts = new Map<string, number>();
    const samples: ChunkSample[] = [];
    let sampledChunks = 0;

    for (const location of spreadSample(locations, MAX_SAMPLED_CHUNKS_PER_REGION)) {
      const sample = await readChunkSample(handle, location);
      if (!sample) continue;
      sampledChunks += 1;
      samples.push(sample);
      if (sample.averageHeight !== undefined) heightValues.push(sample.averageHeight);
      sample.biomes.forEach((biome) => {
        biomeCounts.set(biome, (biomeCounts.get(biome) ?? 0) + 1);
      });
      sample.structures.forEach((structure) => {
        structureCounts.set(structure, (structureCounts.get(structure) ?? 0) + 1);
      });
    }

    const minHeight = heightValues.length ? Math.min(...heightValues) : undefined;
    const maxHeight = heightValues.length ? Math.max(...heightValues) : undefined;
    const averageHeight = heightValues.length
      ? Math.round(
          heightValues.reduce((sum, value) => sum + value, 0) / heightValues.length
        )
      : undefined;

    return {
      chunks: locations.length,
      sampledChunks,
      minHeight,
      maxHeight,
      averageHeight,
      topBiomes: Array.from(biomeCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([id, count]) => ({ id, count })),
      topStructures: Array.from(structureCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([id, count]) => ({ id, count })),
      samples
    };
  } finally {
    await handle.close();
  }
}

async function readChunkSample(
  handle: FileHandle,
  location: ChunkLocation
): Promise<ChunkSample | null> {
  try {
    const header = Buffer.alloc(5);
    const byteOffset = location.offset * REGION_SECTOR_BYTES;
    const { bytesRead } = await handle.read(header, 0, header.length, byteOffset);
    if (bytesRead < header.length) return null;

    const length = header.readUInt32BE(0);
    const compression = header[4];
    const maxLength = location.sectors * REGION_SECTOR_BYTES - 5;
    if (length <= 1 || length - 1 > maxLength) return null;

    const compressed = Buffer.alloc(length - 1);
    await handle.read(compressed, 0, compressed.length, byteOffset + 5);

    let payload: Buffer;
    if (compression === 1) payload = zlib.gunzipSync(compressed);
    else if (compression === 2) payload = zlib.inflateSync(compressed);
    else if (compression === 3) payload = compressed;
    else return null;

    const nbt = await getPrismarineNbtParser();
    const parsed = await nbt.parse(payload);
    const simplified = nbt.simplify(
      typeof parsed === "object" && parsed !== null && "parsed" in parsed
        ? (parsed as { parsed?: unknown }).parsed
        : parsed
    );
    const chunk = asRecord(simplified.Level ?? simplified);
    const heightStats = extractHeightStats(chunk);

    return {
      localX: location.index % 32,
      localZ: Math.floor(location.index / 32),
      averageHeight: heightStats.average,
      minHeight: heightStats.min,
      maxHeight: heightStats.max,
      biomes: extractBiomeNames(chunk),
      structures: extractStructureNames(chunk)
    };
  } catch {
    return null;
  }
}

async function getPrismarineNbtParser() {
  prismarineNbtParser ??= import("prismarine-nbt").then((module) => {
    const candidate = (module as unknown as { default?: PrismarineNbtParser }).default;
    return (candidate ?? module) as unknown as PrismarineNbtParser;
  });
  return prismarineNbtParser;
}

function spreadSample<T>(items: T[], limit: number) {
  if (items.length <= limit) return items;
  const selected: T[] = [];
  const used = new Set<number>();
  const step = (items.length - 1) / Math.max(1, limit - 1);
  for (let i = 0; i < limit; i += 1) {
    const index = Math.min(items.length - 1, Math.round(i * step));
    if (!used.has(index)) {
      used.add(index);
      selected.push(items[index]);
    }
  }
  return selected;
}

function extractHeightStats(chunk: Record<string, unknown>): HeightStats {
  const legacyHeights = numberArrayFromValue(chunk.HeightMap ?? chunk.heightMap).filter(
    (height) => Number.isFinite(height) && height > -128 && height < 1024
  );
  if (legacyHeights.length) return heightStatsFromValues(legacyHeights);

  const heightmaps = asRecord(chunk.Heightmaps ?? chunk.heightmaps);
  const packed = packedLongArray(
    heightmaps.WORLD_SURFACE ??
      heightmaps.MOTION_BLOCKING_NO_LEAVES ??
      heightmaps.MOTION_BLOCKING ??
      heightmaps.OCEAN_FLOOR
  );
  if (!packed.length) return {};

  const heights = unpackHeightmap(packed).filter(
    (height) => Number.isFinite(height) && height > -128 && height < 1024
  );
  if (!heights.length) return extractSectionHeightStats(chunk);

  return heightStatsFromValues(heights);
}

function extractSectionHeightStats(chunk: Record<string, unknown>): HeightStats {
  const occupiedSectionYs = asArray(chunk.sections ?? chunk.Sections)
    .map((section) => {
      const sectionRecord = asRecord(section);
      const sectionY = valueAsNumber(sectionRecord.Y ?? sectionRecord.y);
      if (sectionY === undefined || !sectionHasTerrain(sectionRecord)) return null;
      return sectionY;
    })
    .filter((sectionY): sectionY is number => sectionY !== null);

  if (!occupiedSectionYs.length) return {};

  const min = Math.min(...occupiedSectionYs) * 16;
  const max = (Math.max(...occupiedSectionYs) + 1) * 16 - 1;
  return {
    min,
    max,
    average: Math.round((min + max) / 2)
  };
}

function sectionHasTerrain(section: Record<string, unknown>) {
  const blockStates = asRecord(section.block_states ?? section.BlockStates);
  const palette = asArray(
    blockStates.palette ??
      blockStates.Palette ??
      section.palette ??
      section.Palette
  );
  if (palette.length) {
    return palette.some((entry) => !isAirBlockName(blockNameFromPaletteEntry(entry)));
  }

  const legacyBlocks = numberArrayFromValue(section.Blocks ?? section.blocks);
  return legacyBlocks.some((blockId) => blockId !== 0);
}

function blockNameFromPaletteEntry(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return valueAsString(record.Name ?? record.name);
  }
  return undefined;
}

function isAirBlockName(name?: string) {
  if (!name) return false;
  return (
    name === "minecraft:air" ||
    name === "minecraft:cave_air" ||
    name === "minecraft:void_air" ||
    name === "air"
  );
}

function heightStatsFromValues(heights: number[]): HeightStats {
  return {
    min: Math.min(...heights),
    max: Math.max(...heights),
    average: Math.round(
      heights.reduce((sum, height) => sum + height, 0) / heights.length
    )
  };
}

function numberArrayFromValue(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map(valueAsNumber)
      .filter((item): item is number => item !== undefined && Number.isFinite(item));
  }
  if (ArrayBuffer.isView(value) && "length" in value) {
    return Array.from(value as unknown as ArrayLike<number>);
  }
  if (value && typeof value === "object" && "value" in value) {
    return numberArrayFromValue((value as { value?: unknown }).value);
  }
  return [];
}

function unpackHeightmap(values: bigint[]) {
  const bitsPerValue = Math.max(
    9,
    Math.min(16, Math.floor((values.length * 64) / 256))
  );
  const valuesPerLong = Math.max(1, Math.floor(64 / bitsPerValue));
  const mask = (1n << BigInt(bitsPerValue)) - 1n;
  const heights: number[] = [];

  for (let i = 0; i < 256; i += 1) {
    const longIndex = Math.floor(i / valuesPerLong);
    const startBit = (i % valuesPerLong) * bitsPerValue;
    const current = BigInt.asUintN(64, values[longIndex] ?? 0n);
    const raw = current >> BigInt(startBit);
    heights.push(Number(raw & mask));
  }

  return heights;
}

function packedLongArray(value: unknown): bigint[] {
  if (Array.isArray(value)) {
    return value
      .map(bigIntFromValue)
      .filter((item): item is bigint => item !== null);
  }
  if (value && typeof value === "object" && "value" in value) {
    return packedLongArray((value as { value?: unknown }).value);
  }
  return [];
}

function bigIntFromValue(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+n?$/.test(value)) {
    return BigInt(value.replace(/n$/, ""));
  }
  if (value && typeof value === "object" && "value" in value) {
    return bigIntFromValue((value as { value?: unknown }).value);
  }
  if (value && typeof value === "object" && typeof value.toString === "function") {
    const text = value.toString();
    if (/^-?\d+n?$/.test(text)) return BigInt(text.replace(/n$/, ""));
  }
  return null;
}

function extractBiomeNames(chunk: Record<string, unknown>) {
  const counts = new Map<string, number>();
  const sections = asArray(chunk.sections ?? chunk.Sections);

  sections.forEach((section) => {
    const sectionRecord = asRecord(section);
    const biomes = asRecord(sectionRecord.biomes ?? sectionRecord.Biomes);
    const palette = asArray(biomes.palette ?? biomes.Palette);
    palette.forEach((entry) => {
      const biome = biomeNameFromValue(entry);
      if (biome) counts.set(biome, (counts.get(biome) ?? 0) + 1);
    });
  });

  asArray(chunk.Biomes ?? chunk.biomes).forEach((entry) => {
    const biome = biomeNameFromValue(entry);
    if (biome) counts.set(biome, (counts.get(biome) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([biome]) => biome);
}

function extractStructureNames(chunk: Record<string, unknown>) {
  const names = new Set<string>();
  const structures = asRecord(chunk.structures ?? chunk.Structures);
  const starts = asRecord(structures.starts ?? structures.Starts);

  Object.entries(starts).forEach(([key, value]) => {
    const record = asRecord(value);
    const rawId = valueAsString(record.id) ?? valueAsString(record.Id) ?? key;
    const id = normalizeStructureId(rawId);
    if (id && id.toLowerCase() !== "invalid" && id.toLowerCase() !== "minecraft:invalid") {
      names.add(id);
    }
  });

  return Array.from(names).sort();
}

function normalizeStructureId(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  const legacy: Record<string, string> = {
    Village: "minecraft:village",
    Mineshaft: "minecraft:mineshaft",
    Mansion: "minecraft:mansion",
    Monument: "minecraft:ocean_monument",
    Stronghold: "minecraft:stronghold",
    Temple: "minecraft:temple",
    Fortress: "minecraft:fortress",
    EndCity: "minecraft:end_city"
  };
  return legacy[clean] ?? clean;
}

function biomeNameFromValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return legacyBiomeName(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return valueAsString(record.Name ?? record.name) ?? null;
  }
  return null;
}

function legacyBiomeName(id: number) {
  const biomes: Record<number, string> = {
    0: "minecraft:ocean",
    1: "minecraft:plains",
    2: "minecraft:desert",
    3: "minecraft:mountains",
    4: "minecraft:forest",
    5: "minecraft:taiga",
    6: "minecraft:swamp",
    7: "minecraft:river",
    12: "minecraft:snowy_plains",
    14: "minecraft:mushroom_fields",
    16: "minecraft:beach",
    21: "minecraft:jungle",
    27: "minecraft:birch_forest",
    29: "minecraft:dark_forest",
    32: "minecraft:savanna",
    35: "minecraft:badlands"
  };
  return biomes[id] ?? `minecraft:biome_${id}`;
}

async function existsPath(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function valueAsString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value && typeof value === "object" && "value" in value) {
    return valueAsString((value as { value?: unknown }).value);
  }
  return undefined;
}

function valueAsNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value && typeof value === "object" && "value" in value) {
    return valueAsNumber((value as { value?: unknown }).value);
  }
  return undefined;
}

function gameModeName(gameMode?: number) {
  switch (gameMode) {
    case 0:
      return "Survival";
    case 1:
      return "Creative";
    case 2:
      return "Adventure";
    case 3:
      return "Spectator";
    default:
      return undefined;
  }
}
