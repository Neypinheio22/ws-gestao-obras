import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Profile } from './supabase'
import {
  GRAU_RISCO,
  LIMITANTES,
  METODOLOGIA,
  NORMAS,
  PRESSUPOSTOS,
  RESSALVAS,
  SISTEMAS_RECEBIMENTO,
  SITUACOES,
  TITULO,
  objetivoDaVistoria,
  paragrafosObjetivo,
  situacaoEhProblema,
} from './modelos'
import { montarSintese, recomendacaoFinal } from './sintese'
import { urlsDasFotos, type Foto, type Item, type VistoriaCompleta } from './vistorias'
import { formatarData } from './useVistoria'

// Gera o laudo em PDF (A4) no mesmo roteiro do modelo do Werlisson:
// cabeçalho, objetivo e normas, dados, metodologia, sistemas, ressalvas, checklist,
// fotos (2 por linha), não conformidades, laudo, conclusão e encerramento.

const MARGEM = 15
const LARGURA = 210
const ALTURA = 297
const UTIL = LARGURA - 2 * MARGEM
const COR = [194, 65, 12] as const // laranja da marca
const ALIAS_TOTAL = '{total_paginas}'

interface Opcoes {
  dados: VistoriaCompleta
  vistoriador: Profile | null
  aoProgresso?: (texto: string) => void
}

// Linhas de identificação do responsável técnico, iguais no cabeçalho, no encerramento e na assinatura.
export function identificacaoTecnica(p: Profile | null) {
  const nome = p?.nome?.trim() || 'Responsável técnico'
  const titulo = p?.titulo_profissional?.trim() || ''
  const registro = p?.registro?.trim() ? `REGISTRO TÉCNICO: ${p.registro.trim()}` : ''
  const conselho = p?.conselho?.trim() || ''
  return { nome, titulo, registro, conselho }
}

