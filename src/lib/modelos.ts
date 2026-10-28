// Modelos de laudo: ambientes/etapas, checklist e textos fixos.
// O modelo de recebimento segue o laudo que o Werlisson já usa; o de obra em andamento
// segue o modelo montado a partir de laudos de acompanhamento e das normas ABNT.

export type TipoVistoria = 'recebimento' | 'andamento'

export interface OpcaoSituacao {
  valor: string
  rotulo: string
  curto: string
  problema: boolean // entra em "não conformidades"
}

export const SITUACOES: Record<TipoVistoria, OpcaoSituacao[]> = {
  recebimento: [
    { valor: 'boa', rotulo: 'Boa', curto: 'Boa', problema: false },
    { valor: 'regular', rotulo: 'Regular', curto: 'Reg.', problema: true },
    { valor: 'ruim', rotulo: 'Ruim', curto: 'Ruim', problema: true },
  ],
  andamento: [
    { valor: 'conforme', rotulo: 'Conforme', curto: 'C', problema: false },
    { valor: 'nao_conforme', rotulo: 'Não conforme', curto: 'NC', problema: true },
    { valor: 'na', rotulo: 'Não se aplica', curto: 'NA', problema: false },
    { valor: 'ne', rotulo: 'Não executado', curto: 'NE', problema: false },
  ],
}

export function situacaoEhProblema(tipo: TipoVistoria, situacao: string | null): boolean {
  return SITUACOES[tipo].some((s) => s.valor === situacao && s.problema)
}

// ---------- Recebimento de imóvel ----------

const BASE_RECEBIMENTO = [
  'TOMADAS, INTERRUPTORES E LÂMPADAS',
  'PAREDES E RODAPÉ (PINTURA E EMASSAMENTO)',
  'FORRO (PINTURA E EMASSAMENTO)',
  'PORTAS (FECHADURAS E AVARIAS)',
  'PISOS E REVESTIMENTOS (REJUNTE, IRREGULARIDADES E NÍVEL)',
  'ESTRUTURA (FISSURAS, RACHADURAS, DESPLACAMENTO)',
  'JANELAS E ESQUADRIAS (TRILHO, TRAVA, VIDROS)',
]
const LOUCAS = 'LOUÇAS E METAIS (BANCADAS, CUBAS)'
const TORNEIRAS = 'TORNEIRAS, SIFÃO E REGISTROS (PRESSÃO E VAZAMENTOS)'
const CHUVEIRO = 'CHUVEIRO E DESCARGA'
const MOVEIS = 'MÓVEIS E EQUIPAMENTOS'
const GUARDA_CORPO = 'GUARDA CORPO (FIXAÇÃO E ACABAMENTO)'

export const TIPOS_AMBIENTE: { nome: string; itens: string[] }[] = [
  { nome: 'Sala', itens: [...BASE_RECEBIMENTO, MOVEIS, 'QUADRO DG'] },
  { nome: 'Cozinha', itens: [...BASE_RECEBIMENTO, LOUCAS, TORNEIRAS, MOVEIS] },
  { nome: 'Banheiro / Lavabo', itens: [...BASE_RECEBIMENTO, LOUCAS, TORNEIRAS, CHUVEIRO, MOVEIS] },
  { nome: 'Suíte', itens: [...BASE_RECEBIMENTO, LOUCAS, TORNEIRAS, CHUVEIRO, MOVEIS] },
  { nome: 'Quarto', itens: [...BASE_RECEBIMENTO, MOVEIS] },
  { nome: 'Varanda', itens: [...BASE_RECEBIMENTO, GUARDA_CORPO] },
  { nome: 'Varanda gourmet', itens: [...BASE_RECEBIMENTO, TORNEIRAS, GUARDA_CORPO] },
  { nome: 'Área de serviço', itens: [...BASE_RECEBIMENTO, TORNEIRAS, GUARDA_CORPO] },
  { nome: 'Hall / Circulação', itens: [...BASE_RECEBIMENTO] },
  { nome: 'Fachada / Área externa', itens: ['FACHADA (REVESTIMENTO E PINTURA)', 'ESTRUTURA (FISSURAS, RACHADURAS, DESPLACAMENTO)', 'PORTÃO E ACESSOS', 'CALÇADA E PISO EXTERNO'] },
  { nome: 'Outro', itens: [...BASE_RECEBIMENTO] },
]

