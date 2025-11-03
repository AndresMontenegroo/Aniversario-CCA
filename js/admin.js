/* ===== Panel Admin (autónomo): login, listado, moderación ===== */
(function () {
  // --- Config ---
  const API = window.CONFIG?.API_URL || '';
  const STORAGE_KEY = window.CONFIG?.STORAGE_KEY || 'mural_token';
  const EP = {
    health: 'health',
    login: 'login',
    me: 'me',
    comments: 'comments',
    peek: 'peek',
    update: 'updateStatus'
  };
  if (!API) {
    console.error('Falta CONFIG.API_URL. Define en js/config.js');
    return;
  }

  // --- Utils ---
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm = s => String(s || '').toLowerCase();

  // JSON/JSONP con fallback (para evitar CORS cuando no usas proxy)
  async function getJSON(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (_) {}
    } catch (_) {}
    return jsonp(url);
  }
  function jsonp(url) {
    return new Promise(resolve => {
      const cb = `__admin_cb_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
      const sep = url.includes('?') ? '&' : '?';
      const src = `${url}${sep}callback=${cb}`;
      const s = document.createElement('script');
      const to = setTimeout(cleanup, 12000, null);

      window[cb] = data => { cleanup(data); };
      s.src = src; s.async = true; s.defer = true;
      s.onerror = () => cleanup(null);
      document.head.appendChild(s);

      function cleanup(data) {
        clearTimeout(to);
        try { delete window[cb]; } catch {}
        try { document.head.removeChild(s); } catch {}
        resolve(data);
      }
    });
  }
  const qparam = obj =>
    Object.entries(obj)
      .filter(([,v]) => v !== undefined && v !== null && v !== '')
      .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');

  // --- Estado simple de sesión ---
  const Session = {
    token: null,
    load()  { this.token = localStorage.getItem(STORAGE_KEY) || null; return this.token; },
    save(t) { this.token = t || null; if (t) localStorage.setItem(STORAGE_KEY, t); else localStorage.removeItem(STORAGE_KEY); },
    logged(){ return !!this.token; }
  };
  Session.load();

  // --- DOM refs ---
  const loginView = document.getElementById('loginView');
  const appView   = document.getElementById('appView');
  const loginForm = document.getElementById('loginForm');
  const loginErr  = document.getElementById('loginError');
  const btnLogout = document.getElementById('btnLogout');

  const chips     = document.querySelectorAll('.chip');
  const qInput    = document.getElementById('q');

  const rowsEl    = document.getElementById('rows');
  const emptyEl   = document.getElementById('empty');
  const loadingEl = document.getElementById('loading');

  const statPend  = document.getElementById('statPend');
  const statApr   = document.getElementById('statApr');
  const statTot   = document.getElementById('statTot');

  function setView(which) {
    if (which === 'login') {
      loginView?.classList.remove('hidden');
      appView?.classList.add('hidden');
    } else {
      appView?.classList.remove('hidden');
      loginView?.classList.add('hidden');
    }
  }
  function setLoading(s) { loadingEl?.classList.toggle('hidden', !s); }

  // --- Login / Logout ---
  async function login(user, pass) {
    const url = `${API}?${qparam({ p: EP.login, user, pass })}`;
    const j = await getJSON(url);
    if (j?.ok && j.success) {
      Session.save(j.token || 'ok'); // token simple del backend (o 'ok' si no viene)
      setView('app');
      return true;
    }
    throw new Error(j?.message || 'Credenciales inválidas');
  }
  function logout() {
    Session.save(null);
    setView('login');
  }

  // --- Normaliza item del backend a un formato único ---
  const normalizeItem = it => ({
    id:     it.id || it.ID || '',
    ts:     it.timestamp || it.ts || '',
    name:   it.nombre || it.name || 'Anónimo',
    mail:   it.email || it.mail || '',
    text:   it.comentario || it.text || '',
    estado: (it.estado || it.status || 'pendiente').toLowerCase()
  });

  // --- Carga de comentarios (con filtro y búsqueda local) ---
  async function loadComments(filter = 'pendiente', query = '') {
    setLoading(true);
    try {
      // 1) Intento principal
      let url = `${API}?${qparam({ p: EP.comments, estado: filter === 'todos' ? '' : filter })}`;
      let j = await getJSON(url);

      // 2) Fallback
      if (!j || j.ok === false || !Array.isArray(j.items)) {
        url = `${API}?${qparam({ p: EP.peek, estado: filter === 'todos' ? '' : filter, limit: 500 })}`;
        j = await getJSON(url);
      }

      const raw = (j?.items || []).map(normalizeItem);

      // Aplicar búsqueda local
      const qn = norm(query);
      const items = qn
        ? raw.filter(x =>
            norm(x.name).includes(qn) ||
            norm(x.mail).includes(qn) ||
            norm(x.text).includes(qn))
        : raw;

      // Stats
      statTot.textContent  = String(items.length);
      statPend.textContent = String(items.filter(x => x.estado.startsWith('pen')).length);
      statApr.textContent  = String(items.filter(x => x.estado.startsWith('apro')).length);

      renderRows(items);
    } catch (e) {
      console.error('Error cargando comentarios:', e);
      renderRows([]);
    } finally {
      setLoading(false);
    }
  }

  function renderRows(items) {
    rowsEl.innerHTML = '';
    if (!items.length) { emptyEl?.classList.remove('hidden'); return; }
    emptyEl?.classList.add('hidden');

    for (const it of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(it.ts)}</td>
        <td>${esc(it.name)}</td>
        <td>${esc(it.mail)}</td>
        <td>${esc(it.text)}</td>
        <td>${badge(it.estado)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-approve" data-id="${esc(it.id)}">Aprobar</button>
            <button class="btn btn-reject"  data-id="${esc(it.id)}">Rechazar</button>
          </div>
        </td>
      `;
      rowsEl.appendChild(tr);
    }

    // Bind acciones
    rowsEl.querySelectorAll('.btn-approve').forEach(b =>
      b.addEventListener('click', () => moderate(b.getAttribute('data-id'), 'aprobado'))
    );
    rowsEl.querySelectorAll('.btn-reject').forEach(b =>
      b.addEventListener('click', () => moderate(b.getAttribute('data-id'), 'rechazado'))
    );
  }

  function badge(s) {
    const v = String(s || '').toLowerCase();
    if (v.startsWith('apro')) return `<span class="badge badge-ok">Aprobado</span>`;
    if (v.startsWith('pen'))  return `<span class="badge badge-warn">Pendiente</span>`;
    if (v.startsWith('rech')) return `<span class="badge badge-no">Rechazado</span>`;
    return `<span class="badge">${esc(s)}</span>`;
  }

  // --- Moderación (GET para evitar preflight; con JSONP fallback) ---
  async function moderate(id, estado) {
    if (!id) return;
    const url = `${API}?${qparam({ p: EP.update, id, status: estado })}`;
    const j = await getJSON(url);
    if (!j?.ok || j.success === false) {
      alert(j?.message || 'El backend no aceptó la operación');
      return;
    }
    // Recargar manteniendo filtro/búsqueda actuales
    await loadComments(current.filter, current.q);
  }

  // ----- UI wiring -----
  const current = { filter: 'pendiente', q: '' };

  // chips (filtros)
  chips.forEach(ch => {
    ch.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('chip-active'));
      ch.classList.add('chip-active');
      current.filter = ch.getAttribute('data-filter') || 'pendiente';
      loadComments(current.filter, current.q);
    });
  });

  // búsqueda con debounce
  let qTimer = null;
  qInput?.addEventListener('input', () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      current.q = qInput.value.trim();
      loadComments(current.filter, current.q);
    }, 250);
  });

  // login form
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErr?.classList.add('hidden');
    const fd = new FormData(loginForm);
    const user = fd.get('user')?.toString().trim();
    const pass = fd.get('pass')?.toString();
    try {
      await login(user, pass);
      await loadComments('pendiente', '');
    } catch (err) {
      loginErr.textContent = err?.message || 'No se pudo iniciar sesión';
      loginErr?.classList.remove('hidden');
    }
  });

  // logout
  btnLogout?.addEventListener('click', logout);

  // Vista inicial
  if (Session.logged()) {
    setView('app');
    loadComments('pendiente', '');
  } else {
    setView('login');
  }
})();
