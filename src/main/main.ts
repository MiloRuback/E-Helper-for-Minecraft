import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import type { OpenDialogOptions } from "electron";
import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { exportBlueprintToNbt } from "./blueprintNbt.js";
import type {
  CloudBackupPayload,
  BlueprintConvertRequest,
  BlueprintConvertResult,
  BlueprintExportRequest,
  BlueprintExportResult,
  DimensionSummary,
  DriveBackupRequest,
  DriveBackupResult,
  DriveConnectRequest,
  LauncherProfileRequest,
  LauncherProfileResult,
  MicrosoftConnectRequest,
  MinecraftProfileResult,
  ModFileSummary,
  ModpackFolderSummary,
  RegionSummary,
  WorldDimensionKey,
  WorldSummary
} from "../shared/contracts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#10151f",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle("window:close", () => mainWindow?.close());

ipcMain.handle("shell:open-external", async (_event, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle("world:select-folder", async (): Promise<WorldSummary> => {
  const options: OpenDialogOptions = {
    title: "Selecionar pasta do mundo Minecraft",
    properties: ["openDirectory"]
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, error: "Selecao cancelada." };
  }

  return inspectWorldFolder(result.filePaths[0]);
});

ipcMain.handle(
  "modpack:select-folder",
  async (): Promise<ModpackFolderSummary> => {
    const options: OpenDialogOptions = {
      title: "Selecionar pasta do modpack",
      properties: ["openDirectory"]
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, error: "Selecao cancelada." };
    }

    return inspectModpackFolder(result.filePaths[0]);
  }
);

ipcMain.handle(
  "modpack:install-launcher-profile",
  async (_event, request: LauncherProfileRequest): Promise<LauncherProfileResult> =>
    installLauncherProfile(request)
);

ipcMain.handle("modpack:open-launcher", async (): Promise<LauncherProfileResult> => {
  try {
    await shell.openExternal("minecraft://");
    return { ok: true, message: "Launcher do Minecraft solicitado ao Windows." };
  } catch {
    try {
      const launcherPath = path.join(
        process.env.LOCALAPPDATA ?? "",
        "Packages",
        "Microsoft.4297127D64EC6_8wekyb3d8bbwe"
      );
      await shell.openPath(launcherPath);
      return {
        ok: true,
        message: "Nao consegui abrir pelo protocolo, mas abri a area do launcher."
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel abrir o launcher."
      };
    }
  }
});

ipcMain.handle(
  "blueprint:convert",
  async (_event, request: BlueprintConvertRequest): Promise<BlueprintConvertResult> => {
    try {
      const { convertBuffer } = (await import("@taku128/java-schematic")) as {
        convertBuffer: (buffer: Uint8Array) => Promise<{
          nbt: Uint8Array;
          size: number[];
          blockCount: number;
          paletteCount: number;
          format: string;
        }>;
      };
      const nbt = (await import("prismarine-nbt")) as unknown as {
        parse: (data: Buffer) => Promise<{ parsed: unknown }>;
        simplify: (value: unknown) => {
          size?: number[];
          palette?: Array<{ Name?: string }>;
          blocks?: Array<{ pos?: number[]; state?: number }>;
        };
      };

      const converted = await convertBuffer(Uint8Array.from(request.bytes));
      const parsed = await nbt.parse(Buffer.from(converted.nbt));
      const structure = nbt.simplify(parsed.parsed);
      const palette = structure.palette ?? [];
      const blocks =
        structure.blocks
          ?.map((block) => {
            const pos = block.pos ?? [0, 0, 0];
            const name = palette[block.state ?? 0]?.Name ?? "minecraft:stone";
            if (name === "minecraft:air" || name === "minecraft:cave_air") return null;
            return {
              x: pos[0] ?? 0,
              y: pos[1] ?? 0,
              z: pos[2] ?? 0,
              name
            };
          })
          .filter(Boolean)
          .slice(0, 20000) as BlueprintConvertResult["blocks"];
      const size = structure.size ?? converted.size ?? [16, 16, 16];

      return {
        ok: true,
        message: "Blueprint convertido.",
        name: request.fileName.replace(/\.(litematic|schem|schematic|nbt)$/i, ""),
        format: converted.format,
        blockCount: converted.blockCount,
        paletteCount: converted.paletteCount,
        size: {
          x: Math.max(1, Math.min(64, size[0] ?? 16)),
          y: Math.max(1, Math.min(64, size[1] ?? 16)),
          z: Math.max(1, Math.min(64, size[2] ?? 16))
        },
        blocks
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel converter o blueprint."
      };
    }
  }
);

