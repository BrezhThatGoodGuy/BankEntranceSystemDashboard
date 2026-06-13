// Check for login status
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    // Redirect to login page if not logged in
    window.location.href = 'login.html';
} else {
// filepath: control.js
// Bank Entrance System - Control Page with API Integration
// Operation mode control and door management

// Navigation functions (shared across pages)
function openMonitorPage(){
    window.location.href = "monitor.html";
}

function openControlPage(){
    window.location.href = "control.html";
}

function openFaultsPage(){
    window.location.href = "faults.html";
}

function openAiPage(){
    window.location.href = "aicontrol.html";
}

function hideSideNavigationBar(){
    const hiddensidebar = '<div class = "hidden-side-navigation-bar"></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = hiddensidebar;
    const clickedmenu = '<img class="navigation-menu" onclick="showSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
    document.querySelector('.js-navigation-menu').innerHTML = clickedmenu;
}

function showSideNavigationBar(){
    const shownsidebar = '<div class = "shown-side-navigation-bar"><div><p>Print Info</p>  <svg class="print-icon" onclick="window.print()" aria-label="Print this page" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg class="phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="#25D366" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a></div><div><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div><p>Log Out</p><svg class="logout-icon" onclick="logout()" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
    const unclickedmenu = '<img class="navigation-menu" onclick="hideSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}

// ============================================
// Door Control Configuration
// ============================================

// Relative URLs (ESP32 serves these pages)
const API_ENDPOINTS = window.API_ENDPOINTS || {};
const ACTION_ENDPOINT = API_ENDPOINTS.ACTION || '/action';
const LOG_ENDPOINT = API_ENDPOINTS.LOGS_BASE || '/log';

function getLogEndpoint(logType) {
    if (API_ENDPOINTS.LOGS_QUERY) return API_ENDPOINTS.LOGS_QUERY(logType);
    return `${LOG_ENDPOINT}?type=${encodeURIComponent(logType)}`;
}

// Store for door actions
let doorActions = [];

// Door states: only two valid values — 'auto-controlled' | 'unlocked'
let doorStates = {
    1: 'auto-controlled',
    2: 'auto-controlled',
    3: 'auto-controlled',
    4: 'auto-controlled'
};

// Current operation mode
let currentMode = 'normal';

// Mode labels for display and transmission to ESP32
const modeLabels = {
    'evacuate': 'Evacuation',
    'normal': 'Normal-Traffic',
    'exit': 'Exit-Only',
    'entrance': 'Entrance-Only',
    'lock': 'Lock-All'
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeDoorButtonStates();
    initializeDoorButtons();
    initializeModeButtons();
    initializeEvacuateButton();
    initializeModeSyncListener();
    initializeApiPolling();
    initializeRefreshButton();
    initializeControlSSE();
    loadLogData();
});

/**
 * Initialize refresh button for logs
 */
function initializeRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadLogData();
        });
    }
}

/**
 * Initialize door button states from HTML classes
 */
function initializeDoorButtonStates() {
    const buttons = document.querySelectorAll('.door-btn');
    buttons.forEach(button => {
        const doorId = button.getAttribute('data-id');
        if (button.classList.contains('unlocked')) {
            doorStates[doorId] = 'unlocked';
        } else {
            doorStates[doorId] = 'auto-controlled';
        }
    });
    console.log('[Control] Door button states initialized:', doorStates);
}

/**
 * Initialize door control buttons
 */
function initializeDoorButtons() {
    const doorButtons = document.querySelectorAll('.door-btn');
    
    doorButtons.forEach(button => {
        button.addEventListener('click', function() {
            const doorId = this.getAttribute('data-id');
            toggleDoor(doorId);
        });
    });
}

/**
 * Initialize operation mode radio buttons
 */
function initializeModeButtons() {
    const modeRadios = document.querySelectorAll('input[name="mode"]');

    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                setOperationMode(this.id);
            }
        });
    });
}

/**
 * Initialize EVACUATE button
 */
function initializeEvacuateButton() {
    const evacuateBtn = document.querySelector('.evacuate');
    if (evacuateBtn) {
        evacuateBtn.addEventListener('click', function() {
            setOperationMode('evacuate');
        });
    }
}

/**
 * Toggle a door between auto-controlled and one-shot unlock.
 * - auto-controlled → unlocked: sends UNLOCK_ONCE to ATmega; ATmega auto-reverts on door close.
 * - unlocked → auto-controlled: operator cancels the pending unlock; sends AUTO to ATmega.
 * @param {string} doorId
 */
