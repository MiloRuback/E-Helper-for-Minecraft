# Every Helper for Minecraft

Windows desktop app built with Electron, React, TypeScript and Vite. This delivery turns the two requirement documents into a runnable school-presentation version, with local/offline behavior by default and integration points prepared for Supabase, Google Drive and Microsoft/Minecraft.

[Download the Windows installer](https://github.com/MiloRuback/E-Helper-for-Minecraft/releases/latest)

[README em Portugues](README.md)

## Included

- Frameless desktop window, dark mode, responsive layout and 800x500 minimum size.
- First-run onboarding with local account, PT-BR/EN-US language and preferences.
- 64x64 skin editor with brush, eraser, fill bucket, eyedropper, base/overlay layers, symmetry, undo/redo, Steve/Alex templates, PNG import/export and `skinview3d` preview.
- Blueprint editor with Y-layer grid, block palette, Three.js 3D preview, `.every-blueprint.json` import/export, Java Structure `.nbt` export, Sponge/WorldEdit `.schem` export, Litematica `.litematic` export and `.litematic`, `.schem`, Java Structure `.nbt` import.
- Seed Map with Cubiomes WASM, official Mojang release list while online, 102-version offline fallback, seed, pan, zoom, coordinates, real biomes and structure markers.
- Java world-folder importer with `level.dat` reading, `.mca` chunk counting, heightmap/biome sampling and Overworld/Nether/End region view.
- Modpack manager by folder, `.jar` listing, config/resourcepack/shaderpack counts, shareable `.zip` export and isolated Minecraft Launcher profile creation with `launcher_profiles.json` backup.
- Local profile with bio, pronouns and Minecraft avatar lookup via the public Mojang API.
- Settings, local JSON backup/restore and Supabase/Drive/Microsoft connections.
- Windows build through `electron-builder` and GitHub Releases workflow.

## Real integrations

- Supabase: project `ctqgcnsfdvxtnkejeusd` has the migrations in `supabase/migrations/`, with user-owned tables, RLS, `user_id` indexes, hardened functions and zero security advisor findings. The app is already prefilled with the public URL and publishable key.
- Google Drive: the app uses desktop OAuth with PKCE and `drive.file`, creates an `Every Helper` folder and uploads/restores JSON backups.
- Microsoft/Minecraft: the app uses Microsoft OAuth, Xbox Live, XSTS and Minecraft Services to fetch UUID, username, skin and avatar when a Client ID is configured.
- GitHub: the correct repo is `MiloRuback/E-Helper-for-Minecraft`, with a release workflow that builds the `.exe` installer.
- Auto-update: the packaged app uses `electron-updater` to check new versions published in GitHub Releases.

## Public credentials needed

- Supabase Auth is already configured with public URL and publishable key; users only need to sign up or sign in with email and password.
- Google Drive needs an OAuth Client ID of type Desktop app.
- Microsoft/Minecraft needs a Microsoft Entra ID/consumers Client ID with loopback redirect support.

Do not paste service role keys, client secrets, personal tokens or passwords into the app.

See `docs/INTEGRATIONS_SETUP.md` for the setup steps.

## Remaining technical limits

- Blueprint import supports `.litematic`, `.schem` and Java Structure `.nbt` through `@taku128/java-schematic`; export supports `.every-blueprint.json`, Java Structure `.nbt`, Sponge/WorldEdit `.schem` and Litematica `.litematic`. Classic legacy `.schematic` is intentionally rejected by that converter.

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

## GitHub release

Create a tag to trigger the workflow:

```bash
git tag v0.1.13
git push origin v0.1.13
```

The `.github/workflows/release.yml` workflow builds on Windows and publishes the `.exe` as a release asset. The repository is public to avoid 404 errors on the download link.
