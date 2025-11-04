// === Landing Page - Carrusel desde /assets (autodetección de ruta) ===

// Scroll suave al contenido
function scrollToContent() {
  const el = document.getElementById('content-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

(function () {
  // ---- CONFIG: cambia SOLO esta lista con tus archivos reales en /assets ----
  const ITEMS = [
    { file: 'moment1.jpg', title: 'Una comunidad que aprende', sub: 'Celebramos cada logro, cada amistad y cada nuevo comienzo.' },
    { file: 'moment2.jpg', title: 'Construyendo sueños juntos', sub: 'Cada día es una nueva oportunidad para crecer y aprender.' },
    { file: 'moment3.jpg', title: '35 años de excelencia',     sub: 'Formando líderes que transforman el mundo.' },
    { file: 'moment4.jpg', title: 'Historias que inspiran',     sub: 'Cada estudiante escribe su propia historia de éxito.' },
    { file: 'moment5.jpg', title: 'Juntos hacia el futuro',     sub: 'Continuamos construyendo un legado de excelencia educativa.' },
  ];
  const PING_FILE = 'logo.png'; // archivo “conocido” para probar la ruta

  const container = document.querySelector('.carousel-container');
  const dotsWrap  = document.querySelector('.carousel-indicators');
  const prevBtn   = document.querySelector('.carousel-btn.prev');
  const nextBtn   = document.querySelector('.carousel-btn.next');
  if (!container || !dotsWrap || !ITEMS.length) return;

  // A11y/UX básicos
  container.setAttribute('role', container.getAttribute('role') || 'region');
  container.setAttribute('aria-roledescription', container.getAttribute('aria-roledescription') || 'carousel');
  container.setAttribute('tabindex', container.getAttribute('tabindex') || '0');
  container.style.touchAction = container.style.touchAction || 'pan-y';
  prevBtn?.setAttribute('aria-label', 'Anterior');
  nextBtn?.setAttribute('aria-label', 'Siguiente');

  // --- Detecta la base de /assets según dónde esté index.html ---
  const CANDIDATES = ['assets/', './assets/', '../assets/', '/assets/'];
  function tryPath(base) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(base);
      img.onerror = () => res(null);
      img.src = base + PING_FILE + '?v=' + Date.now(); // cache-bust
    });
  }
  async function detectBase() {
    for (const base of CANDIDATES) {
      const ok = await tryPath(base);
      if (ok) return ok;
    }
    return 'assets/'; // fallback
  }

  // --- Monta el carrusel tras detectar la base ---
  detectBase().then((ASSETS) => {
    // Inyecta slides (con IDs para aria-controls)
    container.innerHTML = ITEMS.map((it, i) => {
      const id = `slide-${i+1}`;
      return `
        <div id="${id}" class="carousel-slide${i===0?' active':''}" role="group" aria-roledescription="slide"
             aria-label="${i+1} de ${ITEMS.length}" aria-hidden="${i===0?'false':'true'}">
          <img src="${ASSETS + it.file}" alt="${it.title || 'Momento memorable'}"
               width="1600" height="900"
               ${i===0 ? 'decoding="async" fetchpriority="high"' : 'loading="lazy" decoding="async"'} />
          <div class="carousel-overlay">
            <h3 class="carousel-text-main">${it.title || ''}</h3>
            <p class="carousel-text-sub">${it.sub || ''}</p>
          </div>
        </div>
      `;
    }).join('');

    // Inyecta dots (sin inline onclick para evitar dobles disparos)
    dotsWrap.setAttribute('role', 'tablist');
    dotsWrap.innerHTML = ITEMS.map((_, i) => {
      const id = `slide-${i+1}`;
      return `
        <span class="indicator${i===0?' active':''}" role="tab"
              aria-controls="${id}" aria-selected="${i===0?'true':'false'}"></span>
      `;
    }).join('');

    // Nodos
    const slides     = Array.from(document.querySelectorAll('.carousel-slide'));
    const indicators = Array.from(document.querySelectorAll('.indicator'));

    // Perf de imágenes
    slides.forEach((s, i) => {
      const img = s.querySelector('img');
      if (img && i !== 0) { img.loading = img.loading || 'lazy'; img.decoding = img.decoding || 'async'; }
    });

    // --- Lógica del carrusel (fade + autoplay + teclado + swipe) ---
    let current = 0;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = null;
    const INTERVAL = 6000;

    // 🔒 Bloqueo anti-doble avance durante la transición
    let navLock = false;
    const LOCK_MS = 650; // ligeramente > que el CSS de .6s

    function render() {
      slides.forEach((s, i) => {
        const active = i === current;
        s.classList.toggle('active', active);
        s.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      indicators.forEach((d, i) => {
        const active = i === current;
        d.classList.toggle('active', active);
        d.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    function showSlide(n) {
      const len = slides.length;
      current = ((n % len) + len) % len;
      render();
    }
    function moveCarousel(step) {
      if (navLock) return;
      navLock = true;
      showSlide(current + step);
      restart();
      setTimeout(() => { navLock = false; }, LOCK_MS);
    }
    function goToSlide(idx) {
      if (navLock) return;
      navLock = true;
      showSlide(idx);
      restart();
      setTimeout(() => { navLock = false; }, LOCK_MS);
    }

    // Exponer por si necesitas desde fuera
    window.moveCarousel = moveCarousel;
    window.goToSlide    = goToSlide;

    function start(){ if (!prefersReduce){ stop(); timer = setInterval(() => moveCarousel(1), INTERVAL); } }
    function stop(){ if (timer) clearInterval(timer); timer = null; }
    function restart(){ if (!prefersReduce){ stop(); start(); } }

    // Flechas — una por una, sin burbujas raras
    ['pointerdown','pointerup','click'].forEach(ev => {
      prevBtn?.addEventListener(ev, e => { e.stopPropagation(); });
      nextBtn?.addEventListener(ev, e => { e.stopPropagation(); });
    });
    prevBtn?.addEventListener('click', (e) => { e.preventDefault(); moveCarousel(-1); });
    nextBtn?.addEventListener('click', (e) => { e.preventDefault(); moveCarousel(1); });

    // Dots
    indicators.forEach((d, i) => d.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      goToSlide(i);
    }));

    // Teclado
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  moveCarousel(-1);
      if (e.key === 'ArrowRight') moveCarousel(1);
    });

    // Pausas: hover, focus y pestaña oculta
    container.addEventListener('mouseenter', stop);
    container.addEventListener('mouseleave', start);
    container.addEventListener('focusin', stop);
    container.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });

    // Swipe / drag SOLO táctil/pen (para no chocar con clicks de mouse)
    let x0 = null, activePid = null;
    container.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      if (e.target.closest('.carousel-btn') || e.target.closest('.indicator')) return;
      activePid = e.pointerId;
      x0 = e.clientX;
      try { container.setPointerCapture(activePid); } catch(_) {}
    });
    container.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse') return;
      if (e.pointerId !== activePid) return;
      const dx = e.clientX - (x0 ?? e.clientX);
      if (Math.abs(dx) > 40) (dx < 0 ? moveCarousel(1) : moveCarousel(-1));
      x0 = null; activePid = null;
      try { container.releasePointerCapture(e.pointerId); } catch(_) {}
    });
    container.addEventListener('pointercancel', () => { x0 = null; activePid = null; });

    // Inicial
    showSlide(0);
    start();

    // --- Crossfade 1: HERO ↔ CARROUSEL (entrada del carrusel mientras se va el hero) ---
    const heroContent     = document.querySelector('.hero-content');
    const heroNumber      = document.querySelector('.hero-number'); // animación entrada
    const momentsSection  = document.querySelector('.memorable-moments');

    // Entrada del 35 (opcional)
    if (heroNumber && !prefersReduce) {
      heroNumber.style.opacity = '0';
      heroNumber.style.transform = 'scale(0.8)';
      setTimeout(() => {
        heroNumber.style.transition = 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
        heroNumber.style.opacity = '1';
        heroNumber.style.transform = 'scale(1)';
      }, 300);
    }

    // --- Crossfade 2: CARROUSEL ↔ SIGUIENTE SECCIÓN (el carrusel también se desvanece) ---
    // Detección robusta de "siguiente sección"
    const nextSection =
      document.getElementById('content-section') ||
      document.querySelector('.content-section') ||
      (momentsSection ? momentsSection.nextElementSibling : null);

    // Estados iniciales (solo si no hay reduce motion)
    if (!prefersReduce) {
      if (momentsSection) {
        momentsSection.style.opacity = '0';
        momentsSection.style.transform = 'translateY(16px)';
        momentsSection.style.willChange = 'opacity, transform';
      }
      if (heroContent) {
        heroContent.style.willChange = 'opacity, transform';
      }
      if (nextSection) {
        nextSection.style.opacity = '0';
        nextSection.style.transform = 'translateY(16px)';
        nextSection.style.willChange = 'opacity, transform';
      }
    }

    const clamp01 = v => Math.max(0, Math.min(1, v));
    const VANISH_AT = 0.70; // al 70% de la altura de viewport, el hero ya está en 0

    function applyCrossfade() {
      if (prefersReduce) return;

      const y = window.scrollY || 0;
      const h = window.innerHeight || 1;

      // ---- Fase A: HERO -> CARROUSEL (igual que antes)
      const tA = clamp01(y / (h * VANISH_AT)); // 0 → 1
      if (heroContent) {
        const oHero = 1 - tA;
        heroContent.style.opacity = String(oHero);
        heroContent.style.transform = `translateY(${(-8 * tA).toFixed(2)}px)`;
        heroContent.style.pointerEvents = (oHero <= 0.02) ? 'none' : 'auto';
      }

      // Opacidad base del carrusel por entrada
      let oCarIn = tA;
      let carTranslateY = (16 * (1 - oCarIn)); // sube desde abajo mientras entra

      // ---- Fase B: CARROUSEL -> SIGUIENTE SECCIÓN (nuevo desvanecimiento)
      if (momentsSection && nextSection) {
        const nextTop = nextSection.getBoundingClientRect().top; // px desde top viewport
        const startY  = h * 0.75; // empieza a desvanecer cuando la siguiente sección está al 75% de viewport
        const spanY   = h * 0.60; // duración del fade
        const tB      = clamp01((startY - nextTop) / spanY); // 0 → 1 al entrar la siguiente sección

        // El carrusel se apaga multiplicando su entrada por (1 - tB)
        const oCar = oCarIn * (1 - tB);
        // Desplazamiento añade una subida leve adicional al desvanecer
        const upExtra = -8 * tB;
        const totalTranslateY = carTranslateY + upExtra;

        momentsSection.style.opacity = String(oCar);
        momentsSection.style.transform = `translateY(${totalTranslateY.toFixed(2)}px)`;
        momentsSection.style.pointerEvents = (oCar <= 0.02) ? 'none' : 'auto';

        // La siguiente sección aparece simétricamente
        const oNext = tB;
        nextSection.style.opacity = String(oNext);
        nextSection.style.transform = `translateY(${(16 * (1 - oNext)).toFixed(2)}px)`;
        nextSection.style.pointerEvents = (oNext <= 0.02) ? 'none' : 'auto';
      } else if (momentsSection) {
        // Si no hay siguiente sección, solo la entrada
        momentsSection.style.opacity = String(oCarIn);
        momentsSection.style.transform = `translateY(${carTranslateY.toFixed(2)}px)`;
        momentsSection.style.pointerEvents = (oCarIn <= 0.02) ? 'none' : 'auto';
      }
    }

    if (!prefersReduce) {
      // Primer pintado
      applyCrossfade();
      // Scroll con rAF
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { applyCrossfade(); ticking = false; });
      }, { passive: true });

      // Recalcular en resize
      window.addEventListener('resize', () => { applyCrossfade(); }, { passive: true });
    }

    // “Corte” limpio: cuando el carrusel entra al viewport, apagamos el hero
    if (heroContent && momentsSection) {
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          heroContent.style.opacity = '0';
          heroContent.style.pointerEvents = 'none';
          heroContent.style.transform = 'translateY(-8px) scale(0.98)';
        } else {
          heroContent.style.pointerEvents = 'auto';
        }
      }, {
        root: null,
        threshold: 0,
        rootMargin: '0px 0px -20% 0px'
      });
      io.observe(momentsSection);
    }
    
  });
  
