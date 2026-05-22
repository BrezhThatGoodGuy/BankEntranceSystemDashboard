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

function openAiControlPage(){
    window.location.href = "aicontrol.html";
}

function hideSideNavigationBar(){
    const hiddensidebar = '<div class = "hidden-side-navigation-bar"></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = hiddensidebar;
    const clickedmenu = '<img class="navigation-menu" onclick="showSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
    document.querySelector('.js-navigation-menu').innerHTML = clickedmenu;
}

function showSideNavigationBar(){
    const shownsidebar = '<div class = "shown-side-navigation-bar"><div><p>Print Info</p>  <svg class="print-icon" onclick="window.print()" aria-label="Print this page" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg class="phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="#25D366" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a></div><div><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div>Log Out</div></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
    const unclickedmenu = '<img class="navigation-menu" onclick="hideSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}

// ============================================
// Door Control Configuration
// ============================================

// ESP32 Server Configuration (for hardware integration)
const ESP32_SERVER = 'http://192.168.1.100';
const ACTION_ENDPOINT = ESP32_SERVER + '/action';
const LOG_ENDPOINT = ESP32_SERVER + '/log';

// Store for door actions
let doorActions = [];

// Door states storage
let doorStates = {
    1: 'locked',
    2: 'locked',
    3: 'locked',
    4: 'locked'
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
    // Initialize door button states from HTML classes
    initializeDoorButtonStates();
    initializeDoorButtons();
    initializeModeButtons();
    initializeApiPolling();
    // Initialize log refresh button
    initializeRefreshButton();
    // Load initial log data
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
 * This ensures buttons work even without API
 */
function initializeDoorButtonStates() {
    const buttons = document.querySelectorAll('.door-btn');
    buttons.forEach(button => {
        const doorId = button.getAttribute('data-id');
        
        // Determine current state from class
        if (button.classList.contains('locked')) {
            doorStates[doorId] = 'locked';
        } else if (button.classList.contains('unlocked')) {
            doorStates[doorId] = 'unlocked';
        } else if (button.classList.contains('auto-controlled')) {
            doorStates[doorId] = 'auto-controlled';
        } else {
            doorStates[doorId] = 'locked';
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

 * @param {string} doorId - Door ID
 */
function toggleDoor(doorId) {
    const currentState = doorStates[doorId] || 'locked';
    
    let nextState;
    if (currentState === 'locked') {
        nextState = 'unlocked';
    } else if (currentState === 'unlocked') {
        nextState = 'auto-controlled';
    } else {
        nextState = 'locked';
    }
    
    doorStates[doorId] = nextState;
    
    // Update the button appearance
    const button = document.querySelector(`.door-btn[data-id="${doorId}"]`);
    
    if (button) {
        button.classList.remove('locked', 'unlocked', 'auto-controlled');
        
        if (nextState === 'unlocked') {
            button.classList.add('unlocked');
            const statusEl = button.querySelector('.door-status');
            if (statusEl) statusEl.textContent = 'UNLOCKED';
        } else if (nextState === 'locked') {
            button.classList.add('locked');
            const statusEl = button.querySelector('.door-status');
            if (statusEl) statusEl.textContent = 'LOCKED';
        } else if (nextState === 'auto-controlled') {
            button.classList.add('auto-controlled');
            const statusEl = button.querySelector('.door-status');
            if (statusEl) statusEl.textContent = 'AUTO-CONTROLLED';
        }
    }

    console.log('Door toggled:', doorId, nextState);
    
    // Log the action
    const actionData = {
        door: doorId,
        action: 'TOGGLE',
        state: nextState,
        time: new Date().toISOString()
    };
    
    // Try to send to ESP32 server
    sendDoorAction(actionData);
    
    // Also log locally
    if (typeof window.API !== 'undefined') {
        window.API.addLogEntry(`Door ${doorId}`, 'TOGGLE', nextState);
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
    .then(response => response.json())
    .then(data => {
        console.log('Server response:', data);
        if (data.status === 'logged') {
            showNotification(`Door ${actionData.door} ${actionData.state.toUpperCase()}!`, 'success');
        }
    })
    .catch(error => {
        console.log('ESP32 not available, using local mode');
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
    .then(response => response.json())
    .then(data => {
        console.log('[Mode Change] Server response:', data);
    })
    .catch(error => {
        console.log('[Mode Change] ESP32 not available, mode change logged locally only');
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
 * Update doors from API data
 * @param {object} data - Door data from API
 */
function updateDoorsFromAPI(data) {
    if (!data || !data.doors) return;
    
    data.doors.forEach(door => {
        const doorId = door.id;
        const newState = door.state;
        
        // Only update if state changed
        if (doorStates[doorId] !== newState) {
            doorStates[doorId] = newState;
            
            // Update button appearance
            const button = document.querySelector(`.door-btn[data-id="${doorId}"]`);
            if (button) {
                button.classList.remove('locked', 'unlocked', 'auto-controlled');
                button.classList.add(newState);
                
                const statusEl = button.querySelector('.door-status');
                if (statusEl) {
                    statusEl.textContent = newState.toUpperCase();
                }
            }
        }
    });
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
    fetch(`${LOG_ENDPOINT}?type=control`)
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