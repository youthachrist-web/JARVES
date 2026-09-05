# Análise de Referências — Vuori & Lululemon

> Uso estritamente como referência de UX/arquitetura de informação — nenhum
> texto, imagem, código ou elemento de identidade visual protegido foi
> copiado. Ver `BEST_OF_REFERENCES.md` para o que foi efetivamente
> incorporado ao storefront da Thymos.

## Metodologia

- **vuoriclothing.com**: analisado via fetch ao vivo da homepage.
- **shop.lululemon.com / lululemon.com**: o fetch ao vivo foi bloqueado por
  proteção anti-bot do site (HTTP 503 em múltiplas tentativas, inclusive no
  domínio raiz). A análise abaixo usa conhecimento geral, estável e
  publicamente bem documentado sobre os padrões de UX do site — está
  marcada como tal e deve ser tratada com menos confiança que a análise do
  Vuori, que foi verificada ao vivo.

## Site 01 — Vuori (verificado ao vivo)

### Pontos fortes
- **Navegação dupla clara**: categorias primárias (New, Women, Men,
  Accessories, Sale) + mega-menu com coleções curadas por tema/atleta
  (parcerias com influenciadores/atletas dão prova social sem depender só
  de depoimentos de clientes anônimos).
- **Hero rotativo com mensagem curta e direta** ("New Styles. Endless
  Possibilities") + dois CTAs segmentados por gênero — reduz fricção de
  navegação logo na dobra principal.
- **"Shop by Color"**: forma alternativa de navegação por intenção visual,
  útil quando o cliente já sabe a estética que quer, não a categoria.
- **Categorias populares como tiles visuais** (Pants, Leggings, Tanks,
  Hoodies) — reconhecimento mais rápido que texto puro em um menu.
- **Rodapé denso e bem organizado** em 3 colunas (Suporte, Empresa, Outros)
  — cobre FAQ, trocas, frete, programa de fidelidade, cartões-presente.

### Pontos fracos / oportunidades
- Depender de parcerias com atletas/influenciadores para prova social é
  caro e não escala para uma marca em estágio inicial como a Thymos.
  Substituível por depoimentos reais de clientes + números de comunidade.
- A abundância de coleções temáticas simultâneas (Restore, Sunday, Tennis)
  pode gerar sobrecarga de escolha em um catálogo menor — a Thymos, com um
  catálogo mais enxuto, deve preferir menos categorias, mais bem definidas.

### Padrões úteis identificados
- Hero com CTA duplo e mensagem curta.
- Grid de "populares"/"mais vendidos" com preço visível direto no card.
- Newsletter com aviso de privacidade explícito junto ao formulário.
- Navegação secundária por atributo (cor) além de categoria.

## Site 02 — Lululemon (baseado em conhecimento geral do site, não verificado ao vivo nesta sessão)

### Pontos fortes
- **Mega-menu por gênero → categoria → atividade** (ex.: Mulher → Calças →
  Yoga), permitindo tanto navegação ampla quanto específica por caso de uso.
- **Guias de caimento/tamanho muito visíveis** na página de produto —
  reduz devolução, aumenta confiança de compra em activewear (categoria
  onde caimento é crítico).
- **"Complete o look"**: sugestão de peças complementares na página de
  produto — aumenta ticket médio sem parecer agressivo.
- **Seção de saldos/edições especiais ("We Made Too Much")** isolada do
  catálogo principal — permite liquidar estoque sem "sujar" a percepção de
  preço da coleção atual.
- **Localizador de lojas físicas** integrado — relevante para a Thymos se
  vier a abrir pontos físicos/showrooms.
- **Avaliações de produto com métricas específicas de fit** (ex.: "veste
  pequeno/veste grande", não só nota de 1-5) — informação acionável.

### Pontos fracos / oportunidades
- Estrutura de mega-menu muito profunda pode ser pesada para um catálogo
  pequeno — a Thymos deve adotar uma versão simplificada (2 níveis, não 3).
- Depender fortemente de programa de membership pago é um investimento de
  longo prazo que não faz sentido no MVP.

### Padrões úteis identificados
- Guia de tamanhos/caimento acessível diretamente no modal/página de
  produto (não só um link genérico).
- "Produtos relacionados"/"complete o look" no fluxo pós-adicionar-ao-carrinho.
- Avaliações com atributos específicos de fit, não só estrelas genéricas.

## Conclusão

Ambos os sites confirmam o mesmo padrão estrutural adotado no storefront da
Thymos (herdado do `thymos-fit` e mantido nesta consolidação): hero
cinematográfico, split-sections foto+texto, grid de categorias visual,
prova social por depoimentos, carrinho lateral (drawer) com barra de frete
grátis, e footer denso com FAQ/trocas/frete. Ver `BEST_OF_REFERENCES.md`
para a lista concreta do que foi incorporado.
