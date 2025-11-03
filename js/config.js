// js/config.js
window.CONFIG = {
  // Pega tu /exec de Apps Script o '/api' si usas proxy Netlify
  API_URL: 'https://script.google.com/macros/s/AKfycbzOarY2hO-rYdDD_y9L4Bh8zu5qfIr39KfuUeBMg3hH_b3tciDSp-XluiW8IB-MJfdX4w/exec',

  STORAGE_KEY: 'mural_token',
  REFRESH_MS: 30000,

  EP: {
    login:     'login',     // GET ?p=login&user=&pass=
    me:        'me',        // GET ?p=me&token=
    listA:     'comments',  // GET ?p=comments&estado=&token=
    listB:     'peek',      // GET ?p=peek&estado=&limit=&token=
    moderateA: 'moderate',  // POST {p:'moderate', id, estado, token}
    moderateB: 'setEstado', // POST {p:'setEstado', id, estado, token}
  }
};
