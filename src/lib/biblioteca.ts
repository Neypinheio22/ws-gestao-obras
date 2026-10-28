// Biblioteca do laudo: itens de inspeção e constatações técnicas, agrupados por sistema
// construtivo com a norma de referência. Nada entra no laudo sem o vistoriador marcar.
// Base: ABNT NBR 15575 (desempenho), NBR 16747 (inspeção predial) e as normas de cada sistema;
// roteiros de vistoria de recebimento e cadernos técnicos de inspeção (IBAPE).
import { ETAPAS_ANDAMENTO, type TipoVistoria } from './modelos'
import { supabase } from './supabase'

export interface GrupoBiblioteca {
  sistema: string
  norma: string
  textos: string[]
}

// ---------- Itens a verificar (vistoria de imóvel) ----------

export const ITENS_RECEBIMENTO: GrupoBiblioteca[] = [
  {
    sistema: 'Pisos e revestimentos',
    norma: 'NBR 13753 / NBR 13754 / NBR 15575-3',
    textos: [
      'PISOS E REVESTIMENTOS (REJUNTE, IRREGULARIDADES E NÍVEL)',
      'PISO – PLANEZA E DESNÍVEL ENTRE PEÇAS (DENTE)',
      'PISO – SOM CAVO À PERCUSSÃO (PEÇAS OCAS)',
      'PISO – PEÇAS TRINCADAS, LASCADAS OU MANCHADAS',
      'REJUNTE (FALHAS, FISSURAS, AUSÊNCIA)',
      'RODAPÉS (FIXAÇÃO E ACABAMENTO)',
      'SOLEIRAS E PEITORIS',
      'CAIMENTO DO PISO EM ÁREA MOLHADA',
      'REVESTIMENTO CERÂMICO DE PAREDE (AZULEJO)',
      'PISO LAMINADO / VINÍLICO / MADEIRA',
    ],
  },
  {
    sistema: 'Pintura e vedações',
    norma: 'NBR 13245 / NBR 7200',
    textos: [
      'PAREDES E RODAPÉ (PINTURA E EMASSAMENTO)',
      'FORRO (PINTURA E EMASSAMENTO)',
      'FORRO DE GESSO (FISSURAS, JUNTAS, NIVELAMENTO)',
      'PAREDES – PRUMO E PLANEZA',
      'MANCHAS, BOLOR OU EFLORESCÊNCIA',
      'FACHADA (REVESTIMENTO E PINTURA)',
    ],
  },
  {
    sistema: 'Estrutura',
    norma: 'NBR 6118 / NBR 15575-2',
    textos: [
      'ESTRUTURA (FISSURAS, RACHADURAS, DESPLACAMENTO)',
      'FISSURAS EM PAREDES',
      'FISSURAS NO TETO / LAJE',
      'VIGAS E PILARES APARENTES',
      'ARMADURA EXPOSTA OU CORROSÃO',
    ],
  },
  {
    sistema: 'Impermeabilização e umidade',
    norma: 'NBR 9575 / NBR 9574',
    textos: [
      'MANCHAS DE UMIDADE OU INFILTRAÇÃO',
      'ÁREA DO BOX (ESTANQUEIDADE)',
      'VARANDA / SACADA (CAIMENTO E RALOS)',
      'TERRAÇO / COBERTURA',
    ],
  },
  {
    sistema: 'Instalações hidrossanitárias',
    norma: 'NBR 5626 / NBR 8160',
    textos: [
      'TORNEIRAS, SIFÃO E REGISTROS (PRESSÃO E VAZAMENTOS)',
      'LOUÇAS E METAIS (BANCADAS, CUBAS)',
      'CHUVEIRO E DESCARGA',
      'BACIA SANITÁRIA (FIXAÇÃO E VEDAÇÃO)',
      'RALOS (ESCOAMENTO E FECHO HÍDRICO)',
      'PONTOS DE ÁGUA PARA MÁQUINAS',
      'AQUECEDOR / ÁGUA QUENTE',
    ],
  },
  {
    sistema: 'Instalações elétricas',
    norma: 'NBR 5410',
    textos: [
      'TOMADAS, INTERRUPTORES E LÂMPADAS',
      'TOMADAS (FUNCIONAMENTO E POLARIDADE)',
      'PONTOS DE ILUMINAÇÃO',
      'QUADRO DG (IDENTIFICAÇÃO DOS CIRCUITOS E DR)',
      'INTERFONE E CAMPAINHA',
      'PONTOS DE TV E DADOS',
      'PONTO DE AR-CONDICIONADO',
    ],
  },
  {
    sistema: 'Esquadrias',
    norma: 'NBR 10821 / NBR 15930 / NBR 7199',
    textos: [
      'PORTAS (FECHADURAS E AVARIAS)',
      'JANELAS E ESQUADRIAS (TRILHO, TRAVA, VIDROS)',
      'PORTA DE ENTRADA',
      'PORTAS DE CORRER / VARANDA',
      'VIDROS (RISCOS, TRINCAS, FIXAÇÃO)',
      'ALIZARES E GUARNIÇÕES',
      'VEDAÇÃO CONTRA ÁGUA DE CHUVA',
    ],
  },
  {
    sistema: 'Segurança e acessibilidade',
    norma: 'NBR 14718 / NBR 9050',
    textos: ['GUARDA CORPO (FIXAÇÃO E ACABAMENTO)', 'GUARDA-CORPO – ALTURA MÍNIMA', 'CORRIMÃO', 'DESNÍVEIS E DEGRAUS'],
  },
  {
    sistema: 'Gás',
    norma: 'NBR 15526',
    textos: ['PONTO DE GÁS (ESPERA E REGISTRO)', 'VENTILAÇÃO PERMANENTE DO AMBIENTE COM GÁS'],
  },
  {
    sistema: 'Móveis, equipamentos e áreas externas',
    norma: 'NBR 15575-1',
    textos: ['MÓVEIS E EQUIPAMENTOS', 'ARMÁRIOS PLANEJADOS', 'ELETRODOMÉSTICOS (LOCAÇÃO)', 'PORTÃO E ACESSOS', 'CALÇADA E PISO EXTERNO', 'MUROS E GRADIL'],
  },
]

