// Micro-interaction for form input focus
document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('focus', () => {
        el.parentElement.querySelector('label').classList.add('text-secondary');
    });
    el.addEventListener('blur', () => {
        el.parentElement.querySelector('label').classList.remove('text-secondary');
    });
});

// Simple form submission simulation
document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Processing...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Inquiry Sent';
        btn.classList.replace('bg-primary', 'bg-secondary');
        e.target.reset();

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.replace('bg-secondary', 'bg-primary');
            btn.disabled = false;
        }, 3000);
    }, 1500);
});
