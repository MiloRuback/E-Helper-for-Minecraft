# Integracoes externas

Este app funciona offline por padrao. As integracoes abaixo usam apenas IDs/chaves publicas no cliente. Nunca cole `service_role`, `client_secret`, PAT, senha ou token privado nas configuracoes do app.

## Supabase

Ja configurado no app:

```text
URL: https://ctqgcnsfdvxtnkejeusd.supabase.co
Publishable key: sb_publishable_d-LcR34jekfPRJ-pwZFVzA_gvMHMGj6
```

Estado verificado:

- migrations aplicadas em `supabase/migrations/`;
- RLS habilitado nas tabelas de usuario;
- security advisors sem findings depois da migration de hardening;
- performance advisors podem listar indices como `unused_index` enquanto as tabelas ainda estiverem sem uso real.

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

Se a Microsoft negar o uso de `XboxLive.signin`, o app ainda tem plano B via API publica da Mojang: informar o username do Minecraft para carregar UUID/avatar sem OAuth.

## GitHub / Release

O workflow `.github/workflows/release.yml` cria a release quando uma tag `v*` e enviada. A versao atual e `v0.1.6`.

O repositorio `MiloRuback/E-Helper-for-Minecraft` esta privado. Enquanto continuar privado, links como `https://github.com/MiloRuback/E-Helper-for-Minecraft/releases/latest` retornam 404 para pessoas sem acesso. Para download publico no GitHub, torne o repositorio publico ou publique o asset em um repo publico.

Tambem ha uma copia do instalador no Google Drive em `Every Helper for Minecraft - Release`:

```text
Every-Helper-for-Minecraft-Setup-0.1.6.exe
https://drive.google.com/file/d/1uM2XGTbyK6KxLaEZW_PmW6Sw5q1Kevie/view?usp=drivesdk
```
