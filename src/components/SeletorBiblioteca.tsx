import { useEffect, useState } from 'react'
import {
  apagarDaBiblioteca,
  carregarMinhaBiblioteca,
  juntarComMinha,
  salvarNaBiblioteca,
  type EntradaBiblioteca,
  type GrupoBiblioteca,
} from '../lib/biblioteca'

export interface Escolha {
  texto: string
  sistema: string | null
}

interface Props {
  titulo: string
  tipo: 'item' | 'conclusao'
  grupos: GrupoBiblioteca[]
  // Grupo extra no topo (ex.: itens do modelo para "Cozinha"), com "marcar todos".
  sugeridos?: { titulo: string; textos: Escolha[] }
  abertos?: string[] // sistemas que já abrem expandidos
  destaque?: string[] // sistemas marcados como "tem não conformidade"
  jaUsados: string[]
  maiusculas?: boolean
  onConfirmar: (escolhas: Escolha[]) => Promise<void> | void
  onFechar: () => void
}

// Biblioteca para o vistoriador marcar o que se aplica. Nada vem marcado: só entra o que ele escolher.
export default function SeletorBiblioteca({ titulo, tipo, grupos, sugeridos, abertos = [], destaque = [], jaUsados, maiusculas, onConfirmar, onFechar }: Props) {
  const [minha, setMinha] = useState<EntradaBiblioteca[]>([])
  const [marcados, setMarcados] = useState<Map<string, string | null>>(new Map())
  const [novoTexto, setNovoTexto] = useState('')
  const [novoSistema, setNovoSistema] = useState('')
  const [guardar, setGuardar] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    carregarMinhaBiblioteca(tipo).then(setMinha).catch((e) => setErro(e.message))
  }, [tipo])

  const usados = new Set(jaUsados.map((t) => t.trim().toLowerCase()))
  const todos = juntarComMinha(grupos, minha)
  const termo = busca.trim().toLowerCase()
  const casa = (t: string) => !termo || t.toLowerCase().includes(termo)

  function alternar(texto: string, sistema: string | null) {
    setMarcados((m) => {
      const n = new Map(m)
      if (n.has(texto)) n.delete(texto)
      else n.set(texto, sistema)
      return n
    })
  }

  function caixa(texto: string, sistema: string | null, meu?: EntradaBiblioteca) {
    const usado = usados.has(texto.trim().toLowerCase())
    return (
      <li key={(meu?.id ?? '') + texto} className={`opcao-bib ${usado ? 'usado' : ''}`}>
        <label>
          <input type="checkbox" disabled={usado} checked={usado || marcados.has(texto)} onChange={() => alternar(texto, sistema)} />
          <span>{texto}{usado && <em className="sutil"> (já está no laudo)</em>}</span>
        </label>
        {meu && (
          <button
            type="button"
            className="icone"
            title="Tirar da minha biblioteca"
            onClick={async () => {
              if (!window.confirm('Tirar este texto da sua biblioteca?')) return
              await apagarDaBiblioteca(meu.id).catch((e) => setErro(e.message))
              setMinha((l) => l.filter((x) => x.id !== meu.id))
            }}
          >
            ×
          </button>
        )}
      </li>
    )
  }

  async function adicionarProprio() {
    const texto = maiusculas ? novoTexto.trim().toUpperCase() : novoTexto.trim()
    if (!texto) return
    const sistema = novoSistema || 'Meus itens'
    if (guardar) {
      try {
        const e = await salvarNaBiblioteca(tipo, sistema, texto)
        setMinha((l) => [...l, e])
      } catch (e) {
        setErro((e as Error).message)
      }
    }
    setMarcados((m) => new Map(m).set(texto, sistema === 'Meus itens' ? null : sistema))
    setNovoTexto('')
  }

  async function confirmar() {
    setSalvando(true)
    try {
      await onConfirmar(Array.from(marcados.entries()).map(([texto, sistema]) => ({ texto, sistema })))
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <section className="cartao seletor">
      <div className="titulo-secao">
        <h2>{titulo}</h2>
        <button type="button" className="secundario pequeno" onClick={onFechar}>Fechar</button>
      </div>
      <p className="sutil pequeno-texto">Marque só o que você verificou. Os textos ficam editáveis depois.</p>
      <input placeholder="Buscar na biblioteca" value={busca} onChange={(e) => setBusca(e.target.value)} />

      {sugeridos && sugeridos.textos.some((t) => casa(t.texto)) && (
        <details open className="grupo-bib">
          <summary>
            <strong>{sugeridos.titulo}</strong>
          </summary>
          <button
            type="button"
            className="link"
            onClick={() =>
              setMarcados((m) => {
                const n = new Map(m)
                for (const t of sugeridos.textos) if (!usados.has(t.texto.toLowerCase())) n.set(t.texto, t.sistema)
                return n
              })
            }
          >
            Marcar todos deste grupo
          </button>
          <ul>{sugeridos.textos.filter((t) => casa(t.texto)).map((t) => caixa(t.texto, t.sistema))}</ul>
        </details>
      )}

      {todos.map((g) => {
        const textos = g.textos.filter(casa)
        const meus = g.meus.filter((e) => casa(e.texto))
        if (!textos.length && !meus.length) return null
        return (
          <details key={g.sistema} className="grupo-bib" open={!!termo || abertos.includes(g.sistema)}>
            <summary>
              <strong>{g.sistema}</strong>
              {g.norma && <span className="sutil"> · {g.norma}</span>}
              {destaque.includes(g.sistema) && <span className="selo selo-pendente">tem não conformidade</span>}
            </summary>
            <ul>
              {textos.map((t) => caixa(t, g.sistema))}
              {meus.map((e) => caixa(e.texto, e.sistema === 'Meus itens' ? null : e.sistema, e))}
            </ul>
          </details>
        )
      })}

      <fieldset className="novo-bib">
        <legend>Escrever {tipo === 'item' ? 'um item novo' : 'uma constatação nova'}</legend>
        {tipo === 'item' ? (
          <input placeholder="Ex.: BANHEIRA DE HIDROMASSAGEM" value={novoTexto} onChange={(e) => setNovoTexto(e.target.value)} />
        ) : (
          <textarea rows={3} placeholder="Escreva a constatação técnica" value={novoTexto} onChange={(e) => setNovoTexto(e.target.value)} />
        )}
        <select value={novoSistema} onChange={(e) => setNovoSistema(e.target.value)}>
          <option value="">Sistema: Meus itens</option>
          {grupos.map((g) => <option key={g.sistema} value={g.sistema}>{g.sistema}</option>)}
        </select>
        <label className="check">
          <input type="checkbox" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
          Salvar na minha biblioteca para as próximas vistorias
        </label>
        <button type="button" className="secundario" disabled={!novoTexto.trim()} onClick={adicionarProprio}>Incluir</button>
      </fieldset>

      {erro && <p className="erro">{erro}</p>}
      <button type="button" className="grande" disabled={!marcados.size || salvando} onClick={confirmar}>
        {salvando ? 'Adicionando…' : `Adicionar ${marcados.size || ''} ${marcados.size === 1 ? 'selecionado' : 'selecionados'}`}
      </button>
    </section>
  )
}
