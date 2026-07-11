const CART_STORAGE_KEY = 'peptide-cart-v1';

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
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

function addToCart(product) {
    const cart = loadCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            categoryLabel: product.categoryLabel || '',
            image: product.image || '',
            qty: 1
        });
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

// Products now live in Supabase (`products` table). This mapping normalizes the
// database's snake_case columns to the camelCase shape the rest of this file uses.
function mapProductRow(row) {
    return {
        id: row.id,
        name: row.name,
        price: row.price,
        categoryLabel: row.category_label,
        categories: row.categories || [],
        purity: row.purity,
        stock: row.stock,
        format: row.format || 'lyophilized',
        description: row.description,
        image: row.image,
        imageAlt: row.image_alt,
        detailHref: row.detail_href
    };
}

async function loadProductsFromSupabase() {
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: true });
    if (error) {
        console.error('Failed to load products:', error);
        return [];
    }
    return data.map(mapProductRow);
}

let products = [];

const productGrid = document.getElementById('product-grid');
const resultsCount = document.getElementById('results-count');
const noResultsMessage = document.getElementById('no-results-message');
const goalCheckboxes = document.querySelectorAll('input[data-filter]');
const pagination = document.getElementById('pagination');
const manageCatalogLink = document.getElementById('manage-catalog-link');
const purityRadios = document.querySelectorAll('input[name="purity"]');
const formatButtons = document.querySelectorAll('.format-filter-btn');
const sortToggle = document.getElementById('sort-toggle');
const sortMenu = document.getElementById('sort-menu');
const sortLabel = document.getElementById('sort-label');
const sortOptionButtons = document.querySelectorAll('.sort-option-btn');

const PAGE_SIZE = 3;
let currentPage = 1;
let activeFormats = [];
let currentSort = 'featured';

const stockMarkup = {
    'in-stock': '<div class="w-2 h-2 rounded-full bg-green-500"></div><span class="text-xs font-label-sm text-on-surface-variant">In Stock</span>',
    'low-stock': '<div class="w-2 h-2 rounded-full bg-amber-500"></div><span class="text-xs font-label-sm text-on-surface-variant">Low Stock</span>',
    backordered: '<span class="material-symbols-outlined text-sm text-on-surface-variant">schedule</span><span class="text-xs font-label-sm text-on-surface-variant">Backordered</span>'
};

function productCardHTML(product) {
    const categoriesAttr = escapeHtml((product.categories || []).join(' '));
    const purity = Number(product.purity) || 0;
    const price = Number(product.price) || 0;

    const imageBlock = product.image
        ? `<div class="w-full h-full transform transition-transform duration-700 group-hover:scale-110" role="img" aria-label="${escapeHtml(product.imageAlt || product.name)}" style="background-image: url('${escapeHtml(product.image)}'); background-size: cover; background-position: center;"></div>`
        : `<div class="w-full h-full flex items-center justify-center bg-surface-container-low text-outline-variant"><span class="material-symbols-outlined text-6xl">science</span></div>`;

    // Every product is clickable — hand-written pages use their own detailHref,
    // anything added through the admin dashboard falls back to the generic detail page.
    const detailHref = product.detailHref || `product-detail.html?id=${encodeURIComponent(product.id)}`;
    const titleContent = `<a href="${escapeHtml(detailHref)}">${escapeHtml(product.name)}</a>`;

    const searchAttr = escapeHtml(
        [product.name, product.categoryLabel, product.description].filter(Boolean).join(' ').toLowerCase()
    );

    return `
<div class="product-card group relative bg-surface-container-lowest overflow-hidden flex flex-col shadow-[0px_10px_30px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 duration-300" data-categories="${categoriesAttr}" data-product-id="${escapeHtml(product.id)}" data-search="${searchAttr}">
<div class="relative aspect-square bg-surface-container-low overflow-hidden">
<div class="absolute top-4 left-4 z-10">
<span class="bg-secondary/10 text-secondary font-label-caps text-[10px] px-3 py-1.5 rounded-full backdrop-blur-md border border-secondary/20">${purity}% PURITY</span>
</div>
<div class="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
<button class="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-on-surface-variant hover:text-error transition-all" type="button">
<span class="material-symbols-outlined text-lg">favorite</span>
</button>
</div>
${imageBlock}
<div class="quick-add absolute inset-x-0 bottom-0 p-4 translate-y-full opacity-0 transition-all duration-300 z-20">
<button class="w-full bg-primary text-white py-4 font-label-sm rounded-none hover:bg-secondary transition-colors flex items-center justify-center gap-2" type="button">
<span class="material-symbols-outlined text-sm">bolt</span>
                                    QUICK ADD
                                </button>
</div>
</div>
<div class="p-6 flex-1 flex flex-col">
<p class="font-label-caps text-on-surface-variant text-[10px] tracking-widest mb-2 uppercase">${escapeHtml(product.categoryLabel || (product.categories || []).join(' / '))}</p>
<h3 class="font-headline-md text-headline-md mb-2 group-hover:text-secondary transition-colors">${titleContent}</h3>
<p class="text-on-surface-variant text-sm mb-6 line-clamp-2">${escapeHtml(product.description)}</p>
<div class="mt-auto flex items-center justify-between">
<span class="font-headline-md text-primary">$${price.toFixed(2)}</span>
<div class="flex items-center gap-1">
${stockMarkup[product.stock] || stockMarkup['in-stock']}
</div>
</div>
</div>
</div>`;
}

