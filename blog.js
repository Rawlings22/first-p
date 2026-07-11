// Micro-interaction for article hover effects
document.querySelectorAll('article').forEach(card => {
    card.addEventListener('mouseenter', () => {
        // Subtle lift or secondary animation triggers here
    });
});

// Category filter buttons (All / Peptides / Regenerative / Protocols) + live search,
// combined: an article must match both the selected category and the search text.
const filterButtons = document.querySelectorAll('.blog-filter-btn');
const articleGrid = document.getElementById('article-grid');
const blogSearchInput = document.getElementById('blog-search-input');

let currentCategory = 'all';

function setActiveFilterButton(activeBtn) {
    filterButtons.forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white', 'border-primary');
        btn.classList.add('border-outline-variant');
    });
    activeBtn.classList.add('bg-primary', 'text-white', 'border-primary');
    activeBtn.classList.remove('border-outline-variant');
}

function applyBlogFilters() {
    const query = blogSearchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    articleGrid.querySelectorAll('article').forEach(article => {
        const matchesCategory = currentCategory === 'all' || article.dataset.category === currentCategory;
        const matchesSearch = query === '' || article.textContent.toLowerCase().includes(query);
        const matches = matchesCategory && matchesSearch;
        article.classList.toggle('hidden', !matches);
        if (matches) visibleCount++;
    });

    let emptyState = document.getElementById('blog-no-results');
    if (visibleCount === 0) {
        if (!emptyState) {
            emptyState = document.createElement('p');
            emptyState.id = 'blog-no-results';
            emptyState.className = 'col-span-full text-center text-on-surface-variant font-body-md py-16';
            articleGrid.appendChild(emptyState);
        }
        emptyState.textContent = query
            ? `No publications match "${blogSearchInput.value.trim()}".`
            : 'No publications in this category yet.';
    } else if (emptyState) {
        emptyState.remove();
    }
}

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentCategory = btn.dataset.filter;
        setActiveFilterButton(btn);
        applyBlogFilters();
    });
});

blogSearchInput.addEventListener('input', applyBlogFilters);

const defaultFilterBtn = document.querySelector('.blog-filter-btn[data-filter="all"]');
if (defaultFilterBtn) setActiveFilterButton(defaultFilterBtn);
