/* ═══ AUTH JS ═══ */
const OAUTH_ERR =
{
  state: 'Sign-in was cancelled or expired. Try again.',
  no_code: 'Google did not return an authorization code. Try again.',
  token_exchange: 'Could not complete sign-in with Google. Try again.',
  token_invalid: 'Google sign-in token was invalid. Try again.',
  unverified: 'Your Google email must be verified before you can use this site.',
  email_missing: 'Google did not provide an email. Use another Google account.',
  account_conflict: 'This email is already linked to a different Google account.',
  not_configured: 'Google sign-in is not set up on the server yet.',
};

function switchTab(t) {
  document.getElementById('tab-login').classList.toggle('active', t === 'login');
  document.getElementById('tab-reg').classList.toggle('active', t === 'reg');
  document.getElementById('login-form').style.display = t === 'login' ? 'block' : 'none';
  document.getElementById('reg-form').style.display = t === 'reg' ? 'block' : 'none';
  document.getElementById('auth-err').textContent = '';
}
window.switchTab = switchTab;

function showOAuthErrors() {
  const err = document.getElementById('auth-err');
  const q = new URLSearchParams(window.location.search).get('err');
  if (q && OAUTH_ERR[q]) {
    err.textContent = OAUTH_ERR[q];
    history.replaceState({}, '', window.location.pathname);
  }
}

async function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  const err   = document.getElementById('auth-err');
  err.textContent = '';
  if (!email || !pass) { err.textContent = 'Please fill all fields'; return; }
  try {
    const r = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
    const d = await r.json();
    if (d.success && d.is_admin) { toast('Welcome back!', '🎉'); setTimeout(() => window.location.href = '/admin-dashboard', 800); }
    else if (d.success) { toast(`Welcome back, ${d.user.name}! 👋`, '🎉'); setTimeout(() => window.location.href = '/', 1200); }
    else err.textContent = d.error || 'Login failed';
  } catch (e) { err.textContent = 'Network error'; }
}
window.doLogin = doLogin;

async function doRegister() {
  const name = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const password = document.getElementById('r-pass').value;
  const err = document.getElementById('auth-err');
  err.textContent = '';
  if (!name || !email || !password) { err.textContent = 'Please fill all fields'; return; }
  if (password.length < 8) { err.textContent = 'Password must be at least 8 characters'; return; }
  try {
    const r = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const d = await r.json();
    if (d.success) {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'sign_up', { method: 'email' });
      }
      toast('Account created!', '🎉');
      setTimeout(() => window.location.href = '/', 900);
    } else err.textContent = d.error || 'Signup failed';
  } catch (e) { err.textContent = 'Network error'; }
}
window.doRegister = doRegister;

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const lf = document.getElementById('login-form');
  if (lf && lf.style.display !== 'none') doLogin();
  else if (document.getElementById('reg-form')) doRegister();
});

document.addEventListener('DOMContentLoaded', showOAuthErrors);
