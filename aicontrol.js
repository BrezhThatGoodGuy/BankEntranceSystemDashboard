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
    const shownsidebar = '<div class = "shown-side-navigation-bar"><div onclick="openPrintLogsDialog()"><p>Print Info</p>  <svg class="print-icon" aria-label="Print logs" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg class="phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="#25D366" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a></div><div><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div><p>Log Out</p><svg class="logout-icon" onclick="logout()" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
    const unclickedmenu = '<img class="navigation-menu" onclick="hideSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const ESP_LOG_FILE_CONFIG = [
    { key: 'monitoring', label: 'Monitoring Logs', url: '/logs/monitoring.txt' },
    { key: 'control', label: 'Control Logs', url: '/logs/control.txt' },
    { key: 'faults', label: 'Faults Logs', url: '/logs/faults.txt' },
    { key: 'ai', label: 'AI Logs', url: '/logs/ai.txt' }
];

function openPrintLogsDialog() {
    closePrintLogsDialog();
    const items = ESP_LOG_FILE_CONFIG.map(file =>
        `<label class="print-checkbox-label"><input type="checkbox" class="log-file-checkbox" value="${file.key}" checked><span>${file.label}</span></label>`
    ).join('');

    document.body.insertAdjacentHTML('beforeend', `
        <div id="printSelectionModal" class="print-modal-overlay" onclick="closePrintLogsDialog(event)">
            <div class="print-modal-card" onclick="event.stopPropagation()">
                <div class="print-modal-header">
                    <h3>Select logs to print</h3>
                    <button type="button" class="close-modal-btn" onclick="closePrintLogsDialog()">×</button>
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

    if (!keys.length) {
        if (errEl) errEl.textContent = 'Please select at least one log file.';
        return;
    }

    if (errEl) errEl.textContent = '';

    const selected = ESP_LOG_FILE_CONFIG.filter(file => keys.includes(file.key));
    Promise.all(selected.map(file =>
        fetch(file.url, { cache: 'no-store', headers: { Accept: 'text/plain' } })
            .then(response => response.ok ? response.text() : Promise.reject(`Cannot load ${file.label}`))
            .then(text => ({ ...file, text }))
    ))
        .then(files => {
            closePrintLogsDialog();
            buildAndPrintLogs(files);
        })
        .catch(error => {
            if (errEl) errEl.textContent = String(error);
        });
}

function buildAndPrintLogs(files) {
    const existing = document.getElementById('printableLogsArea');
    if (existing) existing.remove();

    const sections = files.map(file =>
        `<section class="printable-log-file"><h2>${file.label}</h2><pre>${escapeHTML(file.text)}</pre></section>`
    ).join('');

    document.body.insertAdjacentHTML('beforeend', `
        <div id="printableLogsArea" class="printable-log-area active">
            <div class="printable-logs-header">
                <h1>ESP Log Printout</h1>
                <p>${files.map(file => file.label).join(', ')}</p>
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

const API_ENDPOINTS = window.API_ENDPOINTS || {};

function getLogsEndpoint(logType) {
    if (API_ENDPOINTS.LOGS_QUERY) return API_ENDPOINTS.LOGS_QUERY(logType);
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
// Exposed globally for aicontrol-inference.js to monitor state
window.aiConfig = {
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

// Prevent polling from overwriting user changes before they sync to the server
// Initialise to "now" so the first poll (within 5s of load) never clobbers user state
let lastInteractionTime = Date.now();

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

const ACTION_ENDPOINT = API_ENDPOINTS.ACTION || '/action';
const AI_CONFIG_ENDPOINT = API_ENDPOINTS.AI_CONFIG || '/api/ai-config';
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
    return fetch(ACTION_ENDPOINT, {
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

function syncAiMode(type, mode) {
    return fetch(ACTION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'AI_MODE', type, mode })
    }).catch(err => console.warn('[AI] Failed to sync detection mode:', err));
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
 * Initialize API polling for AI configuration.
 * Uses /api/ai-config — a dedicated endpoint that always returns the full
 * aiSystem block. Polling the generic /status.json is unsafe because that
 * payload has no aiSystem key, which would make updateAiConfigFromAPI
 * receive undefined and flip all toggles off on the first poll cycle.
 */
function initializeApiPolling() {
    // Poll the dedicated AI config endpoint every 4 s.
    // 4 s is deliberately longer than the 5 s lastInteractionTime guard
    // so a user action always wins over the next incoming poll.
    setInterval(() => {
        fetch(AI_CONFIG_ENDPOINT)
            .then(r => r.json())
            .then(data => updateAiConfigFromAPI(data))
            .catch(err => console.warn('[AI] Config poll failed:', err));
    }, 4000);

    console.log('[AI Control] API polling initialised (/api/ai-config, 4 s)');
}

/**
 * Update AI config from API data.
 * Only syncs when the payload actually contains an aiSystem block —
 * an absent or malformed block is silently ignored to prevent the
 * /status.json payload (which has no aiSystem key) from turning
 * all toggles off.
 * @param {object} data - AI config data from API
 */
function updateAiConfigFromAPI(data) {
    // Hard guard: if aiSystem is missing this is the wrong payload (e.g.
    // /status.json was polled instead of /api/ai-config). Bail immediately.
    if (!data || !data.aiSystem) return;

    // Optimistic UI: ignore poll results for 5 s after any user interaction
    if (Date.now() - lastInteractionTime < 5000) return;

    const previousConfig = JSON.stringify(window.aiConfig);
    window.aiConfig = data;

    // Mirror ESP32 state into the UI toggles
    updateAiToggle('aiSystemToggle',    'aiSystemStatus', data.aiSystem.enabled);
    updateAiToggle('maskedFaceToggle',  null,             data.aiSystem.maskedFaceDetection);
    updateAiToggle('weaponToggle',      null,             data.aiSystem.weaponDetection);
    updateAiToggle('aiDoorControlToggle', null,           data.aiSystem.aiDoorControl);

    if (data.operationModes) {
        updateModeSelection('weapon', data.operationModes.weapon);
        updateModeSelection('masked', data.operationModes.masked);
    }

    if (previousConfig !== JSON.stringify(window.aiConfig)) {
        console.log('[AI Config] Synced from ESP32:', window.aiConfig);
        if (typeof window.API !== 'undefined') {
            window.API.addLogEntry('AI System', 'CONFIG_SYNC', data.aiSystem.enabled ? 'ENABLED' : 'DISABLED');
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
    if (!toggle || toggle.checked === isEnabled) return;

    // Only mirror the checked state — do NOT call the toggle handler
    // (calling the handler would flip window.aiConfig back and cause a bounce)
    toggle.checked = isEnabled;

    if (toggleId === 'aiSystemToggle') {
        const status = document.getElementById('aiSystemStatus');
        const configSection = document.querySelector('.ai-config-section');
        if (status) {
            status.textContent = isEnabled ? 'ON' : 'OFF';
            isEnabled ? status.classList.add('active') : status.classList.remove('active');
        }
        if (configSection) {
            configSection.style.opacity = isEnabled ? '1' : '0.5';
            configSection.style.pointerEvents = isEnabled ? 'auto' : 'none';
        }
    } else if (toggleId === 'maskedFaceToggle') {
        const setupCard = document.getElementById('maskedFaceSetupCard');
        if (setupCard) isEnabled ? setupCard.classList.add('active') : setupCard.classList.remove('active');
    } else if (toggleId === 'weaponToggle') {
        const setupCard = document.getElementById('weaponSetupCard');
        if (setupCard) isEnabled ? setupCard.classList.add('active') : setupCard.classList.remove('active');
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
    lastInteractionTime = Date.now();
    const toggle = document.getElementById('aiSystemToggle');
    const status = document.getElementById('aiSystemStatus');
    const configSection = document.querySelector('.ai-config-section');
    
    if (toggle) {
        window.aiConfig.aiSystem.enabled = toggle.checked;
        
        // Sync Master AI State with ESP32
        fetch(ACTION_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'AI_SYSTEM', state: toggle.checked ? 'ON' : 'OFF' })
        }).catch(err => console.warn('[AI] Failed to sync master state', err));

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

/**
 * Sync the combined threat-detection state to the ESP32.
 * Called whenever maskedFaceDetection or weaponDetection changes.
 * The ESP32 guards inference behind BOTH ai_system_enabled AND ai_threat_detection,
 * so this must be sent in addition to the AI_SYSTEM action.
 */
function syncThreatState() {
    const active = window.aiConfig.aiSystem.maskedFaceDetection ||
                   window.aiConfig.aiSystem.weaponDetection;
    fetch(ACTION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'AI_THREAT', state: active ? 'ON' : 'OFF' })
    }).catch(err => console.warn('[AI] Failed to sync threat state:', err));
}

// Masked Face Detection toggle
function toggleMaskedFace() {
    lastInteractionTime = Date.now();
    const toggle = document.getElementById('maskedFaceToggle');
    const setupCard = document.getElementById('maskedFaceSetupCard');
    
    if (toggle) {
        window.aiConfig.aiSystem.maskedFaceDetection = toggle.checked;
        
        // Update combined threat state on ESP32
        syncThreatState();

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
    lastInteractionTime = Date.now();
    const toggle = document.getElementById('weaponToggle');
    const setupCard = document.getElementById('weaponSetupCard');
    
    if (toggle) {
        window.aiConfig.aiSystem.weaponDetection = toggle.checked;
        
        // Update combined threat state on ESP32
        syncThreatState();

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
    lastInteractionTime = Date.now();
    const toggle = document.getElementById('aiDoorControlToggle');
    
    if (toggle) {
        window.aiConfig.aiSystem.aiDoorControl = toggle.checked;
        fetch(ACTION_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'AI_DOOR_CONTROL', state: toggle.checked ? 'ON' : 'OFF' })
        }).catch(err => console.warn('[AI] Failed to sync door-control state:', err));
        
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
    lastInteractionTime = Date.now();

    if (type === 'weapon') {
        window.aiConfig.operationModes.weapon = mode;
    } else if (type === 'masked') {
        window.aiConfig.operationModes.masked = mode;
    }
    
    const modeNames = {
        'evacuate': 'Evacuate',
        'normal': 'Normal-Traffic',
        'exit': 'Exit-Only',
        'entrance': 'Entrance-Only',
        'lock': 'Lock-All'
    };
    
    console.log(`AI ${type} detection mode set to: ${modeNames[mode]}`);
    syncAiMode(type, mode);
    
    if (typeof window.API !== 'undefined') {
        window.API.addLogEntry(`AI ${type} Detection`, 'MODE_SET', modeNames[mode]);
    }
}
}
