# QA / UX Checklist

Use esta lista antes de apresentar ou publicar uma release.

- [x] Build de producao conclui sem erro.
- [x] Dark mode consistente em todas as telas.
- [x] Navegacao lateral funciona em janela pequena.
- [x] Onboarding nao bloqueia uso offline.
- [x] Editor de skins importa/exporta PNG e oferece undo/redo.
- [x] Preview 3D de skin e blueprint usa WebGL.
- [x] Seed Map usa Cubiomes WASM, permite pan, zoom e busca por coordenadas.
- [x] Importador de mundo nao altera arquivos do save.
- [x] Gerenciador de modpack faz backup antes de alterar `launcher_profiles.json`.
- [x] Configuracoes exportam/restauram backup local.
- [x] App empacotado consulta GitHub Releases via `electron-updater`.
- [x] Supabase schema aplicado com RLS no projeto conectado.
- [x] Supabase URL e publishable key publicas configuradas no app e em `.env.example`.
- [x] Supabase security advisors sem findings apos migration de hardening.
- [x] UI possui login/cadastro Supabase e sync de perfil/settings.
- [x] Google Drive OAuth/backup/restore implementado no main process.
- [x] Microsoft/Xbox/Minecraft OAuth implementado no main process.
- [x] Importador de mundos amostra chunks `.mca` para heightmaps e biomas quando esses dados existem no save.
- [x] Importacao real de `.litematic`, `.schem` e `.nbt` Java Structure via conversor.
- [x] Exportacao de blueprint em Java Structure `.nbt` validada por round-trip NBT.
- [x] Cubiomes WASM validado no preview com status ativo, hover e canvas nao vazio.
- [x] QA visual Playwright desktop/mobile sem overflow em 16 combinacoes de tela/pagina.
- [x] QA dirigida do World Importer com dados simulados de bioma/heightmap no mobile.
- [x] Smoke test do executavel empacotado.
- [ ] Testar instalador em uma maquina Windows limpa.
- [ ] Testar Supabase Auth com uma conta real de usuario.
- [ ] Testar Drive/Microsoft com Client IDs reais.
- [ ] Testar com mundo Minecraft real grande.
- [ ] Testar com pasta real de modpack Forge/Fabric.
- [ ] Adicionar suporte legado `.schematic` se isso for indispensavel.