function itensDoTipo(nomeTipo: string) {
  return TIPOS_AMBIENTE.find((t) => t.nome === nomeTipo)?.itens ?? BASE_RECEBIMENTO
}

// ---------- Obra em andamento ----------

export const ETAPAS_ANDAMENTO: { nome: string; itens: string[] }[] = [
  {
    nome: 'Canteiro e segurança (NR-18)',
    itens: ['Uso de EPI', 'Guarda-corpo e proteção de periferia', 'Andaimes', 'Instalação elétrica provisória', 'Armazenamento de materiais (cimento, aço, blocos)', 'Limpeza e descarte de entulho', 'Placa da obra e ART visíveis'],
  },
  {
    nome: 'Fundações',
    itens: ['Locação e gabarito', 'Cota e dimensão de sapatas/blocos', 'Armadura e cobrimento antes da concretagem', 'Impermeabilização de baldrames', 'Aterro e compactação'],
  },
  {
    nome: 'Estrutura (pilares, vigas, lajes)',
    itens: ['Prumo e alinhamento de pilares', 'Dimensões das peças conforme projeto', 'Fôrmas e escoramento', 'Armaduras, espaçadores e cobrimento', 'Concretagem (falhas, ninhos, segregação)', 'Cura do concreto', 'Fissuras', 'Nota fiscal e fck do concreto'],
  },
  {
    nome: 'Alvenaria e vedações',
    itens: ['Prumo, nível e esquadro', 'Amarração entre blocos e com pilares (tela/ferro-cabelo)', 'Juntas de argamassa', 'Vergas e contravergas', 'Encunhamento sob vigas', 'Vãos conforme projeto'],
  },
  {
    nome: 'Cobertura',
    itens: ['Estrutura do telhado', 'Inclinação', 'Fixação das telhas', 'Calhas, rufos e condutores', 'Laje técnica'],
  },
  {
    nome: 'Impermeabilização',
    itens: ['Regularização e caimento do substrato', 'Arremates em ralos, rodapés e soleiras', 'Teste de estanqueidade (lâmina d’água 72 h)', 'Proteção mecânica'],
  },
  {
    nome: 'Instalações hidrossanitárias',
    itens: ['Tubulação conforme projeto (diâmetros, caimento)', 'Teste de pressão/estanqueidade antes de fechar', 'Proteção das esperas', 'Caixas de inspeção e gordura', 'Ventilação do esgoto'],
  },
  {
    nome: 'Instalações elétricas',
    itens: ['Eletrodutos e caixas conforme projeto', 'Quadro de distribuição', 'Aterramento', 'Bitola dos cabos', 'Separação de circuitos'],
  },
  {
    nome: 'Revestimentos',
    itens: ['Chapisco, reboco e espessura', 'Prumo e planeza', 'Contrapiso (nível e caimento)', 'Assentamento cerâmico (dupla colagem, juntas, desnível, som cavo)', 'Rejuntamento'],
  },
  {
    nome: 'Esquadrias',
    itens: ['Dimensões do vão', 'Prumo e nivelamento', 'Fixação e vedação', 'Funcionamento', 'Proteção durante a obra'],
  },
  {
    nome: 'Pintura e acabamentos',
    itens: ['Preparo da superfície (massa, lixamento)', 'Uniformidade', 'Manchas e ondulações', 'Louças, metais e acabamentos elétricos'],
  },
]

export function itensParaNovoAmbiente(tipo: TipoVistoria, tipoAmbiente: string): string[] {
  if (tipo === 'andamento') return ETAPAS_ANDAMENTO.find((e) => e.nome === tipoAmbiente)?.itens ?? []
  return itensDoTipo(tipoAmbiente)
}

// ---------- Sugestões para não conformidades ----------

