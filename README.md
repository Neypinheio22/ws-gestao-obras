# WS Gestão de Obras

App de vistorias e laudos técnicos (recebimento de imóvel e obra em andamento).

## Rodar localmente

1. `cp .env.example .env` e preencha com a URL e a chave pública do projeto Supabase.
2. Aplique `supabase/migrations/0001_perfis_e_aprovacao.sql` no banco.
3. `npm install` e `npm run dev`.

## Acesso

- Qualquer pessoa pode criar conta em `/cadastro`; a conta nasce **aguardando aprovação**.
- O administrador (e-mails em `public.admin_emails`) libera ou bloqueia contas em `/admin`.
- Só contas liberadas acessam o sistema; as regras são garantidas no banco (RLS), não só na tela.
