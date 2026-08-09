# QA / UX Checklist

Use esta lista antes de apresentar ou publicar uma release.

- [x] Build de producao conclui sem erro.
- [x] Dark mode consistente em todas as telas.
- [x] Navegacao lateral funciona em janela pequena.
- [x] Onboarding nao bloqueia uso offline.
- [x] Editor de skins importa/exporta PNG e oferece undo/redo.
- [x] Preview 3D de skin e blueprint usa WebGL.
- [x] Seed Map permite pan, zoom e busca por coordenadas.
- [x] Importador de mundo nao altera arquivos do save.
- [x] Gerenciador de modpack faz backup antes de alterar `launcher_profiles.json`.
- [x] Configuracoes exportam/restauram backup local.
- [x] Supabase schema aplicado com RLS no projeto conectado.
- [x] UI possui login/cadastro Supabase e sync de perfil/settings.
- [x] Google Drive OAuth/backup/restore implementado no main process.
- [x] Microsoft/Xbox/Minecraft OAuth implementado no main process.
- [x] Importacao real de `.litematic`, `.schem` e `.nbt` Java Structure via conversor.
- [x] QA visual Playwright desktop/mobile sem overflow.
- [x] Smoke test do executavel empacotado.
- [ ] Testar instalador em uma maquina Windows limpa.
- [ ] Testar Supabase Auth com anon key real colada no app.
- [ ] Testar Drive/Microsoft com Client IDs reais.
- [ ] Testar com mundo Minecraft real grande.
- [ ] Testar com pasta real de modpack Forge/Fabric.
- [ ] Substituir Seed Map demonstrativo por Cubiomes WASM para precisao exata.
- [ ] Adicionar suporte legado `.schematic` se isso for indispensavel.
