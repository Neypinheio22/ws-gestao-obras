import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { mensagemErro } from '../lib/erros'

export default function Cadastro() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [registro, setRegistro] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function cadastrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.')
    if (senha !== confirmacao) return setErro('As senhas não conferem.')

    setEnviando(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, telefone, registro } },
    })
    setEnviando(false)
    if (error) return setErro(mensagemErro(error.message))
    // Sem sessão = o Supabase pediu confirmação de e-mail antes do primeiro acesso.
    navigate(data.session ? '/aguardando' : '/aguardando?confirmar=1', { replace: true })
  }

  return (
    <main className="tela-auth">
      <div className="marca">
        <span className="marca-sigla">WS</span>
        <h1>Criar conta</h1>
        <p>Seu acesso será liberado pelo administrador.</p>
      </div>
      <form className="cartao" onSubmit={cadastrar}>
        <label>
          Nome completo
          <input required value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label>
          E-mail
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          WhatsApp
          <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(85) 9 0000-0000" />
        </label>
        <label>
          Registro profissional
          <input value={registro} onChange={(e) => setRegistro(e.target.value)} placeholder="CFT, CREA ou CAU" />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        <label>
          Confirmar senha
          <input type="password" autoComplete="new-password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={enviando}>{enviando ? 'Criando…' : 'Criar conta'}</button>
        <p className="rodape-form">
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </main>
  )
}
