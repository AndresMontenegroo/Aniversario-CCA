// js/config.js — versión compatible con admin.js/auth.js

// Hazlo global. Nada de const a secas:
window.CONFIG = {
  // 👇 TU URL de Apps Script /exec
  API_URL: 'https://script.google.com/macros/s/AKfycbwD1Go_Rx37AUal6q796uRSGm8lwuNuA5ElsRvIrsSgWC-o6MRO8_E5Uw-aYtPSchMMmQ/exec',

  // Sesión y refresco
  STORAGE_KEY: 'mural_token',
  REFRESH_MS: 30000, // 30s

  // Estados (opcional, por si quieres usarlos en UI)
  STATUS: {
    PENDING:  'pendiente',
    APPROVED: 'aprobado',
    REJECTED: 'rechazado'
  },

  // Endpoints esperados por admin.js (trae 2 variantes por compatibilidad)
  EP: {
    login:     'login',     // GET  ?p=login&user=&pass=
    me:        'me',        // GET  ?p=me&token=
    listA:     'comments',  // GET  ?p=comments&estado=&token=
    listB:     'peek',      // GET  ?p=peek&estado=&limit=&token=
    moderateA: 'moderate',  // POST {p:'moderate', id, estado, token}
    moderateB: 'setEstado', // POST {p:'setEstado', id, estado, token}
  }
};

// Validación gentil (solo avisa si la URL no parece de Apps Script)
(function checkConfig(){
  const ok = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(window.CONFIG.API_URL);
  if (!ok) console.error('⚠️ CONFIG.API_URL inválida. Pega tu /exec de Apps Script.');
})();
