// Interactive logic for delivery address selection and shipping method + price calculation.
// The resulting order summary is persisted so the payment page can display the exact same numbers.
const CART_STORAGE_KEY = 'peptide-cart-v1';
const ADDRESS_BOOK_KEY = 'peptide-address-book-v1';
const SELECTED_ADDRESS_KEY = 'peptide-selected-address-v1';
const ORDER_SUMMARY_KEY = 'peptide-order-summary-v1';

const DISCOUNT_RATE = 0.10;
const shippingOptions = {
    standard: { label: 'Standard Shipping', price: 9.99 },
    express: { label: 'Express Shipping', price: 24.99 },
    coldchain: { label: 'Overnight Cold-Chain', price: 45.00 }
};

const defaultAddresses = [
    {
        id: 'addr-1',
        name: 'Jameson Sterling',
        street: '842 Research Parkway, Suite 402',
        city: 'Cambridge, MA',
        zip: '02139',
        phone: '+1 (617) 555-0198'
    },
    {
        id: 'addr-2',
        name: 'Jameson Sterling',
        street: '110 Laboratory Row',
        city: 'Boston, MA',
        zip: '02215',
        phone: '+1 (617) 555-0122'
    }
];

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

function loadAddressBook() {
    const stored = localStorage.getItem(ADDRESS_BOOK_KEY);
    if (!stored) return defaultAddresses.slice();
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length ? parsed : defaultAddresses.slice();
    } catch {
        return defaultAddresses.slice();
    }
}

function saveAddressBook(addresses) {
    localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(addresses));
}

function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
}

const cart = loadCart();
let addresses = loadAddressBook();
let selectedAddressId = localStorage.getItem(SELECTED_ADDRESS_KEY) || addresses[0].id;

const radios = document.querySelectorAll('input[name="shipping"]');
const subtotalLabel = document.getElementById('subtotal-label-summary');
const subtotalSummary = document.getElementById('subtotal-price-summary');
const discountSummary = document.getElementById('discount-price-summary');
const shippingSummary = document.getElementById('shipping-price-summary');
const totalSummary = document.getElementById('total-price-summary');
const continueBtn = document.getElementById('continue-button');
const backBtn = document.getElementById('back-button');

const addressNameEl = document.getElementById('address-name');
const addressLinesEl = document.getElementById('address-lines');
const addressPhoneEl = document.getElementById('address-phone');
const editAddressBtn = document.getElementById('edit-address-button');

const addressModal = document.getElementById('address-modal');
const addressModalBackdrop = document.getElementById('address-modal-backdrop');
const addressModalClose = document.getElementById('address-modal-close');
const savedAddressList = document.getElementById('saved-address-list');
const addAddressToggle = document.getElementById('add-address-toggle');
const addAddressForm = document.getElementById('add-address-form');

function getSelectedShipping() {
    const checked = document.querySelector('input[name="shipping"]:checked');
    return checked ? checked.value : 'standard';
}

function getSelectedAddress() {
    return addresses.find(a => a.id === selectedAddressId) || addresses[0];
}

function renderAddressSummary() {
    const address = getSelectedAddress();
    addressNameEl.textContent = address.name;
    addressLinesEl.innerHTML = `${address.street}<br>${address.city} ${address.zip}`;
    addressPhoneEl.textContent = address.phone;
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * item.qty, 0);
    const discount = subtotal * DISCOUNT_RATE;
    const shippingKey = getSelectedShipping();
    const shipping = shippingOptions[shippingKey].price;
    const total = subtotal - discount + shipping;

    subtotalLabel.textContent = `Subtotal (${cart.length} item${cart.length === 1 ? '' : 's'})`;
    subtotalSummary.textContent = formatCurrency(subtotal);
    discountSummary.textContent = '-' + formatCurrency(discount);
    shippingSummary.textContent = formatCurrency(shipping);
    totalSummary.textContent = formatCurrency(total);

    continueBtn.disabled = cart.length === 0;
    continueBtn.classList.toggle('opacity-50', cart.length === 0);
    continueBtn.classList.toggle('pointer-events-none', cart.length === 0);

    return { subtotal, discount, shippingKey, shipping, total };
}

