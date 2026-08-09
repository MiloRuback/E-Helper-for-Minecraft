import zlib from "node:zlib";
import type {
  BlueprintExportRequest,
  BlueprintExportResult
} from "../shared/contracts.js";

type PrismarineNbt = {
  comp: (value: object, name?: string) => unknown;
  byteArray: (value: Buffer | number[]) => unknown;
  int: (value: number | number[]) => unknown;
  intArray: (value: number[]) => unknown;
  long: (value: bigint | number | number[]) => unknown;
  longArray: (value: bigint[] | number[]) => unknown;
  short: (value: number) => unknown;
  string: (value: string) => unknown;
  list: (value: unknown) => unknown;
  writeUncompressed: (value: unknown) => Buffer;
};

const STRUCTURE_DATA_VERSION = 3700;

export async function exportBlueprintToNbt(
  request: BlueprintExportRequest
): Promise<BlueprintExportResult> {
  try {
    const nbt = await loadPrismarineNbt();
    const validBlocks = validBlueprintBlocks(request);
    const palette = Array.from(new Set(validBlocks.map((block) => block.type)));
    const stateIndex = new Map(palette.map((type, index) => [type, index]));
    const tag = nbt.comp(
      {
        DataVersion: nbt.int(STRUCTURE_DATA_VERSION),
        size: nbt.list(nbt.int([request.size.x, request.size.y, request.size.z])),
        palette: nbt.list(
          nbt.comp(
            palette.map((type) => ({
              Name: nbt.string(minecraftBlockNameFromType(type))
            }))
          )
        ),
        blocks: nbt.list(
          nbt.comp(
            validBlocks.map((block) => ({
              pos: nbt.list(nbt.int([block.x, block.y, block.z])),
              state: nbt.int(stateIndex.get(block.type) ?? 0)
            }))
          )
        ),
        entities: nbt.list(nbt.comp([]))
      },
      ""
    );
    const gzipped = zlib.gzipSync(nbt.writeUncompressed(tag));
    return {
      ok: true,
      message: "Blueprint exportado como Java Structure NBT.",
      fileName: `${safeFileStem(request.name)}.nbt`,
      bytes: Array.from(gzipped),
      blockCount: validBlocks.length,
      paletteCount: palette.length
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel exportar o blueprint como NBT."
    };
  }
}

export async function exportBlueprintToSchem(
  request: BlueprintExportRequest
): Promise<BlueprintExportResult> {
  try {
    const nbt = await loadPrismarineNbt();
    const validBlocks = validBlueprintBlocks(request);
    const paletteNames = [
      "minecraft:air",
      ...Array.from(
        new Set(validBlocks.map((block) => minecraftBlockNameFromType(block.type)))
      )
    ];
    const paletteIndex = new Map(paletteNames.map((name, index) => [name, index]));
    const volume = request.size.x * request.size.y * request.size.z;
    const blockStates = new Array<number>(volume).fill(0);

    validBlocks.forEach((block) => {
      const index = (block.y * request.size.z + block.z) * request.size.x + block.x;
      blockStates[index] =
        paletteIndex.get(minecraftBlockNameFromType(block.type)) ?? 0;
    });

    const tag = nbt.comp(
      {
        Version: nbt.int(2),
        DataVersion: nbt.int(STRUCTURE_DATA_VERSION),
        Width: nbt.short(request.size.x),
        Height: nbt.short(request.size.y),
        Length: nbt.short(request.size.z),
        Offset: nbt.intArray([0, 0, 0]),
        PaletteMax: nbt.int(paletteNames.length),
        Palette: nbt.comp(
          Object.fromEntries(paletteNames.map((name, index) => [name, nbt.int(index)]))
        ),
        BlockData: nbt.byteArray(Buffer.from(encodeVarints(blockStates))),
        BlockEntities: nbt.list(nbt.comp([])),
        Entities: nbt.list(nbt.comp([])),
        Metadata: nbt.comp({
          Name: nbt.string(request.name || "Every Helper Blueprint")
        })
      },
      "Schematic"
    );

    const gzipped = zlib.gzipSync(nbt.writeUncompressed(tag));
    return {
      ok: true,
      message: "Blueprint exportado como Sponge/WorldEdit SCHEM.",
      fileName: `${safeFileStem(request.name)}.schem`,
      bytes: Array.from(gzipped),
      blockCount: validBlocks.length,
      paletteCount: paletteNames.length
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel exportar o blueprint como SCHEM."
    };
  }
}

