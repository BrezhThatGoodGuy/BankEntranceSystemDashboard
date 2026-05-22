/**
 * Bank Entrance System - API Endpoint Definitions
 * 
 * Centralized endpoint URLs for all API interactions.
 * Update the BASE_URL if your API is hosted elsewhere.
 */

// API Base URL - adjust if hosting on different location
const BASE_URL = 'api';

// API Endpoints
const API_ENDPOINTS = {
    // Door endpoints
    DOORS: `${BASE_URL}/doors.json`,
    DOOR_UPDATE: `${BASE_URL}/doors.json`,
    
    // Mode endpoints
    MODE: `${BASE_URL}/mode.json`,
    MODE_UPDATE: `${BASE_URL}/mode.json`,
    
    // Fault endpoints
    FAULTS: `${BASE_URL}/faults.json`,
    FAULTS_UPDATE: `${BASE_URL}/faults.json`,
    
    // AI Config endpoints
    AI_CONFIG: `${BASE_URL}/ai-config.json`,
    AI_CONFIG_UPDATE: `${BASE_URL}/ai-config.json`,
    
    // Logs endpoints
    LOGS: `${BASE_URL}/logs.json`,
    LOGS_UPDATE: `${BASE_URL}/logs.json`
};

// Polling intervals (in milliseconds)
const POLL_INTERVALS = {
    DOORS: 3000,      // 3 seconds for door states
    MODE: 5000,       // 5 seconds for mode
    FAULTS: 5000,    // 5 seconds for faults
    AI_CONFIG: 3000, // 3 seconds for AI config
    LOGS: 3000       // 3 seconds for logs
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_ENDPOINTS, POLL_INTERVALS, BASE_URL };
}