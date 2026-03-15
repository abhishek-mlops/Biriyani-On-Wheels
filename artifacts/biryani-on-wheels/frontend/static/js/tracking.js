/* ═══ TRACKING JS ═══ */
const STEPS = ['Order Received','Preparing','Ready','Out for Delivery','Delivered'];
const STEP_DESCS = {
  'Order Received': 'We have received your order!',
  'Preparing': 'Our kitchen is cooking your meal',
  'Ready': 'Your order is ready for pickup / delivery',
  'Out for Delivery': '🛵 On the way to your doorstep!',
  'Delivered': '🎉 Enjoy your meal! Thank you!'
};

async function loadOrders() {
  const list = document.getElementById('orders-list');
  if(!list) return;
  try {
    const r = await fetch('/orders');
    if(r.status === 401) {
      list.innerHTML = `<p style="color:var(--muted);padding:1rem">Please <a href="/auth-page" style="color:var(--saffron)">login</a> to view orders</p>`;
      return;
    }
    const orders = await r.json();
    if(!orders.length) {
      list.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--muted)">
        <div style="font-size:3rem;margin-bottom:1rem">📦</div><p>No orders yet</p>
        <a href="/menu-page" class="btn-saffron" style="display:inline-flex;margin-top:1rem" onclick="goTo(event,'/menu-page')">Order Now</a></div>`;
      return;
    }
    list.innerHTML = orders.map(o => `
      <div class="order-hist-card" onclick="showTracker(${o.order_id})">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <span style="font-size:0.78rem;color:var(--muted)">Order #${o.order_id}</span>
          <span class="status-badge ${statusClass(o.order_status)}">${o.order_status}</span>
        </div>
        <div style="font-size:0.82rem;color:var(--text);margin-bottom:0.4rem">${(o.items||[]).map(i=>i.name).join(', ')}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.75rem;color:var(--muted)">${new Date(o.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
          <span style="font-weight:700;color:var(--saffron)">${fmtPrice(o.total_price)}</span>
        </div>
        <button onclick="event.stopPropagation();reorder(${o.order_id})"
          style="margin-top:0.7rem;padding:0.3rem 0.8rem;background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);color:var(--saffron);border-radius:8px;font-size:0.72rem;cursor:pointer;font-family:inherit">
          🔄 Reorder
        </button>
      </div>`).join('');
  } catch(e) {
    list.innerHTML = '<p style="color:var(--muted);padding:1rem">Error loading orders</p>';
  }
}

async function showTracker(orderId) {
  document.querySelectorAll('.order-hist-card').forEach(c => c.classList.remove('active'));
  event?.currentTarget?.classList?.add?.('active');
  // find and mark active
  document.querySelectorAll('.order-hist-card').forEach(c => {
    if(c.getAttribute('onclick')?.includes(orderId)) c.classList.add('active');
  });

  const panel = document.getElementById('tracker-panel');
  try {
    const r = await fetch(`/order/${orderId}`);
    const o = await r.json();
    const curIdx = STEPS.indexOf(o.order_status);

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.5rem">
        <div>
          <div style="font-size:0.72rem;color:var(--muted)">Order #${o.order_id} · ${o.payment_method}</div>
          <div style="font-weight:700;font-size:1.1rem;color:var(--saffron)">${fmtPrice(o.total_price)}</div>
        </div>
        <span class="status-badge ${statusClass(o.order_status)}">${o.order_status}</span>
      </div>

      <div class="track-steps">
        ${STEPS.map((s,i) => `
          <div class="track-step ${i < curIdx ? 'done' : ''} ${i === curIdx ? 'active' : ''}">
            <div class="step-dot">${i < curIdx ? '✓' : i === curIdx ? '●' : i+1}</div>
            <div class="step-info">
              <h4>${s}</h4>
              <p>${STEP_DESCS[s]}</p>
            </div>
          </div>`).join('')}
      </div>

      <div style="margin-top:1.5rem;background:var(--bg);border-radius:14px;padding:1.2rem">
        <div style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.8rem">Items Ordered</div>
        ${(o.items||[]).map(i => `
          <div style="display:flex;justify-content:space-between;font-size:0.83rem;margin-bottom:0.4rem;color:var(--muted)">
            <span>${i.name} (${i.size}) × ${i.quantity}</span>
            <span>${fmtPrice(i.price * i.quantity)}</span>
          </div>`).join('')}
        ${o.delivery_address ? `<div style="margin-top:0.8rem;font-size:0.78rem;color:var(--muted);border-top:1px solid var(--border);padding-top:0.8rem">
          📍 ${o.delivery_address}</div>` : ''}
      </div>`;
  } catch(e) {
    panel.innerHTML = '<p style="color:var(--muted);padding:2rem">Error loading order details</p>';
  }
}
window.showTracker = showTracker;

async function reorder(orderId) {
  const r = await fetch(`/order/reorder/${orderId}`, {method:'POST'});
  const d = await r.json();
  if(d.success) { toast('Items added to cart!','🛒'); refreshCartCount(); }
}
window.reorder = reorder;

if(document.getElementById('orders-list')) loadOrders();
