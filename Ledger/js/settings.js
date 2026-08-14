// ============================================
// Settings — real profile data, saves to Supabase.
// Waits for auth-guard.js to confirm a session first.
// ============================================

let settingsUser = null;

async function initSettings(user) {
  settingsUser = user;

  document.getElementById('profileEmail').value = user.email;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById('profileName').value = profile.full_name || '';
  document.getElementById('profileCurrency').value = profile.currency || 'PHP';
  document.getElementById('profileAdvisorScope').value = profile.advisor_history_scope || '3_months';

  loadCategories(user.id);
}

async function loadCategories(userId) {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  const container = document.getElementById('categoryChipList');

  if (error) {
    container.innerHTML = `<p style="font-size:13.5px; color:var(--expense);">Couldn't load categories.</p>`;
    return;
  }

  if (categories.length === 0) {
    container.innerHTML = `<p style="font-size:13.5px; color:var(--text-tertiary);">No categories yet.</p>`;
    return;
  }

  container.innerHTML = categories.map(c => `
    <span class="category-chip">
      <span class="category-dot" style="background:${c.color};"></span>${escapeHtml(c.name)}
    </span>`).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

document.getElementById('profileSaveBtn').addEventListener('click', async function () {
  const btn = this;
  const msg = document.getElementById('profileSaveMsg');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  msg.style.display = 'none';

  const { error } = await supabase.from('profiles').update({
    full_name: document.getElementById('profileName').value.trim(),
    currency: document.getElementById('profileCurrency').value,
    advisor_history_scope: document.getElementById('profileAdvisorScope').value
  }).eq('id', settingsUser.id);

  btn.disabled = false;
  btn.textContent = 'Save changes';

  if (error) {
    alert(error.message);
    return;
  }

  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; }, 2500);

  // Sidebar name may have just changed — refresh it.
  if (typeof loadSidebarUser === 'function') loadSidebarUser(settingsUser);
});

document.getElementById('signOutBtn').addEventListener('click', async function () {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
});

window.addEventListener('auth-ready', (e) => initSettings(e.detail));
