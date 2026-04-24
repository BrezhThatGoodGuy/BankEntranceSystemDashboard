function openMonitorPage(){
                    window.location.href = "monitor.html";
                    const pageSelector = document.querySelector('.monitor-link-page');
                    
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
                   
                    const shownsidebar = '<div class = "shown-side-navigation-bar"><div><p>Print Info</p>  <svg class="print-icon" onclick="window.print()" aria-label="Print this page" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg class="phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="#25D366" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a></div><div><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div>Log Out</div></div>';
                    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
                    const unclickedmenu = '<img class="navigation-menu" onclick="hideSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
                    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}// AI Control Page JavaScript

// Store door actions for each threat type
let weaponDoorActions = {
    1: 'locked',
    2: 'locked',
    3: 'locked',
    4: 'locked'
};

let maskedDoorActions = {
    1: 'locked',
    2: 'locked',
    3: 'locked',
    4: 'locked'
};

// AI System toggle
function toggleAiSystem() {
    const toggle = document.getElementById('aiSystemToggle');
    const status = document.getElementById('aiSystemStatus');
    const configSection = document.querySelector('.ai-config-section');
    
    if (toggle.checked) {
        status.textContent = 'ON';
        status.classList.add('active');
        configSection.style.opacity = '1';
        configSection.style.pointerEvents = 'auto';
    } else {
        status.textContent = 'OFF';
        status.classList.remove('active');
        configSection.style.opacity = '0.5';
        configSection.style.pointerEvents = 'none';
    }
    
    console.log('AI System:', toggle.checked ? 'ON' : 'OFF');
}

// Masked Face Detection toggle
function toggleMaskedFace() {
    const toggle = document.getElementById('maskedFaceToggle');
    const setupCard = document.getElementById('maskedFaceSetupCard');
    const aiDoorControl = document.getElementById('aiDoorControlToggle');
    
    if (toggle.checked) {
        setupCard.classList.add('active');
    } else {
        setupCard.classList.remove('active');
    }
    
    console.log('Masked Face Detection:', toggle.checked ? 'ON' : 'OFF');
}

// Weapon Detection toggle
function toggleWeapon() {
    const toggle = document.getElementById('weaponToggle');
    const setupCard = document.getElementById('weaponSetupCard');
    const aiDoorControl = document.getElementById('aiDoorControlToggle');
    
    if (toggle.checked) {
        setupCard.classList.add('active');
    } else {
        setupCard.classList.remove('active');
    }
    
    console.log('Weapon Detection:', toggle.checked ? 'ON' : 'OFF');
}

// AI Door Control toggle
function toggleAiDoorControl() {
    const toggle = document.getElementById('aiDoorControlToggle');
    const weaponCard = document.getElementById('weaponSetupCard');
    const maskedCard = document.getElementById('maskedFaceSetupCard');
    
    console.log('AI Door Control:', toggle.checked ? 'ON' : 'OFF');
}

// Toggle door action between locked (red), open (green), auto (blue)
function toggleDoorAction(button) {
    const door = button.getAttribute('data-door');
    const type = button.getAttribute('data-type');
    const btnText = button.querySelector('.btn-text');
    
    // Get current action based on type
    let currentAction;
    if (type === 'weapon') {
        currentAction = weaponDoorActions[door];
    } else if (type === 'masked') {
        currentAction = maskedDoorActions[door];
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
    
    // Update the store
    if (type === 'weapon') {
        weaponDoorActions[door] = nextAction;
    } else if (type === 'masked') {
        maskedDoorActions[door] = nextAction;
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
    
    // Send to ESP32 server
    sendAiConfigToServer();
}

// Send AI configuration to ESP32 server
function sendAiConfigToServer() {
    const ESP32_SERVER = 'http://192.168.1.100';
    const CONFIG_ENDPOINT = ESP32_SERVER + '/ai-config';
    
    const configData = {
        aiSystemEnabled: document.getElementById('aiSystemToggle').checked,
        maskedFaceEnabled: document.getElementById('maskedFaceToggle').checked,
        weaponEnabled: document.getElementById('weaponToggle').checked,
        aiDoorControlEnabled: document.getElementById('aiDoorControlToggle').checked,
        weaponDoorActions: weaponDoorActions,
        maskedDoorActions: maskedDoorActions,
        timestamp: new Date().toISOString()
    };
    
    fetch(CONFIG_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('AI Config sent to server:', data);
    })
    .catch(error => {
        console.log('Server not reachable (expected in dev):', error);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set initial states
    const weaponToggle = document.getElementById('weaponToggle');
    const maskedToggle = document.getElementById('maskedFaceToggle');
    
    // Add event listeners for config toggles to enable/disable setup cards
    weaponToggle.addEventListener('change', function() {
        const setupCard = document.getElementById('weaponSetupCard');
        if (this.checked) {
            setupCard.classList.add('active');
        } else {
            setupCard.classList.remove('active');
        }
    });
    
    maskedToggle.addEventListener('change', function() {
        const setupCard = document.getElementById('maskedFaceSetupCard');
        if (this.checked) {
            setupCard.classList.add('active');
        } else {
            setupCard.classList.remove('active');
        }
    });
});

// Refresh ESP32 feed
function refreshFeed() {
    const img = document.getElementById('esp32Feed');
    const currentSrc = img.src;
    img.src = '';
    setTimeout(() => {
        img.src = currentSrc + '?t=' + new Date().getTime();
    }, 100);
}