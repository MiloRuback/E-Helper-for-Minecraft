import React, {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createRoot } from "react-dom/client";
import { createClient, type SupabaseClient, type User as SupabaseUser } from "@supabase/supabase-js";
import {
  Box,
  Brush,
  Check,
  ChevronRight,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FileArchive,
  FolderOpen,
  Globe2,
  Grid3X3,
  Hammer,
  Languages,
  LocateFixed,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Minus,
  PaintBucket,
  PenTool,
  Pipette,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  User,
  X
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as skinview3d from "skinview3d";
import {
  loadCubiomesEngine,
  type CubiomesBiome,
  type CubiomesEngine
} from "./cubiomesEngine";
import {
  estimatedMarkersInChunkBounds,
  fallbackBiomeAt,
  fallbackBiomePalettes,
  featureById,
  isEstimatedSlimeChunk,
  isJavaSlimeChunk,
  seedDimensions,
  seedFeatureCatalog,
  seedFeatureIconDataUrl,
  seedFeatureLabel,
  seedMarkerKey,
  seedPlatforms,
  type SeedDimension,
  type SeedMapBiome,
  type SeedMarker,
  type SeedPlatform
} from "./seedMapData";
import type {
  CloudBackupPayload,
  DimensionSummary,
  LauncherProfileResult,
  ModpackArchiveResult,
  ModpackFolderSummary,
  RegionSummary,
  WorldSummary
} from "../shared/contracts";
import "./styles.css";

type Language = "pt-br" | "en-us";
type PageId =
  | "home"
  | "skins"
  | "blueprints"
  | "seed"
  | "world"
  | "modpacks"
  | "profile"
  | "settings";
type ToolId = "brush" | "eraser" | "fill" | "picker";
type SkinLayer = "base" | "overlay";
type SkinModel = "standard" | "slim";
type SkinViewModel = "default" | "slim";
type Pixel = string;

interface SkinState {
  base: Pixel[];
  overlay: Pixel[];
  model: SkinModel;
}

interface BlueprintBlock {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

type BlockType =
  | "grass"
  | "stone"
  | "oak"
  | "glass"
  | "water"
  | "torch"
  | "diamond";

interface BlueprintState {
  name: string;
  size: { x: number; y: number; z: number };
  blocks: BlueprintBlock[];
}

interface ProfileState {
  displayName: string;
  email: string;
  bio: string;
  pronouns: string;
  minecraftUsername: string;
  minecraftUuid: string;
  avatarUrl: string;
}

interface LocalAccount {
  email: string;
  displayName: string;
}

interface AppSettings {
  language: Language;
  theme: "dark";
  firstRunCompleted: boolean;
  driveSync: boolean;
  microsoftLinked: boolean;
  supabaseEnabled: boolean;
}

interface CloudConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleClientId: string;
  microsoftClientId: string;
}

interface CloudUser {
  id: string;
  email: string;
}

interface SavedModpack {
  id: string;
  name: string;
  minecraftVersion: string;
  loader: "forge" | "fabric" | "quilt" | "vanilla";
  description: string;
  folder: ModpackFolderSummary;
  createdAt: string;
}

const translations = {
  "pt-br": {
    home: "Início",
    skins: "Skins",
    blueprints: "Blueprints",
    seed: "Seed Map",
    world: "Mundos",
    modpacks: "Modpacks",
    profile: "Perfil",
    settings: "Configurações",
    subtitle: "Ferramentas locais para Minecraft",
    import: "Importar",
    export: "Exportar",
    save: "Salvar",
    open: "Abrir",
    play: "Play",
    ready: "Pronto",
    localMode: "Modo local/offline",
    onboardingTitle: "Configuração inicial",
    finishSetup: "Concluir setup",
    skip: "Pular agora",
    language: "Idioma",
    account: "Conta",
    integrations: "Integrações",
    appearance: "Aparência"
  },
  "en-us": {
    home: "Home",
    skins: "Skins",
    blueprints: "Blueprints",
    seed: "Seed Map",
    world: "Worlds",
    modpacks: "Modpacks",
    profile: "Profile",
    settings: "Settings",
    subtitle: "Local tools for Minecraft",
    import: "Import",
    export: "Export",
    save: "Save",
    open: "Open",
    play: "Play",
    ready: "Ready",
    localMode: "Local/offline mode",
    onboardingTitle: "First run setup",
    finishSetup: "Finish setup",
    skip: "Skip for now",
    language: "Language",
    account: "Account",
    integrations: "Integrations",
    appearance: "Appearance"
  }
} as const;

const pageIcons: Record<PageId, React.ReactNode> = {
  home: <Sparkles size={18} />,
  skins: <PenTool size={18} />,
  blueprints: <Box size={18} />,
  seed: <MapIcon size={18} />,
  world: <Globe2 size={18} />,
  modpacks: <FileArchive size={18} />,
  profile: <User size={18} />,
  settings: <Settings size={18} />
};

const blockColors: Record<BlockType, string> = {
  grass: "#4aa94f",
  stone: "#84888c",
  oak: "#9a6a35",
  glass: "#7fd8ff",
  water: "#2f80ed",
  torch: "#f2c94c",
  diamond: "#46d9ca"
};

const blockLabels: Record<BlockType, string> = {
  grass: "Grass",
  stone: "Stone",
  oak: "Oak",
  glass: "Glass",
  water: "Water",
  torch: "Torch",
  diamond: "Diamond"
};

const MINECRAFT_VERSION_MANIFEST_URL =
  "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

const minecraftVersions = [
  "26.2",
  "26.1.2",
  "26.1.1",
  "26.1",
  "1.21.11",
  "1.21.10",
  "1.21.9",
  "1.21.8",
  "1.21.7",
  "1.21.6",
  "1.21.5",
  "1.21.4",
  "1.21.3",
  "1.21.2",
  "1.21.1",
  "1.21",
  "1.20.6",
  "1.20.5",
  "1.20.4",
  "1.20.3",
  "1.20.2",
  "1.20.1",
  "1.20",
  "1.19.4",
  "1.19.3",
  "1.19.2",
  "1.19.1",
  "1.19",
  "1.18.2",
  "1.18.1",
  "1.18",
  "1.17.1",
  "1.17",
  "1.16.5",
  "1.16.4",
  "1.16.3",
  "1.16.2",
  "1.16.1",
  "1.16",
  "1.15.2",
  "1.15.1",
  "1.15",
  "1.14.4",
  "1.14.3",
  "1.14.2",
  "1.14.1",
  "1.14",
  "1.13.2",
  "1.13.1",
  "1.13",
  "1.12.2",
  "1.12.1",
  "1.12",
  "1.11.2",
  "1.11.1",
  "1.11",
  "1.10.2",
  "1.10.1",
  "1.10",
  "1.9.4",
  "1.9.3",
  "1.9.2",
  "1.9.1",
  "1.9",
  "1.8.9",
  "1.8.8",
  "1.8.7",
  "1.8.6",
  "1.8.5",
  "1.8.4",
  "1.8.3",
  "1.8.2",
  "1.8.1",
  "1.8",
  "1.7.10",
  "1.7.9",
  "1.7.8",
  "1.7.7",
  "1.7.6",
  "1.7.5",
  "1.7.4",
  "1.7.3",
  "1.7.2",
  "1.6.4",
  "1.6.2",
  "1.6.1",
  "1.5.2",
  "1.5.1",
  "1.4.7",
  "1.4.6",
  "1.4.5",
  "1.4.4",
  "1.4.2",
  "1.3.2",
  "1.3.1",
  "1.2.5",
  "1.2.4",
  "1.2.3",
  "1.2.2",
  "1.2.1",
  "1.1",
  "1.0"
];

function releaseVersionsFromManifest(value: unknown) {
  const versions = (value as { versions?: Array<{ id?: unknown; type?: unknown }> })
    ?.versions;
  if (!Array.isArray(versions)) return [];
  return versions
    .filter((item) => item.type === "release" && typeof item.id === "string")
    .map((item) => item.id as string);
}

const navOrder: PageId[] = [
  "home",
  "skins",
  "blueprints",
  "seed",
  "world",
  "modpacks",
  "profile",
  "settings"
];

function t(language: Language, key: keyof (typeof translations)["pt-br"]) {
  return translations[language][key] ?? translations["pt-br"][key];
}

function copy(language: Language, pt: string, en: string) {
  return language === "pt-br" ? pt : en;
}

function normalizeMinecraftSubject(uuidOrUsername: string) {
  const value = uuidOrUsername.trim();
  if (!value) return "";
  return /^[0-9a-fA-F-]{32,36}$/.test(value) ? value.replace(/-/g, "") : value;
}

function minecraftAvatarUrl(uuidOrUsername: string) {
  const subject = normalizeMinecraftSubject(uuidOrUsername);
  return subject ? `https://mc-heads.net/avatar/${encodeURIComponent(subject)}/128` : "";
}

function minecraftAvatarFallbackUrl(uuidOrUsername: string) {
  const subject = normalizeMinecraftSubject(uuidOrUsername);
  return subject ? `https://minotar.net/avatar/${encodeURIComponent(subject)}/128.png` : "";
}

function isLegacyAvatarUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith("crafatar.com");
  } catch {
    return url.includes("crafatar.com");
  }
}

function bestMinecraftAvatarUrl(uuid: string, username: string, currentUrl = "") {
  const subject = uuid.trim() || username.trim();
  const generated = minecraftAvatarUrl(subject);
  if (generated) return generated;
  return currentUrl.trim();
}

function minecraftAvatarCandidates(profile: ProfileState) {
  const subject = profile.minecraftUuid.trim() || profile.minecraftUsername.trim();
  const saved = profile.avatarUrl.trim();
  return Array.from(
    new Set(
      [
        saved && !isLegacyAvatarUrl(saved) ? saved : "",
        minecraftAvatarUrl(subject),
        minecraftAvatarFallbackUrl(subject)
      ].filter(Boolean)
    )
  );
}

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function makeTransparentPixels() {
  return Array.from({ length: 64 * 64 }, () => "transparent");
}

function makeSkinTemplate(model: SkinModel): SkinState {
  const base = makeTransparentPixels();
  const overlay = makeTransparentPixels();
  const skin = {
    hair: model === "slim" ? "#d98c54" : "#3c2415",
    skin: model === "slim" ? "#f0b98d" : "#a56a43",
    shirt: model === "slim" ? "#75c8b8" : "#2f83c6",
    pants: model === "slim" ? "#6d4ba8" : "#344a94",
    shoes: "#3a2b24"
  };

  paintRect(base, 8, 0, 8, 8, skin.skin);
  paintRect(base, 0, 8, 8, 8, skin.skin);
  paintRect(base, 8, 8, 8, 8, skin.skin);
  paintRect(base, 16, 8, 8, 8, skin.skin);
  paintRect(base, 24, 8, 8, 8, skin.skin);
  paintRect(base, 40, 8, 8, 8, skin.hair);
  paintRect(base, 20, 20, 8, 12, skin.shirt);
  paintRect(base, 4, 20, model === "slim" ? 3 : 4, 12, skin.shirt);
  paintRect(base, 36, 52, model === "slim" ? 3 : 4, 12, skin.shirt);
  paintRect(base, 4, 52, 4, 12, skin.pants);
  paintRect(base, 20, 52, 4, 12, skin.pants);
  paintRect(base, 8, 56, 4, 4, skin.shoes);
  paintRect(base, 24, 56, 4, 4, skin.shoes);
  paintRect(overlay, 40, 0, 8, 8, adjustColor(skin.hair, 22));
  paintRect(overlay, 40, 16, 8, 4, "rgba(255,255,255,0.12)");

  return { base, overlay, model };
}

function paintRect(
  pixels: Pixel[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: Pixel
) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      if (xx >= 0 && xx < 64 && yy >= 0 && yy < 64) {
        pixels[yy * 64 + xx] = color;
      }
    }
  }
}

