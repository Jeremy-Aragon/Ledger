// ============================================
// Populates the sidebar avatar/name/email with
// the actual logged-in user's info.
// Include on every page that has the sidebar,
// after auth-guard.js.
// ============================================

async function loadSidebarUser(user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const name = (profile && profile.full_name) ? profile.full_name : (user.email ? user.email.split('@')[0] : 'User');
  const initial = name.charAt(0).toUpperCase();

  const avatarEl = document.getElementById('sidebarAvatar');
  const nameEl = document.getElementById('sidebarName');
  const subEl = document.getElementById('sidebarSub');

  if (avatarEl) avatarEl.textContent = initial;
  if (nameEl) nameEl.textContent = name;
  if (subEl) subEl.textContent = user.email;
}

window.addEventListener('auth-ready', (e) => loadSidebarUser(e.detail));
