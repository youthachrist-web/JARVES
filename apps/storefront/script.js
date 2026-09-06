/* ═══════════════════════════════════════════════
   THYMOS — JavaScript Principal
   ═══════════════════════════════════════════════ */
'use strict';

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
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
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
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
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
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
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
    sizes: ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
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
    sizes: ['PP', 'P', 'M', 'G'],
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
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
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
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
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
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
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
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
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
    stock: 4,
    colors: ['#365848', '#5d7757', '#1e3028'],
    bg: 'linear-gradient(145deg, #4f6549, #365848, #2a4438)',
    images: [],
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
    description: 'Coleção Onyx — edição limitada. Preto absoluto, tecido de alto brilho e corte arquitetônico. Para quem entra e a energia muda.',
    details: ['Edição limitada Coleção Onyx', 'Tecido com efeito wet look', 'Legging + top estruturado', 'Costura contrastante em nude', 'Numeração especial'],
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
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
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
    // As fotos salvas no Supabase para o catálogo real são fotos pessoais/de
    // modelos usadas como placeholder de teste, não fotografia de produto
    // aprovada para a vitrine pública — por isso não são exibidas aqui.
    // Nome, preço, estoque etc. continuam vindo normalmente do banco; só a
    // imagem cai no gradiente padrão até existir fotografia de produto real.
    images: [],
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
const INITIAL_COUNT   = 8;
const FREE_SHIPPING   = 299;   // valor mínimo para frete grátis
const DISCOUNT_CODE   = 'THYMOS10'; // cupão de 10%
let showingAll        = false;
let cart              = [];
let cartDiscount      = 0;

// ── DOM ──
const navbar       = document.getElementById('navbar');
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
    ? `<div class="modal-stock-tag low">⚠️ Apenas ${p.stock} em estoque!</div>`
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
              ⚠️ Por favor selecione um tamanho
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
            <div class="msi-item">🚚 <span>Frete grátis acima de R$${FREE_SHIPPING}</span></div>
            <div class="msi-item">🔄 <span>Troca grátis em até 30 dias</span></div>
            <div class="msi-item">🔒 <span>Pagamento 100% seguro — Pix, cartão, boleto</span></div>
          </div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.classList.add('open'));

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
    setTimeout(closeModal, 900);
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

