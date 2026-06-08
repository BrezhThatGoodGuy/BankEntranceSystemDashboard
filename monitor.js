// Check for login status
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    // Redirect to login page if not logged in
    window.location.href = 'login.html';
} else {
    const storedUsername = sessionStorage.getItem('username') || '';
    const usernameInitial = storedUsername.trim().charAt(0).toUpperCase() || '';
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = usernameInitial;
    }
// filepath: monitor.js
// Bank Entrance System - Monitor Page with API Integration
// Real-time door state monitoring and activity logs

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
    const shownsidebar = '<div class = "shown-side-navigation-bar"><div onclick="openPrintLogsDialog()"><p>Print Info</p>  <svg class="print-icon" aria-label="Open print log selector" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg class="phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="#25D366" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a></div><div><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div><p>Log Out</p><svg class="logout-icon" onclick="logout()" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
    const unclickedmenu = '<img class="navigation-menu" onclick="hideSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}

function pollESP32MonitoringLogs() {
    fetch(`/log?type=monitoring`, { cache: 'no-store' })
        .then(response => {
            if (!response.ok) {
                throw new Error('ESP32 log fetch failed');
            }
            return response.json();
        })
        .then(updateLogsFromAPI)
        .catch(() => {
            if (typeof window.API !== 'undefined') {
                window.API.fetchLogs().then(updateLogsFromAPI);
            }
        });
}

function updateMonitorCountersFromStatus(data) {
    if (!data) return;

    const uptimeElement = document.getElementById('system-uptime');
    const entriesElement = document.getElementById('total-entries');
    const exitsElement = document.getElementById('total-exits');
    const insideElement = document.getElementById('clients-inside');

    if (uptimeElement && typeof data.uptime !== 'undefined') {
        uptimeElement.textContent = normalizeTimestamp(data.uptime);
    }
    if (entriesElement && typeof data.entries !== 'undefined') {
        entriesElement.textContent = data.entries;
    }
    if (exitsElement && typeof data.exits !== 'undefined') {
        exitsElement.textContent = data.exits;
    }
    if (insideElement && typeof data.inside !== 'undefined') {
        insideElement.textContent = data.inside;
    }

    if (Array.isArray(data.doors)) {
        updateDoorStatesFromAPI(data, { logChanges: false });
    }
}