ipcMain.handle(
  "blueprint:export-nbt",
  async (_event, request: BlueprintExportRequest): Promise<BlueprintExportResult> =>
    exportBlueprintToNbt(request)
);

ipcMain.handle(
  "drive:connect",
  async (_event, request: DriveConnectRequest): Promise<DriveBackupResult> => {
    try {
      await ensureGoogleToken(request.clientId, true);
      const folderId = await ensureDriveFolder(request.clientId);
      return {
        ok: true,
        message: "Google Drive conectado. A pasta Every Helper esta pronta.",
        folderId
      };
    } catch (error) {
      return driveError(error);
    }
  }
);

ipcMain.handle(
  "drive:upload-backup",
  async (_event, request: DriveBackupRequest): Promise<DriveBackupResult> => {
    try {
      const folderId = await ensureDriveFolder(request.clientId);
      const fileName = `every-helper-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;
      const file = await uploadDriveJson(
        request.clientId,
        folderId,
        fileName,
        request.payload
      );

      return {
        ok: true,
        message: "Backup enviado ao Google Drive.",
        folderId,
        fileId: valueAsString((file as Record<string, unknown>).id),
        fileName: valueAsString((file as Record<string, unknown>).name),
        modifiedTime: valueAsString((file as Record<string, unknown>).modifiedTime)
      };
    } catch (error) {
      return driveError(error);
    }
  }
);

ipcMain.handle(
  "drive:restore-backup",
  async (_event, request: DriveConnectRequest): Promise<DriveBackupResult> => {
    try {
      const folderId = await ensureDriveFolder(request.clientId);
      const latest = await findLatestDriveBackup(request.clientId, folderId);
      if (!latest) {
        return {
          ok: false,
          message: "Nenhum backup do Every Helper foi encontrado no Google Drive.",
          folderId
        };
      }

      const payload = await downloadDriveJson(
        request.clientId,
        valueAsString(latest.id) ?? ""
      );

      return {
        ok: true,
        message: "Backup restaurado do Google Drive.",
        folderId,
        fileId: valueAsString(latest.id),
        fileName: valueAsString(latest.name),
        modifiedTime: valueAsString(latest.modifiedTime),
        payload
      };
    } catch (error) {
      return driveError(error);
    }
  }
);

ipcMain.handle(
  "minecraft:connect-microsoft",
  async (
    _event,
    request: MicrosoftConnectRequest
  ): Promise<MinecraftProfileResult> => {
    try {
      const token = await ensureMicrosoftToken(request.clientId, true);
      const profile = await fetchMinecraftProfile(token.access_token);
      return {
        ok: true,
        message: "Conta Microsoft/Minecraft conectada.",
        ...profile
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel conectar a conta Microsoft/Minecraft."
      };
    }
  }
);

async function inspectWorldFolder(folderPath: string): Promise<WorldSummary> {
  try {
    const level = await parseLevelDat(path.join(folderPath, "level.dat"));
    const dimensions = await Promise.all([
      scanDimension("overworld", "Overworld", path.join(folderPath, "region")),
      scanDimension("nether", "Nether", path.join(folderPath, "DIM-1", "region")),
      scanDimension("end", "The End", path.join(folderPath, "DIM1", "region"))
    ]);

    return {
      ok: true,
      path: folderPath,
      name: level.name ?? path.basename(folderPath),
      seed: level.seed,
      spawn: level.spawn,
      gameMode: level.gameMode,
      dimensions
    };
  } catch (error) {
    return {
      ok: false,
      path: folderPath,
      error: error instanceof Error ? error.message : "Falha ao ler o mundo."
    };
  }
}

async function parseLevelDat(levelPath: string) {
  const exists = await existsPath(levelPath);
  if (!exists) {
    return {
      name: undefined,
      seed: undefined,
      spawn: undefined,
      gameMode: undefined
    };
  }

  const raw = await fs.readFile(levelPath);
  const nbt = (await import("prismarine-nbt")) as unknown as {
    parse: (data: Buffer) => Promise<{ parsed?: unknown } | unknown>;
    simplify: (value: unknown) => Record<string, unknown>;
  };

  const buffers = [raw, tryInflate(raw, "gunzip"), tryInflate(raw, "inflate")].filter(
    Boolean
  ) as Buffer[];

  for (const buffer of buffers) {
    try {
      const parsed = await nbt.parse(buffer);
      const simplified = nbt.simplify(
        typeof parsed === "object" && parsed !== null && "parsed" in parsed
          ? (parsed as { parsed?: unknown }).parsed
          : parsed
      );
      const data = (simplified.Data ?? simplified) as Record<string, unknown>;
      const worldGen = (data.WorldGenSettings ?? {}) as Record<string, unknown>;

      return {
        name: valueAsString(data.LevelName),
        seed: valueAsString(worldGen.seed ?? data.RandomSeed),
        spawn: {
          x: valueAsNumber(data.SpawnX),
          y: valueAsNumber(data.SpawnY),
          z: valueAsNumber(data.SpawnZ)
        },
        gameMode: gameModeName(valueAsNumber(data.GameType))
      };
    } catch {
      continue;
    }
  }

  return {
    name: undefined,
    seed: undefined,
    spawn: undefined,
    gameMode: undefined
  };
}

function tryInflate(buffer: Buffer, type: "gunzip" | "inflate") {
  try {
    return type === "gunzip" ? zlib.gunzipSync(buffer) : zlib.inflateSync(buffer);
  } catch {
    return null;
  }
}

async function scanDimension(
  key: WorldDimensionKey,
  label: string,
  regionPath: string
): Promise<DimensionSummary> {
  const exists = await existsPath(regionPath);
  if (!exists) {
    return { key, label, path: null, regions: [], totalChunks: 0 };
  }

  const files = await fs.readdir(regionPath);
  const regions: RegionSummary[] = [];

  for (const fileName of files) {
    const match = /^r\.(-?\d+)\.(-?\d+)\.mca$/i.exec(fileName);
    if (!match) continue;

    const fullPath = path.join(regionPath, fileName);
    const stat = await fs.stat(fullPath);
    regions.push({
      fileName,
      x: Number(match[1]),
      z: Number(match[2]),
      chunks: await countRegionChunks(fullPath),
      lastModified: stat.mtime.toISOString()
    });
  }

  regions.sort((a, b) => a.z - b.z || a.x - b.x);

  return {
    key,
    label,
    path: regionPath,
    regions,
    totalChunks: regions.reduce((sum, region) => sum + region.chunks, 0)
  };
}

async function countRegionChunks(filePath: string) {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(4096);
    await handle.read(buffer, 0, 4096, 0);
    let chunks = 0;
    for (let i = 0; i < 1024; i += 1) {
      const offset = buffer.readUIntBE(i * 4, 3);
      const sectorCount = buffer[i * 4 + 3];
      if (offset > 0 && sectorCount > 0) chunks += 1;
    }
    return chunks;
  } finally {
    await handle.close();
  }
}

async function inspectModpackFolder(folderPath: string): Promise<ModpackFolderSummary> {
  try {
    const stats = {
      mods: [] as ModFileSummary[],
      configs: 0,
      resourcePacks: 0,
      shaderPacks: 0,
      saves: 0,
      acceptedFiles: 0,
      totalSizeMb: 0
    };

    await walkModpack(folderPath, folderPath, stats, 0);

    return {
      ok: true,
      path: folderPath,
      name: path.basename(folderPath),
      mods: stats.mods.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 300),
      configs: stats.configs,
      resourcePacks: stats.resourcePacks,
      shaderPacks: stats.shaderPacks,
      saves: stats.saves,
      acceptedFiles: stats.acceptedFiles,
      totalSizeMb: Number(stats.totalSizeMb.toFixed(2))
    };
  } catch (error) {
    return {
      ok: false,
      path: folderPath,
      error: error instanceof Error ? error.message : "Falha ao ler o modpack."
    };
  }
}

async function walkModpack(
  rootPath: string,
  folderPath: string,
  stats: {
    mods: ModFileSummary[];
    configs: number;
    resourcePacks: number;
    shaderPacks: number;
    saves: number;
    acceptedFiles: number;
    totalSizeMb: number;
  },
  depth: number
) {
  if (depth > 4 || stats.acceptedFiles > 5000) return;
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);
    const normalized = relativePath.replace(/\\/g, "/").toLowerCase();

    if (entry.isDirectory()) {
      if (normalized === "saves" || normalized.startsWith("saves/")) {
        stats.saves += 1;
      }
      await walkModpack(rootPath, fullPath, stats, depth + 1);
      continue;
    }

    const stat = await fs.stat(fullPath);
    const sizeMb = stat.size / (1024 * 1024);
    stats.totalSizeMb += sizeMb;

    if (entry.name.toLowerCase().endsWith(".jar")) {
      stats.mods.push({
        name: entry.name,
        relativePath,
        sizeMb: Number(sizeMb.toFixed(2)),
        versionHint: inferVersion(entry.name)
      });
      stats.acceptedFiles += 1;
    } else if (/\.(toml|json|cfg|properties)$/i.test(entry.name)) {
      stats.configs += 1;
      stats.acceptedFiles += 1;
    } else if (normalized.includes("resourcepacks/") && entry.name.endsWith(".zip")) {
      stats.resourcePacks += 1;
      stats.acceptedFiles += 1;
    } else if (normalized.includes("shaderpacks/") && entry.name.endsWith(".zip")) {
      stats.shaderPacks += 1;
      stats.acceptedFiles += 1;
    }
  }
}

async function installLauncherProfile(
  request: LauncherProfileRequest
): Promise<LauncherProfileResult> {
  try {
    const minecraftDir = path.join(process.env.APPDATA ?? "", ".minecraft");
    if (!minecraftDir.trim()) {
      return { ok: false, message: "APPDATA nao esta disponivel neste Windows." };
    }

    await fs.mkdir(minecraftDir, { recursive: true });
    const profilePath = path.join(minecraftDir, "launcher_profiles.json");
    const exists = await existsPath(profilePath);
    const backupPath = exists
      ? `${profilePath}.every-helper-backup-${Date.now()}.json`
      : undefined;

    let launcher: Record<string, unknown> = {};
    if (exists) {
      const text = await fs.readFile(profilePath, "utf8");
      if (backupPath) await fs.writeFile(backupPath, text, "utf8");
      launcher = text.trim() ? JSON.parse(text) : {};
    }

    const profiles = {
      ...((launcher.profiles ?? {}) as Record<string, unknown>)
    };
    const id = `every-helper-${request.id.replace(/[^a-z0-9_-]/gi, "-")}`;
    const now = new Date().toISOString();
    const lastVersionId =
      request.loader === "vanilla"
        ? request.minecraftVersion
        : `${request.loader}-${request.minecraftVersion}`;

    profiles[id] = {
      name: request.name,
      type: "custom",
      created: now,
      lastUsed: now,
      gameDir: request.gameDir,
      lastVersionId
    };

    const nextLauncher = {
      ...launcher,
      profiles,
      selectedProfile: id
    };

    await fs.writeFile(profilePath, JSON.stringify(nextLauncher, null, 2), "utf8");

    return {
      ok: true,
      message:
        "Perfil criado no Minecraft Launcher. Abra o launcher e selecione o perfil do Every Helper.",
      profilePath,
      backupPath
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar o perfil do launcher."
    };
  }
}

async function existsPath(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function valueAsString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value && typeof value === "object" && "value" in value) {
    return valueAsString((value as { value?: unknown }).value);
  }
  return undefined;
}

function valueAsNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value && typeof value === "object" && "value" in value) {
    return valueAsNumber((value as { value?: unknown }).value);
  }
  return undefined;
}

function gameModeName(gameMode?: number) {
  switch (gameMode) {
    case 0:
      return "Survival";
    case 1:
      return "Creative";
    case 2:
      return "Adventure";
    case 3:
      return "Spectator";
    default:
      return undefined;
  }
}

function inferVersion(fileName: string) {
  return (
    fileName.match(/\b\d+\.\d+(?:\.\d+)?\b/)?.[0] ??
    fileName.match(/\bmc\d+\.\d+(?:\.\d+)?\b/i)?.[0]?.replace(/^mc/i, "")
  );
}

interface OAuthTokenSet {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
}

interface OAuthProviderConfig {
  provider: "google-drive" | "microsoft";
  clientId: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  extraAuthParams?: Record<string, string>;
}

function driveError(error: unknown): DriveBackupResult {
  return {
    ok: false,
    message:
      error instanceof Error
        ? error.message
        : "Falha na integracao com Google Drive."
  };
}

async function ensureGoogleToken(clientId: string, forceLogin = false) {
  if (!clientId.trim()) {
    throw new Error("Informe o Google OAuth Client ID nas configuracoes.");
  }

  return ensureOAuthToken(
    {
      provider: "google-drive",
      clientId,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/drive.file",
      extraAuthParams: {
        access_type: "offline",
        prompt: "consent"
      }
    },
    forceLogin
  );
}

async function ensureMicrosoftToken(clientId: string, forceLogin = false) {
  if (!clientId.trim()) {
    throw new Error("Informe o Microsoft OAuth Client ID nas configuracoes.");
  }

  return ensureOAuthToken(
    {
      provider: "microsoft",
      clientId,
      authorizeUrl:
        "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
      scope: "XboxLive.signin offline_access"
    },
    forceLogin
  );
}

async function ensureOAuthToken(config: OAuthProviderConfig, forceLogin = false) {
  const stored = forceLogin ? null : await getStoredToken(config.provider);
  if (stored?.access_token && stored.expires_at && stored.expires_at > Date.now() + 60_000) {
    return stored;
  }

  if (!forceLogin && stored?.refresh_token) {
    try {
      const refreshed = await refreshOAuthToken(config, stored.refresh_token);
      await setStoredToken(config.provider, refreshed);
      return refreshed;
    } catch {
      // Fall through to full OAuth.
    }
  }

  const token = await runAuthorizationCodeWithPkce(config);
  await setStoredToken(config.provider, token);
  return token;
}

async function refreshOAuthToken(config: OAuthProviderConfig, refreshToken: string) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(valueAsString(payload.error_description) ?? "Falha ao renovar token.");
  }

  return normalizeToken(payload, refreshToken);
}

async function runAuthorizationCodeWithPkce(config: OAuthProviderConfig) {
  const verifier = base64Url(randomBytes(64));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const state = base64Url(randomBytes(24));

  const server = http.createServer();
  const redirectUri = await new Promise<string>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve(`http://127.0.0.1:${port}/oauth/callback`);
    });
  });

  const codePromise = waitForOAuthCode(server, state);
  const authUrl = new URL(config.authorizeUrl);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  Object.entries(config.extraAuthParams ?? {}).forEach(([key, value]) => {
    authUrl.searchParams.set(key, value);
  });

  await shell.openExternal(authUrl.toString());
  const code = await codePromise;

  const body = new URLSearchParams({
    client_id: config.clientId,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(valueAsString(payload.error_description) ?? "Falha no OAuth.");
  }

  return normalizeToken(payload);
}

