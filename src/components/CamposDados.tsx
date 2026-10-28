import type { TipoVistoria } from '../lib/modelos'
import type { Vistoria } from '../lib/vistorias'

type Valores = Partial<Vistoria>

interface Props {
  tipo: TipoVistoria
  valores: Valores
  onChange: (campo: keyof Vistoria, valor: string) => void
  onBlur?: (campo: keyof Vistoria) => void
}

// Campos de dados do cliente e do imóvel, usados na criação e na edição da vistoria.
export default function CamposDados({ tipo, valores, onChange, onBlur }: Props) {
  const obra = tipo === 'andamento'

  function campo(nome: keyof Vistoria, rotulo: string, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}) {
    const valor = valores[nome]
    return (
      <label>
        {rotulo}
        <input
          value={valor == null ? '' : String(valor)}
          onChange={(e) => onChange(nome, e.target.value)}
          onBlur={() => onBlur?.(nome)}
          {...extra}
        />
      </label>
    )
  }

  function area(nome: keyof Vistoria, rotulo: string, placeholder: string) {
    const valor = valores[nome]
    return (
      <label>
        {rotulo}
        <textarea
          rows={3}
          placeholder={placeholder}
          value={valor == null ? '' : String(valor)}
          onChange={(e) => onChange(nome, e.target.value)}
          onBlur={() => onBlur?.(nome)}
        />
      </label>
    )
  }

  return (
    <>
      <fieldset>
        <legend>Cliente</legend>
        {campo('cliente_nome', obra ? 'Contratante *' : 'Nome completo *', { required: true })}
        <div className="grade-2">
          {campo('cliente_telefone', 'WhatsApp', { type: 'tel' })}
          {campo('cliente_email', 'E-mail', { type: 'email' })}
        </div>
      </fieldset>

      <fieldset>
        <legend>{obra ? 'Obra' : 'Imóvel'}</legend>
        {campo('unidade', obra ? 'Obra / empreendimento' : 'Tipo (condomínio, bloco, apto)', {
          placeholder: obra ? 'Ex.: Residência Silva' : 'Ex.: Cond. Mandara – Bl. C08 / Apt 404',
        })}
        {campo('endereco', 'Endereço')}
        <div className="grade-2">
          {campo('cidade', 'Cidade-UF', { placeholder: 'Aquiraz-CE' })}
          {campo('area_m2', obra ? 'Área prevista (m²)' : 'Área construída (m²)', { inputMode: 'decimal' })}
        </div>
        <div className="grade-2">
          {campo('data_vistoria', 'Data da vistoria', { type: 'date' })}
          {obra && campo('numero', 'Vistoria nº', { inputMode: 'numeric' })}
        </div>
        {campo('construtora', obra ? 'Construtora / executor' : 'Construtora')}
        {obra && campo('responsavel_obra', 'Responsável técnico da obra', { placeholder: 'Nome e CREA/CAU/CFT' })}
        {area(
          'descricao_edificacao',
          obra ? 'Dados da obra' : 'Dados iniciais da edificação',
          obra
            ? 'Sistema construtivo, fundação, lajes, vedação, pavimentos previstos...'
            : 'Estrutura, alvenaria, esquadrias, piso, marcas de portas, louças e metais, ambientes...',
        )}
        {area(
          'sistemas_obs',
          'Observações da vistoria',
          obra ? 'Ex.: chuva no dia, frente de serviço parada, documentos não apresentados' : 'Ex.: APT SEM ENERGIA E SEM ILUMINAÇÃO; gás sem recipiente',
        )}
      </fieldset>
    </>
  )
}
