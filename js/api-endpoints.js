/**
 * Bank Entrance System - API Endpoint Definitions
 * Centralized, authoritative endpoint map for all API interactions.
 */

(() => {
    const API_ENDPOINTS = {
        // Core control endpoints
        ACTION: '/action',
        LOGS_BASE: '/log',
        LOGS_QUERY: (type) => `/log?type=${encodeURIComponent(type)}`,
        LOG_DOWNLOAD: (type) => `/logs/${encodeURIComponent(type)}.txt`,

        // Status payloads
        STATUS_PRIMARY: '/api/status.json',
        STATUS_FALLBACK: '/status.json',

        // AI config and inference
        AI_CONFIG: '/api/ai-config',
        INFERENCE: '/api/inference',
        INFERENCE_STATUS: '/api/inference-status',
        INFERENCE_TRIGGER: '/api/inference-trigger',

        // Camera endpoints
        STREAM: '/stream',
        CAPTURE: '/capture',

        // Browser API-client payloads
        DOORS: '/api/status.json',
        MODE: '/api/mode.json',
        FAULTS: '/api/faults.json',
        LOGS: '/api/logs.json'
    };

    const API_POLL_INTERVALS = {
        DOORS: 3000,
        MODE: 5000,
        FAULTS: 5000,
        AI_CONFIG: 5000,
        LOGS: 3000
    };

    window.API_ENDPOINTS = API_ENDPOINTS;
    window.API_POLL_INTERVALS = API_POLL_INTERVALS;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { API_ENDPOINTS, API_POLL_INTERVALS };
    }
})();