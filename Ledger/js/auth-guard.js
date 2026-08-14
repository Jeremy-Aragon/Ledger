// ============================================
// Auth guard — include on every page EXCEPT index.html
// Redirects to login if there's no active session.
// Also exposes the current user as `currentUser` once resolved.
// ============================================

let currentUser = null;

(async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = session.user;

  // Keep the guard live: if the session ends (e.g. token expires,
  // or the user signs out in another tab), bounce to login.
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
      window.location.href = 'index.html';
    }
  });
})();