export async function exportBlueprintToLitematic(
  request: BlueprintExportRequest
): Promise<BlueprintExportResult> {
  try {
    const nbt = await loadPrismarineNbt();
    const validBlocks = validBlueprintBlocks(request);
    const paletteNames = [
      "minecraft:air",
      ...Array.from(
        new Set(validBlocks.map((block) => minecraftBlockNameFromType(block.type)))
      )
    ];
    const paletteIndex = new Map(paletteNames.map((name, index) => [name, index]));
    const volume = request.size.x * request.size.y * request.size.z;
    const blockStates = new Array<number>(volume).fill(0);

    validBlocks.forEach((block) => {
      const index = (block.y * request.size.z + block.z) * request.size.x + block.x;
      blockStates[index] =
        paletteIndex.get(minecraftBlockNameFromType(block.type)) ?? 0;
    });

    const now = BigInt(Date.now());
    const regionName = safeFileStem(request.name).replace(/[-_.]+/g, " ") || "Every Helper";
    const tag = nbt.comp(
      {
        Version: nbt.int(6),
        SubVersion: nbt.int(1),
        MinecraftDataVersion: nbt.int(STRUCTURE_DATA_VERSION),
        Metadata: nbt.comp({
          Name: nbt.string(request.name || "Every Helper Blueprint"),
          Author: nbt.string("Every Helper for Minecraft"),
          Description: nbt.string("Exported from Every Helper for Minecraft."),
          RegionCount: nbt.int(1),
          TotalBlocks: nbt.int(validBlocks.length),
          TotalVolume: nbt.int(volume),
          TimeCreated: nbt.long(now),
          TimeModified: nbt.long(now),
          EnclosingSize: nbt.comp({
            x: nbt.int(request.size.x),
            y: nbt.int(request.size.y),
            z: nbt.int(request.size.z)
          })
        }),
        Regions: nbt.comp({
          [regionName]: nbt.comp({
            Position: nbt.comp({
              x: nbt.int(0),
              y: nbt.int(0),
              z: nbt.int(0)
            }),
            Size: nbt.comp({
              x: nbt.int(request.size.x),
              y: nbt.int(request.size.y),
              z: nbt.int(request.size.z)
            }),
            BlockStatePalette: nbt.list(
              nbt.comp(
                paletteNames.map((name) => ({
                  Name: nbt.string(name)
                }))
              )
            ),
            BlockStates: nbt.longArray(
              packLitematicBlockStates(blockStates, paletteNames.length)
            ),
            TileEntities: nbt.list(nbt.comp([])),
            Entities: nbt.list(nbt.comp([])),
            PendingBlockTicks: nbt.list(nbt.comp([])),
            PendingFluidTicks: nbt.list(nbt.comp([]))
          })
        })
      },
      ""
    );

    const gzipped = zlib.gzipSync(nbt.writeUncompressed(tag));
    return {
      ok: true,
      message: "Blueprint exportado como Litematica.",
      fileName: `${safeFileStem(request.name)}.litematic`,
      bytes: Array.from(gzipped),
      blockCount: validBlocks.length,
      paletteCount: paletteNames.length
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel exportar o blueprint como Litematic."
    };
  }
}

async function loadPrismarineNbt() {
  const nbtModule = (await import("prismarine-nbt")) as unknown as {
    default?: PrismarineNbt;
  } & Partial<PrismarineNbt>;
  return (nbtModule.default ?? nbtModule) as PrismarineNbt;
}

function validBlueprintBlocks(request: BlueprintExportRequest) {
  return request.blocks.filter(
    (block) =>
      Number.isInteger(block.x) &&
      Number.isInteger(block.y) &&
      Number.isInteger(block.z) &&
      block.x >= 0 &&
      block.y >= 0 &&
      block.z >= 0 &&
      block.x < request.size.x &&
      block.y < request.size.y &&
      block.z < request.size.z
  );
}

function encodeVarints(values: number[]) {
  const bytes: number[] = [];
  values.forEach((initialValue) => {
    let value = initialValue >>> 0;
    do {
      let byte = value & 0x7f;
      value >>>= 7;
      if (value !== 0) byte |= 0x80;
      bytes.push(byte);
    } while (value !== 0);
  });
  return bytes;
}

function packLitematicBlockStates(values: number[], paletteCount: number) {
  const bitsPerBlock = Math.max(2, bitLength(paletteCount - 1));
  const longs = new Array<bigint>(Math.ceil((values.length * bitsPerBlock) / 64)).fill(
    0n
  );
  const mask = (1n << BigInt(bitsPerBlock)) - 1n;

  values.forEach((initialValue, index) => {
    const value = BigInt(initialValue) & mask;
    const bitOffset = index * bitsPerBlock;
    const longIndex = Math.floor(bitOffset / 64);
    const startBit = BigInt(bitOffset % 64);
    longs[longIndex] |= value << startBit;
    if (startBit + BigInt(bitsPerBlock) > 64n) {
      longs[longIndex + 1] |= value >> (64n - startBit);
    }
  });

  return longs.map((value) => BigInt.asIntN(64, value));
}

function bitLength(value: number) {
  if (value <= 0) return 0;
  return 32 - Math.clz32(value);
}

function safeFileStem(value: string) {
  const stem = value
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return stem || "every-helper-blueprint";
}

function minecraftBlockNameFromType(type: string) {
  const names: Record<string, string> = {
    grass: "minecraft:grass_block",
    stone: "minecraft:stone",
    oak: "minecraft:oak_planks",
    glass: "minecraft:glass",
    water: "minecraft:water",
    torch: "minecraft:torch",
    diamond: "minecraft:diamond_block"
  };
  return names[type] ?? "minecraft:stone";
}
