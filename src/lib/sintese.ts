// Síntese técnica da vistoria, montada a partir do checklist: contagens, não conformidades
// agrupadas por sistema construtivo com a norma de referência, prioridades e grau de risco sugerido.
import { GRAU_RISCO, SITUACOES, objetivoDaVistoria, situacaoEhProblema } from './modelos'
import type { VistoriaCompleta } from './vistorias'
import { gruposDeItens } from './biblioteca'

export type Grau = 'baixo' | 'medio' | 'critico'
export type Prioridade = 'Alta' | 'Média' | 'Baixa'

interface Sistema {
  nome: string
  chave: RegExp
  normas: string
  recomendacao: string
  seguranca?: boolean // falha neste sistema pode pôr o usuário em risco
}

// A ordem importa: o primeiro sistema que casar com o texto do item é o escolhido.
const SISTEMAS: Sistema[] = [
  { nome: 'Fundações', chave: /funda[cç]/i, normas: 'NBR 6122', recomendacao: 'Avaliar a causa com o projetista e corrigir antes do prosseguimento da obra.', seguranca: true },
  { nome: 'Estrutura', chave: /estrutur|fissur|rachad|trinca|desplac|armadur|concret|laje|pilar|viga/i, normas: 'NBR 6118 / NBR 14931 / NBR 15575-2', recomendacao: 'Investigar a origem das fissuras e manifestações (movimentação, retração ou sobrecarga) e tratá-las conforme diagnóstico, monitorando sua evolução.', seguranca: true },
  { nome: 'Guarda-corpos', chave: /guarda.?corpo/i, normas: 'NBR 14718', recomendacao: 'Corrigir a fixação e o acabamento, garantindo a resistência exigida antes do uso.', seguranca: true },
  { nome: 'Impermeabilização', chave: /impermeab|infiltra|umidade|mofo|bolor|estanque/i, normas: 'NBR 9575 / NBR 9574', recomendacao: 'Identificar o ponto de entrada de água e refazer a impermeabilização no trecho afetado, recompondo os acabamentos.' },
  { nome: 'Instalações elétricas', chave: /el[eé]tric|tomada|interruptor|l[aâ]mpada|quadro|disjunt|ilumina/i, normas: 'NBR 5410', recomendacao: 'Revisar a instalação com profissional habilitado, testando circuitos, tomadas e dispositivos de proteção.', seguranca: true },
  { nome: 'Instalações hidrossanitárias', chave: /hidr[aá]ul|torneira|sif[aã]o|registro|chuveiro|descarga|ralo|vazament|esgoto|lou[cç]a|cuba|bancada|engate|tubula/i, normas: 'NBR 5626 / NBR 8160', recomendacao: 'Substituir ou ajustar componentes com vazamento ou obstrução e testar estanqueidade e vazão.' },
  { nome: 'Esquadrias', chave: /esquadria|janela|porta|fechadura|trilho|vidro|alizar|guarni/i, normas: 'NBR 10821 / NBR 15930', recomendacao: 'Regular, ajustar ou substituir peças e ferragens, garantindo vedação e funcionamento adequados.' },
  { nome: 'Pintura', chave: /pintura|emassa|retoque|forro|parede|rodap/i, normas: 'NBR 13245 / NBR 7200', recomendacao: 'Corrigir a base (emassamento e lixamento) e refazer a pintura no pano inteiro para evitar manchas de retoque.' },
  { nome: 'Revestimentos cerâmicos e pisos', chave: /revestiment|piso|porcelanat|cer[aâ]mic|rejunt|desnivel|desalinh|azulej/i, normas: 'NBR 13753 / NBR 13754 / NBR 15575-3', recomendacao: 'Substituir as peças danificadas ou desniveladas e refazer o rejuntamento nos pontos indicados.' },
  { nome: 'Alvenaria', chave: /alvenaria|bloco|tijolo|prumo|esquadro/i, normas: 'NBR 8545 / NBR 15575-4', recomendacao: 'Corrigir prumo, alinhamento e amarrações antes do revestimento.' },
  { nome: 'Cobertura', chave: /cobertura|telhad|telha|calha|rufo/i, normas: 'NBR 15575-5', recomendacao: 'Revisar fixações, sobreposições e caimentos, eliminando pontos de entrada de água.' },
]
const OUTROS: Sistema = { nome: 'Outros itens', chave: /./, normas: 'NBR 15575', recomendacao: 'Corrigir conforme descrito na tabela de não conformidades.' }

export interface Ocorrencia {
  ambiente: string
  texto: string
  grave: boolean
}