function waitForOAuthCode(server: http.Server, expectedState: string) {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error("Tempo esgotado aguardando login OAuth."));
    }, 180_000);

    server.on("request", (request, response) => {
      try {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) throw new Error(error);
        if (state !== expectedState) throw new Error("Estado OAuth invalido.");
        if (!code) throw new Error("Codigo OAuth ausente.");

        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end("<h1>Every Helper conectado</h1><p>Voce pode voltar ao app.</p>");
        clearTimeout(timer);
        server.close();
        resolve(code);
      } catch (error) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(error instanceof Error ? error.message : "OAuth invalido.");
        clearTimeout(timer);
        server.close();
        reject(error);
      }
    });
  });
}

function normalizeToken(payload: Record<string, unknown>, refreshFallback?: string): OAuthTokenSet {
  const expiresIn = valueAsNumber(payload.expires_in) ?? 3600;
  const accessToken = valueAsString(payload.access_token);
  if (!accessToken) throw new Error("Resposta OAuth sem access_token.");

  return {
    access_token: accessToken,
    refresh_token: valueAsString(payload.refresh_token) ?? refreshFallback,
    token_type: valueAsString(payload.token_type),
    scope: valueAsString(payload.scope),
    expires_at: Date.now() + expiresIn * 1000
  };
}

