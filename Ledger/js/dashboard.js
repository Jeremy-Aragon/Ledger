// ============================================
// Dashboard — pulls real data from Supabase.
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

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short' });
}

async function loadDashboard(user) {
  const [{ data: categories, error: catErr }, { data: transactions, error: txErr }] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', user.id),
    supabase.from('transactions').select('*').eq('user_id', user.id).order('occurred_on', { ascending: false })
  ]);

  if (catErr || txErr) {
    console.error(catErr || txErr);
    return;
  }

  renderHero(transactions);
  renderRecent(transactions, categories);
  renderRings(transactions, categories);
  renderTrend(transactions);
}

function renderHero(transactions) {
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = income - expense;

  const [whole, cents] = formatPeso(balance).split('.');
  document.getElementById('totalBalance').innerHTML = `₱${whole}<span class="cents">.${cents}</span>`;
  document.getElementById('incomeStat').textContent = `↑ ₱${formatPeso(income)} in`;
  document.getElementById('expenseStat').textContent = `↓ ₱${formatPeso(expense)} out`;
}

function renderRecent(transactions, categories) {
  const container = document.getElementById('recentTxList');
  const recent = transactions.slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `<p style="font-size:13.5px; color:var(--text-tertiary); padding:10px 0;">No transactions yet — add your first one from the Transactions page.</p>`;
    return;
  }

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  container.innerHTML = recent.map(tx => {
    const cat = catMap[tx.category_id];
    const bg = tx.type === 'income' ? 'var(--sage-light)' : 'var(--expense-light)';
    const sign = tx.type === 'income' ? '+' : '−';
    return `
      <div class="tx-row" style="grid-template-columns: 36px 1fr auto;">
        <div class="tx-icon" style="background:${bg}; font-size:15px;">${iconFor(cat ? cat.name : '')}</div>
        <div class="tx-info">
          <div class="tx-title">${escapeHtml(tx.description)}</div>
          <div class="tx-meta">${new Date(tx.occurred_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        </div>
        <div class="tx-amount ${tx.type}">${sign}₱${formatPeso(tx.amount)}</div>
      </div>`;
  }).join('');
}

function renderRings(transactions, categories) {
  const grid = document.getElementById('ringGrid');
  const spendCategories = categories.filter(c => !c.is_income);

  if (spendCategories.length === 0) {
    grid.innerHTML = `<p style="font-size:13.5px; color:var(--text-tertiary);">No categories yet.</p>`;
    return;
  }

  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.occurred_on);
    return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  grid.innerHTML = spendCategories.map(cat => {
    const spent = thisMonth.filter(t => t.category_id === cat.id).reduce((sum, t) => sum + Number(t.amount), 0);
    const budget = Number(cat.monthly_budget) || 0;
    const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : (spent > 0 ? 100 : 0);
    const r = 40;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - percent / 100);

    return `
      <div class="ring-item">
        <svg class="ring-svg" width="96" height="96" viewBox="0 0 96 96">
          <circle class="ring-track" cx="48" cy="48" r="${r}"/>
          <circle class="ring-progress" cx="48" cy="48" r="${r}"
            style="stroke:${cat.color}; stroke-dasharray:${circumference}; stroke-dashoffset:${offset};"/>
        </svg>
        <span class="ring-label">${escapeHtml(cat.name)}</span>
        <span class="ring-sub">₱${formatPeso(spent)} / ₱${formatPeso(budget)}</span>
      </div>`;
  }).join('');
}

function renderTrend(transactions) {
  const container = document.getElementById('trendChartContainer');

  if (transactions.length === 0) {
    container.innerHTML = `<p style="font-size:13.5px; color:var(--text-tertiary); padding:30px 0; text-align:center;">No data yet — your trend will show up here once you add transactions.</p>`;
    return;
  }

  // Build net cash flow per month for the last 6 months that have data.
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-US', { month: 'short' }), net: 0 });
  }

  transactions.forEach(t => {
    const key = monthKey(t.occurred_on);
    const bucket = months.find(m => m.key === key);
    if (bucket) bucket.net += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
  });

  const values = months.map(m => m.net);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const width = 560, height = 200, padX = 20, padTop = 20, padBottom = 40;
  const usableHeight = height - padTop - padBottom;
  const step = (width - padX * 2) / (months.length - 1 || 1);

  const points = months.map((m, i) => {
    const x = padX + i * step;
    const y = padTop + usableHeight - ((m.net - min) / range) * usableHeight;
    return { x, y, label: m.label };
  });

  const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const fillPoints = `${points[0].x},${height - 20} ` + linePoints + ` ${points[points.length - 1].x},${height - 20}`;

  container.innerHTML = `
    <svg class="trend-chart" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5B6B4F" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#5B6B4F" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line class="trend-grid-line" x1="0" y1="40" x2="${width}" y2="40"/>
      <line class="trend-grid-line" x1="0" y1="90" x2="${width}" y2="90"/>
      <line class="trend-grid-line" x1="0" y1="140" x2="${width}" y2="140"/>

      <polygon class="trend-fill" points="${fillPoints}"/>
      <polyline class="trend-line" points="${linePoints}"/>

      ${points.map(p => `<circle class="trend-dot" cx="${p.x}" cy="${p.y}" r="4"/>`).join('')}
      ${points.map(p => `<text class="trend-axis-label" x="${p.x - 10}" y="${height - 4}">${p.label}</text>`).join('')}
    </svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

window.addEventListener('auth-ready', (e) => loadDashboard(e.detail));
