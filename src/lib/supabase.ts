import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// PKCE: o link de confirmação volta com ?code= na URL, sem conflitar com as rotas em #/
export const supabase = createClient(url, anonKey, { auth: { flowType: 'pkce' } })

export type Status = 'pendente' | 'aprovado' | 'bloqueado'
export type Role = 'admin' | 'vistoriador'

export interface Profile {
  id: string
  email: string
  nome: string
  telefone: string | null
  registro: string | null
  titulo_profissional: string | null
  conselho: string | null
  cidade_base: string | null
  cabecalho: string | null
  role: Role
  status: Status
  created_at: string
  aprovado_em: string | null
}
