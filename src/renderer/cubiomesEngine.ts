import cubiomesWasmUrl from "./wasm/cubiomes.wasm?url";
import {
  biomeColor,
  biomeLabel,
  featureById,
  minecraftSeedBigInt,
  seedFeatureCatalog,
  type SeedDimension,
  type SeedMarker
} from "./seedMapData";

type CubiomesExports = {
  memory: WebAssembly.Memory;
  _initialize?: () => void;
  eh_init: (mc: number, dim: number, seedHi: number, seedLo: number) => void;
  eh_mc_latest: () => number;
  eh_biome_at: (blockX: number, y: number, blockZ: number) => number;
  eh_biome_name: (biomeId: number) => number;
  eh_structure_region_size: (structureType: number) => number;
  eh_structure_find: (structureType: number, regX: number, regZ: number) => number;
  eh_structure_x: () => number;
  eh_structure_z: () => number;
  eh_strongholds_find: (
    minChunkX: number,
    maxChunkX: number,
    minChunkZ: number,
    maxChunkZ: number
  ) => number;
  eh_stronghold_x: (index: number) => number;
  eh_stronghold_z: (index: number) => number;
};

export interface CubiomesBiome {
  id: number;
  name: string;
  label: string;
  color: string;
}

const DIM_OVERWORLD = 0;
const DIM_NETHER = -1;
const DIM_END = 1;
const MC_1_0 = 3;
const MC_1_1 = 4;
const MC_1_2 = 5;
const MC_1_3 = 6;
const MC_1_4 = 7;
const MC_1_5 = 8;
const MC_1_6 = 9;
const MC_1_7 = 10;
const MC_1_8 = 11;
const MC_1_9 = 12;
const MC_1_10 = 13;
const MC_1_11 = 14;
const MC_1_12 = 15;
const MC_1_13 = 16;
const MC_1_14 = 17;
const MC_1_15 = 18;
const MC_1_16_1 = 19;
const MC_1_16 = 20;
const MC_1_17 = 21;
const MC_1_18 = 22;
const MC_1_19_2 = 23;
const MC_1_19 = 24;
const MC_1_20 = 25;
const MC_1_21_1 = 26;
const MC_1_21_3 = 27;
const MC_1_21 = 28;

const cubiomesStructureFeatures = seedFeatureCatalog.filter(
  (feature) => typeof feature.cubiomesType === "number"
);

let enginePromise: Promise<CubiomesEngine> | null = null;

export class CubiomesEngine {
  private readonly textDecoder = new TextDecoder();
  private configuredKey = "";
  private readonly biomeCache = new Map<string, CubiomesBiome>();
  private readonly structureCache = new Map<string, SeedMarker | null>();
  private strongholdCacheKey = "";
  private strongholdCache: SeedMarker[] = [];

  constructor(private readonly exports: CubiomesExports) {
    this.exports._initialize?.();
  }

  configure(seedText: string, version: string, dimension: SeedDimension) {
    const seed = minecraftSeedBigInt(seedText);
    const key = `${version}:${dimension}:${seed.toString()}`;
    if (key === this.configuredKey) return;
    const mc = minecraftVersionToCubiomes(version);
    const dim = seedDimensionToCubiomes(dimension);
    const seedHi = Number((seed >> 32n) & 0xffffffffn);
    const seedLo = Number(seed & 0xffffffffn);
    this.exports.eh_init(mc, dim, seedHi, seedLo);
    this.configuredKey = key;
    this.biomeCache.clear();
    this.structureCache.clear();
    this.strongholdCacheKey = "";
    this.strongholdCache = [];
  }

  biomeAt(blockX: number, blockZ: number, y = 63): CubiomesBiome {
    const cacheKey = `${y}:${blockX}:${blockZ}`;
    const cached = this.biomeCache.get(cacheKey);
    if (cached) return cached;

    const id = this.exports.eh_biome_at(blockX, y, blockZ);
    const name = this.readCString(this.exports.eh_biome_name(id));
    const biome = {
      id,
      name,
      label: biomeLabel(name),
      color: biomeColor(name)
    };
    if (this.biomeCache.size > 120000) {
      this.biomeCache.clear();
    }
    this.biomeCache.set(cacheKey, biome);
    return biome;
  }

