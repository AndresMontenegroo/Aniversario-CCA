/* =========================================================================
 * Landing Page — Carrusel + CTA + Envío de Formulario (externo a HTML)
 * ========================================================================= */
"use strict";

/* ---------------------- API pública usada por el HTML --------------------- */
function scrollToContent() {
  const el = document.getElementById("content-section");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
window.scrollToContent = scrollToContent;

/* ========================= Carrusel desde /assets ========================= */
(function () {
  const ITEMS = [
    { file: "moment1.jpg", title: "Eagles Plateau" },
    { file: "moment2.jpg", title: "Primer Musical" },
    { file: "moment3.jpg", title: "Personitas 1995" },
    { file: "moment4.jpg", title: "Radio Xtrema" },
    { file: "moment5.jpg", title: "Summer Camp US" },
  ];
  const PING_FILE = "logo.png";

  const container = document.querySelector(".carousel-container");
  const dotsWrap = document.querySelector(".carousel-indicators");
  const prevBtn = document.querySelector(".carousel-btn.prev");
  const nextBtn = document.querySelector(".carousel-btn.next");
  if (!container || !dotsWrap || !ITEMS.length) return;

  container.setAttribute("role", container.getAttribute("role") || "region");
  container.setAttribute(
    "aria-roledescription",
    container.getAttribute("aria-roledescription") || "carousel"
  );
  container.setAttribute("tabindex", container.getAttribute("tabindex") || "0");
  container.style.touchAction = container.style.touchAction || "pan-y";
  prevBtn?.setAttribute("aria-label", "Anterior");
  nextBtn?.setAttribute("aria-label", "Siguiente");

  const CANDIDATES = ["assets/", "./assets/", "../assets/", "/assets/"];
  function tryPath(base) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => res(base);
      img.onerror = () => res(null);
      img.src = base + PING_FILE + "?v=" + Date.now();
    });
  }
  async function detectBase() {
    for (const base of CANDIDATES) {
      const ok = await tryPath(base);
      if (ok) return ok;
    }
    return "assets/";
  }

  detectBase().then((ASSETS) => {
    container.innerHTML = ITEMS.map((it, i) => {
      const id = `slide-${i + 1}`;
      return `
        <div id="${id}" class="carousel-slide${
        i === 0 ? " active" : ""
      }" role="group" aria-roledescription="slide"
             aria-label="${i + 1} de ${ITEMS.length}" aria-hidden="${
        i === 0 ? "false" : "true"
      }">
          <img src="${ASSETS + it.file}" alt="${
        it.title || "Momento memorable"
      }"
               width="1600" height="900"
               ${
                 i === 0
                   ? 'decoding="async" fetchpriority="high"'
                   : 'loading="lazy" decoding="async"'
               } />
          <div class="carousel-overlay">
            <h3 class="carousel-text-main">${it.title || ""}</h3>
            <p class="carousel-text-sub">${it.sub || ""}</p>
          </div>
        </div>
      `;
    }).join("");

    dotsWrap.setAttribute("role", "tablist");
    dotsWrap.innerHTML = ITEMS.map((_, i) => {
      const id = `slide-${i + 1}`;
      return `
        <span class="indicator${i === 0 ? " active" : ""}" role="tab"
              aria-controls="${id}" aria-selected="${
        i === 0 ? "true" : "false"
      }"></span>
      `;
    }).join("");

    const slides = Array.from(document.querySelectorAll(".carousel-slide"));
    const indicators = Array.from(document.querySelectorAll(".indicator"));

    slides.forEach((s, i) => {
      const img = s.querySelector("img");
      if (img && i !== 0) {
        img.loading = img.loading || "lazy";
        img.decoding = img.decoding || "async";
      }
    });

    let current = 0;
    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let timer = null;
    const INTERVAL = 6000;

    let navLock = false;
    const LOCK_MS = 650;

    function render() {
      slides.forEach((s, i) => {
        const active = i === current;
        s.classList.toggle("active", active);
        s.setAttribute("aria-hidden", active ? "false" : "true");
      });
      indicators.forEach((d, i) => {
        const active = i === current;
        d.classList.toggle("active", active);
        d.setAttribute("aria-selected", active ? "true" : "false");
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
      setTimeout(() => {
        navLock = false;
      }, LOCK_MS);
    }
    function goToSlide(idx) {
      if (navLock) return;
      navLock = true;
      showSlide(idx);
      restart();
      setTimeout(() => {
        navLock = false;
      }, LOCK_MS);
    }

    window.moveCarousel = moveCarousel;
    window.goToSlide = goToSlide;

    function start() {
      if (!prefersReduce) {
        stop();
        timer = setInterval(() => moveCarousel(1), INTERVAL);
      }
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
    function restart() {
      if (!prefersReduce) {
        stop();
        start();
      }
    }

    ["pointerdown", "pointerup", "click"].forEach((ev) => {
      prevBtn?.addEventListener(ev, (e) => {
        e.stopPropagation();
      });
      nextBtn?.addEventListener(ev, (e) => {
        e.stopPropagation();
      });
    });
    prevBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      moveCarousel(-1);
    });
    nextBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      moveCarousel(1);
    });

    indicators.forEach((d, i) =>
      d.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        goToSlide(i);
      })
    );

    container.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") moveCarousel(-1);
      if (e.key === "ArrowRight") moveCarousel(1);
    });

    container.addEventListener("mouseenter", stop);
    container.addEventListener("mouseleave", start);
    container.addEventListener("focusin", stop);
    container.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    let x0 = null,
      activePid = null;
    container.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      if (e.target.closest(".carousel-btn") || e.target.closest(".indicator"))
        return;
      activePid = e.pointerId;
      x0 = e.clientX;
      try {
        container.setPointerCapture(activePid);
      } catch (_) {}
    });
    container.addEventListener("pointerup", (e) => {
      if (e.pointerType === "mouse") return;
      if (e.pointerId !== activePid) return;
      const dx = e.clientX - (x0 ?? e.clientX);
      if (Math.abs(dx) > 40) dx < 0 ? moveCarousel(1) : moveCarousel(-1);
      x0 = null;
      activePid = null;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch (_) {}
    });
    container.addEventListener("pointercancel", () => {
      x0 = null;
      activePid = null;
    });

    showSlide(0);
    start();

    const heroContent = document.querySelector(".hero-content");
    const heroNumber = document.querySelector(".hero-number");
    const momentsSection = document.querySelector(".memorable-moments");

    if (heroNumber && !prefersReduce) {
      heroNumber.style.opacity = "0";
      heroNumber.style.transform = "scale(0.8)";
      setTimeout(() => {
        heroNumber.style.transition = "all 1.2s cubic-bezier(0.4, 0, 0.2, 1)";
        heroNumber.style.opacity = "1";
        heroNumber.style.transform = "scale(1)";
      }, 300);
    }

    const nextSection =
      document.getElementById("content-section") ||
      document.querySelector(".content-section") ||
      (momentsSection ? momentsSection.nextElementSibling : null);

    if (!prefersReduce) {
      if (momentsSection) {
        momentsSection.style.opacity = "0";
        momentsSection.style.transform = "translateY(16px)";
        momentsSection.style.willChange = "opacity, transform";
      }
      if (heroContent) {
        heroContent.style.willChange = "opacity, transform";
      }
      if (nextSection) {
        nextSection.style.opacity = "0";
        nextSection.style.transform = "translateY(16px)";
        nextSection.style.willChange = "opacity, transform";
      }
    }

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const VANISH_AT = 0.7;

    function applyCrossfade() {
      if (prefersReduce) return;
      const y = window.scrollY || 0;
      const h = window.innerHeight || 1;

      const tA = clamp01(y / (h * VANISH_AT));
      if (heroContent) {
        heroContent.style.opacity = "1"; // opacidad fija
        heroContent.style.transform = `translateY(${(-8 * tA).toFixed(2)}px)`; // mantiene movimiento sutil
        heroContent.style.pointerEvents = "auto";
      }

      let oCarIn = tA;
      let carTranslateY = 16 * (1 - oCarIn);

      if (momentsSection && nextSection) {
        momentsSection.style.opacity = "1"; // desactiva fade
        momentsSection.style.transform = `translateY(${totalTranslateY.toFixed(
          2
        )}px)`;
        nextSection.style.opacity = "1"; // desactiva fade
        nextSection.style.transform = `translateY(${(16 * (1 - oNext)).toFixed(
          2
        )}px)`;
      } else if (momentsSection) {
        momentsSection.style.opacity = String(oCarIn);
        momentsSection.style.transform = `translateY(${carTranslateY.toFixed(
          2
        )}px)`;
        momentsSection.style.pointerEvents = oCarIn <= 0.02 ? "none" : "auto";
      }
    }

    if (!prefersReduce) {
      applyCrossfade();
      let ticking = false;
      window.addEventListener(
        "scroll",
        () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            applyCrossfade();
            ticking = false;
          });
        },
        { passive: true }
      );
      window.addEventListener(
        "resize",
        () => {
          applyCrossfade();
        },
        { passive: true }
      );
    }

    if (heroContent && momentsSection) {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            heroContent.style.opacity = "0";
            heroContent.style.pointerEvents = "none";
            heroContent.style.transform = "translateY(-8px) scale(0.98)";
          } else {
            heroContent.style.pointerEvents = "auto";
          }
        },
        { root: null, threshold: 0, rootMargin: "0px 0px -20% 0px" }
      );
      io.observe(momentsSection);
    }
  });
})();

