import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SeletorBiblioteca, { type Escolha } from '../components/SeletorBiblioteca'
import { CONCLUSOES, sistemaDoItem } from '../lib/biblioteca'
import { GRAU_RISCO, situacaoEhProblema } from '../lib/modelos'
import { gerarLaudoPdf, nomeArquivoLaudo } from '../lib/pdf'
import { montarSintese, sugerirConclusao, type Grau } from '../lib/sintese'
import { supabase, type Profile } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useVistoria } from '../lib/useVistoria'
import { salvarVistoria, type Constatacao, type Vistoria } from '../lib/vistorias'
import { limparCampos } from './NovaVistoria'

export default function ConclusaoPage() {
  const { id } = useParams()
  const { dados, setDados, erro, setErro } = useVistoria(id)
  const [progresso, setProgresso] = useState('')
  const [pdf, setPdf] = useState<{ url: string; blob: Blob; nome: string } | null>(null)
  const [escolhendo, setEscolhendo] = useState(false)
  const { profile } = useAuth()

  if (erro) return <main className="pagina"><Link to={`/vistoria/${id}`}>← Voltar</Link><p className="erro">{erro}</p></main>
  if (!dados) return <div className="centro">Carregando…</div>

  const v = dados.vistoria
  const obra = v.tipo === 'andamento'
  const problemas = dados.itens.filter((i) => situacaoEhProblema(v.tipo, i.situacao))
  const semAvaliar = dados.itens.filter((i) => !i.situacao).length
  const nomeAmbiente = (ambId: string) => dados.ambientes.find((a) => a.id === ambId)?.nome ?? ''

  function mudar(campo: keyof Vistoria, valor: string | null) {
    setDados((d) => (d ? { ...d, vistoria: { ...d.vistoria, [campo]: valor } } : d))
  }

  async function salvar(campo: keyof Vistoria, valor?: string | null) {
    try {
      const atual = valor !== undefined ? valor : dados!.vistoria[campo]
      await salvarVistoria(v.id, limparCampos({ [campo]: atual } as Partial<Vistoria>))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  const sintese = montarSintese(dados)
  const constatacoes: Constatacao[] = v.conclusoes_tecnicas ?? []
  // Sistemas com não conformidade: as constatações desses sistemas aparecem primeiro na biblioteca.
  const sistemasComNC = Array.from(new Set(problemas.map((p) => p.sistema ?? sistemaDoItem(v.tipo, p.descricao)).filter(Boolean))) as string[]

  async function gravarConstatacoes(lista: Constatacao[]) {
    setDados((d) => (d ? { ...d, vistoria: { ...d.vistoria, conclusoes_tecnicas: lista } } : d))
    try {
      await salvarVistoria(v.id, { conclusoes_tecnicas: lista })
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function incluirConstatacoes(escolhas: Escolha[]) {
    await gravarConstatacoes([...constatacoes, ...escolhas.map((e) => ({ sistema: e.sistema ?? 'Meus itens', texto: e.texto }))])
    setEscolhendo(false)
  }

  function editarConstatacao(i: number, texto: string) {
    setDados((d) => {
      if (!d) return d
      const lista = d.vistoria.conclusoes_tecnicas.map((c, j) => (j === i ? { ...c, texto } : c))
      return { ...d, vistoria: { ...d.vistoria, conclusoes_tecnicas: lista } }
    })
  }

  function moverConstatacao(i: number, delta: number) {
    const lista = [...constatacoes]
    const j = i + delta
    if (j < 0 || j >= lista.length) return
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    gravarConstatacoes(lista)
  }

  function usarModelo(campo: 'laudo_resumo' | 'conclusao') {
    const atual = (v[campo] ?? '').trim()
    if (atual && !window.confirm('Substituir o texto atual pelo texto modelo?')) return
    const local = [v.unidade, v.cidade].filter(Boolean).join(', ') || 'vistoriado'
    const texto =
      campo === 'conclusao'
        ? sugerirConclusao(dados!, sintese, (v.grau_risco ?? sintese.grauSugerido) as Grau)
        : obra
          ? `A obra ${local}, na data de ${v.data_vistoria.split('-').reverse().join('/')}, foi vistoriada e ${problemas.length ? `apresentou ${problemas.length} não conformidade(s) que exigem ação do executor, listadas a seguir:` : 'não apresentou não conformidades nos itens verificados.'}`
          : `O imóvel ${local} apresenta-se, no geral, em ${problemas.length > 5 ? 'regular' : 'bom'} estado de conservação. ${problemas.length ? 'Todavia, foram identificados vícios e/ou falhas específicas que demandam correção, listados a seguir:' : 'Não foram identificados vícios ou falhas nos itens verificados.'}`
    mudar(campo, texto)
    salvar(campo, texto)
  }

  async function gerar() {
    setErro('')
    setPdf(null)
    setProgresso('Preparando…')
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', v.vistoriador_id).single()
      const blob = await gerarLaudoPdf({ dados: dados!, vistoriador: (data as Profile) ?? null, aoProgresso: setProgresso })
      const nome = nomeArquivoLaudo(dados!)
      setPdf({ url: URL.createObjectURL(blob), blob, nome })
      if (v.status !== 'concluida') {
        await salvarVistoria(v.id, { status: 'concluida' })
        mudar('status', 'concluida')
      }
    } catch (e) {
      setErro(`Não foi possível gerar o PDF: ${(e as Error).message}`)
    } finally {
      setProgresso('')
    }
  }

  async function compartilhar() {
    if (!pdf) return
    const arquivo = new File([pdf.blob], pdf.nome, { type: 'application/pdf' })
    if (navigator.canShare?.({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], title: pdf.nome }).catch(() => {})
    } else {
      window.open(pdf.url, '_blank')
    }
  }

  function texto(campo: keyof Vistoria, rotulo: string, linhas = 4, placeholder = '', modelo?: 'laudo_resumo' | 'conclusao') {
    return (
      <label>
        <span className="titulo-secao">
          {rotulo}
          {modelo && <button type="button" className="link" onClick={() => usarModelo(modelo)}>Usar texto modelo</button>}
        </span>
        <textarea
          rows={linhas}
          placeholder={placeholder}
          value={(v[campo] as string | null) ?? ''}
          onChange={(e) => mudar(campo, e.target.value)}
          onBlur={() => salvar(campo)}
        />
      </label>
    )
  }

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <Link to={`/vistoria/${v.id}`}>← {v.cliente_nome}</Link>
          <strong>Conclusão e laudo</strong>
        </div>
      </header>

      {semAvaliar > 0 && (
        <p className="aviso-amarelo">{semAvaliar} {semAvaliar === 1 ? 'item ainda não foi avaliado' : 'itens ainda não foram avaliados'}. Eles saem em branco no laudo.</p>
      )}

      <section className="cartao">
        <h2>Não conformidades ({problemas.length})</h2>
        {problemas.length === 0 && <p className="sutil">Nenhum item marcado como problema.</p>}
        <ul className="lista-simples">
          {problemas.map((p) => (
            <li key={p.id}>
              <strong>{nomeAmbiente(p.ambiente_id)}:</strong> {p.observacao?.trim() || p.descricao}
              {!p.solucao && <span className="sutil"> (sem solução descrita)</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="cartao">
        <div className="titulo-secao">
          <h2>Constatações técnicas ({constatacoes.length})</h2>
          {!escolhendo && <button type="button" className="secundario pequeno" onClick={() => setEscolhendo(true)}>+ Biblioteca</button>}
        </div>
        <p className="sutil pequeno-texto">Escolha na biblioteca (por norma) as constatações que se aplicam a este imóvel. Só o que você marcar sai na conclusão do laudo.</p>
        {constatacoes.length === 0 && !escolhendo && <p className="sutil">Nenhuma constatação escolhida.</p>}
        <ol className="lista-simples">
          {constatacoes.map((c, i) => (
            <li key={i} className="constatacao">
              <div className="constatacao-topo">
                <span className="sutil pequeno-texto">{c.sistema}</span>
                <span>
                  <button type="button" className="icone" title="Subir" onClick={() => moverConstatacao(i, -1)}>↑</button>
                  <button type="button" className="icone" title="Descer" onClick={() => moverConstatacao(i, 1)}>↓</button>
                  <button type="button" className="icone" title="Remover" onClick={() => gravarConstatacoes(constatacoes.filter((_, j) => j !== i))}>×</button>
                </span>
              </div>
              <textarea rows={3} value={c.texto} onChange={(e) => editarConstatacao(i, e.target.value)} onBlur={() => gravarConstatacoes(dados!.vistoria.conclusoes_tecnicas)} />
            </li>
          ))}
        </ol>
      </section>

      {escolhendo && (
        <SeletorBiblioteca
          titulo="Biblioteca de constatações técnicas"
          tipo="conclusao"
          grupos={CONCLUSOES}
          abertos={sistemasComNC}
          destaque={sistemasComNC}
          jaUsados={constatacoes.map((c) => c.texto)}
          onConfirmar={incluirConstatacoes}
          onFechar={() => setEscolhendo(false)}
        />
      )}

      <section className="cartao">
        <h2>Textos do laudo</h2>
        <label>
          Grau de risco global
          <div className="segmentos">
            {Object.entries(GRAU_RISCO).map(([valor, g]) => (
              <button
                key={valor}
                type="button"
                className={v.grau_risco === valor ? 'ativo' : ''}
                onClick={() => {
                  const novo = v.grau_risco === valor ? null : valor
                  mudar('grau_risco', novo)
                  salvar('grau_risco', novo)
                }}
              >
                {g.rotulo}
              </button>
            ))}
          </div>
          <span className="sutil pequeno-texto">
            {v.grau_risco ? GRAU_RISCO[v.grau_risco].texto : `Você escolhe. Pelo checklist, a sugestão seria ${GRAU_RISCO[sintese.grauSugerido].rotulo}.`}
          </span>
        </label>
        {texto('laudo_resumo', 'Laudo (estado geral do imóvel)', 5, 'Escreva ou use o texto modelo', 'laudo_resumo')}
        {texto('conclusao', 'Parecer final', 5, 'Escreva ou use o texto modelo', 'conclusao')}
        <label className="check">
          <input
            type="checkbox"
            checked={!!v.incluir_resumo}
            onChange={(e) => {
              setDados((d) => (d ? { ...d, vistoria: { ...d.vistoria, incluir_resumo: e.target.checked } } : d))
              salvarVistoria(v.id, { incluir_resumo: e.target.checked }).catch((err) => setErro(err.message))
            }}
          />
          Incluir quadro-resumo por sistema (contagem de itens, normas e prioridade)
        </label>
        {texto('pressupostos_extra', 'Pressupostos específicos desta vistoria (opcional)', 3, 'Ex.: instalações elétricas não conferidas por falta de energia; gás sem recipiente.')}
        {obra && (
          <>
            <div className="grade-2">
              <label>
                Avanço previsto (%)
                <input inputMode="decimal" value={v.avanco_previsto ?? ''} onChange={(e) => mudar('avanco_previsto', e.target.value)} onBlur={() => salvar('avanco_previsto')} />
              </label>
              <label>
                Avanço executado (%)
                <input inputMode="decimal" value={v.avanco_executado ?? ''} onChange={(e) => mudar('avanco_executado', e.target.value)} onBlur={() => salvar('avanco_executado')} />
              </label>
            </div>
            <label>
              Próxima vistoria
              <input placeholder="Ex.: antes da concretagem da laje" value={v.proxima_vistoria ?? ''} onChange={(e) => mudar('proxima_vistoria', e.target.value)} onBlur={() => salvar('proxima_vistoria')} />
            </label>
          </>
        )}
        <label>
          Cidade onde o laudo é assinado
          <input placeholder={profile?.cidade_base || 'Ex.: Eusébio'} value={v.local_emissao ?? ''} onChange={(e) => mudar('local_emissao', e.target.value)} onBlur={() => salvar('local_emissao')} />
        </label>
      </section>

      <button type="button" className="grande" disabled={!!progresso} onClick={gerar}>
        {progresso || 'Gerar laudo em PDF'}
      </button>

      {pdf && (
        <section className="cartao destaque-ok">
          <strong>Laudo pronto</strong>
          <span className="sutil">{pdf.nome}</span>
          <div className="grade-2">
            <a className="botao" href={pdf.url} download={pdf.nome}>Baixar PDF</a>
            <button type="button" className="secundario" onClick={compartilhar}>Compartilhar</button>
          </div>
          <p className="sutil pequeno-texto">
            Para assinar digitalmente, abra o PDF no assinador do gov.br (assinador.iti.br) ou no programa do seu certificado e envie a versão assinada ao cliente.
          </p>
        </section>
      )}
    </main>
  )
}