function closeModal() {
  const modal = document.getElementById('product-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.removeEventListener('keydown', handleEsc);
  setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 350);
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
            <tr style="border-bottom:1px solid var(--beige)"><td style="padding:8px 6px;font-weight:700">PP</td><td style="padding:8px 6px">78–82</td><td style="padding:8px 6px">60–64</td><td style="padding:8px 6px">86–90</td></tr>
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
  privacy: {
    title: 'Privacidade',
    body: `
      <p class="modal-desc">Coletamos apenas os dados necessários para processar seu pedido e atendimento: nome, e-mail, telefone e endereço de entrega. Não vendemos nem compartilhamos seus dados com terceiros para fins comerciais.</p>
      <p class="modal-desc">Usamos seu e-mail para comunicações sobre pedidos e, com seu consentimento explícito (cadastro na newsletter), para novidades e promoções — você pode cancelar a qualquer momento.</p>
      <p class="modal-desc" style="border:none">Nos termos da LGPD, você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo <a href="mailto:contato@thymosfit.com.br?subject=Privacidade%20de%20dados" style="color:var(--nude);text-decoration:underline">contato@thymosfit.com.br</a>.</p>`,
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

  modal.querySelector('#info-modal-overlay').addEventListener('click', closeInfoModal);
  modal.querySelector('#info-modal-close').addEventListener('click', closeInfoModal);
  document.addEventListener('keydown', handleInfoEsc);
}
window.openInfoModal = openInfoModal;

function closeInfoModal() {
  const modal = document.getElementById('info-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.removeEventListener('keydown', handleInfoEsc);
  setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 350);
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
  const stockWarn   = p.stock <= 5 ? `<div class="prod-stock-warn">⚠️ Últimas ${p.stock} unidades</div>` : '';

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
// RENDERIZAR PRODUTOS
// ══════════════════════
function renderProducts() {
  products.slice(0, INITIAL_COUNT).forEach((p, i) => {
    const card = createProductCard(p, i * 0.06);
    productsGrid.appendChild(card);
  });
  observeCards(productsGrid.querySelectorAll('.prod-card'));
  updateCTAButton();
}

function toggleProducts() {
  const btn = document.getElementById('toggle-products-btn');
  if (!showingAll) {
    const div = document.createElement('div');
    div.id = 'products-divider';
    div.style.cssText = 'grid-column:1/-1;display:flex;align-items:center;gap:20px;padding:8px 0 4px;opacity:0;transition:opacity 0.5s';
    div.innerHTML = `<div style="flex:1;height:1px;background:rgba(114,138,110,0.18)"></div>
      <span style="font-size:.6rem;font-weight:700;letter-spacing:.3em;color:var(--nude);text-transform:uppercase;white-space:nowrap">Mais Produtos</span>
      <div style="flex:1;height:1px;background:rgba(114,138,110,0.18)"></div>`;
    productsGrid.appendChild(div);
    requestAnimationFrame(() => div.style.opacity = '1');

    products.slice(INITIAL_COUNT).forEach((p, i) => {
      const card = createProductCard(p);
      card.style.cssText += `opacity:0;transform:translateY(32px);transition:opacity .55s ease ${i*.07}s,transform .55s ease ${i*.07}s`;
      productsGrid.appendChild(card);
      requestAnimationFrame(() => setTimeout(() => { card.style.opacity='1'; card.style.transform='translateY(0)'; }, 30));
    });

    showingAll = true;
    btn.textContent = 'Ver Menos ↑';
    btn.setAttribute('aria-expanded', 'true');
  } else {
    [...productsGrid.querySelectorAll('.prod-card')].slice(INITIAL_COUNT).forEach((c, i) => {
      c.style.transition = `opacity .3s ease ${i*.03}s,transform .3s ease ${i*.03}s`;
      c.style.opacity = '0'; c.style.transform = 'translateY(16px)';
    });
    setTimeout(() => {
      [...productsGrid.querySelectorAll('.prod-card')].slice(INITIAL_COUNT).forEach(c => c.remove());
      document.getElementById('products-divider')?.remove();
    }, 350);
    showingAll = false;
    btn.textContent = 'Ver Todos os Produtos ↓';
    btn.setAttribute('aria-expanded', 'false');
    setTimeout(() => document.getElementById('products').scrollIntoView({behavior:'smooth',block:'start'}), 400);
  }
}
window.toggleProducts = toggleProducts;

// Atualiza apenas o texto de contagem — o botão em si já existe no HTML
// estático (index.html), evitando recriar/duplicar o elemento e seu
// listener inline a cada renderização.
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
    msg.textContent = '✓ Cupão THYMOS10 aplicado — 10% de desconto!';
    msg.className = 'coupon-msg ok';
  } else {
    cartDiscount = 0;
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
      barText.innerHTML = '🎉 Parabéns! Você ganhou <strong>frete grátis</strong>!';
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
  if (ship) ship.textContent = total >= FREE_SHIPPING ? 'GRÁTIS 🎉' : 'A calcular';
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

function openCart()  { cartDrawer.classList.add('open'); cartOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { cartDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); document.body.style.overflow = ''; }

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
document.getElementById('cart-shop-link')?.addEventListener('click', closeCart);

// ══════════════════════
// CHECKOUT
// ══════════════════════
// Checkout próprio, independente da Nuvemshop: captura os dados de contato
// do cliente e registra o pedido via apps/api (POST /orders → Supabase,
// tabela `pedidos`), sem gateway de pagamento integrado ainda — a loja
// recebe uma notificação por e-mail e entra em contato para confirmar
// pagamento/frete. Se window.THYMOS_CONFIG.nuvemshopStoreDomain estiver
// preenchido (loja Nuvemshop conectada), usa o checkout hospedado dela em
// vez disso — mas isso é opcional, não o caminho padrão.
function handleCheckout() {
  if (cart.length === 0) return;

  const domain = window.THYMOS_CONFIG?.nuvemshopStoreDomain;
  if (domain) {
    window.location.href = `https://${domain}/checkout`;
    return;
  }

  document.getElementById('checkout-btn').style.display = 'none';
  document.getElementById('checkout-form').style.display = 'flex';
}
document.getElementById('checkout-btn')?.addEventListener('click', handleCheckout);

document.getElementById('checkout-cancel')?.addEventListener('click', () => {
  document.getElementById('checkout-form').style.display = 'none';
  document.getElementById('checkout-btn').style.display = '';
  const msg = document.getElementById('checkout-msg');
  if (msg) { msg.textContent = ''; msg.className = 'coupon-msg'; }
});

async function submitOrder(e) {
  e.preventDefault();
  const msg = document.getElementById('checkout-msg');
  const submitBtn = document.getElementById('checkout-confirm-btn');
  const apiBaseUrl = window.THYMOS_CONFIG?.apiBaseUrl;

  const customerName = document.getElementById('checkout-name').value.trim();
  const customerEmail = document.getElementById('checkout-email').value.trim();
  const customerPhone = document.getElementById('checkout-phone').value.trim();

  if (!apiBaseUrl) {
    if (msg) { msg.textContent = 'Checkout indisponível no momento. Tente novamente mais tarde.'; msg.className = 'coupon-msg err'; }
    return;
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Math.round(subtotal * (1 - cartDiscount));

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  try {
    const res = await fetch(`${apiBaseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        items: cart.map(i => ({ productId: i.id, name: i.name, price: i.price, qty: i.qty })),
        total,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    if (msg) { msg.textContent = `✓ Pedido #${data.orderId} recebido! Entraremos em contato em breve para confirmar pagamento e entrega.`; msg.className = 'coupon-msg ok'; }
    document.getElementById('checkout-form').style.display = 'none';
    document.getElementById('checkout-form').reset();
    document.getElementById('checkout-btn').style.display = '';
    cart = [];
    updateCartUI();
  } catch (err) {
    if (msg) { msg.textContent = 'Não foi possível registrar o pedido agora. Tente novamente em instantes.'; msg.className = 'coupon-msg err'; }
    console.warn('Falha ao enviar pedido:', err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirmar Pedido';
  }
}
document.getElementById('checkout-form')?.addEventListener('submit', submitOrder);

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

// Cards de categoria, itens do showcase da Coleção Onyx e da galeria trio
// têm cursor:pointer (CSS já sinaliza "clicável") mas nenhum handler —
// como ainda não existe navegação por categoria/look individual, todos
// levam para a vitrine (#products) em vez de parecer clicável e não fazer
// nada ao clicar.
document.querySelectorAll('.cat-card, .show-item, .trio-item').forEach(card => card.addEventListener('click', () => {
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
  initReveal();
  initCursorGlow();
  initCardTilt();
  updateCartUI();
});