-- Adiciona o CPF do cliente à tabela `pedidos`, usado por
-- apps/api/src/store/ordersStore.ts e routes/shop.ts. A AbacatePay recusa a
-- cobrança Pix inteira quando o objeto `customer` vem sem `taxId` (CPF)
-- válido — ver lib/abacatepay.ts —, então o checkout do storefront passou a
-- coletar e validar CPF antes de gerar o pagamento.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do painel do Supabase
-- (https://supabase.com/dashboard/project/<seu-projeto>/sql/new) e clique em
-- "Run". Idempotente — pode rodar mais de uma vez sem erro.

alter table public.pedidos
  add column if not exists cliente_cpf text;

comment on column public.pedidos.cliente_cpf is 'CPF do cliente (só dígitos), exigido para gerar a cobrança Pix na AbacatePay.';
