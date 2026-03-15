/* ═══ AUTH JS ═══ */
function switchTab(t) {
  document.getElementById('tab-login').classList.toggle('active', t==='login');
  document.getElementById('tab-reg').classList.toggle('active', t==='reg');
  document.getElementById('login-form').style.display = t==='login' ? 'block' : 'none';
  document.getElementById('reg-form').style.display = t==='reg' ? 'block' : 'none';
  document.getElementById('auth-err').textContent = '';
}
window.switchTab = switchTab;

async function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  const err   = document.getElementById('auth-err');
  err.textContent = '';
  if(!email||!pass){err.textContent='Please fill all fields';return;}
  try {
    const r = await fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
    const d = await r.json();
    if(d.success){ toast(`Welcome back, ${d.user.name}! 👋`,'🎉'); setTimeout(()=>window.location.href='/',1200); }
    else err.textContent = d.error || 'Login failed';
  } catch(e){ err.textContent='Network error'; }
}
window.doLogin = doLogin;

async function doRegister() {
  const name  = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const phone = document.getElementById('r-phone').value.trim();
  const pass  = document.getElementById('r-pass').value;
  const err   = document.getElementById('auth-err');
  err.textContent = '';
  if(!name||!email||!pass){err.textContent='Please fill required fields';return;}
  if(pass.length<6){err.textContent='Password must be at least 6 characters';return;}
  try {
    const r = await fetch('/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,phone,password:pass})});
    const d = await r.json();
    if(d.success){ toast(`Welcome, ${d.user.name}! 🎉`,'🎊'); setTimeout(()=>window.location.href='/',1200); }
    else err.textContent = d.error || 'Registration failed';
  } catch(e){ err.textContent='Network error'; }
}
window.doRegister = doRegister;

document.addEventListener('keydown', e => {
  if(e.key!=='Enter') return;
  const lf = document.getElementById('login-form');
  if(lf && lf.style.display!=='none') doLogin(); else doRegister();
});
