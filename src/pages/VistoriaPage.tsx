import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CamposDados from '../components/CamposDados'
import { ETAPAS_ANDAMENTO, TIPOS_AMBIENTE } from '../lib/modelos'
import { formatarData, useVistoria } from '../lib/useVistoria'
import { adicionarAmbiente, apagarVistoria, itensSugeridos, salvarVistoria, type Vistoria } from '../lib/vistorias'
import { limparCampos } from './NovaVistoria'

export default function VistoriaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dados, setDados, erro, setErro, recarregar } = useVistoria(id)
  const [editando, setEditando] = useState(false)
  const [novoTipo, setNovoTipo] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [adicionando, setAdicionando] = useState(false)

  if (erro) return <main className="pagina"><Link to="/">← Início</Link><p className="erro">{erro}</p></main>
  if (!dados) return <div className="centro">Carregando…</div>

  const { vistoria: v, ambientes, itens, fotos } = dados
  const obra = v.tipo === 'andamento'
  const opcoesTipo = obra ? ETAPAS_ANDAMENTO.map((e) => e.nome) : TIPOS_AMBIENTE.map((t) => t.nome)

  function mudarCampo(campo: keyof Vistoria, valor: string) {
    setDados((d) => (d ? { ...d, vistoria: { ...d.vistoria, [campo]: valor } } : d))
  }

  async function salvarCampo(campo: keyof Vistoria) {
    try {
      const limpo = limparCampos({ [campo]: dados!.vistoria[campo] } as Partial<Vistoria>)
      if (campo === 'cliente_nome' && !limpo.cliente_nome) return
      await salvarVistoria(v.id, limpo)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function adicionar() {
    const nome = novoNome.trim() || novoTipo
    if (!nome) return
    setAdicionando(true)
    try {
      const amb = await adicionarAmbiente(v.id, nome, novoTipo ? itensSugeridos(v.tipo, novoTipo) : [], ambientes.length)
      setNovoNome('')
      setNovoTipo('')
      await recarregar()
      navigate(`/vistoria/${v.id}/ambiente/${amb.id}`)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setAdicionando(false)
    }
  }

  async function excluir() {
    if (!window.confirm(`Apagar a vistoria de ${v.cliente_nome}? Fotos e anotações serão perdidas.`)) return
    try {
      await apagarVistoria(v.id)
      navigate('/', { replace: true })
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <Link to="/">← Vistorias</Link>
          <strong>{v.cliente_nome}</strong>
          <small>
            {obra ? 'Obra em andamento' : 'Recebimento de imóvel'} · {formatarData(v.data_vistoria)}
            {v.unidade ? ` · ${v.unidade}` : ''}
          </small>
        </div>
      </header>

      <section className="cartao">
        <button type="button" className="secundario" onClick={() => setEditando((x) => !x)}>
          {editando ? 'Fechar dados do cliente' : 'Editar dados do cliente e do imóvel'}
        </button>
        {editando && <CamposDados tipo={v.tipo} valores={v} onChange={mudarCampo} onBlur={salvarCampo} />}
      </section>

      <section className="pilha">
        <h2>{obra ? 'Etapas da obra' : 'Ambientes'}</h2>
        <ul className="lista">
          {ambientes.map((a) => {
            const its = itens.filter((i) => i.ambiente_id === a.id)
            const feitos = its.filter((i) => i.situacao).length
            const nFotos = fotos.filter((f) => f.ambiente_id === a.id).length
            const completo = its.length > 0 && feitos === its.length
            return (
              <li key={a.id}>
                <Link className="linha-vistoria" to={`/vistoria/${v.id}/ambiente/${a.id}`}>
                  <div>
                    <strong>{a.nome}</strong>
                    <span>{feitos}/{its.length} itens · {nFotos} {nFotos === 1 ? 'foto' : 'fotos'}</span>
                  </div>
                  <span className={`selo ${completo ? 'selo-aprovado' : feitos ? 'selo-pendente' : 'selo-neutro'}`}>
                    {completo ? 'Feito' : feitos ? 'Em andamento' : 'A fazer'}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="cartao">
          <strong>Adicionar {obra ? 'etapa' : 'ambiente'}</strong>
          <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}>
            <option value="">{obra ? 'Etapa em branco' : 'Escolha o tipo (traz o checklist)'}</option>
            {opcoesTipo.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder={obra ? 'Nome (opcional)' : 'Nome (ex.: Suíte 3, Varanda gourmet)'} value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          <button type="button" disabled={adicionando || (!novoTipo && !novoNome.trim())} onClick={adicionar}>
            {adicionando ? 'Adicionando…' : 'Adicionar'}
          </button>
        </div>
      </section>

      <Link className="botao grande" to={`/vistoria/${v.id}/conclusao`}>Conclusão e laudo em PDF →</Link>

      <button type="button" className="link-perigo" onClick={excluir}>Apagar esta vistoria</button>
    </main>
  )
}
