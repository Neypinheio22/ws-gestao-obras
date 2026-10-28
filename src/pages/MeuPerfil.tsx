import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { mensagemErro } from '../lib/erros'
import { supabase, type Profile } from '../lib/supabase'

type Campos = Pick<Profile, 'nome' | 'titulo_profissional' | 'registro' | 'conselho' | 'telefone' | 'cidade_base' | 'cabecalho'>

const TITULOS = ['Técnico em Edificações', 'Engenheiro Civil', 'Arquiteto e Urbanista', 'Técnico em Segurança do Trabalho']

// Dados profissionais que saem em todo laudo: cabeçalho, encerramento e assinatura.
export default function MeuPerfil() {
  const { profile, recarregarPerfil } = useAuth()
  const [c, setC] = useState<Campos>({
    nome: profile?.nome ?? '',
    titulo_profissional: profile?.titulo_profissional ?? '',
    registro: profile?.registro ?? '',
    conselho: profile?.conselho ?? '',
    telefone: profile?.telefone ?? '',
    cidade_base: profile?.cidade_base ?? '',
    cabecalho: profile?.cabecalho ?? '',
  })
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  function campo(nome: keyof Campos, rotulo: string, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}) {
    return (
      <label>
        {rotulo}
        <input value={c[nome] ?? ''} onChange={(e) => setC((s) => ({ ...s, [nome]: e.target.value }))} {...extra} />
      </label>
    )
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setMsg('')
    setSalvando(true)
    const limpo = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (v ?? '').trim() || null]))
    const { error } = await supabase.from('profiles').update(limpo).eq('id', profile!.id)
    setSalvando(false)
    if (error) return setErro(mensagemErro(error.message))
    await recarregarPerfil()
    setMsg('Salvo. Os próximos laudos já saem com esses dados.')
  }

  const reg = c.registro?.trim()
  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <Link to="/">← Início</Link>
          <strong>Meu perfil técnico</strong>
        </div>
      </header>
      <form className="cartao" onSubmit={salvar}>
        {campo('nome', 'Nome completo *', { required: true })}
        <label>
          Título profissional
          <input list="titulos" value={c.titulo_profissional ?? ''} onChange={(e) => setC((s) => ({ ...s, titulo_profissional: e.target.value }))} />
          <datalist id="titulos">{TITULOS.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <div className="grade-2">
          {campo('registro', 'Registro técnico (nº)', { inputMode: 'numeric', placeholder: 'Ex.: 07971970366' })}
          {campo('conselho', 'Conselho / regional', { placeholder: 'Ex.: CFT – CRT 02' })}
        </div>
        <div className="grade-2">
          {campo('telefone', 'Telefone', { type: 'tel' })}
          {campo('cidade_base', 'Cidade onde assina', { placeholder: 'Ex.: Eusébio-CE' })}
        </div>
        {campo('cabecalho', 'Nome no topo das páginas do laudo', { placeholder: 'Ex.: WS Gestão de Obras – Vistorias e Laudos' })}

        <div className="previa-assinatura">
          <span className="sutil pequeno-texto">Como sai na assinatura do laudo:</span>
          <strong>{(c.nome || 'SEU NOME').toUpperCase()}</strong>
          <span>{c.titulo_profissional || 'Título profissional'}</span>
          <span>REGISTRO TÉCNICO: {reg || '—'}{c.conselho ? ` · ${c.conselho}` : ''}</span>
        </div>

        {erro && <p className="erro">{erro}</p>}
        {msg && <p className="ok">{msg}</p>}
        <button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </form>
    </main>
  )
}
