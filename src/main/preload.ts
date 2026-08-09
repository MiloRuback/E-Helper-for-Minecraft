import { contextBridge, ipcRenderer } from "electron";
import type {
  BridgeApi,
  BlueprintConvertRequest,
  BlueprintExportRequest,
  DriveBackupRequest,
  DriveConnectRequest,
  LauncherProfileRequest,
  MicrosoftConnectRequest
} from "../shared/contracts.js";

const api: BridgeApi = {
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close")
  },
  selectWorldFolder: () => ipcRenderer.invoke("world:select-folder"),
  selectModpackFolder: () => ipcRenderer.invoke("modpack:select-folder"),
  installLauncherProfile: (request: LauncherProfileRequest) =>
    ipcRenderer.invoke("modpack:install-launcher-profile", request),
  openMinecraftLauncher: () => ipcRenderer.invoke("modpack:open-launcher"),
  convertBlueprint: (request: BlueprintConvertRequest) =>
    ipcRenderer.invoke("blueprint:convert", request),
  exportBlueprintNbt: (request: BlueprintExportRequest) =>
    ipcRenderer.invoke("blueprint:export-nbt", request),
  exportBlueprintSchem: (request: BlueprintExportRequest) =>
    ipcRenderer.invoke("blueprint:export-schem", request),
  exportBlueprintLitematic: (request: BlueprintExportRequest) =>
    ipcRenderer.invoke("blueprint:export-litematic", request),
  connectGoogleDrive: (request: DriveConnectRequest) =>
    ipcRenderer.invoke("drive:connect", request),
  uploadDriveBackup: (request: DriveBackupRequest) =>
    ipcRenderer.invoke("drive:upload-backup", request),
  restoreDriveBackup: (request: DriveConnectRequest) =>
    ipcRenderer.invoke("drive:restore-backup", request),
  connectMicrosoftMinecraft: (request: MicrosoftConnectRequest) =>
    ipcRenderer.invoke("minecraft:connect-microsoft", request),
  openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url)
};

contextBridge.exposeInMainWorld("everyHelper", api);
