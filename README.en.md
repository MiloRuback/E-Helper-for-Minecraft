# Every Helper for Minecraft

Windows desktop app built with Electron, React, TypeScript and Vite. This delivery turns the two requirement documents into a runnable school-presentation version, with local/offline behavior by default and integration points prepared for Supabase, Google Drive and Microsoft/Minecraft.

[Download the Windows installer](https://github.com/MiloRuback/E-Helper-for-Minecraft/releases/latest)

## Included

- Frameless desktop window, dark mode, responsive layout and 800x500 minimum size.
- First-run onboarding with local account, PT-BR/EN-US language and preferences.
- 64x64 skin editor with brush, eraser, fill bucket, eyedropper, base/overlay layers, symmetry, undo/redo, Steve/Alex templates, PNG import/export and `skinview3d` preview.
- Blueprint editor with Y-layer grid, block palette, Three.js 3D preview and `.every-blueprint.json` import/export.
- Deterministic offline Seed Map with seed, version, pan, zoom, coordinates, biomes and structure markers.
- Java world-folder importer with `level.dat` reading, `.mca` chunk counting and Overworld/Nether/End region view.
- Modpack manager by folder, `.jar` listing, config/resourcepack/shaderpack counts and isolated Minecraft Launcher profile creation with `launcher_profiles.json` backup.
- Local profile with bio, pronouns and Minecraft avatar lookup via the public Mojang API.
- Settings, local JSON backup/restore and Supabase/Drive/Microsoft flags.
- Windows build through `electron-builder` and GitHub Releases workflow.

## Real integrations

- Supabase: project `ctqgcnsfdvxtnkejeusd` has the migration in `supabase/migrations/20260809142000_every_helper_initial_schema.sql`, with user-owned tables and RLS.
- Google Drive: the app uses desktop OAuth with PKCE and `drive.file`, creates an `Every Helper` folder and uploads/restores JSON backups.
- Microsoft/Minecraft: the app uses Microsoft OAuth, Xbox Live, XSTS and Minecraft Services to fetch UUID, username, skin and avatar when a Client ID is configured.
- GitHub: the correct repo is `MiloRuback/E-Helper-for-Minecraft`, with a release workflow that builds the `.exe` installer.

## Public credentials needed

- Supabase Auth needs the project's anon key in Settings or `.env`.
- Google Drive needs an OAuth Client ID of type Desktop app.
- Microsoft/Minecraft needs a Microsoft Entra ID/consumers Client ID with loopback redirect support.

Do not paste service role keys, client secrets, personal tokens or passwords into the app.

## Remaining technical limits

- Seed Map uses a deterministic offline generator. For exact Chunkbase parity, replace it with Cubiomes WASM.
- Blueprint import supports `.litematic`, `.schem` and Java Structure `.nbt` through `@taku128/java-schematic`. Classic legacy `.schematic` is intentionally rejected by that converter.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Windows installer

```bash
npm run dist
```

The NSIS installer is generated in `release/`.
