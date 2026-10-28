import { useCallback, useEffect, useState } from 'react'
import { carregarVistoria, type VistoriaCompleta } from './vistorias'

export function useVistoria(id: string | undefined) {
  const [dados, setDados] = useState<VistoriaCompleta | null>(null)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    if (!id) return
    try {
      setDados(await carregarVistoria(id))
    } catch (e) {
      setErro((e as Error).message)
    }
  }, [id])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { dados, setDados, erro, setErro, recarregar }
}

export function formatarData(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
