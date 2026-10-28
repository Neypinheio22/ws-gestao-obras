import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './lib/auth'
import Entrar from './pages/Entrar'
import Cadastro from './pages/Cadastro'
import Aguardando from './pages/Aguardando'
import Inicio from './pages/Inicio'
import Admin from './pages/Admin'
import NovaVistoria from './pages/NovaVistoria'
import VistoriaPage from './pages/VistoriaPage'
import AmbientePage from './pages/AmbientePage'
import ConclusaoPage from './pages/ConclusaoPage'
import MeuPerfil from './pages/MeuPerfil'

function Carregando() {
  return <div className="centro">Carregando…</div>
}

// Só deixa passar quem está logado e aprovado; admin opcional.
function Protegida({ children, soAdmin = false }: { children: ReactNode; soAdmin?: boolean }) {
  const { session, profile, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (!session) return <Navigate to="/entrar" replace />
  if (!profile) return <Carregando />
  if (profile.status !== 'aprovado') return <Navigate to="/aguardando" replace />
  if (soAdmin && profile.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function Publica({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Publica><Entrar /></Publica>} />
      <Route path="/cadastro" element={<Publica><Cadastro /></Publica>} />
      <Route path="/aguardando" element={<Aguardando />} />
      <Route path="/admin" element={<Protegida soAdmin><Admin /></Protegida>} />
      <Route path="/" element={<Protegida><Inicio /></Protegida>} />
      <Route path="/perfil" element={<Protegida><MeuPerfil /></Protegida>} />
      <Route path="/nova" element={<Protegida><NovaVistoria /></Protegida>} />
      <Route path="/vistoria/:id" element={<Protegida><VistoriaPage /></Protegida>} />
      <Route path="/vistoria/:id/ambiente/:ambId" element={<Protegida><AmbientePage /></Protegida>} />
      <Route path="/vistoria/:id/conclusao" element={<Protegida><ConclusaoPage /></Protegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
