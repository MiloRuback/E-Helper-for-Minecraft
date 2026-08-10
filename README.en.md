# Every Helper for Minecraft

Windows desktop app with practical tools for Minecraft players and creators: skins, seed maps, world inspection, cloud profile data and optional integrations.

<p align="center">
  <a href="https://github.com/MiloRuback/E-Helper-for-Minecraft/releases/latest">
    <img alt="Download for Windows" src="https://img.shields.io/badge/Download-Windows%20Installer-4ecca3?style=for-the-badge&logo=windows&logoColor=07111c">
  </a>
  <a href="README.md">
    <img alt="README em Portugues" src="https://img.shields.io/badge/README-Portugues-2f83c6?style=for-the-badge">
  </a>
</p>

![Seed Map](docs/images/seed-map.png)

## Channels

- `development`: full app with Skins, Blueprints, Seed Map, Worlds, Modpacks, Profile and Settings.
- `stable`: streamlined app for final use, without the Blueprints and Modpacks tabs.
- GitHub Releases publishes two installers per tag: `Development` and `Stable`.

## Features

- 64x64 skin editor with brush, eraser, fill bucket, eyedropper, base/overlay layers, symmetry, undo/redo, original Steve/Alex templates, PNG import/export and `skinview3d` preview.
- Cloud skin library: recently saved skins are stored in Supabase per user and can be loaded back into the editor.
- Seed Map inspired by Chunkbase, with Java/Bedrock, versions, Overworld/Nether/End, Overworld Surface/Subsurface/Abyssal layers, zoom from `1 px = 128 m` to `8 px = 1 m`, structure filters and visited markers.
- Java world importer with `level.dat`, `.mca` regions, sampled chunks, biomes, heightmap relief, spawn and structures recorded in chunks.
- Local/synced profile with display name, bio, pronouns, Minecraft avatar and Supabase login.
- Local JSON backup/restore and optional Google Drive integration.
- Optional Microsoft/Minecraft integration for official UUID, username, skin and avatar lookup.
- Desktop build with Electron, React, TypeScript, Vite and `electron-builder`.

## Gallery

| Cloud skin library | Chunk-based world map |
| --- | --- |
| ![Skin Library](docs/images/skin-library.png) | ![World Map](docs/images/world-map.png) |

## Database and cloud

The cloud backend uses Supabase, combining PostgreSQL, Auth and auto-generated APIs with Row Level Security.

Main model:

- `profiles`: editable user profile, avatar and Minecraft data.
- `user_skins`: cloud library for skins saved in the editor. Each row stores `user_id`, name, PNG in `skin_data`, model (`standard` or `slim`) and timestamps.
- `user_settings`: syncable app preferences.
- `user_worlds`, `user_blueprints`, `user_modpacks`: prepared user-owned module tables.

Security model:

- RLS enabled on every exposed table.
- Owner-only policies using `auth.uid()`, preventing users from reading or changing each other's rows.
- Indexes on `user_id` and `user_skins(user_id, updated_at desc)` for fast skin library loading.
- The client only uses a publishable key. Never place service role keys, client secrets, personal tokens or passwords in `.env`, README files or renderer code.
- `.env` is ignored by Git; use `.env.example` as a template.

## Integrations

- Supabase: email/password login and profile/skin sync.
- Google Drive: desktop OAuth with PKCE and `drive.file` scope for JSON backup/restore.
- Microsoft/Minecraft: Microsoft OAuth, Xbox Live, XSTS and Minecraft Services when a Client ID is configured.
- GitHub Releases: Windows workflow generates Stable and Development installers.
- Auto-update: packaged builds use `electron-updater` to check published releases.

See [docs/INTEGRATIONS_SETUP.md](docs/INTEGRATIONS_SETUP.md).

## Run locally

```bash
npm install
npm run dev
```

## Builds

Development build:

```bash
npm run build
npm run dist
```

Stable build, without Blueprints/Modpacks:

```bash
npm run build:stable
npm run dist:stable
```

The NSIS installer is generated in `release/`.

## GitHub release

Create a tag to trigger the workflow:

```bash
git tag v0.1.21
git push origin v0.1.21
```

The `.github/workflows/release.yml` workflow publishes:

- `Every-Helper-for-Minecraft-Development-Setup-<version>.exe`
- `Every-Helper-for-Minecraft-Stable-Setup-<version>.exe`

## Local validation

QA commands used in this project:

```bash
npm run build
npm run build:stable
node tools/qa/seed-map-ux.mjs
node tools/qa/skin-library-ux.mjs
node tools/qa/world-map-ux.mjs
$env:MASTERGAMMES_WORLD_PATH="C:\path\to\MasterGammes 275"
node tools/qa/mastergammes-world.mjs
```
