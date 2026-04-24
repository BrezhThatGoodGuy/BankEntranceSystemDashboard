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
// AI Configuration Storage
// ============================================

let aiConfig = {
    aiSystem: {
        enabled: false,
        maskedFaceDetection: false,
        weaponDetection: false,
        aiDoorControl: false
    },
    doorActions: {
        weapon: { 1: 'locked', 2: 'locked', 3: 'locked', 4: 'locked' },
        masked: { 1: 'locked', 2: 'locked', 3: 'locked', 4: 'locked' }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApiPolling();
});

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
    
    // Update door action buttons
    if (data.doorActions) {
        updateDoorActionButtons('weapon', data.doorActions.weapon);
        updateDoorActionButtons('masked', data.doorActions.masked);
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
 * Update door action buttons based on API data
 * @param {string} type - 'weapon' or 'masked'
 * @param {object} actions - Door actions object
 */
function updateDoorActionButtons(type, actions) {
    if (!actions) return;
    
    Object.keys(actions).forEach(doorId => {
        const button = document.querySelector(`.door-action-btn[data-door="${doorId}"][data-type="${type}"]`);
        if (button) {
            const action = actions[doorId];
            const btnText = button.querySelector('.btn-text');
            
            button.classList.remove('locked', 'open', 'auto');
            button.classList.add(action);
            
            if (action === 'locked') {
                btnText.textContent = 'LOCKED';
            } else if (action === 'open') {
                btnText.textContent = 'OPEN';
            } else {
                btnText.textContent = 'AUTO';
            }
        }
    });
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

// ============================================
// Door Action Functions
// ============================================

// Toggle door action between locked (red), open (green), auto (blue)
function toggleDoorAction(button) {
    const door = button.getAttribute('data-door');
    const type = button.getAttribute('data-type');
    const btnText = button.querySelector('.btn-text');
    
    // Get current action based on type
    let currentAction;
    if (type === 'weapon') {
        currentAction = aiConfig.doorActions.weapon[door];
    } else if (type === 'masked') {
        currentAction = aiConfig.doorActions.masked[door];
    }
    
    // Cycle through: locked -> open -> auto -> locked
    let nextAction;
    if (currentAction === 'locked') {
        nextAction = 'open';
    } else if (currentAction === 'open') {
        nextAction = 'auto';
    } else {
        nextAction = 'locked';
    }
    
    // Update the config
    if (type === 'weapon') {
        aiConfig.doorActions.weapon[door] = nextAction;
    } else if (type === 'masked') {
        aiConfig.doorActions.masked[door] = nextAction;
    }
    
    // Update button appearance
    button.classList.remove('locked', 'open', 'auto');
    button.classList.add(nextAction);
    
    if (nextAction === 'locked') {
        btnText.textContent = 'LOCKED';
    } else if (nextAction === 'open') {
        btnText.textContent = 'OPEN';
    } else {
        btnText.textContent = 'AUTO';
    }
    
    console.log(`Door ${door} (${type}): ${nextAction}`);
    
    if (typeof window.API !== 'undefined') {
        window.API.addLogEntry(`Door ${door} (${type})`, 'ACTION', nextAction);
    }
}