export function gruposDeItens(tipo: TipoVistoria): GrupoBiblioteca[] {
  if (tipo === 'andamento') return ETAPAS_ANDAMENTO.map((e) => ({ sistema: e.nome, norma: normaDaEtapa(e.nome), textos: e.itens }))
  return ITENS_RECEBIMENTO
}

function normaDaEtapa(nome: string) {
  const mapa: [RegExp, string][] = [
    [/canteiro/i, 'NR-18'],
    [/funda/i, 'NBR 6122'],
    [/estrutura/i, 'NBR 6118 / NBR 14931'],
    [/alvenaria/i, 'NBR 8545'],
    [/cobertura/i, 'NBR 15575-5'],
    [/impermeab/i, 'NBR 9575 / NBR 9574'],
    [/hidro/i, 'NBR 5626 / NBR 8160'],
    [/el[eé]tric/i, 'NBR 5410'],
    [/revestiment/i, 'NBR 7200 / NBR 13753 / NBR 13754'],
    [/esquadria/i, 'NBR 10821'],
    [/pintura/i, 'NBR 13245'],
  ]
  return mapa.find(([r]) => r.test(nome))?.[1] ?? ''
}

// Em qual sistema da biblioteca um item cai (para sugerir as constatações certas).
export function sistemaDoItem(tipo: TipoVistoria, descricao: string): string | null {
  const d = descricao.trim().toUpperCase()
  for (const g of gruposDeItens(tipo)) if (g.textos.some((t) => t.toUpperCase() === d)) return g.sistema
  return null
}

// ---------- Constatações técnicas (vão para a conclusão do laudo) ----------

