/* ===== Panel Admin (autónomo): login, listado, moderación — con rompe-caché + JSONP + fallback row ===== */
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
  const esc  = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm = s => String(s || '').toLowerCase();

  // Rompe-caché
  function bust(url) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_=${Date.now()}`;
  }

  // JSON/JSONP con fallback (evita CORS y caches tercos)
  async function getJSON(url) {
    const busted = bust(url);
    try {
      const r = await fetch(busted, { method: 'GET', cache: 'no-store' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (_) { /* sigue a JSONP */ }
    } catch (_) { /* sigue a JSONP */ }
    return jsonp(busted);
  }

  function jsonp(urlWithBust) {
    return new Promise(resolve => {
      const cb  = `__admin_cb_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
      const sep = urlWithBust.includes('?') ? '&' : '?';
      const src = `${urlWithBust}${sep}callback=${cb}`;
      const s   = document.createElement('script');

      window[cb] = (data) => { cleanup(); resolve(data); };

      s.src = src; s.async = true; s.defer = true;
      s.onerror = () => { cleanup(); resolve(null); };
      document.head.appendChild(s);

      const to = setTimeout(() => { cleanup(); resolve(null); }, 12000);

      function cleanup() {
        try { delete window[cb]; } catch {}
        try { document.head.removeChild(s); } catch {}
        clearTimeout(to);
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
      Session.save(j.token || 'ok'); // token opcional
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
    id:     it.id || it.ID || it.Id || '',
    ts:     it.timestamp || it.ts || it.fecha || '',
    name:   it.nombre || it.name || 'Anónimo',
    mail:   it.email || it.mail || '',
    text:   it.comentario || it.text || '',
    estado: (it.estado || it.status || 'pendiente').toLowerCase(),
    row:    it.rowIndex || it.row || null   // <-- usamos esto para moderar por fila
  });

  // --- Carga de comentarios (con filtro y búsqueda local) ---
  async function loadComments(filter = 'pendiente', query = '') {
    setLoading(true);
    try {
      // 1) Intento principal
      let url = `${API}?${qparam({ p: EP.comments, estado: filter === 'todos' ? '' : filter })}`;
      let j   = await getJSON(url);

      // 2) Fallback
      if (!j || j.ok === false || !Array.isArray(j.items || j.data)) {
        url = `${API}?${qparam({ p: EP.peek, estado: filter === 'todos' ? '' : filter, limit: 500 })}`;
        j   = await getJSON(url);
      }

      const raw = ((j?.items || j?.data) || []).map(normalizeItem);

      // Búsqueda local
      const qn = norm(query.trim());
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
            <button class="btn btn-approve" data-id="${esc(it.id)}" data-row="${it.row ?? ''}">Aprobar</button>
            <button class="btn btn-reject"  data-id="${esc(it.id)}" data-row="${it.row ?? ''}">Rechazar</button>
          </div>
        </td>
      `;
      rowsEl.appendChild(tr);
    }

    // Bind acciones (ahora pasan también la fila)
    rowsEl.querySelectorAll('.btn-approve').forEach(b =>
      b.addEventListener('click', async () => {
        const id  = b.getAttribute('data-id') || '';
        const row = Number(b.getAttribute('data-row')) || null;
        b.disabled = true;
        try {
          await moderate(id, 'aprobado', row);
          await loadComments(current.filter, current.q);
        } catch (e) {
          alert(e?.message || 'No se pudo actualizar el estado');
        } finally {
          b.disabled = false;
        }
      })
    );
    rowsEl.querySelectorAll('.btn-reject').forEach(b =>
      b.addEventListener('click', async () => {
        const id  = b.getAttribute('data-id') || '';
        const row = Number(b.getAttribute('data-row')) || null;
        b.disabled = true;
        try {
          await moderate(id, 'rechazado', row);
          await loadComments(current.filter, current.q);
        } catch (e) {
          alert(e?.message || 'No se pudo actualizar el estado');
        } finally {
          b.disabled = false;
        }
      })
    );
  }

  function badge(s) {
    const v = String(s || '').toLowerCase();
    if (v.startsWith('apro')) return `<span class="badge badge-ok">Aprobado</span>`;
    if (v.startsWith('pen'))  return `<span class="badge badge-warn">Pendiente</span>`;
    if (v.startsWith('rech')) return `<span class="badge badge-no">Rechazado</span>`;
    return `<span class="badge">${esc(s)}</span>`;
  }

  // --- Moderación (GET para evitar preflight; manda id y row; con fallback a 'estado') ---
  async function moderate(id, estado, row) {
    if (!id && !row) throw new Error('Falta identificador (id/row)');

    // Intento #1: status=...
    let params = { p: EP.update, status: estado };
    if (id)  params.id  = id;
    if (row) params.row = row;

    let j = await getJSON(`${API}?${qparam(params)}`);
    if (j?.ok) return j;

    // Intento #2: estado=... (por si el backend espera ese nombre)
    params = { p: EP.update, estado };
    if (id)  params.id  = id;
    if (row) params.row = row;

    j = await getJSON(`${API}?${qparam(params)}`);
    if (j?.ok) return j;

    throw new Error(j?.message || 'El backend no aceptó la operación');
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
    const fd   = new FormData(loginForm);
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