function adjustColor(hex: string, amount: number) {
  const number = Number.parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (number >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((number >> 8) & 255) + amount));
  const b = Math.min(255, Math.max(0, (number & 255) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function blockTypeFromMinecraftName(name: string): BlockType {
  const id = name.replace(/^minecraft:/, "");
  if (id.includes("grass") || id.includes("leaves") || id.includes("moss")) return "grass";
  if (id.includes("glass") || id.includes("ice")) return "glass";
  if (id.includes("water")) return "water";
  if (id.includes("torch") || id.includes("lantern") || id.includes("glow")) return "torch";
  if (id.includes("diamond") || id.includes("prismarine")) return "diamond";
  if (id.includes("wood") || id.includes("log") || id.includes("planks") || id.includes("oak")) return "oak";
  return "stone";
}

function pixelIndex(x: number, y: number) {
  return y * 64 + x;
}

function readableDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function downloadTextFile(name: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBinaryFile(name: string, bytes: number[], type = "application/octet-stream") {
  const blob = new Blob([new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function collectLocalBackupPayload(): CloudBackupPayload {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith("ehm:")) {
      data[key] = JSON.parse(localStorage.getItem(key) ?? "null");
    }
  }

  return {
    app: "Every Helper for Minecraft",
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
}

function applyLocalBackupPayload(payload: CloudBackupPayload) {
  Object.entries(payload.data).forEach(([key, value]) => {
    if (key.startsWith("ehm:")) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  });
}

function createSupabase(config: CloudConfig): SupabaseClient | null {
  if (!config.supabaseUrl.trim() || !config.supabaseAnonKey.trim()) return null;
  return createClient(config.supabaseUrl.trim(), config.supabaseAnonKey.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "ehm:supabase-auth"
    }
  });
}

function canvasFromSkin(skin: SkinState, showOverlay = true) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.clearRect(0, 0, 64, 64);
  drawPixelArray(ctx, skin.base);
  if (showOverlay) drawPixelArray(ctx, skin.overlay);
  return canvas;
}

function toSkinViewModel(model: SkinModel): SkinViewModel {
  return model === "standard" ? "default" : "slim";
}

function drawPixelArray(ctx: CanvasRenderingContext2D, pixels: Pixel[]) {
  pixels.forEach((color, index) => {
    if (color === "transparent") return;
    ctx.fillStyle = color;
    ctx.fillRect(index % 64, Math.floor(index / 64), 1, 1);
  });
}

const DEFAULT_SUPABASE_URL = "https://ctqgcnsfdvxtnkejeusd.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_d-LcR34jekfPRJ-pwZFVzA_gvMHMGj6";

function App() {
  const [settings, setSettings] = usePersistentState<AppSettings>(
    "ehm:settings",
    {
      language: "pt-br",
      theme: "dark",
      firstRunCompleted: false,
      driveSync: false,
      microsoftLinked: false,
      supabaseEnabled: Boolean(import.meta.env.VITE_SUPABASE_URL ?? DEFAULT_SUPABASE_URL)
    }
  );
  const [account, setAccount] = usePersistentState<LocalAccount | null>(
    "ehm:account",
    null
  );
  const [cloudConfig, setCloudConfig] = usePersistentState<CloudConfig>(
    "ehm:cloudConfig",
    {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? DEFAULT_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY,
      googleClientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID ?? "",
      microsoftClientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID ?? ""
    }
  );
  const [cloudUser, setCloudUser] = usePersistentState<CloudUser | null>(
    "ehm:cloudUser",
    null
  );
  const [profile, setProfile] = usePersistentState<ProfileState>("ehm:profile", {
    displayName: "Player",
    email: "",
    bio: "",
    pronouns: "",
    minecraftUsername: "",
    minecraftUuid: "",
    avatarUrl: ""
  });
  const [page, setPage] = useState<PageId>("home");

  const language = settings.language;
  const supabase = useMemo(() => createSupabase(cloudConfig), [cloudConfig]);

  useEffect(() => {
    if (cloudConfig.supabaseUrl === DEFAULT_SUPABASE_URL && !cloudConfig.supabaseAnonKey.trim()) {
      setCloudConfig((current) => ({
        ...current,
        supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY
      }));
    }
  }, [cloudConfig.supabaseAnonKey, cloudConfig.supabaseUrl, setCloudConfig]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCloudUser({
          id: data.user.id,
          email: data.user.email ?? ""
        });
      }
    });
  }, [supabase, setCloudUser]);

  return (
    <div className="app-shell">
      <Titlebar language={language} />
      <div className="app-body">
        <aside className="sidebar" aria-label={copy(language, "Navegacao principal", "Main navigation")}>
          <div className="brand-lockup">
            <PixelLogo />
            <div>
              <strong>Every Helper</strong>
              <span>Minecraft</span>
            </div>
          </div>
          <nav className="nav-list">
            {navOrder.map((item) => (
              <button
                key={item}
                className={page === item ? "active" : ""}
                onClick={() => setPage(item)}
              >
                <span className={`tab-cube tab-${item}`} />
                {pageIcons[item]}
                <span>{t(language, item)}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-status">
            <span className="status-dot" />
            <span>{t(language, "localMode")}</span>
          </div>
        </aside>

        <main className="content">
          {page === "home" && (
            <HomePage
              language={language}
              account={account}
              settings={settings}
              setPage={setPage}
            />
          )}
          {page === "skins" && <SkinEditor language={language} />}
          {page === "blueprints" && <BlueprintEditor language={language} />}
          {page === "seed" && <SeedMapPage language={language} />}
          {page === "world" && <WorldImporter language={language} />}
          {page === "modpacks" && <ModpacksPage language={language} />}
          {page === "profile" && (
            <ProfilePage
              profile={profile}
              setProfile={setProfile}
              account={account}
              setAccount={setAccount}
              cloudConfig={cloudConfig}
              cloudUser={cloudUser}
              setCloudUser={setCloudUser}
              supabase={supabase}
              language={language}
            />
          )}
          {page === "settings" && (
            <SettingsPage
              settings={settings}
              setSettings={setSettings}
              cloudConfig={cloudConfig}
              setCloudConfig={setCloudConfig}
              language={language}
            />
          )}
        </main>
      </div>

      {!settings.firstRunCompleted && (
        <Onboarding
          language={language}
          settings={settings}
          setSettings={setSettings}
          account={account}
          setAccount={setAccount}
          profile={profile}
          setProfile={setProfile}
        />
      )}
    </div>
  );
}

function Titlebar({ language }: { language: Language }) {
  return (
    <header className="titlebar">
      <div className="drag-region">
        <PixelLogo compact />
        <span>Every Helper for Minecraft</span>
        <small>{t(language, "ready")}</small>
      </div>
      <div className="window-actions">
        <button
          title={copy(language, "Minimizar", "Minimize")}
          onClick={() => window.everyHelper?.window.minimize()}
        >
          <Minimize2 size={15} />
        </button>
        <button
          title={copy(language, "Maximizar", "Maximize")}
          onClick={() => window.everyHelper?.window.maximize()}
        >
          <Maximize2 size={15} />
        </button>
        <button title={copy(language, "Fechar", "Close")} onClick={() => window.everyHelper?.window.close()}>
          <X size={16} />
        </button>
      </div>
    </header>
  );
}

function PixelLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "pixel-logo compact" : "pixel-logo"}>
      <span className="logo-grass" />
      <span className="logo-stone" />
      <span className="logo-pick" />
    </div>
  );
}

