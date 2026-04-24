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
}// AI Control Page JavaScript
// filepath: BankEntranceSystemDashboard/combined_script.js
// Bank Entrance System - Door Control Client-side JavaScript

// Configuration - Update this to your ESP32 server IP
const ESP32_SERVER = 'http://192.168.1.100'; // Change to your ESP32 IP
const ACTION_ENDPOINT = ESP32_SERVER + '/action';
const LOG_ENDPOINT = ESP32_SERVER + '/log';

// Store for door actions (synced with server)
let doorActions = [];

// FIXED: Only declare doorStates once
let doorStates = {
    1: 'closed',
    2: 'closed',
    3: 'closed',
    4: 'closed'
};

// Initialize when DOM is ready
// FIXED: Combined the multiple DOMContentLoaded listeners into one
document.addEventListener('DOMContentLoaded', function() {
    initializeDoorButtons();
    initializeRefreshButton();
    loadLogData();
});

function initializeDoorButtons() {
    const doorButtons = document.querySelectorAll('.door-btn');
    
    doorButtons.forEach(button => {
        button.addEventListener('click', function() {
            const doorId = this.getAttribute('data-id');
            toggleDoor(doorId);
        });
    });
}

// Toggle door state between closed, open, and uncontrolled
function toggleDoor(doorId) {
    // Get the current state (default to 'closed' if it doesn't exist yet)
    const currentState = doorStates[doorId] || 'closed';
    
    // Determine the next state in the cycle
    let nextState;
    if (currentState === 'closed') {
        nextState = 'open';
    } else if (currentState === 'open') {
        nextState = 'auto-controlled';
    } else {
        nextState = 'closed';
    }
    
    // Save the new state
    doorStates[doorId] = nextState;
    
    // Update the button appearance
    const button = document.querySelector(`.door-btn[data-id="${doorId}"]`);
    
    if (button) {
        // Clean up by removing all possible state classes first
        button.classList.remove('closed', 'open', 'auto-controlled');
        
        // Add the appropriate class and update the text based on the new state
        if (nextState === 'open') {
            button.classList.add('open');
            button.querySelector('.door-status').textContent = 'OPEN';
        } 
        else if (nextState === 'closed') {
            button.classList.add('closed');
            button.querySelector('.door-status').textContent = 'CLOSED';
        } 
        else if (nextState === 'auto-controlled') {
            button.classList.add('auto-controlled');
            button.querySelector('.door-status').textContent = 'AUTO-CONTROLLED';
        }
    }

    // FIXED: The fetch logic and console logs are now properly INSIDE the function
    console.log('Door toggled:', doorId, nextState);
    
    // Create action data
    const actionData = {
        Clicked: doorId,
        Time: new Date().toISOString(),
        WebClient: '' // Will be filled by server
    };
    
    // Send to server
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
            const state = doorStates[doorId];
            const stateCapitalized = state.charAt(0).toUpperCase() + state.slice(1);
            showNotification(`Door ${doorId} ${stateCapitalized}!`, 'success');
            // Refresh log after successful logging
            setTimeout(loadLogData, 500);
        } else if (data.status === 'ignored') {
            console.log('Action not logged');
        } else {
            showNotification('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error sending action:', error);
        showNotification('Failed to communicate with server', 'error');
    });
} // <--- FIXED: This closing bracket was originally in the wrong place

// Initialize refresh button
function initializeRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadLogData);
    }
}

// Load log data from server
function loadLogData() {
    fetch(LOG_ENDPOINT)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        doorActions = data;
        displayLog();
    })
    .catch(error => {
        console.error('Error loading log:', error);
        showLogError();
    });
}

// Display log in container - newest at top
function displayLog() {
    const container = document.getElementById('logContainer');
    
    if (!container) return;
    
    if (doorActions.length === 0) {
        container.innerHTML = '<p class="empty-log">No actions recorded yet.</p>';
        return;
    }
    
    // Build log entries HTML - newest first
    let logHTML = '';
    
    // Display in reverse order (newest first)
    for (let i = doorActions.length - 1; i >= 0; i--) {
        const action = doorActions[i];
        logHTML += `
            <div class="log-entry">
                <div class="log-time">${formatTime(action.Time)}</div>
                <div class="log-clicked">Door ${action.Clicked || '-'}</div>
                <div class="log-client">Client: ${action.WebClient || '-'}</div>
            </div>
        `;
    }
    
    container.innerHTML = logHTML;
}

// Format timestamp for display
function formatTime(timestamp) {
    if (!timestamp) return '-';
    
    // If it's a millisecond timestamp (number)
    if (typeof timestamp === 'number') {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }
    
    // If it's an ISO string
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString();
        }
        return timestamp;
    }
    
    return String(timestamp);
}

// Show notification message
function showNotification(message, type) {
    // Remove existing notification if any
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles dynamically
    notification.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? 'rgb(46, 204, 113)' : 'rgb(231, 76, 60)'};
        font-size: 0.8rem;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Show log error
function showLogError() {
    const container = document.getElementById('logContainer');
    if (container) {
        container.innerHTML = '<p class="empty-log">Error loading log data. Make sure ESP32 is connected.</p>';
    }
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export for debugging
window.bankEntranceSystem = {
    doorActions: doorActions,
    doorStates: doorStates,
    loadLogData: loadLogData,
    toggleDoor: toggleDoor
};