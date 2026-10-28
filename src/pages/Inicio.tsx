import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Vistoria } from '../lib/vistorias'
import { formatarData } from '../lib/useVistoria'

type Linha = Pick<Vistoria, 'id' | 'tipo' | 'status' | 'cliente_nome' | 'unidade' | 'cidade' | 'data_vistoria'>

export default function Inicio() {
  const { profile, sair } = useAuth()
  const [vistorias, setVistorias] = useState<Linha[] | null>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    supabase
      .from('vistorias')
      .select('id, tipo, status, cliente_nome, unidade, cidade, data_vistoria')
      .order('data_vistoria', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro(error.message)
        else setVistorias(data as Linha[])
      })
  }, [])

  const termo = busca.trim().toLowerCase()
  const filtradas = (vistorias ?? []).filter(
    (v) => !termo || [v.cliente_nome, v.unidade, v.cidade].some((c) => c?.toLowerCase().includes(termo)),
  )

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <strong>WS Gestão de Obras</strong>
          <small>Olá, {profile?.nome || profile?.email}</small>
        </div>
        <div className="topo-acoes">
          <Link className="botao secundario pequeno" to="/perfil">Meu perfil</Link>
          {profile?.role === 'admin' && (
            <Link className="botao secundario pequeno" to="/admin">Usuários</Link>
          )}
          <button type="button" className="secundario pequeno" onClick={sair}>Sair</button>
        </div>
      </header>

      {profile && (!profile.registro || !profile.titulo_profissional) && (
        <Link className="aviso-amarelo" to="/perfil">
          Complete seu perfil técnico (título e registro) para que saiam em todos os laudos →
        </Link>
      )}

      <div className="grade-2">
        <Link className="cartao link-cartao destaque" to="/nova?tipo=recebimento">
          <strong>+ Recebimento de imóvel</strong>
          <span>Obra acabada, conferência</span>
        </Link>
        <Link className="cartao link-cartao destaque" to="/nova?tipo=andamento">
          <strong>+ Obra em andamento</strong>
          <span>Acompanhamento por etapa</span>
        </Link>
      </div>

      <section className="pilha">
        <h2>Vistorias</h2>
        {vistorias && vistorias.length > 3 && (
          <input placeholder="Buscar por cliente, unidade ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
        )}
        {erro && <p className="erro">{erro}</p>}
        {!vistorias && !erro && <p className="sutil">Carregando…</p>}
        {vistorias?.length === 0 && <p className="sutil">Nenhuma vistoria ainda. Comece pelos botões acima.</p>}
        <ul className="lista">
          {filtradas.map((v) => (
            <li key={v.id}>
              <Link className="linha-vistoria" to={`/vistoria/${v.id}`}>
                <div>
                  <strong>{v.cliente_nome}</strong>
                  <span>{[v.unidade, v.cidade].filter(Boolean).join(' · ') || 'Sem endereço'}</span>
                  <span>{formatarData(v.data_vistoria)} · {v.tipo === 'recebimento' ? 'Recebimento' : 'Obra em andamento'}</span>
                </div>
                <span className={`selo ${v.status === 'concluida' ? 'selo-aprovado' : 'selo-pendente'}`}>
                  {v.status === 'concluida' ? 'Concluída' : 'Rascunho'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
