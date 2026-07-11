// Micro-interaction for Navbar scroll effect
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
        nav.classList.add('h-16', 'bg-surface/90');
        nav.classList.remove('h-20', 'bg-surface/70');
    } else {
        nav.classList.remove('h-16', 'bg-surface/90');
        nav.classList.add('h-20', 'bg-surface/70');
    }
});

// Hover animation hook for Product Cards
document.querySelectorAll('.group').forEach(card => {
    card.addEventListener('mouseenter', () => {
        // Potential subtle JS animations if needed
    });
});

// Priority Compounds carousel arrows
const productCarousel = document.getElementById('product-carousel');
const carouselPrev = document.getElementById('carousel-prev');
const carouselNext = document.getElementById('carousel-next');

function scrollCarousel(direction) {
    const firstCard = productCarousel.querySelector(':scope > div');
    if (!firstCard) return;
    const gap = parseFloat(getComputedStyle(productCarousel).columnGap) || 0;
    const distance = (firstCard.getBoundingClientRect().width + gap) * direction;
    productCarousel.scrollBy({ left: distance, behavior: 'smooth' });
}

carouselPrev.addEventListener('click', () => scrollCarousel(-1));
carouselNext.addEventListener('click', () => scrollCarousel(1));

// Quick View modal
const quickViewModal = document.getElementById('quick-view-modal');
const quickViewBackdrop = document.getElementById('quick-view-backdrop');
const quickViewClose = document.getElementById('quick-view-close');
const quickViewImage = document.getElementById('quick-view-image');
const quickViewName = document.getElementById('quick-view-name');
const quickViewCategory = document.getElementById('quick-view-category');
const quickViewPrice = document.getElementById('quick-view-price');
const quickViewSize = document.getElementById('quick-view-size');
const quickViewBadge = document.getElementById('quick-view-badge');
const quickViewDetailsLink = document.getElementById('quick-view-details-link');

function openQuickView(card) {
    const data = card.dataset;
    quickViewImage.src = data.image;
    quickViewImage.alt = data.name;
    quickViewName.textContent = data.name;
    quickViewCategory.textContent = data.category;
    quickViewPrice.textContent = data.price;
    quickViewSize.textContent = data.size;

    if (data.badge) {
        quickViewBadge.textContent = data.badge;
        quickViewBadge.classList.remove('hidden');
    } else {
        quickViewBadge.classList.add('hidden');
    }

    if (data.detailHref) {
        quickViewDetailsLink.href = data.detailHref;
        quickViewDetailsLink.classList.remove('hidden');
    } else {
        quickViewDetailsLink.classList.add('hidden');
    }

    quickViewModal.classList.remove('hidden');
    quickViewModal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
}

function closeQuickView() {
    quickViewModal.classList.add('hidden');
    quickViewModal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
}

document.querySelectorAll('.quick-view-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => openQuickView(trigger.closest('.group')));
});

quickViewBackdrop.addEventListener('click', closeQuickView);
quickViewClose.addEventListener('click', closeQuickView);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !quickViewModal.classList.contains('hidden')) closeQuickView();
});

// Header search: sends the visitor to the catalog page with their query pre-filled
const headerSearchInput = document.getElementById('header-search-input');
const headerSearchBtn = document.getElementById('header-search-btn');

function goToCatalogSearch() {
    const query = headerSearchInput.value.trim();
    window.location.href = query
        ? `catalog.html?search=${encodeURIComponent(query)}`
        : 'catalog.html';
}

headerSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') goToCatalogSearch();
});
headerSearchBtn.addEventListener('click', goToCatalogSearch);
