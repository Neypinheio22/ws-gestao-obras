import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type Profile, type Status } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const ROTULO: Record<Status, string> = {
  pendente: 'Aguardando',
  aprovado: 'Liberado',
  bloqueado: 'Bloqueado',
}

export default function Admin() {
  const { profile: eu } = useAuth()
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (error) setErro(error.message)
    else setUsuarios(data as Profile[])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function mudarStatus(id: string, status: Status) {
    setErro('')
    setSalvando(id)
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
    setSalvando(null)
    if (error) setErro(error.message)
    else carregar()
  }

  const pendentes = usuarios.filter((u) => u.status === 'pendente')
  const demais = usuarios.filter((u) => u.status !== 'pendente')

  function Linha({ u }: { u: Profile }) {
    const souEu = u.id === eu?.id
    return (
      <li className="usuario">
        <div className="usuario-info">
          <strong>{u.nome || '(sem nome)'}</strong>
          <span>{u.email}</span>
          {(u.telefone || u.registro) && (
            <span>{[u.telefone, u.registro].filter(Boolean).join(' · ')}</span>
          )}
          <span className={`selo selo-${u.status}`}>
            {ROTULO[u.status]}{u.role === 'admin' ? ' · Admin' : ''}
          </span>
        </div>
        {!souEu && (
          <div className="usuario-acoes">
            {u.status !== 'aprovado' && (
              <button type="button" disabled={salvando === u.id} onClick={() => mudarStatus(u.id, 'aprovado')}>
                Liberar
              </button>
            )}
            {u.status !== 'bloqueado' && (
              <button type="button" className="perigo" disabled={salvando === u.id} onClick={() => mudarStatus(u.id, 'bloqueado')}>
                Bloquear
              </button>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <Link to="/">← Início</Link>
          <strong>Usuários</strong>
        </div>
        <button type="button" className="secundario pequeno" onClick={carregar}>Atualizar</button>
      </header>

      {erro && <p className="erro">{erro}</p>}

      <section>
        <h2>Aguardando liberação ({pendentes.length})</h2>
        {pendentes.length === 0 ? <p className="sutil">Nenhum cadastro novo.</p> : (
          <ul className="lista">{pendentes.map((u) => <Linha key={u.id} u={u} />)}</ul>
        )}
      </section>

      <section>
        <h2>Todos os usuários</h2>
        <ul className="lista">{demais.map((u) => <Linha key={u.id} u={u} />)}</ul>
      </section>
    </main>
  )
}
