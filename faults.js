// Check for login status
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    // Redirect to login page if not logged in
    window.location.href = 'login.html';
} else {
// filepath: faults.js
// Bank Entrance System - Faults Page with API Integration
// System diagnostics, fault monitoring, and reporting

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
    const shownsidebar = '<div class = "shown-side-navigation-bar"><div><p>Print Info</p>  <svg class="print-icon" onclick="window.print()" aria-label="Print this page" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg class="phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="#25D366" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a></div><div><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div><p>Log Out</p><svg class="logout-icon" onclick="logout()" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
    const unclickedmenu = '<img class="navigation-menu" onclick="hideSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}

function getLogsEndpoint(logType) {
    return `/log?type=${encodeURIComponent(logType)}`;
}

function loadFaultLogs() {
    fetch(getLogsEndpoint('faults'))
        .then(response => {
            if (!response.ok) {
                throw new Error('Unable to fetch fault logs');
            }
            return response.json();
        })
        .then(data => {
            if (!data || !Array.isArray(data.logs)) {
                throw new Error('Malformed fault logs payload');
            }
            renderFaultLogs(data.logs.slice(-12).reverse());
            updateFaultStats(data.logs.length);
        })
        .catch(error => {
            console.warn('[Faults] Fault log fetch failed:', error);
        });
}

function renderFaultLogs(logs) {
    const logsList = document.querySelector('.logs-list');
    if (!logsList) return;

    if (logs.length === 0) {
        logsList.innerHTML = '<div class="log-row"><span class="log-id">--</span><span class="log-time">--</span><span class="log-reported">No faults logged</span><span class="log-status">--</span></div>';
        return;
    }

    logsList.innerHTML = logs.map((log, index) => {
        const time = log.timestamp || log.time || '--:--:--';
        const reported = log.message || log.action || log.door || 'Fault event';
        const status = log.status || 'UNRESOLVED';
        return `
            <div class="log-row">
                <span class="log-id">${index + 1}</span>
                <span class="log-time">${time}</span>
                <span class="log-reported">${reported}</span>
                <span class="log-status">${status}</span>
            </div>
        `;
    }).join('');
}

function updateFaultStats(totalLogs) {
    const statBoxes = document.querySelectorAll('.logs-stats .stat-value');
    if (!statBoxes || statBoxes.length < 3) return;
    statBoxes[0].textContent = totalLogs > 0 ? String(Math.min(3, totalLogs)) : '0';
    statBoxes[1].textContent = String(totalLogs);
    statBoxes[2].textContent = '0';
}

// ============================================
// Fault Status Storage
// ============================================

let currentFaults = {
    locks: [],
    motionControllers: [],
    pirSensors: []
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeEvacuateButton();
    initializeApiPolling();
    loadFaultLogs();
});

// ============================================
// API Integration for Real-time Updates
// ============================================

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

/**
 * Initialize API polling for fault status
 */
function initializeApiPolling() {
    if (typeof window.API !== 'undefined') {
        // Poll faults every 5 seconds
        window.API.startPolling('FAULTS', updateFaultsFromAPI, 5000);
        
        console.log('[Faults] API polling initialized');
    } else {
        console.warn('[Faults] API client not loaded, using fallback mode');
        // Fallback: simulate fault updates
        setInterval(simulateFaultUpdates, 5000);
    }
}

/**
 * Update faults from API data
 * @param {object} data - Fault data from API
 */
function updateFaultsFromAPI(data) {
    if (!data || !data.faults) return;
    
    const previousFaults = JSON.stringify(currentFaults);
    currentFaults = data.faults;
    
    // Update UI for each fault category
    updateFaultCategoryUI('lock-grid', data.faults.locks);
    updateFaultCategoryUI('mc-grid', data.faults.motionControllers);
    updateFaultCategoryUI('pir-grid', data.faults.pirSensors);
    
    // Log new faults
    if (previousFaults !== JSON.stringify(currentFaults)) {
        checkForNewFaults(data.faults);
    }
}

/**
 * Update a specific fault category in the UI
 * @param {string} gridClass - CSS class of the fault grid
 * @param {array} faults - Array of fault objects
 */
