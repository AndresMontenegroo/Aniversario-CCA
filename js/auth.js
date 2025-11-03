(function () {
  const { API_URL, endpoints, headers } = window.CONFIG;

  function url(p, qs = '') {
    const u = new URL(API_URL);
    u.searchParams.set('p', p);
    if (qs && typeof qs === 'object') {
      Object.entries(qs).forEach(([k,v]) => u.searchParams.set(k, v));
    }
    return u.toString();
  }

  function getToken(){ return localStorage.getItem('cca_admin_token') || ''; }
  function setToken(t){ localStorage.setItem('cca_admin_token', t || ''); }
  function clearToken(){ localStorage.removeItem('cca_admin_token'); }

  async function me() {
    const token = getToken();
    if (!token) return null;
    // Intento #1: p=me (POST)
    try {
      const r = await fetch(url(endpoints.me), { method:'POST', headers, body: JSON.stringify({ token }) });
      if (r.ok) { const j = await r.json(); if (j && j.ok) return j; }
    } catch(_) {}
    // Intento #2: p=me (GET)
    try {
      const r = await fetch(url(endpoints.me, { token }));
      if (r.ok) { const j = await r.json(); if (j && j.ok) return j; }
    } catch(_) {}
    return null;
  }

  async function login(user, pass) {
    // Intento #1: p=login (POST)
    try {
      const r = await fetch(url(endpoints.login), { method:'POST', headers, body: JSON.stringify({ user, pass }) });
      if (r.ok) {
        const j = await r.json();
        if (j && j.ok && j.token){ setToken(j.token); return j; }
      }
    } catch(_) {}
    // Intento #2: p=login (GET)
    const r2 = await fetch(url(endpoints.login, { user, pass }));
    if (r2.ok) {
      const j = await r2.json();
      if (j && j.ok && j.token){ setToken(j.token); return j; }
    }
    throw new Error('Usuario o contraseña incorrectos');
  }

  function logout(){ clearToken(); location.href = 'admin.html'; }

  async function requireAuth() {
    const ok = await me();
    const has = !!ok;
    document.getElementById('loginView')?.classList.toggle('hidden', has);
    document.getElementById('appView')?.classList.toggle('hidden', !has);
    return has;
  }

  window.Auth = { getToken, setToken, clearToken, login, me, logout, requireAuth, url, headers, endpoints };
})();