  structuresInChunkBounds(
    minChunkX: number,
    maxChunkX: number,
    minChunkZ: number,
    maxChunkZ: number,
    enabledFeatureIds: Set<string>
  ): SeedMarker[] {
    const structures: SeedMarker[] = [];
    const seen = new Set<string>();

    if (enabledFeatureIds.has("stronghold")) {
      const minX = minChunkX * 16;
      const maxX = (maxChunkX + 1) * 16 - 1;
      const minZ = minChunkZ * 16;
      const maxZ = (maxChunkZ + 1) * 16 - 1;
      for (const marker of this.strongholdsForCurrentWorld()) {
        if (marker.x < minX || marker.x > maxX || marker.z < minZ || marker.z > maxZ) {
          continue;
        }
        const key = `stronghold:${marker.x}:${marker.z}`;
        if (seen.has(key)) continue;
        seen.add(key);
        structures.push(marker);
      }
    }

    cubiomesStructureFeatures.forEach((structure) => {
      if (!enabledFeatureIds.has(structure.id)) return;
      const structureType = structure.cubiomesType;
      if (typeof structureType !== "number") return;
      const regionSize = this.exports.eh_structure_region_size(structureType);
      if (!regionSize) return;

      const minRegX = Math.floor(minChunkX / regionSize) - 1;
      const maxRegX = Math.floor(maxChunkX / regionSize) + 1;
      const minRegZ = Math.floor(minChunkZ / regionSize) - 1;
      const maxRegZ = Math.floor(maxChunkZ / regionSize) + 1;

      for (let regZ = minRegZ; regZ <= maxRegZ; regZ += 1) {
        for (let regX = minRegX; regX <= maxRegX; regX += 1) {
          const cacheKey = `${structureType}:${regX}:${regZ}`;
          let marker = this.structureCache.get(cacheKey);
          if (!this.structureCache.has(cacheKey)) {
            marker = null;
            if (this.exports.eh_structure_find(structureType, regX, regZ)) {
              const x = this.exports.eh_structure_x();
              const z = this.exports.eh_structure_z();
              const catalogFeature = featureById(structure.id) ?? structure;
              marker = {
                featureId: structure.id,
                label: catalogFeature.labelEn,
                glyph: catalogFeature.glyph,
                color: catalogFeature.color,
                x,
                z,
                estimated: false
              };
            }
            if (this.structureCache.size > 80000) {
              this.structureCache.clear();
            }
            this.structureCache.set(cacheKey, marker);
          }
          if (!marker) continue;
          const x = marker.x;
          const z = marker.z;
          const chunkX = Math.floor(x / 16);
          const chunkZ = Math.floor(z / 16);
          if (
            chunkX < minChunkX ||
            chunkX > maxChunkX ||
            chunkZ < minChunkZ ||
            chunkZ > maxChunkZ
          ) {
            continue;
          }
          const key = `${structure.id}:${x}:${z}`;
          if (seen.has(key)) continue;
          seen.add(key);
          structures.push(marker);
        }
      }
    });

    return structures;
  }

  private strongholdsForCurrentWorld() {
    if (this.strongholdCacheKey === this.configuredKey) {
      return this.strongholdCache;
    }

    const strongholdFeature = featureById("stronghold");
    const count = this.exports.eh_strongholds_find(-2000000, 2000000, -2000000, 2000000);
    const markers: SeedMarker[] = [];
    for (let index = 0; index < count; index += 1) {
      markers.push({
        featureId: "stronghold",
        label: strongholdFeature?.labelEn ?? "Stronghold",
        glyph: strongholdFeature?.glyph ?? "SH",
        color: strongholdFeature?.color ?? "#6ac0a5",
        x: this.exports.eh_stronghold_x(index),
        z: this.exports.eh_stronghold_z(index),
        estimated: false
      });
    }
    this.strongholdCacheKey = this.configuredKey;
    this.strongholdCache = markers;
    return this.strongholdCache;
  }

  private readCString(pointer: number) {
    const bytes = new Uint8Array(this.exports.memory.buffer);
    let end = pointer;
    while (end < bytes.length && bytes[end] !== 0) end += 1;
    return this.textDecoder.decode(bytes.subarray(pointer, end));
  }
}

export function loadCubiomesEngine() {
  enginePromise ??= fetch(cubiomesWasmUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Falha ao carregar Cubiomes WASM: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(async (bytes) => {
      const imports = {
        wasi_snapshot_preview1: {
          proc_exit(code: number) {
            throw new Error(`Cubiomes WASM saiu com codigo ${code}`);
          },
          fd_write() {
            return 0;
          },
          fd_close() {
            return 0;
          },
          fd_seek() {
            return 0;
          }
        }
      };
      const { instance } = await WebAssembly.instantiate(bytes, imports);
      return new CubiomesEngine(instance.exports as unknown as CubiomesExports);
    });
  return enginePromise;
}

function minecraftVersionToCubiomes(version: string) {
  if (/^26\./.test(version)) return MC_1_21;
  if (/^1\.21\.1$/.test(version)) return MC_1_21_1;
  if (/^1\.21\.[23]$/.test(version)) return MC_1_21_3;
  if (version.startsWith("1.21")) return MC_1_21;
  if (version.startsWith("1.20")) return MC_1_20;
  if (version.startsWith("1.19.2")) return MC_1_19_2;
  if (version.startsWith("1.19")) return MC_1_19;
  if (version.startsWith("1.18")) return MC_1_18;
  if (version.startsWith("1.17")) return MC_1_17;
  if (version.startsWith("1.16.1")) return MC_1_16_1;
  if (version.startsWith("1.16")) return MC_1_16;
  if (version.startsWith("1.15")) return MC_1_15;
  if (version.startsWith("1.14")) return MC_1_14;
  if (version.startsWith("1.13")) return MC_1_13;
  if (version.startsWith("1.12")) return MC_1_12;
  if (version.startsWith("1.11")) return MC_1_11;
  if (version.startsWith("1.10")) return MC_1_10;
  if (version.startsWith("1.9")) return MC_1_9;
  if (version.startsWith("1.8")) return MC_1_8;
  if (version.startsWith("1.7")) return MC_1_7;
  if (version.startsWith("1.6")) return MC_1_6;
  if (version.startsWith("1.5")) return MC_1_5;
  if (version.startsWith("1.4")) return MC_1_4;
  if (version.startsWith("1.3")) return MC_1_3;
  if (version.startsWith("1.2")) return MC_1_2;
  if (version.startsWith("1.1")) return MC_1_1;
  if (version.startsWith("1.0")) return MC_1_0;
  return MC_1_21;
}

function seedDimensionToCubiomes(dimension: SeedDimension) {
  if (dimension === "nether") return DIM_NETHER;
  if (dimension === "end") return DIM_END;
  return DIM_OVERWORLD;
}