function HomePage({
  language,
  account,
  settings,
  setPage
}: {
  language: Language;
  account: LocalAccount | null;
  settings: AppSettings;
  setPage: (page: PageId) => void;
}) {
  const modules = [
    {
      id: "skins" as PageId,
      title: t(language, "skins"),
      text:
        language === "pt-br"
          ? "Editor 64x64 com camadas, ferramentas, Steve/Alex e preview 3D."
          : "64x64 editor with layers, tools, Steve/Alex and 3D preview."
    },
    {
      id: "blueprints" as PageId,
      title: t(language, "blueprints"),
      text:
        language === "pt-br"
          ? "Editor por camadas com blocos e visualizacao 3D baseada em Three.js."
          : "Layer editor with blocks and Three.js based 3D preview."
    },
    {
      id: "seed" as PageId,
      title: t(language, "seed"),
      text:
        language === "pt-br"
          ? "Mapa navegavel por seed, versao, coordenadas, biomas e estruturas."
          : "Navigable seed map with version, coordinates, biomes and structures."
    },
    {
      id: "world" as PageId,
      title: t(language, "world"),
      text:
        language === "pt-br"
          ? "Le pasta de mundo, level.dat e arquivos .mca para montar uma visao geral."
          : "Reads world folder, level.dat and .mca files for an overview."
    },
    {
      id: "modpacks" as PageId,
      title: t(language, "modpacks"),
      text:
        language === "pt-br"
          ? "Importa pasta, lista mods e cria perfil isolado no Minecraft Launcher."
          : "Imports folder, lists mods and creates an isolated Minecraft Launcher profile."
    },
    {
      id: "profile" as PageId,
      title: t(language, "profile"),
      text:
        language === "pt-br"
          ? "Perfil local com bio, pronomes e avatar pela API publica do Minecraft."
          : "Local profile with bio, pronouns and avatar from the public Minecraft API."
    }
  ];

  return (
    <section className="page-grid">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t(language, "subtitle")}</p>
          <h1>Every Helper for Minecraft</h1>
          <p>
            {language === "pt-br"
              ? "Uma versao desktop para apresentacao escolar, pensada para rodar offline em Windows e em janelas pequenas sem quebrar o layout."
              : "A desktop version for school presentation, designed to run offline on Windows and in small windows without breaking the layout."}
          </p>
        </div>
        <div className="status-panel">
          <strong>{account?.displayName ?? "Player"}</strong>
          <span>{settings.supabaseEnabled ? "Supabase config OK" : "Offline first"}</span>
          <span>
            {settings.driveSync
              ? copy(language, "Drive marcado", "Drive enabled")
              : copy(language, "Drive opcional", "Drive optional")}
          </span>
        </div>
      </div>

      <div className="metric-strip">
        <Metric label={copy(language, "Modulos", "Modules")} value="7" />
        <Metric label={copy(language, "Idiomas", "Languages")} value="PT/EN" />
        <Metric label={copy(language, "Janela minima", "Minimum window")} value="800x500" />
        <Metric label={copy(language, "Instalador", "Installer")} value="NSIS" />
      </div>

      <div className="module-grid">
        {modules.map((module) => (
          <button
            className="module-card"
            key={module.id}
            onClick={() => setPage(module.id)}
          >
            <span className={`tab-cube tab-${module.id}`} />
            <strong>{module.title}</strong>
            <span>{module.text}</span>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Onboarding({
  language,
  settings,
  setSettings,
  account,
  setAccount,
  profile,
  setProfile
}: {
  language: Language;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  account: LocalAccount | null;
  setAccount: React.Dispatch<React.SetStateAction<LocalAccount | null>>;
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
}) {
  const [email, setEmail] = useState(account?.email ?? "");
  const [name, setName] = useState(account?.displayName ?? profile.displayName);

  function finish() {
    const displayName = name.trim() || "Player";
    setAccount({ email: email.trim(), displayName });
    setProfile((current) => ({
      ...current,
      displayName,
      email: email.trim()
    }));
    setSettings((current) => ({ ...current, firstRunCompleted: true }));
  }

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-panel">
        <div className="onboarding-art">
          <PixelLogo />
          <div className="floating-block grass" />
          <div className="floating-block stone" />
          <div className="floating-block diamond" />
        </div>
        <div className="onboarding-content">
          <p className="eyebrow">{t(language, "onboardingTitle")}</p>
          <h2>
            {language === "pt-br"
              ? "Deixe o Helper pronto para usar"
              : "Get Helper ready to use"}
          </h2>
          <p>
            {language === "pt-br"
              ? "Esta versao guarda tudo localmente primeiro. Supabase, Drive e Microsoft podem ser ligados depois quando voce tiver as credenciais."
              : "This version stores everything locally first. Supabase, Drive and Microsoft can be connected later when credentials are available."}
          </p>

          <label>
            <span>{copy(language, "Nome", "Name")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="player@example.com"
            />
          </label>

          <div className="setup-options">
            <Toggle
              label="Google Drive"
              checked={settings.driveSync}
              onChange={(checked) =>
                setSettings((current) => ({ ...current, driveSync: checked }))
              }
            />
            <Toggle
              label="Microsoft/Minecraft"
              checked={settings.microsoftLinked}
              onChange={(checked) =>
                setSettings((current) => ({
                  ...current,
                  microsoftLinked: checked
                }))
              }
            />
            <button
              className="segmented"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  language: current.language === "pt-br" ? "en-us" : "pt-br"
                }))
              }
            >
              <Languages size={16} />
              {settings.language.toUpperCase()}
            </button>
          </div>

          <div className="action-row">
            <button className="primary" onClick={finish}>
              <Check size={18} />
              {t(language, "finishSetup")}
            </button>
            <button
              onClick={() =>
                setSettings((current) => ({ ...current, firstRunCompleted: true }))
              }
            >
              {t(language, "skip")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span />
      {label}
    </label>
  );
}

function SkinEditor({ language }: { language: Language }) {
  const [skin, setSkin] = usePersistentState<SkinState>(
    "ehm:skin",
    makeSkinTemplate("standard")
  );
  const [activeLayer, setActiveLayer] = useState<SkinLayer>("base");
  const [showBase, setShowBase] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [tool, setTool] = useState<ToolId>("brush");
  const [color, setColor] = useState("#4ecca3");
  const [zoom, setZoom] = useState(9);
  const [symmetry, setSymmetry] = useState(false);
  const [history, setHistory] = useState<SkinState[]>([skin]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const mergedUrl = useMemo(
    () => canvasFromSkin(skin, showOverlay).toDataURL("image/png"),
    [skin, showOverlay]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 64, 64);
    if (showBase) drawPixelArray(ctx, skin.base);
    if (showOverlay) drawPixelArray(ctx, skin.overlay);
  }, [skin, showBase, showOverlay]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.ctrlKey) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function commit(next: SkinState) {
    setSkin(next);
    setHistory((current) => {
      const trimmed = current.slice(0, historyIndex + 1);
      const updated = [...trimmed, next].slice(-80);
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }

  function undo() {
    setHistoryIndex((index) => {
      const nextIndex = Math.max(0, index - 1);
      setSkin(history[nextIndex]);
      return nextIndex;
    });
  }

  function redo() {
    setHistoryIndex((index) => {
      const nextIndex = Math.min(history.length - 1, index + 1);
      setSkin(history[nextIndex]);
      return nextIndex;
    });
  }

  function coordinates(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(63, Math.floor(((event.clientX - rect.left) / rect.width) * 64))),
      y: Math.max(0, Math.min(63, Math.floor(((event.clientY - rect.top) / rect.height) * 64)))
    };
  }

  function editAt(x: number, y: number) {
    const target = activeLayer === "base" ? [...skin.base] : [...skin.overlay];
    const source = activeLayer === "base" ? skin.overlay : skin.base;
    const points = symmetry ? [[x, y], [63 - x, y]] : [[x, y]];
    const nextTarget = target;

    if (tool === "picker") {
      const picked = target[pixelIndex(x, y)] || source[pixelIndex(x, y)];
      if (picked && picked !== "transparent") setColor(picked);
      return;
    }

    if (tool === "fill") {
      floodFill(nextTarget, x, y, color);
    } else {
      for (const [px, py] of points) {
        nextTarget[pixelIndex(px, py)] = tool === "eraser" ? "transparent" : color;
      }
    }

    commit({
      ...skin,
      base: activeLayer === "base" ? nextTarget : skin.base,
      overlay: activeLayer === "overlay" ? nextTarget : skin.overlay
    });
  }

  function floodFill(pixels: Pixel[], x: number, y: number, nextColor: Pixel) {
    const startIndex = pixelIndex(x, y);
    const oldColor = pixels[startIndex];
    if (oldColor === nextColor) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cy < 0 || cx >= 64 || cy >= 64) continue;
      const index = pixelIndex(cx, cy);
      if (pixels[index] !== oldColor) continue;
      pixels[index] = nextColor;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    const point = coordinates(event);
    editAt(point.x, point.y);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || tool === "fill" || tool === "picker") return;
    const point = coordinates(event);
    editAt(point.x, point.y);
  }

  function importSkin(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        const imported = makeTransparentPixels();
        for (let i = 0; i < 64 * 64; i += 1) {
          const alpha = data[i * 4 + 3];
          imported[i] =
            alpha === 0
              ? "transparent"
              : `rgba(${data[i * 4]},${data[i * 4 + 1]},${data[i * 4 + 2]},${(
                  alpha / 255
                ).toFixed(3)})`;
        }
        commit({ base: imported, overlay: makeTransparentPixels(), model: skin.model });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function exportSkin() {
    const url = canvasFromSkin(skin, true).toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `every-helper-${skin.model}-skin.png`;
    link.click();
  }

  function resetTemplate(model: SkinModel) {
    const next = makeSkinTemplate(model);
    commit(next);
  }

  return (
    <section className="workbench skin-workbench">
      <WorkbenchHeader
        eyebrow="Skin Studio"
        title={t(language, "skins")}
        description={
          language === "pt-br"
            ? "Edite PNG 64x64 por pixel, alterne camadas e veja a skin em 3D em tempo real."
            : "Edit 64x64 PNG pixel by pixel, switch layers and preview in real time."
        }
      />

      <div className="toolbar">
        <IconButton
          active={tool === "brush"}
          label={copy(language, "Pincel", "Brush")}
          onClick={() => setTool("brush")}
        >
          <Brush size={17} />
        </IconButton>
        <IconButton
          active={tool === "eraser"}
          label={copy(language, "Borracha", "Eraser")}
          onClick={() => setTool("eraser")}
        >
          <Eraser size={17} />
        </IconButton>
        <IconButton
          active={tool === "fill"}
          label={copy(language, "Balde", "Fill bucket")}
          onClick={() => setTool("fill")}
        >
          <PaintBucket size={17} />
        </IconButton>
        <IconButton
          active={tool === "picker"}
          label={copy(language, "Conta-gotas", "Eyedropper")}
          onClick={() => setTool("picker")}
        >
          <Pipette size={17} />
        </IconButton>
        <input
          className="color-input"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label={copy(language, "Cor", "Color")}
        />
        <div className="palette">
          {["#4ecca3", "#2f83c6", "#8b5a2b", "#7f8c8d", "#f2c94c", "#e74c3c", "#ffffff", "#111111"].map(
            (swatch) => (
              <button
                key={swatch}
                title={swatch}
                style={{ background: swatch }}
                onClick={() => setColor(swatch)}
              />
            )
          )}
        </div>
        <IconButton label="Undo" onClick={undo} disabled={historyIndex === 0}>
          <Undo2 size={17} />
        </IconButton>
        <IconButton
          label="Redo"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
        >
          <Redo2 size={17} />
        </IconButton>
        <Toggle label={copy(language, "Simetria", "Symmetry")} checked={symmetry} onChange={setSymmetry} />
      </div>

      <div className="skin-layout">
        <div className="tool-panel">
          <h3>{copy(language, "Camadas", "Layers")}</h3>
          <div className="segmented-row">
            <button
              className={activeLayer === "base" ? "selected" : ""}
              onClick={() => setActiveLayer("base")}
            >
              Base
            </button>
            <button
              className={activeLayer === "overlay" ? "selected" : ""}
              onClick={() => setActiveLayer("overlay")}
            >
              Overlay
            </button>
          </div>
          <button className="text-button" onClick={() => setShowBase((value) => !value)}>
            {showBase ? <Eye size={16} /> : <EyeOff size={16} />} Base
          </button>
          <button
            className="text-button"
            onClick={() => setShowOverlay((value) => !value)}
          >
            {showOverlay ? <Eye size={16} /> : <EyeOff size={16} />} Overlay
          </button>

          <h3>{copy(language, "Modelo", "Model")}</h3>
          <div className="segmented-row">
            <button
              className={skin.model === "standard" ? "selected" : ""}
              onClick={() => resetTemplate("standard")}
            >
              Steve
            </button>
            <button
              className={skin.model === "slim" ? "selected" : ""}
              onClick={() => resetTemplate("slim")}
            >
              Alex
            </button>
          </div>

          <label>
            <span>Zoom</span>
            <input
              type="range"
              min="5"
              max="13"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>

          <input
            hidden
            type="file"
            accept="image/png"
            ref={fileRef}
            onChange={importSkin}
          />
          <button className="text-button" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> {copy(language, "Importar PNG", "Import PNG")}
          </button>
          <button className="text-button" onClick={exportSkin}>
            <Download size={16} /> {copy(language, "Exportar PNG", "Export PNG")}
          </button>
        </div>

        <div className="skin-canvas-panel">
          <canvas
            ref={canvasRef}
            className="skin-canvas"
            style={{ width: `min(${64 * zoom}px, 100%)`, aspectRatio: "1" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => setIsDrawing(false)}
            onPointerCancel={() => setIsDrawing(false)}
            onPointerLeave={() => setIsDrawing(false)}
          />
        </div>

        <SkinPreview skinUrl={mergedUrl} model={skin.model} language={language} />
      </div>
    </section>
  );
}

function SkinPreview({
  skinUrl,
  model,
  language
}: {
  skinUrl: string;
  model: SkinModel;
  language: Language;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: 360,
      height: 460,
      skin: skinUrl,
      model: toSkinViewModel(model)
    } as skinview3d.SkinViewerOptions & { model: SkinViewModel });
    viewer.camera.position.z = 70;
    viewer.controls.enableZoom = true;
    viewer.animation = new skinview3d.IdleAnimation();
    viewerRef.current = viewer;
    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.loadSkin(skinUrl, { model: toSkinViewModel(model) });
  }, [skinUrl, model]);

  return (
    <div className="preview-panel">
      <div className="panel-title">
        <Grid3X3 size={16} />
        Preview 3D
      </div>
      <canvas ref={canvasRef} />
      <p>{copy(language, "Arraste para girar. Scroll aproxima o modelo.", "Drag to rotate. Scroll to zoom the model.")}</p>
    </div>
  );
}

