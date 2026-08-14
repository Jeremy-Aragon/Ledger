// ============================================
// Transactions — real Supabase data.
// Waits for auth-guard.js to confirm a session first.
// ============================================

const CATEGORY_ICONS = {
  food: '🍜', transport: '🚕', bills: '🔌', shopping: '🛍️',
  fun: '🎬', income: '💼'
};

function iconFor(name) {
  return CATEGORY_ICONS[(name || '').toLowerCase()] || '💳';
}

function formatPeso(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

let allCategories = [];
let allTransactions = [];
let currentUserRef = null;

async function initTransactions(user) {
  currentUserRef = user;

  const { data: categories, error: catErr } = await supabase
    .from('categories').select('*').eq('user_id', user.id).order('name');
  if (catErr) { console.error(catErr); return; }
  allCategories = categories;

  populateCategorySelects(categories);
  document.getElementById('txDate').valueAsDate = new Date();

  await refreshTransactions();

  document.getElementById('filterCategory').addEventListener('change', renderList);
  document.getElementById('filterSearch').addEventListener('input', renderList);
}

function populateCategorySelects(categories) {
  const formSelect = document.getElementById('txCategory');
  const filterSelect = document.getElementById('filterCategory');

  formSelect.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  filterSelect.innerHTML = `<option value="">All categories</option>` +
    categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

async function refreshTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', currentUserRef.id)
    .order('occurred_on', { ascending: false });

  if (error) { console.error(error); return; }
  allTransactions = data;
  renderList();
}

function renderList() {
  const container = document.getElementById('txListContainer');
  const catFilter = document.getElementById('filterCategory').value;
  const search = document.getElementById('filterSearch').value.trim().toLowerCase();
  const catMap = Object.fromEntries(allCategories.map(c => [c.id, c]));

  let filtered = allTransactions;
  if (catFilter) filtered = filtered.filter(t => t.category_id === catFilter);
  if (search) filtered = filtered.filter(t => t.description.toLowerCase().includes(search));

  if (filtered.length === 0) {
    container.innerHTML = `<p style="font-size:13.5px; color:var(--text-tertiary); padding:20px 0; text-align:center;">
      ${allTransactions.length === 0 ? 'No transactions yet — add your first one above.' : 'No transactions match your filters.'}
    </p>`;
    return;
  }

  container.innerHTML = filtered.map(tx => {
    const cat = catMap[tx.category_id];
    const bg = tx.type === 'income' ? 'var(--sage-light)' : 'var(--expense-light)';
    const tagColor = tx.type === 'income' ? 'var(--sage-dark)' : 'var(--expense)';
    const sign = tx.type === 'income' ? '+' : '−';
    const dateLabel = new Date(tx.occurred_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="tx-row">
        <div class="tx-icon" style="background:${bg};">${iconFor(cat ? cat.name : '')}</div>
        <div class="tx-info">
          <div class="tx-title">${escapeHtml(tx.description)}</div>
          <div class="tx-meta">${dateLabel}</div>
        </div>
        <span class="tx-category-tag" style="background:${bg}; color:${tagColor};">${cat ? escapeHtml(cat.name) : 'Uncategorized'}</span>
        <div class="tx-amount ${tx.type}">${sign}₱${formatPeso(tx.amount)}</div>
        <button class="btn-icon" aria-label="Delete" onclick="deleteTransaction('${tx.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>
          </svg>
        </button>
      </div>`;
  }).join('');
}

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  await refreshTransactions();
}

document.getElementById('txForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const submitBtn = document.getElementById('txSubmit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  const payload = {
    user_id: currentUserRef.id,
    description: document.getElementById('txDescription').value.trim(),
    amount: parseFloat(document.getElementById('txAmount').value),
    category_id: document.getElementById('txCategory').value,
    occurred_on: document.getElementById('txDate').value,
    type: document.getElementById('txType').value
  };

  const { error } = await supabase.from('transactions').insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save transaction';

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById('txForm').reset();
  document.getElementById('txDate').valueAsDate = new Date();
  document.getElementById('addPanel').classList.remove('open');
  await refreshTransactions();
});

window.addEventListener('auth-ready', (e) => initTransactions(e.detail));
