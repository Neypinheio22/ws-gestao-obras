-- Permite ajustes feitos direto no painel/SQL (sem usuário logado), ex.: corrigir um admin.
create or replace function public.protege_campos_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

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

-- Funções de gatilho não devem ser chamadas pela API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protege_campos_perfil() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_aprovado() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_aprovado() to authenticated;