function toggleDoor(doorId) {
    const currentState = doorStates[doorId] || 'auto-controlled';
    const nextState = currentState === 'auto-controlled' ? 'unlocked' : 'auto-controlled';

    applyDoorButtonState(doorId, nextState);

    // Map UI state to the command the ESP32/ATmega understand
    const espState = nextState === 'unlocked' ? 'unlock-once' : 'auto';
    sendDoorAction({ door: doorId, action: 'TOGGLE', state: espState, time: new Date().toISOString() });

    if (typeof window.API !== 'undefined') {
        window.API.addLogEntry(`Door ${doorId}`, 'TOGGLE', espState);
    }
}

/**
 * Apply a visual state to a door button and update the doorStates cache.
 * @param {string|number} doorId
 * @param {'auto-controlled'|'unlocked'} state
 */
function applyDoorButtonState(doorId, state) {
    doorStates[doorId] = state;
    const button = document.querySelector(`.door-btn[data-id="${doorId}"]`);
    if (!button) return;

    button.classList.remove('locked', 'unlocked', 'auto-controlled');
    const statusEl = button.querySelector('.door-status');

    if (state === 'unlocked') {
        button.classList.add('unlocked');
        if (statusEl) statusEl.textContent = 'CANCEL';
    } else {
        button.classList.add('auto-controlled');
        if (statusEl) statusEl.textContent = 'UNLOCK';
    }
}

/**
 * Called when ATmega sends DOOR_x_AUTO after completing a one-shot unlock cycle.
 * Reverts the button to auto-controlled without sending a command (ATmega already reverted).
 * @param {number} doorId
 */
function revertDoorToAuto(doorId) {
    if (doorStates[doorId] === 'unlocked') {
        applyDoorButtonState(String(doorId), 'auto-controlled');
        showNotification(`Door ${doorId} reverted to auto-controlled`, 'success');
    }
}

/**
 * Send door action to ESP32 server
 * @param {object} actionData - Action data
 */
function sendDoorAction(actionData) {
    fetch(ACTION_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(actionData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json().catch(() => ({}));
    })
    .then(data => {
        console.log('Server response:', data);
        // Accept either 'ok' (ESP32) or 'logged' (other backends)
        if (data.status === 'logged' || data.status === 'ok') {
            showNotification(`Door ${actionData.door} ${actionData.state.toUpperCase()}!`, 'success');
        } else {
            console.log('[DoorAction] Unrecognized status:', data.status);
        }
    })
    .catch(error => {
        console.log('ESP32 not available, using local mode', error);
        showNotification('Door action could not be sent to ESP32', 'error');
    });
}

/**
 * Send mode action to ESP32 server
 * @param {object} modeData - Mode action data with action and mode fields
 */
function sendModeAction(modeData) {
    fetch(ACTION_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(modeData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json().catch(() => ({}));
    })
    .then(data => {
        console.log('[Mode Change] Server response:', data);
        if (data.status === 'ok' || data.status === 'logged') {
            showNotification(`Mode change sent: ${modeData.mode}`, 'success');
        } else {
            showNotification(`Mode change request returned: ${data.status}`, 'error');
        }
    })
    .catch(error => {
        console.log('[Mode Change] ESP32 not available, mode change logged locally only', error);
        showNotification('Mode change could not be sent to ESP32', 'error');
    });
}

/**
 * Set operation mode
 * @param {string} modeId - Mode ID
 */
function setOperationMode(modeId) {
    currentMode = modeId;
    const modeLabel = modeLabels[modeId] || modeId;
    
    console.log('Operation mode changed to:', modeId, '(', modeLabel, ')');
    
    // Send mode change to ESP32 server
    const modeData = {
        action: 'MODE_CHANGE',
        mode: modeLabel,
        time: new Date().toISOString()
    };
    
    sendModeAction(modeData);
    
    // Update API (for future backend integration)
    if (typeof window.API !== 'undefined') {
        window.API.addLogEntry('System', 'MODE_CHANGE', modeLabel);
    }
    
    // Show notification
    showNotification(`Mode changed to: ${modeLabel}`, 'success');
}

// ============================================
// API Integration for Real-time Updates
// ============================================

/**
 * Initialize mode sync listener for other tabs/pages
 */
function initializeModeSyncListener() {
    window.addEventListener('storage', function(event) {
        if (!event.key || event.key !== 'modeSync') return;
        if (!event.newValue) return;

        try {
            const data = JSON.parse(event.newValue);
            if (data && data.mode) {
                if (data.mode !== currentMode) {
                    setOperationMode(data.mode);
                    const radio = document.getElementById(data.mode);
                    if (radio) {
                        radio.checked = true;
                    }
                }
            }
        } catch (e) {
            console.warn('[Control] Invalid mode sync data', e);
        }
    });
}

