// js/config.js

// Detecta si estás corriendo en Netlify (producción)
const IS_NETLIFY = /\.netlify\.app$/i.test(location.host);

// Si quieres forzarlo manualmente en algún momento:
// const IS_NETLIFY = true;  // <-- fuerza /api (proxy)
// const IS_NETLIFY = false; // <-- fuerza URL directa de Apps Script

// ¡Pon aquí tu URL real de Apps Script (exec)!
const APPS_SCRIPT_EXEC = 'https://script.google.com/macros/s/AKfycbyM-43GmY3A9NZFx0OlGYNQLaNgRA90pMTqgRbN13IIapEmfIVn2t2r1whR3yGOZUPuRQ/exec';

const CONFIG = {
  // En Netlify usamos el proxy /api (definido en netlify.toml).
  // En local/otro host usamos la URL directa del exec.
  API_URL: IS_NETLIFY ? '/api' : APPS_SCRIPT_EXEC,

  AUTO_REFRESH_INTERVAL: 60000,
  REFRESH_MS: 120000,         // por compatibilidad con tu código
  APP_NAME: 'Mural Interactivo',
  STORAGE_KEY: 'mural_token',

  // Endpoints estándar del backend
  EP: {
    comments: 'comments',
    peek: 'peek',
    update: 'updateStatus',
    login: 'login'
  }
};

// Asegura que esté disponible globalmente
window.CONFIG = CONFIG;

// Export opcional por si alguna herramienta lo requiere
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
