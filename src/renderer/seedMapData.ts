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

const iconDataUrlCache = new Map<string, string>();

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
  the_void: "#111827",
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
  stone_shore: "#8f958e",
  plains: "#8cbf5f",
  sunflower_plains: "#b2ce68",
  meadow: "#93c66a",
  cherry_grove: "#e9a5c4",
  pale_garden: "#9da79b",
  dappled_forest: "#6f9b57",
  forest: "#2f7d42",
  flower_forest: "#59a34d",
  birch_forest: "#74a95a",
  old_growth_birch_forest: "#5f8f4d",
  wooded_hills: "#386d3e",
  birch_forest_hills: "#689e55",
  dark_forest_hills: "#203f29",
  dark_forest: "#25502e",
  taiga: "#315f4d",
  old_growth_pine_taiga: "#254d3f",
  old_growth_spruce_taiga: "#244a42",
  giant_tree_taiga: "#2e5c48",
  giant_tree_taiga_hills: "#254b3c",
  giant_spruce_taiga: "#244b42",
  giant_spruce_taiga_hills: "#203f38",
  snowy_taiga: "#9fc7c0",
  snowy_taiga_hills: "#8fb9b6",
  snowy_taiga_mountains: "#7fa9ad",
  jungle: "#1f8d45",
  sparse_jungle: "#37a052",
  bamboo_jungle: "#2fae4f",
  jungle_edge: "#3d9c58",
  modified_jungle: "#17823d",
  modified_jungle_edge: "#31934f",
  swamp: "#4f7140",
  swamp_hills: "#45663b",
  mangrove_swamp: "#3d7650",
  desert: "#d7bf66",
  desert_hills: "#c7ac58",
  desert_lakes: "#d7c978",
  savanna: "#b9b85e",
  savanna_plateau: "#a9a659",
  windswept_savanna: "#9f9b57",
  shattered_savanna: "#a99354",
  shattered_savanna_plateau: "#98894f",
  badlands: "#b96a3f",
  wooded_badlands: "#a45d3c",
  eroded_badlands: "#d18a4e",
  badlands_plateau: "#a85d3a",
  modified_badlands_plateau: "#914f38",
  modified_wooded_badlands_plateau: "#87483a",
  snowy_plains: "#d8edf3",
  snowy_mountains: "#d3e5ea",
  ice_spikes: "#cdebf4",
  grove: "#93b7aa",
  snowy_slopes: "#dce8ee",
  jagged_peaks: "#c5c9c5",
  frozen_peaks: "#d7e4e8",
  stony_peaks: "#a7a28a",
  mountains: "#8d958f",
  windswept_hills: "#8b978f",
  windswept_gravelly_hills: "#949b96",
  windswept_forest: "#5e7f5f",
  gravelly_mountains: "#8f9693",
  modified_gravelly_mountains: "#818a88",
  wooded_mountains: "#687f66",
  mountain_edge: "#7f8a83",
  mushroom_fields: "#b46aae",
  mushroom_field_shore: "#b977ae",
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
    biomeFromId("flower_forest"),
    biomeFromId("dark_forest"),
    biomeFromId("birch_forest"),
    biomeFromId("old_growth_birch_forest"),
    biomeFromId("taiga"),
    biomeFromId("old_growth_pine_taiga"),
    biomeFromId("old_growth_spruce_taiga"),
    biomeFromId("jungle"),
    biomeFromId("sparse_jungle"),
    biomeFromId("bamboo_jungle"),
    biomeFromId("swamp"),
    biomeFromId("mangrove_swamp"),
    biomeFromId("desert"),
    biomeFromId("savanna"),
    biomeFromId("savanna_plateau"),
    biomeFromId("badlands"),
    biomeFromId("wooded_badlands"),
    biomeFromId("eroded_badlands"),
    biomeFromId("snowy_plains"),
    biomeFromId("snowy_taiga"),
    biomeFromId("ice_spikes"),
    biomeFromId("meadow"),
    biomeFromId("cherry_grove"),
    biomeFromId("pale_garden"),
    biomeFromId("grove"),
    biomeFromId("snowy_slopes"),
    biomeFromId("windswept_hills"),
    biomeFromId("windswept_forest"),
    biomeFromId("windswept_savanna"),
    biomeFromId("jagged_peaks"),
    biomeFromId("frozen_peaks"),
    biomeFromId("stony_peaks"),
    biomeFromId("ocean"),
    biomeFromId("deep_ocean"),
    biomeFromId("cold_ocean"),
    biomeFromId("deep_cold_ocean"),
    biomeFromId("warm_ocean"),
    biomeFromId("lukewarm_ocean"),
    biomeFromId("deep_lukewarm_ocean"),
    biomeFromId("frozen_ocean"),
    biomeFromId("deep_frozen_ocean"),
    biomeFromId("river"),
    biomeFromId("beach"),
    biomeFromId("stony_shore"),
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

export function seedMarkerKey(marker: Pick<SeedMarker, "featureId" | "x" | "z">) {
  return `${marker.featureId}:${Math.round(marker.x)}:${Math.round(marker.z)}`;
}

