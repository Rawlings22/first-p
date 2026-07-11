// Simple scroll interaction for header
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 20) {
        nav.classList.add('h-16');
        nav.classList.remove('h-20');
    } else {
        nav.classList.add('h-20');
        nav.classList.remove('h-16');
    }
});

// Hover effects for table rows
document.querySelectorAll('tr').forEach(row => {
    row.addEventListener('mouseenter', () => {
        row.querySelector('button')?.classList.add('translate-x-1');
    });
    row.addEventListener('mouseleave', () => {
        row.querySelector('button')?.classList.remove('translate-x-1');
    });
});

// Header search: reveals an input, then sends the visitor to the catalog with their query
const searchToggleBtn = document.getElementById('wholesale-search-toggle');
const searchBox = document.getElementById('wholesale-search-box');
const searchInput = document.getElementById('wholesale-search-input');

searchToggleBtn.addEventListener('click', () => {
    const isOpen = !searchBox.classList.contains('hidden');
    if (isOpen) {
        searchBox.classList.add('hidden');
        searchBox.classList.remove('flex');
    } else {
        searchBox.classList.remove('hidden');
        searchBox.classList.add('flex');
        searchInput.focus();
    }
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const query = searchInput.value.trim();
    window.location.href = query ? `catalog.html?search=${encodeURIComponent(query)}` : 'catalog.html';
});

document.addEventListener('click', (e) => {
    if (!searchBox.classList.contains('hidden') && !searchBox.contains(e.target) && e.target !== searchToggleBtn) {
        searchBox.classList.add('hidden');
        searchBox.classList.remove('flex');
    }
});

// Download COA Catalog: jumps to the on-page COA Database section
document.getElementById('download-coa-btn').addEventListener('click', () => {
    document.getElementById('coa-database').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// New Bulk Order: bulk orders start from the product catalog
document.getElementById('new-bulk-order-btn').addEventListener('click', () => {
    window.location.href = 'catalog.html';
});
