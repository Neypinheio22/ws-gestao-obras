import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Inicio() {
  const { profile, sair } = useAuth()

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <strong>WS Gestão de Obras</strong>
          <small>Olá, {profile?.nome || profile?.email}</small>
        </div>
        <button type="button" className="secundario pequeno" onClick={sair}>Sair</button>
      </header>

      {profile?.role === 'admin' && (
        <Link className="cartao link-cartao" to="/admin">
          <strong>Usuários</strong>
          <span>Liberar ou bloquear acessos</span>
        </Link>
      )}

      <section className="cartao vazio">
        <h2>Vistorias</h2>
        <p>Em breve: nova vistoria, fotos por ambiente e geração do laudo em PDF.</p>
      </section>
    </main>
  )
}
