import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Aguardando() {
  const { session, profile, carregando, recarregarPerfil, sair } = useAuth()
  const [params] = useSearchParams()

  if (carregando) return <div className="centro">Carregando…</div>

  if (!session) {
    if (params.get('confirmar')) {
      return (
        <main className="tela-auth">
          <div className="cartao aviso">
            <h2>Confirme seu e-mail</h2>
            <p>Enviamos um link para o seu e-mail. Depois de confirmar, o administrador vai liberar seu acesso.</p>
            <Link className="botao" to="/entrar">Voltar para o login</Link>
          </div>
        </main>
      )
    }
    return <Navigate to="/entrar" replace />
  }

  if (profile?.status === 'aprovado') return <Navigate to="/" replace />

  const bloqueado = profile?.status === 'bloqueado'

  return (
    <main className="tela-auth">
      <div className="cartao aviso">
        <h2>{bloqueado ? 'Acesso bloqueado' : 'Aguardando aprovação'}</h2>
        <p>
          {bloqueado
            ? 'Sua conta foi bloqueada pelo administrador. Entre em contato para mais informações.'
            : 'Sua conta foi criada. Assim que o administrador liberar, você poderá usar o sistema.'}
        </p>
        {!bloqueado && (
          <button type="button" onClick={recarregarPerfil}>Verificar novamente</button>
        )}
        <button type="button" className="secundario" onClick={sair}>Sair</button>
      </div>
    </main>
  )
}