export const SUGESTOES_NC: { chave: RegExp; impacto: string; solucao: string }[] = [
  { chave: /sif|vazament|engate/i, impacto: 'Pode causar infiltrações e mofo em móveis', solucao: 'Substituir componentes ou ajustar' },
  { chave: /revestiment|piso|desnivel|desalinh/i, impacto: 'Acidentes ou danificação da mobília', solucao: 'Substituir as peças registradas' },
  { chave: /pintura|emassamento|retoque|ondula/i, impacto: 'Prejudica a estética', solucao: 'Nivelar com nova demão e refazer a pintura' },
  { chave: /esquadria|janela|alizar|acabamento|porta/i, impacto: 'Prejudica a estética e o funcionamento', solucao: 'Instalar os itens necessários para um bom funcionamento' },
  { chave: /ralo|obstru/i, impacto: 'Acúmulo de água, sujeira e odor', solucao: 'Desobstruir e ajustar para vazão adequada' },
  { chave: /rejunte/i, impacto: 'Permite infiltração e soltura das peças', solucao: 'Refazer o rejuntamento nos pontos indicados' },
  { chave: /fissur|rachad|trinca/i, impacto: 'Pode indicar falha estrutural ou permitir infiltração', solucao: 'Avaliar a causa e tratar a fissura conforme recomendação técnica' },
  { chave: /tomada|interruptor|lâmpada|lampada|elétric|eletric/i, impacto: 'Risco de choque e mau funcionamento', solucao: 'Revisar e corrigir a instalação elétrica' },
]

export function sugerirNC(texto: string) {
  return SUGESTOES_NC.find((s) => s.chave.test(texto))
}

// ---------- Textos fixos do laudo ----------

export const NORMAS: Record<TipoVistoria, string[]> = {
  recebimento: [
    'ABNT NBR 15575 – Edificações habitacionais: desempenho',
    'ABNT NBR 5674 – Manutenção de edificações: procedimento',
    'ABNT NBR 9574 – Execução de impermeabilização: procedimento',
    'ABNT NBR 7200 – Execução de revestimento de paredes e tetos: procedimento',
    'ABNT NBR 16747 – Inspeção predial: diretrizes, conceitos, terminologia e procedimento',
  ],
  andamento: [
    'ABNT NBR 15575 – Edificações habitacionais: desempenho',
    'ABNT NBR 16747 – Inspeção predial: diretrizes e procedimento',
    'ABNT NBR 6122 – Projeto e execução de fundações',
    'ABNT NBR 6118 e NBR 14931 – Projeto e execução de estruturas de concreto',
    'ABNT NBR 12655 – Concreto: preparo, controle e recebimento',
    'ABNT NBR 8545 – Execução de alvenaria sem função estrutural',
    'ABNT NBR 9575 e NBR 9574 – Impermeabilização: projeto e execução',
    'ABNT NBR 7200 e NBR 13753/13754/13755 – Revestimentos',
    'ABNT NBR 5410 – Instalações elétricas de baixa tensão',
    'ABNT NBR 5626 e NBR 8160 – Instalações de água e esgoto',
    'NR-18 – Segurança e saúde na indústria da construção',
  ],
}

export const TITULO: Record<TipoVistoria, string> = {
  recebimento: 'RELATÓRIO DE VISTORIA DE IMÓVEL',
  andamento: 'RELATÓRIO DE VISTORIA TÉCNICA DE OBRA EM ANDAMENTO',
}

// ---------- Objetivo (finalidade) da vistoria ----------

export interface OpcaoObjetivo {
  valor: string
  rotulo: string
  tipos: TipoVistoria[]
  // Como o laudo se refere a si mesmo no encerramento: "Este laudo técnico de ..."
  documento: string
  texto: string
}

const USO_DO_LAUDO =
  'A utilização parcial, descontextualizada ou sem integridade deste laudo poderá conduzir a interpretações incorretas, não sendo de responsabilidade do profissional signatário quaisquer conclusões decorrentes do uso inadequado do documento. As conclusões e registros constantes neste laudo refletem exclusivamente as condições verificadas durante a inspeção, dentro das limitações técnicas, operacionais e de acesso existentes no momento da vistoria.'

