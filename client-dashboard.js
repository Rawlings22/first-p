// Client dashboard: profile info and the signed-in user's own order history.
// RLS on the `orders` table ensures this query can only ever return orders
// belonging to the logged-in user, regardless of what this file does.

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
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileRole = document.getElementById('profile-role');
const ordersList = document.getElementById('orders-list');
const ordersEmptyState = document.getElementById('orders-empty-state');
const logoutBtn = document.getElementById('logout-btn');

function orderCardHTML(order) {
    const date = new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const items = Array.isArray(order.items) ? order.items : [];
    const itemLines = items.map(item => `
<div class="flex justify-between text-body-md text-on-surface-variant">
<span>${escapeHtml(item.name)} x${item.qty}</span>
<span>${formatCurrency((Number(item.price) || 0) * item.qty)}</span>
</div>`).join('');

    const statusStyle = order.status === 'pending'
        ? 'bg-amber-100 text-amber-800'
        : order.status === 'cancelled'
            ? 'bg-surface-container text-on-surface-variant'
            : 'bg-secondary/10 text-secondary';

    const resumeButton = order.status === 'pending'
        ? `<button class="resume-payment-btn w-full bg-primary text-on-primary py-3 rounded-lg font-label-sm text-label-sm hover:opacity-90 transition-all flex items-center justify-center gap-2" data-order-id="${escapeHtml(order.id)}" type="button">
<span class="material-symbols-outlined text-[18px]">lock</span>
Complete Payment
</button>`
        : '';

    return `
<div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter shadow-[0px_10px_30px_rgba(15,23,42,0.05)] space-y-4">
<div class="flex justify-between items-start">
<div>
<p class="font-bold text-on-surface">Order #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</p>
<p class="text-[11px] text-on-surface-variant">${date} · ${order.status === 'pending' ? 'Awaiting payment' : 'Paid via ' + escapeHtml(order.payment_method || 'Card')}</p>
</div>
<span class="text-[11px] font-label-sm px-3 py-1 rounded-full capitalize ${statusStyle}">${escapeHtml(order.status)}</span>
</div>
<div class="space-y-1 border-t border-outline-variant/30 pt-3">
${itemLines || '<p class="text-body-md text-on-surface-variant">No item details recorded.</p>'}
</div>
<div class="flex justify-between items-center border-t border-outline-variant/30 pt-3">
<span class="font-bold text-primary">Total</span>
<span class="font-headline-md text-headline-md text-primary">${formatCurrency(order.total)}</span>
</div>
${resumeButton}
</div>`;
}

async function loadOwnOrders(userId) {
    const { data, error } = await sb
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error(error);
        return [];
    }
    return data;
}

logoutBtn.addEventListener('click', () => signOutAndRedirect('login.html'));

// Resume a pending order: creates a fresh Stripe Checkout Session for the
// same order (same items/total, re-read from the database) rather than
// making the customer rebuild their cart from scratch.
ordersList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.resume-payment-btn');
    if (!btn) return;

    const orderId = btn.dataset.orderId;
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';

    try {
        const { data: { session } } = await sb.auth.getSession();
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ orderId, origin: window.location.origin })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not resume checkout.');

        window.location.href = data.url;
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        alert(err.message || 'Something went wrong resuming payment. Please try again.');
    }
});

(async function init() {
    const user = await requireAuth();
    if (!user) return; // requireAuth() already redirected

    const profile = await getProfile(user.id);

    profileName.textContent = (profile && profile.full_name) || 'Researcher';
    profileEmail.textContent = user.email;
    profileRole.textContent = profile && profile.role === 'admin' ? 'Admin' : 'Client';
    welcomeText.textContent = `Welcome back, ${(profile && profile.full_name) || user.email}.`;

    const orders = await loadOwnOrders(user.id);
    ordersList.innerHTML = orders.map(orderCardHTML).join('');
    ordersEmptyState.classList.toggle('hidden', orders.length !== 0);

    dashboardContent.classList.remove('hidden');
})();
