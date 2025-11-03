/* ===== Mural: Trae aprobados desde Apps Script y renderiza notas ===== */

(function () {
  // --- Config ---
  const API = window.CONFIG?.API_URL || null;
  const EP  = window.CONFIG?.EP || { listA: 'comments', listB: 'peek' };
  const REFRESH_MS = window.CONFIG?.REFRESH_MS || window.CONFIG?.AUTO_REFRESH_INTERVAL || 30000;

  // --- Selectores ---
  const layer = document.getElementById('notes-layer');

  // Guardas básicas
  if (!layer) {
    console.error('No existe #notes-layer en el HTML del mural.');
    return;
  }
  if (!API) {
    console.error('Falta CONFIG.API_URL. Revisa js/config.js');
    return;
  }

  // Asegura que el layer sea relativo para posicionamiento absoluto de notas
  const cs = getComputedStyle(layer);
  if (cs.position === 'static') layer.style.position = 'relative';
  // Si la altura es muy baja, dámosle un mínimo para que quepan las notas
  if (layer.clientHeight < 300) layer.style.minHeight = '70vh';

  // --- Utilidades ---
  const rand = (min, max) => Math.random() * (max - min) + min;
  const esc  = (s) => String(s ?? '').replace(/[&<>"']/g, m => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
  const norm = (s) => String(s || '').toLowerCase().trim();

  function placeNoteRandom(bounds, noteEl) {
    const pad = 12;
    const maxX = Math.max(0, bounds.width  - noteEl.offsetWidth  - pad);
    const maxY = Math.max(0, bounds.height - noteEl.offsetHeight - pad);
    const x = rand(pad, maxX);
    const y = rand(pad, maxY);
    const rot = rand(-3, 3);

    noteEl.style.position = 'absolute';
    noteEl.style.left = `${x}px`;
    noteEl.style.top  = `${y}px`;
    // Soporta CSS var(--rot) si tu CSS la usa; sino, aplica transform directo
    noteEl.style.setProperty('--rot', `${rot}deg`);
    noteEl.style.transform = `rotate(${rot}deg)`;
  }

  // ===== JSON / JSONP helper (con fallback de CORS) =====
  async function safeJSON(url) {
    // 1) Intento normal con fetch
    try {
      const r = await fetch(url, { method: 'GET', cache: 'no-store' });
      // Si el servidor no da CORS, fetch puede “suceder” pero no deja leer body
      // En ese caso, intentar leer igual; si falla, caemos a JSONP.
      const txt = await r.text();
      try { return JSON.parse(txt); } catch (_) { /* sigue */ }
    } catch (_) { /* sigue */ }

    // 2) Fallback JSONP (Apps Script lo soporta si le pasas ?callback=)
    return jsonp(url);
  }

  function jsonp(url) {
    return new Promise((resolve) => {
      const cb = `__mural_cb_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
      const sep = url.includes('?') ? '&' : '?';
      const src = `${url}${sep}callback=${cb}`;

      window[cb] = (data) => {
        cleanup();
        resolve(data);
      };

      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      s.onerror = () => { cleanup(); resolve(null); };
      document.head.appendChild(s);

      // timeout de cortesía
      const to = setTimeout(() => { cleanup(); resolve(null); }, 12000);

      function cleanup() {
        try { delete window[cb]; } catch {}
        try { document.head.removeChild(s); } catch {}
        clearTimeout(to);
      }
    });
  }

  // --- API: trae aprobados ---
  async function fetchApproved() {
    // 1) Intento con ?p=comments&estado=aprobado
    const urlA = `${API}?p=${EP.listA}&estado=aprobado`;
    // 2) Fallback a ?p=peek&estado=aprobado&limit=500
    const urlB = `${API}?p=${EP.listB}&estado=aprobado&limit=500`;

    let res = await safeJSON(urlA);
    if (!isValidList(res)) res = await safeJSON(urlB);

    const items = normalizeItems(res);
    return items.filter(x => norm(x.estado) === 'aprobado');
  }

  function isValidList(r) {
    return r && (Array.isArray(r) || (r.ok && Array.isArray(r.items)));
  }

  // Normaliza campos comunes: id, ts, name/nombre, mail/email, text/comentario, estado
  function normalizeItems(res) {
    const arr = Array.isArray(res) ? res
              : Array.isArray(res?.items) ? res.items
              : [];
    return arr.map(it => ({
      id:     it.id || it.ID || it.Id || it.rowId || '',
      ts:     it.ts || it.timestamp || it.fecha || it.Fecha || '',
      name:   it.name || it.nombre || it.Nombre || 'Anónimo',
      mail:   it.mail || it.email || it.Email || '',
      text:   it.text || it.comentario || it.Comentario || '',
      estado: it.estado || it.status || ''
    }));
  }

  // --- Render ---
  function renderNotes(approvedList = []) {
    layer.innerHTML = '';

    if (!approvedList.length) return; // sin aprobados → no se muestran notas

    // Para distribuir: tomamos bounds después de vaciar el layer
    const bounds = layer.getBoundingClientRect();

    approvedList.forEach((item) => {
      const el = document.createElement('article');
      el.className = 'note';
      const safeText = esc(item.text).replace(/\n/g, '<br>');
      const author   = esc(item.name || 'Anónimo');

      el.innerHTML = `
        <div class="pin" aria-hidden="true"></div>
        <p>${safeText}</p>
        <span class="author">— ${author}</span>
      `;
      layer.appendChild(el);
      // una vez insertado, ya tiene dimensiones
      placeNoteRandom(bounds, el);
    });
  }

  // --- Ciclo ---
  async function refresh() {
    try {
      const items = await fetchApproved();
      renderNotes(items);
    } catch (e) {
      console.error('No se pudieron cargar aprobados del API', e);
    }
  }

  // Reposiciona las notas al redimensionar
  window.addEventListener('resize', () => {
    const bounds = layer.getBoundingClientRect();
    layer.querySelectorAll('.note').forEach(el => placeNoteRandom(bounds, el));
  });

  // Back inteligente (historial si existe)
  document.querySelector('.btn-back')?.addEventListener('click', (e) => {
    if (window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  });

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    if (REFRESH_MS > 0) setInterval(refresh, REFRESH_MS);
  });
})();
