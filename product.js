// Micro-interactions and real functionality for the product detail pages
// (product.html, tirzepatide.html, ghk-cu.html, aod-9604.html, thymosin-alpha-1.html, semax.html)
const CART_STORAGE_KEY = 'peptide-cart-v1';

const stockBadgeStyles = {
    'in-stock': { text: 'IN STOCK', classes: ['bg-secondary-container', 'text-on-secondary-container'] },
    'low-stock': { text: 'LOW STOCK', classes: ['bg-amber-100', 'text-amber-800'] },
    backordered: { text: 'BACKORDERED', classes: ['bg-surface-container', 'text-on-surface-variant'] }
};

// Sync price/stock/purity/image with the live Supabase record, so admin edits
// made in the admin dashboard show up here instead of the page's static fallback content.
async function syncLiveProductData() {
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    if (!addToCartBtn || typeof sb === 'undefined') return;

    const productId = addToCartBtn.dataset.productId;
    const { data: product, error } = await sb
        .from('products')
        .select('price, stock, purity, image, image_alt')
        .eq('id', productId)
        .single();

    if (error || !product) return;

    const priceEl = document.getElementById('detail-price');
    if (priceEl && product.price != null) {
        const price = Number(product.price).toFixed(2);
        priceEl.textContent = `$${price}`;
        addToCartBtn.dataset.productPrice = price;
    }

    const stockBadge = document.getElementById('detail-stock-badge');
    const stockStyle = stockBadgeStyles[product.stock];
    if (stockBadge && stockStyle) {
        stockBadge.textContent = stockStyle.text;
        stockBadge.classList.remove(
            'bg-secondary-container', 'text-on-secondary-container',
            'bg-amber-100', 'text-amber-800',
            'bg-surface-container', 'text-on-surface-variant'
        );
        stockBadge.classList.add(...stockStyle.classes);
    }

    const purityEl = document.getElementById('detail-purity-text');
    if (purityEl && product.purity != null) {
        purityEl.textContent = `${product.purity}% PURITY`;
    }

    if (product.image) {
        const mainImage = document.getElementById('main-product-image');
        if (mainImage) {
            mainImage.src = product.image;
            if (product.image_alt) mainImage.alt = product.image_alt;
        }
        addToCartBtn.dataset.productImage = product.image;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    syncLiveProductData();

    // Header search icon: this page has no search field of its own, so it sends
    // the visitor to the browsable catalog.
    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        window.location.href = 'catalog.html';
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

    // --- Quantity stepper ---
    const qtyValue = document.getElementById('qty-value');
    document.querySelector('.qty-decrease')?.addEventListener('click', () => {
        const qty = parseInt(qtyValue.textContent, 10);
        if (qty > 1) qtyValue.textContent = qty - 1;
    });
    document.querySelector('.qty-increase')?.addEventListener('click', () => {
        const qty = parseInt(qtyValue.textContent, 10);
        qtyValue.textContent = qty + 1;
    });

    // --- Add to Cart ---
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

    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    addToCartBtn?.addEventListener('click', () => {
        const qty = parseInt(qtyValue.textContent, 10) || 1;
        const cart = loadCart();
        const productId = addToCartBtn.dataset.productId;
        const existing = cart.find(item => item.id === productId);

        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({
                id: productId,
                name: addToCartBtn.dataset.productName,
                price: parseFloat(addToCartBtn.dataset.productPrice) || 0,
                categoryLabel: addToCartBtn.dataset.productCategory || '',
                image: addToCartBtn.dataset.productImage || '',
                qty
            });
        }

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        if (typeof updateCartBadges === 'function') updateCartBadges();

        const originalText = addToCartBtn.textContent;
        addToCartBtn.textContent = 'ADDED TO CART';
        addToCartBtn.disabled = true;
        setTimeout(() => {
            addToCartBtn.textContent = originalText;
            addToCartBtn.disabled = false;
        }, 1500);
    });

    // --- Favorite toggle ---
    const favoriteBtn = document.querySelector('.favorite-btn');
    favoriteBtn?.addEventListener('click', () => {
        favoriteBtn.classList.toggle('bg-primary');
        favoriteBtn.classList.toggle('text-on-primary');
        const icon = favoriteBtn.querySelector('.material-symbols-outlined');
        const isFavorited = favoriteBtn.classList.contains('bg-primary');
        icon.style.fontVariationSettings = isFavorited ? "'FILL' 1" : "'FILL' 0";
    });

    // --- Gallery thumbnail swap ---
    const mainImage = document.getElementById('main-product-image');
    document.querySelectorAll('.gallery-thumbnail').forEach(thumb => {
        thumb.addEventListener('click', () => {
            const thumbImg = thumb.querySelector('img');
            if (!thumbImg || !mainImage) return;
            mainImage.src = thumbImg.src;
            mainImage.alt = thumbImg.alt;
        });
    });

    // --- Scientific details tabs: highlight + scroll to the relevant panel ---
    const tabButtons = document.querySelectorAll('.product-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => {
                b.classList.remove('border-secondary', 'text-secondary');
                b.classList.add('border-transparent', 'text-on-surface-variant');
            });
            btn.classList.add('border-secondary', 'text-secondary');
            btn.classList.remove('border-transparent', 'text-on-surface-variant');

            const target = document.getElementById(btn.dataset.tabTarget);
            if (!target) return;
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target.classList.add('ring-2', 'ring-secondary', 'ring-offset-4');
            setTimeout(() => target.classList.remove('ring-2', 'ring-secondary', 'ring-offset-4'), 1200);
        });
    });
});
