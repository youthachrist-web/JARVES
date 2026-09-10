-- Adiciona os campos de cupom/desconto e de link de pagamento (AbacatePay) à
-- tabela `pedidos` já existente no Supabase, usados por
-- apps/api/src/store/ordersStore.ts e routes/shop.ts.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do painel do Supabase
-- (https://supabase.com/dashboard/project/<seu-projeto>/sql/new) e clique em
-- "Run". Idempotente — pode rodar mais de uma vez sem erro (IF NOT EXISTS em
-- tudo), então é seguro reexecutar se não tiver certeza se já rodou.

alter table public.pedidos
  add column if not exists subtotal numeric,
  add column if not exists cupom text,
  add column if not exists desconto numeric not null default 0,
  add column if not exists pagamento_provedor text,
  add column if not exists pagamento_checkout_id text,
  add column if not exists pagamento_link text,
  add column if not exists pagamento_status text not null default 'pendente';

-- Acelera a busca do webhook de confirmação de pagamento (casa pelo
-- checkout_id da AbacatePay — ver OrdersStore#markPaidByCheckoutId).
create index if not exists pedidos_pagamento_checkout_id_idx
  on public.pedidos (pagamento_checkout_id);

comment on column public.pedidos.subtotal is 'Soma dos itens (preço real do catálogo × quantidade) antes do cupom.';
comment on column public.pedidos.cupom is 'Código do cupom aplicado (normalizado, maiúsculo), ou null se nenhum.';
comment on column public.pedidos.desconto is 'Valor abatido pelo cupom, em reais.';
comment on column public.pedidos.pagamento_provedor is 'Nome do provedor de pagamento usado — hoje sempre "abacatepay".';
comment on column public.pedidos.pagamento_checkout_id is 'Id do checkout na AbacatePay — usado para casar o webhook de confirmação com o pedido.';
comment on column public.pedidos.pagamento_link is 'URL de pagamento gerada pela AbacatePay, enviada ao cliente.';
comment on column public.pedidos.pagamento_status is 'pendente | pago — atualizado para "pago" pelo webhook /webhooks/abacatepay quando o pagamento é confirmado.';
