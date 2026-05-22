/**
 * Bank Entrance System - Core Objects and Logging System
 * 
 * This module defines all system objects and provides logging functionality
 * for the Bank Entrance System. Logs are stored on ESP32 for downloading.
 * 
 * Objects:
 * - Doors (ENT.D1, ENT.D2, EXT.D3, EXT.D4)
 * - Locks (ENT.L1, ENT.L2, EXT.L3, EXT.L4)
 * - Magnetic Contacts (ENT.C1, ENT.C2, EXT.C3, EXT.C4)
 * - Booths/Paths (ENT.PATH, EXT.PATH)
 */

// ============================================
// SYSTEM OBJECTS DEFINITION
// ============================================

// Door Objects - Represent physical entrance/exit doors
const doors = {
    ENTD1: {
        id: 1,
        name: "ENT.D1",
        description: "Entrance Door 1",
        MagLock: "Locked",
        MagContact: "Closed"
    },
    ENTD2: {
        id: 2,
        name: "ENT.D2",
        description: "Entrance Door 2",
        MagLock: "Locked",
        MagContact: "Closed"
    },
    EXTD3: {
        id: 3,
        name: "EXT.D3",
        description: "Exit Door 3",
        MagLock: "Locked",
        MagContact: "Closed"
    },
    EXTD4: {
        id: 4,
        name: "EXT.D4",
        description: "Exit Door 4",
        MagLock: "Locked",
        MagContact: "Closed"
    }
};

// Lock Objects - Represent door lock mechanisms
const locks = {
    ENTL1: {
        id: 1,
        name: "ENT.L1",
        description: "Entrance Lock 1",
        status: "Locked"
    },
    ENTL2: {
        id: 2,
        name: "ENT.L2",
        description: "Entrance Lock 2",
        status: "Locked"
    },
    EXTL3: {
        id: 3,
        name: "EXT.L3",
        description: "Exit Lock 3",
        status: "Locked"
    },
    EXTL4: {
        id: 4,
        name: "EXT.L4",
        description: "Exit Lock 4",
        status: "Locked"
    }
};

// Magnetic Contact Objects - Represent door sensors
const magneticContacts = {
    ENTC1: {
        id: 1,
        name: "ENT.C1",
        description: "Entrance Magnetic Contact 1",
        status: "Closed"
    },
    ENTC2: {
        id: 2,
        name: "ENT.C2",
        description: "Entrance Magnetic Contact 2",
        status: "Closed"
    },
    EXTC3: {
        id: 3,
        name: "EXT.C3",
        description: "Exit Magnetic Contact 3",
        status: "Closed"
    },
    EXTC4: {
        id: 4,
        name: "EXT.C4",
        description: "Exit Magnetic Contact 4",
        status: "Closed"
    }
};

// Booth/Path Objects - Represent occupancy detection zones
const booths = {
    ENTB1: {
        id: 1,
        name: "ENT.PATH",
        description: "Entrance Path/Booth",
        status: "Vacant"
    },
    EXTB2: {
        id: 2,
        name: "EXT.PATH",
        description: "Exit Path/Booth",
        status: "Vacant"
    }
};

// ============================================
// SYSTEM STATE
// ============================================

const systemState = {
    // System uptime tracking
    uptime: 0,
    
    // Client counting
    totalEntries: 0,
    totalExits: 0,
    clientsInside: 0,
    
    // Current user (for logging)
    currentUser: "User",
    
    // Client IP (for logging)
    clientIP: ""
};

// ============================================
// LOGGING SYSTEM
// ============================================

// Log storage configuration
const LOG_CONFIG = {
    MAX_LOGS: 100,          // Maximum logs to store in ESP32
    DISPLAY_LOGS: 12,       // Number of logs to display on page
    TIMESTAMP_FORMAT: "YY/MM/DD---HH:MM:SS"
};

// Log storage arrays (in-memory for display)
const logs = {
    monitoring: [],
    control: [],
    faults: [],
    ai: []
};

/**
 * Generate timestamp string in format: YY/MM/DD---HH:MM:SS
 * @returns {string} Formatted timestamp
 */
