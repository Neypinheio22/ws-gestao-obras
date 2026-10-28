// Traduz as mensagens do Supabase que aparecem para o usuário.
export function mensagemErro(msg: string): string {
  if (msg === 'Invalid login credentials') return 'E-mail ou senha incorretos.'
  if (msg === 'Email not confirmed') return 'Confirme seu e-mail antes de entrar (veja a caixa de entrada).'
  if (msg === 'User already registered') return 'Já existe uma conta com esse e-mail.'
  if (msg === 'Failed to fetch') return 'Sem conexão com o servidor. Verifique a internet e tente de novo.'
  if (msg.startsWith('Password should be')) return 'A senha é muito fraca. Use pelo menos 8 caracteres.'
  return msg
}
