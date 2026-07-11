// Shared auth helpers. Requires supabase-config.js (defines `sb`) to be loaded first.

async function getSessionUser() {
    const { data: { session } } = await sb.auth.getSession();
    return session ? session.user : null;
}

async function getProfile(userId) {
    const { data, error } = await sb
        .from('profiles')
        .select('id, email, role, full_name')
        .eq('id', userId)
        .single();
    if (error) return null;
    return data;
}

async function getCurrentProfile() {
    const user = await getSessionUser();
    if (!user) return null;
    return getProfile(user.id);
}

function dashboardUrlForRole(role) {
    return role === 'admin' ? 'admin-dashboard.html' : 'client-dashboard.html';
}

async function signOutAndRedirect(target = 'index.html') {
    await sb.auth.signOut();
    window.location.href = target;
}

// Call at the top of a page that requires any logged-in user. Redirects to login if none.
async function requireAuth() {
    const user = await getSessionUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// Call at the top of a page that requires an admin. Redirects non-admins to their own dashboard.
// This is a UX convenience only — the real enforcement is the RLS policies in Supabase.
async function requireAdmin() {
    const profile = await getCurrentProfile();
    if (!profile) {
        window.location.href = 'login.html';
        return null;
    }
    if (profile.role !== 'admin') {
        window.location.href = 'client-dashboard.html';
        return null;
    }
    return profile;
}

// Repoints any header "account" link (href="login.html") at the visitor's real
// dashboard if they're already signed in, so the icon reflects actual session state.
async function wireAccountLinks() {
    const links = document.querySelectorAll('a[href="login.html"]');
    if (links.length === 0) return;

    const profile = await getCurrentProfile();
    if (!profile) return;

    const target = dashboardUrlForRole(profile.role);
    links.forEach(link => {
        link.setAttribute('href', target);
        link.setAttribute('title', profile.role === 'admin' ? 'Admin Dashboard' : 'My Account');
    });
}

document.addEventListener('DOMContentLoaded', wireAccountLinks);