/* ======================= CTA: Links + Tilt + Form ========================= */
(function () {
  const FORMS_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSdHwvZzVsUZ9qWEYbftfQW_8ucOLlfw6KhX9eivGNVGpg5NMA/viewform?usp=header";
  const MURAL_URL =
    document.querySelector(".btn-mural")?.getAttribute("href") || "mural.html";

  const formLink = document.getElementById("cta-form-link");
  const muralLink = document.getElementById("cta-mural-link");
  if (formLink) formLink.href = FORMS_URL;
  if (muralLink) muralLink.href = MURAL_URL;

  const copyBtn = document.querySelector("[data-copy]");
  copyBtn?.addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(FORMS_URL);
      toast(e.currentTarget, "¡Enlace copiado!");
    } catch {
      toast(e.currentTarget, "No se pudo copiar");
    }
  });

  const canTilt = matchMedia("(pointer:fine)").matches;
  if (canTilt) {
    document.querySelectorAll(".cta-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left,
          y = e.clientY - r.top;
        const px = x / r.width - 0.5;
        const py = y / r.height - 0.5;
        card.style.setProperty("--ry", `${px * 6}deg`);
        card.style.setProperty("--rx", `${-py * 6}deg`);
        card.style.setProperty("--mx", `${x}px`);
        card.style.setProperty("--my", `${y}px`);
      });
      card.addEventListener("mouseleave", () => {
        card.style.setProperty("--ry", `0deg`);
        card.style.setProperty("--rx", `0deg`);
        card.style.setProperty("--mx", `50%`);
        card.style.setProperty("--my", `50%`);
      });
    });
  }

  function toast(btn, msg) {
    const tip = document.createElement("span");
    tip.className = "toast";
    tip.textContent = msg;
    btn.style.position = "relative";
    btn.appendChild(tip);
    setTimeout(() => tip.remove(), 1400);
  }

  /* --------------------------- Envío del Form ---------------------------- */
  const form = document.getElementById("share-form");
  const btn = document.getElementById("btn-submit");
  const out = document.getElementById("form-feedback");
  if (!form) return;

  // Decide endpoint y si se envía key (proxy seguro vs fallback directo)
  function resolveSubmitTarget() {
    const action = (form.getAttribute("action") || "").trim();
    const useFunctionProxy = /^\/api\/mural-submit(?:\/)?$/i.test(action);
    if (useFunctionProxy) {
      return { url: action, sendKey: false }; // la inyecta el proxy en servidor
    }
    // Fallback: buildEndpointUrl('submit') o /api?p=submit
    const hasBuilder = typeof window.buildEndpointUrl === "function";
    const url = hasBuilder
      ? window.buildEndpointUrl("submit")
      : `${((window.CONFIG && window.CONFIG.API_URL) || "/api").replace(
          /\/$/,
          ""
        )}?p=submit`;
    return { url, sendKey: true };
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (out) {
      out.textContent = "";
      out.classList.remove("ok", "err");
    }

    const hp = form.querySelector("input.hp");
    if (hp && hp.value) return; // bot

    const nombre = form.nombre?.value?.trim() || "";
    const email = form.email?.value?.trim() || "";
    const comentario = form.comentario?.value?.trim() || "";
    const consentOK = document.getElementById("f-consent")?.checked;

    if (nombre.length < 2)
      return showErr("Por favor, escribe tu nombre (mín. 2 caracteres).");
    if (comentario.length < 5)
      return showErr("El mensaje es muy corto (mín. 5 caracteres).");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return showErr("El correo no parece válido.");
    if (!consentOK) return showErr("Debes aceptar el tratamiento de datos.");

    const { url, sendKey } = resolveSubmitTarget();

    const payload = { nombre, email, comentario };
    if (sendKey) {
      payload["x-api-key"] = (window.CONFIG && window.CONFIG.API_KEY) || "";
    }

    setLoading(true);
    try {
      const resp = await fetch('https://cca35aniversario.cca.edu.co/api/mural.php', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Intentar JSON; si falla, volcar texto para debug
      let data = null,
        text = null;
      const ctype = resp.headers.get("content-type") || "";
      if (/application\/json/i.test(ctype)) {
        data = await resp.json();
      } else {
        text = await resp.text();
        if (window.DEBUG_MURAL)
          console.warn(
            "Respuesta no-JSON:",
            resp.status,
            ctype,
            text?.slice(0, 400)
          );
      }

      if (!resp.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          text ||
          "No se pudo enviar. Intenta de nuevo.";
        throw new Error(msg);
      }
      if (data && (data.ok === false || data.success === false)) {
        throw new Error(
          data.error || data.message || "No se pudo enviar. Intenta de nuevo."
        );
      }

      form.reset();
      showOk("¡Gracias! Tu mensaje quedó enviado y pasará a revisión.");
    } catch (err) {
      showErr(String(err.message || err) || "Error desconocido al enviar.");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(loading) {
    if (!btn) return;
    btn.disabled = !!loading;
    btn.innerText = loading ? "Enviando…" : "Enviar mensaje";
  }
  function showErr(msg) {
    if (out) {
      out.classList.remove("ok");
      out.classList.add("err");
      out.textContent = msg;
    }
  }
  function showOk(msg) {
    if (out) {
      out.classList.remove("err");
      out.classList.add("ok");
      out.textContent = msg;
    }
  }
})();
