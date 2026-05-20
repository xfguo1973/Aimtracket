// API configuration
const API_BASE_URL = (() => {
    if (window.AIMTRACKER_API_BASE_URL) {
        return window.AIMTRACKER_API_BASE_URL;
    }

    const savedApiBase = window.localStorage && window.localStorage.getItem('AIMTRACKER_API_BASE_URL');
    if (savedApiBase) {
        return savedApiBase;
    }

    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:4000/api';
    }

    if (hostname.endsWith('github.io')) {
        return 'https://aimtracker.up.railway.app/api';
    }

    return '/api';
})();

const APP_CONFIG = {
    API_BASE_URL: API_BASE_URL,
    APP_NAME: 'AimTracker',
    VERSION: '1.0.0'
};