function getFilteredProducts() {
    const selectedGoals = Array.from(goalCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.dataset.filter);
    const query = searchInput.value.trim().toLowerCase();
    const purityGrade = document.querySelector('input[name="purity"]:checked')?.dataset.purity || 'usp';

    let filtered = products.filter(product => {
        const matchesGoal = selectedGoals.length === 0 || selectedGoals.some(goal => (product.categories || []).includes(goal));
        const searchText = [product.name, product.categoryLabel, product.description].filter(Boolean).join(' ').toLowerCase();
        const matchesSearch = query === '' || searchText.includes(query);
        const matchesPurity = purityGrade === 'usp' || (Number(product.purity) || 0) >= 99;
        const matchesFormat = activeFormats.length === 0 || activeFormats.includes(product.format);
        return matchesGoal && matchesSearch && matchesPurity && matchesFormat;
    });

    switch (currentSort) {
        case 'price-asc':
            filtered = filtered.slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
            break;
        case 'price-desc':
            filtered = filtered.slice().sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
            break;
        case 'purity-desc':
            filtered = filtered.slice().sort((a, b) => (Number(b.purity) || 0) - (Number(a.purity) || 0));
            break;
        case 'name-asc':
            filtered = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));
            break;
        default:
            break; // 'featured' keeps the catalog's natural order
    }

    return filtered;
}

function renderPagination(totalPages) {
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    const navBtnClasses = 'w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent';

    let html = `<button class="${navBtnClasses}" data-page-action="prev" type="button" ${currentPage === 1 ? 'disabled' : ''}>
<span class="material-symbols-outlined">chevron_left</span>
</button>`;

    for (let page = 1; page <= totalPages; page++) {
        const isActive = page === currentPage;
        html += `<button class="w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${isActive ? 'bg-primary text-white' : 'border border-outline-variant hover:bg-surface-container'}" data-page-number="${page}" type="button">${page}</button>`;
    }

    html += `<button class="${navBtnClasses}" data-page-action="next" type="button" ${currentPage === totalPages ? 'disabled' : ''}>
<span class="material-symbols-outlined">chevron_right</span>
</button>`;

    pagination.innerHTML = html;
}

function renderProducts() {
    const filtered = getFilteredProducts();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    productGrid.innerHTML = pageItems.map(productCardHTML).join('');

    const query = searchInput.value.trim();
    resultsCount.textContent = filtered.length === 0
        ? `Showing 0 of ${products.length} products`
        : `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} products`;

    noResultsMessage.classList.toggle('hidden', filtered.length !== 0);
    noResultsMessage.querySelector('p.text-on-surface-variant').textContent = query
        ? `No compounds match "${query}". Try a different search term or filter combination.`
        : 'Try selecting a different combination of research goals.';

    renderPagination(totalPages);
}

