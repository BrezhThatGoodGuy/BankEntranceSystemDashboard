// Check for login status
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    // Redirect to login page if not logged in
    window.location.href = 'login.html';
} else {
// filepath: aicontrol.js
// Bank Entrance System - AI Control Page with API Integration
// AI system configuration, threat detection settings, and door actions

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

function getLogsEndpoint(logType) {
    return `/log?type=${encodeURIComponent(logType)}`;
}

function loadAiLogs() {
    fetch(getLogsEndpoint('ai'))
        .then(response => {
            if (!response.ok) {
                throw new Error('Unable to fetch AI logs');
            }
            return response.json();
        })
        .then(data => {
            if (!data || !Array.isArray(data.logs)) {
                throw new Error('Malformed AI logs payload');
            }
            console.log('[AI] Loaded logs:', data.logs.slice(-12));
            window.aiLogs = data.logs;
        })
        .catch(error => {
            console.warn('[AI] AI log fetch failed:', error);
        });
}

function pollAiLogs() {
    loadAiLogs();
}

/**
 * Show toast notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type: 'success', 'error', 'info'
 */
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
    
    console.log(`[${type?.toUpperCase() || 'INFO'}] ${message}`);
}

// ============================================
// AI Configuration Storage
// ============================================

let aiConfig = {
    aiSystem: {
        enabled: false,
        maskedFaceDetection: false,
        weaponDetection: false,
        aiDoorControl: false
    },
    operationModes: {
        weapon: 'lock',
        masked: 'lock'
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize radio button states from current config
    initializeEvacuateButton();
    initializeModeSelections();
    initializeApiPolling();
    pollAiLogs();
    setInterval(pollAiLogs, 5000);
});

/**
 * Initialize mode selections from current state
 */

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
 * Initialize mode selections from current state
 * This ensures radio buttons work even without API
 */
function initializeModeSelections() {
    // Set weapon mode
    const weaponMode = aiConfig.operationModes.weapon || 'lock';
    const weaponRadio = document.getElementById(`weapon-${weaponMode}`);
    if (weaponRadio) {
        weaponRadio.checked = true;
    }
    
    // Set masked mode
    const maskedMode = aiConfig.operationModes.masked || 'lock';
    const maskedRadio = document.getElementById(`masked-${maskedMode}`);
    if (maskedRadio) {
        maskedRadio.checked = true;
    }
    
    console.log('[AI Control] Mode selections initialized:', aiConfig.operationModes);
}

// ============================================
// API Integration for Real-time Updates
// ============================================

/**
 * Initialize API polling for AI configuration
 */
function initializeApiPolling() {
    if (typeof window.API !== 'undefined') {
        // Poll AI config every 3 seconds
        window.API.startPolling('AI_CONFIG', updateAiConfigFromAPI, 3000);
        
        console.log('[AI Control] API polling initialized');
    } else {
        console.warn('[AI Control] API client not loaded');
    }
}

/**
 * Update AI config from API data
 * @param {object} data - AI config data from API
 */
function updateAiConfigFromAPI(data) {
    if (!data) return;
    
    const previousConfig = JSON.stringify(aiConfig);
    aiConfig = data;
    
    // Update UI toggles if they differ from current state
    updateAiToggle('aiSystemToggle', 'aiSystemStatus', data.aiSystem.enabled);
    updateAiToggle('maskedFaceToggle', null, data.aiSystem.maskedFaceDetection);
    updateAiToggle('weaponToggle', null, data.aiSystem.weaponDetection);
    updateAiToggle('aiDoorControlToggle', null, data.aiSystem.aiDoorControl);
    
    // Update operation mode selections
    if (data.operationModes) {
        updateModeSelection('weapon', data.operationModes.weapon);
        updateModeSelection('masked', data.operationModes.masked);
    }
    
    // Log config changes
    if (previousConfig !== JSON.stringify(aiConfig)) {
        console.log('[AI Config] Updated:', aiConfig);
        if (typeof window.API !== 'undefined') {
            window.API.addLogEntry('AI System', 'CONFIG_UPDATE', data.aiSystem.enabled ? 'ENABLED' : 'DISABLED');
        }
    }
}

/**
 * Update an AI toggle switch
 * @param {string} toggleId - ID of the toggle input
 * @param {string} statusId - ID of the status element (optional)
 * @param {boolean} isEnabled - Whether the toggle should be on
 */
function updateAiToggle(toggleId, statusId, isEnabled) {
    const toggle = document.getElementById(toggleId);
    if (toggle && toggle.checked !== isEnabled) {
        toggle.checked = isEnabled;
        
        // Trigger the original toggle function
        if (toggleId === 'aiSystemToggle') {
            toggleAiSystem();
        } else if (toggleId === 'maskedFaceToggle') {
            toggleMaskedFace();
        } else if (toggleId === 'weaponToggle') {
            toggleWeapon();
        } else if (toggleId === 'aiDoorControlToggle') {
            toggleAiDoorControl();
        }
    }
}

