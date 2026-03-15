/* ═══ CART JS ═══ */
async function loadCart() {
  const layout = document.getElementById('cart-layout');
  const emptyEl = document.getElementById('empty-cart');
  const itemsEl = document.getElementById('cart-items');

  try {
    const r = await fetch('/cart');
    if (r.status === 401) {
      if(itemsEl) itemsEl.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--muted)">
        <p>Please <a href="/auth-page" style="color:var(--saffron)">login</a> to view your cart</p></div>`;
      return;
    }
    const d = await r.json();

    if (!d.items || !d.items.length) {
      if(layout) layout.style.display = 'none';
      if(emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if(layout) layout.style.display = 'grid';
    if(emptyEl) emptyEl.style.display = 'none';

    itemsEl.innerHTML = d.items.map(item => `
      <div class="cart-item" id="ci-${item.cart_id}">
        <img class="cart-item-img ${filterClass(item.filter_type)}"
             src="${item.image_url || '/static/images/kushka.jpg'}"
             onerror="this.src='/static/images/kushka.jpg'">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-size">${item.size === 'half' ? '½ Half' : 'Full'}</div>
          <div class="cart-item-price">${fmtPrice(item.unit_price)} each</div>
          <div class="qty-row">
            <button class="qty-btn" onclick="changeQty(${item.cart_id}, ${item.quantity-1})">−</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${item.cart_id}, ${item.quantity+1})">+</button>
          </div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;min-height:80px">
          <button class="del-btn" onclick="removeItem(${item.cart_id})">🗑️</button>
          <span style="font-weight:700;color:var(--saffron)">${fmtPrice(item.subtotal)}</span>
        </div>
      </div>`).join('');

    // Summary
    const sumRows = document.getElementById('sum-rows');
    const sumTotal = document.getElementById('sum-total');
    const loyalEl = document.getElementById('loyalty-earn');
    if(sumRows) sumRows.innerHTML = d.items.map(i => `
      <div class="sum-row"><span>${i.name} (${i.size}) × ${i.quantity}</span><span>${fmtPrice(i.subtotal)}</span></div>`).join('');
    if(sumTotal) sumTotal.textContent = fmtPrice(d.total);
    if(loyalEl) loyalEl.textContent = `⭐ You'll earn ${Math.floor(d.total/10)} loyalty points`;
  } catch(e) {
    if(itemsEl) itemsEl.innerHTML = '<p style="color:var(--muted);padding:2rem">Error loading cart</p>';
  }
}

async function changeQty(cartId, newQty) {
  await fetch('/cart/update', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ cart_id: cartId, quantity: newQty }) });
  loadCart(); refreshCartCount();
}

async function removeItem(cartId) {
  const el = document.getElementById('ci-' + cartId);
  if(el) { el.style.transition = 'all 0.3s'; el.style.opacity='0'; el.style.transform='translateX(20px)'; }
  setTimeout(async () => {
    await fetch('/cart/remove', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ cart_id: cartId }) });
    loadCart(); refreshCartCount();
  }, 300);
}

loadCart();
