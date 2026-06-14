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

function openAiPage(){
    window.location.href = "aicontrol.html";
}

function hideSideNavigationBar(){
    const hiddensidebar = '<div class = "hidden-side-navigation-bar"></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = hiddensidebar;
    const clickedmenu = '<svg class="navigation-menu" onclick="showSideNavigationBar()" viewBox="0 0 24 18" width="30" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" role="button" aria-label="Open menu"><line x1="0" y1="1" x2="24" y2="1"/><line x1="0" y1="9" x2="24" y2="9"/><line x1="0" y1="17" x2="24" y2="17"/></svg>';
    document.querySelector('.js-navigation-menu').innerHTML = clickedmenu;
}

function showSideNavigationBar(){
    const shownsidebar = '<div class = "shown-side-navigation-bar"><div onclick="openPrintLogsDialog()"><p>Print Info</p>  <svg class="print-icon" aria-label="Print logs" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="34" height="34" stroke="none"><circle cx="16" cy="16" r="16" fill="#25D366"/><path fill="#FFFFFF" d="M16 6.5c-5.2 0-9.5 4-9.5 9c0 1.8.6 3.5 1.7 5L7 25.5l5.2-1.6c1.2.6 2.5.9 3.8.9 5.2 0 9.5-4 9.5-9s-4.3-9.3-9.5-9.3z"/><path fill="#25D366" d="M13.3 11.2c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.7.1-.9.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.3 3.2.2.2 2.2 3.4 5.4 4.7 2.7 1.1 3.2.9 3.8.8.6-.1 1.8-.8 2-1.5 .3-.7.3-1.3.2-1.5-.1-.2-.5-.3-1.1-.6-.6-.3-1.4-.7-1.6-.8-.2-.1-.5-.1-.7.2 -.2.3-.8.8-1 .9-.2.1-.4.1-.7 0-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.5-1.8-1.7-2.1 -.2-.3 0-.5.1-.7.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2.1-.4 0-.6 -.1-.2-.7-1.7-.9-2.3z"/></svg></a></div><div onclick="showThemeSettings()"><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div><p>Log Out</p><svg class="logout-icon" onclick="logout()" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div></div>';
    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
    const unclickedmenu = '<svg class="navigation-menu" onclick="hideSideNavigationBar()" viewBox="0 0 24 18" width="30" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" role="button" aria-label="Close menu"><line x1="0" y1="1" x2="24" y2="1"/><line x1="0" y1="9" x2="24" y2="9"/><line x1="0" y1="17" x2="24" y2="17"/></svg>';
    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}

function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name === 'light' ? 'light' : 'dark');
}

function toggleTheme(name) {
    localStorage.setItem('systemTheme', name);
    applyTheme(name);
    document.querySelectorAll('.theme-item').forEach(el => {
        el.classList.toggle('active', el.dataset.theme === name);
    });
}

function showThemeSettings() {
    const current = localStorage.getItem('systemTheme') || 'dark';
    document.querySelector('.js-side-navigation-bar').innerHTML = `
        <div class="theme-panel">
            <div class="theme-panel-heading">Set Theme</div>
            <div class="theme-item ${current === 'dark' ? 'active' : ''}" data-theme="dark" onclick="toggleTheme('dark')">
                <svg class="theme-tick-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8.5 6 12 13.5 4"/></svg>
                <span>Dark</span>
            </div>
            <div class="theme-item ${current === 'light' ? 'active' : ''}" data-theme="light" onclick="toggleTheme('light')">
                <svg class="theme-tick-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8.5 6 12 13.5 4"/></svg>
                <span>Light</span>
            </div>
        </div>`;
    setTimeout(() => document.addEventListener('click', _themePanelOutside), 0);
}

function _themePanelOutside(e) {
    if (!document.querySelector('.theme-panel')?.contains(e.target)) {
        document.removeEventListener('click', _themePanelOutside);
        hideSideNavigationBar();
    }
}

function closeThemeSettings() {
    document.removeEventListener('click', _themePanelOutside);
    hideSideNavigationBar();
}