export const OBJETIVOS: OpcaoObjetivo[] = [
  {
    valor: 'recebimento_novo',
    rotulo: 'Recebimento de imóvel novo',
    tipos: ['recebimento'],
    documento: 'laudo técnico de vistoria de recebimento de imóvel',
    texto: 'O presente laudo caracteriza-se pela inspeção predial, tendo como foco central o diagnóstico geral das patologias identificadas no imóvel. São apontadas anomalias construtivas e/ou falhas decorrentes da falta de manutenção, além da análise de riscos oferecidos aos usuários. O resultado consiste na identificação das anomalias e/ou falhas e na proposição de recomendações técnicas que atestem as condições de estabilidade, segurança e conservação adequadas. O documento deve ser utilizado para os fins relacionados ao recebimento de imóvel novo, obedecendo às devidas normas de desempenho, não podendo ser empregado isoladamente para outras finalidades jurídicas, financeiras ou administrativas sem a devida contextualização.',
  },
  {
    valor: 'locacao_entrada',
    rotulo: 'Entrada em imóvel de locação',
    tipos: ['recebimento'],
    documento: 'laudo técnico de vistoria de entrada em imóvel locado',
    texto: 'O presente laudo tem como objetivo registrar, por meio de inspeção visual e relatório fotográfico, o estado de conservação do imóvel, de seus acabamentos, instalações, louças, metais e esquadrias no momento da entrada do locatário. O registro servirá de referência para a comparação na devolução do imóvel, nos termos do art. 22, inciso V, e do art. 23, inciso III, da Lei nº 8.245/1991 (Lei do Inquilinato), permitindo distinguir o desgaste decorrente do uso normal de danos causados durante a locação.',
  },
  {
    valor: 'locacao_devolucao',
    rotulo: 'Devolução de imóvel de locação',
    tipos: ['recebimento'],
    documento: 'laudo técnico de vistoria de devolução de imóvel locado',
    texto: 'O presente laudo tem como objetivo registrar, por meio de inspeção visual e relatório fotográfico, o estado de conservação do imóvel na sua devolução ao locador, ao término da locação. São identificadas as avarias, faltas e alterações existentes em acabamentos, instalações, louças, metais e esquadrias, distinguindo-se, sempre que possível, o desgaste natural decorrente do uso normal daquilo que configura dano, conforme o art. 23, inciso III, da Lei nº 8.245/1991 (Lei do Inquilinato). Quando houver laudo de entrada, este relatório deve ser interpretado em comparação com ele.',
  },
  {
    valor: 'cautelar_vizinhanca',
    rotulo: 'Cautelar de vizinhança',
    tipos: ['recebimento'],
    documento: 'laudo técnico de vistoria cautelar de vizinhança',
    texto: 'O presente laudo tem caráter cautelar e objetiva registrar, por meio de inspeção visual e relatório fotográfico, as condições do imóvel vizinho antes do início de obra ou intervenção nas proximidades, com especial atenção a fissuras, trincas, desaprumos, infiltrações e demais manifestações patológicas preexistentes. O registro servirá como referência técnica para a avaliação de eventuais danos que venham a surgir durante ou após a execução dos serviços, em conformidade com a ABNT NBR 16747 e as diretrizes técnicas de vistoria cautelar do IBAPE.',
  },
  {
    valor: 'inspecao_predial',
    rotulo: 'Inspeção predial / manutenção',
    tipos: ['recebimento'],
    documento: 'laudo técnico de inspeção predial',
    texto: 'O presente laudo caracteriza-se pela inspeção predial, nos termos da ABNT NBR 16747, com foco no diagnóstico do estado de conservação e de manutenção da edificação. São identificadas anomalias construtivas, falhas de manutenção e de uso, classificadas quanto ao grau de risco, e propostas recomendações técnicas e prioridades de intervenção, de modo a subsidiar o plano de manutenção previsto na ABNT NBR 5674.',
  },
  {
    valor: 'pos_reforma',
    rotulo: 'Recebimento pós-reforma',
    tipos: ['recebimento', 'andamento'],
    documento: 'laudo técnico de vistoria de recebimento de reforma',
    texto: 'O presente laudo tem como objetivo verificar, por meio de inspeção visual, a qualidade de execução dos serviços de reforma concluídos no imóvel, apontando falhas executivas, serviços incompletos e não conformidades com as normas técnicas aplicáveis e com a ABNT NBR 16280 (Reforma em edificações), e propondo as correções necessárias antes do aceite final dos serviços.',
  },
  {
    valor: 'obra_andamento',
    rotulo: 'Acompanhamento de obra em andamento',
    tipos: ['andamento'],
    documento: 'relatório de vistoria técnica de obra em andamento',
    texto: 'O presente relatório tem como objetivo registrar, por meio de inspeção visual, o andamento físico da obra e as condições de execução dos serviços vistoriados na data indicada. São verificados a conformidade dos serviços com o projeto e com as normas técnicas aplicáveis, a qualidade de execução, a organização e segurança do canteiro e o avanço em relação ao cronograma. O resultado consiste na identificação de não conformidades e falhas executivas, na sua classificação quanto ao grau de risco e na proposição de recomendações técnicas para correção ainda durante a execução, quando o custo de reparo é menor.',
  },
  {
    valor: 'personalizado',
    rotulo: 'Outro (escrever o objetivo)',
    tipos: ['recebimento', 'andamento'],
    documento: 'laudo técnico de vistoria',
    texto: '',
  },
]