export const CONCLUSOES: GrupoBiblioteca[] = [
  {
    sistema: 'Pisos e revestimentos',
    norma: 'NBR 13753 / NBR 13754 / NBR 15575-3',
    textos: [
      'Constatou-se desnivelamento entre placas cerâmicas adjacentes (dente), em desacordo com os critérios de planeza e assentamento da ABNT NBR 13753, o que favorece tropeços, acúmulo de sujeira e quebra de bordas.',
      'Foram identificadas placas com som cavo à percussão, indicando falha de aderência da argamassa colante (preenchimento insuficiente do tardoz), em desacordo com a ABNT NBR 13753/13754, com risco de destacamento das peças.',
      'O rejuntamento apresenta falhas, fissuras ou ausência em trechos, comprometendo a estanqueidade do revestimento e permitindo a infiltração de água sob as placas (ABNT NBR 13753/13754).',
      'Foram constatadas placas trincadas, lascadas ou manchadas, que devem ser substituídas por peças do mesmo lote e tonalidade.',
      'O piso das áreas molhadas não apresenta caimento adequado em direção aos ralos, ocasionando empoçamento de água, em desacordo com a ABNT NBR 15575-3.',
    ],
  },
  {
    sistema: 'Pintura e vedações',
    norma: 'NBR 13245 / NBR 7200',
    textos: [
      'A pintura apresenta falhas de cobrimento, manchas, escorrimentos ou diferenças de tonalidade, em desacordo com os requisitos de execução da ABNT NBR 13245.',
      'O emassamento apresenta ondulações e imperfeições visíveis sob luz rasante, indicando preparo inadequado da superfície antes da pintura (ABNT NBR 13245).',
      'Foram observados retoques de pintura com tonalidade diferente do restante do pano, recomendando-se a repintura do pano inteiro, de quina a quina.',
      'Foram constatadas manchas de bolor, mofo ou eflorescência, indicativas da presença de umidade, cuja origem deve ser identificada e eliminada antes da recomposição do acabamento.',
    ],
  },
  {
    sistema: 'Estrutura',
    norma: 'NBR 6118 / NBR 15575-2',
    textos: [
      'As fissuras observadas apresentam pequena abertura e configuração típica de movimentação térmica ou retração de argamassa, sem indícios aparentes de comprometimento estrutural, demandando tratamento e monitoramento (ABNT NBR 15575-2).',
      'Foram observadas fissuras com configuração que pode indicar comprometimento estrutural (inclinadas, em vigas, pilares ou lajes, ou com abertura relevante), recomendando-se avaliação por engenheiro estrutural antes de qualquer reparo.',
      'Constatou-se armadura exposta e/ou desplacamento do concreto, indicando cobrimento insuficiente e risco de corrosão, em desacordo com a ABNT NBR 6118; requer tratamento das armaduras e recomposição do cobrimento.',
      'Não foram constatadas anomalias aparentes nos elementos estruturais visíveis na data da vistoria.',
    ],
  },
  {
    sistema: 'Impermeabilização e umidade',
    norma: 'NBR 9575 / NBR 9574',
    textos: [
      'Foram constatadas manchas de umidade e/ou infiltração, indicando falha no sistema de impermeabilização ou nas instalações hidráulicas, em desacordo com a ABNT NBR 9575; a origem deve ser identificada antes do reparo.',
      'A área do box e/ou sacadas apresenta indícios de falha de estanqueidade, recomendando-se teste de estanqueidade com lâmina d’água por 72 horas (ABNT NBR 9574).',
      'Não foram observados sinais aparentes de infiltração ou umidade nas áreas inspecionadas na data da vistoria.',
    ],
  },
  {
    sistema: 'Instalações hidrossanitárias',
    norma: 'NBR 5626 / NBR 8160',
    textos: [
      'Constatou-se vazamento em sifões, engates, registros ou torneiras, em desacordo com a ABNT NBR 5626, com risco de infiltração e danos ao mobiliário.',
      'A pressão e/ou a vazão em pontos de utilização mostrou-se insuficiente para o uso adequado dos aparelhos (ABNT NBR 5626).',
      'Ralos com escoamento deficiente, obstrução ou ausência de fecho hídrico, permitindo retorno de odores, em desacordo com a ABNT NBR 8160.',
      'Louças e bancadas com fixação deficiente ou vedação inadequada, devendo ser refixadas e vedadas.',
    ],
  },
  {
    sistema: 'Instalações elétricas',
    norma: 'NBR 5410',
    textos: [
      'Foram identificadas tomadas, interruptores ou pontos de iluminação sem funcionamento ou com falhas, devendo ser revisados por profissional habilitado (ABNT NBR 5410).',
      'O quadro de distribuição não apresenta identificação dos circuitos e/ou dispositivo DR para circuitos de áreas molhadas, conforme exige a ABNT NBR 5410.',
      'Constatou-se condutores expostos, espelhos soltos ou ausentes, oferecendo risco de choque elétrico aos usuários (ABNT NBR 5410).',
      'As instalações elétricas não puderam ser testadas por ausência de energia no imóvel na data da vistoria, devendo ser verificadas após a ligação.',
    ],
  },
  {
    sistema: 'Esquadrias',
    norma: 'NBR 10821 / NBR 15930 / NBR 7199',
    textos: [
      'Esquadrias com dificuldade de abertura e fechamento, travamento deficiente ou ferragens desreguladas, em desacordo com os requisitos de funcionamento da ABNT NBR 10821.',
      'Foi constatada vedação deficiente das janelas, com possibilidade de entrada de água de chuva, em desacordo com a ABNT NBR 10821.',
      'Portas com empenamento, avarias, folgas irregulares ou fechaduras com mau funcionamento (ABNT NBR 15930).',
      'Vidros com riscos, trincas ou fixação inadequada, devendo ser substituídos ou refixados (ABNT NBR 7199).',
    ],
  },
  {
    sistema: 'Segurança e acessibilidade',
    norma: 'NBR 14718 / NBR 9050',
    textos: [
      'O guarda-corpo apresenta fixação deficiente ou folgas, comprometendo a segurança contra quedas; deve ser corrigido antes do uso do ambiente (ABNT NBR 14718).',
      'O guarda-corpo não atende à altura mínima de 1,10 m exigida pela ABNT NBR 14718, representando risco de queda aos usuários.',
    ],
  },
  {
    sistema: 'Gás',
    norma: 'NBR 15526',
    textos: [
      'A instalação de gás não pôde ser testada por ausência de recipiente ou fornecimento, devendo ser verificada a estanqueidade antes do uso (ABNT NBR 15526).',
      'O ambiente com ponto de gás não apresenta ventilação permanente adequada, conforme exige a ABNT NBR 15526.',
    ],
  },
  {
    sistema: 'Locação',
    norma: 'Lei nº 8.245/1991',
    textos: [
      'As avarias constatadas excedem o desgaste natural decorrente do uso normal do imóvel, sendo de responsabilidade do locatário a sua reparação (art. 23, III, da Lei nº 8.245/1991).',
      'As condições observadas correspondem ao desgaste natural decorrente do uso normal do imóvel, não configurando dano a ser reparado pelo locatário.',
      'O imóvel foi entregue em condições de uso, e o presente registro servirá de referência para a vistoria de devolução.',
    ],
  },
  {
    sistema: 'Considerações gerais',
    norma: 'NBR 15575-1 / NBR 16747 / CDC',
    textos: [
      'As anomalias constatadas são de origem construtiva (endógena), decorrentes de falhas de execução, e não de uso ou falta de manutenção.',
      'As anomalias constatadas decorrem de falta de manutenção ou de uso inadequado, devendo ser incluídas no plano de manutenção da edificação (ABNT NBR 5674).',
      'Os vícios aparentes constatados devem ser comunicados formalmente à construtora dentro do prazo legal de 90 dias para bens duráveis (art. 26 do Código de Defesa do Consumidor) e dos prazos de garantia indicados na ABNT NBR 15575-1.',
      'Não foram constatadas anomalias que comprometam a segurança, a habitabilidade ou a durabilidade da edificação na data da vistoria.',
      'Recomenda-se nova vistoria após a execução das correções, para verificação do atendimento aos apontamentos deste laudo.',
    ],
  },
]

