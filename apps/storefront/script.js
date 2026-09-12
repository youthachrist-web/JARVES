/* ═══════════════════════════════════════════════
   THYMOS — JavaScript Principal
   ═══════════════════════════════════════════════ */
'use strict';

// Ícones inline (sem emoji) reaproveitados em várias strings de HTML
// geradas dinamicamente — mesmo estilo das svgs estáticas do index.html
// (stroke-based, currentColor).
const ICONS = {
  warning: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  truck: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  refresh: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>',
  lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
};

// ══════════════════════════════════════════════════════
//  CATÁLOGO DE PRODUTOS
//
//  Como adicionar um novo produto:
//  1. Copie um bloco { } existente
//  2. Altere o id (deve ser único e maior que os anteriores)
//  3. Preencha os campos abaixo
//  4. Salve o ficheiro
//
//  Campos obrigatórios: id, name, category, price, bg
//  Campos opcionais:    oldPrice, badge, stock, images, sizes, description, details
// ══════════════════════════════════════════════════════
// Catálogo de exemplo — usado apenas como FALLBACK se a API real
// (Supabase, via apps/api) estiver fora do ar. Em uso normal, `products` é
// substituído pelo catálogo de verdade em loadProducts() antes do primeiro
// render. Nunca deixa a vitrine em branco por causa de uma falha de rede.
const MOCK_PRODUCTS_FALLBACK = [
  {
    id: 1,
    name: 'Conjunto Sculpt graphite',
    category: 'Conjuntos fitness premium',
    price: 429,
    oldPrice: null,
    badge: 'Mais Vendido',
    stock: 8,                          // ← quantidade em estoque
    colors: ['#253d32',], //cores disponíveis (para mostrar os pontinhos de cor no card e modal)
    bg: 'linear-gradient(145deg, #e1e3dd, #cad0c0, #b9c1ad)',
    // ↓ URLs das fotos do produto (adicione quantas quiser)
    images: [
      'assets/products/conjunto-sculpt-graphite.jpeg',
      'assets/products/conjunto-sculpt-graphite-2.jpeg',
    ],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'A Legging Sculpt Pro foi desenvolvida para quem leva o treino a sério. Com tecido compressivo de alta performance, ela modela e sustenta sem apertar — do agachamento ao sprint.',
    details: ['Tecido 78% Poliamida + 22% Elastano', 'Compressão média-alta', 'Cintura alta com faixa antiderrapante', 'Secagem rápida e antiodor', 'Bolso lateral discreto'],
  },
  {
    id: 2,
    name: 'Conjunto Sculpt Shorts Graphite',
    category: 'Conjuntos fitness premium',
    price: 380,
    oldPrice: null,
    badge: null,
    stock: 15,
    colors: ['#253d32',],
    bg: 'linear-gradient(145deg, #e8eae5, #d9dcd5, #c9cfc0)',
    images: [
      'assets/products/conjunto-sculpt-shorts-graphite.jpeg',
      'assets/products/conjunto-sculpt-shorts-graphite-2.jpeg',
    ],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'O Top Power Seamless combina suporte firme com conforto absoluto. Ideal para treinos de alta intensidade, ele oferece sustentação em arco sem aro, bojo removível e alças largas reguláveis.',
    details: ['Tecido Seamless 4D-Stretch', 'Suporte médio-alto', 'Bojo removível', 'Alças reguláveis cruzadas', 'Proteção UV 50+'],
  },
  {
    id: 3,
    name: 'T-shirt AirFlow neon',
    category: 'Camisete fitness premium',
    price: 160,
    oldPrice: null,
    badge: 'Novo',
    stock: 22,
    colors: ['#e957ac', '#64b72d', '#e93de6', '#e2b7e0'], // colorway "neon" real do produto — não é cor de marca, mantido vívido de propósito
    bg: 'linear-gradient(145deg, #eaece8, #e1e3dd, #d5d8d0)',
    images: [
      'assets/products/tshirt-airflow-neon-1.jpeg',
      'assets/products/tshirt-airflow-neon-2.jpeg',
      'assets/products/tshirt-airflow-neon-3.jpeg',
      'assets/products/tshirt-airflow-neon-4.jpeg',
    ],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Relaxada por fora, poderosa por dentro. Caimento solto, gola canelada e comprimento que cobre o quadril com atitude.',
    details: ['100% Algodão Premium Penteado', 'Caimento oversized intencional', 'Gola canelada reforçada', 'Estampa em serigrafia', 'Lavável à máquina'],
  },
  {
    id: 4,
    name: 'Conjunto wish collection',
    category: 'Conjuntos fitness premium',
    price: 429,
    oldPrice: null,
    badge: 'Mais Vendido',
    stock: 5,
    colors: ['#cbd1c3', '#adb79f',],
    bg: 'linear-gradient(145deg, #e3e5df, #d7dad2, #cbd1c3)',
    images: [],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Com efeito sculpt na região do glúteo e costura estratégica que realça as curvas. Cós duplo com regulagem interna.',
    details: ['Tecido PowerFlex com efeito sculpt', 'Cós duplo com elástico interno', 'Costuras anatômicas', 'Comprimento mid-thigh', 'Resistente ao cloro'],
  },
  {
    id: 5,
    name: 'Conjunto wish Mocha',
    category: 'conjuntos fitness premium',
    price: 380,
    oldPrice: null,
    badge: 'Novo',
    stock: 12,
    colors: ['#556e4f',],
    bg: 'linear-gradient(145deg, #dbded6, #cfd3c9, #c4cbb9)',
    images: [],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Desenvolvida com tecnologia de mapeamento corporal. Painéis estratégicos que moldam a silhueta. Cintura ultra-alta que não cede.',
    details: ['Tecnologia de mapeamento corporal', 'Painéis de compressão estratégica', 'Cintura alta de 10cm', 'Tecido opaco garantido', 'Bolso traseiro com zíper'],
  },
  {
    id: 6,
    name: 'Conjunto Aerobic steel',
    category: 'conjuntos fitness premium',
    price: 429,
    oldPrice: null,
    badge: null,
    stock: 18,
    colors: ['#2b4539',],
    bg: 'linear-gradient(145deg, #e7e9e5, #e1e3dd, #d7dad2)',
    images: [],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Minimalista e poderosa. Ideal para yoga e pilates. Suporte leve, design sem costuras.',
    details: ['Tecido ultra-macio Flow Touch', 'Suporte leve', 'Design sem costura', 'Bojo fixo anatômico', 'Detalhes em ribana'],
  },
  {
    id: 7,
    name: 'Conjunto Essential',
    category: 'Conjuntos',
    price: 369,
    oldPrice: 449,
    badge: 'Kit',
    stock: 7,
    colors: ['#c4cbb9', '#dcdfd7', '#aeb8a0'],
    bg: 'linear-gradient(145deg, #e3e5df, #d7dad2, #cbd1c2)',
    images: [],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Legging Sculpt Pro + Top Power Seamless numa combinação que foi feita para você arrasar. Cores coordenadas e desconto especial.',
    details: ['Inclui Legging + Top da mesma coleção', 'Embalagem especial para presente', 'Código de desconto na próxima compra', 'Disponível em cores exclusivas de kit'],
  },
  {
    id: 8,
    name: 'Legging Mesh Panel',
    category: 'Leggings',
    price: 269,
    oldPrice: null,
    badge: 'Novo',
    stock: 3,
    colors: ['#c0c7b5', '#d3d6cd', '#aab49c'],
    bg: 'linear-gradient(145deg, #d9dcd5, #cfd3c9, #c5cbbb)',
    images: ['assets/products/thymos-leggings.jpeg'],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Inserções de tela respirável nas laterais e atrás dos joelhos para ventilação máxima. Design ousado com contraste de texturas.',
    details: ['Painéis em mesh respirável', 'Compressão média', 'Recortes estratégicos', 'Cintura dupla com bolso', 'Costura flat-lock'],
  },
  {
    id: 9,
    name: 'Top Core Seamless',
    category: 'Top Esportivo',
    price: 159,
    oldPrice: null,
    badge: 'Mais Vendido',
    stock: 20,
    colors: ['#c0c7b5', '#d7dad2', '#a7b197'],
    bg: 'linear-gradient(145deg, #dfe1db, #d1d5cb, #c4cbb9)',
    images: ['assets/products/top-esportivo.jpeg'],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Seamless de segunda geração que se adapta ao corpo como uma segunda pele. Para functional training, corrida e HIIT.',
    details: ['Seamless de segunda geração', 'Suporte médio com compressão gradual', 'Alças fixas cruzadas', 'Bojo removível', 'Antiodor permanente'],
  },
  {
    id: 10,
    name: 'Short Canelado Mini',
    category: 'Shorts',
    price: 179,
    oldPrice: null,
    badge: 'Novo',
    stock: 11,
    colors: ['#cdd1c7', '#e5e7e1', '#b6bfaa'],
    bg: 'linear-gradient(145deg, #e6e9e3, #dde0d9, #d1d5cb)',
    images: [],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Tecido ribana especial que valoriza cada curva sem apertar. Comprimento mini com cós franzido.',
    details: ['Tecido Ribana 4-way stretch', 'Cós franzido com elástico interno', 'Comprimento mini (±30cm)', 'Forração interna', 'Lavável à máquina'],
  },
  {
    id: 11,
    name: 'Conjunto Onyx Power',
    category: 'Conjuntos',
    price: 399,
    oldPrice: 489,
    badge: 'Kit',
    stock: 20,
    colors: ['#1a1a1a'],
    bg: 'linear-gradient(145deg, #3a3a3a, #222222, #0f0f0f)',
    images: [
      'assets/products/conjunto-onyx-power-1.jpg',
      'assets/products/conjunto-onyx-power-2.jpg',
      'assets/products/conjunto-onyx-power-3.jpg',
      'assets/products/conjunto-onyx-power-4.jpg',
    ],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Coleção Onyx — edição limitada. Bandeau top + shorts em preto absoluto, tecido de alto desempenho com corte que define a silhueta com precisão. Para treinos de alta intensidade ou para o dia a dia, do treino à rua.',
    details: ['Edição limitada Coleção Onyx', 'Bandeau top + shorts', 'Tecido de alto desempenho', 'Corte que define a silhueta', 'Do treino à rua'],
  },
  {
    id: 12,
    name: 'Moletom Cropped',
    category: 'Camisetas Oversized',
    price: 219,
    oldPrice: null,
    badge: null,
    stock: 14,
    colors: ['#e5e7e1', '#f0f2ef', '#cdd1c7'],
    bg: 'linear-gradient(145deg, #eceeea, #e5e7e1, #dde0d9)',
    images: [],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Companheiro perfeito para dias de descanso ou aquecimento pré-treino. Felpudo por dentro, liso por fora, caimento crop moderno.',
    details: ['70% Algodão + 30% Poliéster', 'Interior felpado macio', 'Caimento cropped', 'Punhos e barra com ribana', 'Lavagem a frio'],
  },
  {
    id: 13,
    name: 'Legging Veludo',
    category: 'Leggings',
    price: 309,
    oldPrice: null,
    badge: 'Novo',
    stock: 6,
    colors: ['#c8cebe', '#dde0d9', '#b4bda7'],
    bg: 'linear-gradient(145deg, #e3e5df, #d5d8d0, #cad0c0)',
    images: [],
    sizes: ['P', 'M', 'G', 'GG'],
    description: 'Luxo em movimento. Superfície aveludada, compressão firme por dentro. Da aula de pilates ao jantar.',
    details: ['Tecido externo aveludado premium', 'Forro interno compressivo', 'Cintura alta de 12cm', 'Sem costura lateral', 'Lavagem à mão'],
  },
  {
    id: 14,
    name: 'Mochila Esportiva',
    category: 'Acessórios',
    price: 209,
    oldPrice: null,
    badge: null,
    stock: 30,
    colors: ['#c2c9b7', '#dbded6', '#a7b197'],
    bg: 'linear-gradient(145deg, #dfe2db, #d7dad2, #cbd1c3)',
    images: [],
    sizes: ['Único'],
    description: 'Espaço para tudo com estilo Thymos. Compartimento principal amplo, bolso com organização interna, porta-squeeze lateral.',
    details: ['Capacidade: 22 litros', 'Material impermeável', 'Compartimento para notebook 15"', 'Porta-squeeze lateral', 'Alças ergonômicas'],
  },
  {
    id: 15,
    name: 'Kit Elásticos de Treino',
    category: 'Acessórios',
    price: 89,
    oldPrice: null,
    badge: 'Mais Vendido',
    stock: 50,
    colors: ['#bcc4b0', '#d3d6cd', '#a8b298'],
    bg: 'linear-gradient(145deg, #d7dad2, #cbd1c3, #c2c9b7)',
    images: [],
    sizes: ['Único'],
    description: '3 níveis de resistência para intensificar qualquer treino. Látex premium com alta durabilidade e grip antiderrapante.',
    details: ['Kit com 3 elásticos (leve/médio/forte)', 'Látex natural', 'Borda antiderrapante em silicone', 'Largura de 8cm', 'Inclui bolsa organizadora'],
  },
  {
    id: 16,
    name: 'Squeeze Premium',
    category: 'Acessórios',
    price: 109,
    oldPrice: null,
    badge: 'Novo',
    stock: 25,
    colors: ['#b8c0ac', '#d0d4ca', '#9da88c'],
    bg: 'linear-gradient(145deg, #e0e2dc, #d3d6cd, #c6ccbc)',
    images: [],
    sizes: ['500ml', '750ml'],
    description: 'Aço inoxidável de parede dupla. Gelado 24h ou quente 12h. Tampa de abertura rápida com trava.',
    details: ['Aço inoxidável 18/8 parede dupla', 'Gelado 24h / quente 12h', 'Capacidade: 500ml ou 750ml', 'Tampa de abertura rápida', 'Livre de BPA'],
  },
];

