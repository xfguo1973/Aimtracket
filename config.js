// API 配置
const API_BASE_URL = (() => {
    // 根据当前域名自动判断API地址
    const hostname = window.location.hostname;

    // 本地开发环境
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:4000/api';
    }

    // 生产环境：API与前端同源
    // 如果前后端部署在同一域名下，使用相对路径
    return '/api';
})();

// 应用配置
const APP_CONFIG = {
    API_BASE_URL: API_BASE_URL,
    APP_NAME: 'AimTracker',
    VERSION: '1.0.0'
};