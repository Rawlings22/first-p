// Visual Micro-interactions
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input[type="email"], input[type="password"]');

    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.querySelector('label').style.color = '#006a61';
        });
        input.addEventListener('blur', () => {
            input.parentElement.querySelector('label').style.color = '';
        });
    });

    // Smooth subtle float for the glass panel
    const panel = document.querySelector('.glass-panel');
    window.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) / 100;
        const moveY = (e.clientY - window.innerHeight / 2) / 100;
        panel.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });

    // Admin / Patient login toggle (cosmetic — the account the visitor actually
    // logs into determines its own role from the database, not this tab)
    const roleInputs = document.querySelectorAll('input[name="login-role"]');
    const loginHeading = document.getElementById('login-heading');
    const loginSubtext = document.getElementById('login-subtext');
    const emailLabel = document.getElementById('email-label');
    const emailInput = document.getElementById('email');

    const roleContent = {
        admin: {
            heading: 'Admin Login',
            subtext: 'Enter your credentials to access the laboratory database.',
            emailLabel: 'Admin Email',
            emailPlaceholder: 'admin@institution.edu'
        },
        patient: {
            heading: 'Patient Login',
            subtext: 'Enter your credentials to access your patient portal.',
            emailLabel: 'Patient Email',
            emailPlaceholder: 'patient@email.com'
        }
    };

    function applyRole(role) {
        const content = roleContent[role];
        loginHeading.textContent = content.heading;
        loginSubtext.textContent = content.subtext;
        emailLabel.textContent = content.emailLabel;
        emailInput.placeholder = content.emailPlaceholder;
    }

    roleInputs.forEach(input => {
        input.addEventListener('change', () => applyRole(input.value));
    });

    // Real authentication against Supabase
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');
    const submitLabel = document.getElementById('login-submit-label');

    function showError(message) {
        loginError.textContent = message;
        loginError.classList.remove('hidden');
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const requestedRole = document.querySelector('input[name="login-role"]:checked').value;

        submitBtn.disabled = true;
        submitLabel.textContent = 'AUTHENTICATING...';

        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            submitBtn.disabled = false;
            submitLabel.textContent = 'AUTHENTICATE SESSION';
            showError(error.message === 'Invalid login credentials'
                ? 'Incorrect email or password.'
                : error.message);
            return;
        }

        const profile = await getProfile(data.user.id);
        if (!profile) {
            submitBtn.disabled = false;
            submitLabel.textContent = 'AUTHENTICATE SESSION';
            showError('Could not load your account profile. Please try again.');
            return;
        }

        if (requestedRole === 'admin' && profile.role !== 'admin') {
            // Valid credentials, but this account has no admin privileges.
            // Sign them in to their real (client) dashboard rather than blocking them.
            window.location.href = 'client-dashboard.html';
            return;
        }

        window.location.href = dashboardUrlForRole(profile.role);
    });
});
