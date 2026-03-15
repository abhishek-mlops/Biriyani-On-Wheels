/* ═══ BIRYANI ON WHEELS — Core JS ═══ */

// ── LOADING SCREEN ──────────────────────────────────────────
(function(){
  const bar = document.getElementById('load-bar');
  const pct = document.getElementById('load-pct');
  const scr = document.getElementById('loading-screen');
  let p = 0;
  const iv = setInterval(()=>{
    p += Math.random()*4+1.5;
    if(p >= 100){
      p = 100; clearInterval(iv);
      bar.style.width = '100%';
      pct.textContent = '100%';
      setTimeout(()=>{
        scr.style.transition = 'opacity 0.6s ease, visibility 0.6s';
        scr.style.opacity = '0'; scr.style.visibility = 'hidden';
        document.querySelectorAll('.hero-reveal').forEach((el,i)=>{
          setTimeout(()=>el.classList.add('in'), i*120);
        });
      }, 700);
    } else {
      bar.style.width = p+'%';
      pct.textContent = Math.floor(p)+'%';
    }
  }, 45);
})();

// ── PAGE TRANSITION ────────────────────────────────────────
function goTo(e, url){
  e.preventDefault();
  const t = document.getElementById('pg-transition');
  t.classList.add('active');
  setTimeout(()=>{ window.location.href = url; }, 380);
}
window.goTo = goTo;

// ── RESTAURANT STATUS ──────────────────────────────────────
async function checkStatus(){
  try{
    const r = await fetch('/restaurant/status');
    const d = await r.json();
    const el = document.getElementById('nav-status');
    const txt = document.getElementById('status-txt');
    if(el && txt){
      if(d.is_open){ el.classList.add('open'); txt.textContent = 'Open Now'; }
      else { el.classList.add('closed'); txt.textContent = 'Closed'; }
    }
  }catch(e){}
}
checkStatus();

// ── CART COUNT ─────────────────────────────────────────────
async function refreshCartCount(){
  try{
    const r = await fetch('/cart/count');
    const d = await r.json();
    const el = document.getElementById('nav-cart-count');
    if(el) el.textContent = d.count;
  }catch(e){}
}
refreshCartCount();
window.refreshCartCount = refreshCartCount;

// ── SESSION ────────────────────────────────────────────────
async function checkSession(){
  try{
    const r = await fetch('/me');
    const d = await r.json();
    const loginLink = document.getElementById('drop-login');
    const logoutBtn = document.getElementById('drop-logout');
    const dropName  = document.getElementById('drop-name');
    if(d.logged_in){
      if(loginLink) loginLink.style.display = 'none';
      if(logoutBtn) logoutBtn.style.display = 'block';
      if(dropName) dropName.textContent = '👋 '+d.user.name;
      window._user = d.user;
    } else {
      if(loginLink) loginLink.style.display = 'block';
      if(logoutBtn) logoutBtn.style.display = 'none';
      window._user = null;
    }
  }catch(e){}
}
checkSession();

async function doLogout(){
  await fetch('/logout',{method:'POST'});
  window.location.href = '/';
}
window.doLogout = doLogout;

// ── USER DROPDOWN ──────────────────────────────────────────
const userBtn = document.getElementById('user-btn');
const navUser = document.getElementById('nav-user');
if(userBtn){ 
  userBtn.addEventListener('click',e=>{e.stopPropagation();navUser.classList.toggle('open');});
  document.addEventListener('click',()=>navUser.classList.remove('open'));
}

// ── HAMBURGER ──────────────────────────────────────────────
const ham = document.getElementById('hamburger');
const mob = document.getElementById('mobile-nav');
if(ham) ham.addEventListener('click',()=>mob.classList.toggle('show'));

// ── TOAST ──────────────────────────────────────────────────
function toast(msg, icon='✅', ms=3200){
  const el = document.getElementById('bow-toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = icon;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'), ms);
}
window.toast = toast;

// ── FLY TO CART ─────────────────────────────────────────────
function flyToCart(imgEl, name){
  const cart = document.querySelector('.nav-cart');
  if(!imgEl||!cart) return;
  const ir = imgEl.getBoundingClientRect();
  const cr = cart.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'food-fly';
  fly.style.cssText = `position:fixed;width:58px;height:58px;border-radius:50%;overflow:hidden;z-index:9999;pointer-events:none;
    top:${ir.top+ir.height/2-29}px;left:${ir.left+ir.width/2-29}px;
    transition:all 0.85s cubic-bezier(0.76,0,0.24,1);`;
  const img = document.createElement('img');
  img.src = imgEl.src; img.style.cssText='width:100%;height:100%;object-fit:cover;';
  fly.appendChild(img); document.body.appendChild(fly);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    fly.style.top  = `${cr.top+cr.height/2-14}px`;
    fly.style.left = `${cr.left+cr.width/2-14}px`;
    fly.style.width='28px'; fly.style.height='28px'; fly.style.opacity='0.4';
  }));
  setTimeout(()=>{
    fly.remove();
    cart.classList.add('shake');
    setTimeout(()=>cart.classList.remove('shake'), 400);
    refreshCartCount();
    toast(`${name} added to cart!`,'🛒');
  }, 850);
}
window.flyToCart = flyToCart;

// ── FILTER CLASS HELPER ─────────────────────────────────────
function filterClass(ft){
  if(!ft||ft==='none') return '';
  return 'f-'+ft;
}
window.filterClass = filterClass;

// ── STATUS CLASS ────────────────────────────────────────────
function statusClass(s){
  const m={'Order Received':'s-received','Preparing':'s-preparing','Ready':'s-ready','Out for Delivery':'s-delivery','Delivered':'s-delivered'};
  return m[s]||'s-received';
}
window.statusClass = statusClass;

// ── SCROLL REVEAL ───────────────────────────────────────────
const revealObs = new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.style.opacity='1'; e.target.style.transform='translateY(0)'; } });
},{threshold:0.1});
document.querySelectorAll('.step-card').forEach(el=>revealObs.observe(el));

// ── FORMAT PRICE ────────────────────────────────────────────
function fmtPrice(p){ return p ? '₹'+Number(p).toFixed(0) : '—'; }
window.fmtPrice = fmtPrice;