function IconButton({
  children,
  label,
  active = false,
  disabled = false,
  onClick
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "icon-button active" : "icon-button"}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function WorkbenchHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="workbench-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function BlueprintEditor({ language }: { language: Language }) {
  const [blueprint, setBlueprint] = usePersistentState<BlueprintState>(
    "ehm:blueprint",
    {
      name: "Casa inicial",
      size: { x: 16, y: 8, z: 16 },
      blocks: starterBlueprint()
    }
  );
  const [slice, setSlice] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>("grass");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const blocksOnSlice = useMemo(() => {
    const map = new Map<string, BlueprintBlock>();
    blueprint.blocks
      .filter((block) => block.y === slice)
      .forEach((block) => map.set(`${block.x}:${block.z}`, block));
    return map;
  }, [blueprint.blocks, slice]);

  function toggleBlock(x: number, z: number) {
    const exists = blocksOnSlice.get(`${x}:${z}`);
    setBlueprint((current) => ({
      ...current,
      blocks: exists
        ? current.blocks.filter(
            (block) => !(block.x === x && block.y === slice && block.z === z)
          )
        : [...current.blocks, { x, y: slice, z, type: selectedBlock }]
    }));
  }

  function exportBlueprint() {
    downloadTextFile(
      `${blueprint.name.replace(/\s+/g, "-").toLowerCase()}.every-blueprint.json`,
      JSON.stringify({ format: "every-helper-blueprint", version: 1, blueprint }, null, 2)
    );
  }

  async function exportBlueprintNbt() {
    if (!window.everyHelper) {
      alert(copy(language, "Exportacao NBT funciona dentro do app Electron.", "NBT export works inside the Electron app."));
      return;
    }
    const result = await window.everyHelper.exportBlueprintNbt({
      name: blueprint.name,
      size: blueprint.size,
      blocks: blueprint.blocks
    });
    if (!result.ok || !result.fileName || !result.bytes) {
      alert(result.message);
      return;
    }
    downloadBinaryFile(result.fileName, result.bytes, "application/x-nbt");
  }

  async function exportBlueprintSchem() {
    if (!window.everyHelper) {
      alert(copy(language, "Exportacao SCHEM funciona dentro do app Electron.", "SCHEM export works inside the Electron app."));
      return;
    }
    const result = await window.everyHelper.exportBlueprintSchem({
      name: blueprint.name,
      size: blueprint.size,
      blocks: blueprint.blocks
    });
    if (!result.ok || !result.fileName || !result.bytes) {
      alert(result.message);
      return;
    }
    downloadBinaryFile(result.fileName, result.bytes, "application/octet-stream");
  }

  async function exportBlueprintLitematic() {
    if (!window.everyHelper) {
      alert(copy(language, "Exportacao LITEMATIC funciona dentro do app Electron.", "LITEMATIC export works inside the Electron app."));
      return;
    }
    const result = await window.everyHelper.exportBlueprintLitematic({
      name: blueprint.name,
      size: blueprint.size,
      blocks: blueprint.blocks
    });
    if (!result.ok || !result.fileName || !result.bytes) {
      alert(result.message);
      return;
    }
    downloadBinaryFile(result.fileName, result.bytes, "application/octet-stream");
  }

  function importBlueprint(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (file.name.endsWith(".json") || file.name.endsWith(".blueprint")) {
          const parsed = JSON.parse(String(reader.result));
          const next = parsed.blueprint ?? parsed;
          if (!next?.blocks || !next?.size) {
            throw new Error(copy(language, "Formato invalido.", "Invalid format."));
          }
          setBlueprint(next);
        } else {
          if (!window.everyHelper) {
            throw new Error(copy(language, "Conversao NBT funciona dentro do app Electron.", "NBT conversion works inside the Electron app."));
          }
          const result = await window.everyHelper.convertBlueprint({
            fileName: file.name,
            bytes: Array.from(new Uint8Array(reader.result as ArrayBuffer))
          });
          if (!result.ok || !result.size || !result.blocks) {
            throw new Error(result.message);
          }
          const blocks = result.blocks
            .map((block) => {
              return {
                x: block.x,
                y: block.y,
                z: block.z,
                type: blockTypeFromMinecraftName(block.name)
              } satisfies BlueprintBlock;
            })
            .slice(0, 20000);
          setBlueprint({
            name: result.name ?? file.name,
            size: result.size,
            blocks
          });
        }
        setSlice(0);
      } catch {
        alert(
          copy(
            language,
            "Nao foi possivel importar. Suportado: .every-blueprint.json, .litematic, .schem e .nbt Java Structure.",
            "Could not import. Supported: .every-blueprint.json, .litematic, .schem and Java Structure .nbt."
          )
        );
      }
    };
    if (file.name.endsWith(".json") || file.name.endsWith(".blueprint")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    event.target.value = "";
  }

  return (
    <section className="workbench">
      <WorkbenchHeader
        eyebrow="Blueprint Studio"
        title={t(language, "blueprints")}
        description={
          language === "pt-br"
            ? "Desenhe blocos por camada, visualize em 3D e exporte um blueprint editavel."
            : "Draw blocks by layer, view in 3D and export an editable blueprint."
        }
      />

      <div className="toolbar">
        <label className="inline-input">
          {copy(language, "Nome", "Name")}
          <input
            value={blueprint.name}
            onChange={(event) =>
              setBlueprint((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label className="inline-input">
          {copy(language, "Camada Y", "Y layer")}
          <input
            type="range"
            min="0"
            max={blueprint.size.y - 1}
            value={slice}
            onChange={(event) => setSlice(Number(event.target.value))}
          />
          <strong>{slice}</strong>
        </label>
        <div className="palette block-palette">
          {(Object.keys(blockColors) as BlockType[]).map((block) => (
            <button
              key={block}
              title={blockLabels[block]}
              className={selectedBlock === block ? "selected" : ""}
              style={{ background: blockColors[block] }}
              onClick={() => setSelectedBlock(block)}
            />
          ))}
        </div>
        <input
          hidden
          type="file"
          accept=".json,.blueprint,.litematic,.schem,.schematic,.nbt"
          ref={fileRef}
          onChange={importBlueprint}
        />
        <button onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> {copy(language, "Importar", "Import")}
        </button>
        <button onClick={exportBlueprint}>
          <Download size={16} /> {copy(language, "Exportar JSON", "Export JSON")}
        </button>
        <button onClick={exportBlueprintNbt}>
          <Download size={16} /> {copy(language, "Exportar NBT", "Export NBT")}
        </button>
        <button onClick={exportBlueprintSchem}>
          <Download size={16} /> {copy(language, "Exportar SCHEM", "Export SCHEM")}
        </button>
        <button onClick={exportBlueprintLitematic}>
          <Download size={16} /> {copy(language, "Exportar LITEMATIC", "Export LITEMATIC")}
        </button>
      </div>

      <div className="blueprint-layout">
        <div className="blueprint-grid">
          {Array.from({ length: blueprint.size.z }).map((_, z) => (
            <React.Fragment key={z}>
              {Array.from({ length: blueprint.size.x }).map((__, x) => {
                const block = blocksOnSlice.get(`${x}:${z}`);
                return (
                  <button
                    key={`${x}:${z}`}
                    className={block ? "filled" : ""}
                    style={{
                      background: block ? blockColors[block.type] : undefined
                    }}
                    title={`X ${x}, Y ${slice}, Z ${z}`}
                    onClick={() => toggleBlock(x, z)}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <BlueprintPreview blueprint={blueprint} slice={slice} />

        <div className="tool-panel">
          <h3>{copy(language, "Resumo", "Summary")}</h3>
          <Stat label={copy(language, "Blocos", "Blocks")} value={String(blueprint.blocks.length)} />
          <Stat
            label={copy(language, "Tamanho", "Size")}
            value={`${blueprint.size.x} x ${blueprint.size.y} x ${blueprint.size.z}`}
          />
          <Stat label={copy(language, "Tipo ativo", "Active type")} value={blockLabels[selectedBlock]} />
          <button
            className="text-button danger"
            onClick={() => setBlueprint((current) => ({ ...current, blocks: [] }))}
          >
            <Trash2 size={16} /> {copy(language, "Limpar", "Clear")}
          </button>
        </div>
      </div>
    </section>
  );
}

function starterBlueprint(): BlueprintBlock[] {
  const blocks: BlueprintBlock[] = [];
  for (let x = 3; x < 13; x += 1) {
    for (let z = 3; z < 13; z += 1) {
      blocks.push({ x, y: 0, z, type: "oak" });
    }
  }
  for (let y = 1; y < 5; y += 1) {
    for (let x = 3; x < 13; x += 1) {
      blocks.push({ x, y, z: 3, type: y === 3 && x === 8 ? "glass" : "stone" });
      blocks.push({ x, y, z: 12, type: "stone" });
    }
    for (let z = 4; z < 12; z += 1) {
      blocks.push({ x: 3, y, z, type: "stone" });
      blocks.push({ x: 12, y, z, type: "stone" });
    }
  }
  for (let x = 2; x < 14; x += 1) {
    for (let z = 2; z < 14; z += 1) {
      blocks.push({ x, y: 5, z, type: "grass" });
    }
  }
  return blocks;
}

function BlueprintPreview({
  blueprint,
  slice
}: {
  blueprint: BlueprintState;
  slice: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.innerHTML = "";
    const width = mount.clientWidth || 520;
    const height = mount.clientHeight || 420;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#101722");
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(18, 18, 22);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(10, 18, 12);
    scene.add(ambient, sun);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(blueprint.size.x / 2, blueprint.size.y / 2, blueprint.size.z / 2);
    controls.enableDamping = true;

    const geometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const matrix = new THREE.Matrix4();
    (Object.keys(blockColors) as BlockType[]).forEach((type) => {
      const blocks = blueprint.blocks.filter((block) => block.type === type && block.y <= slice);
      if (!blocks.length) return;
      const material = new THREE.MeshLambertMaterial({
        color: blockColors[type],
        transparent: type === "glass" || type === "water",
        opacity: type === "glass" ? 0.48 : type === "water" ? 0.72 : 1
      });
      const mesh = new THREE.InstancedMesh(geometry, material, blocks.length);
      blocks.forEach((block, index) => {
        matrix.makeTranslation(block.x, block.y, block.z);
        mesh.setMatrixAt(index, matrix);
      });
      scene.add(mesh);
    });

    const grid = new THREE.GridHelper(24, 24, "#4ecca3", "#26384b");
    grid.position.set(blueprint.size.x / 2, -0.51, blueprint.size.z / 2);
    scene.add(grid);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const nextWidth = mount.clientWidth || width;
      const nextHeight = mount.clientHeight || height;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      mount.innerHTML = "";
    };
  }, [blueprint, slice]);

  return <div className="blueprint-preview" ref={mountRef} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const SEED_TILE_SIZE = 22;
const MIN_SEED_ZOOM = 0.25;
const MAX_SEED_ZOOM = 10;
const MIN_MARKER_ZOOM = 0.45;

type MarkerHitZone = {
  marker: SeedMarker;
  x: number;
  y: number;
  size: number;
};

type MarkerTooltipState = {
  marker: SeedMarker;
  x: number;
  y: number;
};

function SeedMapPage({ language }: { language: Language }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [seed, setSeed] = useState("5906562593331154958");
  const [versions, setVersions] = useState(minecraftVersions);
  const [version, setVersion] = useState(minecraftVersions[0]);
  const [platform, setPlatform] = useState<SeedPlatform>("java");
  const [dimension, setDimension] = useState<SeedDimension>("overworld");
  const [zoom, setZoom] = useState(1.4);
  const [offset, setOffset] = useState({ x: 0, z: 0 });
  const [target, setTarget] = useState({ x: 0, z: 0 });
  const [highlightedBiome, setHighlightedBiome] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);
  const [markerTooltip, setMarkerTooltip] = useState<MarkerTooltipState | null>(null);
  const [visitedMarkers, setVisitedMarkers] = useState<Record<string, boolean>>({});
  const [iconCacheVersion, setIconCacheVersion] = useState(0);
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(seedFeatureCatalog.map((feature) => [feature.id, true]))
  );
  const [visibleBiomes, setVisibleBiomes] = useState<SeedMapBiome[]>(
    fallbackBiomePalettes.overworld.slice(0, 8)
  );
  const [drawnMarkerCount, setDrawnMarkerCount] = useState(0);
  const [cubiomes, setCubiomes] = useState<CubiomesEngine | null>(null);
  const [seedEngineStatus, setSeedEngineStatus] = useState<"loading" | "active" | "fallback">("loading");
  const [hover, setHover] = useState<{ x: number; z: number; biome: string } | null>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetZ: number } | null>(null);
  const visibleBiomeSignatureRef = useRef("");
  const drawnMarkerCountRef = useRef(-1);
  const markerHitZonesRef = useRef<MarkerHitZone[]>([]);
  const iconCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const visitedStorageKeyRef = useRef("");
  const pendingOffsetRef = useRef(offset);
  const offsetFrameRef = useRef<number | null>(null);

  const availableFeatures = useMemo(
    () => seedFeatureCatalog.filter((feature) => feature.dimensions.includes(dimension)),
    [dimension]
  );
  const enabledFeatureIds = useMemo(
    () =>
      new Set(
        availableFeatures
          .filter((feature) => enabledFeatures[feature.id])
          .map((feature) => feature.id)
      ),
    [availableFeatures, enabledFeatures]
  );
  const exactJavaFeatureIds = useMemo(
    () =>
      new Set(
        seedFeatureCatalog
          .filter(
            (feature) =>
              feature.dimensions.includes(dimension) && typeof feature.cubiomesType === "number"
          )
          .map((feature) => feature.id)
      ),
    [dimension]
  );
  const javaEngineActive = Boolean(platform === "java" && cubiomes && seedEngineStatus === "active");
  const selectedVisibleBiome = visibleBiomes.some((biome) => biome.name === highlightedBiome)
    ? highlightedBiome
    : "";
  const visitedStorageKey = useMemo(
    () =>
      `ehm:seedMapVisited:v1:${platform}:${version}:${dimension}:${seed.trim() || "0"}`,
    [dimension, platform, seed, version]
  );

  useEffect(() => {
    let disposed = false;
    loadCubiomesEngine()
      .then((engine) => {
        if (disposed) return;
        setCubiomes(engine);
        setSeedEngineStatus("active");
      })
      .catch(() => {
        if (disposed) return;
        setSeedEngineStatus("fallback");
      });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    fetch(MINECRAFT_VERSION_MANIFEST_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Minecraft manifest ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((manifest) => {
        if (disposed) return;
        const releases = releaseVersionsFromManifest(manifest);
        if (!releases.length) return;
        setVersions(releases);
        setVersion((current) => (releases.includes(current) ? current : releases[0]));
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    seedFeatureCatalog.forEach((feature) => {
      if (iconCacheRef.current.has(feature.id)) return;
      const image = new Image();
      image.decoding = "async";
      image.onload = () => setIconCacheVersion((current) => current + 1);
      image.src = seedFeatureIconDataUrl(feature);
      iconCacheRef.current.set(feature.id, image);
    });
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(visitedStorageKey);
      setVisitedMarkers(saved ? (JSON.parse(saved) as Record<string, boolean>) : {});
    } catch {
      setVisitedMarkers({});
    }
    visitedStorageKeyRef.current = visitedStorageKey;
  }, [visitedStorageKey]);

  useEffect(() => {
    if (visitedStorageKeyRef.current !== visitedStorageKey) return;
    localStorage.setItem(visitedStorageKey, JSON.stringify(visitedMarkers));
  }, [visitedMarkers, visitedStorageKey]);

  useEffect(() => {
    pendingOffsetRef.current = offset;
  }, [offset]);

  useEffect(
    () => () => {
      if (offsetFrameRef.current !== null) {
        cancelAnimationFrame(offsetFrameRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left - rect.width / 2;
      const pointerZ = event.clientY - rect.top - rect.height / 2;
      const multiplier = event.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom((current) => {
        const next = clampSeedZoom(current * multiplier);
        const ratio = next / current;
        setOffset((currentOffset) => ({
          x: pointerX - (pointerX - currentOffset.x) * ratio,
          z: pointerZ - (pointerZ - currentOffset.z) * ratio
        }));
        return next;
      });
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0f151f";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const tile = SEED_TILE_SIZE * zoom;
    const startX = Math.floor((-rect.width / 2 - offset.x) / tile) - 2;
    const endX = Math.ceil((rect.width / 2 - offset.x) / tile) + 2;
    const startZ = Math.floor((-rect.height / 2 - offset.z) / tile) - 2;
    const endZ = Math.ceil((rect.height / 2 - offset.z) / tile) + 2;
    const visibleBiomeMap = new Map<string, SeedMapBiome>();

    if (javaEngineActive && cubiomes) {
      cubiomes.configure(seed, version, dimension);
    }

    const biomeStep = tile < 8 ? Math.ceil(8 / tile) : 1;
    for (let z = startZ; z <= endZ; z += biomeStep) {
      for (let x = startX; x <= endX; x += biomeStep) {
        const biome = biomeForSeedCell({
          cubiomes: javaEngineActive ? cubiomes : null,
          seed,
          version,
          platform,
          dimension,
          chunkX: x,
          chunkZ: z
        });
        visibleBiomeMap.set(biome.name, biome);
        const px = rect.width / 2 + offset.x + x * tile;
        const py = rect.height / 2 + offset.z + z * tile;
        const fillSize = tile * biomeStep + 1;

        if (enabledFeatureIds.has("biomes")) {
          ctx.fillStyle = biome.color;
          ctx.fillRect(px, py, fillSize, fillSize);
          if (selectedVisibleBiome && selectedVisibleBiome !== biome.name) {
            ctx.fillStyle = "rgba(7, 11, 17, 0.58)";
            ctx.fillRect(px, py, fillSize, fillSize);
          }
        } else {
          ctx.fillStyle = (x + z) % 2 === 0 ? "#121a25" : "#101720";
          ctx.fillRect(px, py, fillSize, fillSize);
        }

        if (
          tile >= 10 &&
          enabledFeatureIds.has("slime_chunk") &&
          dimension === "overworld" &&
          (platform === "java"
            ? isJavaSlimeChunk(seed, x, z)
            : isEstimatedSlimeChunk(seed, platform, x, z))
        ) {
          drawSlimeChunk(ctx, px, py, tile);
        }
      }
    }

    const sortedBiomes = Array.from(visibleBiomeMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    const nextSignature = sortedBiomes
      .map((biome) => `${biome.name}:${biome.color}`)
      .join("|");
    if (nextSignature !== visibleBiomeSignatureRef.current) {
      visibleBiomeSignatureRef.current = nextSignature;
      setVisibleBiomes(sortedBiomes);
    }

    const showMarkers = zoom >= MIN_MARKER_ZOOM;
    const exactMarkers =
      showMarkers && javaEngineActive && cubiomes
        ? cubiomes.structuresInChunkBounds(startX, endX, startZ, endZ, enabledFeatureIds)
        : [];
    const estimatedMarkers = showMarkers
      ? estimatedMarkersInChunkBounds(
          seed,
          version,
          platform,
          dimension,
          startX,
          endX,
          startZ,
          endZ,
          enabledFeatureIds,
          javaEngineActive ? exactJavaFeatureIds : new Set<string>()
        )
      : [];
    const markers = [...exactMarkers, ...estimatedMarkers];
    if (enabledFeatureIds.has("spawn") && dimension === "overworld") {
      markers.push({
        featureId: "spawn",
        label: "Spawn Point",
        glyph: "SP",
        color: "#f6f1a4",
        x: 0,
        z: 0,
        estimated: false
      });
    }
    markerHitZonesRef.current = drawSeedMarkers(
      ctx,
      markers,
      rect,
      offset,
      tile,
      iconCacheRef.current,
      visitedMarkers
    );
    canvas.dataset.markerCount = String(markerHitZonesRef.current.length);
    const firstVisibleHitZone = markerHitZonesRef.current.find(
      (zone) =>
        zone.x >= 0 &&
        zone.y >= 0 &&
        zone.x + zone.size <= rect.width &&
        zone.y + zone.size <= rect.height
    );
    canvas.dataset.firstMarker =
      firstVisibleHitZone
        ? `${firstVisibleHitZone.x},${firstVisibleHitZone.y},${firstVisibleHitZone.size}`
        : "";
    if (markers.length !== drawnMarkerCountRef.current) {
      drawnMarkerCountRef.current = markers.length;
      setDrawnMarkerCount(markers.length);
    }

    ctx.strokeStyle = zoom >= 0.7 ? "rgba(232, 232, 232, 0.16)" : "rgba(232, 232, 232, 0.08)";
    ctx.lineWidth = 1;
    const gridStep = zoom > 3 ? 1 : zoom > 0.9 ? 4 : 16;
    for (let x = Math.floor(startX / gridStep) * gridStep; x <= endX; x += gridStep) {
      const px = rect.width / 2 + offset.x + x * tile;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, rect.height);
      ctx.stroke();
    }
    for (let z = Math.floor(startZ / gridStep) * gridStep; z <= endZ; z += gridStep) {
      const py = rect.height / 2 + offset.z + z * tile;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(rect.width, py);
      ctx.stroke();
    }

    ctx.strokeStyle = "#f7fbff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.width / 2 - 9, rect.height / 2);
    ctx.lineTo(rect.width / 2 + 9, rect.height / 2);
    ctx.moveTo(rect.width / 2, rect.height / 2 - 9);
    ctx.lineTo(rect.width / 2, rect.height / 2 + 9);
    ctx.stroke();
    ctx.fillStyle = "rgba(16, 23, 34, 0.9)";
    ctx.fillRect(rect.width / 2 - 3, rect.height / 2 - 3, 6, 6);
  }, [
    cubiomes,
    dimension,
    enabledFeatureIds,
    exactJavaFeatureIds,
    iconCacheVersion,
    javaEngineActive,
    offset,
    platform,
    seed,
    selectedVisibleBiome,
    version,
    visitedMarkers,
    zoom
  ]);

  useEffect(() => {
    draw();
  }, [draw, mapExpanded]);

  function locate() {
    setOffset({
      x: -(target.x / 16) * SEED_TILE_SIZE * zoom,
      z: -(target.z / 16) * SEED_TILE_SIZE * zoom
    });
  }

  function queueOffset(nextOffset: { x: number; z: number }) {
    pendingOffsetRef.current = nextOffset;
    if (offsetFrameRef.current !== null) return;
    offsetFrameRef.current = requestAnimationFrame(() => {
      offsetFrameRef.current = null;
      setOffset(pendingOffsetRef.current);
    });
  }

  function mapCoordinates(event: ReactMouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const tile = SEED_TILE_SIZE * zoom;
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const chunkX = Math.floor((localX - rect.width / 2 - offset.x) / tile);
    const chunkZ = Math.floor((localY - rect.height / 2 - offset.z) / tile);
    const markerHit = findMarkerHit(markerHitZonesRef.current, localX, localY);
    if (markerHit) {
      setMarkerTooltip({
        marker: markerHit.marker,
        x: Math.min(Math.max(localX + 14, 8), Math.max(8, rect.width - 250)),
        y: Math.min(Math.max(localY + 14, 8), Math.max(8, rect.height - 142))
      });
    } else {
      setMarkerTooltip(null);
    }
    if (javaEngineActive && cubiomes) {
      cubiomes.configure(seed, version, dimension);
    }
    const biome = biomeForSeedCell({
      cubiomes: javaEngineActive ? cubiomes : null,
      seed,
      version,
      platform,
      dimension,
      chunkX,
      chunkZ
    });
    setHover({ x: chunkX * 16, z: chunkZ * 16, biome: biome.label });
  }

  function toggleVisitedMarker(marker: SeedMarker) {
    const key = seedMarkerKey(marker);
    setVisitedMarkers((current) => {
      const next = { ...current };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  }

  function setFeature(featureId: string, enabled: boolean) {
    setEnabledFeatures((current) => ({ ...current, [featureId]: enabled }));
  }

  function setAllVisibleFeatures(enabled: boolean) {
    setEnabledFeatures((current) => {
      const next = { ...current };
      availableFeatures.forEach((feature) => {
        next[feature.id] = enabled;
      });
      return next;
    });
  }

  function applyZoom(multiplier: number) {
    setZoom((current) => {
      const next = clampSeedZoom(current * multiplier);
      const ratio = next / current;
      setOffset((currentOffset) => ({
        x: currentOffset.x * ratio,
        z: currentOffset.z * ratio
      }));
      return next;
    });
  }

  const engineLabel =
    platform === "bedrock"
      ? copy(language, "Bedrock em modo estimado", "Bedrock estimated mode")
      : seedEngineStatus === "active"
        ? copy(language, "Java Cubiomes exato", "Exact Java Cubiomes")
        : seedEngineStatus === "loading"
          ? copy(language, "Carregando Cubiomes...", "Loading Cubiomes...")
          : copy(language, "Fallback deterministico", "Deterministic fallback");

  return (
    <section className="workbench">
      <WorkbenchHeader
        eyebrow="Seed Map"
        title={t(language, "seed")}
        description={
          language === "pt-br"
            ? "Mapa de seed com dimensoes, filtros de estruturas, biomas por legenda e zoom amplo."
            : "Seed map with dimensions, structure filters, biome legend and wide zoom."
        }
      />
      <div className="seed-map-controls">
        <div className="toolbar seed-toolbar">
          <label className="inline-input seed-input">
            Seed
            <input value={seed} onChange={(event) => setSeed(event.target.value)} />
          </label>
          <label className="inline-input">
            {copy(language, "Edicao", "Edition")}
            <select value={platform} onChange={(event) => setPlatform(event.target.value as SeedPlatform)}>
              {seedPlatforms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-input">
            {copy(language, "Versao", "Version")}
            <select value={version} onChange={(event) => setVersion(event.target.value)}>
              {versions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="inline-input">
            {copy(language, "Bioma", "Biome")}
            <select value={selectedVisibleBiome} onChange={(event) => setHighlightedBiome(event.target.value)}>
              <option value="">{copy(language, "Todos visiveis", "All visible")}</option>
              {visibleBiomes.map((biome) => (
                <option key={biome.name} value={biome.name}>
                  {biome.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="toolbar seed-toolbar">
          <div className="segmented seed-segmented" aria-label={copy(language, "Dimensao", "Dimension")}>
            {seedDimensions.map((item) => (
              <button
                key={item.id}
                className={dimension === item.id ? "selected" : undefined}
                onClick={() => {
                  setDimension(item.id);
                  setHighlightedBiome("");
                  setOffset({ x: 0, z: 0 });
                }}
              >
                {language === "pt-br" ? item.labelPt : item.labelEn}
              </button>
            ))}
          </div>
          <label className="inline-input small">
            X
            <input
              type="number"
              value={target.x}
              onChange={(event) =>
                setTarget((current) => ({ ...current, x: Number(event.target.value) }))
              }
            />
          </label>
          <label className="inline-input small">
            Z
            <input
              type="number"
              value={target.z}
              onChange={(event) =>
                setTarget((current) => ({ ...current, z: Number(event.target.value) }))
              }
            />
          </label>
          <button onClick={locate}>
            <LocateFixed size={16} /> {copy(language, "Ir", "Go")}
          </button>
          <button onClick={() => applyZoom(1.25)} title="Zoom in">
            <Plus size={16} />
          </button>
          <button onClick={() => applyZoom(0.8)} title="Zoom out">
            <Minus size={16} />
          </button>
          <button
            onClick={() => {
              setOffset({ x: 0, z: 0 });
              setZoom(1.4);
            }}
            title={copy(language, "Centralizar", "Reset")}
          >
            <RotateCcw size={16} />
          </button>
          <button onClick={() => setMapExpanded((current) => !current)} title={copy(language, "Expandir", "Expand")}>
            {mapExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
        <div className="feature-panel">
          <div className="feature-panel-header">
            <strong>{copy(language, "Marcadores", "Features")}</strong>
            <span>
              {drawnMarkerCount} {copy(language, "visiveis", "visible")}
            </span>
            <button onClick={() => setAllVisibleFeatures(true)}>
              <Check size={14} /> {copy(language, "Selecionar tudo", "Select all")}
            </button>
            <button onClick={() => setAllVisibleFeatures(false)}>
              <X size={14} /> {copy(language, "Limpar", "Clear")}
            </button>
          </div>
          <div className="feature-grid">
            {availableFeatures.map((feature) => {
              const exact =
                platform === "java" &&
                seedEngineStatus === "active" &&
                typeof feature.cubiomesType === "number";
              const label = seedFeatureLabel(feature, language);
              return (
                <button
                  key={feature.id}
                  className={enabledFeatures[feature.id] ? "feature-toggle active" : "feature-toggle"}
                  onClick={() => setFeature(feature.id, !enabledFeatures[feature.id])}
                  title={exact ? `${label} - Cubiomes` : `${label} - ${copy(language, "estimado", "estimated")}`}
                >
                  <img className="feature-icon" src={seedFeatureIconDataUrl(feature)} alt="" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className={mapExpanded ? "map-shell expanded" : "map-shell"}>
        <canvas
          ref={canvasRef}
          className="seed-canvas"
          tabIndex={0}
          onMouseMove={mapCoordinates}
          onPointerDown={(event) => {
            dragRef.current = {
              x: event.clientX,
              y: event.clientY,
              offsetX: offset.x,
              offsetZ: offset.z
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            queueOffset({
              x: dragRef.current.offsetX + event.clientX - dragRef.current.x,
              z: dragRef.current.offsetZ + event.clientY - dragRef.current.y
            });
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          onKeyDown={(event) => {
            const panAmount = 64;
            if (event.key === "ArrowLeft") setOffset((current) => ({ ...current, x: current.x + panAmount }));
            if (event.key === "ArrowRight") setOffset((current) => ({ ...current, x: current.x - panAmount }));
            if (event.key === "ArrowUp") setOffset((current) => ({ ...current, z: current.z + panAmount }));
            if (event.key === "ArrowDown") setOffset((current) => ({ ...current, z: current.z - panAmount }));
            if (event.key === "+" || event.key === "=") applyZoom(1.25);
            if (event.key === "-") applyZoom(0.8);
            if (event.key.toLowerCase() === "r") {
              setOffset({ x: 0, z: 0 });
              setZoom(1.4);
            }
          }}
        />
        <div className="map-hud">
          {hover
            ? `${hover.biome} | X ${hover.x}, Z ${hover.z} | ${Math.round(zoom * 100)}%`
            : copy(language, "Passe o mouse no mapa", "Hover the map")}
          <span>{engineLabel}</span>
        </div>
        {markerTooltip && (
          <SeedMarkerTooltip
            language={language}
            tooltip={markerTooltip}
            visited={Boolean(visitedMarkers[seedMarkerKey(markerTooltip.marker)])}
            onVisitedChange={() => toggleVisitedMarker(markerTooltip.marker)}
          />
        )}
      </div>
      <div className="legend seed-legend">
        {enabledFeatureIds.has("biomes") ? (
          visibleBiomes.map((biome) => (
            <button
              key={biome.name}
              className={selectedVisibleBiome === biome.name ? "selected" : undefined}
              onClick={() =>
                setHighlightedBiome((current) => (current === biome.name ? "" : biome.name))
              }
            >
              <i style={{ background: biome.color }} />
              {biome.label}
            </button>
          ))
        ) : (
          <span>{copy(language, "Camada de biomas oculta", "Biome layer hidden")}</span>
        )}
      </div>
    </section>
  );
}

function SeedMarkerTooltip({
  language,
  tooltip,
  visited,
  onVisitedChange
}: {
  language: Language;
  tooltip: MarkerTooltipState;
  visited: boolean;
  onVisitedChange: () => void;
}) {
  const feature = featureById(tooltip.marker.featureId);
  const label = feature ? seedFeatureLabel(feature, language) : tooltip.marker.label;
  const status =
    tooltip.marker.featureId === "spawn"
      ? copy(language, "Ponto manual", "Manual point")
      : tooltip.marker.estimated
        ? copy(language, "Estimado", "Estimated")
        : "Cubiomes";

  return (
    <div
      className="seed-marker-tooltip"
      style={{ left: tooltip.x, top: tooltip.y }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseMove={(event) => event.stopPropagation()}
    >
      <div className="seed-marker-tooltip-title">
        <img
          src={seedFeatureIconDataUrl(feature ?? { id: tooltip.marker.featureId, color: tooltip.marker.color })}
          alt=""
          aria-hidden="true"
        />
        <div>
          <strong>{label}</strong>
          <span>{status}</span>
        </div>
      </div>
      <div className="seed-marker-tooltip-coords">
        <span>X {Math.round(tooltip.marker.x)}</span>
        <span>Z {Math.round(tooltip.marker.z)}</span>
      </div>
      <label className="seed-visited-toggle">
        <input type="checkbox" checked={visited} onChange={onVisitedChange} />
        {copy(language, "Visitado", "Visited")}
      </label>
    </div>
  );
}

function findMarkerHit(hitZones: MarkerHitZone[], x: number, y: number) {
  for (let index = hitZones.length - 1; index >= 0; index -= 1) {
    const zone = hitZones[index];
    if (
      x >= zone.x &&
      x <= zone.x + zone.size &&
      y >= zone.y &&
      y <= zone.y + zone.size
    ) {
      return zone;
    }
  }
  return null;
}

function biomeForSeedCell({
  cubiomes,
  seed,
  version,
  platform,
  dimension,
  chunkX,
  chunkZ
}: {
  cubiomes: CubiomesEngine | null;
  seed: string;
  version: string;
  platform: SeedPlatform;
  dimension: SeedDimension;
  chunkX: number;
  chunkZ: number;
}): SeedMapBiome {
  if (cubiomes) {
    const y = dimension === "overworld" ? 63 : 64;
    const biome: CubiomesBiome = cubiomes.biomeAt(chunkX * 16, chunkZ * 16, y);
    return {
      id: String(biome.id),
      name: biome.name,
      label: biome.label,
      color: biome.color
    };
  }
  return fallbackBiomeAt(seed, version, platform, dimension, chunkX, chunkZ);
}

function clampSeedZoom(value: number) {
  return Math.max(MIN_SEED_ZOOM, Math.min(MAX_SEED_ZOOM, value));
}

function drawSlimeChunk(ctx: CanvasRenderingContext2D, px: number, py: number, tile: number) {
  ctx.save();
  ctx.fillStyle = "rgba(117, 220, 92, 0.24)";
  ctx.fillRect(px, py, tile + 1, tile + 1);
  if (tile >= 16) {
    ctx.strokeStyle = "rgba(203, 255, 185, 0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 2, py + 2, Math.max(2, tile - 4), Math.max(2, tile - 4));
  }
  ctx.restore();
}

function drawSeedMarkers(
  ctx: CanvasRenderingContext2D,
  markers: SeedMarker[],
  rect: DOMRect,
  offset: { x: number; z: number },
  tile: number,
  iconCache: Map<string, HTMLImageElement>,
  visitedMarkers: Record<string, boolean>
) {
  const hitZones: MarkerHitZone[] = [];
  markers.forEach((marker) => {
    const px = rect.width / 2 + offset.x + (marker.x / 16) * tile;
    const py = rect.height / 2 + offset.z + (marker.z / 16) * tile;
    const size = Math.max(14, Math.min(30, tile * 0.78));
    const x = px - size / 2;
    const y = py - size / 2;
    const visited = Boolean(visitedMarkers[seedMarkerKey(marker)]);
    const icon = iconCache.get(marker.featureId);
    hitZones.push({ marker, x, y, size });

    ctx.save();
    ctx.globalAlpha = visited ? 0.42 : 1;
    if (icon?.complete && icon.naturalWidth > 0) {
      ctx.drawImage(icon, x, y, size, size);
    } else {
      ctx.fillStyle = marker.color;
      ctx.strokeStyle = marker.estimated ? "rgba(255, 255, 255, 0.65)" : "#07111c";
      ctx.lineWidth = marker.estimated ? 1 : 2;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, Math.max(3, size * 0.16));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = readableTextColor(marker.color);
      ctx.font = `800 ${Math.max(7, Math.min(11, size * 0.42))}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(marker.glyph.slice(0, 2), px, py + 0.5);
    }
    if (marker.estimated && size >= 18) {
      ctx.globalAlpha = visited ? 0.5 : 1;
      ctx.fillStyle = "rgba(7, 17, 28, 0.88)";
      ctx.beginPath();
      ctx.arc(px + size * 0.34, py - size * 0.34, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
  return hitZones;
}

function readableTextColor(hexColor: string) {
  const clean = hexColor.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#07111c" : "#f7fbff";
}

function WorldImporter({ language }: { language: Language }) {
  const [world, setWorld] = usePersistentState<WorldSummary | null>("ehm:world", null);
  const [dimensionKey, setDimensionKey] = useState("overworld");
  const [target, setTarget] = useState({ x: 0, z: 0 });

  async function selectWorld() {
    if (!window.everyHelper) {
      alert(copy(language, "A importacao de pastas funciona dentro do app Electron.", "Folder import works inside the Electron app."));
      return;
    }
    const result = await window.everyHelper.selectWorldFolder();
    if (result.ok) {
      setWorld(result);
      setDimensionKey("overworld");
    } else if (result.error !== "Selecao cancelada.") {
      alert(result.error);
    }
  }

  const dimension = world?.dimensions?.find((item) => item.key === dimensionKey);
  const selectedRegion = dimension
    ? dimension.regions.find(
        (region) =>
          region.x === Math.floor(target.x / 512) && region.z === Math.floor(target.z / 512)
      )
    : undefined;

  return (
    <section className="workbench">
      <WorkbenchHeader
        eyebrow="World Importer"
        title={t(language, "world")}
        description={
          language === "pt-br"
            ? "Importe uma pasta de mundo Java, leia level.dat e veja as regioes .mca por dimensao."
            : "Import a Java world folder, read level.dat and view .mca regions by dimension."
        }
      />
      <div className="toolbar">
        <button className="primary" onClick={selectWorld}>
          <FolderOpen size={16} /> {copy(language, "Selecionar mundo", "Select world")}
        </button>
        <label className="inline-input small">
          X
          <input
            type="number"
            value={target.x}
            onChange={(event) =>
              setTarget((current) => ({ ...current, x: Number(event.target.value) }))
            }
          />
        </label>
        <label className="inline-input small">
          Z
          <input
            type="number"
            value={target.z}
            onChange={(event) =>
              setTarget((current) => ({ ...current, z: Number(event.target.value) }))
            }
          />
        </label>
      </div>

      {!world?.ok ? (
        <EmptyState
          icon={<Globe2 size={32} />}
          title={copy(language, "Nenhum mundo importado", "No world imported")}
          text={copy(
            language,
            "Escolha a pasta de um save do Minecraft Java para analisar regioes, chunks e metadata.",
            "Choose a Minecraft Java save folder to inspect regions, chunks and metadata."
          )}
        />
      ) : (
        <div className="world-layout">
          <div className="tool-panel">
            <h3>{world.name}</h3>
            <Stat label="Seed" value={world.seed ?? copy(language, "Nao encontrada", "Not found")} />
            <Stat label={copy(language, "Modo", "Mode")} value={world.gameMode ?? copy(language, "Nao encontrado", "Not found")} />
            <Stat
              label="Spawn"
              value={
                world.spawn?.x !== undefined
                  ? `${world.spawn.x}, ${world.spawn.y}, ${world.spawn.z}`
                  : copy(language, "Nao encontrado", "Not found")
              }
            />
            <div className="segmented-column">
              {world.dimensions?.map((dimensionItem) => (
                <button
                  key={dimensionItem.key}
                  className={dimensionKey === dimensionItem.key ? "selected" : ""}
                  onClick={() => setDimensionKey(dimensionItem.key)}
                >
                  {dimensionItem.label}
                  <span>{dimensionItem.regions.length}</span>
                </button>
              ))}
            </div>
          </div>
          <RegionMap dimension={dimension} selectedRegion={selectedRegion} />
          <div className="tool-panel">
            <h3>{copy(language, "Regiao alvo", "Target region")}</h3>
            {selectedRegion ? (
              <>
                <Stat label={copy(language, "Arquivo", "File")} value={selectedRegion.fileName} />
                <Stat label="Chunks" value={String(selectedRegion.chunks)} />
                <Stat
                  label={copy(language, "Amostras", "Samples")}
                  value={String(selectedRegion.sampledChunks ?? 0)}
                />
                <Stat
                  label={copy(language, "Bioma", "Biome")}
                  value={formatBiomeName(selectedRegion.topBiomes?.[0]?.id)}
                />
                <Stat
                  label={copy(language, "Altura media", "Average height")}
                  value={
                    selectedRegion.averageHeight !== undefined
                      ? String(selectedRegion.averageHeight)
                      : copy(language, "Sem heightmap", "No heightmap")
                  }
                />
                <Stat
                  label={copy(language, "Relevo", "Relief")}
                  value={
                    selectedRegion.minHeight !== undefined &&
                    selectedRegion.maxHeight !== undefined
                      ? `${selectedRegion.minHeight} - ${selectedRegion.maxHeight}`
                      : copy(language, "Sem dados", "No data")
                  }
                />
                <Stat label={copy(language, "Alterado", "Modified")} value={readableDate(selectedRegion.lastModified)} />
              </>
            ) : (
              <p className="muted">
                {copy(language, "Nenhuma regiao carregada para estas coordenadas.", "No region loaded for these coordinates.")}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function RegionMap({
  dimension,
  selectedRegion
}: {
  dimension?: DimensionSummary;
  selectedRegion?: RegionSummary;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dimension) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#101722";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (!dimension.regions.length) {
      ctx.fillStyle = "#91a4b7";
      ctx.fillText("Sem regioes nesta dimensao", 24, 32);
      return;
    }

    const minX = Math.min(...dimension.regions.map((region) => region.x));
    const maxX = Math.max(...dimension.regions.map((region) => region.x));
    const minZ = Math.min(...dimension.regions.map((region) => region.z));
    const maxZ = Math.max(...dimension.regions.map((region) => region.z));
    const cols = Math.max(1, maxX - minX + 1);
    const rows = Math.max(1, maxZ - minZ + 1);
    const cell = Math.min(rect.width / cols, rect.height / rows) * 0.82;
    const originX = (rect.width - cols * cell) / 2;
    const originZ = (rect.height - rows * cell) / 2;

    dimension.regions.forEach((region) => {
      const x = originX + (region.x - minX) * cell;
      const z = originZ + (region.z - minZ) * cell;
      const intensity = Math.min(1, region.chunks / 1024);
      ctx.fillStyle = regionColor(region, intensity);
      ctx.fillRect(x + 1, z + 1, cell - 2, cell - 2);
      if (region.averageHeight !== undefined && cell > 34) {
        const relief = Math.max(0, Math.min(1, (region.averageHeight - 48) / 128));
        ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + relief * 0.22})`;
        ctx.fillRect(x + 2, z + 2, cell - 4, Math.max(2, (cell - 4) * relief));
      }
      if (selectedRegion && selectedRegion.x === region.x && selectedRegion.z === region.z) {
        ctx.strokeStyle = "#f2c94c";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, z + 2, cell - 4, cell - 4);
      }
    });
  }, [dimension, selectedRegion]);

  return <canvas className="region-map" ref={canvasRef} />;
}

function regionColor(region: RegionSummary, intensity: number) {
  const base = colorForBiome(region.topBiomes?.[0]?.id);
  const height = region.averageHeight ?? 64;
  const shade = Math.max(-0.22, Math.min(0.32, (height - 72) / 220));
  const rgb = hexToRgb(base);
  const mix = (channel: number) =>
    Math.round(Math.max(0, Math.min(255, channel + 255 * shade + intensity * 24)));
  return `rgba(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)}, 0.94)`;
}

function colorForBiome(id?: string) {
  if (!id) return "#5aa68d";
  if (id.includes("desert") || id.includes("badlands")) return "#d4b35f";
  if (id.includes("snow") || id.includes("frozen") || id.includes("ice")) return "#c9e4ef";
  if (id.includes("ocean") || id.includes("river")) return "#3a6ea5";
  if (id.includes("swamp") || id.includes("mangrove")) return "#4c7a4f";
  if (id.includes("jungle")) return "#2f8a45";
  if (id.includes("forest") || id.includes("taiga")) return "#3f7d46";
  if (id.includes("mountain") || id.includes("peak") || id.includes("slope")) {
    return "#8d958f";
  }
  if (id.includes("nether") || id.includes("basalt") || id.includes("crimson")) {
    return "#9e3f35";
  }
  if (id.includes("end")) return "#b8b574";
  return "#62a96f";
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function formatBiomeName(id?: string) {
  if (!id) return "Nao encontrado";
  return id
    .replace(/^minecraft:/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ModpacksPage({ language }: { language: Language }) {
  const [packs, setPacks] = usePersistentState<SavedModpack[]>("ehm:modpacks", []);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.20.1");
  const [loader, setLoader] = useState<SavedModpack["loader"]>("fabric");
  const [description, setDescription] = useState("");
  const [pendingFolder, setPendingFolder] = useState<ModpackFolderSummary | null>(null);
  const [lastResult, setLastResult] = useState<
    LauncherProfileResult | ModpackArchiveResult | null
  >(null);

  async function importFolder() {
    if (!window.everyHelper) {
      alert(copy(language, "A selecao de pasta funciona dentro do app Electron.", "Folder selection works inside the Electron app."));
      return;
    }
    const result = await window.everyHelper.selectModpackFolder();
    if (result.ok) {
      setPendingFolder(result);
      setName((current) => current || result.name || "Meu Modpack");
    } else if (result.error !== "Selecao cancelada.") {
      alert(result.error);
    }
  }

  function addPack() {
    if (!pendingFolder?.ok || !pendingFolder.path) return;
    setPacks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: name.trim() || pendingFolder.name || "Modpack",
        minecraftVersion: version,
        loader,
        description,
        folder: pendingFolder,
        createdAt: new Date().toISOString()
      }
    ]);
    setPendingFolder(null);
    setName("");
    setDescription("");
  }

  async function play(pack: SavedModpack) {
    if (!window.everyHelper || !pack.folder.path) return;
    const result = await window.everyHelper.installLauncherProfile({
      id: pack.id,
      name: pack.name,
      gameDir: pack.folder.path,
      minecraftVersion: pack.minecraftVersion,
      loader: pack.loader
    });
    setLastResult(result);
    if (result.ok) {
      await window.everyHelper.openMinecraftLauncher();
    }
  }

  async function exportArchive(pack: SavedModpack) {
    if (!window.everyHelper || !pack.folder.path) {
      alert(copy(language, "Exportacao ZIP funciona dentro do app Electron.", "ZIP export works inside the Electron app."));
      return;
    }
    const result = await window.everyHelper.exportModpackArchive({
      id: pack.id,
      name: pack.name,
      sourcePath: pack.folder.path,
      minecraftVersion: pack.minecraftVersion,
      loader: pack.loader,
      description: pack.description
    });
    setLastResult(result);
  }

  return (
    <section className="workbench">
      <WorkbenchHeader
        eyebrow="Modpack Manager"
        title={t(language, "modpacks")}
        description={
          language === "pt-br"
            ? "Importe pastas de mods, confira arquivos aceitos e gere um perfil no launcher oficial."
            : "Import mod folders, inspect accepted files and generate a profile in the official launcher."
        }
      />
      <div className="modpack-layout">
        <div className="tool-panel">
          <h3>{copy(language, "Novo modpack", "New modpack")}</h3>
          <label>
            <span>{copy(language, "Nome", "Name")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>{copy(language, "Versao", "Version")}</span>
            <select value={version} onChange={(event) => setVersion(event.target.value)}>
              {minecraftVersions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Loader</span>
            <select
              value={loader}
              onChange={(event) => setLoader(event.target.value as SavedModpack["loader"])}
            >
              <option value="fabric">Fabric</option>
              <option value="forge">Forge</option>
              <option value="quilt">Quilt</option>
              <option value="vanilla">Vanilla</option>
            </select>
          </label>
          <label>
            <span>{copy(language, "Descricao", "Description")}</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button className="text-button" onClick={importFolder}>
            <FolderOpen size={16} /> {copy(language, "Selecionar pasta", "Select folder")}
          </button>
          <button className="primary" disabled={!pendingFolder?.ok} onClick={addPack}>
            <Plus size={16} /> {copy(language, "Adicionar", "Add")}
          </button>
          {pendingFolder?.ok && (
            <div className="folder-summary">
              <Stat label="Mods" value={String(pendingFolder.mods?.length ?? 0)} />
              <Stat label={copy(language, "Arquivos", "Files")} value={String(pendingFolder.acceptedFiles ?? 0)} />
              <Stat label={copy(language, "Tamanho", "Size")} value={`${pendingFolder.totalSizeMb ?? 0} MB`} />
            </div>
          )}
        </div>

        <div className="pack-list">
          {packs.length === 0 ? (
            <EmptyState
              icon={<FileArchive size={32} />}
              title={copy(language, "Nenhum modpack", "No modpack")}
              text={copy(
                language,
                "Importe uma pasta que tenha mods, configs, resourcepacks ou saves.",
                "Import a folder with mods, configs, resourcepacks or saves."
              )}
            />
          ) : (
            packs.map((pack) => (
              <article className="pack-card" key={pack.id}>
                <div>
                  <span className="tab-cube tab-modpacks" />
                  <div>
                    <h3>{pack.name}</h3>
                    <p>{pack.description || pack.folder.path}</p>
                  </div>
                </div>
                <div className="pack-stats">
                  <Stat label="MC" value={pack.minecraftVersion} />
                  <Stat label="Loader" value={pack.loader} />
                  <Stat label="Mods" value={String(pack.folder.mods?.length ?? 0)} />
                  <Stat label="MB" value={String(pack.folder.totalSizeMb ?? 0)} />
                </div>
                <details>
                  <summary>{copy(language, "Mods detectados", "Detected mods")}</summary>
                  <ul>
                    {(pack.folder.mods ?? []).slice(0, 20).map((mod) => (
                      <li key={mod.relativePath}>
                        {mod.name}
                        {mod.versionHint ? ` (${mod.versionHint})` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
                <div className="action-row">
                  <button className="primary" onClick={() => play(pack)}>
                    <Play size={16} /> Play
                  </button>
                  <button
                    onClick={() =>
                      downloadTextFile(
                        `${pack.name.replace(/\s+/g, "-").toLowerCase()}.modpack.json`,
                        JSON.stringify(pack, null, 2)
                      )
                    }
                  >
                    <Download size={16} /> {copy(language, "Exportar", "Export")}
                  </button>
                  <button onClick={() => exportArchive(pack)}>
                    <FileArchive size={16} /> ZIP
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
      {lastResult && (
        <div className={lastResult.ok ? "toast success" : "toast error"}>
          {lastResult.message}
        </div>
      )}
    </section>
  );
}

function ProfilePage({
  profile,
  setProfile,
  account,
  setAccount,
  cloudConfig,
  cloudUser,
  setCloudUser,
  supabase,
  language
}: {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
  account: LocalAccount | null;
  setAccount: React.Dispatch<React.SetStateAction<LocalAccount | null>>;
  cloudConfig: CloudConfig;
  cloudUser: CloudUser | null;
  setCloudUser: React.Dispatch<React.SetStateAction<CloudUser | null>>;
  supabase: SupabaseClient | null;
  language: Language;
}) {
  const [lookupStatus, setLookupStatus] = useState("");
  const [authEmail, setAuthEmail] = useState(profile.email || account?.email || "");
  const [authPassword, setAuthPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const avatarCandidates = useMemo(() => minecraftAvatarCandidates(profile), [profile]);
  const avatarKey = avatarCandidates.join("|");
  const [avatarCandidateIndex, setAvatarCandidateIndex] = useState(0);
  const avatarSrc = avatarCandidates[avatarCandidateIndex];

  useEffect(() => {
    setAvatarCandidateIndex(0);
  }, [avatarKey]);

  useEffect(() => {
    const nextAvatarUrl = bestMinecraftAvatarUrl(
      profile.minecraftUuid,
      profile.minecraftUsername,
      profile.avatarUrl
    );
    if (nextAvatarUrl && (!profile.avatarUrl || isLegacyAvatarUrl(profile.avatarUrl))) {
      setProfile((current) =>
        current.avatarUrl === nextAvatarUrl
          ? current
          : {
              ...current,
              avatarUrl: nextAvatarUrl
            }
      );
    }
  }, [profile.avatarUrl, profile.minecraftUsername, profile.minecraftUuid, setProfile]);

  async function connectMinecraft() {
    const username = profile.minecraftUsername.trim();
    if (!username) return;
    setLookupStatus(copy(language, "Buscando perfil publico...", "Searching public profile..."));
    try {
      const response = await fetch(
        `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`
      );
      if (!response.ok) throw new Error(copy(language, "Username nao encontrado.", "Username not found."));
      const data = (await response.json()) as { id: string; name: string };
      setProfile((current) => ({
        ...current,
        minecraftUsername: data.name,
        minecraftUuid: data.id,
        avatarUrl: minecraftAvatarUrl(data.id)
      }));
      setLookupStatus(copy(language, "Perfil conectado pela API publica.", "Profile connected through the public API."));
    } catch (error) {
      setLookupStatus(error instanceof Error ? error.message : copy(language, "Falha ao buscar.", "Lookup failed."));
    }
  }

  async function signUpSupabase() {
    if (!supabase) {
      setAuthStatus(copy(language, "Configure URL e anon key do Supabase em Configuracoes.", "Configure the Supabase URL and anon key in Settings."));
      return;
    }
    setAuthStatus(copy(language, "Criando conta no Supabase...", "Creating Supabase account..."));
    const { data, error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
      options: {
        data: { display_name: profile.displayName || "Player" }
      }
    });
    if (error) {
      setAuthStatus(error.message);
      return;
    }
    const user = data.user;
    if (user) {
      setCloudUser({ id: user.id, email: user.email ?? authEmail.trim() });
      await saveProfileToSupabase(user);
    }
    setAuthStatus(copy(language, "Conta criada. Se o email exigir confirmacao, confirme antes de logar.", "Account created. If email confirmation is required, confirm it before logging in."));
  }

  async function signInSupabase() {
    if (!supabase) {
      setAuthStatus(copy(language, "Configure URL e anon key do Supabase em Configuracoes.", "Configure the Supabase URL and anon key in Settings."));
      return;
    }
    setAuthStatus(copy(language, "Entrando no Supabase...", "Signing in to Supabase..."));
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword
    });
    if (error) {
      setAuthStatus(error.message);
      return;
    }
    if (data.user) {
      setCloudUser({ id: data.user.id, email: data.user.email ?? authEmail.trim() });
      await loadProfileFromSupabase(data.user);
    }
    setAuthStatus(copy(language, "Login concluido e perfil sincronizado.", "Login complete and profile synced."));
  }

  async function signOutSupabase() {
    await supabase?.auth.signOut();
    setCloudUser(null);
    setAuthStatus(copy(language, "Sessao Supabase encerrada.", "Supabase session ended."));
  }

  async function saveProfileToSupabase(userOverride?: SupabaseUser) {
    if (!supabase) {
      setAuthStatus(copy(language, "Supabase nao configurado.", "Supabase is not configured."));
      return;
    }
    const user =
      userOverride ??
      (await supabase.auth.getUser()).data.user ??
      (cloudUser ? ({ id: cloudUser.id, email: cloudUser.email } as SupabaseUser) : null);
    if (!user) {
      setAuthStatus(copy(language, "Faca login no Supabase antes de sincronizar.", "Sign in to Supabase before syncing."));
      return;
    }

    const avatarUrl = bestMinecraftAvatarUrl(
      profile.minecraftUuid,
      profile.minecraftUsername,
      profile.avatarUrl
    );
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: profile.displayName || "Player",
      bio: profile.bio,
      pronouns: profile.pronouns,
      minecraft_username: profile.minecraftUsername,
      minecraft_uuid: profile.minecraftUuid,
      microsoft_gamertag: profile.minecraftUsername,
      avatar_head_url: avatarUrl
    });
    const { error: settingsError } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      language,
      theme: "dark",
      drive_sync_enabled: Boolean(localStorage.getItem("ehm:cloudConfig")),
      microsoft_linked: Boolean(profile.minecraftUuid),
      first_run_completed: true,
      settings_data: collectLocalBackupPayload().data
    });

    const error = profileError ?? settingsError;
    setAuthStatus(error ? error.message : copy(language, "Perfil e configuracoes enviados ao Supabase.", "Profile and settings uploaded to Supabase."));
  }

  async function loadProfileFromSupabase(userOverride?: SupabaseUser) {
    if (!supabase) {
      setAuthStatus(copy(language, "Supabase nao configurado.", "Supabase is not configured."));
      return;
    }
    const user =
      userOverride ??
      (await supabase.auth.getUser()).data.user ??
      (cloudUser ? ({ id: cloudUser.id, email: cloudUser.email } as SupabaseUser) : null);
    if (!user) {
      setAuthStatus(copy(language, "Faca login no Supabase antes de baixar o perfil.", "Sign in to Supabase before downloading the profile."));
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) {
      setAuthStatus(error.message);
      return;
    }
    if (data) {
      const minecraftUsername = data.minecraft_username ?? "";
      const minecraftUuid = data.minecraft_uuid ?? "";
      const avatarUrl = bestMinecraftAvatarUrl(
        minecraftUuid,
        minecraftUsername,
        data.avatar_head_url ?? ""
      );
      setProfile((current) => ({
        ...current,
        displayName: data.display_name ?? current.displayName,
        email: user.email ?? current.email,
        bio: data.bio ?? "",
        pronouns: data.pronouns ?? "",
        minecraftUsername,
        minecraftUuid,
        avatarUrl
      }));
      setAuthStatus(copy(language, "Perfil baixado do Supabase.", "Profile downloaded from Supabase."));
    }
  }

  async function connectMicrosoftMinecraft() {
    if (!window.everyHelper) {
      setLookupStatus(copy(language, "Abra no app Electron para conectar Microsoft.", "Open the Electron app to connect Microsoft."));
      return;
    }
    if (!cloudConfig.microsoftClientId.trim()) {
      setLookupStatus(copy(language, "Informe o Microsoft Client ID em Configuracoes.", "Enter the Microsoft Client ID in Settings."));
      return;
    }
    setLookupStatus(copy(language, "Abrindo login Microsoft...", "Opening Microsoft login..."));
    const result = await window.everyHelper.connectMicrosoftMinecraft({
      clientId: cloudConfig.microsoftClientId.trim()
    });
    if (!result.ok) {
      setLookupStatus(result.message);
      return;
    }
    setProfile((current) => ({
      ...current,
      minecraftUsername: result.username ?? current.minecraftUsername,
      minecraftUuid: result.uuid ?? current.minecraftUuid,
      avatarUrl: bestMinecraftAvatarUrl(
        result.uuid ?? current.minecraftUuid,
        result.username ?? current.minecraftUsername,
        result.avatarUrl ?? current.avatarUrl
      )
    }));
    setLookupStatus(result.message);
  }

  useEffect(() => {
    if (account && account.displayName !== profile.displayName) {
      setAccount({ ...account, displayName: profile.displayName });
    }
  }, [profile.displayName]);

  return (
    <section className="workbench">
      <WorkbenchHeader
        eyebrow="Player Profile"
        title={t(language, "profile")}
        description={
          language === "pt-br"
            ? "Perfil local completo com dados editaveis e avatar Minecraft por username."
            : "Complete local profile with editable data and Minecraft avatar by username."
        }
      />

      <div className="profile-layout">
        <div className="profile-card">
          <div className="avatar">
            {avatarSrc ? (
              <img
                key={avatarSrc}
                src={avatarSrc}
                alt="Avatar Minecraft"
                onError={() =>
                  setAvatarCandidateIndex((current) =>
                    current < avatarCandidates.length ? current + 1 : current
                  )
                }
              />
            ) : (
              <PixelLogo />
            )}
          </div>
          <h2>{profile.displayName || "Player"}</h2>
          <p>{profile.minecraftUsername ? `@${profile.minecraftUsername}` : "@minecraft"}</p>
          <span>{profile.pronouns || copy(language, "pronomes", "pronouns")}</span>
        </div>

        <div className="settings-list">
          <h3>{copy(language, "Conta Helper", "Helper Account")}</h3>
          <div className="connect-row">
            <label>
              <span>Email Supabase</span>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
              />
            </label>
            <button onClick={signInSupabase}>
              <Shield size={16} /> Login
            </button>
          </div>
          <div className="connect-row">
            <label>
              <span>{copy(language, "Senha", "Password")}</span>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
              />
            </label>
            <button onClick={signUpSupabase}>
              <Plus size={16} /> {copy(language, "Criar", "Create")}
            </button>
          </div>
          <div className="action-row">
            <button disabled={!cloudUser} onClick={() => saveProfileToSupabase()}>
              <Save size={16} /> {copy(language, "Enviar nuvem", "Upload cloud")}
            </button>
            <button disabled={!cloudUser} onClick={() => loadProfileFromSupabase()}>
              <Download size={16} /> {copy(language, "Baixar nuvem", "Download cloud")}
            </button>
            <button disabled={!cloudUser} onClick={signOutSupabase}>
              <X size={16} /> {copy(language, "Sair", "Sign out")}
            </button>
          </div>
          <p className="muted">
            {cloudUser
              ? copy(
                  language,
                  `Conectado como ${cloudUser.email || cloudUser.id}`,
                  `Connected as ${cloudUser.email || cloudUser.id}`
                )
              : authStatus ||
                copy(
                  language,
                  "Use Supabase Auth para sincronizar perfil entre maquinas.",
                  "Use Supabase Auth to sync your profile across devices."
                )}
          </p>
          {authStatus && cloudUser && <p className="muted">{authStatus}</p>}

          <label>
            <span>{copy(language, "Nome de exibicao", "Display name")}</span>
            <input
              value={profile.displayName}
              onChange={(event) =>
                setProfile((current) => ({ ...current, displayName: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={profile.email}
              onChange={(event) =>
                setProfile((current) => ({ ...current, email: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Bio</span>
            <textarea
              value={profile.bio}
              onChange={(event) =>
                setProfile((current) => ({ ...current, bio: event.target.value }))
              }
            />
          </label>
          <label>
            <span>{copy(language, "Pronomes", "Pronouns")}</span>
            <input
              value={profile.pronouns}
              onChange={(event) =>
                setProfile((current) => ({ ...current, pronouns: event.target.value }))
              }
            />
          </label>
          <div className="connect-row">
            <label>
              <span>Username Minecraft</span>
              <input
                value={profile.minecraftUsername}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    minecraftUsername: event.target.value
                  }))
                }
              />
            </label>
            <button onClick={connectMinecraft}>
              <Search size={16} /> {copy(language, "Conectar", "Connect")}
            </button>
          </div>
          <div className="action-row">
            <button onClick={connectMicrosoftMinecraft}>
              <Shield size={16} /> Microsoft OAuth
            </button>
          </div>
          <p className="muted">
            {lookupStatus ||
              copy(
                language,
                "A busca por username usa API publica. O botao Microsoft OAuth usa Xbox Live/XSTS/Minecraft Services quando o Client ID esta configurado.",
                "Username lookup uses the public API. The Microsoft OAuth button uses Xbox Live/XSTS/Minecraft Services when the Client ID is configured."
              )}
          </p>
        </div>
      </div>
    </section>
  );
}

function SettingsPage({
  settings,
  setSettings,
  cloudConfig,
  setCloudConfig,
  language
}: {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  cloudConfig: CloudConfig;
  setCloudConfig: React.Dispatch<React.SetStateAction<CloudConfig>>;
  language: Language;
}) {
  const importRef = useRef<HTMLInputElement | null>(null);
  const [cloudStatus, setCloudStatus] = useState("");

  function exportBackup() {
    const payload = collectLocalBackupPayload();
    downloadTextFile(
      `every-helper-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2)
    );
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result)) as CloudBackupPayload;
        if (payload.app !== "Every Helper for Minecraft") {
          throw new Error(copy(language, "Arquivo nao e um backup do Every Helper.", "File is not an Every Helper backup."));
        }
        applyLocalBackupPayload(payload);
        location.reload();
      } catch {
        alert(copy(language, "Backup invalido.", "Invalid backup."));
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function connectDrive() {
    if (!window.everyHelper) {
      setCloudStatus(copy(language, "Abra no app Electron para conectar o Drive.", "Open the Electron app to connect Drive."));
      return;
    }
    setCloudStatus(copy(language, "Abrindo login Google...", "Opening Google login..."));
    const result = await window.everyHelper.connectGoogleDrive({
      clientId: cloudConfig.googleClientId.trim()
    });
    setCloudStatus(result.message);
    if (result.ok) {
      setSettings((current) => ({ ...current, driveSync: true }));
    }
  }

  async function backupToDrive() {
    if (!window.everyHelper) {
      setCloudStatus(copy(language, "Abra no app Electron para usar o Drive.", "Open the Electron app to use Drive."));
      return;
    }
    setCloudStatus(copy(language, "Enviando backup ao Drive...", "Uploading backup to Drive..."));
    const result = await window.everyHelper.uploadDriveBackup({
      clientId: cloudConfig.googleClientId.trim(),
      payload: collectLocalBackupPayload()
    });
    setCloudStatus(
      result.ok
        ? `${result.message} ${copy(language, "Arquivo", "File")}: ${result.fileName ?? result.fileId}`
        : result.message
    );
  }

  async function restoreFromDrive() {
    if (!window.everyHelper) {
      setCloudStatus(copy(language, "Abra no app Electron para usar o Drive.", "Open the Electron app to use Drive."));
      return;
    }
    setCloudStatus(copy(language, "Baixando backup do Drive...", "Downloading backup from Drive..."));
    const result = await window.everyHelper.restoreDriveBackup({
      clientId: cloudConfig.googleClientId.trim()
    });
    if (result.ok && result.payload) {
      applyLocalBackupPayload(result.payload);
      setCloudStatus(`${result.message} ${copy(language, "Reabrindo app...", "Reopening app...")}`);
      setTimeout(() => location.reload(), 600);
      return;
    }
    setCloudStatus(result.message);
  }

  return (
    <section className="workbench">
      <WorkbenchHeader
        eyebrow="Settings"
        title={t(language, "settings")}
        description={
          language === "pt-br"
            ? "Preferencias, idioma, backups locais e status das integracoes externas."
            : "Preferences, language, local backups and external integration status."
        }
      />
      <div className="settings-grid">
        <div className="settings-list">
          <h3>{t(language, "appearance")}</h3>
          <button
            className="segmented"
            onClick={() =>
              setSettings((current) => ({
                ...current,
                language: current.language === "pt-br" ? "en-us" : "pt-br"
              }))
            }
          >
            <Languages size={16} />
            {settings.language === "pt-br" ? "Português" : "English"}
          </button>
          <Toggle label="Dark mode" checked onChange={() => undefined} />
        </div>

        <div className="settings-list">
          <h3>{t(language, "integrations")}</h3>
          <label>
            <span>Supabase URL</span>
            <textarea
              className="credential-input"
              rows={2}
              spellCheck={false}
              value={cloudConfig.supabaseUrl}
              onChange={(event) =>
                setCloudConfig((current) => ({
                  ...current,
                  supabaseUrl: event.target.value
                }))
              }
              placeholder="https://xxxx.supabase.co"
            />
          </label>
          <label>
            <span>{copy(language, "Supabase anon key", "Supabase anon key")}</span>
            <textarea
              className="credential-input"
              rows={2}
              spellCheck={false}
              value={cloudConfig.supabaseAnonKey}
              onChange={(event) =>
                setCloudConfig((current) => ({
                  ...current,
                  supabaseAnonKey: event.target.value
                }))
              }
              placeholder="eyJ..."
            />
          </label>
          <label>
            <span>Google OAuth Client ID</span>
            <textarea
              className="credential-input"
              rows={2}
              spellCheck={false}
              value={cloudConfig.googleClientId}
              onChange={(event) =>
                setCloudConfig((current) => ({
                  ...current,
                  googleClientId: event.target.value
                }))
              }
              placeholder="...apps.googleusercontent.com"
            />
          </label>
          <label>
            <span>Microsoft OAuth Client ID</span>
            <textarea
              className="credential-input"
              rows={2}
              spellCheck={false}
              value={cloudConfig.microsoftClientId}
              onChange={(event) =>
                setCloudConfig((current) => ({
                  ...current,
                  microsoftClientId: event.target.value
                }))
              }
              placeholder={copy(language, "Client ID do Entra ID", "Entra ID Client ID")}
            />
          </label>
          <Toggle
            label={copy(language, "Sincronizacao Google Drive", "Google Drive sync")}
            checked={settings.driveSync}
            onChange={(checked) =>
              setSettings((current) => ({ ...current, driveSync: checked }))
            }
          />
          <Toggle
            label="Microsoft/Minecraft"
            checked={settings.microsoftLinked}
            onChange={(checked) =>
              setSettings((current) => ({
                ...current,
                microsoftLinked: checked
              }))
            }
          />
          <Toggle
            label="Supabase Auth"
            checked={settings.supabaseEnabled}
            onChange={(checked) =>
              setSettings((current) => ({ ...current, supabaseEnabled: checked }))
            }
          />
          <p className="muted">
            {copy(
              language,
              "Essas credenciais sao IDs/chaves publicas de app cliente. Nao cole service role, client secret ou senha aqui.",
              "These credentials are public client app IDs/keys. Do not paste a service role key, client secret or password here."
            )}
          </p>
        </div>

        <div className="settings-list">
          <h3>Backup</h3>
          <div className="action-row">
            <button onClick={exportBackup}>
              <Download size={16} /> {copy(language, "Backup local", "Local backup")}
            </button>
            <button onClick={() => importRef.current?.click()}>
              <Upload size={16} /> {copy(language, "Restaurar", "Restore")}
            </button>
            <button onClick={connectDrive}>
              <Globe2 size={16} /> {copy(language, "Conectar Drive", "Connect Drive")}
            </button>
            <button onClick={backupToDrive}>
              <Save size={16} /> Drive backup
            </button>
            <button onClick={restoreFromDrive}>
              <RotateCcw size={16} /> Drive restore
            </button>
            <input hidden ref={importRef} type="file" accept=".json" onChange={importBackup} />
          </div>
          <p className="muted">
            {copy(
              language,
              "O backup cobre skins, blueprints, perfil, mundos importados, modpacks e configuracoes salvas.",
              "Backup covers skins, blueprints, profile, imported worlds, modpacks and saved settings."
            )}{" "}
            {cloudStatus}
          </p>
        </div>
      </div>
    </section>
  );
}

function EmptyState({
  icon,
  title,
  text
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
