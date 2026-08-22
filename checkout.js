// Renders the order summary carried over from the Shipping page, creates a
// pending order in Supabase, then hands off to WhatsApp to complete payment
// (instead of a Stripe Checkout Session).
const CART_STORAGE_KEY = 'peptide-cart-v1';
const ORDER_SUMMARY_KEY = 'peptide-order-summary-v1';
const DISCOUNT_RATE = 0.10;
const DEFAULT_SHIPPING = { label: 'Standard Shipping', price: 9.99 };

const WHATSAPP_NUMBER = '12183012184';

function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function loadOrderSummary() {
    const stored = localStorage.getItem(ORDER_SUMMARY_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed && Array.isArray(parsed.items)) return parsed;
        } catch {
            // fall through to rebuild from cart
        }
    }

    // Fallback: build a summary straight from the cart (e.g. checkout opened directly)
    const cartStored = localStorage.getItem(CART_STORAGE_KEY);
    let items = [];
    try {
        const parsedCart = JSON.parse(cartStored);
        if (Array.isArray(parsedCart)) items = parsedCart;
    } catch {
        items = [];
    }
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.qty, 0);
    const discount = subtotal * DISCOUNT_RATE;
    return {
        items,
        subtotal,
        discount,
        shippingMethod: 'standard',
        shippingLabel: DEFAULT_SHIPPING.label,
        shippingPrice: items.length ? DEFAULT_SHIPPING.price : 0,
        total: subtotal - discount + (items.length ? DEFAULT_SHIPPING.price : 0),
        address: null
    };
}

const order = loadOrderSummary();

const shippingAddressSummary = document.getElementById('shipping-address-summary');
const orderSummaryLines = document.getElementById('order-summary-lines');
const completePurchaseBtn = document.getElementById('complete-purchase-button');
const completePurchaseLabel = document.getElementById('complete-purchase-label');
const paymentError = document.getElementById('payment-error');
const successOverlay = document.getElementById('order-success-overlay');
const orderNumberValue = document.getElementById('order-number-value');
const orderMethodValue = document.getElementById('order-method-value');
const orderTotalValue = document.getElementById('order-total-value');
const backButton = document.getElementById('back-button');

backButton.addEventListener('click', () => history.back());

function renderShippingAddress() {
    if (order.address) {
        shippingAddressSummary.textContent = `Shipping to ${order.address.name}, ${order.address.street}, ${order.address.city} ${order.address.zip} · ${order.shippingLabel}`;
    } else {
        shippingAddressSummary.textContent = `Shipping via ${order.shippingLabel}`;
    }
}

function renderOrderSummary() {
    const itemLines = order.items.map(item => `
<div class="flex justify-between text-body-md text-on-surface-variant">
<span>${escapeHtml(item.name)} x${item.qty}</span>
<span>${formatCurrency((Number(item.price) || 0) * item.qty)}</span>
</div>`).join('');

    orderSummaryLines.innerHTML = `
${itemLines || '<p class="text-body-md text-on-surface-variant">Your cart is empty.</p>'}
<div class="flex justify-between text-body-md text-on-surface-variant">
<span>Lab Discount</span>
<span class="text-secondary">-${formatCurrency(order.discount)}</span>
</div>
<div class="flex justify-between text-body-md text-on-surface-variant">
<span>${escapeHtml(order.shippingLabel)}</span>
<span class="text-secondary">${formatCurrency(order.shippingPrice)}</span>
</div>
<div class="border-t border-outline-variant pt-4 mt-gutter flex justify-between items-end">
<span class="text-body-lg font-semibold text-primary">Total Amount</span>
<span class="text-headline-md font-headline-md text-primary" id="order-total-amount">${formatCurrency(order.total)}</span>
</div>`;
}

renderShippingAddress();
renderOrderSummary();

function showPaymentError(message) {
    paymentError.textContent = message;
    paymentError.classList.remove('hidden');
}

function showSuccessOverlay(orderId) {
    orderNumberValue.textContent = `#${orderId.slice(0, 8).toUpperCase()}`;
    orderMethodValue.textContent = 'WhatsApp';
    orderTotalValue.textContent = formatCurrency(order.total);

    successOverlay.classList.remove('hidden');
    successOverlay.classList.add('flex');
    document.body.classList.add('overflow-hidden');

    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(ORDER_SUMMARY_KEY);
}

function buildWhatsAppOrderMessage(orderId) {
    const itemLines = order.items
        .map(item => `• ${item.name} x${item.qty} — ${formatCurrency((Number(item.price) || 0) * item.qty)}`)
        .join('\n');

    const message =
        `Hi, I'd like to complete my purchase.\n\n` +
        `Order #${orderId.slice(0, 8).toUpperCase()}\n` +
        `${itemLines}\n\n` +
        `Total: ${formatCurrency(order.total)}`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

async function startWhatsAppCheckout(triggerBtn) {
    paymentError.classList.add('hidden');

    if (order.items.length === 0) {
        showPaymentError('Your cart is empty. Add products from the catalog before checking out.');
        return;
    }

    const user = await getSessionUser();
    if (!user) {
        alert('Please log in to complete your purchase. Your cart will be waiting for you.');
        window.location.href = 'login.html';
        return;
    }

    const originalContent = triggerBtn.innerHTML;
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';

    // Still record the order as 'pending' so you have a trail of it,
    // even though payment will be confirmed manually over WhatsApp.
    const { data: insertedOrder, error: insertError } = await sb.from('orders').insert({
        user_id: user.id,
        items: order.items,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping_label: order.shippingLabel,
        shipping_price: order.shippingPrice,
        total: order.total,
        payment_method: 'whatsapp',
        status: 'pending'
    }).select().single();

    triggerBtn.disabled = false;
    triggerBtn.innerHTML = originalContent;

    if (insertError) {
        showPaymentError('Could not start checkout: ' + insertError.message);
        return;
    }

    window.open(buildWhatsAppOrderMessage(insertedOrder.id), '_blank');
}

document.querySelectorAll('.express-pay-btn').forEach(btn => {
    btn.addEventListener('click', () => startWhatsAppCheckout(btn));
});

completePurchaseBtn.addEventListener('click', () => startWhatsAppCheckout(completePurchaseBtn));

// Handle the redirect back from Stripe (kept in case you re-enable Stripe later;
// harmless no-op now since nothing redirects back with these params anymore)
(function handleStripeRedirect() {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');

    if (paymentStatus === 'success') {
        const orderId = params.get('order_id');
        if (orderId) showSuccessOverlay(orderId);
    } else if (paymentStatus === 'cancelled') {
        showPaymentError('Payment was cancelled. Your order is still saved — you can try again whenever you\'re ready.');
    }
})();