export function seedFeatureIconDataUrl(feature: Pick<SeedFeature, "id" | "color">) {
  const cacheKey = `${feature.id}:${feature.color}`;
  const cached = iconDataUrlCache.get(cacheKey);
  if (cached) return cached;
  const svg = seedFeatureIconSvg(feature);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  iconDataUrlCache.set(cacheKey, url);
  return url;
}

export function seedFeatureIconSvg(feature: Pick<SeedFeature, "id" | "color">) {
  const shape = featureIconShape(feature.id, feature.color);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">`,
    `<rect x="1" y="1" width="30" height="30" rx="5" fill="#0d1420"/>`,
    `<rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="${feature.color}" opacity=".2"/>`,
    `<g stroke="#07111c" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">`,
    shape,
    `</g>`,
    `</svg>`
  ].join("");
}

function featureIconShape(id: string, color: string) {
  const light = "#f7fbff";
  const dark = "#101722";
  const gold = "#f6d36b";
  const wood = "#9a6a3a";
  const stone = "#9aa3ad";
  const water = "#55c7d8";
  const lava = "#ff7a2f";
  const purple = "#a76cf0";
  const green = "#7fdc5c";

  const fallback = `<path d="M8 8h16v16H8z" fill="${color}"/><path d="M12 12h8v8h-8z" fill="${light}" opacity=".85"/>`;
  const shapes: Record<string, string> = {
    biomes: `<path d="M6 22c5-9 12-13 20-14v17H6z" fill="${green}"/><path d="M6 24c5-4 10-5 20-3v5H6z" fill="${water}"/><path d="M7 10l5 2 3-4 5 3 5-2v6l-6 1-6-1-6 2z" fill="${gold}"/>`,
    spawn: `<circle cx="16" cy="16" r="10" fill="${light}"/><path d="M16 6v20M6 16h20" fill="none"/><path d="M16 9l3 7-3 7-3-7z" fill="${gold}"/>`,
    slime_chunk: `<rect x="8" y="9" width="16" height="15" rx="3" fill="${green}"/><path d="M12 15h2M19 15h2M13 21c2 1 4 1 6 0" fill="none" stroke="${dark}"/>`,
    village: `<path d="M6 17l10-9 10 9v9H6z" fill="${gold}"/><path d="M10 17h12v9H10z" fill="${wood}"/><path d="M14 20h4v6h-4z" fill="${dark}"/>`,
    ancient_city: `<path d="M8 25V12l8-5 8 5v13z" fill="${stone}"/><path d="M12 25v-8h8v8M11 13h3M18 13h3" fill="none"/><path d="M10 9h12v4H10z" fill="#556071"/>`,
    dungeon: `<path d="M7 7h18v18H7z" fill="${stone}"/><path d="M7 13h18M7 19h18M13 7v18M19 7v18" fill="none" stroke="${dark}"/>`,
    stronghold: `<circle cx="16" cy="16" r="10" fill="#68b7a1"/><circle cx="16" cy="16" r="5" fill="${dark}"/><circle cx="16" cy="16" r="2" fill="${gold}"/>`,
    mansion: `<path d="M6 25V11l10-5 10 5v14z" fill="${wood}"/><path d="M9 14h14M11 18h3M18 18h3M14 25v-5h4v5" fill="none" stroke="${light}"/>`,
    monument: `<path d="M6 24h20l-3-11-7-6-7 6z" fill="${water}"/><path d="M11 24v-8h10v8M16 8v16" fill="none" stroke="${dark}"/>`,
    outpost: `<path d="M11 26V9h10v17z" fill="${wood}"/><path d="M8 10h16l-2-4H10z" fill="#e26b65"/><path d="M11 16h10M14 26v-5h4v5" fill="none" stroke="${light}"/>`,
    mineshaft: `<path d="M8 25V9h4v16M20 25V9h4v16" fill="none" stroke="${wood}" stroke-width="3"/><path d="M7 13h18M7 19h18" fill="none" stroke="${gold}" stroke-width="2"/>`,
    ruined_portal: `<path d="M9 26V12c0-5 14-5 14 0v14h-5V13c0-2-4-2-4 0v13z" fill="${purple}"/><path d="M12 25h8" fill="none" stroke="${dark}"/>`,
    jungle_temple: `<path d="M7 25h18l-3-12H10z" fill="#6b8b58"/><path d="M11 13l5-6 5 6M13 25v-7h6v7" fill="none" stroke="${dark}"/><path d="M6 9c5 0 6-4 10-4s5 4 10 4" fill="none" stroke="${green}" stroke-width="3"/>`,
    desert_temple: `<path d="M5 25h22L16 7z" fill="${gold}"/><path d="M12 25v-7h8v7M9 21h14" fill="none" stroke="${dark}"/>`,
    witch_hut: `<path d="M7 21l4-8h10l4 8v5H7z" fill="${wood}"/><path d="M10 13l6-6 6 6M11 26v-6M21 26v-6" fill="none" stroke="${dark}"/>`,
    treasure: `<path d="M7 14h18v11H7z" fill="${wood}"/><path d="M8 14c1-6 15-6 16 0" fill="${gold}"/><path d="M7 18h18M16 14v11" fill="none" stroke="${dark}"/>`,
    shipwreck: `<path d="M6 20c5 5 15 5 20 0l-3 5H9z" fill="${wood}"/><path d="M15 7v13M15 9l7 4-7 4" fill="${light}"/>`,
    igloo: `<path d="M6 24c1-11 19-11 20 0z" fill="${light}"/><path d="M12 24v-5h8v5M10 17h12" fill="none" stroke="${dark}"/>`,
    ocean_ruins: `<path d="M7 24h18v-5h-4v-5h-5v5h-4v-8H7z" fill="${water}"/><path d="M7 25c5-3 13 3 18 0" fill="none" stroke="${light}" stroke-width="2"/>`,
    fossil: `<path d="M8 22l16-12M10 10l12 12" fill="none" stroke="${light}" stroke-width="4"/><circle cx="8" cy="22" r="3" fill="${light}"/><circle cx="24" cy="10" r="3" fill="${light}"/>`,
    cave: `<path d="M5 25c2-12 6-18 11-18s9 6 11 18z" fill="${dark}"/><path d="M10 24c1-6 3-9 6-9s5 3 6 9z" fill="#05080c"/>`,
    ravine: `<path d="M14 5l-5 9 5 4-4 9 9-10-4-4 7-8z" fill="${stone}"/><path d="M15 7l-3 7 4 3-3 7" fill="none" stroke="${dark}"/>`,
    lava_pool: `<path d="M6 22c2-6 5-10 10-10s8 4 10 10c-4 4-16 4-20 0z" fill="${lava}"/><path d="M10 21c2-2 4-1 6 0s4 2 7-1" fill="none" stroke="${gold}" stroke-width="2"/>`,
    geode: `<path d="M16 5l10 8-4 13H10L6 13z" fill="${purple}"/><path d="M16 8l3 9-3 7-3-7zM8 13l8 4 8-4" fill="none" stroke="${light}"/>`,
    apple: `<path d="M16 12c6-5 12 4 7 11-2 4-5 3-7 2-2 1-5 2-7-2-5-7 1-16 7-11z" fill="#f2564b"/><path d="M16 11c0-4 2-5 5-5" fill="none" stroke="${green}" stroke-width="2"/>`,
    ore_veins: `<path d="M8 25h16l3-13-8-6-11 5z" fill="${stone}"/><path d="M11 19l5-3 4 5M14 11l3 4 5-2" fill="none" stroke="#d0a178" stroke-width="3"/>`,
    desert_well: `<path d="M9 25V12h14v13z" fill="${gold}"/><path d="M7 12h18L16 6zM12 17h8M12 25v-8M20 25v-8" fill="none" stroke="${dark}"/>`,
    trail_ruins: `<path d="M8 24h16v-5h-5v-5h-5v5H8z" fill="#b88455"/><path d="M9 12l14-4M12 9l1 5M19 7l1 5" fill="none" stroke="${light}" stroke-width="2"/>`,
    trial_chamber: `<path d="M7 8h18v18H7z" fill="#45d8ce"/><path d="M11 12h10v10H11zM16 8v18M7 16h18" fill="none" stroke="${dark}"/><circle cx="16" cy="16" r="3" fill="${gold}"/>`,
    fortress: `<path d="M6 25V11h20v14z" fill="#a94838"/><path d="M8 11V7h4v4h3V7h4v4h4V7h3M9 17h14M12 25v-5h8v5" fill="none" stroke="${dark}"/>`,
    bastion: `<path d="M7 25V10l9-5 9 5v15z" fill="#554744"/><path d="M10 14h12M13 25v-7h6v7M12 9h8" fill="none" stroke="${gold}"/>`,
    ruined_portal_nether: `<path d="M9 26V12c0-5 14-5 14 0v14h-5V13c0-2-4-2-4 0v13z" fill="#aa65ff"/><path d="M10 25l12-18" fill="none" stroke="${lava}" stroke-width="2"/>`,
    end_city: `<path d="M12 26V9h8v17z" fill="#c8b1f0"/><path d="M9 13h14M10 7h12l-3 4h-6zM14 26v-6h4v6" fill="none" stroke="${dark}"/>`,
    end_gateway: `<circle cx="16" cy="16" r="10" fill="none" stroke="${light}" stroke-width="4"/><circle cx="16" cy="16" r="5" fill="${dark}"/><path d="M16 6v5M16 21v5M6 16h5M21 16h5" fill="none" stroke="${gold}" stroke-width="2"/>`,
    end_island: `<path d="M6 18c4-7 16-7 20 0l-4 8H10z" fill="#aba76b"/><path d="M11 17l5-8 5 8" fill="none" stroke="${light}" stroke-width="2"/>`
  };

  return shapes[id] ?? fallback;
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
  return hashedBiomeColor(cleanName);
}

function hashedBiomeColor(name: string) {
  const hash = seedHash(name);
  const hue = hash % 360;
  const saturation = 38 + (hash % 24);
  const lightness = 34 + ((hash >>> 8) % 18);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
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