function applyFilters() {
    currentPage = 1;
    renderProducts();
}

goalCheckboxes.forEach(checkbox => checkbox.addEventListener('change', applyFilters));

purityRadios.forEach(radio => radio.addEventListener('change', applyFilters));

formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        const isActive = activeFormats.includes(format);

        if (isActive) {
            activeFormats = activeFormats.filter(f => f !== format);
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-surface-container');
        } else {
            activeFormats.push(format);
            btn.classList.add('bg-primary', 'text-white');
            btn.classList.remove('bg-surface-container');
        }

        applyFilters();
    });
});

const sortLabels = {
    featured: 'Sort: Featured',
    'price-asc': 'Sort: Price Low-High',
    'price-desc': 'Sort: Price High-Low',
    'purity-desc': 'Sort: Purity High-Low',
    'name-asc': 'Sort: Name A-Z'
};

sortToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sortMenu.classList.toggle('hidden');
});

sortOptionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentSort = btn.dataset.sort;
        sortLabel.textContent = sortLabels[currentSort];
        sortMenu.classList.add('hidden');
        applyFilters();
    });
});

document.addEventListener('click', (e) => {
    if (!sortMenu.classList.contains('hidden') && !sortMenu.contains(e.target) && e.target !== sortToggle) {
        sortMenu.classList.add('hidden');
    }
});

pagination.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;

    if (btn.dataset.pageAction === 'prev') {
        currentPage--;
    } else if (btn.dataset.pageAction === 'next') {
        currentPage++;
    } else if (btn.dataset.pageNumber) {
        currentPage = parseInt(btn.dataset.pageNumber, 10);
    } else {
        return;
    }

    renderProducts();
    productGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Pre-apply a Research Goal filter when arriving via a link like catalog.html?goal=recovery
const linkedGoal = new URLSearchParams(window.location.search).get('goal');
if (linkedGoal) {
    goalCheckboxes.forEach(checkbox => {
        checkbox.checked = checkbox.dataset.filter === linkedGoal;
    });
}


// Quick Add (event delegation, since cards are re-rendered)
productGrid.addEventListener('click', (e) => {
    const quickAddBtn = e.target.closest('.quick-add button');
    if (!quickAddBtn) return;

    const card = quickAddBtn.closest('.product-card');
    const product = products.find(p => p.id === card.dataset.productId);
    if (product) {
        addToCart(product);
        if (typeof updateCartBadges === 'function') updateCartBadges();
    }

    const notification = document.getElementById('notification');
    notification.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => {
        notification.classList.add('translate-y-24', 'opacity-0');
    }, 3000);
});

// Search Bar Focus Effect + live product search
const searchInput = document.querySelector('input[type="text"]');
searchInput.addEventListener('focus', () => {
    searchInput.parentElement.classList.add('ring-1', 'ring-secondary/50', 'border-secondary/30');
});
searchInput.addEventListener('blur', () => {
    searchInput.parentElement.classList.remove('ring-1', 'ring-secondary/50', 'border-secondary/30');
});
searchInput.addEventListener('input', applyFilters);

// Pre-fill the search box when arriving via a link like catalog.html?search=bpc-157
// (used by the search icons/inputs on other pages that redirect here)
const linkedSearch = new URLSearchParams(window.location.search).get('search');
if (linkedSearch) {
    searchInput.value = linkedSearch;
}

(async function init() {
    products = await loadProductsFromSupabase();
    renderProducts();

    // Only admins see the link to the product management dashboard.
    const profile = await getCurrentProfile();
    if (profile && profile.role === 'admin') {
        manageCatalogLink.classList.remove('hidden');
        manageCatalogLink.classList.add('flex');
    }
})();