function persistOrderSummary() {
    const totals = updateTotals();
    const shippingInfo = shippingOptions[totals.shippingKey];
    const orderSummary = {
        items: cart,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingMethod: totals.shippingKey,
        shippingLabel: shippingInfo.label,
        shippingPrice: totals.shipping,
        total: totals.total,
        address: getSelectedAddress()
    };
    localStorage.setItem(ORDER_SUMMARY_KEY, JSON.stringify(orderSummary));
    return orderSummary;
}

radios.forEach(radio => {
    radio.addEventListener('change', () => {
        shippingSummary.style.opacity = '0';
        totalSummary.style.opacity = '0';
        setTimeout(() => {
            updateTotals();
            shippingSummary.style.opacity = '1';
            totalSummary.style.opacity = '1';
        }, 150);
    });
});

// Advance to the payment step once shipping is confirmed, carrying totals forward
continueBtn.addEventListener('click', function () {
    if (this.disabled) return;
    persistOrderSummary();
    this.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';
    setTimeout(() => {
        window.location.href = 'checkout.html';
    }, 800);
});

// Back button returns to the previous step in browser history
backBtn.addEventListener('click', () => {
    history.back();
});

shippingSummary.style.transition = 'opacity 0.2s ease-in-out';
totalSummary.style.transition = 'opacity 0.2s ease-in-out';

// --- Delivery Address Modal ---
function addressCardHTML(address) {
    const checked = address.id === selectedAddressId;
    return `
<label class="relative block cursor-pointer group">
<input class="peer sr-only" name="saved-address" type="radio" value="${address.id}" ${checked ? 'checked' : ''}/>
<div class="p-gutter bg-surface-container-lowest border border-outline-variant rounded-xl peer-checked:border-secondary peer-checked:border-2 peer-checked:bg-secondary-container/5 transition-all">
<p class="font-bold text-on-surface">${address.name}</p>
<p class="text-on-surface-variant text-body-md">${address.street}<br>${address.city} ${address.zip}</p>
<p class="text-on-surface-variant text-[11px] mt-1">${address.phone}</p>
</div>
</label>`;
}

function renderSavedAddressList() {
    savedAddressList.innerHTML = addresses.map(addressCardHTML).join('');
}

function openAddressModal() {
    renderSavedAddressList();
    addAddressForm.classList.add('hidden');
    addressModal.classList.remove('hidden');
    addressModal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
}

function closeAddressModal() {
    addressModal.classList.add('hidden');
    addressModal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
}

editAddressBtn.addEventListener('click', openAddressModal);
addressModalBackdrop.addEventListener('click', closeAddressModal);
addressModalClose.addEventListener('click', closeAddressModal);

savedAddressList.addEventListener('change', (e) => {
    if (e.target.name !== 'saved-address') return;
    selectedAddressId = e.target.value;
    localStorage.setItem(SELECTED_ADDRESS_KEY, selectedAddressId);
    renderAddressSummary();
    updateTotals();
    closeAddressModal();
});

addAddressToggle.addEventListener('click', () => {
    addAddressForm.classList.toggle('hidden');
});

addAddressForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(addAddressForm);
    const newAddress = {
        id: `addr-${Date.now()}`,
        name: formData.get('name').trim(),
        street: formData.get('street').trim(),
        city: formData.get('city').trim(),
        zip: formData.get('zip').trim(),
        phone: formData.get('phone').trim()
    };

    addresses.push(newAddress);
    saveAddressBook(addresses);
    selectedAddressId = newAddress.id;
    localStorage.setItem(SELECTED_ADDRESS_KEY, selectedAddressId);

    addAddressForm.reset();
    addAddressForm.classList.add('hidden');
    renderAddressSummary();
    updateTotals();
    closeAddressModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !addressModal.classList.contains('hidden')) closeAddressModal();
});

renderAddressSummary();
updateTotals();
