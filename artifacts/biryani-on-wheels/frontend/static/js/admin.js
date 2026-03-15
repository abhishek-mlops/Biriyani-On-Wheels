/* ═══ ADMIN JS ═══ */
async function adminLogin() {
  const user = document.getElementById('a-user').value;
  const pass = document.getElementById('a-pass').value;
  const err  = document.getElementById('a-err');
  try {
    const r = await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user,password:pass})});
    const d = await r.json();
    if(d.success){
      document.getElementById('admin-login-wrap').style.display='none';
      document.getElementById('admin-wrap').style.display='grid';
      loadOverview();
    } else err.textContent = d.error||'Invalid credentials';
  } catch(e){ err.textContent='Login failed'; }
}
window.adminLogin = adminLogin;

async function adminLogout() {
  await fetch('/admin/logout',{method:'POST'});
  document.getElementById('admin-login-wrap').style.display='flex';
  document.getElementById('admin-wrap').style.display='none';
}
window.adminLogout = adminLogout;

function showTab(tab) {
  document.querySelectorAll('.atab').forEach(t=>t.style.display='none');
  document.querySelectorAll('.anav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`atab-${tab}`).style.display='block';
  document.querySelector(`[onclick="showTab('${tab}')"]`).classList.add('active');
  if(tab==='orders') loadOrders();
  if(tab==='menu') loadMenu();
  if(tab==='analytics') loadAnalytics();
}
window.showTab = showTab;

async function loadOverview() {
  try {
    const r = await fetch('/admin/dashboard');
    const d = await r.json();
    document.getElementById('a-stats').innerHTML = `
      <div class="astat-card"><div class="astat-icon">📦</div><div class="astat-val">${d.total_orders}</div><div class="astat-name">Total Orders</div></div>
      <div class="astat-card"><div class="astat-icon">💰</div><div class="astat-val">₹${(d.daily_revenue||0).toFixed(0)}</div><div class="astat-name">Today's Revenue</div></div>
      <div class="astat-card"><div class="astat-icon">👥</div><div class="astat-val">${d.total_customers}</div><div class="astat-name">Customers</div></div>
      <div class="astat-card"><div class="astat-icon">⭐</div><div class="astat-val">${(d.popular||[]).length}</div><div class="astat-name">Top Dishes</div></div>`;
    document.getElementById('a-popular').innerHTML = `
      <table class="admin-table"><thead><tr><th>Dish</th><th>Orders</th></tr></thead>
      <tbody>${(d.popular||[]).map(p=>`<tr><td>${p.name}</td><td>${p.total}</td></tr>`).join('')}</tbody></table>`;
    document.getElementById('a-recent').innerHTML = `
      <table class="admin-table"><thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>${(d.recent||[]).map(o=>`<tr><td>#${o.order_id}</td><td>${o.cname||'Guest'}</td><td>₹${o.total_price.toFixed(0)}</td>
        <td><span class="status-badge ${statusClass(o.order_status)}">${o.order_status}</span></td></tr>`).join('')}</tbody></table>`;
  } catch(e){}
}

async function loadOrders() {
  const el = document.getElementById('a-orders'); if(!el) return;
  try {
    const r = await fetch('/admin/orders');
    const orders = await r.json();
    const flt = document.getElementById('ord-filter')?.value||'all';
    const filtered = flt==='all' ? orders : orders.filter(o=>o.order_status===flt);
    el.innerHTML = `<table class="admin-table"><thead><tr><th>ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Update</th></tr></thead>
      <tbody>${filtered.map(o=>`<tr>
        <td>#${o.order_id}</td><td>${o.cname||'Guest'}</td>
        <td style="font-size:0.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis">${(o.items||[]).map(i=>i.name).join(', ')}</td>
        <td>₹${o.total_price.toFixed(0)}</td><td style="font-size:0.78rem;color:var(--muted)">${o.payment_method}</td>
        <td><span class="status-badge ${statusClass(o.order_status)}">${o.order_status}</span></td>
        <td><select class="status-sel" onchange="updateStatus(${o.order_id},this.value)">
          <option value="">Change...</option>
          <option>Order Received</option><option>Preparing</option><option>Ready</option>
          <option>Out for Delivery</option><option>Delivered</option>
        </select></td></tr>`).join('')}</tbody></table>`;
  } catch(e){}
}

async function updateStatus(orderId, status) {
  if(!status) return;
  await fetch('/admin/order-status',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_id:orderId,status})});
  toast(`Order #${orderId} → "${status}"`, '✅');
  loadOrders();
}
window.updateStatus = updateStatus;

