// js/config.js
(function () {
  // ¿Estás en Netlify (dominio *.netlify.app)?
  const IS_NETLIFY = /\.netlify\.app$/i.test(location.host);

  // ¿Estás en dev local? (netlify dev usa 8888 por defecto)
  const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname) || String(location.port) === '8888';

  // Forzar proxy manualmente si usas dominio propio en pruebas:
  // En tu HTML, antes de cargar este script:  <script>window.__FORCE_PROXY__=true</script>
  const FORCE_PROXY = typeof window !== 'undefined' && window.__FORCE_PROXY__ === true;

  // URL real de tu Apps Script (EXEC)
  const APPS_SCRIPT_EXEC =
    'https://script.google.com/macros/s/AKfycbw5qvphWfLm4cvIlIVRFInpBUh6oOee2TkdixBn1rXn1V7_w6xuFmW-I1jDV14FWOLGVw/exec';

  // Proxy recomendado según tu netlify.toml actual
  // (mapeado a GAS):  [[redirects]] from="/api/mural" -> to=".../exec"
  let API_URL_NETLIFY = '/api/mural';

  // 🔑 Debe coincidir con Script Property "MURAL_API_KEY" en tu GAS
  const API_KEY_PUBLIC = '9d6967e7-b972-44fd-a2fb-ba2f56bffebe-18729206603089460703';

  // Base: proxy en Netlify o en dev local; EXEC en hosting externo
  let base = (IS_NETLIFY || IS_LOCAL || FORCE_PROXY) ? API_URL_NETLIFY : APPS_SCRIPT_EXEC;

  // Fallback por si dejaste "/api" en lugar de "/api/mural"
  if (/\/api\/?$/.test(base)) base = base.replace(/\/?$/, '/mural');

  // Normaliza (sin slash final)
  base = base.replace(/\/$/, '');

  const CONFIG = {
    API_URL: base,
    API_KEY: API_KEY_PUBLIC,

    AUTO_REFRESH_INTERVAL: 60000,
    REFRESH_MS: 120000,
    APP_NAME: 'Mural Interactivo',
    STORAGE_KEY: 'mural_token',

    // Endpoints (p=...)
    EP: {
      health: 'health',
      version: 'version',
      login: 'login',
      comments: 'comments',
      peek: 'peek',
      submit: 'submit',
      update: 'updateStatus',
    },
  };

  // Helper para armar la URL con ?p=...
  function buildEndpointUrl(ep) {
    const p = String(ep || '').trim();
    return `${CONFIG.API_URL}?p=${encodeURIComponent(p)}`;
  }

  // Exponer en ventana
  window.CONFIG = CONFIG;
  window.buildEndpointUrl = buildEndpointUrl;

  // Log útil en dev
  if (IS_LOCAL) {
    console.info('[mural] API_URL =', CONFIG.API_URL);
  }

  // Export opcional (tests/tooling)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, buildEndpointUrl };
  }
})();
