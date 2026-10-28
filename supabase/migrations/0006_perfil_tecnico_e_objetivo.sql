-- Dados profissionais do vistoriador, que saem no cabeçalho, no encerramento e na assinatura do laudo.
alter table public.profiles
  add column if not exists titulo_profissional text,
  add column if not exists conselho text,
  add column if not exists cidade_base text,
  add column if not exists cabecalho text;

-- Finalidade da vistoria (recebimento, entrada/devolução de locação, cautelar...) e texto próprio opcional.
alter table public.vistorias
  add column if not exists objetivo_tipo text,
  add column if not exists objetivo_texto text;