// Catálogo efetivamente exibido — populado por loadProducts() a partir da
// API real (Supabase). Começa com o fallback para nunca ficar vazio caso
// o carregamento demore ou falhe.
let products = MOCK_PRODUCTS_FALLBACK.slice();

const DEFAULT_PRODUCT_BG = 'linear-gradient(145deg, #e1e3dd, #d3d6cd, #c6ccbc)';

/**
 * Converte um produto vindo de GET /products (apps/api → tabela `produtos`
 * no Supabase) para o mesmo formato que createProductCard()/openProductModal()
 * já sabem renderizar. Mantém o storefront funcionando com o catálogo real,
 * sem exigir a Nuvemshop conectada — ver routes/shop.ts.
 */
function mapApiProduct(p) {
  const hasPromo = typeof p.promotionalPrice === 'number' && p.promotionalPrice > 0 && p.promotionalPrice < p.price;
  return {
    id: p.id,
    name: p.name,
    category: p.category || 'Thymos',
    price: hasPromo ? p.promotionalPrice : p.price,
    oldPrice: hasPromo ? p.price : null,
    badge: p.stock > 0 && p.stock <= 5 ? 'Últimas unidades' : null,
    stock: p.stock,
    colors: [], // o catálogo real ainda não tem swatches de cor em hex
    bg: DEFAULT_PRODUCT_BG,
    images: p.images || [],
    sizes: p.sizes || [],
    description: p.description || '',
    details: [],
  };
}