export interface GrupoSistema {
  sistema: string
  normas: string
  recomendacao: string
  prioridade: Prioridade
  ocorrencias: Ocorrencia[]
}

export interface Sintese {
  ambientes: number
  totalItens: number
  avaliados: number
  semAvaliar: number
  contagem: { rotulo: string; qtd: number }[]
  problemas: number
  graves: number
  grupos: GrupoSistema[]
  grauSugerido: Grau
  paragrafos: string[]
}

const ORDEM_PRIORIDADE: Record<Prioridade, number> = { Alta: 0, Média: 1, Baixa: 2 }

function lista(nomes: string[]) {
  if (nomes.length <= 1) return nomes.join('')
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

export function montarSintese({ vistoria: v, ambientes, itens }: VistoriaCompleta): Sintese {
  const obra = v.tipo === 'andamento'
  const opcoes = SITUACOES[v.tipo]
  const avaliados = itens.filter((i) => i.situacao)
  const contagem = opcoes.map((o) => ({ rotulo: o.rotulo, qtd: itens.filter((i) => i.situacao === o.valor).length }))

  // Quando o item veio da biblioteca, usa o sistema e a norma dela; senão classifica pelo texto.
  const bib = gruposDeItens(v.tipo)
  const porNome = new Map<string, Sistema>()
  const grupos = new Map<Sistema, Ocorrencia[]>()
  for (const a of ambientes) {
    for (const i of itens.filter((x) => x.ambiente_id === a.id && situacaoEhProblema(v.tipo, x.situacao))) {
      const texto = i.observacao?.trim() || i.descricao
      const pelaChave = SISTEMAS.find((s) => s.chave.test(`${i.descricao} ${i.observacao ?? ''}`)) ?? OUTROS
      const g = bib.find((x) => x.sistema === i.sistema)
      const nome = g?.sistema ?? pelaChave.nome
      if (!porNome.has(nome)) porNome.set(nome, g ? { ...pelaChave, nome, normas: g.norma || pelaChave.normas } : pelaChave)
      const sistema = porNome.get(nome)!
      // No recebimento, "Ruim" é a falha grave; na obra, toda NC em sistema de segurança é grave.
      const grave = obra ? !!sistema.seguranca : i.situacao === 'ruim'
      if (!grupos.has(sistema)) grupos.set(sistema, [])
      grupos.get(sistema)!.push({ ambiente: a.nome, texto, grave })
    }
  }

  const lista_grupos: GrupoSistema[] = Array.from(grupos.entries())
    .map(([s, ocs]) => {
      const algumaGrave = ocs.some((o) => o.grave)
      const prioridade: Prioridade = (s.seguranca && (algumaGrave || obra)) || (algumaGrave && ocs.length >= 2) ? 'Alta' : algumaGrave || s.seguranca ? 'Média' : 'Baixa'
      return { sistema: s.nome, normas: s.normas, recomendacao: s.recomendacao, prioridade, ocorrencias: ocs }
    })
    .sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] || b.ocorrencias.length - a.ocorrencias.length)

  const problemas = lista_grupos.reduce((n, g) => n + g.ocorrencias.length, 0)
  const graves = lista_grupos.reduce((n, g) => n + g.ocorrencias.filter((o) => o.grave).length, 0)
  const segurancaGrave = Array.from(grupos.entries()).some(([s, ocs]) => s.seguranca && ocs.some((o) => o.grave))
  const segurancaQualquer = Array.from(grupos.keys()).some((s) => s.seguranca)
  const grauSugerido: Grau = segurancaGrave ? 'critico' : segurancaQualquer || graves >= 5 ? 'medio' : 'baixo'

  // ---------- texto ----------
  const unidade = obra ? 'etapas' : 'ambientes'
  const pct = avaliados.length ? Math.round((problemas / avaliados.length) * 100) : 0
  const contagemTexto = lista(contagem.filter((c) => c.qtd).map((c) => `${c.qtd} como ${c.rotulo.toLowerCase()}`))
  const paragrafos: string[] = []
  paragrafos.push(
    `Foram inspecionados ${itens.length} itens distribuídos em ${ambientes.length} ${unidade}. ` +
      (avaliados.length ? `Dos ${avaliados.length} itens avaliados, ${contagemTexto}` : 'Nenhum item foi avaliado') +
      (problemas ? `, totalizando ${problemas} ${problemas === 1 ? 'não conformidade' : 'não conformidades'} (${pct}% dos itens avaliados).` : '. Não foram identificadas não conformidades.') +
      (itens.length - avaliados.length > 0 ? ` ${itens.length - avaliados.length} itens não puderam ser avaliados nesta vistoria.` : ''),
  )
  if (lista_grupos.length) {
    paragrafos.push(
      `As não conformidades concentram-se nos seguintes sistemas: ${lista(lista_grupos.map((g) => `${g.sistema.toLowerCase()} (${g.ocorrencias.length})`))}. ` +
        `Cada sistema foi analisado à luz da norma técnica correspondente, indicada no quadro abaixo, e classificado quanto à prioridade de correção.`,
    )
    const altas = lista_grupos.filter((g) => g.prioridade === 'Alta').map((g) => g.sistema.toLowerCase())
    if (altas.length) {
      paragrafos.push(
        `Apresentam prioridade alta os itens de ${lista(altas)}, por envolverem ${segurancaGrave || segurancaQualquer ? 'risco potencial à segurança dos usuários ou ' : ''}perda de desempenho ou de funcionalidade, devendo ser corrigidos em primeiro lugar.`,
      )
    }
  }
  return {
    ambientes: ambientes.length,
    totalItens: itens.length,
    avaliados: avaliados.length,
    semAvaliar: itens.length - avaliados.length,
    contagem,
    problemas,
    graves,
    grupos: lista_grupos,
    grauSugerido,
    paragrafos,
  }
}

