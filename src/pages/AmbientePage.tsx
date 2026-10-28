import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import SeletorBiblioteca from '../components/SeletorBiblioteca'
import { gruposDeItens, sistemaDoItem } from '../lib/biblioteca'
import { ETAPAS_ANDAMENTO, SITUACOES, TIPOS_AMBIENTE, itensParaNovoAmbiente, situacaoEhProblema, sugerirNC } from '../lib/modelos'
import { supabase } from '../lib/supabase'
import { useVistoria } from '../lib/useVistoria'
import {
  adicionarItens,
  apagarAmbiente,
  apagarFoto,
  enviarFoto,
  salvarAmbiente,
  salvarFoto,
  salvarItem,
  urlsDasFotos,
  type Foto,
  type Item,
} from '../lib/vistorias'

const ETAPA_SITUACAO = [
  { valor: 'nao_iniciada', rotulo: 'Não iniciada' },
  { valor: 'em_execucao', rotulo: 'Em execução' },
  { valor: 'concluida', rotulo: 'Concluída' },
]

export default function AmbientePage() {
  const { id, ambId } = useParams()
  const navigate = useNavigate()
  const { dados, setDados, erro, setErro, recarregar } = useVistoria(id)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(0)
  const [params] = useSearchParams()
  const [escolhendo, setEscolhendo] = useState<boolean | null>(null)
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const inputFoto = useRef<HTMLInputElement>(null)

  const fotosDoAmbiente = dados?.fotos.filter((f) => f.ambiente_id === ambId) ?? []
  const chaveFotos = fotosDoAmbiente.map((f) => f.path).join('|')

  useEffect(() => {
    const faltando = fotosDoAmbiente.filter((f) => !urls[f.path])
    if (!faltando.length) return
    urlsDasFotos(faltando)
      .then((novas) => setUrls((u) => ({ ...u, ...novas })))
      .catch((e) => setErro(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveFotos])

  if (erro) return <main className="pagina"><Link to={`/vistoria/${id}`}>← Voltar</Link><p className="erro">{erro}</p></main>
  if (!dados) return <div className="centro">Carregando…</div>

  const v = dados.vistoria
  const amb = dados.ambientes.find((a) => a.id === ambId)
  if (!amb) return <main className="pagina"><Link to={`/vistoria/${id}`}>← Voltar</Link><p>Ambiente não encontrado.</p></main>

  const itens = dados.itens.filter((i) => i.ambiente_id === amb.id)
  const opcoes = SITUACOES[v.tipo]
  const indice = dados.ambientes.findIndex((a) => a.id === amb.id)
  const proximo = dados.ambientes[indice + 1]

  const mostrarSeletor = escolhendo ?? (params.has('escolher') || itens.length === 0)
  // Tipo do ambiente para sugerir os itens do modelo dele (escolhido ao criar, ou pelo nome).
  const tipoAmbiente =
    params.get('escolher') ||
    (v.tipo === 'andamento'
      ? ETAPAS_ANDAMENTO.find((e) => e.nome === amb.nome)?.nome
      : TIPOS_AMBIENTE.find((t) => amb.nome.toLowerCase().startsWith(t.nome.split(' ')[0].toLowerCase()))?.nome) ||
    ''
  const sugeridos = tipoAmbiente
    ? itensParaNovoAmbiente(v.tipo, tipoAmbiente).map((t) => ({ texto: t, sistema: sistemaDoItem(v.tipo, t) }))
    : []

  async function incluirItens(escolhas: { texto: string; sistema: string | null }[]) {
    await adicionarItens(amb!, escolhas.map((e) => ({ descricao: e.texto, sistema: e.sistema ?? sistemaDoItem(v.tipo, e.texto) })), itens.length)
    setEscolhendo(false)
    await recarregar()
  }

  function atualizarItemLocal(itemId: string, campos: Partial<Item>) {
    setDados((d) => (d ? { ...d, itens: d.itens.map((i) => (i.id === itemId ? { ...i, ...campos } : i)) } : d))
  }

  async function marcar(item: Item, situacao: string) {
    const nova = item.situacao === situacao ? null : situacao
    const campos: Partial<Item> = { situacao: nova }
    atualizarItemLocal(item.id, campos)
    try {
      await salvarItem(item.id, campos)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function salvarTexto(item: Item, campo: 'observacao' | 'impacto' | 'solucao') {
    try {
      await salvarItem(item.id, { [campo]: item[campo]?.trim() || null })
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function removerItem(item: Item) {
    if (!window.confirm(`Remover o item "${item.descricao}"?`)) return
    const { error } = await supabase.from('itens').delete().eq('id', item.id)
    if (error) return setErro(error.message)
    recarregar()
  }

  async function aoEscolherFotos(arquivos: FileList | null) {
    if (!arquivos?.length) return
    const lista = Array.from(arquivos)
    setEnviando((n) => n + lista.length)
    let ordem = fotosDoAmbiente.length
    for (const arq of lista) {
      try {
        const foto = await enviarFoto(amb!, arq, '', ordem++)
        setDados((d) => (d ? { ...d, fotos: [...d.fotos, foto] } : d))
      } catch (e) {
        setErro(`Falha ao enviar foto: ${(e as Error).message}`)
      } finally {
        setEnviando((n) => n - 1)
      }
    }
    if (inputFoto.current) inputFoto.current.value = ''
  }

  function atualizarFotoLocal(fotoId: string, campos: Partial<Foto>) {
    setDados((d) => (d ? { ...d, fotos: d.fotos.map((f) => (f.id === fotoId ? { ...f, ...campos } : f)) } : d))
  }

  async function removerFoto(foto: Foto) {
    if (!window.confirm('Apagar esta foto?')) return
    try {
      await apagarFoto(foto)
      setDados((d) => (d ? { ...d, fotos: d.fotos.filter((f) => f.id !== foto.id) } : d))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function renomear() {
    const nome = window.prompt('Novo nome', amb!.nome)?.trim()
    if (!nome) return
    await salvarAmbiente(amb!.id, { nome })
    recarregar()
  }

  async function excluirAmbiente() {
    if (!window.confirm(`Remover "${amb!.nome}" com todos os itens e fotos?`)) return
    try {
      await apagarAmbiente(amb!, dados!.fotos)
      navigate(`/vistoria/${v.id}`, { replace: true })
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function marcarRestantesComoOk() {
    const valorOk = opcoes[0].valor
    const pendentes = itens.filter((i) => !i.situacao)
    for (const i of pendentes) atualizarItemLocal(i.id, { situacao: valorOk })
    const { error } = await supabase.from('itens').update({ situacao: valorOk }).in('id', pendentes.map((i) => i.id))
    if (error) setErro(error.message)
  }

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <Link to={`/vistoria/${v.id}`}>← {v.cliente_nome}</Link>
          <strong>{amb.nome}</strong>
        </div>
        <button type="button" className="secundario pequeno" onClick={renomear}>Renomear</button>
      </header>

      {v.tipo === 'andamento' && (
        <div className="segmentos">
          {ETAPA_SITUACAO.map((s) => (
            <button
              key={s.valor}
              type="button"
              className={amb.situacao_etapa === s.valor ? 'ativo' : ''}
              onClick={async () => {
                setDados((d) => (d ? { ...d, ambientes: d.ambientes.map((a) => (a.id === amb.id ? { ...a, situacao_etapa: s.valor } : a)) } : d))
                await salvarAmbiente(amb.id, { situacao_etapa: s.valor })
              }}
            >
              {s.rotulo}
            </button>
          ))}
        </div>
      )}

      <section className="pilha">
        <div className="titulo-secao">
          <h2>Fotos ({fotosDoAmbiente.length})</h2>
        </div>
        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => aoEscolherFotos(e.target.files)}
        />
        <button type="button" className="grande" onClick={() => inputFoto.current?.click()}>
          📷 Tirar foto
        </button>
        {enviando > 0 && <p className="sutil">Enviando {enviando} {enviando === 1 ? 'foto' : 'fotos'}…</p>}
        <div className="grade-fotos">
          {fotosDoAmbiente.map((f) => (
            <figure key={f.id} className="foto">
              {urls[f.path] ? <img src={urls[f.path]} alt={f.legenda} loading="lazy" /> : <div className="foto-vazia" />}
              <input
                placeholder="Legenda (o que foi visto)"
                value={f.legenda}
                onChange={(e) => atualizarFotoLocal(f.id, { legenda: e.target.value })}
                onBlur={() => salvarFoto(f.id, { legenda: f.legenda.trim() }).catch((e) => setErro(e.message))}
              />
              <select
                value={f.item_id ?? ''}
                onChange={(e) => {
                  const item_id = e.target.value || null
                  atualizarFotoLocal(f.id, { item_id })
                  salvarFoto(f.id, { item_id }).catch((err) => setErro(err.message))
                }}
              >
                <option value="">Item (opcional)</option>
                {itens.map((i) => <option key={i.id} value={i.id}>{i.descricao}</option>)}
              </select>
              <button type="button" className="link-perigo" onClick={() => removerFoto(f)}>Apagar</button>
            </figure>
          ))}
        </div>
      </section>

      {mostrarSeletor && (
        <SeletorBiblioteca
          titulo={`O que você vai verificar em ${amb.nome}?`}
          tipo="item"
          grupos={gruposDeItens(v.tipo)}
          sugeridos={sugeridos.length ? { titulo: `Do seu modelo: ${tipoAmbiente}`, textos: sugeridos } : undefined}
          jaUsados={itens.map((i) => i.descricao)}
          maiusculas
          onConfirmar={incluirItens}
          onFechar={() => setEscolhendo(false)}
        />
      )}

      <section className="pilha">
        <div className="titulo-secao">
          <h2>Checklist</h2>
          {itens.some((i) => !i.situacao) && (
            <button type="button" className="secundario pequeno" onClick={marcarRestantesComoOk}>
              Restantes = {opcoes[0].rotulo}
            </button>
          )}
        </div>
        {itens.length === 0 && <p className="sutil">Nenhum item escolhido ainda.</p>}
        <ul className="lista">
          {itens.map((item) => {
            const problema = situacaoEhProblema(v.tipo, item.situacao)
            const aberto = abertos[item.id] ?? false
            return (
              <li key={item.id} className={`item ${problema ? 'item-problema' : ''}`}>
                <div className="item-topo">
                  <span className="item-desc">{item.descricao}</span>
                  <button type="button" className="icone" title="Remover item" onClick={() => removerItem(item)}>×</button>
                </div>
                <div className="segmentos">
                  {opcoes.map((o) => (
                    <button
                      key={o.valor}
                      type="button"
                      className={`${item.situacao === o.valor ? 'ativo' : ''} ${o.problema ? 'seg-problema' : ''}`}
                      onClick={() => marcar(item, o.valor)}
                    >
                      {v.tipo === 'andamento' ? o.curto : o.rotulo}
                    </button>
                  ))}
                </div>
                {(problema || item.observacao) && (
                  <input
                    placeholder="Observação (sai no laudo)"
                    value={item.observacao ?? ''}
                    onChange={(e) => atualizarItemLocal(item.id, { observacao: e.target.value })}
                    onBlur={() => salvarTexto(item, 'observacao')}
                  />
                )}
                {!problema && !item.observacao && (
                  <button type="button" className="link" onClick={() => atualizarItemLocal(item.id, { observacao: ' ' })}>
                    + observação
                  </button>
                )}
                {problema && (
                  <>
                    <button type="button" className="link" onClick={() => setAbertos((s) => ({ ...s, [item.id]: !aberto }))}>
                      {aberto ? '− ocultar' : '+ por que é problema / o que fazer'}
                    </button>
                    {aberto && (
                      <>
                        {!item.impacto && !item.solucao && sugerirNC(`${item.observacao ?? ''} ${item.descricao}`) && (
                          <button
                            type="button"
                            className="link"
                            onClick={() => {
                              const sug = sugerirNC(`${item.observacao ?? ''} ${item.descricao}`)!
                              const campos = { impacto: sug.impacto, solucao: sug.solucao }
                              atualizarItemLocal(item.id, campos)
                              salvarItem(item.id, campos).catch((e) => setErro(e.message))
                            }}
                          >
                            Usar texto sugerido
                          </button>
                        )}
                        <textarea
                          rows={2}
                          placeholder="Por que é um problema?"
                          value={item.impacto ?? ''}
                          onChange={(e) => atualizarItemLocal(item.id, { impacto: e.target.value })}
                          onBlur={() => salvarTexto(item, 'impacto')}
                        />
                        <textarea
                          rows={2}
                          placeholder="O que deve ser feito?"
                          value={item.solucao ?? ''}
                          onChange={(e) => atualizarItemLocal(item.id, { solucao: e.target.value })}
                          onBlur={() => salvarTexto(item, 'solucao')}
                        />
                      </>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
        {!mostrarSeletor && (
          <button type="button" className="secundario" onClick={() => setEscolhendo(true)}>+ Escolher itens da biblioteca</button>
        )}
      </section>

      {proximo ? (
        <Link className="botao grande" to={`/vistoria/${v.id}/ambiente/${proximo.id}`}>Próximo: {proximo.nome} →</Link>
      ) : (
        <Link className="botao grande" to={`/vistoria/${v.id}/conclusao`}>Ir para a conclusão →</Link>
      )}

      <button type="button" className="link-perigo" onClick={excluirAmbiente}>Remover {v.tipo === 'andamento' ? 'esta etapa' : 'este ambiente'}</button>
    </main>
  )
}
