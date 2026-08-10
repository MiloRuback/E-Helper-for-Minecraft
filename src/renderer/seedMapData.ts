export type SeedPlatform = "java" | "bedrock";
export type SeedDimension = "overworld" | "nether" | "end";

export interface SeedMapBiome {
  id: string;
  name: string;
  label: string;
  color: string;
}

export interface SeedFeature {
  id: string;
  labelPt: string;
  labelEn: string;
  glyph: string;
  color: string;
  dimensions: SeedDimension[];
  cubiomesType?: number;
  estimatedRegionSize?: number;
  estimatedChance?: number;
}

export interface SeedMarker {
  featureId: string;
  label: string;
  glyph: string;
  color: string;
  x: number;
  z: number;
  estimated: boolean;
}

export const seedPlatforms: Array<{ id: SeedPlatform; label: string }> = [
  { id: "java", label: "Java" },
  { id: "bedrock", label: "Bedrock" }
];

export const seedDimensions: Array<{ id: SeedDimension; labelPt: string; labelEn: string }> = [
  { id: "overworld", labelPt: "Overworld", labelEn: "Overworld" },
  { id: "nether", labelPt: "Nether", labelEn: "Nether" },
  { id: "end", labelPt: "End", labelEn: "End" }
];

export const seedFeatureCatalog: SeedFeature[] = [
  {
    id: "biomes",
    labelPt: "Biomas",
    labelEn: "Biomes",
    glyph: "BI",
    color: "#46d9ca",
    dimensions: ["overworld", "nether", "end"]
  },
  {
    id: "spawn",
    labelPt: "Spawn",
    labelEn: "Spawn Point",
    glyph: "SP",
    color: "#f6f1a4",
    dimensions: ["overworld"]
  },
  {
    id: "slime_chunk",
    labelPt: "Slime Chunk",
    labelEn: "Slime Chunk",
    glyph: "SL",
    color: "#7fdc5c",
    dimensions: ["overworld"]
  },
  {
    id: "village",
    labelPt: "Vilarejo",
    labelEn: "Village",
    glyph: "VI",
    color: "#e5bf57",
    dimensions: ["overworld"],
    cubiomesType: 5,
    estimatedRegionSize: 34,
    estimatedChance: 0.82
  },
  {
    id: "ancient_city",
    labelPt: "Cidade Ancestral",
    labelEn: "Ancient City",
    glyph: "AC",
    color: "#7c6dea",
    dimensions: ["overworld"],
    cubiomesType: 13,
    estimatedRegionSize: 24,
    estimatedChance: 0.32
  },
  {
    id: "dungeon",
    labelPt: "Dungeon",
    labelEn: "Dungeon",
    glyph: "DG",
    color: "#6f7884",
    dimensions: ["overworld"],
    estimatedRegionSize: 12,
    estimatedChance: 0.2
  },
  {
    id: "stronghold",
    labelPt: "Stronghold",
    labelEn: "Stronghold",
    glyph: "SH",
    color: "#6ac0a5",
    dimensions: ["overworld"],
    estimatedRegionSize: 64,
    estimatedChance: 0.18
  },
  {
    id: "mansion",
    labelPt: "Mansao",
    labelEn: "Mansion",
    glyph: "MA",
    color: "#a87655",
    dimensions: ["overworld"],
    cubiomesType: 9,
    estimatedRegionSize: 80,
    estimatedChance: 0.35
  },
  {
    id: "monument",
    labelPt: "Monumento",
    labelEn: "Monument",
    glyph: "MO",
    color: "#37b6c4",
    dimensions: ["overworld"],
    cubiomesType: 8,
    estimatedRegionSize: 32,
    estimatedChance: 0.5
  },
  {
    id: "outpost",
    labelPt: "Posto Avancado",
    labelEn: "Outpost",
    glyph: "OP",
    color: "#e16c66",
    dimensions: ["overworld"],
    cubiomesType: 10,
    estimatedRegionSize: 32,
    estimatedChance: 0.54
  },
  {
    id: "mineshaft",
    labelPt: "Mina",
    labelEn: "Mineshaft",
    glyph: "MI",
    color: "#c28a54",
    dimensions: ["overworld"],
    cubiomesType: 15,
    estimatedRegionSize: 16,
    estimatedChance: 0.34
  },
  {
    id: "ruined_portal",
    labelPt: "Portal em Ruinas",
    labelEn: "Ruined Portal",
    glyph: "RP",
    color: "#9b5ce8",
    dimensions: ["overworld"],
    cubiomesType: 11,
    estimatedRegionSize: 40,
    estimatedChance: 0.62
  },
  {
    id: "jungle_temple",
    labelPt: "Templo da Selva",
    labelEn: "Jungle Temple",
    glyph: "JT",
    color: "#4e8f55",
    dimensions: ["overworld"],
    cubiomesType: 2,
    estimatedRegionSize: 32,
    estimatedChance: 0.42
  },
  {
    id: "desert_temple",
    labelPt: "Templo do Deserto",
    labelEn: "Desert Temple",
    glyph: "DT",
    color: "#d7bb63",
    dimensions: ["overworld"],
    cubiomesType: 1,
    estimatedRegionSize: 32,
    estimatedChance: 0.44
  },
  {
    id: "witch_hut",
    labelPt: "Cabana da Bruxa",
    labelEn: "Witch Hut",
    glyph: "WH",
    color: "#5f8d5c",
    dimensions: ["overworld"],
    cubiomesType: 3,
    estimatedRegionSize: 32,
    estimatedChance: 0.38
  },
  {
    id: "treasure",
    labelPt: "Tesouro",
    labelEn: "Treasure",
    glyph: "TR",
    color: "#c58a2b",
    dimensions: ["overworld"],
    cubiomesType: 14,
    estimatedRegionSize: 18,
    estimatedChance: 0.28
  },
  {
    id: "shipwreck",
    labelPt: "Naufragio",
    labelEn: "Shipwreck",
    glyph: "SW",
    color: "#7ba8a2",
    dimensions: ["overworld"],
    cubiomesType: 7,
    estimatedRegionSize: 24,
    estimatedChance: 0.58
  },
  {
    id: "igloo",
    labelPt: "Iglu",
    labelEn: "Igloo",
    glyph: "IG",
    color: "#b9e4ed",
    dimensions: ["overworld"],
    cubiomesType: 4,
    estimatedRegionSize: 32,
    estimatedChance: 0.36
  },
  {
    id: "ocean_ruins",
    labelPt: "Ruinas do Oceano",
    labelEn: "Ocean Ruins",
    glyph: "OR",
    color: "#43b5b1",
    dimensions: ["overworld"],
    cubiomesType: 6,
    estimatedRegionSize: 20,
    estimatedChance: 0.68
  },
  {
    id: "fossil",
    labelPt: "Fossil",
    labelEn: "Fossil",
    glyph: "FO",
    color: "#d9d2b1",
    dimensions: ["overworld", "nether"],
    estimatedRegionSize: 28,
    estimatedChance: 0.22
  },
  {
    id: "cave",
    labelPt: "Caverna",
    labelEn: "Cave",
    glyph: "CA",
    color: "#4c5563",
    dimensions: ["overworld", "nether"],
    estimatedRegionSize: 10,
    estimatedChance: 0.25
  },
  {
    id: "ravine",
    labelPt: "Ravina",
    labelEn: "Ravine",
    glyph: "RV",
    color: "#78808c",
    dimensions: ["overworld"],
    estimatedRegionSize: 22,
    estimatedChance: 0.23
  },
  {
    id: "lava_pool",
    labelPt: "Lava Pool",
    labelEn: "Lava Pool",
    glyph: "LA",
    color: "#f0762d",
    dimensions: ["overworld", "nether"],
    estimatedRegionSize: 16,
    estimatedChance: 0.3
  },
  {
    id: "geode",
    labelPt: "Geodo",
    labelEn: "Geode",
    glyph: "GE",
    color: "#bd8bf1",
    dimensions: ["overworld"],
    cubiomesType: 17,
    estimatedRegionSize: 24,
    estimatedChance: 0.26
  },
  {
    id: "apple",
    labelPt: "Apple",
    labelEn: "Apple",
    glyph: "AP",
    color: "#f2b44b",
    dimensions: ["overworld"],
    estimatedRegionSize: 28,
    estimatedChance: 0.2
  },
  {
    id: "ore_veins",
    labelPt: "Veios de Minerio",
    labelEn: "Ore Veins",
    glyph: "OV",
    color: "#b89070",
    dimensions: ["overworld"],
    estimatedRegionSize: 18,
    estimatedChance: 0.32
  },
  {
    id: "desert_well",
    labelPt: "Poco do Deserto",
    labelEn: "Desert Well",
    glyph: "DW",
    color: "#cdbf8b",
    dimensions: ["overworld"],
    cubiomesType: 16,
    estimatedRegionSize: 32,
    estimatedChance: 0.24
  },
  {
    id: "trail_ruins",
    labelPt: "Ruinas de Trilha",
    labelEn: "Trail Ruins",
    glyph: "TL",
    color: "#a87549",
    dimensions: ["overworld"],
    cubiomesType: 23,
    estimatedRegionSize: 34,
    estimatedChance: 0.42
  },
  {
    id: "trial_chamber",
    labelPt: "Trial Chamber",
    labelEn: "Trial Chamber",
    glyph: "TC",
    color: "#4bd8ce",
    dimensions: ["overworld"],
    cubiomesType: 24,
    estimatedRegionSize: 34,
    estimatedChance: 0.45
  },
  {
    id: "fortress",
    labelPt: "Fortaleza",
    labelEn: "Fortress",
    glyph: "NF",
    color: "#a94838",
    dimensions: ["nether"],
    cubiomesType: 18,
    estimatedRegionSize: 27,
    estimatedChance: 0.62
  },
  {
    id: "bastion",
    labelPt: "Bastiao",
    labelEn: "Bastion",
    glyph: "BA",
    color: "#7d5b4f",
    dimensions: ["nether"],
    cubiomesType: 19,
    estimatedRegionSize: 27,
    estimatedChance: 0.5
  },
  {
    id: "ruined_portal_nether",
    labelPt: "Portal do Nether",
    labelEn: "Nether Portal",
    glyph: "RN",
    color: "#aa65ff",
    dimensions: ["nether"],
    cubiomesType: 12,
    estimatedRegionSize: 25,
    estimatedChance: 0.64
  },
  {
    id: "end_city",
    labelPt: "Cidade do End",
    labelEn: "End City",
    glyph: "EC",
    color: "#c8b1f0",
    dimensions: ["end"],
    cubiomesType: 20,
    estimatedRegionSize: 20,
    estimatedChance: 0.52
  },
  {
    id: "end_gateway",
    labelPt: "Gateway do End",
    labelEn: "End Gateway",
    glyph: "EG",
    color: "#d5d09c",
    dimensions: ["end"],
    cubiomesType: 21,
    estimatedRegionSize: 48,
    estimatedChance: 0.25
  },
  {
    id: "end_island",
    labelPt: "Ilha do End",
    labelEn: "End Island",
    glyph: "EI",
    color: "#aba76b",
    dimensions: ["end"],
    cubiomesType: 22,
    estimatedRegionSize: 18,
    estimatedChance: 0.45
  }
];