function dataPorExtenso(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${d} de ${meses[m - 1]} de ${a}`
}

async function carregarImagem(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const resp = await fetch(url)
    const blob = await resp.blob()
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
    const bmp = await createImageBitmap(blob)
    const dims = { w: bmp.width, h: bmp.height }
    bmp.close()
    return { data, ...dims }
  } catch {
    return null
  }
}

export async function gerarLaudoPdf({ dados, vistoriador, aoProgresso }: Opcoes): Promise<Blob> {
  const { vistoria: v, ambientes, itens, fotos } = dados
  const obra = v.tipo === 'andamento'
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const objetivo = objetivoDaVistoria(v)
  const resp = identificacaoTecnica(vistoriador)
  let y = MARGEM + 4

  // ---------- utilitários de layout ----------
  function novaPaginaSePreciso(altura: number) {
    if (y + altura > ALTURA - 18) {
      doc.addPage()
      y = MARGEM + 4
    }
  }

  function titulo(texto: string) {
    novaPaginaSePreciso(14)
    y += 3
    doc.setFillColor(COR[0], COR[1], COR[2])
    doc.rect(MARGEM, y, UTIL, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.text(texto, MARGEM + 2, y + 5)
    doc.setTextColor(0, 0, 0)
    y += 11
  }

  function subtitulo(texto: string) {
    novaPaginaSePreciso(10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(texto, MARGEM, y)
    y += 5
  }

  function paragrafo(texto: string, recuo = 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const linhas = doc.splitTextToSize(texto, UTIL - recuo) as string[]
    for (const l of linhas) {
      novaPaginaSePreciso(5)
      doc.text(l, MARGEM + recuo, y)
      y += 4.2
    }
    y += 2
  }

  function marcador(texto: string) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const linhas = doc.splitTextToSize(texto, UTIL - 6) as string[]
    linhas.forEach((l, i) => {
      novaPaginaSePreciso(5)
      if (i === 0) doc.text('•', MARGEM + 2, y)
      doc.text(l, MARGEM + 6, y)
      y += 4.2
    })
    y += 0.8
  }

  const itensDe = (ambId: string) => itens.filter((i) => i.ambiente_id === ambId)
  const problemas: (Item & { ambiente: string })[] = ambientes.flatMap((a) =>
    itensDe(a.id)
      .filter((i) => situacaoEhProblema(v.tipo, i.situacao))
      .map((i) => ({ ...i, ambiente: a.nome })),
  )

  // ---------- cabeçalho ----------
  aoProgresso?.('Montando o texto…')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(TITULO[v.tipo], LARGURA / 2, y + 4, { align: 'center' })
  y += 12

  const cab: [string, string][] = obra
    ? [
        ['CONTRATANTE', v.cliente_nome],
        ['DATA', formatarData(v.data_vistoria) + (v.numero ? `  ·  VISTORIA Nº ${v.numero}` : '')],
        ['OBRA', v.unidade ?? '-'],
        ['ENDEREÇO', [v.endereco, v.cidade].filter(Boolean).join(', ') || '-'],
        ['CONSTRUTORA / EXECUTOR', v.construtora ?? '-'],
        ['RESP. TÉCNICO DA OBRA', v.responsavel_obra ?? '-'],
        ['ÁREA PREVISTA', v.area_m2 ? `${String(v.area_m2).replace('.', ',')} m²` : '-'],
        ['FINALIDADE', objetivo.rotulo],
      ]
    : [
        ['NOME COMPLETO', v.cliente_nome],
        ['DATA', formatarData(v.data_vistoria)],
        ['ENDEREÇO', [v.endereco, v.cidade].filter(Boolean).join(', ') || '-'],
        ['ÁREA CONSTRUÍDA', v.area_m2 ? `${String(v.area_m2).replace('.', ',')} m²` : '-'],
        ['TIPO', v.unidade ?? '-'],
        ...(v.construtora ? ([['CONSTRUTORA', v.construtora]] as [string, string][]) : []),
        ['FINALIDADE', objetivo.rotulo],
      ]
  cab.push(['RESPONSÁVEL PELA VISTORIA', [resp.nome, resp.titulo].filter(Boolean).join(' – ')])
  if (resp.registro) cab.push(['REGISTRO TÉCNICO', [vistoriador!.registro!.trim(), resp.conselho].filter(Boolean).join('  ·  ')])
  autoTable(doc, {
    startY: y,
    body: cab,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48, fillColor: [243, 244, 246] } },
    margin: { left: MARGEM, right: MARGEM },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4

  // ---------- 1. objetivo ----------
  titulo('1. OBJETIVO')
  paragrafosObjetivo(v).forEach((p) => paragrafo(p))
  subtitulo('1.1 RELAÇÃO DE NORMAS TÉCNICAS UTILIZADAS')
  NORMAS[v.tipo].forEach((n) => marcador(n))

  // ---------- 2. dados ----------
  titulo(obra ? '2. DADOS DA OBRA' : '2. DADOS INICIAIS')
  if (v.descricao_edificacao) paragrafo(v.descricao_edificacao)
  paragrafo(
    `${obra ? 'Etapas acompanhadas' : `Área construída de aproximadamente ${v.area_m2 ? String(v.area_m2).replace('.', ',') + 'm²' : '-'}, composta de`}: ${ambientes.map((a) => a.nome).join(', ')}.`,
  )

  // ---------- 3. metodologia ----------
  titulo('3. METODOLOGIA')
  METODOLOGIA[v.tipo].forEach((m) => {
    subtitulo(m.titulo)
    paragrafo(m.texto)
  })

  // ---------- 4. sistemas / etapas ----------
  if (obra) {
    titulo('4. ETAPAS DA OBRA E SITUAÇÃO NA DATA')
    const rotulos: Record<string, string> = { nao_iniciada: 'Não iniciada', em_execucao: 'Em execução', concluida: 'Concluída' }
    autoTable(doc, {
      startY: y,
      head: [['Etapa', 'Situação']],
      body: ambientes.map((a) => [a.nome, rotulos[a.situacao_etapa ?? ''] ?? '-']),
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.6 },
      headStyles: { fillColor: [55, 65, 81] },
      margin: { left: MARGEM, right: MARGEM },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
  } else {
    titulo('4. SISTEMAS CONSTRUTIVOS INSPECIONADOS')
    SISTEMAS_RECEBIMENTO.forEach((s) => marcador(s))
  }
  if (v.sistemas_obs) paragrafo(`Observação: ${v.sistemas_obs}`)

  // ---------- 5. pressupostos ----------
  titulo('5. PRESSUPOSTOS, RESSALVAS E CONDIÇÕES LIMITANTES')
  subtitulo('5.1 Pressupostos')
  paragrafo([PRESSUPOSTOS[v.tipo], v.pressupostos_extra].filter(Boolean).join(' '))
  subtitulo('5.2 Ressalvas')
  RESSALVAS[v.tipo].forEach((r) => marcador(r))
  subtitulo('5.3 Condições limitantes')
  LIMITANTES[v.tipo].forEach((r) => marcador(r))

  // ---------- 6. itens verificados ----------
  titulo(obra ? '6. ITENS VERIFICADOS POR ETAPA' : '6. ITENS VERIFICADOS')
  const opcoes = SITUACOES[v.tipo]
  for (const a of ambientes) {
    const its = itensDe(a.id)
    if (!its.length) continue
    novaPaginaSePreciso(20)
    autoTable(doc, {
      startY: y,
      head: [
        [{ content: a.nome.toUpperCase(), colSpan: opcoes.length + 2, styles: { halign: 'left', fillColor: [55, 65, 81] } }],
        ['ITENS A VERIFICAR', ...opcoes.map((o) => (obra ? o.curto : o.rotulo.toUpperCase())), 'OBSERVAÇÕES'],
      ],
      body: its.map((i) => [i.descricao, ...opcoes.map((o) => (i.situacao === o.valor ? 'X' : '')), i.observacao?.trim() ?? '']),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.4, valign: 'middle' },
      headStyles: { fillColor: [107, 114, 128], fontSize: 7.5, halign: 'center' },
      columnStyles: Object.fromEntries([
        [0, { cellWidth: 70 }],
        ...opcoes.map((_, k) => [k + 1, { cellWidth: obra ? 10 : 18, halign: 'center', fontStyle: 'bold' }]),
      ]),
      margin: { left: MARGEM, right: MARGEM },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
  }
  if (obra) paragrafo('Legenda: C = Conforme · NC = Não conforme · NA = Não se aplica · NE = Não executado.')

  // ---------- 7. fotos ----------
  if (fotos.length) {
    titulo('7. REGISTROS FOTOGRÁFICOS')
    aoProgresso?.('Baixando as fotos…')
    const urls = await urlsDasFotos(fotos)
    const larguraFoto = (UTIL - 6) / 2
    const alturaFoto = 62
    let feitas = 0
    for (const a of ambientes) {
      const fs = fotos.filter((f: Foto) => f.ambiente_id === a.id)
      if (!fs.length) continue
      novaPaginaSePreciso(alturaFoto + 18)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(a.nome.toUpperCase(), LARGURA / 2, y + 2, { align: 'center' })
      y += 6
      for (let k = 0; k < fs.length; k += 2) {
        const par = fs.slice(k, k + 2)
        const imgs = await Promise.all(par.map((f) => carregarImagem(urls[f.path])))
        feitas += par.length
        aoProgresso?.(`Fotos ${feitas}/${fotos.length}…`)
        const legendas = par.map((f) => doc.splitTextToSize(f.legenda.toUpperCase() || ' ', larguraFoto) as string[])
        const altLegenda = Math.max(...legendas.map((l) => l.length)) * 3.6
        novaPaginaSePreciso(alturaFoto + altLegenda + 6)
        par.forEach((_, j) => {
          const x0 = MARGEM + j * (larguraFoto + 6)
          const img = imgs[j]
          if (img) {
            const escala = Math.min(larguraFoto / img.w, alturaFoto / img.h)
            const w = img.w * escala
            const h = img.h * escala
            doc.addImage(img.data, 'JPEG', x0 + (larguraFoto - w) / 2, y + (alturaFoto - h) / 2, w, h, undefined, 'FAST')
          } else {
            doc.setDrawColor(200)
            doc.rect(x0, y, larguraFoto, alturaFoto)
          }
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          legendas[j].forEach((l, n) => doc.text(l, x0 + larguraFoto / 2, y + alturaFoto + 4 + n * 3.6, { align: 'center' }))
        })
        y += alturaFoto + altLegenda + 6
      }
    }
  }

  // ---------- 8. não conformidades ----------
  let secao = fotos.length ? 8 : 7
  titulo(`${secao++}. NÃO CONFORMIDADES E SOLUÇÕES TÉCNICAS`)
  if (problemas.length) {
    autoTable(doc, {
      startY: y,
      head: [['O QUE FOI ENCONTRADO?', 'POR QUE É UM PROBLEMA?', objetivo.valor === 'recebimento_novo' ? 'O QUE A CONSTRUTORA DEVE FAZER?' : 'O QUE DEVE SER FEITO?']],
      body: problemas.map((p) => [
        `${p.ambiente}: ${p.observacao?.trim() || p.descricao}`,
        p.impacto ?? '',
        p.solucao ?? '',
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [55, 65, 81], fontSize: 8 },
      margin: { left: MARGEM, right: MARGEM },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
  } else {
    paragrafo('Não foram identificadas não conformidades nos itens verificados.')
  }

  // ---------- avanço físico (obra) ----------
  if (obra && (v.avanco_previsto != null || v.avanco_executado != null)) {
    titulo(`${secao++}. AVANÇO FÍSICO`)
    paragrafo(
      `Avanço físico previsto no cronograma: ${v.avanco_previsto ?? '-'}%. Avanço executado estimado: ${v.avanco_executado ?? '-'}%.`,
    )
  }

  // ---------- laudo ----------
  titulo(`${secao++}. LAUDO`)
  if (v.laudo_resumo) paragrafo(v.laudo_resumo)
  const unicos = Array.from(new Set(problemas.map((p) => (p.observacao?.trim() || p.descricao).toLowerCase())))
  unicos.forEach((p) => marcador(p.charAt(0).toUpperCase() + p.slice(1)))
  paragrafo(recomendacaoFinal(dados))

  // ---------- conclusão: só o que o vistoriador escolheu ----------
  titulo(`${secao++}. CONCLUSÕES`)
  let sub = 1
  const nSecao = secao - 1
  if (v.incluir_resumo) {
    const sintese = montarSintese(dados)
    subtitulo(`${nSecao}.${sub++} Síntese da inspeção`)
    sintese.paragrafos.forEach((p) => paragrafo(p))
    if (sintese.grupos.length) {
      novaPaginaSePreciso(14 + sintese.grupos.length * 9)
      autoTable(doc, {
        rowPageBreak: 'avoid',
        startY: y,
        head: [['SISTEMA', 'OCORRÊNCIAS', 'NORMA DE REFERÊNCIA', 'PRIORIDADE']],
        body: sintese.grupos.map((g) => [g.sistema, `${g.ocorrencias.length} – ${Array.from(new Set(g.ocorrencias.map((o) => o.ambiente))).join(', ')}`, g.normas, g.prioridade]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.6 },
        headStyles: { fillColor: [55, 65, 81], fontSize: 8 },
        columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' }, 2: { cellWidth: 46 }, 3: { cellWidth: 22, halign: 'center' } },
        margin: { left: MARGEM, right: MARGEM },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
    }
  }
  const constatacoes = (v.conclusoes_tecnicas ?? []).filter((c) => c.texto.trim())
  if (constatacoes.length) {
    subtitulo(`${nSecao}.${sub++} Constatações técnicas`)
    constatacoes.forEach((c, i) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const linhas = doc.splitTextToSize(c.texto.trim(), UTIL - 7) as string[]
      linhas.forEach((l, k) => {
        novaPaginaSePreciso(5)
        if (k === 0) {
          doc.setFont('helvetica', 'bold')
          doc.text(`${i + 1}.`, MARGEM + 1, y)
          doc.setFont('helvetica', 'normal')
        }
        doc.text(l, MARGEM + 7, y)
        y += 4.2
      })
      y += 1.5
    })
    y += 1
  }
  if (v.conclusao?.trim()) {
    if (sub > 1) subtitulo(`${nSecao}.${sub++} Parecer`)
    paragrafo(v.conclusao.trim())
  }
  if (v.grau_risco) {
    const g = GRAU_RISCO[v.grau_risco]
    novaPaginaSePreciso(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`GRAU DE RISCO GLOBAL: ${g.rotulo}`, MARGEM, y)
    y += 5
    paragrafo(`Classificação conforme a ABNT NBR 16747: ${g.texto}.`)
  }
  if (obra && v.proxima_vistoria) paragrafo(`Recomenda-se nova vistoria: ${v.proxima_vistoria}.`)

  // ---------- encerramento ----------
  novaPaginaSePreciso(65) // mantém o texto de encerramento junto da assinatura
  titulo(`${secao++}. ENCERRAMENTO`)
  const quem = [resp.nome, resp.titulo, resp.registro, resp.conselho].filter(Boolean).join(', ')
  paragrafo(`Este ${objetivo.documento} é composto por ${ALIAS_TOTAL} páginas e foi elaborado por ${quem}.`)
  y += 18
  doc.setDrawColor(0)
  doc.line(LARGURA / 2 - 45, y, LARGURA / 2 + 45, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(resp.nome.toUpperCase(), LARGURA / 2, y + 5, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  const linhasAss = [resp.titulo, [resp.registro, resp.conselho].filter(Boolean).join(' · '), 'Responsável pela elaboração do relatório']
  const cidade = v.local_emissao || vistoriador?.cidade_base || v.cidade || ''
  linhasAss.push(`${cidade}${cidade ? ', ' : ''}${dataPorExtenso(new Date().toLocaleDateString('sv-SE'))}`)
  linhasAss.filter(Boolean).forEach((l, k) => doc.text(l, LARGURA / 2, y + 9.5 + k * 4.5, { align: 'center' }))

  // ---------- rodapé em todas as páginas ----------
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(120, 120, 120)
    // Cabeçalho: nome/marca e registro técnico do responsável
    const topo = (vistoriador?.cabecalho?.trim() || 'WS GESTÃO DE OBRAS').toUpperCase()
    doc.setFont('helvetica', 'bold')
    doc.text(topo, MARGEM, 9)
    doc.setFont('helvetica', 'normal')
    doc.text([resp.nome, resp.registro].filter(Boolean).join('  ·  '), LARGURA - MARGEM, 9, { align: 'right' })
    doc.setDrawColor(COR[0], COR[1], COR[2])
    doc.setLineWidth(0.4)
    doc.line(MARGEM, 11, LARGURA - MARGEM, 11)
    doc.setLineWidth(0.2)
    doc.text(`${v.cliente_nome} · ${formatarData(v.data_vistoria)}`, MARGEM, ALTURA - 8)
    doc.text(`Página ${p} de ${ALIAS_TOTAL}`, LARGURA - MARGEM, ALTURA - 8, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }
  doc.putTotalPages(ALIAS_TOTAL)

  aoProgresso?.('Pronto')
  return doc.output('blob')
}

export function nomeArquivoLaudo(d: VistoriaCompleta) {
  const base = `${d.vistoria.tipo === 'andamento' ? 'RELATORIO DE OBRA' : 'RELATORIO DE VISTORIA'} - ${d.vistoria.cliente_nome} - ${formatarData(d.vistoria.data_vistoria).replace(/\//g, '-')}`
  return base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s.-]/g, '').toUpperCase() + '.pdf'
}
