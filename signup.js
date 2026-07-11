// Micro-interaction Script
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const inputs = form.querySelectorAll('input[required]');
    const progressBar = document.getElementById('formProgress');

    const updateProgress = () => {
        let filled = 0;
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                if (input.checked) filled++;
            } else {
                if (input.value.trim() !== '') filled++;
            }
        });
        const percentage = (filled / inputs.length) * 100;
        progressBar.style.width = `${Math.max(25, percentage)}%`;
    };

    inputs.forEach(input => {
        input.addEventListener('input', updateProgress);
        input.addEventListener('change', updateProgress);
    });

    // Password Toggle logic
    const togglePass = document.querySelector('.material-symbols-outlined[class*="cursor-pointer"]');
    const passInput = document.getElementById('signup-password');

    togglePass.addEventListener('click', () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        togglePass.textContent = isPass ? 'visibility_off' : 'visibility';
    });

    // Real account creation against Supabase. New accounts default to the
    // 'client' role via the database trigger — there is no way for this form
    // to grant itself admin access.
    const submitBtn = document.getElementById('signup-submit');
    const signupError = document.getElementById('signup-error');

    function showError(message) {
        signupError.textContent = message;
        signupError.classList.remove('hidden');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        signupError.classList.add('hidden');

        const fullName = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = passInput.value;

        submitBtn.disabled = true;
        submitBtn.textContent = 'VERIFYING PROTOCOLS...';
        submitBtn.style.opacity = '0.7';

        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });

        if (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'INITIALIZE ACCOUNT';
            submitBtn.style.opacity = '1';
            showError(error.message);
            return;
        }

        // Give the profile row created by the DB trigger a chance to store the full name.
        if (data.user && fullName) {
            await sb.from('profiles').update({ full_name: fullName }).eq('id', data.user.id);
        }

        if (data.session) {
            window.location.href = 'client-dashboard.html';
        } else {
            // Email confirmation is required before a session exists.
            submitBtn.textContent = 'CHECK YOUR EMAIL TO CONFIRM';
            alert('Account created. Please check your email to confirm your address before logging in.');
            window.location.href = 'login.html';
        }
    });
});
