import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import CamposDados from '../components/CamposDados'
import type { TipoVistoria } from '../lib/modelos'
import { criarVistoria, type Vistoria } from '../lib/vistorias'

export function limparCampos(valores: Partial<Vistoria>): Partial<Vistoria> {
  const saida: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(valores)) {
    if (k === 'area_m2' || k === 'numero' || k === 'avanco_previsto' || k === 'avanco_executado') {
      const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
      saida[k] = v === '' || v == null || Number.isNaN(n) ? null : n
    } else {
      saida[k] = typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v
    }
  }
  return saida as Partial<Vistoria>
}

export default function NovaVistoria() {
  const [params] = useSearchParams()
  const tipo: TipoVistoria = params.get('tipo') === 'andamento' ? 'andamento' : 'recebimento'
  const navigate = useNavigate()
  const [valores, setValores] = useState<Partial<Vistoria>>({
    data_vistoria: new Date().toLocaleDateString('sv-SE'),
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function criar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const dados = limparCampos(valores)
      const id = await criarVistoria({ ...dados, tipo, cliente_nome: dados.cliente_nome ?? '' })
      navigate(`/vistoria/${id}`, { replace: true })
    } catch (err) {
      setErro((err as Error).message)
      setSalvando(false)
    }
  }

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <Link to="/">← Início</Link>
          <strong>{tipo === 'andamento' ? 'Nova vistoria de obra em andamento' : 'Nova vistoria de recebimento'}</strong>
        </div>
      </header>
      <form className="cartao" onSubmit={criar}>
        <CamposDados tipo={tipo} valores={valores} onChange={(c, v) => setValores((s) => ({ ...s, [c]: v }))} />
        <p className="sutil pequeno-texto">
          {tipo === 'andamento'
            ? 'As etapas da obra (fundação, estrutura, alvenaria...) já vêm com o checklist pronto.'
            : 'Os ambientes (sala, cozinha, suítes...) já vêm com o checklist do seu modelo. Dá para adicionar ou remover depois.'}
        </p>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={salvando}>{salvando ? 'Criando…' : 'Começar vistoria'}</button>
      </form>
    </main>
  )
}
