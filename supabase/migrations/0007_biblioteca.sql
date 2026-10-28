-- O vistoriador monta o laudo escolhendo: itens testados e constatações técnicas vêm de uma
-- biblioteca (padrão no app + itens próprios salvos aqui).
alter table public.vistorias
  add column if not exists conclusoes_tecnicas jsonb not null default '[]'::jsonb,
  add column if not exists incluir_resumo boolean not null default false;

alter table public.itens add column if not exists sistema text;

create table if not exists public.biblioteca (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('item', 'conclusao')),
  sistema text not null default 'Meus itens',
  texto text not null check (length(trim(texto)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists biblioteca_dono_idx on public.biblioteca (dono);

alter table public.biblioteca enable row level security;

create policy "biblioteca: dono aprovado lê" on public.biblioteca
  for select to authenticated using (dono = (select auth.uid()) and public.is_aprovado());
create policy "biblioteca: dono aprovado cria" on public.biblioteca
  for insert to authenticated with check (dono = (select auth.uid()) and public.is_aprovado());
create policy "biblioteca: dono aprovado altera" on public.biblioteca
  for update to authenticated using (dono = (select auth.uid()) and public.is_aprovado())
  with check (dono = (select auth.uid()));
create policy "biblioteca: dono aprovado apaga" on public.biblioteca
  for delete to authenticated using (dono = (select auth.uid()) and public.is_aprovado());
