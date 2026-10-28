-- Perfis de usuário com aprovação pelo administrador.
-- Cada conta criada no app nasce "pendente" e só acessa o sistema depois que um admin aprova.

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  nome         text not null default '',
  telefone     text,
  registro     text,               -- ex.: CFT, CREA ou CAU do vistoriador
  role         text not null default 'vistoriador' check (role in ('admin', 'vistoriador')),
  status       text not null default 'pendente'   check (status in ('pendente', 'aprovado', 'bloqueado')),
  created_at   timestamptz not null default now(),
  aprovado_em  timestamptz,
  aprovado_por uuid references auth.users (id)
);

-- E-mails que já nascem como administradores aprovados.
create table public.admin_emails (
  email text primary key
);
alter table public.admin_emails enable row level security;
insert into public.admin_emails (email) values ('ney.comercial@gmail.com');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'aprovado'
  );
$$;

create or replace function public.is_aprovado()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'aprovado'
  );
$$;

-- Cria o perfil automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  eh_admin boolean;
begin
  select exists (select 1 from public.admin_emails where lower(email) = lower(new.email)) into eh_admin;

  insert into public.profiles (id, email, nome, telefone, registro, role, status, aprovado_em)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.raw_user_meta_data ->> 'telefone',
    new.raw_user_meta_data ->> 'registro',
    case when eh_admin then 'admin' else 'vistoriador' end,
    case when eh_admin then 'aprovado' else 'pendente' end,
    case when eh_admin then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Só admin pode mudar status e papel; registra quem aprovou.
create or replace function public.protege_campos_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status or new.role is distinct from old.role
      or new.email is distinct from old.email) then
    if not public.is_admin() then
      raise exception 'Somente o administrador pode alterar status, papel ou e-mail';
    end if;
    if new.id = auth.uid() and (new.status <> 'aprovado' or new.role <> 'admin') then
      raise exception 'O administrador não pode bloquear a própria conta';
    end if;
  end if;

  if new.status = 'aprovado' and old.status is distinct from 'aprovado' then
    new.aprovado_em := now();
    new.aprovado_por := auth.uid();
  end if;
  return new;
end;
$$;

create trigger protege_campos_perfil
  before update on public.profiles
  for each row execute function public.protege_campos_perfil();

alter table public.profiles enable row level security;

create policy "ver o próprio perfil ou admin vê todos"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "editar o próprio perfil ou admin edita todos"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
