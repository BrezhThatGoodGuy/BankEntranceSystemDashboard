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
    const clickedmenu = '<svg class="navigation-menu" onclick="showSideNavigationBar()" viewBox="0 0 24 18" width="30" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" role="button" aria-label="Open menu"><line x1="0" y1="1" x2="24" y2="1"/><line x1="0" y1="9" x2="24" y2="9"/><line x1="0" y1="17" x2="24" y2="17"/></svg>';
    document.querySelector('.js-navigation-menu').innerHTML = clickedmenu;
}

function showSideNavigationBar(){
    const shownsidebar = '<div class = "shown-side-navigation-bar"><div onclick="openPrintLogsDialog()"><p>Print Info</p>  <svg class="print-icon" aria-label="Print this page" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="34" height="34" stroke="none"><circle cx="16" cy="16" r="16" fill="#25D366"/><path fill="#FFFFFF" d="M16 6.5c-5.2 0-9.5 4-9.5 9c0 1.8.6 3.5 1.7 5L7 25.5l5.2-1.6c1.2.6 2.5.9 3.8.9 5.2 0 9.5-4 9.5-9s-4.3-9.3-9.5-9.3z"/><path fill="#25D366" d="M13.3 11.2c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.7.1-.9.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.3 3.2.2.2 2.2 3.4 5.4 4.7 2.7 1.1 3.2.9 3.8.8.6-.1 1.8-.8 2-1.5 .3-.7.3-1.3.2-1.5-.1-.2-.5-.3-1.1-.6-.6-.3-1.4-.7-1.6-.8-.2-.1-.5-.1-.7.2 -.2.3-.8.8-1 .9-.2.1-.4.1-.7 0-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.5-1.8-1.7-2.1 -.2-.3 0-.5.1-.7.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2.1-.4 0-.6 -.1-.2-.7-1.7-.9-2.3z"/></svg></a></div><div onclick="showThemeSettings()"><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div><p>Log Out</p><svg class="logout-icon" onclick="logout()" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
    const unclickedmenu = '<svg class="navigation-menu" onclick="hideSideNavigationBar()" viewBox="0 0 24 18" width="30" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" role="button" aria-label="Close menu"><line x1="0" y1="1" x2="24" y2="1"/><line x1="0" y1="9" x2="24" y2="9"/><line x1="0" y1="17" x2="24" y2="17"/></svg>';
    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}

// ============================================
// Theme
// ============================================

function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name === 'light' ? 'light' : 'dark');
}

function toggleTheme(name) {
    localStorage.setItem('systemTheme', name);
    applyTheme(name);
    document.querySelectorAll('.theme-item').forEach(el => {
        el.classList.toggle('active', el.dataset.theme === name);
    });
}

function showThemeSettings() {
    const current = localStorage.getItem('systemTheme') || 'dark';
    document.querySelector('.js-side-navigation-bar').innerHTML = `
        <div class="theme-panel">
            <div class="theme-panel-heading">Set Theme</div>
            <div class="theme-item ${current === 'dark' ? 'active' : ''}" data-theme="dark" onclick="toggleTheme('dark')">
                <svg class="theme-tick-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8.5 6 12 13.5 4"/></svg>
                <span>Dark</span>
            </div>
            <div class="theme-item ${current === 'light' ? 'active' : ''}" data-theme="light" onclick="toggleTheme('light')">
                <svg class="theme-tick-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8.5 6 12 13.5 4"/></svg>
                <span>Light</span>
            </div>
        </div>`;
    setTimeout(() => document.addEventListener('click', _themePanelOutside), 0);
}

function _themePanelOutside(e) {
    if (!document.querySelector('.theme-panel')?.contains(e.target)) {
        document.removeEventListener('click', _themePanelOutside);
        hideSideNavigationBar();
    }
}

function closeThemeSettings() {
    document.removeEventListener('click', _themePanelOutside);
    hideSideNavigationBar();
}

