#include <stdint.h>

#include "biomes.h"
#include "finders.h"
#include "generator.h"
#include "util.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif

static Generator generator;
static int current_mc = MC_1_21;
static int current_dim = DIM_OVERWORLD;
static uint64_t current_seed = 0;
static Pos last_structure_pos = {0, 0};
static Pos stronghold_positions[256];
static int stronghold_count = 0;
static int initialized = 0;

static int normalize_mc(int mc) {
  if (mc <= MC_UNDEF) return MC_1_21;
  if (mc > MC_NEWEST) return MC_NEWEST;
  return mc;
}

EXPORT int eh_mc_latest(void) { return MC_NEWEST; }

EXPORT void eh_init(int mc, int dim, int seed_hi, int seed_lo) {
  current_mc = normalize_mc(mc);
  current_dim = dim;
  current_seed = ((uint64_t)(uint32_t)seed_hi << 32) | (uint32_t)seed_lo;
  setupGenerator(&generator, current_mc, 0);
  applySeed(&generator, current_dim, current_seed);
  initialized = 1;
}

EXPORT int eh_biome_at(int block_x, int y, int block_z) {
  if (!initialized) {
    eh_init(MC_1_21, DIM_OVERWORLD, 0, 0);
  }
  return getBiomeAt(&generator, 1, block_x, y, block_z);
}

EXPORT const char *eh_biome_name(int biome_id) {
  const char *name = biome2str(current_mc, biome_id);
  return name ? name : "unknown";
}

EXPORT int eh_structure_region_size(int structure_type) {
  StructureConfig config;
  if (!getStructureConfig(structure_type, current_mc, &config)) return 0;
  return config.regionSize;
}

EXPORT int eh_structure_find(int structure_type, int reg_x, int reg_z) {
  if (!initialized) {
    eh_init(MC_1_21, DIM_OVERWORLD, 0, 0);
  }

  Pos pos;
  if (!getStructurePos(structure_type, current_mc, current_seed, reg_x, reg_z, &pos)) {
    return 0;
  }

  if (!isViableStructurePos(structure_type, &generator, pos.x, pos.z, 0)) {
    return 0;
  }

  last_structure_pos = pos;
  return 1;
}

EXPORT int eh_structure_x(void) { return last_structure_pos.x; }

EXPORT int eh_structure_z(void) { return last_structure_pos.z; }

EXPORT int eh_strongholds_find(int min_chunk_x, int max_chunk_x, int min_chunk_z, int max_chunk_z) {
  if (!initialized) {
    eh_init(MC_1_21, DIM_OVERWORLD, 0, 0);
  }

  stronghold_count = 0;
  if (current_dim != DIM_OVERWORLD) return 0;

  int min_x = min_chunk_x * 16;
  int max_x = (max_chunk_x + 1) * 16 - 1;
  int min_z = min_chunk_z * 16;
  int max_z = (max_chunk_z + 1) * 16 - 1;

  StrongholdIter sh;
  initFirstStronghold(&sh, current_mc, current_seed);
  int generated = 0;
  while (stronghold_count < 256 && generated < 128 && nextStronghold(&sh, &generator) > 0) {
    generated += 1;
    if (sh.pos.x >= min_x && sh.pos.x <= max_x && sh.pos.z >= min_z && sh.pos.z <= max_z) {
      stronghold_positions[stronghold_count] = sh.pos;
      stronghold_count += 1;
    }
  }

  return stronghold_count;
}

EXPORT int eh_stronghold_x(int index) {
  if (index < 0 || index >= stronghold_count) return 0;
  return stronghold_positions[index].x;
}

EXPORT int eh_stronghold_z(int index) {
  if (index < 0 || index >= stronghold_count) return 0;
  return stronghold_positions[index].z;
}
