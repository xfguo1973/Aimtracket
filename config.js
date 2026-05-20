const CUSTOM_API_BASE_URL = (() => {
    if (window.AIMTRACKER_API_BASE_URL) {
        return window.AIMTRACKER_API_BASE_URL;
    }

    const savedApiBase = window.localStorage && window.localStorage.getItem('AIMTRACKER_API_BASE_URL');
    if (savedApiBase) {
        return savedApiBase;
    }

    return null;
})();

// API configuration
const API_BASE_URL = (() => {
    if (CUSTOM_API_BASE_URL) {
        return CUSTOM_API_BASE_URL;
    }

    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:4000/api';
    }

    return '/api';
})();

const APP_CONFIG = {
    API_BASE_URL: API_BASE_URL,
    STATIC_AUTH_MODE: window.location.hostname.endsWith('github.io') && !CUSTOM_API_BASE_URL,
    APP_NAME: 'AimTracker',
    VERSION: '1.0.0'
};