(function () {
    const saved = localStorage.getItem('systemTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
}());

// ============================================
// Door Control Configuration
// ============================================

// Relative URLs (ESP32 serves these pages)
const API_ENDPOINTS = window.API_ENDPOINTS || {};
const ACTION_ENDPOINT = API_ENDPOINTS.ACTION || '/action';
const LOG_ENDPOINT = API_ENDPOINTS.LOGS_BASE || '/log';

function getActiveUser() {
    return sessionStorage.getItem('username') || 'Unknown';
}

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
    initCapacityCard();
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
        time: new Date().toISOString(),
        user: getActiveUser()
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
        // Fetch immediately so the UI reflects the current ESP32 state without waiting
        window.API.fetchMode().then(data => { if (data) updateModeFromAPI(data); });

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

    evtSource.addEventListener('status', function(e) {
        try {
            updateCapacityCard(JSON.parse(e.data));
        } catch (err) {
            console.warn('[ControlSSE] Failed to parse status event:', err);
        }
    });

    evtSource.addEventListener('mode', function(e) {
        try {
            const data = JSON.parse(e.data);
            if (data && data.mode) {
                updateModeFromAPI(data);
            }
        } catch (err) {
            console.warn('[ControlSSE] Failed to parse mode event:', err);
        }
    });

    evtSource.onerror = function() {
        console.warn('[ControlSSE] SSE connection error — auto-revert notifications will not work until reconnected.');
    };

    console.log('[Control] SSE listener for one-shot revert initialized');
}

// ============================================
// Capacity Control Card
// ============================================

function updateCapacityCard(data) {
    const insideEl = document.getElementById('cap-inside');
    const totalEl  = document.getElementById('cap-total');
    const inputEl  = document.getElementById('max-inside-input');
    const msgEl    = document.getElementById('cap-status-msg');

    const inside = data.inside !== undefined ? data.inside : null;
    const max    = data.max_inside !== undefined ? data.max_inside : 0;

    if (insideEl && inside !== null) {
        insideEl.textContent = inside;
        insideEl.classList.remove('cap-at-limit', 'cap-near-limit');
        if (max > 0) {
            const pct = inside / max;
            if (inside >= max)   insideEl.classList.add('cap-at-limit');
            else if (pct >= 0.8) insideEl.classList.add('cap-near-limit');
        }
    }

    if (totalEl && data.entries !== undefined) totalEl.textContent = data.entries;

    if (inputEl && max > 0 && !inputEl.matches(':focus')) {
        inputEl.value = max;
    }

    if (msgEl) {
        if (max > 0 && inside !== null) {
            const pct = Math.round((inside / max) * 100);
            if (inside >= max) {
                msgEl.textContent = `Capacity reached (${inside}/${max}) — Exit-Only mode enforced`;
                msgEl.className = 'cap-status-msg cap-critical';
            } else if (pct >= 80) {
                msgEl.textContent = `${pct}% capacity — approaching limit (${inside}/${max})`;
                msgEl.className = 'cap-status-msg cap-warning';
            } else {
                msgEl.textContent = '';
                msgEl.className = 'cap-status-msg';
            }
        } else {
            msgEl.textContent = '';
            msgEl.className = 'cap-status-msg';
        }
    }
}

function initCapacityCard() {
    const saveBtn = document.getElementById('max-inside-save');
    const inputEl = document.getElementById('max-inside-input');
    if (!saveBtn || !inputEl) return;

    saveBtn.addEventListener('click', function() {
        const val = parseInt(inputEl.value, 10);
        if (isNaN(val) || val < 1) {
            showNotification('Enter a valid number greater than 0', 'error');
            return;
        }
        fetch(ACTION_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'SET_MAX_INSIDE', value: String(val), user: getActiveUser() })
        })
        .then(r => r.ok ? r.json().catch(() => ({})) : Promise.reject(r.status))
        .then(() => showNotification(`Maximum inside set to ${val}`, 'success'))
        .catch(() => showNotification('Failed to set maximum — ESP32 not reachable', 'error'));
    });

    // Fetch initial state from status endpoint
    fetch('/api/status.json')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => updateCapacityCard(data))
        .catch(() => {});
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
    const entries = doorActions.slice(-10).reverse();
    container.innerHTML = entries.map(action => {
        const time = formatTime(action.timestamp || action.time || action.Time || '');
        const msg  = action.message ||
            [action.door || action.doorId, action.type || action.action, action.status || action.state]
            .filter(Boolean).join(' — ');
        return `<div class="log-entry"><span class="log-time">${time}</span>  ${msg}</div>`;
    }).join('');
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
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return '--:--:--';
    }
}