(function () {
    const saved = localStorage.getItem('systemTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
}());

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

function updateFaultStats(faults) {
    const boxes = document.querySelectorAll('.logs-stats .stat-value');
    if (!boxes || boxes.length < 3) return;
    const all = [
        ...(faults && faults.locks              || []),
        ...(faults && faults.motionControllers  || []),
        ...(faults && faults.pirSensors         || [])
    ];
    boxes[0].textContent = all.filter(c => c.status === 'fault').length;
    boxes[1].textContent = all.reduce((s, c) => s + (c.count || 0), 0);
    boxes[2].textContent = '0';
}

// ── In-memory fault state ─────────────────────────────────────
const _faultState   = {};
let   _reportContext = { component: '--', count: 0, acknowledged: false };

function applyFaultsData(data) {
    if (!data || !data.faults) return;
    [...(data.faults.locks || []), ...(data.faults.motionControllers || []), ...(data.faults.pirSensors || [])].forEach(comp => {
        _faultState[comp.id] = { count: comp.count || 0, acknowledged: comp.status === 'fault' };
        updateFaultBox(comp.id, comp.status, comp.count || 0);
    });
    updateFaultStats(data.faults);
}

function updateFaultBox(componentId, status, count) {
    const box = document.querySelector('.fault-box[data-fault-id="' + componentId + '"]');
    if (!box) return;
    const statusEl = box.querySelector('.fault-status');
    const countEl  = box.querySelector('.fault-count-badge');
    if (statusEl) {
        statusEl.textContent = status === 'fault' ? 'FAULT' : 'NORMAL';
        statusEl.className   = 'fault-status status-' + (status === 'fault' ? 'fault' : 'normal');
    }
    if (countEl) {
        countEl.textContent = count + '/5';
        countEl.className   = 'fault-count-badge' + (count >= 5 ? ' count-critical' : count > 0 ? ' count-warning' : '');
    }
}

function clearAllFaults() {
    fetch(ACTION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR_FAULTS', user: getActiveUser() })
    })
    .then(r => r.ok ? r.json().catch(() => ({})) : Promise.reject(r.status))
    .then(() => { showNotification('All faults cleared', 'success'); pollFaults(); loadFaultLogs(); })
    .catch(err => { console.warn('[Faults] Clear failed', err); showNotification('Clear failed — ESP32 not reachable', 'error'); });
}

// ── SSE + polling ─────────────────────────────────────────────
let faultEventSource    = null;
let faultFallbackActive = false;

function startFaultSSE() {
    if (!('EventSource' in window)) { startFaultFallback(); return; }
    faultEventSource = new EventSource('/events');
    faultEventSource.addEventListener('fault', ev => {
        try { applyFaultsData(JSON.parse(ev.data)); } catch (e) { console.warn('[Faults] Bad fault SSE payload', e); }
    });
    faultEventSource.onerror = () => { startFaultFallback(); };
}

function startFaultFallback() {
    if (faultFallbackActive) return;
    faultFallbackActive = true;
    console.warn('[Faults] SSE unavailable — polling every 3 s');
    setInterval(pollFaults, 3000);
}

function pollFaults() {
    const url = (API_ENDPOINTS.FAULTS_STATUS) || '/api/faults.json';
    fetch(url, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(applyFaultsData)
        .catch(err => console.warn('[Faults] Poll failed', err));
}

// ============================================
// API Integration for Real-time Updates
// ============================================

const ACTION_ENDPOINT = API_ENDPOINTS.ACTION || '/action';

function getActiveUser() {
    return sessionStorage.getItem('username') || 'Unknown';
}

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
        time: new Date().toISOString(),
        user: getActiveUser()
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

// ── Report modal ──────────────────────────────────────────────
function openReportModal(componentName) {
    const modal = document.getElementById('reportModal');
    document.getElementById('modalTitle').textContent     = 'Report Fault: ' + componentName;
    document.getElementById('modalComponent').textContent = componentName;
    document.getElementById('faultDesc').value            = '';
    const info       = _faultState[componentName] || { count: 0, acknowledged: false };
    const statusText = info.acknowledged
        ? 'FAULT ACKNOWLEDGED (' + info.count + ' occurrences)'
        : info.count > 0 ? 'PENDING — ' + info.count + '/5 occurrences' : 'NORMAL';
    document.getElementById('modalStatus').textContent = statusText;
    _reportContext = { component: componentName, count: info.count, acknowledged: info.acknowledged };
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.style.display = 'none';
}

function openInGmail() {
    const c     = _reportContext.component;
    const count = _reportContext.count || 0;
    const ack   = _reportContext.acknowledged;
    const notes = (document.getElementById('faultDesc').value || '').trim();
    const ts    = new Date().toLocaleString();

    const subject = 'FAULT REPORT: ' + c + ' — Bank Entrance System';
    const body = [
        'AUTOMATED FAULT REPORT — Bank Entrance System',
        '',
        'Component:   ' + c,
        'Status:      ' + (ack ? 'FAULT ACKNOWLEDGED' : count > 0 ? 'PENDING (' + count + '/5)' : 'NORMAL'),
        'Occurrences: ' + count,
        'Reported At: ' + ts,
        '',
        notes ? 'Operator Notes:\n' + notes : 'No additional notes provided.',
        '',
        '---',
        'This report was generated by the Bank Entrance System Dashboard.'
    ].join('\n');

    const to  = 'brezhnevndlovu02@gmail.com,s.nhema@nust.ac.zw,n02125285w@students.nust.ac.zw';
    const url = 'https://mail.google.com/mail/?view=cm&fs=1'
        + '&to='   + encodeURIComponent(to)
        + '&su='   + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);

    window.open(url, '_blank', 'noopener,noreferrer');
    closeModal();
}

window.addEventListener('click', ev => {
    const modal = document.getElementById('reportModal');
    if (modal && ev.target === modal) closeModal();
});

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem('systemTheme') || 'dark');
    initializeEvacuateButton();
    pollFaults();
    loadFaultLogs();
    startFaultSSE();
});

}
