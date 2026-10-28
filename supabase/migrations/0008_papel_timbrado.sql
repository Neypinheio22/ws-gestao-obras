-- Papel timbrado do laudo: logo (imagem pequena em data URL) e contatos que saem no topo das páginas.
alter table public.profiles
  add column if not exists logo text,
  add column if not exists email_contato text,
  add column if not exists contato_extra text;
alter table public.profiles drop constraint if exists profiles_logo_tamanho;
alter table public.profiles add constraint profiles_logo_tamanho check (logo is null or length(logo) < 400000);