function generateTimestamp() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yy}/${mm}/${dd}---${hh}:${min}:${ss}`;
}

/**
 * Add a log entry to the specified log array
 * @param {string} logType - Type of log: 'monitoring', 'control', 'faults', 'ai'
 * @param {string} message - Log message
 */
function addLog(logType, message) {
    const timestamp = generateTimestamp();
    const logEntry = {
        timestamp: timestamp,
        message: message,
        raw: `${timestamp}     ${message}`
    };
    
    // Add to appropriate log array
    if (logs[logType]) {
        logs[logType].unshift(logEntry); // Add to beginning (most recent first)
        
        // Keep only MAX_LOGS in memory
        if (logs[logType].length > LOG_CONFIG.MAX_LOGS) {
            logs[logType].pop(); // Remove oldest
        }
    }
    
    // Update display
    updateLogDisplay(logType);
    
    // TODO: Send to ESP32 for persistent storage
    sendLogToESP32(logType, logEntry);
}

/**
 * Update the log display on the page
 * @param {string} logType - Type of log to display
 */
function updateLogDisplay(logType) {
    // Try different element IDs for compatibility
    let displayElement = document.getElementById(`${logType}-logs`);
    if (!displayElement) {
        displayElement = document.getElementById('logContainer');
    }
    if (!displayElement) return;
    
    const logsToDisplay = logs[logType].slice(0, LOG_CONFIG.DISPLAY_LOGS);
    let html = '';
    
    if (logsToDisplay.length === 0) {
        html = '<div class="empty-log">No recent door activity...</div>';
    } else {
        logsToDisplay.forEach(log => {
            html += `<div class="log-entry">${log.raw}</div>`;
        });
    }
    
    displayElement.innerHTML = html;
}

// ============================================
// MONITORING LOGS
// ============================================

/**
 * Log a door state change for monitoring
 * @param {string} doorName - Name of the door (e.g., 'ENT.D1')
 * @param {string} state - New state ('Opened', 'Closed', 'Locked', 'Unlocked')
 */
function logMonitoring(doorName, state) {
    const message = `${doorName}  ${state}`;
    addLog('monitoring', message);
}

/**
 * Update door MagLock and log changes
 * @param {string} doorKey - Door object key (e.g., 'ENTD1')
 * @param {string} lockState - New lock state ('Locked' or 'Unlocked')
 */
function updateDoorMagLock(doorKey, lockState) {
    const door = doors[doorKey];
    if (!door) return;
    
    const previousState = door.MagLock;
    if (previousState !== lockState) {
        door.MagLock = lockState;
        logMonitoring(door.name, lockState);
    }
}

/**
 * Update door MagContact and log changes
 * @param {string} doorKey - Door object key (e.g., 'ENTD1')
 * @param {string} contactState - New contact state ('Opened' or 'Closed')
 */
function updateDoorMagContact(doorKey, contactState) {
    const door = doors[doorKey];
    if (!door) return;
    
    const previousState = door.MagContact;
    if (previousState !== contactState) {
        door.MagContact = contactState;
        logMonitoring(door.name, contactState);
    }
}

/**
 * Update booth status and log changes
 * @param {string} boothKey - Booth object key (e.g., 'ENTB1')
 * @param {string} boothStatus - New status ('Vacant' or 'Occupied')
 */
function updateBoothStatus(boothKey, boothStatus) {
    const booth = booths[boothKey];
    if (!booth) return;
    
    const previousStatus = booth.status;
    if (previousStatus !== boothStatus) {
        booth.status = boothStatus;
        
        // Update client counts
        if (boothKey === 'ENTB1' && boothStatus === 'Occupied') {
            systemState.totalEntries++;
        } else if (boothKey === 'EXTB2' && boothStatus === 'Occupied') {
            systemState.totalExits++;
        }
        
        // Calculate clients inside
        systemState.clientsInside = systemState.totalEntries - systemState.totalExits;
        
        logMonitoring(booth.name, boothStatus);
    }
}

// ============================================
// CONTROL LOGS
// ============================================

/**
 * Log operation mode change
 * @param {string} newMode - New operation mode
 */
function logControlOperationMode(newMode) {
    const ip = systemState.clientIP || 'Unknown';
    const message = `(${ip}) changed operation mode to '${newMode}'`;
    addLog('control', message);
}

/**
 * Log door control action
 * @param {string} action - Action performed ('Unlocked', 'Locked', 'Auto-Controlled')
 * @param {string} doorName - Name of the door
 */
function logControlDoor(action, doorName) {
    const user = systemState.currentUser;
    const message = `${user} ${action} ${doorName}`;
    addLog('control', message);
}

/**
 * Log settings change
 * @param {string} label - Settings label that changed
 * @param {string} name - Component or setting name
 */
function logControlSettings(label, name) {
    const user = systemState.currentUser;
    const message = `${user} ${label} ${name}`;
    addLog('control', message);
}

// ============================================
// FAULTS LOGS
// ============================================

/**
 * Log a new fault suggested by the system
 * @param {string} componentName - Name of the component
 * @param {string} faultStatus - Fault status
 */
function logFaultSuggested(componentName, faultStatus) {
    const message = `${componentName} suggested ${faultStatus}`;
    addLog('faults', message);
}

/**
 * Log a fault reported by user
 * @param {string} componentName - Name of the component
 * @param {string} faultStatus - Fault status
 */
function logFaultReported(componentName, faultStatus) {
    const user = systemState.currentUser;
    const message = `${user} reported ${componentName} ${faultStatus}`;
    addLog('faults', message);
}

/**
 * Get total fault count
 * @returns {number} Total number of faults
 */
function getTotalFaults() {
    return logs.faults.length;
}

// ============================================
// AI LOGS
// ============================================

/**
 * Log AI system state change
 * @param {string} state - New AI system state ('ON' or 'OFF')
 */
function logAiSystem(state) {
    const user = systemState.currentUser;
    const message = `${user} turned AI System ${state}`;
    addLog('ai', message);
}

/**
 * Log AI configuration change
 * @param {string} configName - Configuration name
 * @param {string} action - Action ('Allowed' or 'Disallowed')
 */
function logAiConfig(configName, action) {
    const user = systemState.currentUser;
    const message = `${user} ${action} '${configName}'`;
    addLog('ai', message);
}

/**
 * Log AI door reconfiguration
 * @param {string} configAspect - Configuration aspect
 */
function logAiDoorReconfig(configAspect) {
    const user = systemState.currentUser;
    const message = `${user} reconfigured door set-up for ${configAspect}`;
    addLog('ai', message);
}

// ============================================
// ESP32 COMMUNICATION
// ============================================

/**
 * Send log entry to ESP32 for persistent storage
 * @param {string} logType - Type of log
 * @param {object} logEntry - Log entry object
 */
async function sendLogToESP32(logType, logEntry) {
    try {
        const endpoint = `/log`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: logType,
                timestamp: logEntry.timestamp,
                message: logEntry.message
            })
        });

        if (!response.ok) {
            console.warn(`[Log] Failed to send ${logType} log to ESP32`);
        }
    } catch (error) {
        // ESP32 not available, log locally
        console.log(`[Log] Local: ${logType} - ${logEntry.raw}`);
    }
}

/**
 * Request log download from ESP32
 * @param {string} logType - Type of log to download
 */
function downloadLogs(logType) {
    const url = `/logs/${logType}.txt`;
    window.open(url, '_blank');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get system status for header display
 * @returns {object} System status object
 */
function getSystemStatus() {
    return {
        uptime: systemState.uptime,
        totalEntries: systemState.totalEntries,
        totalExits: systemState.totalExits,
        clientsInside: systemState.clientsInside
    };
}

/**
 * Set current user for logging
 * @param {string} userName - User name
 */
function setCurrentUser(userName) {
    systemState.currentUser = userName;
}

/**
 * Set client IP for logging
 * @param {string} ip - Client IP address
 */
function setClientIP(ip) {
    systemState.clientIP = ip;
}

/**
 * Update system uptime
 */
function updateUptime() {
    systemState.uptime++;
    updateSystemStatusDisplay();
}

/**
 * Update the system status display in the header
 */
function updateSystemStatusDisplay() {
    // Update uptime display
    const uptimeElement = document.getElementById('system-uptime');
    if (uptimeElement) {
        const hours = Math.floor(systemState.uptime / 3600);
        const minutes = Math.floor((systemState.uptime % 3600) / 60);
        const seconds = systemState.uptime % 60;
        uptimeElement.textContent = 
            String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0');
    }
    
    // Update entries display
    const entriesElement = document.getElementById('total-entries');
    if (entriesElement) {
        entriesElement.textContent = systemState.totalEntries;
    }
    
    // Update exits display
    const exitsElement = document.getElementById('total-exits');
    if (exitsElement) {
        exitsElement.textContent = systemState.totalExits;
    }
    
    // Update clients inside display
    const insideElement = document.getElementById('clients-inside');
    if (insideElement) {
        insideElement.textContent = systemState.clientsInside;
    }
}

// Start uptime counter (every second)
setInterval(updateUptime, 1000);

// Export for global use
window.BankSystem = {
    doors,
    locks,
    magneticContacts,
    booths,
    systemState,
    logs,
    LOG_CONFIG,
    
    // Monitoring functions
    updateDoorMagLock,
    updateDoorMagContact,
    updateBoothStatus,
    logMonitoring,
    
    // Control functions
    logControlOperationMode,
    logControlDoor,
    logControlSettings,
    
    // Fault functions
    logFaultSuggested,
    logFaultReported,
    getTotalFaults,
    
    // AI functions
    logAiSystem,
    logAiConfig,
    logAiDoorReconfig,
    
    // Utility functions
    getSystemStatus,
    setCurrentUser,
    setClientIP,
    generateTimestamp,
    addLog,
    downloadLogs
};