export function objetivosDoTipo(tipo: TipoVistoria) {
  return OBJETIVOS.filter((o) => o.tipos.includes(tipo))
}

export function objetivoDaVistoria(v: { tipo: TipoVistoria; objetivo_tipo: string | null }) {
  return OBJETIVOS.find((o) => o.valor === v.objetivo_tipo) ?? objetivosDoTipo(v.tipo)[0]
}

// Parágrafos do item 1 do laudo: o texto próprio (se houver) ou o do objetivo escolhido, mais o aviso de uso.
export function paragrafosObjetivo(v: { tipo: TipoVistoria; objetivo_tipo: string | null; objetivo_texto: string | null }) {
  const proprio = v.objetivo_texto?.trim()
  const base = proprio ? proprio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [objetivoDaVistoria(v).texto].filter(Boolean)
  return [...base, USO_DO_LAUDO]
}

export const METODOLOGIA: Record<TipoVistoria, { titulo: string; texto: string }[]> = {
  recebimento: [
    { titulo: '3.1 Fase inicial e documental', texto: 'Entrevista com os proprietários e responsáveis legais pelo imóvel e levantamento preliminar de dados da edificação, visando ao cadastro de problemas já detectados e de níveis de expectativa dos usuários; levantamento de documentação técnica da edificação.' },
    { titulo: '3.2 Vistoria das áreas da edificação', texto: 'Levantamento de todas as anomalias e/ou falhas existentes e aparentes da edificação relacionadas a problemas de origem construtiva.' },
    { titulo: '3.3 Elaboração do laudo', texto: 'Elaboração de relatório fotográfico juntamente com a descrição e classificação das anomalias e/ou falhas quanto ao grau de risco, determinação das prioridades e respectivas recomendações técnicas.' },
  ],
  andamento: [
    { titulo: '3.1 Fase documental', texto: 'Entrevista com o contratante e com o responsável pela execução. Análise dos projetos, do cronograma físico e do relatório da vistoria anterior, quando houver.' },
    { titulo: '3.2 Vistoria em campo', texto: 'Inspeção visual das etapas em execução e concluídas desde a última visita, com verificações simples de prumo, nível, esquadro e dimensões por instrumentos de mão, e registro fotográfico por etapa.' },
    { titulo: '3.3 Elaboração do relatório', texto: 'Relatório fotográfico com descrição e classificação das não conformidades quanto ao grau de risco, verificação do avanço físico, determinação de prioridades e recomendações técnicas.' },
  ],
}