// Fechamento do laudo conforme a finalidade da vistoria.
export function recomendacaoFinal(d: VistoriaCompleta): string {
  const obj = objetivoDaVistoria(d.vistoria).valor
  switch (obj) {
    case 'locacao_entrada':
      return 'Recomenda-se que locador e locatário conservem este laudo, com o registro fotográfico, para comparação na vistoria de devolução do imóvel. Os vícios aqui apontados não são de responsabilidade do locatário.'
    case 'locacao_devolucao':
      return 'Os reparos de responsabilidade do locatário devem ser executados ou indenizados antes da entrega definitiva das chaves, ressalvado o desgaste natural decorrente do uso normal do imóvel (art. 23, III, da Lei nº 8.245/1991).'
    case 'cautelar_vizinhanca':
      return 'Este registro deve ser preservado pelas partes como referência para a avaliação de eventuais danos surgidos durante ou após a execução da obra vizinha. Recomenda-se nova vistoria ao término dos serviços.'
    case 'inspecao_predial':
      return 'Recomenda-se que as intervenções sejam incorporadas ao plano de manutenção da edificação, conforme a ABNT NBR 5674, executando-as na ordem de prioridade indicada.'
    case 'pos_reforma':
      return 'Recomenda-se que as correções sejam executadas pelo responsável pela reforma antes do aceite final e da quitação dos serviços.'
    case 'obra_andamento':
      return 'Recomendamos que as correções sejam feitas antes que os serviços sejam cobertos pelas etapas seguintes. Esta vistoria seguiu as diretrizes da ABNT NBR 16747 e as normas de execução listadas no item 1.1.'
    default:
      return 'Recomendamos que o construtor realize os devidos ajustes e correções necessários para manter a qualidade, segurança e conforto do imóvel para os moradores. Esta vistoria seguiu as normas e diretrizes listadas no item 1.1, em especial a ABNT NBR 15575, que estabelece requisitos de desempenho da edificação.'
  }
}

// Texto sugerido para o parecer da conclusão (o Werlisson pode editar depois).
export function sugerirConclusao(d: VistoriaCompleta, s: Sintese, grau: Grau): string {
  const v = d.vistoria
  const g = GRAU_RISCO[grau]
  const data = v.data_vistoria.split('-').reverse().join('/')
  const alvo = v.tipo === 'andamento' ? 'a obra' : `o imóvel de ${v.cliente_nome}`
  const partes = [
    `Com base na inspeção visual realizada em ${data}, ${s.problemas ? `verificou-se que ${s.problemas} dos ${s.avaliados} itens avaliados apresentam não conformidades, concentradas em ${lista(s.grupos.slice(0, 4).map((x) => x.sistema.toLowerCase()))}` : 'não foram verificadas não conformidades nos itens avaliados'}.`,
    s.grupos.length
      ? `As anomalias identificadas ${s.graves ? `incluem ${s.graves} ${s.graves === 1 ? 'ocorrência classificada' : 'ocorrências classificadas'} como de maior gravidade e ` : ''}foram relacionadas às normas técnicas de referência de cada sistema, com as respectivas recomendações de correção.`
      : '',
    `Diante do exposto, classificamos ${alvo}, de maneira global, com GRAU DE RISCO ${g.rotulo}, ou seja, ${g.texto}.`,
    recomendacaoFinal(d),
  ]
  return partes.filter(Boolean).join(' ')
}
