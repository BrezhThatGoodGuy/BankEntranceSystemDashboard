// Check for login status
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    // Redirect to login page if not logged in
    window.location.href = 'login.html';
} else {
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
    const shownsidebar = '<div class = "shown-side-navigation-bar"><div><p>Print Info</p>  <svg class="print-icon" onclick="window.print()" aria-label="Print this page" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg class="phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="#25D366" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a></div><div><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div><p>Log Out</p><svg class="logout-icon" onclick="logout()" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
    const unclickedmenu = '<img class="navigation-menu" onclick="hideSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}

function pollESP32MonitoringLogs() {
    fetch(`/log?type=monitoring`)
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
    
    if (!boothTemplate) return;
    
    // Remove both open and closed classes
    boothTemplate.classList.remove(config.magContactClasses.open);
    boothTemplate.classList.remove(config.magContactClasses.closed);
    
    // Add the appropriate class based on state
    const stateClass = state === 'open' ? config.magContactClasses.open : config.magContactClasses.closed;
    boothTemplate.classList.add(stateClass);
    
    console.log(`[${config.name}] MagContact state updated: ${state.toUpperCase()} | Class: ${stateClass}`);
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
    updateDoorMagContactUI(doorId, doorData.state);
    
    // Update lock icon visualization (locked/unlocked padlock)
    updateDoorLockIcon(doorId, doorData.locked);
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

// Initialize API polling when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeDoorStates();
    initializeApiPolling();
});

/**
 * Initialize API polling for real-time updates
 */
function initializeApiPolling() {
    // Poll door states every 3 seconds
    if (typeof window.API !== 'undefined') {
        window.API.startPolling('DOORS', updateDoorStatesFromAPI, 3000);
        pollESP32MonitoringLogs();
        setInterval(pollESP32MonitoringLogs, 3000);
        console.log('[Monitor] API polling initialized');
    } else {
        console.warn('[Monitor] API client not loaded, using fallback mode');
        // Fallback: use simulated data
        setInterval(simulateDoorUpdates, 3000);
    }
}

/**
 * Update door states from API data
 * @param {object} data - Door data from API
 */
function updateDoorStatesFromAPI(data) {
    if (!data || !data.doors) return;
    
    data.doors.forEach(door => {
        const doorId = door.id;
        const previousState = currentDoorStates[doorId];
        
        // Update stored state
        currentDoorStates[doorId] = {
            state: door.state,
            locked: door.locked
        };
        
        // Update UI elements (both MagContact and lock icon)
        updateDoorUI(doorId, door);
        
        // Log state changes
        if (previousState && previousState.state !== door.state) {
            logDoorStateChange(door.name, door.state);
            if (typeof window.API !== 'undefined') {
                window.API.addLogEntry(door.name, 'STATE_CHANGE', door.state);
            }
        }
        
        // Log lock status changes
        if (previousState && previousState.locked !== door.locked) {
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
    if (!data || !Array.isArray(data.logs) || data.logs.length === 0) return;
    
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) return;
    
    const logs = data.logs.slice(-12).reverse();
    let html = '';
    logs.forEach(log => {
        const time = log.timestamp || log.time || log.Time || '--:--:--';
        const message = log.message || log.action || log.status || log.door || JSON.stringify(log);
        html += `
            <div class="log-entry">
                <span class="log-time">[${time}]</span>
                <span class="log-clicked">${message}</span>
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
    
    const newLog = document.createElement('div');
    newLog.className = 'log-entry';
    newLog.setAttribute('data-time', log.time);
    
    newLog.innerHTML = `
        <span class="log-time">[${log.time}]</span> 
        <span class="log-clicked">${log.door}</span> 
        ${log.action || 'status changed to'} <span class="log-client">${log.status}</span>
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

    // Get current time formatted as HH:MM:SS
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour12: false });

    // Create the new log entry div
    const newLog = document.createElement('div');
    newLog.className = 'log-entry';
    
    // Build the log message using your existing CSS classes
    newLog.innerHTML = `
        <span class="log-time">[${timeString}]</span> 
        <span class="log-clicked">${doorName}</span> 
        status changed to <span class="log-client">${newState}</span>
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
