# Cubiomes WASM

This folder contains the small C bridge used to compile the official
[Cubiomes](https://github.com/Cubitect/cubiomes) generator to WebAssembly.

Build:

```powershell
npm run build:cubiomes
```

The script clones Emscripten SDK and Cubiomes into `.tmp/`, compiles
`src/renderer/wasm/cubiomes.wasm`, and copies the Cubiomes MIT license next to
the generated asset.