async function loadProducts() {
  const apiBaseUrl = window.THYMOS_CONFIG?.apiBaseUrl;
  if (!apiBaseUrl) return; // sem API configurada — segue com o fallback
  try {
    const res = await fetch(`${apiBaseUrl}/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.products) && data.products.length > 0) {
      products = data.products.map(mapApiProduct);
    }
  } catch (err) {
    // Mantém o catálogo de exemplo — nunca deixa a página quebrada ou em
    // branco por causa de uma falha de rede/API.
    console.warn('Não foi possível carregar o catálogo real, usando exemplos:', err.message);
  }
}

// ── CONFIGURAÇÕES ──
const FREE_SHIPPING   = 299;   // valor mínimo para frete grátis
const DISCOUNT_CODE   = 'THYMOS10'; // cupão de 10%
let cart              = [];
let cartDiscount      = 0;
// Código do cupão aplicado no momento — cartDiscount é só o fator numérico
// (0.10) usado para mostrar o total na tela; o checkout manda este código
// para o servidor, que recalcula o desconto de verdade a partir dele (ver
// createPixOrder() e apps/api/src/routes/shop.ts). Nunca confiamos no total
// calculado aqui para o valor cobrado de fato.
let appliedCouponCode = null;

// ── DOM ──
const hamburger    = document.getElementById('hamburger');
const mobileMenu   = document.getElementById('mobile-menu');
const cartBtn      = document.getElementById('cart-btn');
const cartDrawer   = document.getElementById('cart-drawer');
const cartOverlay  = document.getElementById('cart-overlay');
const cartClose    = document.getElementById('cart-close');
const cartCount    = document.getElementById('cart-count');
const cartItems    = document.getElementById('cart-items');
const cartEmpty    = document.getElementById('cart-empty');
const cartFooter   = document.getElementById('cart-footer');
const productsGrid = document.getElementById('products-grid');

// ══════════════════════
// NAVEGAÇÃO DE CAMADAS (botão/gesto "voltar" do navegador)
// ══════════════════════
// Bug relatado: abrir um produto/checkout/carrinho não registrava nada no
// histórico do navegador — no celular (inclusive dentro do navegador
// embutido do WhatsApp), apertar "voltar" não fechava a camada aberta, ele
// saía do site inteiro em vez de voltar pra vitrine. Cada abertura empilha
// um estado extra no histórico; ao fechar pela UI (X, clique fora, botão
// "Voltar para a loja") consome esse estado com history.back(), deixando o
// botão físico de voltar do navegador com o mesmo efeito. `overlayNavDepth`
// evita chamar back() mais vezes do que estados realmente empilhados.
let overlayNavDepth = 0;

function pushOverlayState() {
  overlayNavDepth++;
  history.pushState({ thymosOverlay: true }, '');
}

// Chamar apenas em fechamentos disparados pela própria UI (clique, tecla
// Esc, etc.) — nunca a partir do listener de popstate abaixo, senão cada
// "voltar" físico dispararia um history.back() extra (loop). Não decrementa
// overlayNavDepth aqui: history.back() sempre dispara popstate (mesmo
// quando chamado pelo próprio código), e é lá que a contagem é ajustada —
// decrementar nos dois lugares descontaria a mesma navegação duas vezes.
function popOverlayState() {
  if (overlayNavDepth > 0) history.back();
}

window.addEventListener('popstate', () => {
  if (overlayNavDepth > 0) overlayNavDepth--; // o navegador já consumiu este estado sozinho
  // Fecha (silenciosamente, sem mexer no histórico de novo) qualquer
  // camada que ainda esteja na tela — cobre produto, checkout, informações
  // e carrinho, na ordem em que normalmente ficariam por cima uma da outra.
  if (document.getElementById('product-modal')) closeModal(true);
  if (document.getElementById('checkout-page')) closeCheckoutPage(true);
  if (document.getElementById('info-modal')) closeInfoModal(true);
  if (cartDrawer.classList.contains('open')) closeCart(true);
});

// ══════════════════════
// NAVBAR
// ══════════════════════
// O toggle de 'scrolled'/'on-hero' conforme a altura do hero vive no
// <script> inline de index.html (precisa saber a altura da seção .hero,
// que só existe na home) — não duplicar aqui para não ter dois listeners
// de scroll competindo pela mesma classe a cada frame.

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});
document.querySelectorAll('.mobile-menu a').forEach(l => l.addEventListener('click', () => {
  hamburger.classList.remove('open');
  mobileMenu.classList.remove('open');
}));

// ══════════════════════
// MODAL DE PRODUTO
// ══════════════════════
let currentImageIndex = 0;

function openModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  document.getElementById('product-modal')?.remove();

  // Galeria: usa imagens reais se existirem, caso contrário usa gradiente
  const hasImages = p.images && p.images.length > 0;
  currentImageIndex = 0;

  // Stock badge (classes conforme .modal-stock-tag do style.css)
  const stockBadge = p.stock <= 5
    ? `<div class="modal-stock-tag low">${ICONS.warning} Apenas ${p.stock} em estoque!</div>`
    : p.stock <= 10
    ? `<div class="modal-stock-tag med">✓ ${p.stock} unidades disponíveis</div>`
    : `<div class="modal-stock-tag ok">✓ Em estoque (${p.stock} un.)</div>`;

  const badgeHtml    = p.badge ? `<div class="modal-badge-tag ${p.badge==='Novo'?'new':''}">${p.badge}</div>` : '';
  const oldPriceHtml = p.oldPrice ? `<span class="modal-old">R$${p.oldPrice}</span>` : '';
  const discountHtml = p.oldPrice ? `<span class="modal-disc">-${Math.round((1-p.price/p.oldPrice)*100)}%</span>` : '';

  // Galeria principal
  const mainImgHtml = hasImages
    ? `<img src="${p.images[0]}" alt="${p.name}" id="modal-main-img" />`
    : `<div class="gallery-ph" id="modal-main-img" style="background:${p.bg}">
         <svg viewBox="0 0 400 530" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.5">
           <defs><radialGradient id="mgr${p.id}" cx="50%" cy="35%" r="55%">
             <stop offset="0%" stop-color="#acb59e" stop-opacity="0.25"/>
             <stop offset="100%" stop-color="#0b130f" stop-opacity="0"/>
           </radialGradient></defs>
           <rect width="400" height="530" fill="url(#mgr${p.id})"/>
           <path d="M160 65 Q200 35 240 65 Q275 105 268 165 Q260 215 248 265 Q234 325 230 385"
                 stroke="rgba(114,138,110,0.25)" stroke-width="1.5" fill="none"/>
           <ellipse cx="200" cy="140" rx="58" ry="82" fill="rgba(114,138,110,0.08)"/>
         </svg>
       </div>`;

  // Miniaturas
  const thumbCount = hasImages ? p.images.length : 3;
  const thumbsHtml = Array.from({length: thumbCount}, (_, i) => {
    const src = hasImages ? p.images[i] : null;
    return src
      ? `<div class="g-thumb ${i===0?'on':''}" onclick="switchImage(${i},'${src}')"><img src="${src}" alt="foto ${i+1}"/></div>`
      : `<div class="g-thumb ${i===0?'on':''}" onclick="switchGradient(${i})" style="background:${p.bg};filter:brightness(${1 + i*0.2})"></div>`;
  }).join('');

  // Tamanhos
  const sizesHtml = p.sizes
    ? p.sizes.map(s => `<button class="size-btn" onclick="selectSize(this)">${s}</button>`).join('')
    : '';

  // Cores
  const colorsHtml = p.colors.map((c, i) =>
    `<div class="color-swatch ${i===0?'on':''}" style="background:${c}" onclick="selectColor(this)" title="Cor ${i+1}"></div>`
  ).join('');

  // Detalhes
  const detailsHtml = (p.details||[]).map(d => `<li>${d}</li>`).join('');

  const modal = document.createElement('div');
  modal.id = 'product-modal';
  modal.className = 'prod-modal';
  modal.innerHTML = `
    <div class="modal-scrim" id="modal-overlay"></div>
    <div class="modal-box">
      <button class="modal-x" id="modal-close" aria-label="Fechar">✕</button>

      <div class="modal-grid">

        <!-- ── GALERIA ── -->
        <div class="modal-gallery-side">
          ${badgeHtml}
          <div class="gallery-main" id="modal-main-wrap">
            ${mainImgHtml}
            ${thumbCount > 1 ? `
            <button class="gallery-arrow prev" onclick="galleryNav(-1)">‹</button>
            <button class="gallery-arrow next" onclick="galleryNav(1)">›</button>` : ''}
          </div>
          <div class="gallery-thumbs" id="modal-thumbs">${thumbsHtml}</div>
        </div>

        <!-- ── INFORMAÇÕES ── -->
        <div class="modal-info">
          <div class="modal-cat">${p.category}</div>
          <h2 class="modal-name">${p.name}</h2>

          <div class="modal-price-row">
            <span class="modal-price">R$${p.price}</span>
            ${oldPriceHtml}
            ${discountHtml}
          </div>
          <div class="modal-install">
            ou <strong>3x de R$${Math.ceil(p.price/3)}</strong> sem juros no cartão
          </div>

          ${stockBadge}

          <p class="modal-desc">${p.description}</p>

          ${p.colors.length > 0 ? `
          <div class="modal-sec">
            <div class="modal-sec-title">Cor</div>
            <div class="colors-row">${colorsHtml}</div>
          </div>` : ''}

          ${sizesHtml ? `
          <div class="modal-sec">
            <div class="modal-sec-title">
              Tamanho
              <a href="#" class="modal-size-guide" onclick="openInfoModal('sizes');return false;">Guia de tamanhos →</a>
            </div>
            <div class="sizes-row" id="modal-sizes-${p.id}">${sizesHtml}</div>
            <div class="modal-hint" id="size-hint-${p.id}" style="display:none">
              ${ICONS.warning} Por favor selecione um tamanho
            </div>
          </div>` : ''}

          ${detailsHtml ? `
          <div class="modal-sec">
            <details class="modal-details">
              <summary>Ver detalhes do produto</summary>
              <ul class="details-list">${detailsHtml}</ul>
            </details>
          </div>` : ''}

          <div class="modal-qty-row">
            <div class="modal-qty-lbl">Quantidade</div>
            <div class="modal-qty-ctrl">
              <button class="mq-btn" id="modal-qty-dec">−</button>
              <span class="mq-num" id="modal-qty-num">1</span>
              <button class="mq-btn" id="modal-qty-inc">+</button>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-dark modal-add-btn" id="modal-add-btn" data-id="${p.id}">
              Adicionar ao Carrinho
            </button>
            <button class="wishlist-btn" onclick="toggleWishlist(this)" aria-label="Favoritar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
          </div>

          <div class="modal-shipping-info">
            <div class="msi-item">${ICONS.truck} <span>Frete grátis acima de R$${FREE_SHIPPING}</span></div>
            <div class="msi-item">${ICONS.refresh} <span>Troca grátis em até 30 dias</span></div>
            <div class="msi-item">${ICONS.lock} <span>Pagamento 100% seguro — Pix, cartão, boleto</span></div>
          </div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.classList.add('open'));
  pushOverlayState();

  // Fechar
  modal.querySelector('#modal-overlay').addEventListener('click', closeModal);
  modal.querySelector('#modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', handleEsc);

  // Quantidade
  let qty = 1;
  const qtyNum = modal.querySelector('#modal-qty-num');
  modal.querySelector('#modal-qty-inc').addEventListener('click', () => {
    if (qty < p.stock) { qty++; qtyNum.textContent = qty; }
  });
  modal.querySelector('#modal-qty-dec').addEventListener('click', () => {
    if (qty > 1) { qty--; qtyNum.textContent = qty; }
  });

  // Adicionar ao carrinho com quantidade
  modal.querySelector('#modal-add-btn').addEventListener('click', function() {
    const sizesEl = modal.querySelector(`#modal-sizes-${p.id}`);
    const hintEl  = modal.querySelector(`#size-hint-${p.id}`);
    if (sizesEl && p.sizes.length > 1) {
      const selected = sizesEl.querySelector('.size-btn.on');
      if (!selected) {
        hintEl.style.display = 'block';
        sizesEl.classList.add('shake');
        setTimeout(() => sizesEl.classList.remove('shake'), 500);
        return;
      }
    }
    addToCart(p.id, this, qty);
    // fromHistory=true: addToCart() já abriu o carrinho por cima do modal
    // (empilhando o próprio estado no histórico) — se este fechamento
    // também chamasse popOverlayState(), o history.back() acabaria
    // consumindo o estado do CARRINHO (o do topo), fechando-o junto por
    // engano assim que ele abrisse. O estado do modal fica "por baixo",
    // sem problema: só é consumido quando o carrinho for fechado depois.
    setTimeout(() => closeModal(true), 900);
  });
}

// Navegação da galeria
function galleryNav(dir) {
  const thumbs = document.querySelectorAll('.g-thumb');
  if (!thumbs.length) return;
  currentImageIndex = (currentImageIndex + dir + thumbs.length) % thumbs.length;
  thumbs[currentImageIndex].click();
}
window.galleryNav = galleryNav;

function switchImage(index, src) {
  const img = document.getElementById('modal-main-img');
  if (img) img.src = src;
  document.querySelectorAll('.g-thumb').forEach((t, i) => t.classList.toggle('on', i === index));
  currentImageIndex = index;
}
window.switchImage = switchImage;

function switchGradient(index) {
  document.querySelectorAll('.g-thumb').forEach((t, i) => t.classList.toggle('on', i === index));
  currentImageIndex = index;
}
window.switchGradient = switchGradient;

function closeModal(fromHistory) {
  const modal = document.getElementById('product-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.removeEventListener('keydown', handleEsc);
  setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 350);
  if (fromHistory !== true) popOverlayState();
}
function handleEsc(e) { if (e.key === 'Escape') closeModal(); }

// ══════════════════════
// MODAL DE INFORMAÇÕES (Guia de Tamanhos, FAQ, Frete e Trocas,
// Rastrear Pedido, Privacidade) — conteúdo real, reaproveitando a mesma
// estrutura visual do modal de produto (.prod-modal/.modal-box) para não
// duplicar CSS. Nenhum destes links fica mais "morto" (href="#" sem ação).
// ══════════════════════
const INFO_MODAL_CONTENT = {
  sizes: {
    title: 'Guia de Tamanhos',
    body: `
      <p class="modal-desc">Medidas aproximadas em centímetros. Em caso de dúvida entre dois tamanhos, recomendamos o maior — nossos tecidos compressivos ajustam ao corpo.</p>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.78rem">
          <thead><tr style="border-bottom:1.5px solid var(--beige)">
            <th style="text-align:left;padding:8px 6px;color:var(--gray-300);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase">Tamanho</th>
            <th style="text-align:left;padding:8px 6px;color:var(--gray-300);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase">Busto</th>
            <th style="text-align:left;padding:8px 6px;color:var(--gray-300);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase">Cintura</th>
            <th style="text-align:left;padding:8px 6px;color:var(--gray-300);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase">Quadril</th>
          </tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--beige)"><td style="padding:8px 6px;font-weight:700">P</td><td style="padding:8px 6px">83–87</td><td style="padding:8px 6px">65–69</td><td style="padding:8px 6px">91–95</td></tr>
            <tr style="border-bottom:1px solid var(--beige)"><td style="padding:8px 6px;font-weight:700">M</td><td style="padding:8px 6px">88–93</td><td style="padding:8px 6px">70–75</td><td style="padding:8px 6px">96–101</td></tr>
            <tr style="border-bottom:1px solid var(--beige)"><td style="padding:8px 6px;font-weight:700">G</td><td style="padding:8px 6px">94–99</td><td style="padding:8px 6px">76–81</td><td style="padding:8px 6px">102–107</td></tr>
            <tr><td style="padding:8px 6px;font-weight:700">GG</td><td style="padding:8px 6px">100–106</td><td style="padding:8px 6px">82–88</td><td style="padding:8px 6px">108–114</td></tr>
          </tbody>
        </table>
      </div>`,
  },
  faq: {
    title: 'Perguntas Frequentes',
    body: `
      <details class="modal-details" open><summary>Quais as formas de pagamento?</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Pix, cartão de crédito (em até 3x sem juros) e boleto bancário.</p></details>
      <details class="modal-details"><summary>Qual o prazo de entrega?</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Normalmente entre 3 e 10 dias úteis, conforme a região, contados a partir da confirmação do pagamento.</p></details>
      <details class="modal-details"><summary>Como funciona a troca?</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Gratuita em até 30 dias corridos após o recebimento, para peças sem uso, com etiqueta e nota fiscal.</p></details>
      <details class="modal-details"><summary>Tem frete grátis?</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Sim, em compras acima de R$${FREE_SHIPPING} para todo o Brasil.</p></details>
      <details class="modal-details"><summary>Como acompanho meu pedido?</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Assim que o pagamento é confirmado, enviamos o código de rastreio por e-mail e WhatsApp.</p></details>`,
  },
  shipping: {
    title: 'Frete e Trocas',
    body: `
      <p class="modal-desc"><strong>Frete:</strong> grátis acima de R$${FREE_SHIPPING}; abaixo disso, calculado conforme o CEP no fechamento do pedido. Prazo estimado de 3 a 10 dias úteis após a confirmação do pagamento.</p>
      <p class="modal-desc"><strong>Trocas:</strong> gratuitas em até 30 dias corridos após o recebimento, para peças sem uso, com etiqueta e nota fiscal.</p>
      <p class="modal-desc" style="border:none"><strong>Reembolsos:</strong> processados em até 10 dias úteis após o recebimento do produto devolvido em nosso centro de distribuição.</p>`,
  },
  tracking: {
    title: 'Rastrear Pedido',
    body: `
      <p class="modal-desc">Assim que confirmamos o pagamento do seu pedido, enviamos por e-mail e WhatsApp o código de rastreio e o prazo estimado de entrega.</p>
      <p class="modal-desc" style="border:none">Já finalizou uma compra e ainda não recebeu essas informações? Fale com a gente pelo <a href="mailto:contato@thymosfit.com.br?subject=Rastrear%20pedido" style="color:var(--nude);text-decoration:underline">contato@thymosfit.com.br</a> informando o nome usado no pedido.</p>`,
  },
  terms: {
    title: 'Termos de Uso',
    body: `
      <p class="modal-desc" style="border:none;padding-bottom:16px">Última atualização: setembro de 2026. Ao acessar ou realizar uma compra nesta loja virtual, você concorda com os termos abaixo.</p>
      <details class="modal-details" open><summary>1. Quem somos</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Esta loja é operada por <strong>THYMOS COMPANY LTDA</strong>, inscrita no CNPJ sob o nº <strong>68.874.570/0001-44</strong>, com sede na R. Manoel Bernardes, 1150, Itaipava, Itajaí/SC, CEP 88.316-400.</p></details>
      <details class="modal-details"><summary>2. Aceitação dos termos</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">O uso deste site implica concordância integral com estes Termos de Uso e com nossa <a href="#" onclick="openInfoModal('privacy');return false;" style="color:var(--nude);text-decoration:underline">Política de Privacidade</a>. Se você não concorda com algum ponto, pedimos que não utilize o site.</p></details>
      <details class="modal-details"><summary>3. Produtos e preços</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Fazemos o possível para manter fotos, descrições, preços e estoque atualizados, mas pequenas divergências podem ocorrer. Preços podem mudar sem aviso prévio, valendo sempre o valor exibido no momento da finalização do pedido.</p></details>
      <details class="modal-details"><summary>4. Pedidos e pagamento</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Aceitamos Pix, cartão de crédito (em até 3x sem juros) e boleto bancário. O pedido só é confirmado após a aprovação do pagamento. Reservamo-nos o direito de cancelar pedidos em caso de indício de fraude, erro de preço/estoque ou dados de entrega incompletos, com reembolso integral quando já houver pagamento.</p></details>
      <details class="modal-details"><summary>5. Entrega e frete</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">O frete é grátis em compras acima de R$${FREE_SHIPPING} e calculado pelo CEP nas demais. O prazo estimado é de 3 a 10 dias úteis após a confirmação do pagamento, podendo variar conforme a transportadora e a região.</p></details>
      <details class="modal-details"><summary>6. Trocas, devoluções e direito de arrependimento</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir da compra em até 7 dias corridos após o recebimento, com reembolso integral. Trocas por tamanho/defeito são gratuitas em até 30 dias corridos, para peças sem uso, com etiqueta e nota fiscal — solicite pelo <a href="mailto:contato@thymosfit.com.br?subject=Troca%20ou%20devolu%C3%A7%C3%A3o" style="color:var(--nude);text-decoration:underline">contato@thymosfit.com.br</a>.</p></details>
      <details class="modal-details"><summary>7. Propriedade intelectual</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Marca, logotipo, textos, fotos e demais conteúdos deste site pertencem à Thymos Company Ltda ou a seus licenciadores, e não podem ser copiados, reproduzidos ou usados comercialmente sem autorização prévia por escrito.</p></details>
      <details class="modal-details"><summary>8. Limitação de responsabilidade</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Não nos responsabilizamos por atrasos causados por transportadoras, greves, desastres naturais ou outros eventos fora do nosso controle razoável, nem pelo uso indevido dos produtos em desacordo com as instruções de cuidado indicadas na etiqueta.</p></details>
      <details class="modal-details"><summary>9. Alterações destes termos</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Podemos atualizar estes termos a qualquer momento para refletir mudanças legais ou operacionais. A versão vigente é sempre a publicada nesta página, com a data de atualização indicada no topo.</p></details>
      <details class="modal-details"><summary>10. Foro e legislação aplicável</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de Itajaí/SC para dirimir eventuais controvérsias, ressalvado o direito do consumidor de optar pelo foro do seu domicílio, conforme o CDC.</p></details>
      <p class="modal-desc" style="border:none;padding-top:16px">Dúvidas? Fale com a gente pelo <a href="mailto:contato@thymosfit.com.br?subject=Termos%20de%20Uso" style="color:var(--nude);text-decoration:underline">contato@thymosfit.com.br</a>.</p>`,
  },
  privacy: {
    title: 'Política de Privacidade',
    body: `
      <p class="modal-desc" style="border:none;padding-bottom:16px">Última atualização: setembro de 2026. Esta política explica como a Thymos Company Ltda coleta, usa e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
      <details class="modal-details" open><summary>1. Quem é o controlador dos seus dados</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0"><strong>THYMOS COMPANY LTDA</strong>, CNPJ 68.874.570/0001-44, com sede na R. Manoel Bernardes, 1150, Itaipava, Itajaí/SC, é a controladora responsável pelo tratamento dos seus dados nesta loja.</p></details>
      <details class="modal-details"><summary>2. Quais dados coletamos</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Nome, e-mail, telefone e endereço de entrega, informados no momento da compra ou do cadastro na newsletter. Também coletamos dados de navegação básicos (páginas visitadas, dispositivo) para melhorar o funcionamento do site.</p></details>
      <details class="modal-details"><summary>3. Para que usamos seus dados</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Para processar e entregar seu pedido, prestar atendimento, emitir nota fiscal e, com seu consentimento explícito (cadastro na newsletter), enviar novidades e promoções — você pode cancelar a qualquer momento pelo link no rodapé dos e-mails.</p></details>
      <details class="modal-details"><summary>4. Com quem compartilhamos</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Compartilhamos apenas o necessário com parceiros que viabilizam a operação: processadoras de pagamento, transportadoras/correios e serviços de e-mail/WhatsApp para comunicação sobre o pedido. Nunca vendemos seus dados a terceiros para fins comerciais.</p></details>
      <details class="modal-details"><summary>5. Cookies</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Usamos cookies essenciais para o funcionamento do carrinho de compras e, eventualmente, cookies de análise para entender como o site é usado. Você pode desativá-los nas configurações do seu navegador, embora isso possa afetar algumas funcionalidades.</p></details>
      <details class="modal-details"><summary>6. Armazenamento e segurança</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Adotamos medidas técnicas e organizacionais razoáveis para proteger seus dados contra acesso não autorizado, perda ou alteração. Seus dados são mantidos apenas pelo tempo necessário às finalidades descritas ou conforme exigido por lei (ex.: obrigações fiscais).</p></details>
      <details class="modal-details"><summary>7. Seus direitos (LGPD)</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Você pode solicitar a qualquer momento a confirmação, o acesso, a correção, a anonimização, a portabilidade ou a exclusão dos seus dados, bem como revogar consentimentos, pelo <a href="mailto:contato@thymosfit.com.br?subject=Privacidade%20de%20dados" style="color:var(--nude);text-decoration:underline">contato@thymosfit.com.br</a>.</p></details>
      <details class="modal-details"><summary>8. Alterações desta política</summary>
        <p class="modal-desc" style="border:none;padding:6px 0 0">Podemos atualizar esta política periodicamente. A versão vigente é sempre a publicada nesta página, com a data de atualização indicada no topo.</p></details>
      <p class="modal-desc" style="border:none;padding-top:16px">Dúvidas sobre seus dados? Fale com a gente pelo <a href="mailto:contato@thymosfit.com.br?subject=Privacidade%20de%20dados" style="color:var(--nude);text-decoration:underline">contato@thymosfit.com.br</a>.</p>`,
  },
};

function openInfoModal(kind) {
  const data = INFO_MODAL_CONTENT[kind];
  if (!data) return;
  document.getElementById('info-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'info-modal';
  modal.className = 'prod-modal';
  modal.innerHTML = `
    <div class="modal-scrim" id="info-modal-overlay"></div>
    <div class="modal-box" style="max-width:560px">
      <button class="modal-x" id="info-modal-close" aria-label="Fechar">✕</button>
      <div class="modal-info" style="padding:34px 30px">
        <h2 class="modal-name" style="margin-bottom:16px">${data.title}</h2>
        ${data.body}
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.classList.add('open'));
  pushOverlayState();

  modal.querySelector('#info-modal-overlay').addEventListener('click', closeInfoModal);
  modal.querySelector('#info-modal-close').addEventListener('click', closeInfoModal);
  document.addEventListener('keydown', handleInfoEsc);
}
window.openInfoModal = openInfoModal;

function closeInfoModal(fromHistory) {
  const modal = document.getElementById('info-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.removeEventListener('keydown', handleInfoEsc);
  setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 350);
  if (fromHistory !== true) popOverlayState();
}
function handleInfoEsc(e) { if (e.key === 'Escape') closeInfoModal(); }

function selectSize(btn) {
  btn.closest('.sizes-row').querySelectorAll('.size-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  const hint = btn.closest('.modal-sec').querySelector('.modal-hint');
  if (hint) hint.style.display = 'none';
}
window.selectSize = selectSize;

function selectColor(dot) {
  dot.closest('.colors-row').querySelectorAll('.color-swatch').forEach(d => d.classList.remove('on'));
  dot.classList.add('on');
}
window.selectColor = selectColor;

function toggleWishlist(btn) {
  btn.classList.toggle('wishlisted');
  const svg = btn.querySelector('path');
  if (btn.classList.contains('wishlisted')) {
    svg.style.fill = '#b8453a';
    svg.style.stroke = '#b8453a';
  } else {
    svg.style.fill = 'none';
    svg.style.stroke = 'currentColor';
  }
}
window.toggleWishlist = toggleWishlist;

// ══════════════════════
// CRIAR CARD DE PRODUTO
// ══════════════════════
function createProductCard(p, delay = 0) {
  const card = document.createElement('div');
  card.className = 'prod-card';
  card.setAttribute('data-id', p.id);
  card.style.transitionDelay = `${delay}s`;

  const hasImg      = p.images && p.images.length > 0;
  const badgeHtml   = p.badge ? `<div class="prod-badge ${p.badge==='Novo'?'new':''}">${p.badge}</div>` : '';
  const oldPriceHtml = p.oldPrice ? `<span class="prod-old">R$${p.oldPrice}</span>` : '';
  const colorDots   = p.colors.map(c => `<div class="color-dot" style="background:${c}"></div>`).join('');
  const stockWarn   = p.stock <= 5 ? `<div class="prod-stock-warn">${ICONS.warning} Últimas ${p.stock} unidades</div>` : '';

  const svgBg = `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.45">
    <defs><radialGradient id="pg${p.id}" cx="50%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#acb59e" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0b130f" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="240" height="320" fill="url(#pg${p.id})"/>
    <path d="M95 40 Q120 20 145 40 Q165 65 160 100 Q155 130 148 160 Q140 195 138 230"
          stroke="rgba(114,138,110,0.2)" stroke-width="1" fill="none"/>
    <ellipse cx="120" cy="85" rx="35" ry="50" fill="rgba(114,138,110,0.06)"/>
  </svg>`;

  const imgHtml = hasImg
    ? `<img src="${p.images[0]}" alt="${p.name}" />`
    : `<div class="prod-img-bg" style="background:${p.bg};position:relative">${svgBg}</div>`;

  card.innerHTML = `
    <div class="prod-img-wrap" data-id="${p.id}">
      ${badgeHtml}
      ${stockWarn}
      ${imgHtml}
      <div class="prod-quick">Ver Detalhes</div>
      <div class="prod-hover-action">
        <button class="add-to-cart" data-id="${p.id}">Adicionar ao Carrinho</button>
      </div>
    </div>
    <div class="prod-info" data-id="${p.id}" style="cursor:pointer">
      <div class="prod-cat">${p.category}</div>
      <div class="prod-name">${p.name}</div>
      <div class="prod-bottom">
        <div>
          <span class="prod-price">R$${p.price}</span>
          ${oldPriceHtml}
        </div>
        <div class="prod-colors">${colorDots}</div>
      </div>
    </div>`;

  card.querySelector('.prod-img-wrap').addEventListener('click', () => openModal(p.id));
  card.querySelector('.prod-info').addEventListener('click', () => openModal(p.id));
  card.querySelector('.add-to-cart').addEventListener('click', e => {
    e.stopPropagation();
    addToCart(p.id, e.currentTarget, 1);
  });

  return card;
}

// ══════════════════════
// RENDERIZAR PRODUTOS (carrossel #products-grid)
// ══════════════════════
// Mostra TODO o catálogo real de uma vez na trilha do carrossel — sem
// paginação/"Ver Todos", já que rolar horizontalmente já dá acesso a
// qualquer produto sem esconder nada atrás de um clique extra.
function renderProducts() {
  products.forEach((p, i) => {
    const card = createProductCard(p, i * 0.06);
    productsGrid.appendChild(card);
  });
  observeCards(productsGrid.querySelectorAll('.prod-card'));
  updateCTAButton();
}

// ══════════════════════
// RENDERIZAR "TODAS AS COLEÇÕES" (seção #collection)
// ══════════════════════
// Lista TODAS as coleções/produtos reais do catálogo (mesmo array `products`
// já carregado do Supabase por loadProducts()) como cards de lookbook —
// nunca itens fictícios/placeholder. Clicar em qualquer card abre o modal
// completo do produto (mesmo openModal() usado na vitrine principal).
function renderCollectionsShowcase() {
  const showcase = document.getElementById('coll-showcase');
  if (!showcase) return;
  showcase.innerHTML = '';
  const delays = [0, 100, 150, 200, 250, 300];

  products.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = 'show-item reveal';
    item.setAttribute('data-delay', String(delays[i % delays.length]));

    const hasImg = p.images && p.images.length > 0;
    const imgHtml = hasImg
      ? `<img src="${p.images[0]}" alt="${p.name}" loading="lazy" decoding="async"/>`
      : `<div class="show-img-fill"></div>`;
    const oldPriceHtml = p.oldPrice ? `<span class="show-old">R$${p.oldPrice}</span>` : '';

    item.innerHTML = `
      <div class="show-img">${imgHtml}</div>
      <div class="show-cat">${p.category}</div>
      <div class="show-name">${p.name}</div>
      <div class="show-price">R$${p.price}${oldPriceHtml}</div>`;
    item.addEventListener('click', () => openModal(p.id));
    showcase.appendChild(item);
  });
}

// ══════════════════════
// CARROSSEL DE PRODUTOS (#products-grid — "Mais Vendidos")
// ══════════════════════
// Setas ao lado da trilha rolam por "página" (largura visível da trilha),
// sempre alinhando no início do card mais próximo via scroll-snap. No touch
// a trilha já é arrastável/deslizável nativamente, sem precisar de JS extra.
function initProductsCarousel() {
  const track = productsGrid;
  const prevBtn = document.getElementById('prod-car-prev');
  const nextBtn = document.getElementById('prod-car-next');
  if (!track || !prevBtn || !nextBtn) return;

  const scrollByPage = dir => {
    track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: 'smooth' });
  };
  prevBtn.addEventListener('click', () => scrollByPage(-1));
  nextBtn.addEventListener('click', () => scrollByPage(1));

  const updateArrows = () => {
    const maxScroll = track.scrollWidth - track.clientWidth - 2;
    prevBtn.disabled = track.scrollLeft <= 0;
    nextBtn.disabled = maxScroll <= 0 || track.scrollLeft >= maxScroll;
    prevBtn.style.opacity = prevBtn.disabled ? '.35' : '1';
    nextBtn.style.opacity = nextBtn.disabled ? '.35' : '1';
  };
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

// Bolinhas de posição (só visíveis no mobile, ver CSS) — uma por produto,
// destacando a mais próxima do início da trilha conforme o usuário rola.
function initProductsDots() {
  const dotsWrap = document.getElementById('prod-dots');
  if (!dotsWrap || !productsGrid || products.length === 0) return;

  dotsWrap.innerHTML = '';
  products.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'prod-dot' + (i === 0 ? ' active' : '');
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  const updateDots = () => {
    const card = productsGrid.querySelector('.prod-card');
    if (!card) return;
    const step = card.getBoundingClientRect().width + 14; // mesmo gap do .prod-grid no mobile
    const idx = Math.min(dots.length - 1, Math.round(productsGrid.scrollLeft / step));
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  };
  productsGrid.addEventListener('scroll', updateDots, { passive: true });
  window.addEventListener('resize', updateDots);
  updateDots();
}

// ══════════════════════
// CARROSSEL DE COMUNIDADE (#community-grid — "Performance No Dia a Dia")
// ══════════════════════
// Mesmo padrão do carrossel de produtos acima, mas com um conjunto fixo de
// itens estáticos (fotos/vídeos reais enviados, não vindos da API) — por
// isso os dots contam os filhos de #community-grid direto do DOM, em vez
// de percorrer um array carregado assincronamente.
function initCommunityCarousel() {
  const track = document.getElementById('community-grid');
  const prevBtn = document.getElementById('community-car-prev');
  const nextBtn = document.getElementById('community-car-next');
  if (!track || !prevBtn || !nextBtn) return;

  const scrollByPage = dir => {
    track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: 'smooth' });
  };
  prevBtn.addEventListener('click', () => scrollByPage(-1));
  nextBtn.addEventListener('click', () => scrollByPage(1));

  const updateArrows = () => {
    const maxScroll = track.scrollWidth - track.clientWidth - 2;
    prevBtn.disabled = track.scrollLeft <= 0;
    nextBtn.disabled = maxScroll <= 0 || track.scrollLeft >= maxScroll;
    prevBtn.style.opacity = prevBtn.disabled ? '.35' : '1';
    nextBtn.style.opacity = nextBtn.disabled ? '.35' : '1';
  };
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

function initCommunityDots() {
  const dotsWrap = document.getElementById('community-dots');
  const track = document.getElementById('community-grid');
  if (!dotsWrap || !track) return;
  const items = Array.from(track.children);
  if (items.length === 0) return;

  dotsWrap.innerHTML = '';
  items.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'prod-dot' + (i === 0 ? ' active' : '');
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  const updateDots = () => {
    const item = track.querySelector('.community-item');
    if (!item) return;
    const step = item.getBoundingClientRect().width + 14; // mesmo gap do .prod-grid no mobile
    const idx = Math.min(dots.length - 1, Math.round(track.scrollLeft / step));
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  };
  track.addEventListener('scroll', updateDots, { passive: true });
  window.addEventListener('resize', updateDots);
  updateDots();
}

// ══════════════════════
// CARROSSEL DE SELOS (#cert-grid — "Tecnologia Sustentável")
// ══════════════════════
// Mesmo padrão dos dois carrosséis acima, pro conjunto fixo dos 4 selos de
// certificação (antes um grid 2x2 apertado — ver PR da seção Comunidade).
function initCertCarousel() {
  const track = document.getElementById('cert-grid');
  const prevBtn = document.getElementById('cert-car-prev');
  const nextBtn = document.getElementById('cert-car-next');
  if (!track || !prevBtn || !nextBtn) return;

  const scrollByPage = dir => {
    track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: 'smooth' });
  };
  prevBtn.addEventListener('click', () => scrollByPage(-1));
  nextBtn.addEventListener('click', () => scrollByPage(1));

  const updateArrows = () => {
    const maxScroll = track.scrollWidth - track.clientWidth - 2;
    prevBtn.disabled = track.scrollLeft <= 0;
    nextBtn.disabled = maxScroll <= 0 || track.scrollLeft >= maxScroll;
    prevBtn.style.opacity = prevBtn.disabled ? '.35' : '1';
    nextBtn.style.opacity = nextBtn.disabled ? '.35' : '1';
  };
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

function initCertDots() {
  const dotsWrap = document.getElementById('cert-dots');
  const track = document.getElementById('cert-grid');
  if (!dotsWrap || !track) return;
  const items = Array.from(track.children);
  if (items.length === 0) return;

  dotsWrap.innerHTML = '';
  items.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'prod-dot' + (i === 0 ? ' active' : '');
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  const updateDots = () => {
    const item = track.querySelector('.cert-card');
    if (!item) return;
    const step = item.getBoundingClientRect().width + 18; // mesmo gap do .prod-grid
    const idx = Math.min(dots.length - 1, Math.round(track.scrollLeft / step));
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  };
  track.addEventListener('scroll', updateDots, { passive: true });
  window.addEventListener('resize', updateDots);
  updateDots();
}

// Toca/pausa cada <video> do carrossel de comunidade só enquanto ele está
// visível na tela — evita rodar 3 vídeos ao mesmo tempo fora da vitrine
// (gasto de dados/bateria à toa, especialmente no mobile). Mudo e em loop,
// então tocar automaticamente é permitido pelos navegadores sem interação.
function initCommunityVideos() {
  const videos = document.querySelectorAll('.community-video');
  if (videos.length === 0) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => { /* autoplay bloqueado — sem problema, o poster continua visível */ });
      } else {
        video.pause();
      }
    });
  }, { threshold: .35 });
  videos.forEach(v => io.observe(v));
}

// "Nudge": um pequeno vai-e-volta automático a primeira vez que o
// carrossel entra na tela — sinaliza que dá pra arrastar/rolar sem
// precisar de instrução escrita. Só no mobile (onde as setas já não
// aparecem) e só se o usuário não pediu movimento reduzido.
function initProductsNudge() {
  if (!productsGrid) return;
  if (window.matchMedia('(min-width: 769px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const section = document.getElementById('products');
  if (!section) return;

  const nudge = () => {
    productsGrid.scrollTo({ left: 46, behavior: 'smooth' });
    setTimeout(() => productsGrid.scrollTo({ left: 0, behavior: 'smooth' }), 650);
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { nudge(); io.disconnect(); }
    });
  }, { threshold: 0.4 });
  io.observe(section);
}

// Atualiza apenas o texto de contagem — o resto do carrossel já existe no
// HTML estático (index.html), evitando recriar/duplicar elementos a cada
// renderização.
function updateCTAButton() {
  const hint = document.getElementById('products-hint');
  if (hint) hint.textContent = `${products.length} produtos disponíveis`;
}

function observeCards(cards) {
  const o = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){e.target.classList.add('visible');o.unobserve(e.target);}}), {threshold:.1});
  cards.forEach(c => o.observe(c));
}

// ══════════════════════
// CARRINHO
// ══════════════════════
function addToCart(productId, btn, qty = 1) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, p.stock);
  } else {
    cart.push({ ...p, qty });
  }

  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✓ Adicionado!';
    btn.classList.add('added');
    btn.disabled = true;
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('added'); btn.disabled = false; }, 1500);
  }

  updateCartUI();
  openCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartUI();
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  const p = products.find(x => x.id === id);
  item.qty = Math.max(1, Math.min(item.qty + delta, p?.stock || 99));
  if (item.qty <= 0) { removeFromCart(id); return; }
  updateCartUI();
}

function applyCoupon() {
  const input = document.getElementById('cart-coupon-input');
  const msg   = document.getElementById('cart-coupon-msg');
  if (!input || !msg) return;
  if (input.value.trim().toUpperCase() === DISCOUNT_CODE) {
    cartDiscount = 0.10;
    appliedCouponCode = DISCOUNT_CODE;
    msg.textContent = '✓ Cupão THYMOS10 aplicado — 10% de desconto!';
    msg.className = 'coupon-msg ok';
  } else {
    cartDiscount = 0;
    appliedCouponCode = null;
    msg.textContent = '✗ Cupão inválido.';
    msg.className = 'coupon-msg err';
  }
  updateCartUI();
}
window.applyCoupon = applyCoupon;

function updateCartUI() {
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal   = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount   = Math.round(subtotal * cartDiscount);
  const total      = subtotal - discount;

  // Badge de contagem
  cartCount.textContent = totalItems;
  cartCount.classList.toggle('visible', totalItems > 0);

  // Contador no header do carrinho
  const hCount = document.getElementById('cart-header-count');
  if (hCount) hCount.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`;

  // Barra de frete grátis
  const bar     = document.getElementById('shipping-bar-fill');
  const barText = document.getElementById('shipping-bar-text');
  const missing = document.getElementById('shipping-missing');
  if (bar && barText) {
    const pct = Math.min((total / FREE_SHIPPING) * 100, 100);
    bar.style.width = pct + '%';
    if (total >= FREE_SHIPPING) {
      barText.innerHTML = `${ICONS.check} Parabéns! Você ganhou <strong>frete grátis</strong>!`;
    } else {
      const diff = FREE_SHIPPING - total;
      if (missing) missing.textContent = `R$${diff.toLocaleString('pt-BR')}`;
    }
  }

  if (cart.length === 0) {
    cartEmpty.style.display = 'flex';
    cartFooter.style.display = 'none';
    cartItems.innerHTML = '';
    cartItems.appendChild(cartEmpty);
    return;
  }

  cartEmpty.style.display = 'none';
  cartFooter.style.display = 'block';

  // Valores
  document.getElementById('cart-subtotal').textContent = `R$${subtotal.toLocaleString('pt-BR')}`;
  document.getElementById('cart-total').textContent    = `R$${total.toLocaleString('pt-BR')}`;

  const discRow = document.getElementById('cart-discount-row');
  const discVal = document.getElementById('cart-discount');
  if (discRow && discVal) {
    discRow.style.display = cartDiscount > 0 ? 'flex' : 'none';
    discVal.textContent = `-R$${discount.toLocaleString('pt-BR')}`;
  }

  const ship = document.getElementById('cart-shipping-val');
  if (ship) ship.textContent = total >= FREE_SHIPPING ? 'GRÁTIS' : 'A calcular';
  ship?.classList.toggle('cart-free', total >= FREE_SHIPPING);

  const inst = document.getElementById('cart-installment-val');
  if (inst) inst.textContent = `3x de R$${Math.ceil(total/3).toLocaleString('pt-BR')}`;

  // Items
  cartItems.querySelectorAll('.cart-item').forEach(el => el.remove());

  cart.forEach(item => {
    const hasImg = item.images && item.images.length > 0;
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div class="ci-img" style="position:relative;${hasImg ? '' : `background:${item.bg};`}">
        ${hasImg
          ? `<img src="${item.images[0]}" alt="${item.name}"/>`
          : `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 50% 40% at 50% 30%,rgba(114,138,110,0.18) 0%,transparent 70%)"></div>`}
      </div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-cat">${item.category}</div>
        <div class="ci-controls">
          <div class="qty-wrap">
            <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
          </div>
          <div class="ci-price">R$${(item.price * item.qty).toLocaleString('pt-BR')}</div>
        </div>
      </div>
      <button class="ci-remove" data-id="${item.id}" aria-label="Remover">✕</button>`;

    el.querySelectorAll('.qty-btn').forEach(b => b.addEventListener('click', () =>
      updateQty(parseInt(b.getAttribute('data-id')), b.getAttribute('data-action')==='inc' ? 1 : -1)
    ));
    el.querySelector('.ci-remove').addEventListener('click', () => removeFromCart(item.id));
    cartItems.insertBefore(el, cartEmpty);
  });
}

function openCart()  {
  cartDrawer.classList.add('open'); cartOverlay.classList.add('open'); document.body.style.overflow = 'hidden';
  pushOverlayState();
}
function closeCart(fromHistory) {
  cartDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); document.body.style.overflow = '';
  if (fromHistory !== true) popOverlayState();
}

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
document.getElementById('cart-shop-link')?.addEventListener('click', closeCart);

// ══════════════════════
// CHECKOUT — página própria em 3 passos (Dados → Pagamento → Confirmação),
// independente da Nuvemshop, com o tema visual da Thymos do início ao fim.
// Pagamento é Pix transparente (QR Code/copia-e-cola gerado pela AbacatePay,
// ver apps/api/src/routes/shop.ts) exibido dentro da própria página — nunca
// redireciona pra fora do site. Cartão de crédito aparece na estrutura de
// pagamento (como num checkout "de verdade") mas fica desabilitado — a conta
// AbacatePay ainda não tem cartão homologado, e nunca oferecemos um método
// que na prática não processa. Se window.THYMOS_CONFIG.nuvemshopStoreDomain
// estiver preenchido (loja Nuvemshop conectada), usa o checkout hospedado
// dela em vez desta página — mas isso é opcional, não o caminho padrão.
// ══════════════════════
let checkoutCustomer = null;
let checkoutOrderId = null;
let selectedPaymentMethod = 'pix';
let pixPollTimer = null;
let pixCountdownTimer = null;
// Preenchido por fetchPaymentMethods() (disparado ao abrir o checkout) —
// controla se a aba "Cartão de Crédito" aparece habilitada, sem precisar de
// nenhuma mudança de código quando a AbacatePay liberar cartão pra conta
// (ver GET /payment-methods em apps/api/src/routes/shop.ts). Só Pix até lá.
let paymentMethods = { pix: true, card: false };

async function fetchPaymentMethods() {
  const apiBaseUrl = window.THYMOS_CONFIG?.apiBaseUrl;
  if (!apiBaseUrl) return;
  try {
    const res = await fetch(`${apiBaseUrl}/payment-methods`);
    if (!res.ok) return;
    paymentMethods = await res.json();
  } catch { /* mantém o padrão (só Pix) se a consulta falhar */ }
}

function formatBRL(n) {
  return `R$${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function maskCPF(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length > 10) return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_m, a, b, c) => c ? `(${a}) ${b}-${c}` : (b ? `(${a}) ${b}` : `(${a}`));
  return d.replace(/(\d{2})(\d{4})(\d{0,4})/, (_m, a, b, c) => c ? `(${a}) ${b}-${c}` : (b ? `(${a}) ${b}` : `(${a}`));
}

// Mesma validação (dígito verificador) do servidor — ver isValidCPF em
// apps/api/src/routes/shop.ts. Checar aqui só poupa uma viagem à API por
// erro de digitação; quem decide de verdade é sempre o servidor.
function isValidCPF(raw) {
  const cpf = String(raw).replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split('').map(Number);
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += digits[i] * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === digits[9] && calc(10) === digits[10];
}

function handleCheckout() {
  if (cart.length === 0) return;

  const domain = window.THYMOS_CONFIG?.nuvemshopStoreDomain;
  if (domain) {
    window.location.href = `https://${domain}/checkout`;
    return;
  }

  openCheckoutPage();
}
document.getElementById('checkout-btn')?.addEventListener('click', handleCheckout);

function renderCartSummaryHTML() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = Math.round(subtotal * cartDiscount);
  const total = subtotal - discount;
  const shippingFree = total >= FREE_SHIPPING;
  return `
    <h3 class="cp-summary-title">Resumo do pedido</h3>
    <div class="cp-summary-items">
      ${cart.map(item => `
        <div class="cp-summary-item">
          <div class="cp-si-img">${item.images?.length ? `<img src="${item.images[0]}" alt="${item.name}"/>` : ''}<span class="cp-si-qty">${item.qty}</span></div>
          <div class="cp-si-info">
            <div class="cp-si-name">${item.name}</div>
            <div class="cp-si-cat">${item.category}</div>
          </div>
          <div class="cp-si-price">${formatBRL(item.price * item.qty)}</div>
        </div>`).join('')}
    </div>
    <div class="cp-summary-totals">
      <div class="cp-st-row"><span>Subtotal</span><span>${formatBRL(subtotal)}</span></div>
      ${cartDiscount > 0 ? `<div class="cp-st-row disc"><span>Desconto${appliedCouponCode ? ` (${appliedCouponCode})` : ''}</span><span>-${formatBRL(discount)}</span></div>` : ''}
      <div class="cp-st-row"><span>Frete</span><span class="${shippingFree ? 'cp-free' : ''}">${shippingFree ? 'Grátis' : 'A calcular'}</span></div>
      <div class="cp-st-row total"><span>Total</span><span>${formatBRL(total)}</span></div>
    </div>
    <div class="cp-secure-badge">${ICONS.check} Ambiente seguro — seus dados são protegidos do início ao fim</div>`;
}

function openCheckoutPage() {
  document.getElementById('checkout-page')?.remove();
  // fromHistory=true: fecha o carrinho sem consumir o histórico agora — o
  // pushOverlayState() do checkout logo abaixo já empilha o estado
  // seguinte; chamar popOverlayState() aqui também correria com esse
  // pushState (history.back() é assíncrono) e deixaria o histórico
  // inconsistente.
  closeCart(true);

  const page = document.createElement('div');
  page.id = 'checkout-page';
  page.className = 'checkout-page';
  page.innerHTML = `
    <div class="cp-topbar">
      <div class="cp-logo logo-wordmark">thymos</div>
      <div class="cp-secure">🔒 Compra 100% segura</div>
      <button class="cp-close" id="cp-close" aria-label="Fechar">✕</button>
    </div>
    <div class="cp-steps">
      <div class="cp-step" data-step="1"><span class="cp-step-circle">1</span><span class="cp-step-label">Dados</span></div>
      <div class="cp-step-line"></div>
      <div class="cp-step" data-step="2"><span class="cp-step-circle">2</span><span class="cp-step-label">Pagamento</span></div>
      <div class="cp-step-line"></div>
      <div class="cp-step" data-step="3"><span class="cp-step-circle">3</span><span class="cp-step-label">Confirmação</span></div>
    </div>
    <div class="cp-body">
      <div class="cp-main"></div>
      <aside class="cp-summary" id="cp-summary">${renderCartSummaryHTML()}</aside>
    </div>`;

  document.body.appendChild(page);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => page.classList.add('open'));
  pushOverlayState();

  page.querySelector('#cp-close').addEventListener('click', closeCheckoutPage);

  checkoutCustomer = null;
  checkoutOrderId = null;
  selectedPaymentMethod = 'pix';
  fetchPaymentMethods(); // não bloqueia a abertura — a resposta chega bem antes do passo 2
  setCheckoutStep(1);
}

function closeCheckoutPage(fromHistory) {
  clearInterval(pixPollTimer);
  clearInterval(pixCountdownTimer);
  const page = document.getElementById('checkout-page');
  if (!page) return;
  page.classList.remove('open');
  setTimeout(() => { page.remove(); document.body.style.overflow = ''; }, 300);
  if (fromHistory !== true) popOverlayState();
}

function setCheckoutStep(n) {
  const page = document.getElementById('checkout-page');
  if (!page) return;
  page.querySelectorAll('.cp-step').forEach(el => {
    const stepNum = Number(el.dataset.step);
    el.classList.toggle('active', stepNum === n);
    el.classList.toggle('done', stepNum < n);
  });
  const main = page.querySelector('.cp-main');
  if (n === 1) { main.innerHTML = renderStep1HTML(); wireStep1(); }
  else if (n === 2) { main.innerHTML = renderStep2HTML(); wireStep2(); }
  else if (n === 3) { main.innerHTML = renderStep3HTML(); wireStep3(); }
}

// ── Passo 1: Dados ──
function renderStep1HTML() {
  const c = checkoutCustomer;
  return `
    <h2 class="cp-step-title">Seus dados</h2>
    <p class="cp-step-sub">Preencha para gerar o pagamento Pix — sem sair desta página.</p>
    <form id="cp-form-dados" class="cp-form" novalidate>
      <label class="cp-field"><span>Nome completo</span><input type="text" id="cp-name" value="${c?.name || ''}" autocomplete="name" required /></label>
      <label class="cp-field"><span>E-mail</span><input type="email" id="cp-email" value="${c?.email || ''}" autocomplete="email" required /></label>
      <div class="cp-field-row">
        <label class="cp-field"><span>CPF</span><input type="text" id="cp-cpf" value="${c?.cpf || ''}" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required /></label>
        <label class="cp-field"><span>WhatsApp <em>(opcional)</em></span><input type="tel" id="cp-phone" value="${c?.phone || ''}" inputmode="numeric" maxlength="15" placeholder="(00) 00000-0000" autocomplete="tel" /></label>
      </div>
      <p class="cp-field-err" id="cp-dados-err"></p>
      <button type="submit" class="cp-continue-btn">Continuar para pagamento →</button>
    </form>`;
}

function wireStep1() {
  const cpfInput = document.getElementById('cp-cpf');
  cpfInput?.addEventListener('input', () => { cpfInput.value = maskCPF(cpfInput.value); });
  const phoneInput = document.getElementById('cp-phone');
  phoneInput?.addEventListener('input', () => { phoneInput.value = maskPhone(phoneInput.value); });

  document.getElementById('cp-form-dados')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cp-name').value.trim();
    const email = document.getElementById('cp-email').value.trim();
    const phone = document.getElementById('cp-phone').value.trim();
    const cpf = document.getElementById('cp-cpf').value.trim();
    const err = document.getElementById('cp-dados-err');

    if (!isValidCPF(cpf)) {
      if (err) err.textContent = 'CPF inválido — confira os números digitados.';
      return;
    }
    if (err) err.textContent = '';

    checkoutCustomer = { name, email, phone, cpf };
    setCheckoutStep(2);
  });
}