export const biomeColorOverrides: Record<string, string> = {
  ocean: "#2f66ba",
  deep_ocean: "#244f91",
  lukewarm_ocean: "#3f85c4",
  deep_lukewarm_ocean: "#2f6aa1",
  warm_ocean: "#35a7b2",
  cold_ocean: "#3d76b2",
  deep_cold_ocean: "#2d5d91",
  frozen_ocean: "#9ccfe0",
  deep_frozen_ocean: "#75a9c5",
  river: "#3d78c4",
  frozen_river: "#a6d8e8",
  beach: "#d6c47a",
  snowy_beach: "#dfeaf0",
  stony_shore: "#8f958e",
  plains: "#8cbf5f",
  sunflower_plains: "#b2ce68",
  meadow: "#93c66a",
  cherry_grove: "#e9a5c4",
  forest: "#2f7d42",
  flower_forest: "#59a34d",
  birch_forest: "#74a95a",
  old_growth_birch_forest: "#5f8f4d",
  dark_forest: "#25502e",
  taiga: "#315f4d",
  old_growth_pine_taiga: "#254d3f",
  old_growth_spruce_taiga: "#244a42",
  snowy_taiga: "#9fc7c0",
  jungle: "#1f8d45",
  sparse_jungle: "#37a052",
  bamboo_jungle: "#2fae4f",
  swamp: "#4f7140",
  mangrove_swamp: "#3d7650",
  desert: "#d7bf66",
  savanna: "#b9b85e",
  savanna_plateau: "#a9a659",
  windswept_savanna: "#9f9b57",
  badlands: "#b96a3f",
  wooded_badlands: "#a45d3c",
  eroded_badlands: "#d18a4e",
  snowy_plains: "#d8edf3",
  ice_spikes: "#cdebf4",
  grove: "#93b7aa",
  snowy_slopes: "#dce8ee",
  jagged_peaks: "#c5c9c5",
  frozen_peaks: "#d7e4e8",
  stony_peaks: "#a7a28a",
  windswept_hills: "#8b978f",
  windswept_gravelly_hills: "#949b96",
  windswept_forest: "#5e7f5f",
  mushroom_fields: "#b46aae",
  dripstone_caves: "#8a7967",
  lush_caves: "#4f9a50",
  deep_dark: "#24313f",
  nether_wastes: "#8f3a31",
  crimson_forest: "#b73547",
  warped_forest: "#26877f",
  soul_sand_valley: "#61526b",
  basalt_deltas: "#3c3a43",
  the_end: "#c4c284",
  small_end_islands: "#aaa66d",
  end_midlands: "#b8b579",
  end_highlands: "#d0cf91",
  end_barrens: "#8f8b60"
};