// ---------- Biblioteca própria do vistoriador (salva no banco) ----------

export interface EntradaBiblioteca {
  id: string
  tipo: 'item' | 'conclusao'
  sistema: string
  texto: string
}

export async function carregarMinhaBiblioteca(tipo: 'item' | 'conclusao'): Promise<EntradaBiblioteca[]> {
  const { data, error } = await supabase.from('biblioteca').select('id, tipo, sistema, texto').eq('tipo', tipo).order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []) as EntradaBiblioteca[]
}

export async function salvarNaBiblioteca(tipo: 'item' | 'conclusao', sistema: string, texto: string) {
  const { data, error } = await supabase.from('biblioteca').insert({ tipo, sistema, texto }).select('id, tipo, sistema, texto').single()
  if (error) throw new Error(error.message)
  return data as EntradaBiblioteca
}

export async function apagarDaBiblioteca(id: string) {
  const { error } = await supabase.from('biblioteca').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// Junta a biblioteca padrão com a do vistoriador, sistema por sistema.
export function juntarComMinha(base: GrupoBiblioteca[], minha: EntradaBiblioteca[]) {
  const grupos = base.map((g) => ({ ...g, textos: [...g.textos], meus: [] as EntradaBiblioteca[] }))
  for (const e of minha) {
    let g = grupos.find((x) => x.sistema === e.sistema)
    if (!g) {
      g = { sistema: e.sistema, norma: '', textos: [], meus: [] }
      grupos.push(g)
    }
    g.meus.push(e)
  }
  return grupos
}
