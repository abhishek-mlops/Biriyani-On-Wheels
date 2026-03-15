/* ═══ MENU JS ═══ */
let allItems = [];
let activeCat = 'All';

async function loadMenu() {
  const grid = document.getElementById('menu-grid');
  try {
    const r = await fetch('/menu');
    allItems = await r.json();
    renderItems(allItems);
  } catch(e) {
    grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:3rem">Failed to load menu</p>';
  }
}

function renderItems(items) {
  const grid = document.getElementById('menu-grid');
  if (!items.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--muted)">
      <div style="font-size:4rem;margin-bottom:1rem">🍽️</div><p>No items found</p></div>`;
    return;
  }
  grid.innerHTML = items.map(buildCard).join('');
  grid.querySelectorAll('.dish-card').forEach((c, i) => {
    c.style.opacity = '0'; c.style.transform = 'translateY(20px)';
    setTimeout(() => {
      c.style.transition = 'all 0.5s cubic-bezier(0.16,1,0.3,1)';
      c.style.opacity = '1'; c.style.transform = 'translateY(0)';
    }, i * 70);
  });
}

function applyFilters() {
  const q = (document.getElementById('srch')?.value || '').toLowerCase();
  let filtered = allItems;
  if (activeCat !== 'All') filtered = filtered.filter(i => i.category === activeCat);
  if (q) filtered = filtered.filter(i =>
    i.name.toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q)
  );
  renderItems(filtered);
}

// Category buttons
document.querySelectorAll('.flt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.flt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    applyFilters();
  });
});

// Search
document.getElementById('srch')?.addEventListener('input', applyFilters);

// URL param category
const params = new URLSearchParams(window.location.search);
const catParam = params.get('cat');
if (catParam) {
  const btn = document.querySelector(`.flt-btn[data-cat="${catParam}"]`);
  if (btn) { document.querySelectorAll('.flt-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); activeCat = catParam; }
}

// Closed banner
async function checkClosed() {
  try {
    const r = await fetch('/restaurant/status');
    const d = await r.json();
    const banner = document.getElementById('closed-banner');
    if (!d.is_open && banner) {
      banner.style.display = 'flex';
      runCountdown();
    }
  } catch(e){}
}

function runCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;
  function tick() {
    const now = new Date();
    const open = new Date(); open.setHours(17,0,0,0);
    if (now >= open) { el.textContent = 'Open Now!'; return; }
    const diff = open - now;
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    el.textContent = `Opens in ${h}h ${m}m ${s}s`;
  }
  tick(); setInterval(tick, 1000);
}

checkClosed();
loadMenu();
