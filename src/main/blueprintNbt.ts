import zlib from "node:zlib";
import type {
  BlueprintExportRequest,
  BlueprintExportResult
} from "../shared/contracts.js";

type PrismarineNbt = {
  comp: (value: object, name?: string) => unknown;
  int: (value: number | number[]) => unknown;
  string: (value: string) => unknown;
  list: (value: unknown) => unknown;
  writeUncompressed: (value: unknown) => Buffer;
};

const STRUCTURE_DATA_VERSION = 3700;

export async function exportBlueprintToNbt(
  request: BlueprintExportRequest
): Promise<BlueprintExportResult> {
  try {
    const nbtModule = (await import("prismarine-nbt")) as unknown as {
      default?: PrismarineNbt;
    } & Partial<PrismarineNbt>;
    const nbt = (nbtModule.default ?? nbtModule) as PrismarineNbt;
    const validBlocks = request.blocks.filter(
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
