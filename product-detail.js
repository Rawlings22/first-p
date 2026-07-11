// Generic, data-driven product detail page. Used for any catalog product that
// doesn't have its own hand-written page (i.e. anything an admin adds through
// admin-dashboard.html) — everything on this page comes straight from Supabase.
const CART_STORAGE_KEY = 'peptide-cart-v1';

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function formatCurrency(amount) {
    return '$' + (Number(amount) || 0).toFixed(2);
}

function loadCart() {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function addToCart(product, qty) {
    const cart = loadCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            categoryLabel: product.category_label || '',
            image: product.image || '',
            qty
        });
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    if (typeof updateCartBadges === 'function') updateCartBadges();
}

const stockBadgeStyles = {
    'in-stock': { text: 'IN STOCK', classes: ['bg-secondary-container', 'text-on-secondary-container'] },
    'low-stock': { text: 'LOW STOCK', classes: ['bg-amber-100', 'text-amber-800'] },
    backordered: { text: 'BACKORDERED', classes: ['bg-surface-container', 'text-on-surface-variant'] }
};

let currentProduct = null;
let qty = 1;

const qtyValueEl = document.getElementById('qty-value');

function renderProduct(product) {
    currentProduct = product;
    document.title = `${product.name} | PEPTICORE PHARMACEUTICALS`;

    document.getElementById('breadcrumb-name').textContent = product.name;
    document.getElementById('detail-name').textContent = product.name;
    document.getElementById('detail-category-label').textContent = (product.category_label || (product.categories || []).join(' / ') || 'RESEARCH COMPOUND').toUpperCase();
    document.getElementById('detail-description').textContent = product.description || '';
    document.getElementById('detail-overview-text').innerHTML = `<p>${escapeHtml(product.description || 'No further overview has been published for this compound yet.')}</p>`;

    const price = Number(product.price) || 0;
    document.getElementById('detail-price').textContent = formatCurrency(price);

    const stockBadge = document.getElementById('detail-stock-badge');
    const stockStyle = stockBadgeStyles[product.stock] || stockBadgeStyles['in-stock'];
    stockBadge.textContent = stockStyle.text;
    stockBadge.classList.add(...stockStyle.classes);
    document.getElementById('spec-stock').textContent = stockStyle.text;

    const purity = product.purity != null ? `${product.purity}%` : '—';
    document.getElementById('detail-purity-text').textContent = purity === '—' ? 'PURITY N/A' : `${purity} PURITY`;
    document.getElementById('detail-purity-value').textContent = purity;
    document.getElementById('spec-purity').textContent = purity;
    document.getElementById('detail-purity-bar').style.width = product.purity != null ? `${Math.min(100, product.purity)}%` : '0%';

    document.getElementById('spec-category').textContent = product.category_label || (product.categories || []).join(', ') || '—';
    document.getElementById('detail-batch-id').textContent = `Batch: #${product.id.slice(0, 8).toUpperCase()}`;

    const mainImage = document.getElementById('main-product-image');
    if (product.image) {
        mainImage.src = product.image;
        mainImage.alt = product.image_alt || product.name;
    }

    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    addToCartBtn.dataset.productId = product.id;
    addToCartBtn.dataset.productName = product.name;
    addToCartBtn.dataset.productPrice = price;
    addToCartBtn.dataset.productImage = product.image || '';

    document.getElementById('not-found-state').classList.add('hidden');
    document.getElementById('product-content').classList.remove('hidden');
    document.getElementById('product-content').classList.add('grid');
    document.getElementById('product-details-section').classList.remove('hidden');
}

function showNotFound() {
    document.getElementById('not-found-state').classList.remove('hidden');
    document.getElementById('product-content').classList.add('hidden');
    document.getElementById('product-details-section').classList.add('hidden');
}

async function loadProduct() {
    const productId = new URLSearchParams(window.location.search).get('id');
    if (!productId) {
        showNotFound();
        return;
    }

    const { data, error } = await sb.from('products').select('*').eq('id', productId).single();
    if (error || !data) {
        showNotFound();
        return;
    }

    renderProduct(data);
}

document.addEventListener('DOMContentLoaded', () => {
    loadProduct();

    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        window.location.href = 'catalog.html';
    });

    document.querySelector('.qty-decrease').addEventListener('click', () => {
        if (qty > 1) qty--;
        qtyValueEl.textContent = qty;
    });
    document.querySelector('.qty-increase').addEventListener('click', () => {
        qty++;
        qtyValueEl.textContent = qty;
    });

    document.querySelector('.favorite-btn').addEventListener('click', function () {
        this.classList.toggle('bg-primary');
        this.classList.toggle('text-on-primary');
        this.classList.toggle('text-primary');
        const icon = this.querySelector('.material-symbols-outlined');
        icon.style.fontVariationSettings = this.classList.contains('bg-primary') ? "'FILL' 1" : "'FILL' 0";
    });

    document.querySelector('.add-to-cart-btn').addEventListener('click', function () {
        if (!currentProduct) return;
        addToCart(currentProduct, qty);

        const original = this.textContent;
        this.textContent = 'ADDED TO CART';
        setTimeout(() => { this.textContent = original; }, 1500);
    });

    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            header.classList.add('h-16', 'shadow-lg');
            header.classList.remove('h-20', 'shadow-[0px_10px_30px_rgba(15,23,42,0.05)]');
        } else {
            header.classList.add('h-20', 'shadow-[0px_10px_30px_rgba(15,23,42,0.05)]');
            header.classList.remove('h-16', 'shadow-lg');
        }
    });
});
