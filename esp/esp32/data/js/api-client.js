/**
 * Bank Entrance System - API Client Module
 * 
 * Centralized API fetching with polling support for real-time updates.
 * Handles all communication with JSON endpoint files.
 */

// Import endpoints (inline for browser compatibility)
const API_BASE = 'api';

const Endpoints = {
    DOORS: `${API_BASE}/doors.json`,
    MODE: `${API_BASE}/mode.json`,
    FAULTS: `${API_BASE}/faults.json`,
    AI_CONFIG: `${API_BASE}/ai-config.json`,
    LOGS: `${API_BASE}/logs.json`
};

const Intervals = {
    DOORS: 3000,
    MODE: 5000,
    FAULTS: 5000,
    AI_CONFIG: 3000,
    LOGS: 3000
};

// Active polling intervals storage
const activePollers = {};

/**
 * Fetch data from an API endpoint
 * @param {string} url - The endpoint URL
 * @returns {Promise<object>} - The parsed JSON data
 */
async function fetchAPI(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API Fetch Error [${url}]:`, error);
        return null;
    }
}

/**
 * Fetch door states
 * @returns {Promise<object>} - Door data
 */
async function fetchDoors() {
    return await fetchAPI(Endpoints.DOORS);
}

/**
 * Fetch current operation mode
 * @returns {Promise<object>} - Mode data
 */
async function fetchMode() {
    return await fetchAPI(Endpoints.MODE);
}

/**
 * Fetch fault status
 * @returns {Promise<object>} - Fault data
 */
async function fetchFaults() {
    return await fetchAPI(Endpoints.FAULTS);
}

/**
 * Fetch AI configuration
 * @returns {Promise<object>} - AI config data
 */
async function fetchAiConfig() {
    return await fetchAPI(Endpoints.AI_CONFIG);
}

/**
 * Fetch activity logs
 * @returns {Promise<object>} - Logs data
 */
async function fetchLogs() {
    return await fetchAPI(Endpoints.LOGS);
}

/**
 * Start polling an endpoint
 * @param {string} endpointKey - Key from Endpoints object
 * @param {function} callback - Function to call with data
 * @param {number} interval - Polling interval in ms (optional)
 * @returns {string} - Poller ID for stopping
 */
function startPolling(endpointKey, callback, interval = null) {
    const url = Endpoints[endpointKey];
    const pollInterval = interval || Intervals[endpointKey] || 3000;
    
    if (!url) {
        console.error(`Unknown endpoint: ${endpointKey}`);
        return null;
    }
    
    // Stop existing poller for this endpoint if any
    stopPolling(endpointKey);
    
    // Create new poller
    const pollerId = setInterval(async () => {
        const data = await fetchAPI(url);
        if (data) {
            callback(data);
        }
    }, pollInterval);
    
    activePollers[endpointKey] = pollerId;
    
    // Initial fetch
    (async () => {
        const data = await fetchAPI(url);
        if (data) {
            callback(data);
        }
    })();
    
    return pollerId;
}

/**
 * Stop polling an endpoint
 * @param {string} endpointKey - Key from Endpoints object
 */
function stopPolling(endpointKey) {
    if (activePollers[endpointKey]) {
        clearInterval(activePollers[endpointKey]);
        delete activePollers[endpointKey];
    }
}

/**
 * Stop all active pollers
 */
function stopAllPollers() {
    Object.keys(activePollers).forEach(key => stopPolling(key));
}

/**
 * Add a new log entry (simulated - would need backend for real storage)
 * @param {string} doorName - Door identifier
 * @param {string} action - Action performed
 * @param {string} status - New status
 */
function addLogEntry(doorName, action, status) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    const logEntry = {
        time: timeString,
        door: doorName,
        action: action,
        status: status,
        timestamp: now.toISOString()
    };
    
    // Log to console (in production, would send to server)
    console.log('[LOG]', logEntry);
    
    return logEntry;
}

/**
 * Format timestamp for display
 * @param {string} isoString - ISO timestamp string
 * @returns {string} - Formatted time string
 */
function formatTime(isoString) {
    if (!isoString) return '--:--:--';
    
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    } catch {
        return '--:--:--';
    }
}

// Export functions for global use
window.API = {
    fetchDoors,
    fetchMode,
    fetchFaults,
    fetchAiConfig,
    fetchLogs,
    startPolling,
    stopPolling,
    stopAllPollers,
    addLogEntry,
    formatTime,
    Endpoints,
    Intervals
};