/**
 * Update mode selection based on API data
 * @param {string} type - 'weapon' or 'masked'
 * @param {string} mode - Operation mode ('evacuate', 'normal', 'exit', 'entrance', 'lock')
 */
function updateModeSelection(type, mode) {
    if (!mode) return;
    
    const radio = document.getElementById(`${type}-${mode}`);
    if (radio && !radio.checked) {
        radio.checked = true;
        console.log(`[AI Control] ${type} mode updated to: ${mode}`);
    }
}

// ============================================
// AI Toggle Functions
// ============================================

// AI System toggle
function toggleAiSystem() {
    const toggle = document.getElementById('aiSystemToggle');
    const status = document.getElementById('aiSystemStatus');
    const configSection = document.querySelector('.ai-config-section');
    
    if (toggle) {
        aiConfig.aiSystem.enabled = toggle.checked;
        
        if (toggle.checked) {
            if (status) {
                status.textContent = 'ON';
                status.classList.add('active');
            }
            if (configSection) {
                configSection.style.opacity = '1';
                configSection.style.pointerEvents = 'auto';
            }
        } else {
            if (status) {
                status.textContent = 'OFF';
                status.classList.remove('active');
            }
            if (configSection) {
                configSection.style.opacity = '0.5';
                configSection.style.pointerEvents = 'none';
            }
        }
        
        console.log('AI System:', toggle.checked ? 'ON' : 'OFF');
        
        if (typeof window.API !== 'undefined') {
            window.API.addLogEntry('AI System', 'TOGGLE', toggle.checked ? 'ON' : 'OFF');
        }
    }
}

// Masked Face Detection toggle
function toggleMaskedFace() {
    const toggle = document.getElementById('maskedFaceToggle');
    const setupCard = document.getElementById('maskedFaceSetupCard');
    
    if (toggle) {
        aiConfig.aiSystem.maskedFaceDetection = toggle.checked;
        
        if (setupCard) {
            if (toggle.checked) {
                setupCard.classList.add('active');
            } else {
                setupCard.classList.remove('active');
            }
        }
        
        console.log('Masked Face Detection:', toggle.checked ? 'ON' : 'OFF');
        
        if (typeof window.API !== 'undefined') {
            window.API.addLogEntry('Masked Detection', 'TOGGLE', toggle.checked ? 'ENABLED' : 'DISABLED');
        }
    }
}

// Weapon Detection toggle
function toggleWeapon() {
    const toggle = document.getElementById('weaponToggle');
    const setupCard = document.getElementById('weaponSetupCard');
    
    if (toggle) {
        aiConfig.aiSystem.weaponDetection = toggle.checked;
        
        if (setupCard) {
            if (toggle.checked) {
                setupCard.classList.add('active');
            } else {
                setupCard.classList.remove('active');
            }
        }
        
        console.log('Weapon Detection:', toggle.checked ? 'ON' : 'OFF');
        
        if (typeof window.API !== 'undefined') {
            window.API.addLogEntry('Weapon Detection', 'TOGGLE', toggle.checked ? 'ENABLED' : 'DISABLED');
        }
    }
}

// AI Door Control toggle
function toggleAiDoorControl() {
    const toggle = document.getElementById('aiDoorControlToggle');
    
    if (toggle) {
        aiConfig.aiSystem.aiDoorControl = toggle.checked;
        
        console.log('AI Door Control:', toggle.checked ? 'ON' : 'OFF');
        
        if (typeof window.API !== 'undefined') {
            window.API.addLogEntry('AI Door Control', 'TOGGLE', toggle.checked ? 'ENABLED' : 'DISABLED');
        }
    }
}

/**
 * Update AI operation mode based on user selection
 * @param {string} type - 'weapon' or 'masked'
 * @param {string} mode - Operation mode ('evacuate', 'normal', 'exit', 'entrance', 'lock')
 */
function updateAiMode(type, mode) {
    if (type === 'weapon') {
        aiConfig.operationModes.weapon = mode;
    } else if (type === 'masked') {
        aiConfig.operationModes.masked = mode;
    }
    
    const modeNames = {
        'evacuate': 'Evacuate',
        'normal': 'Normal-Traffic',
        'exit': 'Exit-Only',
        'entrance': 'Entrance-Only',
        'lock': 'Lock-All'
    };
    
    console.log(`AI ${type} detection mode set to: ${modeNames[mode]}`);
    
    if (typeof window.API !== 'undefined') {
        window.API.addLogEntry(`AI ${type} Detection`, 'MODE_SET', modeNames[mode]);
    }
}
}