// ── Passo 2: Pagamento ──
// A aba Cartão só aparece habilitada quando paymentMethods.card === true
// (ver fetchPaymentMethods/GET /payment-methods) — enquanto a AbacatePay não
// homologar cartão pra conta, fica com o badge "Em breve" e desabilitada,
// nunca oferecendo um método que na prática não processa.
function renderStep2HTML() {
  const cardOn = !!paymentMethods.card;
  const pixActive = selectedPaymentMethod === 'pix';
  return `
    <h2 class="cp-step-title">Forma de pagamento</h2>
    <div class="cp-pay-tabs">
      <button class="cp-pay-tab${pixActive ? ' active' : ''}" type="button" data-method="pix">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 L22 12 L12 22 L2 12 Z"/></svg>
        Pix <span class="cp-tab-badge instant">Instantâneo</span>
      </button>
      <button class="cp-pay-tab${cardOn ? (pixActive ? '' : ' active') : ' disabled'}" type="button" data-method="card"
        ${cardOn ? '' : 'disabled title="Em breve — por enquanto pague com Pix, é instantâneo."'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        Cartão de Crédito ${cardOn ? '' : '<span class="cp-tab-badge soon">Em breve</span>'}
      </button>
    </div>
    <div class="cp-pay-panel" id="cp-pay-panel">
      <div class="cp-pix-loading"><span class="pix-spinner"></span> ${pixActive ? 'Gerando cobrança Pix...' : 'Gerando link de pagamento...'}</div>
    </div>
    <button class="cp-back-btn" id="cp-back-to-dados" type="button">← Voltar para os dados</button>`;
}

