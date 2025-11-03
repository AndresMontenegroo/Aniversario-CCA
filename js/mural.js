/* ===== Mural: bootstrap sin notas (listo para integrar aprobados) ===== */

// Config para futura integración
const MURAL_CONFIG = {
  // Cambia esta URL cuando tengas el endpoint/JSON de “aprobados”
  APPROVED_ENDPOINT: null, // p.ej. '/data/aprobados.json' o una API
  // Si trabajas con Sheets/Node, aquí harás el fetch.
};

// Utilidad: aleatorio en rango
const rand = (min, max) => Math.random() * (max - min) + min;

// Layout aleatorio controlado (para cuando renders notas)
function placeNoteRandom(bounds, noteEl) {
  // Mantén las notas dentro del área visible con un padding
  const pad = 12;
  const maxX = Math.max(0, bounds.width  - noteEl.offsetWidth  - pad);
  const maxY = Math.max(0, bounds.height - noteEl.offsetHeight - pad);

  const x = rand(pad, maxX);
  const y = rand(pad, maxY);
  const rot = rand(-3, 3);

  noteEl.style.left = `${x}px`;
  noteEl.style.top  = `${y}px`;
  noteEl.style.setProperty('--rot', `${rot}deg`);
}

// Render de notas (vacío por ahora; se activará cuando tengamos data)
function renderNotes(approvedList = []) {
  const layer = document.getElementById('notes-layer');
  if (!layer) return;
  layer.innerHTML = ''; // limpiar

  if (!approvedList.length) return; // aún no hay aprobados → no colocar nada

  // Crear y posicionar
  const bounds = layer.getBoundingClientRect();

  approvedList.forEach(item => {
    const el = document.createElement('article');
    el.className = 'note';
    el.innerHTML = `
      <div class="pin" aria-hidden="true"></div>
      <p>${(item.text || '').replace(/\n/g,'<br>')}</p>
      <span class="author">— ${item.author || 'Anónimo'}</span>
    `;
    layer.appendChild(el);
    // tras insertar, ya tenemos dimensiones
    placeNoteRandom(bounds, el);
  });
}

// Bootstrap
async function initMural() {
  // Si tuvieras endpoint real:
  // const res = await fetch(MURAL_CONFIG.APPROVED_ENDPOINT, { cache: 'no-store' });
  // const data = await res.json(); // normaliza a [{text, author}, ...]
  // renderNotes(data);

  // Por ahora: SIN notas (vacío)
  renderNotes([]);
}

// Reposiciona notas al redimensionar
window.addEventListener('resize', () => {
  const layer = document.getElementById('notes-layer');
  if (!layer) return;
  const bounds = layer.getBoundingClientRect();
  layer.querySelectorAll('.note').forEach(el => placeNoteRandom(bounds, el));
});

document.addEventListener('DOMContentLoaded', initMural);


// Fallback de navegación: si hay historial, vuelve; si no, abre index.html
document.addEventListener('DOMContentLoaded', () => {
  const back = document.querySelector('.btn-back');
  if (!back) return;
  back.addEventListener('click', (e) => {
    if (window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    } // si no hay historial, el href="index.html" hace el resto
  });
});