export const fallbackBiomePalettes: Record<SeedDimension, SeedMapBiome[]> = {
  overworld: [
    biomeFromId("plains"),
    biomeFromId("forest"),
    biomeFromId("dark_forest"),
    biomeFromId("birch_forest"),
    biomeFromId("taiga"),
    biomeFromId("jungle"),
    biomeFromId("swamp"),
    biomeFromId("mangrove_swamp"),
    biomeFromId("desert"),
    biomeFromId("savanna"),
    biomeFromId("badlands"),
    biomeFromId("snowy_plains"),
    biomeFromId("ice_spikes"),
    biomeFromId("meadow"),
    biomeFromId("cherry_grove"),
    biomeFromId("windswept_hills"),
    biomeFromId("jagged_peaks"),
    biomeFromId("ocean"),
    biomeFromId("warm_ocean"),
    biomeFromId("frozen_ocean"),
    biomeFromId("river"),
    biomeFromId("mushroom_fields"),
    biomeFromId("dripstone_caves"),
    biomeFromId("lush_caves"),
    biomeFromId("deep_dark")
  ],
  nether: [
    biomeFromId("nether_wastes"),
    biomeFromId("crimson_forest"),
    biomeFromId("warped_forest"),
    biomeFromId("soul_sand_valley"),
    biomeFromId("basalt_deltas")
  ],
  end: [
    biomeFromId("the_end"),
    biomeFromId("small_end_islands"),
    biomeFromId("end_midlands"),
    biomeFromId("end_highlands"),
    biomeFromId("end_barrens")
  ]
};