/**
 * Initialize API polling
 */
function initializeApiPolling() {
    if (typeof window.API !== 'undefined') {
        // Poll mode every 5 seconds
        window.API.startPolling('MODE', updateModeFromAPI, 5000);
        
        // Poll doors every 3 seconds
        window.API.startPolling('DOORS', updateDoorsFromAPI, 3000);
        
        console.log('[Control] API polling initialized');
    } else {
        console.warn('[Control] API client not loaded');
    }
}

/**
 * Update mode from API data
 * @param {object} data - Mode data from API
 */
function updateModeFromAPI(data) {
    if (!data || !data.mode) return;
    
    if (data.mode !== currentMode) {
        currentMode = data.mode;
        
        // Update radio button
        const radio = document.getElementById(data.mode);
        if (radio) {
            radio.checked = true;
        }
    }
}

/**
 * Update doors from API data (two states only: 'unlocked' or 'auto-controlled')
 * @param {object} data - Door data from API
 */
function updateDoorsFromAPI(data) {
    if (!data || !data.doors) return;

    data.doors.forEach(door => {
        const doorId = door.id;
        // Normalize legacy 'locked' state to 'auto-controlled' for two-state UI
        const rawState = door.state;
        const uiState = (rawState === 'unlocked') ? 'unlocked' : 'auto-controlled';

        if (doorStates[doorId] !== uiState) {
            applyDoorButtonState(String(doorId), uiState);
        }
    });
}

/**
 * Open SSE connection to receive one-shot revert events from the ATmega via ESP32.
 * When the ATmega completes a one-shot cycle it sends DOOR_x_AUTO → ESP32 fires
 * a 'control' SSE event with {type:'auto', doorId:x} → we revert the UI button.
 */
function initializeControlSSE() {
    if (typeof EventSource === 'undefined') return;

    const evtSource = new EventSource('/events');

    evtSource.addEventListener('control', function(e) {
        try {
            const data = JSON.parse(e.data);
            if (data && data.type === 'auto' && data.doorId) {
                revertDoorToAuto(data.doorId);
            }
        } catch (err) {
            console.warn('[ControlSSE] Failed to parse control event:', err);
        }
    });

    evtSource.onerror = function() {
        console.warn('[ControlSSE] SSE connection error — auto-revert notifications will not work until reconnected.');
    };

    console.log('[Control] SSE listener for one-shot revert initialized');
}

// ============================================
// Log Display Functions
// ============================================

function displayLog() {
    const container = document.getElementById('logContainer');
    
    if (!container) return;
    
    if (!doorActions || doorActions.length === 0) {
        container.innerHTML = '<p class="empty-log">No actions recorded yet.</p>';
        return;
    }
    
    let logHTML = '';
    
    for (let i = doorActions.length - 1; i >= 0; i--) {
        const action = doorActions[i];
        // Handle both ESP32 format and local API format
        const time = action.timestamp || action.time || action.Time || '--:--:--';
        const door = action.door || action.message || action.doorId || '-';
        const actionType = action.type || action.action || action.actionType || '-';
        const status = action.status || action.state || '-';
        
        logHTML += `
            <div class="log-entry">
                <div class="log-time">${formatTime(time)}</div>
                <div class="log-clicked">Door: ${door}</div>
                <div class="log-client">Action: ${actionType} - ${status}</div>
            </div>
        `;
    }
    
    container.innerHTML = logHTML;
}

function loadLogData() {
    // First try to fetch from ESP32 server
    fetch(getLogEndpoint('control'))
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        doorActions = data && data.logs ? data.logs : [];
        displayLog();
    })
    .catch(error => {
        // If ESP32 not available, try local API client
        console.log('ESP32 log endpoint not available, trying local API');
        loadLocalLogs();
    });
}

/**
 * Load logs from local API client
 */
function loadLocalLogs() {
    if (typeof window.API !== 'undefined') {
        window.API.fetchLogs().then(data => {
            if (data && data.logs) {
                doorActions = data.logs;
                displayLog();
            } else {
                showLogError();
            }
        }).catch(() => {
            showLogError();
        });
    } else {
        showLogError();
    }
}

function showLogError() {
    const container = document.getElementById('logContainer');
    if (container) {
        container.innerHTML = '<p class="empty-log">Unable to load log data.</p>';
    }
}

function showNotification(message, type) {
    // Create a toast notification instead of alert
    const notification = document.createElement('div');
    notification.className = `toast-notification toast-${type || 'info'}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
    `;
    
    // Add animation keyframes dynamically
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
    
    console.log(`[${type?.toUpperCase() || 'INFO'}] ${message}`);
}

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
}
