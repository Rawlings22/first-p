// Shared mobile hamburger menu toggle. Expects a button with id="mobile-menu-btn"
// and a panel with id="mobile-menu-panel" (starts hidden; toggled open on click).
// Visibility is driven by an inline style rather than the "hidden"/"flex" utility
// classes, so it can't be silently overridden by Tailwind's CDN-generated stylesheet
// ordering (which isn't guaranteed to match build-time Tailwind's cascade order).
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('mobile-menu-btn');
    const panel = document.getElementById('mobile-menu-panel');
    if (!btn || !panel) return;

    const icon = btn.querySelector('.material-symbols-outlined');
    let isOpen = false;

    function setOpen(open) {
        isOpen = open;
        panel.style.display = open ? 'flex' : 'none';
        if (icon) icon.textContent = open ? 'close' : 'menu';
        btn.setAttribute('aria-expanded', String(open));
    }

    setOpen(false);

    btn.addEventListener('click', () => setOpen(!isOpen));

    // Close the menu once a link inside it is chosen (before navigation).
    panel.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) setOpen(false);
    });
});