function updateFaultCategoryUI(gridClass, faults) {
    if (!faults) return;
    
    faults.forEach(fault => {
        const faultBox = document.querySelector(`.fault-box[data-id="${fault.id}"]`);
        if (faultBox) {
            const statusEl = faultBox.querySelector('.fault-status');
            if (statusEl) {
                statusEl.textContent = fault.status.toUpperCase();
                
                // Update status class
                statusEl.classList.remove('status-normal', 'status-warning', 'status-error');
                statusEl.classList.add(`status-${fault.status}`);
            }
        }
    });
}

/**
 * Check for new faults and log them
 * @param {object} faults - Current fault data
 */
function checkForNewFaults(faults) {
    // Check locks
    if (faults.locks) {
        faults.locks.forEach(fault => {
            if (fault.status !== 'normal') {
                console.log(`[FAULT] ${fault.name}: ${fault.status}`);
                if (typeof window.API !== 'undefined') {
                    window.API.addLogEntry(fault.name, 'FAULT', fault.status);
                }
            }
        });
    }
    
    // Check motion controllers
    if (faults.motionControllers) {
        faults.motionControllers.forEach(fault => {
            if (fault.status !== 'normal') {
                console.log(`[FAULT] ${fault.name}: ${fault.status}`);
                if (typeof window.API !== 'undefined') {
                    window.API.addLogEntry(fault.name, 'FAULT', fault.status);
                }
            }
        });
    }
    
    // Check PIR sensors
    if (faults.pirSensors) {
        faults.pirSensors.forEach(fault => {
            if (fault.status !== 'normal') {
                console.log(`[FAULT] ${fault.name}: ${fault.status}`);
                if (typeof window.API !== 'undefined') {
                    window.API.addLogEntry(fault.name, 'FAULT', fault.status);
                }
            }
        });
    }
}

// ============================================
// Fallback: Simulated updates (when API unavailable)
// ============================================

function simulateFaultUpdates() {
    // Simulate random fault status changes for testing
    const statuses = ['normal', 'normal', 'normal', 'warning', 'error'];
    const components = document.querySelectorAll('.fault-status');
    
    components.forEach(statusEl => {
        // 5% chance of status change
        if (Math.random() < 0.05) {
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            statusEl.textContent = randomStatus.toUpperCase();
            
            statusEl.classList.remove('status-normal', 'status-warning', 'status-error');
            statusEl.classList.add(`status-${randomStatus}`);
        }
    });
}

// ============================================
// Fault Reporting Functions
// ============================================

// Function to open the modal and dynamically set the title
function openReportModal(componentName) {
    const modal = document.getElementById('reportModal');
    const modalTitle = document.getElementById('modalTitle');
    const faultDesc = document.getElementById('faultDesc');

    // Set the title to show which component is being reported
    modalTitle.innerText = `Report Fault: ${componentName}`;
    
    // Reset the default description text
    faultDesc.value = "Type fault description...";

    // Show the modal
    modal.style.display = 'flex';
}

// Function to close the modal
function closeModal() {
    const modal = document.getElementById('reportModal');
    modal.style.display = 'none';
}

// Function to simulate sending the report
function sendReport() {
    const email = document.getElementById('faultEmail').value;
    const description = document.getElementById('faultDesc').value;
    const title = document.getElementById('modalTitle').innerText;

    // Basic validation
    if (!email || !description) {
        alert("Please ensure both email and description are filled out.");
        return;
    }

    // Log the report
    console.log(`Sending Report to ${email}: [${title}] - ${description}`);
    
    // Log to API
    if (typeof window.API !== 'undefined') {
        window.API.addLogEntry(title.replace('Report Fault: ', ''), 'REPORT', description.substring(0, 30));
    }
    
    alert('Fault report successfully sent to administrator.');
    
    closeModal();
}

// Optional: Close modal if user clicks anywhere outside of the modal content
window.onclick = function(event) {
    const modal = document.getElementById('reportModal');
    if (event.target == modal) {
        closeModal();
    }
}
}
