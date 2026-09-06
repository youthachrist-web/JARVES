# Melhores Práticas Incorporadas — Vuori / Lululemon → Thymos

Lista concreta do que foi adotado no `apps/storefront` a partir da análise
em `REFERENCE_ANALYSIS.md`, e o que fica como trabalho futuro documentado.

## Já implementado nesta consolidação

| Prática (fonte) | Onde está no storefront Thymos |
|---|---|
| Hero com mensagem curta + CTA duplo segmentado (Vuori) | `.hero-content` — "Comprar Agora" / "Ver Coleção" |
| Grid de categorias como tiles visuais (Vuori) | `.cat-grid` — Leggings, Top Esportivo, Shorts, T-shirts, Acessórios |
| Newsletter com confirmação clara (Vuori) | `.f-news` no rodapé, com mensagem de sucesso |
| Carrinho lateral com barra de progresso de frete grátis | `.cart-drawer` + `.cart-ship-bar` (já existia no protótipo, mantido) |
| Prova social por depoimentos com contexto (papel/localização) (ambos) | seção `.testimonials` |
| Página de produto com modal rico: galeria, variantes de cor/tamanho, estoque, frete (Lululemon) | `.prod-modal` — corrigido nesta consolidação para realmente renderizar (ver commit de rebranding) |
| Aviso de estoque baixo no card e no modal (padrão comum de urgência/escassez, presente em ambos os sites) | `.prod-stock-warn`, `.modal-stock-tag` |

## Pendente — próxima iteração (documentado, não implementado neste MVP)

| Prática | Por que ainda não | Prioridade sugerida |
|---|---|---|
| Guia de tamanho/caimento acionável no modal (Lululemon) | Requer conteúdo de medidas real por produto, que só existe quando o catálogo vier da Nuvemshop | Alta — depende do catálogo real |
| "Complete o look" / produtos relacionados (Lululemon) | Requer categorização/relação entre produtos reais | Média |
| Navegação "Shop by Color" (Vuori) | Baixo volume de catálogo hoje não justifica; reavaliar com catálogo real maior | Baixa |
| Avaliações com atributos de fit, não só estrelas (Lululemon) | Requer sistema de reviews (fora do escopo desta fase) | Média |
| Página de categoria dedicada com filtros/paginação (ambos) | Nav aponta para `#products` na mesma página como MVP — ver `apps/storefront/README.md` | Alta — próximo passo natural da loja |

## Deliberadamente não adotado

- **Parcerias com atletas/influenciadores como prova social principal**
  (Vuori): caro e não escalável no estágio atual da Thymos; substituído por
  depoimentos reais de clientes.
- **Programa de membership pago** (Lululemon): investimento de longo prazo
  fora do escopo deste MVP de integração Nuvemshop.
- **Mega-menu de 3 níveis** (Lululemon): catálogo da Thymos ainda é pequeno
  demais para justificar — a navegação atual (2 níveis) é suficiente e
  mais rápida de usar.