export function seedFeatureLabel(feature: SeedFeature, language: string) {
  return language === "pt-br" ? feature.labelPt : feature.labelEn;
}

export function featureById(id: string) {
  return seedFeatureCatalog.find((feature) => feature.id === id);
}

export function biomeFromId(id: string): SeedMapBiome {
  return {
    id,
    name: id,
    label: biomeLabel(id),
    color: biomeColor(id)
  };
}

export function biomeLabel(name: string) {
  return name
    .replace(/^minecraft:/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function biomeColor(name: string) {
  const cleanName = name.replace(/^minecraft:/, "");
  if (biomeColorOverrides[cleanName]) return biomeColorOverrides[cleanName];
  if (cleanName.includes("desert")) return "#d7bf66";
  if (cleanName.includes("badlands")) return "#b96a3f";
  if (cleanName.includes("snow") || cleanName.includes("frozen") || cleanName.includes("ice")) {
    return "#cfe6ee";
  }
  if (cleanName.includes("ocean") || cleanName.includes("river")) return "#356fb7";
  if (cleanName.includes("swamp")) return "#4d7446";
  if (cleanName.includes("jungle")) return "#268f49";
  if (cleanName.includes("forest") || cleanName.includes("taiga") || cleanName.includes("grove")) {
    return "#3f7d46";
  }
  if (cleanName.includes("meadow") || cleanName.includes("plains")) return "#8cbf5f";
  if (cleanName.includes("peak") || cleanName.includes("slope") || cleanName.includes("hill")) {
    return "#9da39b";
  }
  if (cleanName.includes("nether") || cleanName.includes("basalt") || cleanName.includes("crimson")) {
    return "#914035";
  }
  if (cleanName.includes("warped")) return "#26877f";
  if (cleanName.includes("end")) return "#b8b579";
  return "#62a96f";
}

export function fallbackBiomeAt(
  seed: string,
  version: string,
  platform: SeedPlatform,
  dimension: SeedDimension,
  chunkX: number,
  chunkZ: number
): SeedMapBiome {
  const palette = fallbackBiomePalettes[dimension];
  const base = seedHash(`${seed}:${version}:${platform}:${dimension}`);
  const cellSize = dimension === "overworld" ? 7 : dimension === "nether" ? 5 : 9;
  const regionSize = dimension === "overworld" ? 24 : dimension === "nether" ? 14 : 18;
  const low = cellNoise(base, Math.floor(chunkX / cellSize), Math.floor(chunkZ / cellSize));
  const high = cellNoise(base ^ 0x9e3779b9, Math.floor(chunkX / regionSize), Math.floor(chunkZ / regionSize));
  const ridge = cellNoise(base ^ 0x85ebca6b, Math.floor((chunkX + chunkZ) / 12), Math.floor((chunkZ - chunkX) / 12));
  const index = Math.floor(((low * 0.58 + high * 0.34 + ridge * 0.08) % 1) * palette.length);
  return palette[index];
}

export function estimatedMarkersInChunkBounds(
  seed: string,
  version: string,
  platform: SeedPlatform,
  dimension: SeedDimension,
  minChunkX: number,
  maxChunkX: number,
  minChunkZ: number,
  maxChunkZ: number,
  enabledFeatureIds: Set<string>,
  exactFeatureIds: Set<string>
): SeedMarker[] {
  const markers: SeedMarker[] = [];
  const base = seedHash(`${seed}:${version}:${platform}:${dimension}:features`);
  seedFeatureCatalog.forEach((feature, featureIndex) => {
    if (!enabledFeatureIds.has(feature.id)) return;
    if (!feature.dimensions.includes(dimension)) return;
    if (feature.id === "biomes" || feature.id === "spawn" || feature.id === "slime_chunk") return;
    if (platform === "java" && exactFeatureIds.has(feature.id)) return;

    const regionSize = feature.estimatedRegionSize ?? 32;
    const chance = feature.estimatedChance ?? 0.35;
    const minRegX = Math.floor(minChunkX / regionSize) - 1;
    const maxRegX = Math.floor(maxChunkX / regionSize) + 1;
    const minRegZ = Math.floor(minChunkZ / regionSize) - 1;
    const maxRegZ = Math.floor(maxChunkZ / regionSize) + 1;

    for (let regZ = minRegZ; regZ <= maxRegZ; regZ += 1) {
      for (let regX = minRegX; regX <= maxRegX; regX += 1) {
        const hit = cellNoise(base ^ Math.imul(featureIndex + 1, 0x45d9f3b), regX, regZ);
        if (hit > chance) continue;
        const chunkOffsetX = Math.floor(cellNoise(base ^ featureIndex, regX * 3 + 1, regZ) * regionSize);
        const chunkOffsetZ = Math.floor(cellNoise(base ^ (featureIndex + 17), regX, regZ * 3 + 1) * regionSize);
        const chunkX = regX * regionSize + chunkOffsetX;
        const chunkZ = regZ * regionSize + chunkOffsetZ;
        if (chunkX < minChunkX || chunkX > maxChunkX || chunkZ < minChunkZ || chunkZ > maxChunkZ) {
          continue;
        }
        markers.push({
          featureId: feature.id,
          label: feature.labelEn,
          glyph: feature.glyph,
          color: feature.color,
          x: chunkX * 16 + 8,
          z: chunkZ * 16 + 8,
          estimated: true
        });
      }
    }
  });
  return markers;
}

export function isJavaSlimeChunk(seedText: string, chunkX: number, chunkZ: number) {
  const seed = minecraftSeedBigInt(seedText);
  const x = BigInt(chunkX);
  const z = BigInt(chunkZ);
  const slimeSeed =
    seed +
    x * x * 4987142n +
    x * 5947611n +
    z * z * 4392871n +
    z * 389711n ^
    987234911n;
  return javaNextInt(slimeSeed, 10) === 0;
}

export function isEstimatedSlimeChunk(seed: string, platform: SeedPlatform, chunkX: number, chunkZ: number) {
  const base = platform === "bedrock" ? seedHash("bedrock-slime") : seedHash(seed);
  return cellNoise(base ^ 0x27d4eb2d, chunkX, chunkZ) > 0.9;
}

export function seedHash(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function cellNoise(seed: number, x: number, z: number) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function minecraftSeedBigInt(value: string) {
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

function javaNextInt(seed: bigint, bound: number) {
  const mask = (1n << 48n) - 1n;
  const multiplier = 0x5deece66dn;
  const addend = 0xbn;
  let state = (seed ^ multiplier) & mask;

  while (true) {
    state = (state * multiplier + addend) & mask;
    const bits = Number(state >> 17n);
    const value = bits % bound;
    if (bits - value + (bound - 1) >= 0) return value;
  }
}