async function loadMenu() {
  const el = document.getElementById('a-menu'); if(!el) return;
  try {
    const r = await fetch('/menu');
    const items = await r.json();
    el.innerHTML = `<table class="admin-table"><thead><tr><th>Name</th><th>Category</th><th>Half</th><th>Full</th><th>Filter</th><th>Tags</th><th>Actions</th></tr></thead>
      <tbody>${items.map(i=>`<tr>
        <td>${i.name}</td><td>${i.category}</td>
        <td>${i.price_half ? '₹'+i.price_half : '—'}</td>
        <td>${i.price_full ? '₹'+i.price_full : '—'}</td>
        <td>${i.filter_type||'none'}</td>
        <td>${i.is_popular?'🔥':''} ${i.is_chef_special?'👨‍🍳':''} ${i.availability?'':'❌'}</td>
        <td style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button onclick="openEdit(${JSON.stringify(i).replace(/"/g,'&quot;')})" style="padding:0.25rem 0.6rem;background:rgba(212,172,13,0.1);border:1px solid rgba(212,172,13,0.3);color:var(--turmeric);border-radius:7px;font-size:0.72rem;cursor:pointer;font-family:inherit">Edit</button>
          <button onclick="delItem(${i.item_id})" style="padding:0.25rem 0.6rem;background:rgba(192,57,43,0.1);border:1px solid rgba(192,57,43,0.25);color:var(--spice);border-radius:7px;font-size:0.72rem;cursor:pointer;font-family:inherit">Del</button>
        </td></tr>`).join('')}</tbody></table>`;
  } catch(e){}
}

function openModal() {
  document.getElementById('modal-title').textContent='Add Menu Item';
  document.getElementById('m-id').value='';
  ['m-name','m-desc','m-img','m-badge'].forEach(id=>document.getElementById(id).value='');
  ['m-phalf','m-pfull'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('m-cat').value='Naati Biryani';
  document.getElementById('m-filter').value='none';
  document.getElementById('m-pop').checked=false;
  document.getElementById('m-chef').checked=false;
  document.getElementById('m-avail').checked=true;
  document.getElementById('item-modal').style.display='flex';
}
window.openModal = openModal;

function openEdit(item) {
  document.getElementById('modal-title').textContent='Edit Item';
  document.getElementById('m-id').value=item.item_id;
  document.getElementById('m-name').value=item.name||'';
  document.getElementById('m-cat').value=item.category||'Naati Biryani';
  document.getElementById('m-desc').value=item.description||'';
  document.getElementById('m-phalf').value=item.price_half||'';
  document.getElementById('m-pfull').value=item.price_full||'';
  document.getElementById('m-img').value=item.image_url||'';
  document.getElementById('m-filter').value=item.filter_type||'none';
  document.getElementById('m-badge').value=item.badge||'';
  document.getElementById('m-pop').checked=!!item.is_popular;
  document.getElementById('m-chef').checked=!!item.is_chef_special;
  document.getElementById('m-avail').checked=!!item.availability;
  document.getElementById('item-modal').style.display='flex';
}
window.openEdit = openEdit;

function closeModal(){ document.getElementById('item-modal').style.display='none'; }
window.closeModal = closeModal;

async function saveItem() {
  const id = document.getElementById('m-id').value;
  const body = {
    name: document.getElementById('m-name').value,
    category: document.getElementById('m-cat').value,
    description: document.getElementById('m-desc').value,
    price_half: document.getElementById('m-phalf').value ? parseFloat(document.getElementById('m-phalf').value) : null,
    price_full: document.getElementById('m-pfull').value ? parseFloat(document.getElementById('m-pfull').value) : null,
    image_url: document.getElementById('m-img').value,
    filter_type: document.getElementById('m-filter').value,
    badge: document.getElementById('m-badge').value,
    is_popular: document.getElementById('m-pop').checked ? 1 : 0,
    is_chef_special: document.getElementById('m-chef').checked ? 1 : 0,
    availability: document.getElementById('m-avail').checked ? 1 : 0,
  };
  if(id) body.item_id = parseInt(id);
  const url = id ? '/admin/edit-menu-item' : '/admin/add-menu-item';
  const method = id ? 'PUT' : 'POST';
  const r = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d = await r.json();
  if(d.success){ toast('Item saved!','✅'); closeModal(); loadMenu(); }
}
window.saveItem = saveItem;

async function delItem(id) {
  if(!confirm('Delete this item?')) return;
  await fetch(`/admin/delete-menu-item?item_id=${id}`,{method:'DELETE'});
  toast('Deleted','🗑️'); loadMenu();
}
window.delItem = delItem;

async function loadAnalytics() {
  const el = document.getElementById('a-analytics'); if(!el) return;
  try {
    const r = await fetch('/admin/analytics');
    const d = await r.json();
    el.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
      <div>
        <h3 style="font-size:0.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem">Daily Sales (Last 7 Days)</h3>
        <table class="admin-table"><thead><tr><th>Date</th><th>Orders</th><th>Revenue</th></tr></thead>
        <tbody>${(d.daily_sales||[]).map(s=>`<tr><td>${s.date}</td><td>${s.orders}</td><td>₹${(s.revenue||0).toFixed(0)}</td></tr>`).join('')}</tbody></table>
      </div>
      <div>
        <h3 style="font-size:0.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem">Top Dishes</h3>
        <table class="admin-table"><thead><tr><th>Dish</th><th>Category</th><th>Qty Sold</th></tr></thead>
        <tbody>${(d.top_dishes||[]).map(t=>`<tr><td>${t.name}</td><td>${t.category}</td><td>${t.total}</td></tr>`).join('')}</tbody></table>
      </div></div>`;
  } catch(e){}
}

document.addEventListener('keydown',e=>{ if(e.key==='Enter' && document.getElementById('admin-login-wrap')?.style.display!=='none') adminLogin(); });