/* === CTA v2 logic (sin vista rápida, una sola imagen) === */
(function(){
  // 1) Tu Google Forms:
  const FORMS_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdHwvZzVsUZ9qWEYbftfQW_8ucOLlfw6KhX9eivGNVGpg5NMA/viewform?usp=header'; // <-- CAMBIA ESTO

  // 2) URL del mural desde el botón del header (evita duplicar rutas):
  const MURAL_URL = document.querySelector('.btn-mural')?.getAttribute('href') || 'mural.html';

  // Enlaces
  const formLink  = document.getElementById('cta-form-link');
  const muralLink = document.getElementById('cta-mural-link');
  if (formLink)  formLink.href  = FORMS_URL;
  if (muralLink) muralLink.href = MURAL_URL;

  // Copiar enlace del formulario (mini-toast)
  const copyBtn = document.querySelector('[data-copy]');
  copyBtn?.addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(FORMS_URL); toast(e.currentTarget, '¡Enlace copiado!'); }
    catch { toast(e.currentTarget, 'No se pudo copiar'); }
  });

  // Tilt + brillo
  const canTilt = matchMedia('(pointer:fine)').matches;
  if (canTilt){
    document.querySelectorAll('.cta-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const px = (x / r.width) - .5;
        const py = (y / r.height) - .5;
        card.style.setProperty('--ry', `${px * 6}deg`);
        card.style.setProperty('--rx', `${-py * 6}deg`);
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--ry', `0deg`);
        card.style.setProperty('--rx', `0deg`);
        card.style.setProperty('--mx', `50%`);
        card.style.setProperty('--my', `50%`);
      });
    });
  }

  function toast(btn, msg){
    const tip = document.createElement('span');
    tip.className = 'toast';
    tip.textContent = msg;
    btn.style.position = 'relative';
    btn.appendChild(tip);
    setTimeout(()=> tip.remove(), 1400);
  }
})();

  
})();
