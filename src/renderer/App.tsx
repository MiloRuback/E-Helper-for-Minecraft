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
import type {
  CloudBackupPayload,
  DimensionSummary,
  LauncherProfileResult,
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

const biomePalette = [
  { id: "plains", label: "Plains", color: "#7abf4b" },
  { id: "forest", label: "Forest", color: "#2f7f46" },
  { id: "desert", label: "Desert", color: "#d7c36a" },
  { id: "snow", label: "Snowy Taiga", color: "#dbeefa" },
  { id: "ocean", label: "Ocean", color: "#2871b8" },
  { id: "swamp", label: "Swamp", color: "#4f6942" },
  { id: "badlands", label: "Badlands", color: "#b65f36" },
  { id: "jungle", label: "Jungle", color: "#1f8f4a" }
];

const minecraftVersions = [
  "1.21.8",
  "1.21",
  "1.20.6",
  "1.20.1",
  "1.19.4",
  "1.18.2",
  "1.17.1",
  "1.16.5",
  "1.12.2",
  "1.8.9"
];

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

function seedHash(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cellNoise(seed: number, x: number, z: number) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function biomeAt(seed: string, version: string, x: number, z: number) {
  const base = seedHash(`${seed}:${version}`);
  const low = cellNoise(base, Math.floor(x / 4), Math.floor(z / 4));
  const high = cellNoise(base ^ 0x9e3779b9, Math.floor(x / 16), Math.floor(z / 16));
  const index = Math.floor(((low * 0.72 + high * 0.28) % 1) * biomePalette.length);
  return biomePalette[index];
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
        <aside className="sidebar" aria-label="Navegacao principal">
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
          title="Minimizar"
          onClick={() => window.everyHelper?.window.minimize()}
        >
          <Minimize2 size={15} />
        </button>
        <button
          title="Maximizar"
          onClick={() => window.everyHelper?.window.maximize()}
        >
          <Maximize2 size={15} />
        </button>
        <button title="Fechar" onClick={() => window.everyHelper?.window.close()}>
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
          <span>{settings.driveSync ? "Drive marcado" : "Drive opcional"}</span>
        </div>
      </div>

      <div className="metric-strip">
        <Metric label="Módulos" value="7" />
        <Metric label="Idiomas" value="PT/EN" />
        <Metric label="Janela mínima" value="800x500" />
        <Metric label="Instalador" value="NSIS" />
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
            <span>Nome</span>
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
        <IconButton active={tool === "brush"} label="Pincel" onClick={() => setTool("brush")}>
          <Brush size={17} />
        </IconButton>
        <IconButton active={tool === "eraser"} label="Borracha" onClick={() => setTool("eraser")}>
          <Eraser size={17} />
        </IconButton>
        <IconButton active={tool === "fill"} label="Balde" onClick={() => setTool("fill")}>
          <PaintBucket size={17} />
        </IconButton>
        <IconButton active={tool === "picker"} label="Conta-gotas" onClick={() => setTool("picker")}>
          <Pipette size={17} />
        </IconButton>
        <input
          className="color-input"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label="Cor"
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
        <Toggle label="Simetria" checked={symmetry} onChange={setSymmetry} />
      </div>

      <div className="skin-layout">
        <div className="tool-panel">
          <h3>Camadas</h3>
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

          <h3>Modelo</h3>
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
            <Upload size={16} /> Importar PNG
          </button>
          <button className="text-button" onClick={exportSkin}>
            <Download size={16} /> Exportar PNG
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

        <SkinPreview skinUrl={mergedUrl} model={skin.model} />
      </div>
    </section>
  );
}

function SkinPreview({
  skinUrl,
  model
}: {
  skinUrl: string;
  model: SkinModel;
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
      <p>Arraste para girar. Scroll aproxima o modelo.</p>
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
      alert("Exportacao NBT funciona dentro do app Electron.");
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

  function importBlueprint(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (file.name.endsWith(".json") || file.name.endsWith(".blueprint")) {
          const parsed = JSON.parse(String(reader.result));
          const next = parsed.blueprint ?? parsed;
          if (!next?.blocks || !next?.size) throw new Error("Formato invalido.");
          setBlueprint(next);
        } else {
          if (!window.everyHelper) {
            throw new Error("Conversao NBT funciona dentro do app Electron.");
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
          "Nao foi possivel importar. Suportado: .every-blueprint.json, .litematic, .schem e .nbt Java Structure."
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
          Nome
          <input
            value={blueprint.name}
            onChange={(event) =>
              setBlueprint((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label className="inline-input">
          Camada Y
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
          <Upload size={16} /> Importar
        </button>
        <button onClick={exportBlueprint}>
          <Download size={16} /> Exportar JSON
        </button>
        <button onClick={exportBlueprintNbt}>
          <Download size={16} /> Exportar NBT
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
          <h3>Resumo</h3>
          <Stat label="Blocos" value={String(blueprint.blocks.length)} />
          <Stat
            label="Tamanho"
            value={`${blueprint.size.x} x ${blueprint.size.y} x ${blueprint.size.z}`}
          />
          <Stat label="Tipo ativo" value={blockLabels[selectedBlock]} />
          <button
            className="text-button danger"
            onClick={() => setBlueprint((current) => ({ ...current, blocks: [] }))}
          >
            <Trash2 size={16} /> Limpar
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

function SeedMapPage({ language }: { language: Language }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [seed, setSeed] = useState("MiloRuback");
  const [version, setVersion] = useState("1.21.8");
  const [zoom, setZoom] = useState(1.5);
  const [offset, setOffset] = useState({ x: 0, z: 0 });
  const [target, setTarget] = useState({ x: 0, z: 0 });
  const [hover, setHover] = useState<{ x: number; z: number; biome: string } | null>(
    null
  );
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetZ: number } | null>(
    null
  );

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
    ctx.fillStyle = "#101722";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const tile = 22 * zoom;
    const startX = Math.floor((-rect.width / 2 - offset.x) / tile) - 2;
    const endX = Math.ceil((rect.width / 2 - offset.x) / tile) + 2;
    const startZ = Math.floor((-rect.height / 2 - offset.z) / tile) - 2;
    const endZ = Math.ceil((rect.height / 2 - offset.z) / tile) + 2;

    for (let z = startZ; z <= endZ; z += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const biome = biomeAt(seed, version, x, z);
        ctx.fillStyle = biome.color;
        const px = rect.width / 2 + offset.x + x * tile;
        const py = rect.height / 2 + offset.z + z * tile;
        ctx.fillRect(px, py, tile + 1, tile + 1);

        const structureNoise = cellNoise(seedHash(seed), x * 9, z * 9);
        if (structureNoise > 0.985) {
          ctx.fillStyle = "#f2c94c";
          ctx.fillRect(px + tile * 0.35, py + tile * 0.35, tile * 0.3, tile * 0.3);
        }
      }
    }

    ctx.strokeStyle = "rgba(232, 232, 232, 0.18)";
    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x += 4) {
      const px = rect.width / 2 + offset.x + x * tile;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, rect.height);
      ctx.stroke();
    }
    for (let z = startZ; z <= endZ; z += 4) {
      const py = rect.height / 2 + offset.z + z * tile;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(rect.width, py);
      ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(rect.width / 2 - 5, rect.height / 2 - 5, 10, 10);
    ctx.strokeStyle = "#101722";
    ctx.strokeRect(rect.width / 2 - 5, rect.height / 2 - 5, 10, 10);
  }, [offset, seed, version, zoom]);

  useEffect(() => {
    draw();
  }, [draw]);

  function locate() {
    setOffset({
      x: -target.x * 22 * zoom,
      z: -target.z * 22 * zoom
    });
  }

  function mapCoordinates(event: ReactMouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const tile = 22 * zoom;
    const x = Math.floor((event.clientX - rect.left - rect.width / 2 - offset.x) / tile);
    const z = Math.floor((event.clientY - rect.top - rect.height / 2 - offset.z) / tile);
    const biome = biomeAt(seed, version, x, z);
    setHover({ x: x * 16, z: z * 16, biome: biome.label });
  }

  return (
    <section className="workbench">
      <WorkbenchHeader
        eyebrow="Seed Map"
        title={t(language, "seed")}
        description={
          language === "pt-br"
            ? "Mapa offline deterministico com pan, zoom, busca por coordenadas e biomas coloridos."
            : "Deterministic offline map with pan, zoom, coordinate search and colored biomes."
        }
      />
      <div className="toolbar">
        <label className="inline-input">
          Seed
          <input value={seed} onChange={(event) => setSeed(event.target.value)} />
        </label>
        <label className="inline-input">
          Versão
          <select value={version} onChange={(event) => setVersion(event.target.value)}>
            {minecraftVersions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
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
          <LocateFixed size={16} /> Ir
        </button>
      </div>
      <div className="map-shell">
        <canvas
          ref={canvasRef}
          className="seed-canvas"
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
            setOffset({
              x: dragRef.current.offsetX + event.clientX - dragRef.current.x,
              z: dragRef.current.offsetZ + event.clientY - dragRef.current.y
            });
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onWheel={(event) => {
            event.preventDefault();
            setZoom((current) =>
              Math.max(0.6, Math.min(4, current + (event.deltaY < 0 ? 0.15 : -0.15)))
            );
          }}
        />
        <div className="map-hud">
          {hover ? `${hover.biome} | X ${hover.x}, Z ${hover.z}` : "Passe o mouse no mapa"}
        </div>
      </div>
      <div className="legend">
        {biomePalette.map((biome) => (
          <span key={biome.id}>
            <i style={{ background: biome.color }} />
            {biome.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function WorldImporter({ language }: { language: Language }) {
  const [world, setWorld] = usePersistentState<WorldSummary | null>("ehm:world", null);
  const [dimensionKey, setDimensionKey] = useState("overworld");
  const [target, setTarget] = useState({ x: 0, z: 0 });

  async function selectWorld() {
    if (!window.everyHelper) {
      alert("A importacao de pastas funciona dentro do app Electron.");
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
          <FolderOpen size={16} /> Selecionar mundo
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
          title="Nenhum mundo importado"
          text="Escolha a pasta de um save do Minecraft Java para analisar regioes, chunks e metadata."
        />
      ) : (
        <div className="world-layout">
          <div className="tool-panel">
            <h3>{world.name}</h3>
            <Stat label="Seed" value={world.seed ?? "Nao encontrada"} />
            <Stat label="Modo" value={world.gameMode ?? "Nao encontrado"} />
            <Stat
              label="Spawn"
              value={
                world.spawn?.x !== undefined
                  ? `${world.spawn.x}, ${world.spawn.y}, ${world.spawn.z}`
                  : "Nao encontrado"
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
            <h3>Região alvo</h3>
            {selectedRegion ? (
              <>
                <Stat label="Arquivo" value={selectedRegion.fileName} />
                <Stat label="Chunks" value={String(selectedRegion.chunks)} />
                <Stat
                  label="Amostras"
                  value={String(selectedRegion.sampledChunks ?? 0)}
                />
                <Stat
                  label="Bioma"
                  value={formatBiomeName(selectedRegion.topBiomes?.[0]?.id)}
                />
                <Stat
                  label="Altura media"
                  value={
                    selectedRegion.averageHeight !== undefined
                      ? String(selectedRegion.averageHeight)
                      : "Sem heightmap"
                  }
                />
                <Stat
                  label="Relevo"
                  value={
                    selectedRegion.minHeight !== undefined &&
                    selectedRegion.maxHeight !== undefined
                      ? `${selectedRegion.minHeight} - ${selectedRegion.maxHeight}`
                      : "Sem dados"
                  }
                />
                <Stat label="Alterado" value={readableDate(selectedRegion.lastModified)} />
              </>
            ) : (
              <p className="muted">Nenhuma região carregada para estas coordenadas.</p>
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
  const [lastResult, setLastResult] = useState<LauncherProfileResult | null>(null);

  async function importFolder() {
    if (!window.everyHelper) {
      alert("A selecao de pasta funciona dentro do app Electron.");
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
          <h3>Novo modpack</h3>
          <label>
            <span>Nome</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>Versão</span>
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
            <span>Descrição</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button className="text-button" onClick={importFolder}>
            <FolderOpen size={16} /> Selecionar pasta
          </button>
          <button className="primary" disabled={!pendingFolder?.ok} onClick={addPack}>
            <Plus size={16} /> Adicionar
          </button>
          {pendingFolder?.ok && (
            <div className="folder-summary">
              <Stat label="Mods" value={String(pendingFolder.mods?.length ?? 0)} />
              <Stat label="Arquivos" value={String(pendingFolder.acceptedFiles ?? 0)} />
              <Stat label="Tamanho" value={`${pendingFolder.totalSizeMb ?? 0} MB`} />
            </div>
          )}
        </div>

        <div className="pack-list">
          {packs.length === 0 ? (
            <EmptyState
              icon={<FileArchive size={32} />}
              title="Nenhum modpack"
              text="Importe uma pasta que tenha mods, configs, resourcepacks ou saves."
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
                  <summary>Mods detectados</summary>
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
                    <Download size={16} /> Exportar
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

  async function connectMinecraft() {
    const username = profile.minecraftUsername.trim();
    if (!username) return;
    setLookupStatus("Buscando perfil publico...");
    try {
      const response = await fetch(
        `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`
      );
      if (!response.ok) throw new Error("Username nao encontrado.");
      const data = (await response.json()) as { id: string; name: string };
      setProfile((current) => ({
        ...current,
        minecraftUsername: data.name,
        minecraftUuid: data.id,
        avatarUrl: `https://crafatar.com/avatars/${data.id}?size=128&overlay`
      }));
      setLookupStatus("Perfil conectado pela API publica.");
    } catch (error) {
      setLookupStatus(error instanceof Error ? error.message : "Falha ao buscar.");
    }
  }

  async function signUpSupabase() {
    if (!supabase) {
      setAuthStatus("Configure URL e anon key do Supabase em Configuracoes.");
      return;
    }
    setAuthStatus("Criando conta no Supabase...");
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
    setAuthStatus("Conta criada. Se o email exigir confirmacao, confirme antes de logar.");
  }

  async function signInSupabase() {
    if (!supabase) {
      setAuthStatus("Configure URL e anon key do Supabase em Configuracoes.");
      return;
    }
    setAuthStatus("Entrando no Supabase...");
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
    setAuthStatus("Login concluido e perfil sincronizado.");
  }

  async function signOutSupabase() {
    await supabase?.auth.signOut();
    setCloudUser(null);
    setAuthStatus("Sessao Supabase encerrada.");
  }

  async function saveProfileToSupabase(userOverride?: SupabaseUser) {
    if (!supabase) {
      setAuthStatus("Supabase nao configurado.");
      return;
    }
    const user =
      userOverride ??
      (await supabase.auth.getUser()).data.user ??
      (cloudUser ? ({ id: cloudUser.id, email: cloudUser.email } as SupabaseUser) : null);
    if (!user) {
      setAuthStatus("Faca login no Supabase antes de sincronizar.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: profile.displayName || "Player",
      bio: profile.bio,
      pronouns: profile.pronouns,
      minecraft_username: profile.minecraftUsername,
      minecraft_uuid: profile.minecraftUuid,
      microsoft_gamertag: profile.minecraftUsername,
      avatar_head_url: profile.avatarUrl
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
    setAuthStatus(error ? error.message : "Perfil e configuracoes enviados ao Supabase.");
  }

  async function loadProfileFromSupabase(userOverride?: SupabaseUser) {
    if (!supabase) {
      setAuthStatus("Supabase nao configurado.");
      return;
    }
    const user =
      userOverride ??
      (await supabase.auth.getUser()).data.user ??
      (cloudUser ? ({ id: cloudUser.id, email: cloudUser.email } as SupabaseUser) : null);
    if (!user) {
      setAuthStatus("Faca login no Supabase antes de baixar o perfil.");
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
      setProfile((current) => ({
        ...current,
        displayName: data.display_name ?? current.displayName,
        email: user.email ?? current.email,
        bio: data.bio ?? "",
        pronouns: data.pronouns ?? "",
        minecraftUsername: data.minecraft_username ?? "",
        minecraftUuid: data.minecraft_uuid ?? "",
        avatarUrl: data.avatar_head_url ?? ""
      }));
      setAuthStatus("Perfil baixado do Supabase.");
    }
  }

  async function connectMicrosoftMinecraft() {
    if (!window.everyHelper) {
      setLookupStatus("Abra no app Electron para conectar Microsoft.");
      return;
    }
    if (!cloudConfig.microsoftClientId.trim()) {
      setLookupStatus("Informe o Microsoft Client ID em Configuracoes.");
      return;
    }
    setLookupStatus("Abrindo login Microsoft...");
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
      avatarUrl: result.avatarUrl ?? current.avatarUrl
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
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar Minecraft" />
            ) : (
              <PixelLogo />
            )}
          </div>
          <h2>{profile.displayName || "Player"}</h2>
          <p>{profile.minecraftUsername ? `@${profile.minecraftUsername}` : "@minecraft"}</p>
          <span>{profile.pronouns || "pronomes"}</span>
        </div>

        <div className="settings-list">
          <h3>Conta Helper</h3>
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
              <span>Senha</span>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
              />
            </label>
            <button onClick={signUpSupabase}>
              <Plus size={16} /> Criar
            </button>
          </div>
          <div className="action-row">
            <button disabled={!cloudUser} onClick={() => saveProfileToSupabase()}>
              <Save size={16} /> Enviar nuvem
            </button>
            <button disabled={!cloudUser} onClick={() => loadProfileFromSupabase()}>
              <Download size={16} /> Baixar nuvem
            </button>
            <button disabled={!cloudUser} onClick={signOutSupabase}>
              <X size={16} /> Sair
            </button>
          </div>
          <p className="muted">
            {cloudUser
              ? `Conectado como ${cloudUser.email || cloudUser.id}`
              : authStatus || "Use Supabase Auth para sincronizar perfil entre maquinas."}
          </p>
          {authStatus && cloudUser && <p className="muted">{authStatus}</p>}

          <label>
            <span>Nome de exibição</span>
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
            <span>Pronomes</span>
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
              <Search size={16} /> Conectar
            </button>
          </div>
          <div className="action-row">
            <button onClick={connectMicrosoftMinecraft}>
              <Shield size={16} /> Microsoft OAuth
            </button>
          </div>
          <p className="muted">
            {lookupStatus ||
              "A busca por username usa API publica. O botao Microsoft OAuth usa Xbox Live/XSTS/Minecraft Services quando o Client ID esta configurado."}
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
          throw new Error("Arquivo nao e um backup do Every Helper.");
        }
        applyLocalBackupPayload(payload);
        location.reload();
      } catch {
        alert("Backup invalido.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function connectDrive() {
    if (!window.everyHelper) {
      setCloudStatus("Abra no app Electron para conectar o Drive.");
      return;
    }
    setCloudStatus("Abrindo login Google...");
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
      setCloudStatus("Abra no app Electron para usar o Drive.");
      return;
    }
    setCloudStatus("Enviando backup ao Drive...");
    const result = await window.everyHelper.uploadDriveBackup({
      clientId: cloudConfig.googleClientId.trim(),
      payload: collectLocalBackupPayload()
    });
    setCloudStatus(
      result.ok
        ? `${result.message} Arquivo: ${result.fileName ?? result.fileId}`
        : result.message
    );
  }

  async function restoreFromDrive() {
    if (!window.everyHelper) {
      setCloudStatus("Abra no app Electron para usar o Drive.");
      return;
    }
    setCloudStatus("Baixando backup do Drive...");
    const result = await window.everyHelper.restoreDriveBackup({
      clientId: cloudConfig.googleClientId.trim()
    });
    if (result.ok && result.payload) {
      applyLocalBackupPayload(result.payload);
      setCloudStatus(`${result.message} Reabrindo app...`);
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
            <span>Supabase anon key</span>
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
              placeholder="Client ID do Entra ID"
            />
          </label>
          <Toggle
            label="Google Drive sync"
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
            Essas credenciais sao IDs/chaves publicas de app cliente. Nao cole service
            role, client secret ou senha aqui.
          </p>
        </div>

        <div className="settings-list">
          <h3>Backup</h3>
          <div className="action-row">
            <button onClick={exportBackup}>
              <Download size={16} /> Backup local
            </button>
            <button onClick={() => importRef.current?.click()}>
              <Upload size={16} /> Restaurar
            </button>
            <button onClick={connectDrive}>
              <Globe2 size={16} /> Conectar Drive
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
            O backup cobre skins, blueprints, perfil, mundos importados, modpacks e
            configuracoes salvas. {cloudStatus}
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