function base64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function googleDriveRequest(
  clientId: string,
  url: string,
  init: RequestInit = {},
  retry = true
) {
  const token = await ensureGoogleToken(clientId);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token.access_token}`
    }
  });

  if (response.status === 401 && retry && token.refresh_token) {
    const refreshed = await refreshOAuthToken(
      {
        provider: "google-drive",
        clientId,
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scope: "https://www.googleapis.com/auth/drive.file"
      },
      token.refresh_token
    );
    await setStoredToken("google-drive", refreshed);
    return googleDriveRequest(clientId, url, init, false);
  }

  return response;
}

async function ensureDriveFolder(clientId: string) {
  const query =
    "name = 'Every Helper' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const listUrl = new URL("https://www.googleapis.com/drive/v3/files");
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("spaces", "drive");
  listUrl.searchParams.set("fields", "files(id,name)");

  const listResponse = await googleDriveRequest(clientId, listUrl.toString());
  const listPayload = (await listResponse.json()) as { files?: Array<{ id?: string }> };
  if (!listResponse.ok) throw new Error("Falha ao procurar pasta no Google Drive.");
  const existing = listPayload.files?.[0]?.id;
  if (existing) return existing;

  const createResponse = await googleDriveRequest(
    clientId,
    "https://www.googleapis.com/drive/v3/files?fields=id,name",
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        name: "Every Helper",
        mimeType: "application/vnd.google-apps.folder"
      })
    }
  );
  const created = (await createResponse.json()) as Record<string, unknown>;
  if (!createResponse.ok) throw new Error("Falha ao criar pasta no Google Drive.");
  const id = valueAsString(created.id);
  if (!id) throw new Error("Google Drive nao retornou ID da pasta.");
  return id;
}

async function uploadDriveJson(
  clientId: string,
  folderId: string,
  fileName: string,
  payload: CloudBackupPayload
) {
  const boundary = `every_helper_${Date.now()}`;
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: "application/json"
  };
  const json = JSON.stringify(payload, null, 2);
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    json,
    `--${boundary}--`,
    ""
  ].join("\r\n");

  const response = await googleDriveRequest(
    clientId,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body
    }
  );
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(valueAsString(result.error) ?? "Falha ao enviar backup ao Drive.");
  }
  return result;
}

async function findLatestDriveBackup(clientId: string, folderId: string) {
  const listUrl = new URL("https://www.googleapis.com/drive/v3/files");
  listUrl.searchParams.set(
    "q",
    `'${folderId}' in parents and name contains 'every-helper-backup' and trashed = false`
  );
  listUrl.searchParams.set("orderBy", "modifiedTime desc");
  listUrl.searchParams.set("pageSize", "1");
  listUrl.searchParams.set("fields", "files(id,name,modifiedTime)");
  const response = await googleDriveRequest(clientId, listUrl.toString());
  const payload = (await response.json()) as { files?: Array<Record<string, unknown>> };
  if (!response.ok) throw new Error("Falha ao listar backups do Drive.");
  return payload.files?.[0] ?? null;
}

async function downloadDriveJson(clientId: string, fileId: string) {
  const response = await googleDriveRequest(
    clientId,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
  );
  if (!response.ok) throw new Error("Falha ao baixar backup do Drive.");
  return (await response.json()) as CloudBackupPayload;
}

async function fetchMinecraftProfile(microsoftAccessToken: string) {
  const xbl = await postJson("https://user.auth.xboxlive.com/user/authenticate", {
    Properties: {
      AuthMethod: "RPS",
      SiteName: "user.auth.xboxlive.com",
      RpsTicket: `d=${microsoftAccessToken}`
    },
    RelyingParty: "http://auth.xboxlive.com",
    TokenType: "JWT"
  });
  const xblToken = valueAsString(xbl.Token);
  const userHash = valueAsString(
    ((xbl.DisplayClaims as Record<string, unknown>)?.xui as Array<Record<string, unknown>>)?.[0]
      ?.uhs
  );
  if (!xblToken || !userHash) throw new Error("Xbox Live nao retornou token valido.");

  const xsts = await postJson("https://xsts.auth.xboxlive.com/xsts/authorize", {
    Properties: {
      SandboxId: "RETAIL",
      UserTokens: [xblToken]
    },
    RelyingParty: "rp://api.minecraftservices.com/",
    TokenType: "JWT"
  });
  const xstsToken = valueAsString(xsts.Token);
  if (!xstsToken) throw new Error("XSTS nao retornou token valido.");

  const mcAuth = await postJson(
    "https://api.minecraftservices.com/authentication/login_with_xbox",
    {
      identityToken: `XBL3.0 x=${userHash};${xstsToken}`
    }
  );
  const minecraftToken = valueAsString(mcAuth.access_token);
  if (!minecraftToken) throw new Error("Minecraft Services nao retornou access_token.");

  const response = await fetch("https://api.minecraftservices.com/minecraft/profile", {
    headers: { Authorization: `Bearer ${minecraftToken}` }
  });
  const profile = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      valueAsString(profile.errorMessage) ??
        "Conta autenticada, mas nenhum perfil Minecraft Java foi encontrado."
    );
  }

  const uuid = valueAsString(profile.id);
  const username = valueAsString(profile.name);
  const skins = profile.skins as Array<Record<string, unknown>> | undefined;
  const skinUrl = skins?.map((skin) => valueAsString(skin.url)).find(Boolean);

  return {
    uuid,
    username,
    gamerTag: username,
    skinUrl,
    avatarUrl: uuid ? `https://crafatar.com/avatars/${uuid}?size=128&overlay` : undefined,
    rawProfile: profile
  };
}