// ============================================
// Print Logs Dialog
// ============================================

const ESP_LOG_FILE_CONFIG = [
    { key: 'monitoring', label: 'Monitoring Logs', url: '/logs/monitoring.txt' },
    { key: 'control',    label: 'Control Logs',    url: '/logs/control.txt'    },
    { key: 'faults',     label: 'Faults Logs',     url: '/logs/faults.txt'     },
    { key: 'ai',         label: 'AI Logs',          url: '/logs/ai.txt'         }
];

function escapeHTML(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function openPrintLogsDialog() {
    closePrintLogsDialog();
    const items = ESP_LOG_FILE_CONFIG.map(f =>
        `<label class="print-checkbox-label">
            <input type="checkbox" class="log-file-checkbox" value="${f.key}" checked>
            <span>${f.label}</span>
        </label>`
    ).join('');

    document.body.insertAdjacentHTML('beforeend', `
        <div id="printSelectionModal" class="print-modal-overlay" onclick="closePrintLogsDialog(event)">
            <div class="print-modal-card" onclick="event.stopPropagation()">
                <div class="print-modal-header">
                    <h3>Select logs to print</h3>
                    <button type="button" class="close-modal-btn" onclick="closePrintLogsDialog()">X</button>
                </div>
                <div class="print-modal-body">
                    <p>Select one or more log files then press PRINT.</p>
                    <div class="print-checkbox-grid">${items}</div>
                    <div id="printSelectionError" class="print-error-message"></div>
                </div>
                <div class="print-modal-actions">
                    <button type="button" class="btn-cancel" onclick="closePrintLogsDialog()">CANCEL</button>
                    <button type="button" class="btn-print" onclick="printSelectedLogFiles()">PRINT</button>
                </div>
            </div>
        </div>`);
}

function closePrintLogsDialog(event) {
    if (event && event.target.id !== 'printSelectionModal') return;
    ['printSelectionModal', 'printableLogsArea'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
}

function printSelectedLogFiles() {
    const keys = [...document.querySelectorAll('.log-file-checkbox:checked')].map(el => el.value);
    const errEl = document.getElementById('printSelectionError');
    if (!keys.length) { if (errEl) errEl.textContent = 'Please select at least one log file.'; return; }
    if (errEl) errEl.textContent = '';
    const selected = ESP_LOG_FILE_CONFIG.filter(f => keys.includes(f.key));
    Promise.all(selected.map(f =>
        fetch(f.url, { cache: 'no-store', headers: { Accept: 'text/plain' } })
            .then(r => r.ok ? r.text() : Promise.reject(`Cannot load ${f.label}`))
            .then(text => ({ ...f, text }))
    ))
    .then(files => { closePrintLogsDialog(); buildAndPrintLogs(files); })
    .catch(err => { if (errEl) errEl.textContent = String(err); });
}

function buildAndPrintLogs(files) {
    const existing = document.getElementById('printableLogsArea');
    if (existing) existing.remove();
    const sections = files.map(f =>
        `<section class="printable-log-file"><h2>${f.label}</h2><pre>${escapeHTML(f.text)}</pre></section>`
    ).join('');
    document.body.insertAdjacentHTML('beforeend', `
        <div id="printableLogsArea" class="printable-log-area active">
            <div class="printable-logs-header">
                <h1>ESP Log Printout</h1>
                <p>${files.map(f => f.label).join(', ')}</p>
                <p>${new Date().toLocaleString()}</p>
            </div>
            ${sections}
        </div>`);
    window.addEventListener('afterprint', () => {
        const el = document.getElementById('printableLogsArea');
        if (el) el.remove();
    }, { once: true });
    window.print();
}

}
