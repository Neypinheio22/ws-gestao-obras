import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, anonKey)

export type Status = 'pendente' | 'aprovado' | 'bloqueado'
export type Role = 'admin' | 'vistoriador'

export interface Profile {
  id: string
  email: string
  nome: string
  telefone: string | null
  registro: string | null
  role: Role
  status: Status
  created_at: string
  aprovado_em: string | null
}
