import { supabase } from './supabase'
import { ambientesIniciais, itensParaNovoAmbiente, type TipoVistoria } from './modelos'

export interface Vistoria {
  id: string
  vistoriador_id: string
  tipo: TipoVistoria
  status: 'rascunho' | 'concluida'
  numero: number | null
  data_vistoria: string
  cliente_nome: string
  cliente_telefone: string | null
  cliente_email: string | null
  endereco: string | null
  cidade: string | null
  unidade: string | null
  area_m2: number | null
  construtora: string | null
  responsavel_obra: string | null
  descricao_edificacao: string | null
  sistemas_obs: string | null
  pressupostos_extra: string | null
  laudo_resumo: string | null
  conclusao: string | null
  grau_risco: 'baixo' | 'medio' | 'critico' | null
  avanco_previsto: number | null
  avanco_executado: number | null
  proxima_vistoria: string | null
  local_emissao: string | null
  created_at: string
  updated_at: string
}

export interface Ambiente {
  id: string
  vistoria_id: string
  nome: string
  ordem: number
  situacao_etapa: string | null
}

export interface Item {
  id: string
  vistoria_id: string
  ambiente_id: string
  descricao: string
  ordem: number
  situacao: string | null
  observacao: string | null
  impacto: string | null
  solucao: string | null
}

export interface Foto {
  id: string
  vistoria_id: string
  ambiente_id: string
  item_id: string | null
  path: string
  legenda: string
  ordem: number
}

export type NovaVistoria = Partial<Vistoria> & { tipo: TipoVistoria; cliente_nome: string }

function falhou(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function criarVistoria(dados: NovaVistoria): Promise<string> {
  const { data, error } = await supabase.from('vistorias').insert(dados).select('id').single()
  falhou(error)
  const vistoriaId = (data as { id: string }).id

  const sementes = ambientesIniciais(dados.tipo)
  for (const [i, s] of sementes.entries()) {
    await adicionarAmbiente(vistoriaId, s.nome, s.itens, i)
  }
  return vistoriaId
}

export async function adicionarAmbiente(vistoriaId: string, nome: string, itens: string[], ordem: number) {
  const { data, error } = await supabase
    .from('ambientes')
    .insert({ vistoria_id: vistoriaId, nome, ordem })
    .select('*')
    .single()
  falhou(error)
  const amb = data as Ambiente
  if (itens.length) {
    const { error: e2 } = await supabase.from('itens').insert(
      itens.map((descricao, j) => ({ vistoria_id: vistoriaId, ambiente_id: amb.id, descricao, ordem: j })),
    )
    falhou(e2)
  }
  return amb
}

export function itensSugeridos(tipo: TipoVistoria, tipoAmbiente: string) {
  return itensParaNovoAmbiente(tipo, tipoAmbiente)
}

export interface VistoriaCompleta {
  vistoria: Vistoria
  ambientes: Ambiente[]
  itens: Item[]
  fotos: Foto[]
}

export async function carregarVistoria(id: string): Promise<VistoriaCompleta> {
  const [v, a, i, f] = await Promise.all([
    supabase.from('vistorias').select('*').eq('id', id).single(),
    supabase.from('ambientes').select('*').eq('vistoria_id', id).order('ordem'),
    supabase.from('itens').select('*').eq('vistoria_id', id).order('ordem'),
    supabase.from('fotos').select('*').eq('vistoria_id', id).order('ordem').order('created_at'),
  ])
  falhou(v.error ?? a.error ?? i.error ?? f.error)
  return {
    vistoria: v.data as Vistoria,
    ambientes: a.data as Ambiente[],
    itens: i.data as Item[],
    fotos: f.data as Foto[],
  }
}

export async function salvarVistoria(id: string, campos: Partial<Vistoria>) {
  const { error } = await supabase.from('vistorias').update(campos).eq('id', id)
  falhou(error)
}

export async function salvarItem(id: string, campos: Partial<Item>) {
  const { error } = await supabase.from('itens').update(campos).eq('id', id)
  falhou(error)
}

export async function salvarAmbiente(id: string, campos: Partial<Ambiente>) {
  const { error } = await supabase.from('ambientes').update(campos).eq('id', id)
  falhou(error)
}

export async function apagarAmbiente(amb: Ambiente, fotos: Foto[]) {
  const caminhos = fotos.filter((f) => f.ambiente_id === amb.id).map((f) => f.path)
  if (caminhos.length) await supabase.storage.from('fotos').remove(caminhos)
  const { error } = await supabase.from('ambientes').delete().eq('id', amb.id)
  falhou(error)
}

export async function apagarVistoria(id: string) {
  const { data } = await supabase.from('fotos').select('path').eq('vistoria_id', id)
  const caminhos = (data ?? []).map((f: { path: string }) => f.path)
  if (caminhos.length) await supabase.storage.from('fotos').remove(caminhos)
  const { error } = await supabase.from('vistorias').delete().eq('id', id)
  falhou(error)
}

// Reduz a foto da câmera (normalmente 3–5 MB) para ~300 KB antes de enviar.
export async function comprimirImagem(arquivo: File, ladoMaximo = 1600, qualidade = 0.75): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível processar a foto'))), 'image/jpeg', qualidade),
  )
}

export async function enviarFoto(amb: Ambiente, arquivo: File, legenda: string, ordem: number, itemId: string | null = null) {
  const blob = await comprimirImagem(arquivo)
  const path = `${amb.vistoria_id}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg' })
  falhou(error)
  const { data, error: e2 } = await supabase
    .from('fotos')
    .insert({ vistoria_id: amb.vistoria_id, ambiente_id: amb.id, item_id: itemId, path, legenda, ordem })
    .select('*')
    .single()
  if (e2) {
    await supabase.storage.from('fotos').remove([path])
    falhou(e2)
  }
  return data as Foto
}

export async function salvarFoto(id: string, campos: Partial<Foto>) {
  const { error } = await supabase.from('fotos').update(campos).eq('id', id)
  falhou(error)
}

export async function apagarFoto(foto: Foto) {
  await supabase.storage.from('fotos').remove([foto.path])
  const { error } = await supabase.from('fotos').delete().eq('id', foto.id)
  falhou(error)
}

// Links temporários (1 h) para mostrar as fotos do bucket privado.
export async function urlsDasFotos(fotos: Foto[]): Promise<Record<string, string>> {
  if (!fotos.length) return {}
  const { data, error } = await supabase.storage.from('fotos').createSignedUrls(fotos.map((f) => f.path), 3600)
  falhou(error)
  const mapa: Record<string, string> = {}
  for (const d of data ?? []) if (d.path && d.signedUrl) mapa[d.path] = d.signedUrl
  return mapa
}
