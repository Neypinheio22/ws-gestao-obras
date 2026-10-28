import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CamposDados from '../components/CamposDados'
import { ETAPAS_ANDAMENTO, TIPOS_AMBIENTE } from '../lib/modelos'
import { formatarData, useVistoria } from '../lib/useVistoria'
import { adicionarAmbiente, apagarVistoria, salvarAmbiente, salvarVistoria, type Vistoria } from '../lib/vistorias'
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

  async function salvarCampo(campo: keyof Vistoria, valor?: string) {
    try {
      const limpo = limparCampos({ [campo]: valor !== undefined ? valor : dados!.vistoria[campo] } as Partial<Vistoria>)
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
      const amb = await adicionarAmbiente(v.id, nome, ambientes.length)
      setNovoNome('')
      setNovoTipo('')
      await recarregar()
      // Abre o ambiente já com a biblioteca para escolher os itens.
      navigate(`/vistoria/${v.id}/ambiente/${amb.id}?escolher=${encodeURIComponent(novoTipo)}`)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setAdicionando(false)
    }
  }

  // Ordem em que ele percorre o imóvel (entrada, fachada, cozinha...). É a mesma ordem do laudo.
  async function mover(i: number, delta: number) {
    const j = i + delta
    if (j < 0 || j >= ambientes.length) return
    const lista = [...ambientes]
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    const nova = lista.map((a, k) => ({ ...a, ordem: k }))
    setDados((d) => (d ? { ...d, ambientes: nova } : d))
    try {
      await Promise.all(nova.filter((a, k) => ambientes[k]?.id !== a.id).map((a) => salvarAmbiente(a.id, { ordem: a.ordem })))
    } catch (e) {
      setErro((e as Error).message)
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
        {ambientes.length === 0 && (
          <p className="sutil">Adicione {obra ? 'as etapas que vai vistoriar' : 'os ambientes que vai vistoriar'} e escolha os itens de cada um.</p>
        )}
        <ul className="lista">
          {ambientes.map((a, idx) => {
            const its = itens.filter((i) => i.ambiente_id === a.id)
            const feitos = its.filter((i) => i.situacao).length
            const nFotos = fotos.filter((f) => f.ambiente_id === a.id).length
            const completo = its.length > 0 && feitos === its.length
            return (
              <li key={a.id} className="linha-ordenavel">
                <span className="setas">
                  <button type="button" className="icone" title="Subir" disabled={idx === 0} onClick={() => mover(idx, -1)}>↑</button>
                  <button type="button" className="icone" title="Descer" disabled={idx === ambientes.length - 1} onClick={() => mover(idx, 1)}>↓</button>
                </span>
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
            <option value="">{obra ? 'Etapa (escolha ou escreva o nome)' : 'Tipo de ambiente (escolha ou escreva o nome)'}</option>
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
