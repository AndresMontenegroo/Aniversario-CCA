(async function () {
  const hasAuth = await window.Auth.requireAuth();
  const btnLogout = document.getElementById('btnLogout');
  btnLogout?.addEventListener('click', window.Auth.logout);

  // ----- Login -----
  const loginForm  = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const fd = new FormData(loginForm);
    try {
      await window.Auth.login(fd.get('user')?.toString().trim(), fd.get('pass')?.toString());
      await window.Auth.requireAuth();
      await load('pendiente');
    } catch (err) {
      loginError.textContent = err?.message || 'No se pudo iniciar sesión';
      loginError.classList.remove('hidden');
    }
  });

  if (!hasAuth) return; // si no está autenticado, se queda en login

  // ----- UI: filtros y búsqueda -----
  let state = { filter: 'pendiente', q: '' };
  const chips = document.querySelectorAll('.chip');
  chips.forEach(ch => ch.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('chip-active'));
    ch.classList.add('chip-active');
    state.filter = ch.getAttribute('data-filter');
    load(state.filter, state.q);
  }));

  const q = document.getElementById('q');
  let qTimer = null;
  q?.addEventListener('input', () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      state.q = q.value.trim();
      load(state.filter, state.q);
    }, 250);
  });

  // ----- Datos -----
  const rowsEl = document.getElementById('rows');
  const emptyEl = document.getElementById('empty');
  const loadEl  = document.getElementById('loading');

  const statPend = document.getElementById('statPend');
  const statApr  = document.getElementById('statApr');
  const statTot  = document.getElementById('statTot');

  function showLoading(s){ loadEl.classList.toggle('hidden', !s); }

  function renderRows(items){
    rowsEl.innerHTML = '';
    if (!items?.length){ emptyEl.classList.remove('hidden'); return; }
    emptyEl.classList.add('hidden');

    for (const it of items){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHTML(it.ts || it.timestamp || '')}</td>
        <td>${escapeHTML(it.name || it.nombre || '')}</td>
        <td>${escapeHTML(it.mail || it.email || '')}</td>
        <td>${escapeHTML(it.text || it.comentario || '')}</td>
        <td>${badge(it.estado || it.status || it.state)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-approve" data-act="ok"  data-id="${it.id || ''}">Aprobar</button>
            <button class="btn btn-reject"  data-act="no"  data-id="${it.id || ''}">Rechazar</button>
          </div>
        </td>`;
      rowsEl.appendChild(tr);
    }

    // acciones
    rowsEl.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act'); // ok|no
        if (!id) return;
        btn.disabled = true;
        try{
          await moderate(id, act === 'ok' ? 'aprobado' : 'rechazado');
          await load(state.filter, state.q);
        }catch(err){
          alert(err?.message || 'No se pudo actualizar el estado');
        }finally{
          btn.disabled = false;
        }
      });
    });
  }

  function badge(s){
    if (String(s).toLowerCase().startsWith('apro')) return `<span class="badge badge-ok">Aprobado</span>`;
    if (String(s).toLowerCase().startsWith('pen'))  return `<span class="badge badge-warn">Pendiente</span>`;
    return `<span class="badge">${escapeHTML(s||'')}</span>`;
  }

  function escapeHTML(x){ return (x ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  async function load(filter = 'pendiente', query = ''){
    showLoading(true);
    try {
      const token = window.Auth.getToken();
      const { url, endpoints } = window.Auth;

      // Intento #1: p=comments con filtros
      let u = url(endpoints.list, { status: filter, q: query, token });
      let r = await fetch(u);
      let j = r.ok ? await r.json() : null;

      // Intento #2 (fallback): p=peek
      if (!j || j.ok === false || !Array.isArray(j.items || j.data)) {
        u = url(endpoints.peek, { limit: 500, status: filter, q: query, token });
        r = await fetch(u);
        j = r.ok ? await r.json() : null;
      }

      const arr = (j && (j.items || j.data)) || [];
      // stats
      statTot.textContent  = arr.length;
      statPend.textContent = arr.filter(x => /^pen/i.test(x.estado || x.status || '')).length;
      statApr.textContent  = arr.filter(x => /^apro/i.test(x.estado || x.status || '')).length;

      renderRows(arr);
    } finally {
      showLoading(false);
    }
  }

  async function moderate(id, estado /* 'aprobado' | 'rechazado' */){
    const token = window.Auth.getToken();
    const { url, endpoints, headers } = window.Auth;

    // Intento #1: p=moderate (POST)
    let r = await fetch(url(endpoints.moderate), {
      method:'POST', headers, body: JSON.stringify({ token, id, estado })
    });
    if (r.ok) {
      const j = await r.json();
      if (j && j.ok) return j;
    }
    // Intento #2 (fallback): p=approve con ok=1|0
    const ok = estado === 'aprobado' ? 1 : 0;
    r = await fetch(url(endpoints.approve, { token, id, ok }));
    if (r.ok) {
      const j = await r.json();
      if (j && j.ok) return j;
    }
    throw new Error('El backend no aceptó la operación');
  }

  // Carga inicial
  await load('pendiente');
})();
