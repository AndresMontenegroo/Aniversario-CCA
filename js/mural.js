/* ===== Mural 35 Años — v8.1 (auto-sync por versión + live updates) ===== */
(function () {
  // ---------- Config ----------
  const API = window.CONFIG?.API_URL || '';
  if (!API) { console.error('[mural] Falta CONFIG.API_URL'); return; }

  // Endpoints backend v4
  const EP_A = window.CONFIG?.EP?.comments || 'comments';
  const EP_B = window.CONFIG?.EP?.peek     || 'peek';
  const EP_V = 'version';

  // Polls
  const REFRESH_MS       = Number(window.CONFIG?.REFRESH_MS ?? window.CONFIG?.AUTO_REFRESH_INTERVAL ?? 12000); // fallback
  const VERSION_POLL_MS  = Number(window.CONFIG?.VERSION_POLL_MS ?? 2500); // alta frecuencia para detectar cambios

  // Debug activable con ?debug
  const DEBUG = new URLSearchParams(location.search).has('debug');
  function log(...xs){ if (DEBUG) console.log('[mural]', ...xs); }

  // ---------- DOM ----------
  const layer = document.getElementById('notes-layer');
  if (!layer) { console.error('[mural] No existe #notes-layer'); return; }
  const cs = getComputedStyle(layer);
  if (cs.position === 'static') layer.style.position = 'relative';
  if (layer.clientHeight < 260) layer.style.minHeight = '70vh';

  // Overlay de zoom
  let zoomBackdrop = document.querySelector('.zoom-backdrop');
  if (!zoomBackdrop) {
    zoomBackdrop = document.createElement('div');
    zoomBackdrop.className = 'zoom-backdrop';
    document.body.appendChild(zoomBackdrop);
    zoomBackdrop.addEventListener('click', (e) => { if (e.target === zoomBackdrop) closeZoom(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeZoom(); });
  }

  // ---------- Utils ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm = s => String(s || '').toLowerCase().trim();
  const rand = (min, max) => Math.random() * (max - min) + min;
  const bust = url => url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();

  async function getJSON(url) {
    const busted = bust(url);
    try {
      const r = await fetch(busted, { method:'GET', cache:'no-store' });
      const t = await r.text();
      try { return JSON.parse(t); } catch(_) {}
    } catch(_){}
    return jsonp(busted);
  }
  function jsonp(url) {
    return new Promise(resolve => {
      const cb = `__mural_cb_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
      const s  = document.createElement('script');
      const src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
      const to  = setTimeout(cleanup, 12000, null);
      window[cb] = (data) => cleanup(data);
      s.src = src; s.async = true; s.defer = true;
      s.onerror = () => cleanup(null);
      document.head.appendChild(s);
      function cleanup(data){
        clearTimeout(to);
        try{ delete window[cb]; }catch{}
        try{ document.head.removeChild(s); }catch{}
        resolve(data);
      }
    });
  }

  function normalizeResponse(res) {
    // Backend v4: { ok:true, items:[...] } o { ok:true, version:N }
    const arr = Array.isArray(res) ? res
      : Array.isArray(res?.items)    ? res.items
      : Array.isArray(res?.comments) ? res.comments
      : Array.isArray(res?.data)     ? res.data
      : [];
    const gotHealth = !!res?.endpoints && res?.service && res?.ok;
    return { items: arr, isHealth: gotHealth };
  }

  // items backend v4: { id?, uid, timestamp, nombre, email, comentario, estado, rowIndex }
  const toItem = it => ({
    id:     it.id || it.uid || it.rowIndex || it.rowId || '',
    ts:     it.ts || it.timestamp || it.fecha || it.Fecha || '',
    name:   it.name || it.nombre || it.Nombre || 'Anónimo',
    mail:   it.mail || it.email  || it.Email  || '',
    text:   it.text || it.comentario || it.Comentario || '',
    estado: norm(it.estado || it.status || '')
  });

  // ---------- Loader (caja blanca + reloj girando) ----------
  const Loader = (() => {
    let el, styled;
    function ensure(){
      if (!styled){
        const css = `
          #mural-loader{position:fixed; inset:0; display:none; place-items:center; z-index:10000;
            background:rgba(0,0,0,.35); backdrop-filter: blur(8px) saturate(140%);}
          #mural-loader.on{display:grid;}
          #mural-loader .box{display:flex; align-items:center; gap:14px; padding:18px 20px; border-radius:16px;
            border:1px solid rgba(0,0,0,.08);
            background:#ffffff; color:#111;
            box-shadow:0 10px 40px rgba(0,0,0,.28); min-width: 280px; max-width: 88vw;}
          #mural-loader .emoji{font-size:30px; line-height:1; filter: drop-shadow(0 1px 0 rgba(0,0,0,.1));
            animation:mrl-spin 1.1s linear infinite;}
          #mural-loader .copy{display:flex; flex-direction:column; gap:6px}
          #mural-loader .text{font-weight:700; color:#111; font-size:15px; white-space:nowrap}
          #mural-loader .dots{display:inline-flex; margin-left:2px; vertical-align:baseline}
          #mural-loader .dots span{opacity:0; animation:mrl-dot 1.2s infinite;}
          #mural-loader .dots span:nth-child(2){animation-delay:.2s}
          #mural-loader .dots span:nth-child(3){animation-delay:.4s}
          #mural-loader .sub{font-weight:500; font-size:12px; opacity:.7}
          @keyframes mrl-dot{0%{opacity:0} 50%{opacity:1} 100%{opacity:0}}
          @keyframes mrl-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          @media (prefers-color-scheme:dark){
            #mural-loader .box{background:#ffffff; color:#111; border-color:rgba(0,0,0,.08);}
            #mural-loader .text{color:#111}
          }
        `;
        const st = document.createElement('style');
        st.id = 'mural-loader-style';
        st.textContent = css;
        document.head.appendChild(st);
        styled = true;
      }
      if (!el){
        el = document.createElement('div');
        el.id = 'mural-loader';
        el.innerHTML = `
          <div class="box" role="status" aria-live="polite" aria-busy="true">
            <div class="emoji" aria-hidden="true">⏳</div>
            <div class="copy">
              <div class="text"><span class="msg">Cargando comentarios</span><span class="dots"><span>.</span><span>.</span><span>.</span></span></div>
              <div class="sub">Un momento, preparando el mural</div>
            </div>
          </div>`;
        document.body.appendChild(el);
      }
      return el;
    }
    return {
      show(msg){
        const e = ensure();
        if (msg) e.querySelector('.msg').textContent = msg;
        e.classList.add('on');
      },
      hide(){
        const e = ensure();
        e.classList.remove('on');
      }
    };
  })();

  // ---------- Memoria (posición %, z, color) ----------
  const STORE_KEY = 'mural:v1:pos';
  let store = loadStore();

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
  }
  function getNoteState(id){ return store[id] || null; } // { xPct, yPct, z, color }
  function setNoteState(id, partial){ store[id] = { ...(store[id] || {}), ...partial }; saveStore(); }
  function removeNoteState(id){ delete store[id]; saveStore(); }

  function nextZ(){
    const maxZ = Object.values(store).reduce((m, v) => Math.max(m, Number(v?.z || 0)), 0);
    return (maxZ || 30) + 1;
  }

  function colorClass(id){
    const saved = getNoteState(id)?.color;
    if (saved) return saved;
    let h = 0; for (let i=0; i<id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const idx = Math.abs(h) % 6;
    const cls = `note--c${idx}`;
    setNoteState(id, { color: cls });
    return cls;
  }

  // ---------- Mapa DOM ----------
  const nodeById = new Map(); // id -> HTMLElement .note

  // ---------- Colocación ----------
  function placeUsingPercent(el, xPct, yPct){
    const w = layer.clientWidth, h = layer.clientHeight;
    const x = Math.max(0, Math.min(w - el.offsetWidth,  Math.round(xPct * w)));
    const y = Math.max(0, Math.min(h - el.offsetHeight, Math.round(yPct * h)));
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
  }

  function randomPlace(el){
    const pad = 12;
    const bounds = layer.getBoundingClientRect();
    const maxX = Math.max(0, bounds.width  - el.offsetWidth  - pad);
    const maxY = Math.max(0, bounds.height - el.offsetHeight - pad);
    const x = rand(pad, maxX);
    const y = rand(pad, maxY);
    el.style.left = Math.round(x) + 'px';
    el.style.top  = Math.round(y) + 'px';
  }

  function applyStoredPosition(el, id){
    const st = getNoteState(id);
    if (st && typeof st.xPct === 'number' && typeof st.yPct === 'number') {
      placeUsingPercent(el, st.xPct, st.yPct);
      if (st.z) el.style.zIndex = String(st.z);
      return true;
    }
    return false;
  }

  function persistPosition(el, id){
    const w = layer.clientWidth, h = layer.clientHeight;
    const left = parseFloat(el.style.left || '0');
    const top  = parseFloat(el.style.top  || '0');
    const xPct = w ? left / w : 0;
    const yPct = h ? top  / h : 0;
    setNoteState(id, { xPct, yPct });
  }

  // ---------- Crear nota ----------
  function createNoteEl(data){
    const id = data.id;
    if (!id) return null; // no crear sin ID estable
    const clsColor = colorClass(id);

    const el = document.createElement('article');
    el.className = `note ${clsColor}`;
    el.dataset.id = id;
    el.innerHTML = `
      <div class="pin" aria-hidden="true"></div>
      <div class="note__content">
        <p>${esc((data.text||'').replace(/\r/g, '')).replace(/\n/g,'<br>')}</p>
        <span class="author">— ${esc(data.name||'Anónimo')}</span>
      </div>
    `;
    layer.appendChild(el);

    const rot = rand(-2.5, 2.5);
    el.style.setProperty('--rot', rot.toFixed(2) + 'deg');

    if (!applyStoredPosition(el, id)) {
      randomPlace(el);
      persistPosition(el, id);
    }

    const st = getNoteState(id);
    if (st?.z) el.style.zIndex = String(st.z);

    wireDragAndTap(el, id);
    return el;
  }

  function bringToFront(el, id){
    const newZ = nextZ();
    el.style.zIndex = String(newZ);
    el.classList.add('note--top');
    setNoteState(id, { z: newZ });
    nodeById.forEach(n => { if (n !== el) n.classList.remove('note--top'); });
  }

  function wireDragAndTap(el, id){
    let dragging = false;
    let moved = false;
    let sx=0, sy=0, sl=0, st=0;
    const CLICK_EPS = 6;

    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true; moved = false;
      el.classList.add('note--dragging');
      bringToFront(el, id);

      const layerRect = layer.getBoundingClientRect();
      sl = parseFloat(el.style.left || '0');
      st = parseFloat(el.style.top  || '0');
      sx = (e.touches?.[0]?.clientX ?? e.clientX) - layerRect.left;
      sy = (e.touches?.[0]?.clientY ?? e.clientY) - layerRect.top;

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once:true });
      window.addEventListener('touchmove', onMove, { passive:false });
      window.addEventListener('touchend', onUp, { once:true });
    };

    const onMove = (e) => {
      if (!dragging) return;
      e.preventDefault();
      const lx = (e.touches?.[0]?.clientX ?? e.clientX) - layer.getBoundingClientRect().left;
      const ly = (e.touches?.[0]?.clientY ?? e.clientY) - layer.getBoundingClientRect().top;
      const dx = lx - sx;
      const dy = ly - sy;
      if (!moved && (Math.abs(dx) > CLICK_EPS || Math.abs(dy) > CLICK_EPS)) moved = true;

      const maxX = layer.clientWidth  - el.offsetWidth;
      const maxY = layer.clientHeight - el.offsetHeight;
      const nx = Math.max(0, Math.min(maxX, sl + dx));
      const ny = Math.max(0, Math.min(maxY, st + dy));
      el.style.left = Math.round(nx) + 'px';
      el.style.top  = Math.round(ny) + 'px';
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onMove);
      el.classList.remove('note--dragging');
      if (!dragging) return;
      dragging = false;

      if (moved) { persistPosition(el, id); return; }
      openZoomFrom(el, id);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('touchstart', (e) => { onDown(e); }, { passive:false });
  }

  // ---------- Zoom ----------
  function openZoomFrom(el, id){
    const content = el.querySelector('.note__content');
    if (!content) return;
    zoomBackdrop.innerHTML = '';
    const card = document.createElement('article');
    const cls = getNoteState(id)?.color || [...el.classList].find(c => /^note--c\d$/.test(c)) || 'note--c0';
    card.className = 'zoom-card ' + cls;
    card.innerHTML = `<div class="pin" aria-hidden="true"></div>${content.outerHTML}`;
    zoomBackdrop.appendChild(card);
    zoomBackdrop.classList.add('active');
    document.body.classList.add('no-scroll');
  }
  function closeZoom(){
    zoomBackdrop.classList.remove('active');
    zoomBackdrop.innerHTML = '';
    document.body.classList.remove('no-scroll');
  }

  // ---------- Datos (agregar/actualizar; quitar los no aprobados) ----------
  async function fetchApproved(){
    let rawA = await getJSON(`${API}?p=${EP_A}&estado=aprobado`);
    log('raw A', rawA);
    let { items: A, isHealth: isHealthA } = normalizeResponse(rawA);
    let merged = Array.isArray(A) ? A.map(toItem) : [];

    if (isHealthA || merged.length === 0) {
      let rawB = await getJSON(`${API}?p=${EP_B}&estado=aprobado&limit=500`);
      log('raw B', rawB);
      const B = normalizeResponse(rawB).items || [];
      merged = merged.concat(B.map(toItem));
    }

    const aprob = merged.filter(x => norm(x.estado) === 'aprobado' || norm(x.estado) === 'aprobados');
    return aprob.filter(x => x.id);
  }

  let ticking = false;
  async function tick(){
    if (ticking) return;
    ticking = true;
    try{
      const list = await fetchApproved();
      const incomingIds = new Set(list.map(x => x.id));

      // Altas/updates
      for (const it of list) {
        if (!nodeById.has(it.id)) {
          const el = createNoteEl(it);
          if (el) {
            nodeById.set(it.id, el);
            el.style.opacity = '0';
            requestAnimationFrame(() => {
              el.style.transition = 'opacity .18s ease';
              el.style.opacity = '1';
            });
          }
        } else {
          // actualizar texto/autor si cambian
          const el = nodeById.get(it.id);
          const p = el.querySelector('.note__content p');
          const a = el.querySelector('.note__content .author');
          const newHTML = esc((it.text||'').replace(/\r/g, '')).replace(/\n/g,'<br>');
          if (p && p.innerHTML !== newHTML) p.innerHTML = newHTML;
          if (a) a.textContent = '— ' + (it.name || 'Anónimo');
        }
      }

      // Bajas: los que ya NO están aprobados se van del mural
      nodeById.forEach((el, id) => {
        if (!incomingIds.has(id)) {
          el.style.transition = 'opacity .16s ease';
          el.style.opacity = '0';
          setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
            nodeById.delete(id);
          }, 180);
        }
      });

    }catch(err){
      console.error('[mural] tick error', err);
    } finally {
      ticking = false;
    }
  }

  // ---------- Version watcher (push-like) ----------
  let lastVersion = 0;
  let versionBusy = false;

  async function fetchVersion(){
    try{
      const res = await getJSON(`${API}?p=${EP_V}`);
      const v = Number(res?.version || 0);
      return isFinite(v) ? v : 0;
    }catch(_){ return 0; }
  }

  async function watchVersionLoop(){
    if (versionBusy) return;
    versionBusy = true;
    try{
      const v = await fetchVersion();
      if (v && v !== lastVersion) {
        log('version changed', lastVersion, '->', v);
        lastVersion = v;
        await tick(); // sincroniza de inmediato (agrega/borra en el mural)
      }
    } finally {
      versionBusy = false;
    }
  }

  // ---------- Resize ----------
  function onResize(){
    nodeById.forEach((el, id) => {
      const st = getNoteState(id);
      if (st && typeof st.xPct === 'number' && typeof st.yPct === 'number') {
        placeUsingPercent(el, st.xPct, st.yPct);
      }
    });
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', async () => {
    Loader.show('Cargando comentarios');
    try {
      await tick(); // primera carga
      // Inicializa versión base para no disparar un tick inmediato
      lastVersion = await fetchVersion();
    } finally {
      Loader.hide();
    }

    // Push-like: detectar aprobaciones/rechazos casi en tiempo real
    if (VERSION_POLL_MS > 0) setInterval(watchVersionLoop, VERSION_POLL_MS);

    // Fallback: por si la versión no se actualiza, mantener un poll bajo
    if (REFRESH_MS > 0) setInterval(() => { if (!ticking) tick(); }, REFRESH_MS);

    window.addEventListener('resize', onResize);
  });
})();
