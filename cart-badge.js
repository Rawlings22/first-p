// Keeps every header cart icon's item-count badge in sync with the real cart
// (localStorage), instead of a number hardcoded into the page markup.
const CART_BADGE_STORAGE_KEY = 'peptide-cart-v1';

function getCartItemCount() {
    try {
        const stored = localStorage.getItem(CART_BADGE_STORAGE_KEY);
        const cart = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(cart)) return 0;
        return cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    } catch {
        return 0;
    }
}

function updateCartBadges() {
    const count = getCartItemCount();

    document.querySelectorAll('a[href="cart.html"]').forEach(link => {
        let badge = link.querySelector('.cart-badge-count');

        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'cart-badge-count absolute -top-1 -right-1 bg-secondary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-surface pointer-events-none';
                const computedPosition = window.getComputedStyle(link).position;
                if (computedPosition === 'static') link.classList.add('relative');
                link.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : String(count);
        } else if (badge) {
            badge.remove();
        }
    });
}

document.addEventListener('DOMContentLoaded', updateCartBadges);

// Keep badges in sync if the cart changes in another tab.
window.addEventListener('storage', (e) => {
    if (e.key === CART_BADGE_STORAGE_KEY) updateCartBadges();
});
