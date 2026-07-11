// Admin dashboard: product CRUD and order overview against Supabase.
// Gated client-side by requireAdmin() for UX, but the real protection is the
// Row Level Security policies on the `products`/`orders` tables in Supabase —
// a non-admin's insert/update/delete calls are rejected by Postgres regardless
// of anything this file does.

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function formatCurrency(amount) {
    return '$' + (Number(amount) || 0).toFixed(2);
}

const dashboardContent = document.getElementById('dashboard-content');
const welcomeText = document.getElementById('welcome-text');
const logoutBtn = document.getElementById('logout-btn');

const statProducts = document.getElementById('stat-products');
const statOrders = document.getElementById('stat-orders');
const statRevenue = document.getElementById('stat-revenue');

const productTableBody = document.getElementById('product-table-body');
const productEmptyState = document.getElementById('product-empty-state');
const ordersTableBody = document.getElementById('orders-table-body');
const ordersEmptyState = document.getElementById('orders-empty-state');

const addProductBtn = document.getElementById('add-product-btn');
const productModal = document.getElementById('product-modal');
const productModalBackdrop = document.getElementById('product-modal-backdrop');
const productModalClose = document.getElementById('product-modal-close');
const productModalTitle = document.getElementById('product-modal-title');
const productForm = document.getElementById('product-form');
const productFormError = document.getElementById('product-form-error');

const stockBadge = {
    'in-stock': '<span class="text-[11px] font-label-sm px-2 py-1 rounded-full bg-green-100 text-green-800">In Stock</span>',
    'low-stock': '<span class="text-[11px] font-label-sm px-2 py-1 rounded-full bg-amber-100 text-amber-800">Low Stock</span>',
    backordered: '<span class="text-[11px] font-label-sm px-2 py-1 rounded-full bg-surface-container text-on-surface-variant">Backordered</span>'
};

async function loadProducts() {
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error(error);
        return [];
    }
    return data;
}

function productRowHTML(product) {
    return `
<tr class="border-t border-outline-variant/30" data-product-id="${escapeHtml(product.id)}">
<td class="px-4 py-3">
<p class="font-bold text-on-surface">${escapeHtml(product.name)}</p>
<p class="text-[11px] text-on-surface-variant">${escapeHtml(product.category_label || '')}</p>
</td>
<td class="px-4 py-3 text-on-surface">${formatCurrency(product.price)}</td>
<td class="px-4 py-3">${stockBadge[product.stock] || stockBadge['in-stock']}</td>
<td class="px-4 py-3 text-right space-x-2">
<button class="edit-product-btn p-2 hover:bg-surface-container-low rounded-full transition-colors" title="Edit" type="button"><span class="material-symbols-outlined text-[18px] text-on-surface-variant">edit</span></button>
<button class="delete-product-btn p-2 hover:bg-error/10 rounded-full transition-colors" title="Delete" type="button"><span class="material-symbols-outlined text-[18px] text-error">delete</span></button>
</td>
</tr>`;
}

let products = [];

async function renderProducts() {
    products = await loadProducts();
    productTableBody.innerHTML = products.map(productRowHTML).join('');
    productEmptyState.classList.toggle('hidden', products.length !== 0);
    statProducts.textContent = products.length;
}

async function loadOrders() {
    const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) {
        console.error(error);
        return [];
    }
    return data;
}

const PENDING_STALE_HOURS = 24;

function orderRowHTML(order) {
    const created = new Date(order.created_at);
    const date = created.toLocaleDateString();
    const hoursOld = (Date.now() - created.getTime()) / (1000 * 60 * 60);
    const isStalePending = order.status === 'pending' && hoursOld >= PENDING_STALE_HOURS;

    const statusBadge = isStalePending
        ? `<span class="text-error font-bold">pending (${Math.floor(hoursOld)}h old)</span>`
        : `<span class="text-secondary capitalize">${escapeHtml(order.status)}</span>`;

    const cancelBtn = order.status === 'pending'
        ? `<button class="cancel-order-btn text-[11px] font-label-sm px-3 py-1 rounded-full border border-error text-error hover:bg-error/10 transition-colors" data-order-id="${escapeHtml(order.id)}" type="button">Cancel</button>`
        : '';

    return `
<tr class="border-t border-outline-variant/30 ${isStalePending ? 'bg-error/5' : ''}">
<td class="px-4 py-3 font-mono text-[12px] text-on-surface-variant">${escapeHtml(order.id.slice(0, 8))}</td>
<td class="px-4 py-3 font-mono text-[12px] text-on-surface-variant">${escapeHtml(order.user_id.slice(0, 8))}</td>
<td class="px-4 py-3 text-on-surface">${formatCurrency(order.total)}</td>
<td class="px-4 py-3">${statusBadge}</td>
<td class="px-4 py-3 text-on-surface-variant text-[12px]">${date}</td>
<td class="px-4 py-3 text-right">${cancelBtn}</td>
</tr>`;
}

async function renderOrders() {
    const orders = await loadOrders();
    ordersTableBody.innerHTML = orders.map(orderRowHTML).join('');
    ordersEmptyState.classList.toggle('hidden', orders.length !== 0);
    statOrders.textContent = orders.length;
    const revenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    statRevenue.textContent = formatCurrency(revenue);
}

ordersTableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('.cancel-order-btn');
    if (!btn) return;

    const orderId = btn.dataset.orderId;
    if (!confirm('Cancel this pending order? The customer will need to check out again if they still want it.')) return;

    btn.disabled = true;
    const { error } = await sb.from('orders').update({ status: 'cancelled' }).eq('id', orderId).eq('status', 'pending');
    if (error) {
        alert('Could not cancel order: ' + error.message);
        btn.disabled = false;
        return;
    }
    await renderOrders();
});

// --- Add / Edit modal ---
const imagePreview = document.getElementById('product-form-image-preview');
const imageExistingInput = document.getElementById('product-form-image-existing');
const imageFileInput = document.getElementById('product-form-image-file');

function openProductModal(product = null) {
    productForm.reset();
    productFormError.classList.add('hidden');
    document.getElementById('product-form-id').value = product ? product.id : '';
    productModalTitle.textContent = product ? 'Edit Product' : 'Add Product';

    imageExistingInput.value = product && product.image ? product.image : '';
    if (product && product.image) {
        imagePreview.src = product.image;
        imagePreview.classList.remove('hidden');
    } else {
        imagePreview.classList.add('hidden');
    }

    if (product) {
        document.getElementById('product-form-name').value = product.name || '';
        document.getElementById('product-form-price').value = product.price || '';
        document.getElementById('product-form-purity').value = product.purity || '';
        document.getElementById('product-form-category-label').value = product.category_label || '';
        document.getElementById('product-form-stock-quantity').value = product.stock_quantity ?? 0;
        document.getElementById('product-form-format').value = product.format || 'lyophilized';
        document.getElementById('product-form-description').value = product.description || '';
        productForm.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = (product.categories || []).includes(cb.value);
        });
    }

    productModal.classList.remove('hidden');
    productModal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
}

function closeProductModal() {
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
}

imageFileInput.addEventListener('change', () => {
    const file = imageFileInput.files[0];
    if (!file) return;
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.classList.remove('hidden');
});

addProductBtn.addEventListener('click', () => openProductModal());
productModalBackdrop.addEventListener('click', closeProductModal);
productModalClose.addEventListener('click', closeProductModal);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !productModal.classList.contains('hidden')) closeProductModal();
});

productTableBody.addEventListener('click', async (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const productId = row.dataset.productId;

    if (e.target.closest('.edit-product-btn')) {
        const product = products.find(p => p.id === productId);
        if (product) openProductModal(product);
    }

    if (e.target.closest('.delete-product-btn')) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        if (!confirm(`Remove "${product.name}" from the catalog?`)) return;

        const { error } = await sb.from('products').delete().eq('id', productId);
        if (error) {
            alert('Could not delete product: ' + error.message);
            return;
        }
        await renderProducts();
    }
});

const submitBtn = productForm.querySelector('button[type="submit"]');

async function uploadProductImage(file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const path = `${Date.now()}-${safeName}`;
    const { error } = await sb.storage.from('product-images').upload(path, file, {
        cacheControl: '3600',
        upsert: false
    });
    if (error) throw error;

    const { data } = sb.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
}

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    productFormError.classList.add('hidden');

    const id = document.getElementById('product-form-id').value;
    const name = document.getElementById('product-form-name').value.trim();
    const price = parseFloat(document.getElementById('product-form-price').value);
    const categories = Array.from(productForm.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

    const originalSubmitLabel = submitBtn.textContent;
    submitBtn.disabled = true;

    let imageUrl = imageExistingInput.value;
    const chosenFile = imageFileInput.files[0];
    if (chosenFile) {
        submitBtn.textContent = 'Uploading image...';
        try {
            imageUrl = await uploadProductImage(chosenFile);
        } catch (uploadError) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalSubmitLabel;
            productFormError.textContent = 'Image upload failed: ' + uploadError.message;
            productFormError.classList.remove('hidden');
            return;
        }
    }

    submitBtn.textContent = 'Saving...';

    const payload = {
        name,
        price,
        purity: parseFloat(document.getElementById('product-form-purity').value) || null,
        category_label: document.getElementById('product-form-category-label').value.trim(),
        categories,
        stock_quantity: parseInt(document.getElementById('product-form-stock-quantity').value, 10) || 0,
        format: document.getElementById('product-form-format').value,
        description: document.getElementById('product-form-description').value.trim(),
        image: imageUrl,
        image_alt: name
    };

    let result;
    if (id) {
        result = await sb.from('products').update(payload).eq('id', id);
    } else {
        payload.id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `product-${Date.now()}`;
        result = await sb.from('products').insert(payload);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = originalSubmitLabel;

    if (result.error) {
        productFormError.textContent = result.error.message;
        productFormError.classList.remove('hidden');
        return;
    }

    closeProductModal();
    await renderProducts();
});

logoutBtn.addEventListener('click', () => signOutAndRedirect('login.html'));

(async function init() {
    const profile = await requireAdmin();
    if (!profile) return; // requireAdmin() already redirected

    welcomeText.textContent = `Signed in as ${profile.full_name || profile.email}. Manage the catalog and monitor orders.`;
    dashboardContent.classList.remove('hidden');
    await Promise.all([renderProducts(), renderOrders()]);
})();
