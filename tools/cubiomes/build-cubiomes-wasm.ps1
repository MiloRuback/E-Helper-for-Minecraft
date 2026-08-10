$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$emsdkRoot = Join-Path $repoRoot ".tmp\emsdk"
$cubiomesRoot = Join-Path $repoRoot ".tmp\cubiomes"
$outDir = Join-Path $repoRoot "src\renderer\wasm"
$outFile = Join-Path $outDir "cubiomes.wasm"

if (!(Test-Path $emsdkRoot)) {
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git $emsdkRoot
  & (Join-Path $emsdkRoot "emsdk.bat") install latest
  & (Join-Path $emsdkRoot "emsdk.bat") activate latest
}

if (!(Test-Path $cubiomesRoot)) {
  git clone --depth 1 https://github.com/Cubitect/cubiomes.git $cubiomesRoot
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$emcc = Join-Path $emsdkRoot "upstream\emscripten\emcc.exe"
if (!(Test-Path $emcc)) {
  throw "emcc nao encontrado em $emcc. Rode .tmp\emsdk\emsdk.bat install latest."
}

& $emcc `
  (Join-Path $PSScriptRoot "cubiomes_bridge.c") `
  (Join-Path $cubiomesRoot "biomenoise.c") `
  (Join-Path $cubiomesRoot "biomes.c") `
  (Join-Path $cubiomesRoot "finders.c") `
  (Join-Path $cubiomesRoot "generator.c") `
  (Join-Path $cubiomesRoot "layers.c") `
  (Join-Path $cubiomesRoot "noise.c") `
  (Join-Path $cubiomesRoot "quadbase.c") `
  (Join-Path $cubiomesRoot "util.c") `
  "-I$cubiomesRoot" `
  -O3 `
  --no-entry `
  "-sEXPORTED_FUNCTIONS=['_eh_mc_latest','_eh_init','_eh_biome_at','_eh_biome_name','_eh_structure_region_size','_eh_structure_find','_eh_structure_x','_eh_structure_z','_eh_strongholds_find','_eh_stronghold_x','_eh_stronghold_z']" `
  -o $outFile

Copy-Item -LiteralPath (Join-Path $cubiomesRoot "LICENSE") -Destination (Join-Path $outDir "CUBIOMES_LICENSE.txt") -Force
Write-Output "Built $outFile"