export const PRESSUPOSTOS: Record<TipoVistoria, string> = {
  recebimento: 'Que o acesso disponibilizado ao imóvel foi suficiente para a realização da inspeção visual dos ambientes e elementos aparentes. Que as informações fornecidas pelas partes interessadas, construtora e proprietário, são verdadeiras e refletem a realidade dos fatos. Que não ocorreram intervenções ou substituições durante a vistoria.',
  andamento: 'Que o acesso disponibilizado à obra foi suficiente para a inspeção visual das etapas vistoriadas. Que os projetos e informações fornecidos pelo contratante e pelo executor são verdadeiros e correspondem à versão vigente.',
}

export const RESSALVAS: Record<TipoVistoria, string[]> = {
  recebimento: [
    'A vistoria possui caráter exclusivamente visual e não corresponde a perícia de engenharia, auditoria técnica ou avaliação estrutural.',
    'Não foram realizados ensaios, medições instrumentais, testes de desempenho, análises laboratoriais ou verificações especializadas.',
    'O funcionamento de equipamentos, instalações e sistemas foi avaliado apenas de forma aparente e nas condições existentes durante a inspeção, não sendo possível garantir desempenho futuro, vida útil remanescente ou ausência de defeitos ocultos.',
    'Elementos encobertos por móveis, objetos, forros, revestimentos, painéis, divisórias, vegetação ou quaisquer obstáculos podem não ter sido integralmente avaliados.',
    'Não foram verificadas as condições internas de fundações, vigas, pilares, lajes, tubulações embutidas, impermeabilização, sistemas enterrados ou quaisquer componentes não visíveis.',
    'A inexistência de registro fotográfico de determinado elemento não implica necessariamente sua inexistência, ausência de dano ou existência de condição particular, devendo o laudo ser interpretado em seu conjunto.',
  ],
  andamento: [
    'A vistoria tem caráter visual e não corresponde a perícia, auditoria técnica ou verificação do cálculo estrutural.',
    'Não foram realizados ensaios laboratoriais (rompimento de corpos de prova, arrancamento, estanqueidade), salvo quando indicado.',
    'Elementos já cobertos por serviços posteriores (armaduras concretadas, tubulações embutidas, impermeabilização protegida) não puderam ser verificados nesta visita, exceto quando registrados em vistoria anterior.',
    'A qualidade dos materiais é avaliada apenas pelo aspecto e pela documentação apresentada (notas fiscais, laudos de fornecedor).',
  ],
}

export const LIMITANTES: Record<TipoVistoria, string[]> = {
  recebimento: [
    'As constatações apresentadas restringem-se às condições na data e horário da vistoria, não abrangendo alterações posteriores decorrentes do uso, intempéries, acidentes, vandalismo, manutenção inadequada ou intervenções realizadas após a inspeção.',
    'Este laudo não possui a finalidade de determinar autoria, responsabilidade civil, valor de reparos, custo de manutenção ou quantificação financeira de eventuais danos, salvo quando expressamente contratado para tal finalidade.',
    'A identificação de vícios ocultos, defeitos internos, infiltrações intermitentes, falhas eventuais de equipamentos ou manifestações patológicas não aparentes está fora do escopo deste trabalho.',
  ],
  andamento: [
    'As constatações restringem-se às condições da data e horário da vistoria. Como a obra está em andamento, serviços podem ser alterados, corrigidos ou cobertos após a inspeção.',
    'Este relatório não determina responsabilidade civil, valor de reparos ou medição para pagamento, salvo quando expressamente contratado para tal finalidade.',
  ],
}

export const SISTEMAS_RECEBIMENTO = [
  'Fachadas e alvenarias de fechamento',
  'Revestimentos',
  'Esquadrias',
  'Louças e metais',
  'Instalações hidráulicas e sanitárias',
  'Instalações elétricas',
]

export const GRAU_RISCO: Record<string, { rotulo: string; texto: string }> = {
  baixo: { rotulo: 'BAIXO', texto: 'falhas de ordem estética ou de manutenção, sem risco à segurança' },
  medio: { rotulo: 'MÉDIO', texto: 'perda parcial de desempenho, devendo ser corrigidas antes da utilização' },
  critico: { rotulo: 'CRÍTICO', texto: 'risco à segurança dos usuários ou perda de desempenho, exigindo correção imediata' },
}