function wireStep2() {
  document.getElementById('cp-back-to-dados')?.addEventListener('click', () => setCheckoutStep(1));
  document.querySelectorAll('.cp-pay-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.disabled || tab.dataset.method === selectedPaymentMethod) return;
      selectedPaymentMethod = tab.dataset.method;
      document.querySelectorAll('.cp-pay-tab').forEach(t => t.classList.toggle('active', t.dataset.method === selectedPaymentMethod));
      const panel = document.getElementById('cp-pay-panel');
      if (panel) panel.innerHTML = `<div class="cp-pix-loading"><span class="pix-spinner"></span> ${selectedPaymentMethod === 'pix' ? 'Gerando cobrança Pix...' : 'Gerando link de pagamento...'}</div>`;
      createOrder();
    });
  });
  createOrder();
}

async function createOrder() {
  const panel = document.getElementById('cp-pay-panel');
  const apiBaseUrl = window.THYMOS_CONFIG?.apiBaseUrl;
  if (!apiBaseUrl) {
    if (panel) panel.innerHTML = `<p class="cp-pix-error">Checkout indisponível no momento. Tente novamente mais tarde.</p>`;
    return;
  }
  try {
    // Só id + quantidade — preço e nome vêm sempre do catálogo real no
    // servidor (nunca confiamos no que o cliente manda aqui, ver
    // apps/api/src/routes/shop.ts). O couponCode é só um pedido de
    // validação: quem decide se ele é válido e qual o desconto real
    // também é o servidor.
    const res = await fetch(`${apiBaseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: checkoutCustomer.name,
        customerEmail: checkoutCustomer.email,
        customerPhone: checkoutCustomer.phone || undefined,
        customerTaxId: checkoutCustomer.cpf,
        items: cart.map(i => ({ productId: i.id, qty: i.qty })),
        couponCode: appliedCouponCode || undefined,
        paymentMethod: selectedPaymentMethod,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    checkoutOrderId = data.orderId;
    cart = [];
    cartDiscount = 0;
    appliedCouponCode = null;
    updateCartUI();

    if (data.pix) {
      renderPixPanel(data.pix);
      startPixCountdown(data.pix.expiresAt);
      startPixPolling(data.orderId, apiBaseUrl);
    } else if (data.paymentUrl) {
      // Cartão: link hospedado da AbacatePay — sai do site pra pagar (única
      // forma de aceitar cartão até o método transparente ser liberado).
      if (panel) panel.innerHTML = `<p class="cp-pix-error" style="color:var(--nude-dark)">Redirecionando para o pagamento seguro...</p>`;
      window.location.href = data.paymentUrl;
    } else {
      // Sem cobrança automática (integração de pagamento não configurada
      // neste ambiente) — o pedido já foi registrado, a loja entra em contato.
      if (panel) panel.innerHTML = `<p class="cp-pix-error" style="color:var(--nude-dark)">✓ Pedido #${data.orderId} recebido! Entraremos em contato em breve para confirmar pagamento e entrega.</p>`;
    }
  } catch (err) {
    if (panel) {
      panel.innerHTML = `
        <p class="cp-pix-error">Não foi possível gerar o pagamento agora. Tente novamente.</p>
        <button class="cp-retry-btn" id="cp-pix-retry" type="button">Tentar novamente</button>`;
      document.getElementById('cp-pix-retry')?.addEventListener('click', createOrder);
    }
    console.warn('Falha ao criar pedido:', err.message);
  }
}

