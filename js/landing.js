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
    // Inyecta slides
    container.innerHTML = ITEMS.map((it, i) => `
      <div class="carousel-slide${i===0?' active':''}" role="group" aria-roledescription="slide"
           aria-label="${i+1} de ${ITEMS.length}" aria-hidden="${i===0?'false':'true'}">
        <img src="${ASSETS + it.file}" alt="${it.title || 'Momento memorable'}"
             width="1600" height="900" ${i===0 ? 'decoding="async"' : 'loading="lazy" decoding="async'} />
        <div class="carousel-overlay">
          <h3 class="carousel-text-main">${it.title || ''}</h3>
          <p class="carousel-text-sub">${it.sub || ''}</p>
        </div>
      </div>
    `).join('');

    // Inyecta dots
    dotsWrap.innerHTML = ITEMS.map((_, i) => `
      <span class="indicator${i===0?' active':''}" role="tab" aria-selected="${i===0?'true':'false'}"
            onclick="goToSlide(${i})"></span>
    `).join('');

    // Ahora sí, selecciona los nodos ya montados
    const slides     = Array.from(document.querySelectorAll('.carousel-slide'));
    const indicators = Array.from(document.querySelectorAll('.indicator'));

    // Accesibilidad base
    container.setAttribute('role', container.getAttribute('role') || 'region');
    container.setAttribute('aria-roledescription', container.getAttribute('aria-roledescription') || 'carousel');
    container.setAttribute('tabindex', container.getAttribute('tabindex') || '0');

    slides.forEach((s, i) => {
      const img = s.querySelector('img');
      if (img && i !== 0) { img.loading = img.loading || 'lazy'; img.decoding = img.decoding || 'async'; }
    });

    // --- Lógica del carrusel (fade + autoplay + teclado + swipe) ---
    let current = 0;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = null;
    const INTERVAL = 6000;

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
    function moveCarousel(step) { showSlide(current + step); restart(); }
    function goToSlide(idx)     { showSlide(idx); restart(); }

    // Exponer para onclick del HTML
    window.moveCarousel = moveCarousel;
    window.goToSlide    = goToSlide;

    function start(){ if (!prefersReduce){ stop(); timer = setInterval(() => moveCarousel(1), INTERVAL); } }
    function stop(){ if (timer) clearInterval(timer); timer = null; }
    function restart(){ if (!prefersReduce){ stop(); start(); } }

    prevBtn?.addEventListener('click', () => moveCarousel(-1));
    nextBtn?.addEventListener('click', () => moveCarousel(1));
    indicators.forEach((d, i) => d.addEventListener('click', () => goToSlide(i)));

    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  moveCarousel(-1);
      if (e.key === 'ArrowRight') moveCarousel(1);
    });

    container.addEventListener('mouseenter', stop);
    container.addEventListener('mouseleave', start);

    let x0 = null;
    container.addEventListener('pointerdown', e => { x0 = e.clientX; });
    container.addEventListener('pointerup',   e => {
      if (x0 == null) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 40) (dx < 0 ? moveCarousel(1) : moveCarousel(-1));
      x0 = null;
    });
    container.addEventListener('pointercancel', () => { x0 = null; });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });

    // Inicial
    showSlide(0);
    start();

    // --- Animaciones de hero (como tenías) ---
    const heroNumber  = document.querySelector('.hero-number');
    const heroContent = document.querySelector('.hero-content');

    if (heroNumber && !prefersReduce) {
      heroNumber.style.opacity = '0';
      heroNumber.style.transform = 'scale(0.8)';
      setTimeout(() => {
        heroNumber.style.transition = 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
        heroNumber.style.opacity = '1';
        heroNumber.style.transform = 'scale(1)';
      }, 300);
    }

    if (heroContent && !prefersReduce) {
      heroContent.style.willChange = 'transform, opacity';
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY || 0;
          const h = window.innerHeight || 1;
          if (y < h) {
            heroContent.style.transform = `translateY(${y * 0.3}px)`;
            heroContent.style.opacity   = String(1 - (y / h) * 0.8);
          }
          ticking = false;
        });
      }, { passive: true });
    }
  });
})();