async function postJson(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      valueAsString(result.errorMessage) ??
        valueAsString(result.message) ??
        `Requisicao falhou: ${url}`
    );
  }
  return result;
}

async function getStoredToken(provider: OAuthProviderConfig["provider"]) {
  const store = await loadSecureStore();
  const encrypted = store[provider];
  if (!encrypted) return null;
  try {
    return JSON.parse(decryptText(encrypted)) as OAuthTokenSet;
  } catch {
    return null;
  }
}

async function setStoredToken(provider: OAuthProviderConfig["provider"], token: OAuthTokenSet) {
  const store = await loadSecureStore();
  store[provider] = encryptText(JSON.stringify(token));
  await saveSecureStore(store);
}

async function loadSecureStore() {
  const storePath = secureStorePath();
  try {
    return JSON.parse(await fs.readFile(storePath, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveSecureStore(store: Record<string, string>) {
  const storePath = secureStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

function secureStorePath() {
  return path.join(app.getPath("userData"), "secure-store.json");
}

function encryptText(text: string) {
  if (safeStorage.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(text).toString("base64")}`;
  }
  return `plain:${Buffer.from(text, "utf8").toString("base64")}`;
}

function decryptText(value: string) {
  if (value.startsWith("safe:") && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(value.slice(5), "base64"));
  }
  if (value.startsWith("plain:")) {
    return Buffer.from(value.slice(6), "base64").toString("utf8");
  }
  throw new Error("Token salvo em formato desconhecido.");
}