function renderPixPanel(pix) {
  const panel = document.getElementById('cp-pay-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="pix-box" id="pix-box">
      <div class="pix-qr-wrap"><img src="${pix.brCodeBase64}" alt="QR Code Pix" class="pix-qr" /></div>
      <p class="pix-hint">Abra o app do seu banco e escaneie o QR Code, ou copie o código abaixo</p>
      <div class="pix-code-row">
        <input type="text" readonly class="pix-code-input" id="pix-code-input" value="${pix.brCode}" />
        <button class="pix-copy-btn" id="pix-copy-btn" type="button">Copiar</button>
      </div>
      <div class="pix-status"><span class="pix-spinner"></span> Aguardando pagamento<span class="pix-timer" id="pix-timer"></span></div>
    </div>`;

  document.getElementById('pix-copy-btn')?.addEventListener('click', () => {
    const input = document.getElementById('pix-code-input');
    navigator.clipboard?.writeText(pix.brCode).then(() => {
      const btn = document.getElementById('pix-copy-btn');
      btn.textContent = 'Copiado!';
      setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
    }).catch(() => { input?.select(); });
  });
}

function startPixCountdown(expiresAt) {
  clearInterval(pixCountdownTimer);
  const expiresMs = new Date(expiresAt).getTime();
  const tick = () => {
    const el = document.getElementById('pix-timer');
    if (!el) { clearInterval(pixCountdownTimer); return; }
    const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    el.textContent = ` (expira em ${mm}:${ss})`;
    if (remaining <= 0) clearInterval(pixCountdownTimer);
  };
  tick();
  pixCountdownTimer = setInterval(tick, 1000);
}

function startPixPolling(orderId, apiBaseUrl) {
  clearInterval(pixPollTimer);
  pixPollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/orders/${orderId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'pago') {
        clearInterval(pixPollTimer);
        clearInterval(pixCountdownTimer);
        setCheckoutStep(3);
      }
    } catch { /* falha de rede pontual — tenta de novo no próximo tick */ }
  }, 4000);
}

// ── Passo 3: Confirmação ──
function renderStep3HTML() {
  return `
    <div class="cp-success">
      <div class="pix-paid-icon">✓</div>
      <h2 class="cp-step-title">Pagamento confirmado!</h2>
      <p class="cp-step-sub">Pedido #${checkoutOrderId} — obrigada por comprar na Thymos 💚<br/>Você vai receber a confirmação por e-mail em breve.</p>
      <button class="cp-continue-btn" id="cp-finish-btn" type="button">Voltar para a loja</button>
    </div>`;
}

function wireStep3() {
  document.getElementById('cp-finish-btn')?.addEventListener('click', closeCheckoutPage);
}

// ══════════════════════
// SCROLL REVEAL
// ══════════════════════
function initReveal() {
  const o = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){e.target.classList.add('visible');o.unobserve(e.target);}}), {threshold:.08, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal').forEach(el => o.observe(el));
}

// ══════════════════════
// NEWSLETTER
// ══════════════════════
function handleNewsletter(e) {
  e.preventDefault();
  const el = document.getElementById('newsletter-success');
  el.classList.add('visible');
  e.target.reset();
  setTimeout(() => el.classList.remove('visible'), 5000);
}
window.handleNewsletter = handleNewsletter;

// ══════════════════════
// SCROLL SUAVE
// ══════════════════════
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', function(e) {
  const href = this.getAttribute('href');
  if (href === '#') return;
  const t = document.querySelector(href);
  if (t) { e.preventDefault(); window.scrollTo({top: t.getBoundingClientRect().top + window.scrollY - 70, behavior:'smooth'}); }
}));

// Cards de categoria e itens da galeria trio têm cursor:pointer (CSS já
// sinaliza "clicável") mas nenhum handler próprio — levam para a vitrine
// (#products) em vez de parecer clicável e não fazer nada ao clicar.
// (Os itens de "#coll-showcase" são renderizados dinamicamente por
// renderCollectionsShowcase() e já recebem seu próprio handler, que abre
// o modal do produto específico em vez de só rolar a página.)
document.querySelectorAll('.cat-card, .trio-item').forEach(card => card.addEventListener('click', () => {
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

// ══════════════════════
// CURSOR + TILT (só em dispositivos com hover/mouse — ver checagem interna)
// ══════════════════════
function initCursorGlow() {
  if (window.matchMedia('(hover: none)').matches) return;
  const g = Object.assign(document.createElement('div'), {style:'position:fixed;pointer-events:none;z-index:9999;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(114,138,110,0.08) 0%,transparent 70%);transform:translate(-50%,-50%);transition:opacity .3s;opacity:0'});
  document.body.appendChild(g);
  let mx=0,my=0,gx=0,gy=0,vis=false;
  document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; if(!vis){vis=true;g.style.opacity='1';} });
  document.addEventListener('mouseleave', () => { vis=false; g.style.opacity='0'; });
  (function t(){gx+=(mx-gx)*.08;gy+=(my-gy)*.08;g.style.left=gx+'px';g.style.top=gy+'px';requestAnimationFrame(t);})();
}

function initCardTilt() {
  document.querySelectorAll('.cat-card,.testi-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r=card.getBoundingClientRect();
      card.style.transform=`perspective(800px) rotateX(${((e.clientY-r.top-r.height/2)/r.height)*-4}deg) rotateY(${((e.clientX-r.left-r.width/2)/r.width)*4}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transition='transform .5s ease'; card.style.transform=''; });
    card.addEventListener('mouseenter', () => { card.style.transition='transform .15s linear'; });
  });
}

// ══════════════════════
// INIT
// ══════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderProducts();
  initProductsCarousel();
  initProductsDots();
  initProductsNudge();
  initCommunityCarousel();
  initCommunityDots();
  initCommunityVideos();
  initCertCarousel();
  initCertDots();
  renderCollectionsShowcase();
  initReveal();
  initCursorGlow();
  initCardTilt();
  updateCartUI();
});