export type WorldDimensionKey = "overworld" | "nether" | "end";

export interface RegionSummary {
  fileName: string;
  x: number;
  z: number;
  chunks: number;
  lastModified: string;
  sampledChunks?: number;
  minHeight?: number;
  maxHeight?: number;
  averageHeight?: number;
  topBiomes?: Array<{
    id: string;
    count: number;
  }>;
}

export interface DimensionSummary {
  key: WorldDimensionKey;
  label: string;
  path: string | null;
  regions: RegionSummary[];
  totalChunks: number;
}

export interface WorldSummary {
  ok: boolean;
  path?: string;
  name?: string;
  seed?: string;
  spawn?: {
    x?: number;
    y?: number;
    z?: number;
  };
  gameMode?: string;
  dimensions?: DimensionSummary[];
  error?: string;
}

export interface ModFileSummary {
  name: string;
  relativePath: string;
  sizeMb: number;
  versionHint?: string;
}

export interface ModpackFolderSummary {
  ok: boolean;
  path?: string;
  name?: string;
  mods?: ModFileSummary[];
  configs?: number;
  resourcePacks?: number;
  shaderPacks?: number;
  saves?: number;
  acceptedFiles?: number;
  totalSizeMb?: number;
  error?: string;
}

export interface LauncherProfileRequest {
  id: string;
  name: string;
  gameDir: string;
  minecraftVersion: string;
  loader: "forge" | "fabric" | "quilt" | "vanilla";
}

export interface LauncherProfileResult {
  ok: boolean;
  message: string;
  profilePath?: string;
  backupPath?: string;
}

export interface BlueprintConvertRequest {
  fileName: string;
  bytes: number[];
}

export interface BlueprintConvertResult {
  ok: boolean;
  message: string;
  name?: string;
  format?: string;
  size?: {
    x: number;
    y: number;
    z: number;
  };
  blockCount?: number;
  paletteCount?: number;
  blocks?: Array<{
    x: number;
    y: number;
    z: number;
    name: string;
  }>;
}

export interface BlueprintExportRequest {
  name: string;
  size: {
    x: number;
    y: number;
    z: number;
  };
  blocks: Array<{
    x: number;
    y: number;
    z: number;
    type: string;
  }>;
}

export interface BlueprintExportResult {
  ok: boolean;
  message: string;
  fileName?: string;
  bytes?: number[];
  blockCount?: number;
  paletteCount?: number;
}

export interface CloudBackupPayload {
  app: "Every Helper for Minecraft";
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

export interface DriveConnectRequest {
  clientId: string;
}

export interface DriveBackupRequest extends DriveConnectRequest {
  payload: CloudBackupPayload;
}

export interface DriveBackupResult {
  ok: boolean;
  message: string;
  folderId?: string;
  fileId?: string;
  fileName?: string;
  modifiedTime?: string;
  payload?: CloudBackupPayload;
}

export interface MicrosoftConnectRequest {
  clientId: string;
}

export interface MinecraftProfileResult {
  ok: boolean;
  message: string;
  uuid?: string;
  username?: string;
  gamerTag?: string;
  avatarUrl?: string;
  skinUrl?: string;
  rawProfile?: unknown;
}

export interface BridgeApi {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  selectWorldFolder: () => Promise<WorldSummary>;
  selectModpackFolder: () => Promise<ModpackFolderSummary>;
  installLauncherProfile: (
    request: LauncherProfileRequest
  ) => Promise<LauncherProfileResult>;
  openMinecraftLauncher: () => Promise<LauncherProfileResult>;
  convertBlueprint: (
    request: BlueprintConvertRequest
  ) => Promise<BlueprintConvertResult>;
  exportBlueprintNbt: (
    request: BlueprintExportRequest
  ) => Promise<BlueprintExportResult>;
  connectGoogleDrive: (request: DriveConnectRequest) => Promise<DriveBackupResult>;
  uploadDriveBackup: (request: DriveBackupRequest) => Promise<DriveBackupResult>;
  restoreDriveBackup: (request: DriveConnectRequest) => Promise<DriveBackupResult>;
  connectMicrosoftMinecraft: (
    request: MicrosoftConnectRequest
  ) => Promise<MinecraftProfileResult>;
  openExternal: (url: string) => Promise<void>;
}
