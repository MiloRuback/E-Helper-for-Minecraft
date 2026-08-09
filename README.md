# Every Helper for Minecraft

Aplicativo desktop para Windows feito com Electron, React, TypeScript e Vite. Esta entrega transforma as duas documentacoes em uma versao executavel para apresentacao escolar, com funcionamento local/offline como padrao e pontos de integracao preparados para Supabase, Google Drive e Microsoft/Minecraft.

[Download do instalador Windows](https://github.com/MiloRuback/E-Helper-for-Minecraft/releases/latest)

[English README](README.en.md)

## O que ja vem pronto

- Janela desktop sem borda, dark mode, layout responsivo e tamanho minimo 800x500.
- Onboarding inicial com conta local, idioma PT-BR/EN-US e preferencias.
- Editor de skins 64x64 com pincel, borracha, balde, conta-gotas, camadas base/overlay, simetria, undo/redo, templates Steve/Alex, importacao/exportacao PNG e preview 3D via `skinview3d`.
- Editor de blueprints com grade por camada Y, paleta de blocos, preview 3D via Three.js, exportacao/importacao `.every-blueprint.json`, exportacao Java Structure `.nbt`, exportacao Sponge/WorldEdit `.schem`, exportacao Litematica `.litematic` e importacao de `.litematic`, `.schem` e Java Structure `.nbt`.
- Seed Map offline com Cubiomes WASM, seed, versao, pan, zoom, coordenadas, biomas reais e marcadores de estrutura.
- Importador de mundos Java por pasta, leitura de `level.dat`, contagem de chunks em regioes `.mca`, amostragem de heightmaps/biomas e visualizacao por Overworld/Nether/End.
- Gerenciador de modpacks por pasta, listagem de `.jar`, configs, resourcepacks, shaderpacks e criacao de perfil isolado no Minecraft Launcher com backup do `launcher_profiles.json`.
- Perfil local com bio, pronomes e busca de avatar por username usando a API publica da Mojang.
- Configuracoes, backup/restauracao local em JSON e conexoes para Supabase/Drive/Microsoft.
- Build Windows com `electron-builder` e workflow de GitHub Releases.

## Integrações reais

- Supabase: o projeto `ctqgcnsfdvxtnkejeusd` recebeu as migrations em `supabase/migrations/`, com tabelas, RLS, indices de `user_id`, funcoes endurecidas e security advisors zerados. A URL e a publishable key ja ficam preenchidas no app.
- Google Drive: o app usa OAuth de desktop com PKCE e escopo `drive.file`, cria a pasta `Every Helper` no Drive do usuario e faz backup/restauracao JSON.
- Microsoft/Minecraft: o app usa OAuth Microsoft, Xbox Live, XSTS e Minecraft Services para obter UUID, username, skin e avatar quando o Client ID esta configurado.
- GitHub: o repo correto e `MiloRuback/E-Helper-for-Minecraft`, com workflow de release para gerar o instalador `.exe`.
- Auto-update: o app empacotado usa `electron-updater` para buscar novas versoes publicadas nas GitHub Releases.

## O que precisa de credenciais publicas

- Supabase Auth ja vem configurado com URL e publishable key publicas; falta apenas o usuario criar/entrar com email e senha.
- Google Drive precisa de um OAuth Client ID de tipo "Desktop app".
- Microsoft/Minecraft precisa de um Client ID do Microsoft Entra ID/consumers com redirect loopback permitido.

Nunca cole service role, client secret, senha ou token pessoal dentro do app.

Veja o passo a passo em `docs/INTEGRATIONS_SETUP.md`.

## Limites técnicos ainda explícitos

- A importacao de blueprint cobre `.litematic`, `.schem` e Java Structure `.nbt` via `@taku128/java-schematic`; a exportacao cobre `.every-blueprint.json`, Java Structure `.nbt`, Sponge/WorldEdit `.schem` e Litematica `.litematic`. O formato legado `.schematic` classico e rejeitado pelo conversor usado.

## Como rodar no PC

```bash
npm install
npm run dev
```

## Como gerar build

```bash
npm run build
```

## Como gerar o instalador `.exe`

```bash
npm run dist
```

O instalador NSIS sai em `release/` com assistente, instalacao por usuario, opcao de pasta e atalho na area de trabalho.

## Variaveis opcionais

Copie `.env.example` para `.env` quando tiver credenciais reais:

```bash
VITE_SUPABASE_URL=https://ctqgcnsfdvxtnkejeusd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_d-LcR34jekfPRJ-pwZFVzA_gvMHMGj6
VITE_GOOGLE_DRIVE_CLIENT_ID=
VITE_MICROSOFT_CLIENT_ID=
```

## Release no GitHub

Crie uma tag para disparar o workflow:

```bash
git tag v0.1.10
git push origin v0.1.10
```

O workflow `.github/workflows/release.yml` compila no Windows e publica o `.exe` como asset da release. O repositorio esta publico para evitar 404 no link de download.
