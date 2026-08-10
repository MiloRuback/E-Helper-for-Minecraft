# Integracoes externas

O app funciona offline por padrao. As integracoes usam somente IDs/chaves publicas de cliente no renderer. Nunca cole `service_role`, `client_secret`, PAT, senha ou token privado nas configuracoes do app, no README ou em arquivos versionados.

## Supabase

Uso no app:

- Auth por email/senha.
- `profiles` para dados do perfil.
- `user_skins` para a biblioteca cloud das skins recentes.
- `user_settings` para preferencias sincronizaveis.
- Tabelas preparadas para mundos, blueprints e modpacks.

Configuracao:

1. Crie um projeto Supabase.
2. Aplique as migrations em `supabase/migrations/`.
3. Use apenas a URL publica do projeto e a publishable key no app.
4. Mantenha RLS habilitado em todas as tabelas expostas.
5. Para producao, ative protecao contra senhas vazadas no painel de Auth do Supabase.

Estado esperado do banco:

- RLS habilitado.
- Policies por usuario usando `auth.uid()`.
- Indices por `user_id`.
- Indice de biblioteca em `user_skins(user_id, updated_at desc)`.

## Google Drive

O app implementa OAuth de desktop com PKCE, cria a pasta `Every Helper` e faz backup/restauracao JSON com escopo `drive.file`.

Para habilitar:

1. Crie um OAuth Client ID no Google Cloud Console.
2. Tipo do cliente: Desktop app.
3. Ative a Google Drive API no projeto.
4. Cole apenas o Client ID no campo `Google OAuth Client ID` das Configuracoes.

O redirect usa loopback local com porta dinamica:

```text
http://127.0.0.1:{porta}/oauth/callback
```

## Microsoft / Minecraft

O app implementa o fluxo Microsoft OAuth -> Xbox Live -> XSTS -> Minecraft Services.

Para habilitar:

1. Crie um app registration para contas Microsoft pessoais/consumers.
2. Habilite public client/native flow.
3. Garanta suporte a redirect loopback `http://127.0.0.1:{porta}/oauth/callback`.
4. Cole apenas o Application/Client ID no campo `Microsoft OAuth Client ID`.

O scope usado e:

```text
XboxLive.signin offline_access
```

Se a Microsoft negar o uso de `XboxLive.signin`, o app ainda consegue carregar UUID/avatar pela API publica da Mojang a partir do username.

## GitHub / Release

O workflow `.github/workflows/release.yml` cria releases quando uma tag `v*` e enviada. Cada release publica:

- instalador Development, com todos os modulos;
- instalador Stable, sem Blueprints e Modpacks.

Comandos:

```bash
npm run dist
npm run dist:stable
```

O link publico de download recomendado e:

```text
https://github.com/MiloRuback/E-Helper-for-Minecraft/releases/latest
```
