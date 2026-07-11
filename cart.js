// Cart rendering, quantity/removal, and live price calculation.
// Cart contents come from products the user Quick-Added on the catalog page (localStorage).
const CART_STORAGE_KEY = 'peptide-cart-v1';
const SHIPPING_FLAT_RATE = 12.50;
const DISCOUNT_RATE = 0.10;

const cartItemsList = document.getElementById('cart-items-list');
const emptyCartMessage = document.getElementById('empty-cart-message');
const itemCountText = document.getElementById('item-count-text');
const subtotalValue = document.getElementById('subtotal-value');
const shippingValue = document.getElementById('shipping-value');
const discountValue = document.getElementById('discount-value');
const totalValue = document.getElementById('total-value');
const reconKitBtn = document.getElementById('recon-kit-btn');
const checkoutButton = document.getElementById('checkout-button');
const backButton = document.getElementById('back-button');

backButton.addEventListener('click', () => history.back());

let reconKitAdded = false;

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

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function cartItemHTML(item) {
    const imageBlock = item.image
        ? `<img class="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" alt="${escapeHtml(item.name)}" src="${escapeHtml(item.image)}"/>`
        : `<div class="w-full h-full flex items-center justify-center text-outline-variant"><span class="material-symbols-outlined">science</span></div>`;

    return `
<div class="cart-item bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex gap-4 items-center shadow-[0px_10px_30px_rgba(15,23,42,0.05)] hover:border-secondary transition-colors duration-300 group" data-product-id="${escapeHtml(item.id)}" data-unit-price="${Number(item.price) || 0}">
<div class="w-20 h-20 bg-surface-container rounded-lg overflow-hidden flex-shrink-0">
${imageBlock}
</div>
<div class="flex-grow flex flex-col justify-between h-20">
<div class="flex justify-between items-start">
<div>
<h3 class="font-label-sm text-label-sm text-primary leading-tight">${escapeHtml(item.name)}</h3>
<p class="text-[11px] text-secondary">${escapeHtml(item.categoryLabel || '')}</p>
</div>
<button class="remove-item-btn text-on-surface-variant hover:text-error transition-colors">
<span class="material-symbols-outlined" style="font-size: 18px;">close</span>
</button>
</div>
<div class="flex justify-between items-center">
<div class="flex items-center border border-outline-variant rounded-full bg-surface-bright overflow-hidden">
<button class="qty-decrease px-2 py-1 hover:bg-surface-container-low text-primary"><span class="material-symbols-outlined text-[16px]">remove</span></button>
<span class="qty-value px-3 font-label-sm text-label-sm">${item.qty}</span>
<button class="qty-increase px-2 py-1 hover:bg-surface-container-low text-primary"><span class="material-symbols-outlined text-[16px]">add</span></button>
</div>
<p class="line-total font-label-sm text-label-sm text-primary">${formatCurrency((Number(item.price) || 0) * item.qty)}</p>
</div>
</div>
</div>`;
}

function renderCart() {
    const cart = loadCart();
    cartItemsList.innerHTML = cart.map(cartItemHTML).join('');
    recalculateCart(cart);
}

function recalculateCart(cart) {
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += (Number(item.price) || 0) * item.qty;
    });

    const kitPrice = reconKitAdded ? parseFloat(reconKitBtn.dataset.kitPrice) : 0;
    const discount = subtotal * DISCOUNT_RATE;
    const shipping = cart.length > 0 ? SHIPPING_FLAT_RATE : 0;
    const total = subtotal + kitPrice - discount + shipping;

    subtotalValue.innerText = formatCurrency(subtotal + kitPrice);
    shippingValue.innerText = formatCurrency(shipping);
    discountValue.innerText = '-' + formatCurrency(discount);
    totalValue.innerText = formatCurrency(total);

    itemCountText.innerText = `${cart.length} item${cart.length === 1 ? '' : 's'} currently in research queue`;

    const isEmpty = cart.length === 0;
    emptyCartMessage.classList.toggle('hidden', !isEmpty);
    checkoutButton.disabled = isEmpty;
    checkoutButton.classList.toggle('opacity-50', isEmpty);
    checkoutButton.classList.toggle('pointer-events-none', isEmpty);

    if (typeof updateCartBadges === 'function') updateCartBadges();
}

cartItemsList.addEventListener('click', function (event) {
    const decreaseBtn = event.target.closest('.qty-decrease');
    const increaseBtn = event.target.closest('.qty-increase');
    const removeBtn = event.target.closest('.remove-item-btn');
    if (!decreaseBtn && !increaseBtn && !removeBtn) return;

    const itemEl = (decreaseBtn || increaseBtn || removeBtn).closest('.cart-item');
    const productId = itemEl.dataset.productId;
    const cart = loadCart();
    const cartItem = cart.find(i => i.id === productId);
    if (!cartItem) return;

    if (removeBtn) {
        saveCart(cart.filter(i => i.id !== productId));
    } else {
        if (increaseBtn) cartItem.qty += 1;
        if (decreaseBtn && cartItem.qty > 1) cartItem.qty -= 1;
        saveCart(cart);
    }

    renderCart();
});

reconKitBtn.addEventListener('click', function () {
    reconKitAdded = !reconKitAdded;
    const kitPrice = parseFloat(reconKitBtn.dataset.kitPrice);
    reconKitBtn.innerText = reconKitAdded
        ? `Remove -${formatCurrency(kitPrice)}`
        : `Add +${formatCurrency(kitPrice)}`;
    recalculateCart(loadCart());
});

// Advance to the shipping step
checkoutButton.addEventListener('click', function () {
    if (this.disabled) return;
    this.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';
    setTimeout(() => {
        window.location.href = 'shipping.html';
    }, 600);
});

renderCart();
