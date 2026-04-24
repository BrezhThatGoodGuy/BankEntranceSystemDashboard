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

// Live CCTV image refresh
const imgElement = document.querySelector('.live-view-template');

function refreshImage() {
    const imgElement = document.querySelector('.live-view-template');
    if (imgElement) {
        const baseUrl = imgElement.src;
        const timestamp = new Date().getTime();
        imgElement.src = `${baseUrl}?t=${timestamp}`;
    }
}

setInterval(refreshImage, 200);

// ============================================
// API Integration for Real-time Updates
// ============================================

// Store current door states
let currentDoorStates = {
    1: { state: 'closed', locked: true },
    2: { state: 'closed', locked: true },
    3: { state: 'closed', locked: true },
    4: { state: 'closed', locked: true }
};

// Initialize API polling when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApiPolling();
});

/**
 * Initialize API polling for real-time updates
 */
function initializeApiPolling() {
    // Poll door states every 3 seconds
    if (typeof window.API !== 'undefined') {
        window.API.startPolling('DOORS', updateDoorStatesFromAPI, 3000);
        
        // Poll logs every 3 seconds
        window.API.startPolling('LOGS', updateLogsFromAPI, 3000);
        
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
        
        // Update UI elements
        updateDoorUI(doorId, door);
        
        // Log state changes
        if (previousState && previousState.state !== door.state) {
            logDoorStateChange(door.name, door.state);
            window.API.addLogEntry(door.name, 'STATE_CHANGE', door.state);
        }
    });
}

/**
 * Update a specific door's UI elements
 * @param {number} doorId - Door ID
 * @param {object} door - Door data
 */
function updateDoorUI(doorId, door) {
    // Update door state indicators based on your HTML structure
    // This depends on your specific HTML elements - adjust as needed
    
    const stateClass = door.state === 'open' ? 'door-open' : 'door-closed';
    const lockClass = door.locked ? 'door-locked' : 'door-unlocked';
    
    // Example: Update door visual elements if they exist
    // You'll need to match these selectors to your actual HTML
    console.log(`[Door ${doorId}] State: ${door.state}, Locked: ${door.locked}`);
}

/**
 * Update logs from API data
 * @param {object} data - Logs data from API
 */
function updateLogsFromAPI(data) {
    if (!data || !data.logs || data.logs.length === 0) return;
    
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) return;
    
    // Remove empty log message
    const emptyLog = document.querySelector('.empty-log');
    if (emptyLog) {
        emptyLog.remove();
    }
    
    // Add new log entries
    data.logs.forEach(log => {
        // Check if log already exists
        const existingLog = document.querySelector(`.log-entry[data-time="${log.time}"]`);
        if (!existingLog) {
            addLogEntryToUI(log);
        }
    });
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