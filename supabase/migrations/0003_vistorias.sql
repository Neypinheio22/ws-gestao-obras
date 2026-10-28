-- Vistorias, ambientes (ou etapas da obra), itens do checklist e fotos.
-- Cada vistoriador vê só as próprias vistorias; o administrador vê todas.

create table public.vistorias (
  id                 uuid primary key default gen_random_uuid(),
  vistoriador_id     uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  tipo               text not null check (tipo in ('recebimento', 'andamento')),
  status             text not null default 'rascunho' check (status in ('rascunho', 'concluida')),
  numero             integer,                 -- nº da vistoria na obra (obra em andamento)
  data_vistoria      date not null default current_date,

  cliente_nome       text not null,
  cliente_telefone   text,
  cliente_email      text,
  endereco           text,
  cidade             text,
  unidade            text,                    -- condomínio / bloco / apartamento ou nome da obra
  area_m2            numeric(10, 2),
  construtora        text,
  responsavel_obra   text,

  descricao_edificacao text,
  sistemas_obs       text,                    -- ex.: "APT SEM ENERGIA"
  pressupostos_extra text,                    -- trecho variável dos pressupostos
  laudo_resumo       text,
  conclusao          text,
  grau_risco         text check (grau_risco in ('baixo', 'medio', 'critico')),
  avanco_previsto    numeric(5, 2),
  avanco_executado   numeric(5, 2),
  proxima_vistoria   text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.ambientes (
  id          uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references public.vistorias (id) on delete cascade,
  nome        text not null,
  ordem       integer not null default 0,
  situacao_etapa text,                        -- obra em andamento: nao_iniciada | em_execucao | concluida
  created_at  timestamptz not null default now()
);

create table public.itens (
  id          uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references public.vistorias (id) on delete cascade,
  ambiente_id uuid not null references public.ambientes (id) on delete cascade,
  descricao   text not null,
  ordem       integer not null default 0,
  -- recebimento: boa | regular | ruim ; andamento: conforme | nao_conforme | na | ne
  situacao    text,
  observacao  text,
  impacto     text,                           -- "por que é um problema"
  solucao     text,                           -- "o que deve ser feito"
  created_at  timestamptz not null default now()
);

create table public.fotos (
  id          uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references public.vistorias (id) on delete cascade,
  ambiente_id uuid not null references public.ambientes (id) on delete cascade,
  item_id     uuid references public.itens (id) on delete set null,
  path        text not null,
  legenda     text not null default '',
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);

create index on public.vistorias (vistoriador_id, created_at desc);
create index on public.ambientes (vistoria_id, ordem);
create index on public.itens (ambiente_id, ordem);
create index on public.fotos (ambiente_id, ordem);

create or replace function public.toca_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger vistorias_updated_at
  before update on public.vistorias
  for each row execute function public.toca_updated_at();

-- Dono da vistoria (aprovado) ou admin.
create or replace function public.pode_acessar_vistoria(v_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.vistorias v
    where v.id = v_id and v.vistoriador_id = auth.uid() and public.is_aprovado()
  );
$$;
revoke execute on function public.pode_acessar_vistoria(uuid) from public, anon;
grant execute on function public.pode_acessar_vistoria(uuid) to authenticated;
revoke execute on function public.toca_updated_at() from public, anon, authenticated;

alter table public.vistorias enable row level security;
alter table public.ambientes enable row level security;
alter table public.itens     enable row level security;
alter table public.fotos     enable row level security;

create policy "vistorias: ler" on public.vistorias for select to authenticated
  using ((vistoriador_id = auth.uid() and public.is_aprovado()) or public.is_admin());
create policy "vistorias: criar" on public.vistorias for insert to authenticated
  with check (vistoriador_id = auth.uid() and public.is_aprovado());
create policy "vistorias: editar" on public.vistorias for update to authenticated
  using ((vistoriador_id = auth.uid() and public.is_aprovado()) or public.is_admin())
  with check ((vistoriador_id = auth.uid() and public.is_aprovado()) or public.is_admin());
create policy "vistorias: apagar" on public.vistorias for delete to authenticated
  using ((vistoriador_id = auth.uid() and public.is_aprovado()) or public.is_admin());

create policy "ambientes: tudo" on public.ambientes for all to authenticated
  using (public.pode_acessar_vistoria(vistoria_id))
  with check (public.pode_acessar_vistoria(vistoria_id));
create policy "itens: tudo" on public.itens for all to authenticated
  using (public.pode_acessar_vistoria(vistoria_id))
  with check (public.pode_acessar_vistoria(vistoria_id));
create policy "fotos: tudo" on public.fotos for all to authenticated
  using (public.pode_acessar_vistoria(vistoria_id))
  with check (public.pode_acessar_vistoria(vistoria_id));

-- Fotos ficam num bucket privado, em pastas <vistoria_id>/<arquivo>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "fotos storage: ler" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.pode_acessar_vistoria(((storage.foldername(name))[1])::uuid));
create policy "fotos storage: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.pode_acessar_vistoria(((storage.foldername(name))[1])::uuid));
create policy "fotos storage: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.pode_acessar_vistoria(((storage.foldername(name))[1])::uuid));
