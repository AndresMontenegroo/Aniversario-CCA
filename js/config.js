// Configuración de la aplicación

// IMPORTANTE: Reemplaza esta URL con la URL de tu Google Apps Script
const CONFIG = {
    // URL del endpoint de Google Apps Script (Web App)
    API_URL: 'https://script.google.com/macros/s/AKfycbytOIUF2R1WASMWiJu9jzI8RznWX80ODa2dxtwJPeF_JDICQISRSOA3f2cBF-qb4rz7OA/exec',
    
    // Configuración de refresh automático (en milisegundos)
    AUTO_REFRESH_INTERVAL: 30000, // 30 segundos
    
    // Configuración de la app
    APP_NAME: 'Mural Interactivo',
    
    // Estados de comentarios
    STATUS: {
        PENDING: 'pendiente',
        APPROVED: 'aprobado',
        REJECTED: 'rechazado'
    }
};

// Validar que la API URL esté configurada
function validateConfig() {
    if (CONFIG.API_URL === 'https://script.google.com/macros/s/AKfycbytOIUF2R1WASMWiJu9jzI8RznWX80ODa2dxtwJPeF_JDICQISRSOA3f2cBF-qb4rz7OA/exec') {
        console.error('⚠️ ERROR: Debes configurar la URL de tu Google Apps Script en config.js');
        return false;
    }
    return true;
}

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}