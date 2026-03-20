/* ═══ HOME JS — Biryani on Wheels ═══ */

function buildCard(item) {
  const fc = filterClass(item.filter_type);
  const imgSrc = item.image_url || '/static/images/kushka.jpg';

  // Price display — half/full or single
  let priceHtml = '';
  if (item.price_half && item.price_full) {
    priceHtml = `
      <div class="card-price">
        <span class="price-full">${fmtPrice(item.price_full)}</span>
        <span class="price-half">Half: ${fmtPrice(item.price_half)}</span>
      </div>`;
  } else {
    priceHtml = `<div class="card-price"><span class="price-only">${fmtPrice(item.price_full || item.price_half)}</span></div>`;
  }

  const hasBadge = item.badge && item.badge.trim();
  const popularBadge = item.is_popular ? '<span class="badge-item badge-popular">🔥 Most Ordered</span>' : '';
  const chefBadge    = item.is_chef_special ? '<span class="badge-item badge-chef">👨‍🍳 Chef Special</span>' : '';
  const customBadge  = hasBadge && !item.is_popular && !item.is_chef_special ? `<span class="badge-item badge-custom">${item.badge}</span>` : '';

  const filterTag = item.filter_type && item.filter_type !== 'none'
    ? `<span class="filter-tag">${item.filter_type}</span>` : '';

  const popularClass = item.is_popular ? 'card-glow featured' : '';

  // Size selector for items with half/full
  const addSection = item.price_half && item.price_full
    ? `<div style="display:flex;flex-direction:column;gap:0.5rem;align-items:flex-end">
        <div class="size-btns">
          <button class="size-btn active" data-size="half" onclick="selectSize(this,${item.item_id})" data-price-half="${item.price_half}" data-price-full="${item.price_full}">H</button>
          <button class="size-btn" data-size="full" onclick="selectSize(this,${item.item_id})" data-price-half="${item.price_half}" data-price-full="${item.price_full}">F</button>
        </div>
        <button class="add-btn" id="addbtn-${item.item_id}" onclick="addToCart(${item.item_id},'${item.name.replace(/'/g,"\\'")}')">+ Cart</button>
      </div>`
    : `<button class="add-btn" id="addbtn-${item.item_id}" onclick="addToCart(${item.item_id},'${item.name.replace(/'/g,"\\'")}')">+ Cart</button>`;

  return `
    <div class="dish-card ${popularClass}" id="card-${item.item_id}" data-item-id="${item.item_id}" data-price-half="${item.price_half || 0}" data-price-full="${item.price_full || 0}">
      <div class="card-img">
        <img src="${imgSrc}" alt="${item.name}" class="${fc}" id="img-${item.item_id}"
             onerror="this.src='/static/images/kushka.jpg'">
        <div class="card-badges">${popularBadge}${chefBadge}${customBadge}</div>
        ${filterTag}
      </div>
      <div class="card-body">
        <div class="card-cat">${item.category}</div>
        <div class="card-name">${item.name}</div>
        <div class="card-desc">${item.description || ''}</div>
        <div class="card-footer">
          <div class="card-price" id="price-${item.item_id}">
            ${item.price_half && item.price_full ? `<span class="price-half">Half: ${fmtPrice(item.price_half)}</span>` : `<span class="price-only">${fmtPrice(item.price_full || item.price_half)}</span>`}
          </div>
          ${addSection}
        </div>
      </div>
    </div>`;
}
window.buildCard = buildCard;

// Track selected size per item
const selectedSizes = {};
function selectSize(btn, itemId) {
  const parent = btn.closest('.size-btns');
  parent.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedSizes[itemId] = btn.dataset.size;
  
  // Update price display
  const priceEl = document.getElementById(`price-${itemId}`);
  if (priceEl) {
    const size = btn.dataset.size;
    const priceHalf = parseFloat(btn.dataset.priceHalf) || 0;
    const priceFull = parseFloat(btn.dataset.priceFull) || 0;
    
    if (size === 'half') {
      priceEl.innerHTML = `<span class="price-half">Half: ${fmtPrice(priceHalf)}</span>`;
    } else {
      priceEl.innerHTML = `<span class="price-full">${fmtPrice(priceFull)}</span>`;
    }
  }
}
window.selectSize = selectSize;

async function addToCart(itemId, itemName) {
  if (!window._user) {
    toast('Please login to add items!', '🔐');
    setTimeout(() => window.location.href = '/auth-page', 1400);
    return;
  }
  const size = selectedSizes[itemId] || 'half';
  try {
    const r = await fetch('/cart/add', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ item_id: itemId, quantity: 1, size })
    });
    const d = await r.json();
    if (d.success) {
      const imgEl = document.getElementById('img-' + itemId);
      flyToCart(imgEl, itemName);
      document.getElementById('nav-cart-count').textContent = d.cart_count;
    } else {
      toast(d.error || 'Error adding to cart', '❌');
    }
  } catch (e) {
    toast('Failed to add to cart', '❌');
  }
}
window.addToCart = addToCart;

// Load popular dishes
async function loadPopular() {
  const grid = document.getElementById('popular-grid');
  if (!grid) return;
  try {
    const r = await fetch('/menu');
    const items = await r.json();
    const popular = items.filter(i => i.is_popular);
    if (!popular.length) {
      grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:2rem">No items available yet</p>';
      return;
    }
    grid.innerHTML = popular.map(buildCard).join('');
    grid.querySelectorAll('.dish-card').forEach((c, i) => {
      c.style.opacity = '0'; c.style.transform = 'translateY(25px)';
      setTimeout(() => {
        c.style.transition = 'all 0.6s cubic-bezier(0.16,1,0.3,1)';
        c.style.opacity = '1'; c.style.transform = 'translateY(0)';
      }, i * 90);
    });
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">Could not load items</p>';
  }
}

// Hero open status
async function updateHeroStatus() {
  try {
    const r = await fetch('/restaurant/status');
    const d = await r.json();
    const el = document.querySelector('.hero-hours');
    if (el && !d.is_open) {
      el.style.background = 'rgba(192,57,43,0.1)';
      el.style.borderColor = 'rgba(192,57,43,0.2)';
      el.style.color = '#e74c3c';
      el.innerHTML = '<span>🕔</span> Closed now · Opens at 5:00 PM';
    }
  } catch(e) {}
}

loadPopular();
updateHeroStatus();
