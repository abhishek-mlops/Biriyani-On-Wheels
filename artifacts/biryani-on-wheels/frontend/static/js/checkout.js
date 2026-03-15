/* ═══ CHECKOUT JS ═══ */
async function loadCheckout() {
  try {
    const r = await fetch('/cart');
    if (r.status === 401) { window.location.href = '/auth-page'; return; }
    const d = await r.json();
    const itemsEl = document.getElementById('co-items');
    const totalEl = document.getElementById('co-total');
    if(itemsEl) itemsEl.innerHTML = (d.items||[]).map(i => `
      <div class="sum-row"><span>${i.name} (${i.size}) × ${i.quantity}</span><span>${fmtPrice(i.subtotal)}</span></div>`).join('');
    if(totalEl) totalEl.textContent = fmtPrice(d.total||0);
  } catch(e){}
}

async function placeOrder() {
  const btn = document.getElementById('order-btn');
  const addr = document.getElementById('addr')?.value?.trim();
  const payEl = document.querySelector('input[name="pay"]:checked');
  const pay = payEl ? payEl.value : 'Cash on Delivery';

  if (!addr) { toast('Please enter a delivery address', '⚠️'); return; }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-sm" style="display:inline-block;margin-right:8px"></div> Placing Order...';

  try {
    const r = await fetch('/order', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ delivery_address: addr, payment_method: pay }) });
    const d = await r.json();
    if (d.success) {
      toast(`Order #${d.order_id} placed! +${d.points_earned} points 🎉`, '🎉', 5000);
      setTimeout(() => window.location.href = '/tracking-page', 2000);
    } else {
      toast(d.error || 'Failed to place order', '❌');
      btn.disabled = false;
      btn.innerHTML = 'Place Order 🚀';
    }
  } catch(e) {
    toast('Error placing order', '❌');
    btn.disabled = false;
    btn.innerHTML = 'Place Order 🚀';
  }
}
window.placeOrder = placeOrder;

// Payment active state
document.querySelectorAll('.pay-opt').forEach(o => {
  o.addEventListener('click', () => {
    document.querySelectorAll('.pay-card').forEach(c => c.style.borderColor = '');
  });
});

loadCheckout();