function pollESP32Status() {
    const tryStatus = (url) => fetch(url, { cache: 'no-store' })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Status fetch failed: ${response.status}`);
            }
            return response.json();
        });

    tryStatus('/api/status.json')
        .catch(() => tryStatus('/status.json'))
        .then(updateMonitorCountersFromStatus)
        .catch((error) => {
            console.warn('[Monitor] Status polling failed', error);
        });
}

// Live CCTV image refresh
function refreshImage() {
    const imgElement = document.querySelector('.live-image-container');
    if (imgElement) {
        const timestamp = new Date().getTime();
        imgElement.src = `/stream?t=${timestamp}`;
    }
}

setInterval(refreshImage, 200);

// ============================================
// Door Configuration & State Management
// ============================================

// Door mapping: doorId -> {name, position, magContactClass, lockIconSelector}
const DOOR_CONFIG = {
    1: {
        name: 'ENT.D1',
        label: 'Outside Entrance',
        position: 'entrance',
        type: 'outside',
        magContactClasses: {
            open: 'outside-entrance-opened',
            closed: 'outside-entrance-closed'
        },
        lockIconSelector: '#ent-d1-lock-icon',
        lockIconClass: 'ent-d1-lock-icon'
    },
    2: {
        name: 'ENT.D2',
        label: 'Inside Entrance',
        position: 'entrance',
        type: 'inside',
        magContactClasses: {
            open: 'inside-entrance-opened',
            closed: 'inside-entrance-closed'
        },
        lockIconSelector: '#ent-d2-lock-icon',
        lockIconClass: 'ent-d2-lock-icon'
    },
    3: {
        name: 'EXT.D3',
        label: 'Inside Exit',
        position: 'exit',
        type: 'inside',
        magContactClasses: {
            open: 'inside-exit-opened',
            closed: 'inside-exit-closed'
        },
        lockIconSelector: '#ext-d3-lock-icon',
        lockIconClass: 'ext-d3-lock-icon'
    },
    4: {
        name: 'EXT.D4',
        label: 'Outside Exit',
        position: 'exit',
        type: 'outside',
        magContactClasses: {
            open: 'outside-exit-opened',
            closed: 'outside-exit-closed'
        },
        lockIconSelector: '#ext-d4-lock-icon',
        lockIconClass: 'ext-d4-lock-icon'
    }
};

// Store current door states
let currentDoorStates = {
    1: { state: 'closed', locked: true },
    2: { state: 'closed', locked: true },
    3: { state: 'closed', locked: true },
    4: { state: 'closed', locked: true }
};

let monitorEventSource = null;
let fallbackPollingStarted = false;

function setAttributes(element, attributes) {
    if (!element || !attributes) return;
    Object.entries(attributes).forEach(([key, value]) => {
        if (value === null || typeof value === 'undefined') {
            element.removeAttribute(key);
        } else {
            element.setAttribute(key, String(value));
        }
    });
}

function normalizeDoorState(state) {
    const value = String(state || '').trim().toLowerCase();
    if (value === 'open' || value === 'opened') return 'opened';
    if (value === 'close' || value === 'closed') return 'closed';
    return value;
}

function normalizeTimestamp(value) {
    if (value === null || typeof value === 'undefined' || value === '') {
        return new Date().toLocaleTimeString([], { hour12: false });
    }

    const raw = String(value).trim();
    if (/^\d{1,6}:\d{2}:\d{2}$/.test(raw)) return raw;

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString([], { hour12: false });
    }

    const timeMatch = raw.match(/(\d{1,6}:\d{2}:\d{2})/);
    if (timeMatch) return timeMatch[1];

    return new Date().toLocaleTimeString([], { hour12: false });
}

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseDoorEvent(input) {
    if (!input) return null;

    if (typeof input === 'object') {
        const doorId = Number(input.doorId ?? input.id ?? input.door);
        const state = normalizeDoorState(input.state ?? input.status ?? input.action);
        if (doorId >= 1 && doorId <= 4 && (state === 'opened' || state === 'closed')) {
            return {
                doorId,
                state,
                locked: typeof input.locked === 'boolean' ? input.locked : currentDoorStates[doorId]?.locked,
                timestamp: input.timestamp || input.time,
                message: input.message || `Door ${doorId} ${state}`,
                raw: input.raw || input.message || ''
            };
        }
    }

    const text = typeof input === 'string' ? input : (input.message || JSON.stringify(input));
    const match = text.match(/door\s*_?\s*(\d)\s*(?:_|\s|-)*(opened|open|closed|close)/i);
    if (!match) return null;

    const doorId = Number(match[1]);
    const state = normalizeDoorState(match[2]);
    if (doorId < 1 || doorId > 4 || (state !== 'opened' && state !== 'closed')) return null;

    return {
        doorId,
        state,
        locked: currentDoorStates[doorId]?.locked,
        timestamp: input.timestamp || input.time,
        message: `Door ${doorId} ${state}`,
        raw: text
    };
}

// ============================================
// Door State Visualization Functions
// ============================================

/**
 * Update the bank-booth-template classes based on door state
 * Shows only the appropriate class (open or closed) for each door
 * @param {number} doorId - Door ID
 * @param {string} state - 'open' or 'closed'
 */
function updateDoorMagContactUI(doorId, state) {
    if (!DOOR_CONFIG[doorId]) return;
    
    const config = DOOR_CONFIG[doorId];
    const boothTemplate = document.querySelector('.bank-booth-template');
    const normalizedState = normalizeDoorState(state);
    
    if (!boothTemplate) return;
    
    const openedElement = boothTemplate.querySelector(`.${config.magContactClasses.open}`);
    const closedElement = boothTemplate.querySelector(`.${config.magContactClasses.closed}`);
    const isOpen = normalizedState === 'opened';

    // Remove both open and closed state classes for this door, then add the current one.
    boothTemplate.classList.remove(config.magContactClasses.open);
    boothTemplate.classList.remove(config.magContactClasses.closed);
    const stateClass = isOpen ? config.magContactClasses.open : config.magContactClasses.closed;
    boothTemplate.classList.add(stateClass);

    // The visual bars are child elements, so update their attributes/styles directly too.
    if (openedElement) {
        openedElement.style.display = isOpen ? 'block' : 'none';
        setAttributes(openedElement, {
            'aria-hidden': isOpen ? 'false' : 'true',
            'data-door-id': doorId,
            'data-door-state': isOpen ? 'active' : 'inactive'
        });
    }
    if (closedElement) {
        closedElement.style.display = isOpen ? 'none' : 'block';
        setAttributes(closedElement, {
            'aria-hidden': isOpen ? 'true' : 'false',
            'data-door-id': doorId,
            'data-door-state': isOpen ? 'inactive' : 'active'
        });
    }

    setAttributes(boothTemplate, {
        [`data-door-${doorId}-state`]: normalizedState,
        'data-last-door-update': Date.now()
    });
    
    console.log(`[${config.name}] MagContact state updated: ${normalizedState.toUpperCase()} | Class: ${stateClass}`);
}

/**
 * Update the lock icon (padlock image) for a door
 * Shows unlocked icon if locked=false (digitalWrite(DOORxG, HIGH))
 * Shows locked icon if locked=true (digitalWrite(DOORxR, HIGH))
 * @param {number} doorId - Door ID
 * @param {boolean} locked - true = locked (red), false = unlocked (green)
 */
function updateDoorLockIcon(doorId, locked) {
    if (!DOOR_CONFIG[doorId]) return;
    
    const config = DOOR_CONFIG[doorId];
    const lockIcon = document.querySelector(config.lockIconSelector);
    
    if (!lockIcon) {
        console.warn(`Lock icon not found for ${config.name} (selector: ${config.lockIconSelector})`);
        return;
    }
    
    // Update image src and alt text based on locked state
    const imageSrc = locked ? 'locked-padlock.png' : 'unlocked-padlock.png';
    const altText = locked ? `${config.name} - Locked` : `${config.name} - Unlocked`;
    
    lockIcon.src = imageSrc;
    lockIcon.alt = altText;
    
    // Add visual feedback class
    lockIcon.classList.remove('unlocked', 'locked');
    lockIcon.classList.add(locked ? 'locked' : 'unlocked');
    
    console.log(`[${config.name}] Lock icon updated: ${locked ? 'LOCKED' : 'UNLOCKED'} | Icon: ${imageSrc}`);
}

/**
 * Update UI for a specific door based on its complete state
 * Handles both MagContact state and lock status
 * @param {number} doorId - Door ID
 * @param {object} doorData - Door data from API
 */
function updateDoorUI(doorId, doorData) {
    if (!doorData) return;
    
    const config = DOOR_CONFIG[doorId];
    if (!config) {
        console.warn(`Door configuration not found for door ID: ${doorId}`);
        return;
    }
    
    // Update MagContact state visualization (open/closed door indicators)
    if (typeof doorData.state !== 'undefined') {
        updateDoorMagContactUI(doorId, doorData.state);
    }
    
    // Update lock icon visualization (locked/unlocked padlock)
    if (typeof doorData.locked !== 'undefined') {
        updateDoorLockIcon(doorId, doorData.locked);
    }
}

/**
 * Initialize all door UI elements with current states
 */
function initializeDoorStates() {
    Object.keys(currentDoorStates).forEach(doorId => {
        const doorId_num = parseInt(doorId);
        const doorState = currentDoorStates[doorId_num];
        
        if (DOOR_CONFIG[doorId_num]) {
            updateDoorMagContactUI(doorId_num, doorState.state);
            updateDoorLockIcon(doorId_num, doorState.locked);
        }
    });
    
    console.log('[Monitor] Door states initialized');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `toast-notification toast-${type || 'info'}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? 'rgba(46, 204, 113, 0.9)' : type === 'error' ? 'rgba(231, 76, 60, 0.9)' : 'rgba(52, 152, 219, 0.9)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
    `;
    
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
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Initialize API polling when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeDoorStates();
    initializeEvacuateButton();
    initializeApiPolling();
});

const ACTION_ENDPOINT = '/action';
const modeLabels = {
    'evacuate': 'Evacuation',
    'normal': 'Normal-Traffic',
    'exit': 'Exit-Only',
    'entrance': 'Entrance-Only',
    'lock': 'Lock-All'
};

function initializeEvacuateButton() {
    const evacuateBtn = document.querySelector('.evacuate');
    if (evacuateBtn) {
        evacuateBtn.addEventListener('click', function() {
            setOperationMode('evacuate');
        });
    }
}

function setOperationMode(modeId) {
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
    
    // Sync with other pages (e.g. control page)
    localStorage.setItem('modeSync', JSON.stringify({ mode: modeId, timestamp: Date.now() }));
}

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
 * Initialize API polling for real-time updates
 */
function initializeApiPolling() {
    pollESP32MonitoringLogs();
    pollESP32Status();

    if (startMonitorEventStream()) {
        console.log('[Monitor] Event-driven updates initialized via /events');
    } else {
        startFallbackPolling();
    }
}

function startMonitorEventStream() {
    if (!('EventSource' in window)) {
        console.warn('[Monitor] EventSource not supported by this browser');
        return false;
    }

    monitorEventSource = new EventSource('/events');

    monitorEventSource.addEventListener('open', () => {
        console.log('[Monitor] Connected to ESP32 event stream');
    });

    monitorEventSource.addEventListener('door', (event) => {
        try {
            applyDoorEvent(JSON.parse(event.data), { addLog: true });
        } catch (error) {
            console.warn('[Monitor] Bad door event payload', error, event.data);
        }
    });

    monitorEventSource.addEventListener('status', (event) => {
        try {
            updateMonitorCountersFromStatus(JSON.parse(event.data));
        } catch (error) {
            console.warn('[Monitor] Bad status event payload', error, event.data);
        }
    });

    monitorEventSource.onerror = (error) => {
        console.warn('[Monitor] Event stream disconnected; browser will retry automatically', error);
        startFallbackPolling();
    };

    return true;
}

function startFallbackPolling() {
    if (fallbackPollingStarted) return;
    fallbackPollingStarted = true;
    console.warn('[Monitor] Falling back to GET polling because /events is unavailable');
    setInterval(pollESP32MonitoringLogs, 3000);
    setInterval(pollESP32Status, 3000);
}

function applyDoorEvent(eventData, options = {}) {
    const parsed = parseDoorEvent(eventData);
    if (!parsed) return;

    const previous = currentDoorStates[parsed.doorId] || { state: 'closed', locked: true };
    const nextState = {
        state: parsed.state,
        locked: typeof parsed.locked === 'boolean' ? parsed.locked : previous.locked
    };

    currentDoorStates[parsed.doorId] = nextState;
    updateDoorUI(parsed.doorId, nextState);

    if (options.addLog) {
        addLogEntryToUI({
            time: parsed.timestamp,
            door: DOOR_CONFIG[parsed.doorId]?.name || `Door ${parsed.doorId}`,
            action: 'status changed to',
            status: parsed.state,
            message: parsed.message
        });
    }
}

/**
 * Update door states from API data
 * @param {object} data - Door data from API
 */
function updateDoorStatesFromAPI(data, options = {}) {
    if (!data || !data.doors) return;
    const shouldLogChanges = options.logChanges === true;
    
    data.doors.forEach(door => {
        const doorId = Number(door.id);
        if (!DOOR_CONFIG[doorId]) return;
        const previousState = currentDoorStates[doorId];
        const normalizedState = normalizeDoorState(door.state || previousState?.state || 'closed');
        
        // Update stored state
        currentDoorStates[doorId] = {
            state: normalizedState,
            locked: typeof door.locked === 'boolean' ? door.locked : previousState?.locked
        };
        
        // Update UI elements (both MagContact and lock icon)
        updateDoorUI(doorId, currentDoorStates[doorId]);
        
        // Log state changes
        if (shouldLogChanges && previousState && previousState.state !== normalizedState) {
            logDoorStateChange(door.name, normalizedState);
            if (typeof window.API !== 'undefined') {
                window.API.addLogEntry(door.name, 'STATE_CHANGE', normalizedState);
            }
        }
        
        // Log lock status changes
        if (shouldLogChanges && previousState && typeof door.locked === 'boolean' && previousState.locked !== door.locked) {
            const lockStatus = door.locked ? 'LOCKED' : 'UNLOCKED';
            logDoorStateChange(door.name, `Lock: ${lockStatus}`);
        }
    });
}

/**
 * Update logs from API data
 * @param {object} data - Logs data from API
 */
function updateLogsFromAPI(data) {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) return;

    if (!data || !Array.isArray(data.logs) || data.logs.length === 0) {
        logContainer.innerHTML = '<div class="empty-log">No recent door activity...</div>';
        return;
    }
    
    data.logs.forEach(log => {
        const parsedEvent = parseDoorEvent(log);
        if (parsedEvent) {
            applyDoorEvent(parsedEvent, { addLog: false });
        }
    });

    const logs = data.logs.slice(-12).reverse();
    let html = '';
    logs.forEach(log => {
        const time = normalizeTimestamp(log.timestamp || log.time || log.Time);
        const message = log.message || log.action || log.status || log.door || JSON.stringify(log);
        html += `
            <div class="log-entry">
                <span class="log-time">[${escapeHTML(time)}]</span>
                <span class="log-clicked">${escapeHTML(message)}</span>
            </div>
        `;
    });
    logContainer.innerHTML = html;
}

/**
 * Add a log entry to the UI
 * @param {object} log - Log entry data
 */
function addLogEntryToUI(log) {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) return;
    const time = normalizeTimestamp(log.time || log.timestamp);
    const door = log.door || 'Door';
    const action = log.action || 'status changed to';
    const status = log.status || log.state || '';
    
    const emptyLog = logContainer.querySelector('.empty-log');
    if (emptyLog) emptyLog.remove();

    const newLog = document.createElement('div');
    newLog.className = 'log-entry';
    newLog.setAttribute('data-time', time);
    
    newLog.innerHTML = `
        <span class="log-time">[${escapeHTML(time)}]</span> 
        <span class="log-clicked">${escapeHTML(door)}</span> 
        ${escapeHTML(action)} <span class="log-client">${escapeHTML(status)}</span>
    `;
    
    logContainer.insertBefore(newLog, logContainer.firstChild);
    
    // Keep only last 50 logs
    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// ============================================
// Log Functions (from original code)
// ============================================

function logDoorStateChange(doorName, newState) {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) return;
    
    // Remove the "empty log" message if it's the first entry
    const emptyLog = document.querySelector('.empty-log');
    if (emptyLog) {
        emptyLog.remove();
    }

    const timeString = normalizeTimestamp();

    // Create the new log entry div
    const newLog = document.createElement('div');
    newLog.className = 'log-entry';
    
    // Build the log message using your existing CSS classes
    newLog.innerHTML = `
        <span class="log-time">[${escapeHTML(timeString)}]</span> 
        <span class="log-clicked">${escapeHTML(doorName)}</span> 
        status changed to <span class="log-client">${escapeHTML(newState)}</span>
    `;

    // Prepend so the newest log appears at the top
    logContainer.insertBefore(newLog, logContainer.firstChild);

    // Optional: Keep only the last 50 logs so the page doesn't get overloaded
    if (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function clearLogs() {
    const logContainer = document.getElementById('logContainer');
    if (logContainer) {
        logContainer.innerHTML = '<div class="empty-log">No recent door activity...</div>';
    }
}

// ============================================
// Fallback: Simulated updates (when API unavailable)
// ============================================

function simulateDoorUpdates() {
    // Simulate random door state changes for testing
    const doors = ['ENT.D1', 'ENT.D2', 'EXT.D3', 'EXT.D4'];
    const states = ['open', 'closed'];
    const randomDoor = doors[Math.floor(Math.random() * doors.length)];
    const randomState = states[Math.floor(Math.random() * states.length)];
    
    // Only log occasionally (10% chance)
    if (Math.random() < 0.1) {
        logDoorStateChange(randomDoor, randomState);
    }
}
}
