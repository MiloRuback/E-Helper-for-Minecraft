import cubiomesWasmUrl from "./wasm/cubiomes.wasm?url";

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
};

export interface CubiomesBiome {
  id: number;
  name: string;
  label: string;
  color: string;
}

export interface CubiomesStructure {
  id: number;
  label: string;
  color: string;
  x: number;
  z: number;
}

const DIM_OVERWORLD = 0;
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

const structureTypes = [
  { id: 5, label: "Village", color: "#f2c94c" },
  { id: 1, label: "Pyramid", color: "#d7b85f" },
  { id: 8, label: "Monument", color: "#41b6e6" },
  { id: 9, label: "Mansion", color: "#b88a5a" },
  { id: 10, label: "Outpost", color: "#ef6f6c" },
  { id: 13, label: "Ancient City", color: "#8f7fea" },
  { id: 23, label: "Trail Ruins", color: "#c1844d" },
  { id: 24, label: "Trial Chambers", color: "#46d9ca" }
];

let enginePromise: Promise<CubiomesEngine> | null = null;

export class CubiomesEngine {
  private readonly textDecoder = new TextDecoder();
  private configuredKey = "";

  constructor(private readonly exports: CubiomesExports) {
    this.exports._initialize?.();
  }

  configure(seedText: string, version: string) {
    const seed = minecraftSeed(seedText);
    const key = `${version}:${seed.toString()}`;
    if (key === this.configuredKey) return;
    const mc = minecraftVersionToCubiomes(version);
    const seedHi = Number((seed >> 32n) & 0xffffffffn);
    const seedLo = Number(seed & 0xffffffffn);
    this.exports.eh_init(mc, DIM_OVERWORLD, seedHi, seedLo);
    this.configuredKey = key;
  }

  biomeAt(blockX: number, blockZ: number, y = 63): CubiomesBiome {
    const id = this.exports.eh_biome_at(blockX, y, blockZ);
    const name = this.readCString(this.exports.eh_biome_name(id));
    return {
      id,
      name,
      label: biomeLabel(name),
      color: biomeColor(name)
    };
  }

  structuresInChunkBounds(
    minChunkX: number,
    maxChunkX: number,
    minChunkZ: number,
    maxChunkZ: number
  ): CubiomesStructure[] {
    const structures: CubiomesStructure[] = [];
    const seen = new Set<string>();

    structureTypes.forEach((structure) => {
      const regionSize = this.exports.eh_structure_region_size(structure.id);
      if (!regionSize) return;

      const minRegX = Math.floor(minChunkX / regionSize) - 1;
      const maxRegX = Math.floor(maxChunkX / regionSize) + 1;
      const minRegZ = Math.floor(minChunkZ / regionSize) - 1;
      const maxRegZ = Math.floor(maxChunkZ / regionSize) + 1;

      for (let regZ = minRegZ; regZ <= maxRegZ; regZ += 1) {
        for (let regX = minRegX; regX <= maxRegX; regX += 1) {
          if (!this.exports.eh_structure_find(structure.id, regX, regZ)) continue;
          const x = this.exports.eh_structure_x();
          const z = this.exports.eh_structure_z();
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
          structures.push({ ...structure, x, z });
        }
      }
    });

    return structures;
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

function minecraftSeed(value: string) {
  const trimmed = value.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return BigInt.asUintN(64, BigInt(trimmed));
  }

  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return BigInt.asUintN(64, BigInt(hash));
}

function biomeLabel(name: string) {
  return name
    .replace(/^minecraft:/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function biomeColor(name: string) {
  if (name.includes("desert") || name.includes("badlands")) return "#d4b35f";
  if (name.includes("snow") || name.includes("frozen") || name.includes("ice")) return "#c9e4ef";
  if (name.includes("ocean") || name.includes("river")) return "#3a6ea5";
  if (name.includes("swamp") || name.includes("mangrove")) return "#4c7a4f";
  if (name.includes("jungle")) return "#2f8a45";
  if (name.includes("forest") || name.includes("taiga") || name.includes("grove")) {
    return "#3f7d46";
  }
  if (name.includes("meadow") || name.includes("cherry")) return "#88b96b";
  if (name.includes("mountain") || name.includes("peak") || name.includes("slope")) {
    return "#8d958f";
  }
  if (name.includes("nether") || name.includes("basalt") || name.includes("crimson")) {
    return "#9e3f35";
  }
  if (name.includes("end")) return "#b8b574";
  return "#62a96f";
}
