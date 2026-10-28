import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GRAU_RISCO, situacaoEhProblema } from '../lib/modelos'
import { gerarLaudoPdf, nomeArquivoLaudo } from '../lib/pdf'
import { supabase, type Profile } from '../lib/supabase'
import { useVistoria } from '../lib/useVistoria'
import { salvarVistoria, type Vistoria } from '../lib/vistorias'
import { limparCampos } from './NovaVistoria'

export default function ConclusaoPage() {
  const { id } = useParams()
  const { dados, setDados, erro, setErro } = useVistoria(id)
  const [progresso, setProgresso] = useState('')
  const [pdf, setPdf] = useState<{ url: string; blob: Blob; nome: string } | null>(null)

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

  function sugerirTextos() {
    const local = [v.unidade, v.cidade].filter(Boolean).join(', ') || 'vistoriado'
    const resumo = obra
      ? `A obra ${local}, na data de ${v.data_vistoria.split('-').reverse().join('/')}, foi vistoriada e ${problemas.length ? `apresentou ${problemas.length} não conformidade(s) que exigem ação do executor, listadas a seguir:` : 'não apresentou não conformidades nos itens verificados.'}`
      : `O imóvel ${local} apresenta-se, no geral, em ${problemas.length > 5 ? 'regular' : 'bom'} estado de conservação. ${problemas.length ? 'Todavia, foram identificados vícios e/ou falhas específicas que impactam diretamente o uso diário do imóvel e o bem-estar da família, sendo necessária atenção por parte da construtora na resolução dos seguintes itens:' : 'Não foram identificados vícios ou falhas nos itens verificados.'}`
    const grau = v.grau_risco ?? (problemas.length ? 'baixo' : 'baixo')
    const g = GRAU_RISCO[grau]
    const conclusao = obra
      ? `Diante das não conformidades verificadas, classificamos a obra, de forma global nesta data, com GRAU DE RISCO ${g.rotulo}, ou seja, ${g.texto}.`
      : `Diante das inconformidades técnicas construtivas verificadas no imóvel vistoriado, classificamos a edificação de ${v.cliente_nome}, de maneira global, com GRAU DE RISCO ${g.rotulo}, ou seja, ${g.texto}. É necessário, antes do início da utilização da edificação, que sejam sanados todos os apontamentos feitos neste relatório para que não tragam prejuízo ao proprietário.`
    mudar('laudo_resumo', resumo)
    mudar('conclusao', conclusao)
    mudar('grau_risco', grau)
    salvar('laudo_resumo', resumo)
    salvar('conclusao', conclusao)
    salvar('grau_risco', grau)
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

  function texto(campo: keyof Vistoria, rotulo: string, linhas = 4, placeholder = '') {
    return (
      <label>
        {rotulo}
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
          <h2>Textos do laudo</h2>
          <button type="button" className="secundario pequeno" onClick={sugerirTextos}>Preencher automático</button>
        </div>
        <label>
          Grau de risco global
          <div className="segmentos">
            {Object.entries(GRAU_RISCO).map(([valor, g]) => (
              <button
                key={valor}
                type="button"
                className={v.grau_risco === valor ? 'ativo' : ''}
                onClick={() => {
                  mudar('grau_risco', valor)
                  salvar('grau_risco', valor)
                }}
              >
                {g.rotulo}
              </button>
            ))}
          </div>
        </label>
        {texto('laudo_resumo', 'Laudo (resumo do estado geral)', 5)}
        {texto('conclusao', 'Conclusão', 5)}
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
          <input placeholder="Ex.: Eusébio" value={v.local_emissao ?? ''} onChange={(e) => mudar('local_emissao', e.target.value)} onBlur={() => salvar('local_emissao')} />
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
