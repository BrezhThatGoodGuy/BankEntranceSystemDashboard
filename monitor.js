// ============================================================
// monitor.js  –  Bank Entrance System: Monitor Page
// Real-time door state + live CCTV + SSE-driven UI updates
// ============================================================

// ── Auth guard ───────────────────────────────────────────────
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

// Populate user initial in avatar
(function () {
    const stored = sessionStorage.getItem('username') || '';
    const el = document.querySelector('.user-name');
    if (el) el.textContent = stored.trim().charAt(0).toUpperCase() || '';
})();


// ============================================================
// DOOR CONFIGURATION
// Maps doorId (1-4) → DOM selectors and CSS class names.
//
// ATmega pin logic (from ATmega328p.ino):
//   DOOR_x_UNLOCKED  →  DOORxG = HIGH, DOORxR = LOW  →  locked = false
//   DOOR_x_LOCKED    →  DOORxG = LOW,  DOORxR = HIGH  →  locked = true
//
// Mag-contact events:
//   DOOR_x_OPENED  →  digitalRead(doorx) == LOW  (pull-down, door reed open)
//   DOOR_x_CLOSED  →  digitalRead(doorx) == HIGH (reed closed again)
// ============================================================
const DOOR_CONFIG = {
    1: {
        name: 'ENT.D1',
        label: 'Outside Entrance',
        openClass:  'outside-entrance-opened',
        closeClass: 'outside-entrance-closed',
        lockIconId: 'ent-d1-lock-icon'
    },
    2: {
        name: 'ENT.D2',
        label: 'Inside Entrance',
        openClass:  'inside-entrance-opened',
        closeClass: 'inside-entrance-closed',
        lockIconId: 'ent-d2-lock-icon'
    },
    3: {
        name: 'EXT.D3',
        label: 'Inside Exit',
        openClass:  'inside-exit-opened',
        closeClass: 'inside-exit-closed',
        lockIconId: 'ext-d3-lock-icon'
    },
    4: {
        name: 'EXT.D4',
        label: 'Outside Exit',
        openClass:  'outside-exit-opened',
        closeClass: 'outside-exit-closed',
        lockIconId: 'ext-d4-lock-icon'
    }
};

// ── In-memory door state cache ───────────────────────────────
const currentDoorStates = {
    1: { state: 'closed', locked: true },
    2: { state: 'closed', locked: true },
    3: { state: 'closed', locked: true },
    4: { state: 'closed', locked: true }
};

const API_ENDPOINTS = window.API_ENDPOINTS || {};

let monitorEventSource   = null;
let fallbackPollingActive = false;


// ============================================================
// UTILITY HELPERS
// ============================================================

function escapeHTML(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Normalise any door-state string to 'opened' or 'closed'.
 * Returns the original value unchanged if it is neither.
 */
function normalizeDoorState(raw) {
    const v = String(raw ?? '').trim().toLowerCase();
    if (v === 'open'  || v === 'opened') return 'opened';
    if (v === 'close' || v === 'closed') return 'closed';
    return v;
}

/**
 * Turn any timestamp value into HH:MM:SS.
 * Accepts: ESP32 uptime strings ("01:23:45"), ISO strings, millis numbers.
 * Falls back to the current local time.
 */
function normalizeTimestamp(value) {
    if (value === null || value === undefined || value === '') {
        return new Date().toLocaleTimeString([], { hour12: false });
    }
    const raw = String(value).trim();
    // Already HH:MM:SS (or H:MM:SS etc.)
    if (/^\d{1,6}:\d{2}:\d{2}$/.test(raw)) return raw;
    // ISO / parseable date
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour12: false });
    // Extract time substring
    const m = raw.match(/(\d{1,6}:\d{2}:\d{2})/);
    if (m) return m[1];
    return new Date().toLocaleTimeString([], { hour12: false });
}


// ============================================================
// DOOR EVENT PARSING
// Accepts SSE JSON payloads OR plain UART-format strings.
// ============================================================

/**
 * Parse an inbound door event (SSE data or log object).
 * Returns { doorId, state, locked, timestamp, message } or null.
 */
function parseDoorEvent(input) {
    if (!input) return null;

    // ── Structured object (SSE JSON payload) ────────────────
    if (typeof input === 'object') {
        const doorId = Number(input.doorId ?? input.id ?? input.door);
        const state  = normalizeDoorState(input.state ?? input.status ?? input.action);

        if (doorId >= 1 && doorId <= 4 && (state === 'opened' || state === 'closed')) {
            return {
                doorId,
                state,
                // locked may arrive on door events OR only via status events
                locked: typeof input.locked === 'boolean'
                    ? input.locked
                    : currentDoorStates[doorId]?.locked,
                timestamp: input.timestamp || input.time || null,
                message:   input.message || `Door ${doorId} ${state}`
            };
        }
        return null;
    }

    // ── Plain string  e.g. "DOOR_1_OPENED" ──────────────────
    const text  = String(input);
    const match = text.match(/door_?(\d)_?(opened?|closed?)/i);
    if (!match) return null;

    const doorId = Number(match[1]);
    const state  = normalizeDoorState(match[2]);
    if (doorId < 1 || doorId > 4) return null;

    return {
        doorId,
        state,
        locked: currentDoorStates[doorId]?.locked,
        timestamp: null,
        message: `Door ${doorId} ${state}`
    };
}


// ============================================================
// DOM UPDATE FUNCTIONS
// ============================================================

/**
 * Update the mag-contact visual bars inside .bank-booth-template.
 *
 * BUG FIX: The original code toggled a CSS class on the *parent*
 * (.bank-booth-template) AND set inline style.display on the
 * child elements.  Inline styles have higher specificity than
 * classes, so whichever was set first would permanently "win"
 * once the inline style was written.  We now use ONLY inline
 * style.display on the child elements — the CSS default display
 * values in monitor.css still set the initial state correctly,
 * and we override them in JS as needed.
 */
function updateDoorMagContactUI(doorId, state) {
    const cfg = DOOR_CONFIG[doorId];
    if (!cfg) return;

    const booth   = document.querySelector('.bank-booth-template');
    if (!booth) return;

    const openEl  = booth.querySelector('.' + cfg.openClass);
    const closeEl = booth.querySelector('.' + cfg.closeClass);
    const isOpen  = normalizeDoorState(state) === 'opened';

    if (openEl)  openEl.style.display  = isOpen ? 'block' : 'none';
    if (closeEl) closeEl.style.display = isOpen ? 'none'  : 'block';

    // Data attribute for debugging / future CSS hooks
    booth.setAttribute(`data-door-${doorId}-state`, isOpen ? 'opened' : 'closed');
}

/**
 * Update the padlock icon for a door.
 *
 * ATmega logic (from ATmega328p.ino → setDoorOutput):
 *   Green HIGH / Red LOW  →  UNLOCKED  →  locked = false  →  unlocked-padlock.png
 *   Green LOW  / Red HIGH →  LOCKED    →  locked = true   →  locked-padlock.png
 *
 * ESP32 sends DOOR_x_LOCKED / DOOR_x_UNLOCKED over UART when
 * the output state changes; the ESP32 relays these as SSE
 * "status" events with the full doors[] array.
 */
function updateDoorLockIcon(doorId, locked) {
    const cfg  = DOOR_CONFIG[doorId];
    if (!cfg) return;

    const icon = document.getElementById(cfg.lockIconId);
    if (!icon) return;

    const isLocked = locked === true;
    icon.src = isLocked ? 'locked-padlock.png' : 'unlocked-padlock.png';
    icon.alt = `${cfg.name} – ${isLocked ? 'Locked' : 'Unlocked'}`;

    // CSS classes drive the glow effect defined in monitor.css
    icon.classList.toggle('locked',   isLocked);
    icon.classList.toggle('unlocked', !isLocked);
}

/**
 * Apply a complete door state object to the UI.
 * @param {number} doorId
 * @param {{ state: string, locked: boolean }} doorData
 */
function updateDoorUI(doorId, doorData) {
    if (!doorData || !DOOR_CONFIG[doorId]) return;
    if (doorData.state   !== undefined) updateDoorMagContactUI(doorId, doorData.state);
    if (doorData.locked  !== undefined) updateDoorLockIcon(doorId, doorData.locked);
}

/** Paint all four doors to their current cached state on first load. */
function initializeDoorUI() {
    for (let id = 1; id <= 4; id++) {
        updateDoorUI(id, currentDoorStates[id]);
    }
    console.log('[Monitor] Door UI initialized');
}


// ============================================================
// EVENT APPLICATION  (SSE "door" event → state cache → DOM)
// ============================================================

/**
 * Apply a parsed door event:
 *   1. Update the in-memory cache.
 *   2. Update the booth template and lock icon.
 *   3. Optionally prepend a log entry.
 */
function applyDoorEvent(raw, options = {}) {
    const ev = (typeof raw === 'string' || typeof raw === 'object') && raw !== null
        ? parseDoorEvent(raw)
        : null;
    if (!ev) return;

    const prev  = currentDoorStates[ev.doorId] || { state: 'closed', locked: true };
    const next  = {
        state:  ev.state,
        locked: typeof ev.locked === 'boolean' ? ev.locked : prev.locked
    };

    currentDoorStates[ev.doorId] = next;
    updateDoorUI(ev.doorId, next);

    if (options.addLog) {
        addLogEntryToUI({
            time:    ev.timestamp,
            door:    DOOR_CONFIG[ev.doorId]?.name || `Door ${ev.doorId}`,
            action:  'state changed to',
            status:  ev.state
        });
    }
}


// ============================================================
// STATUS EVENT  (SSE "status" event → counters + all door states)
// ============================================================

/**
 * Handle the ESP32 "status" SSE event payload.
 * Payload shape (from sketch buildStatusPayload):
 * {
 *   uptime, camera_ready, entries, exits, inside,
 *   doors: [ { id, name, state, locked }, … ]
 * }
 */
function applyStatusEvent(data) {
    if (!data) return;

    // ── Counters ─────────────────────────────────────────────
    const up = document.getElementById('system-uptime');
    const en = document.getElementById('total-entries');
    const ex = document.getElementById('total-exits');
    const ins = document.getElementById('clients-inside');

    if (up  && data.uptime   !== undefined) up.textContent  = normalizeTimestamp(data.uptime);
    if (en  && data.entries  !== undefined) en.textContent  = data.entries;
    if (ex  && data.exits    !== undefined) ex.textContent  = data.exits;
    if (ins && data.inside   !== undefined) ins.textContent = data.inside;

    // ── Door states (includes locked flag) ───────────────────
    if (Array.isArray(data.doors)) {
        data.doors.forEach(d => {
            const id = Number(d.id);
            if (!DOOR_CONFIG[id]) return;

            const prev  = currentDoorStates[id];
            const state = normalizeDoorState(d.state || prev.state || 'closed');
            const locked = typeof d.locked === 'boolean' ? d.locked : prev.locked;

            currentDoorStates[id] = { state, locked };
            updateDoorUI(id, currentDoorStates[id]);
        });
    }
}


// ============================================================
// LOG DISPLAY
// ============================================================

/**
 * Prepend a single log row to #logContainer.
 * Keeps the list trimmed to 10 entries.
 */
function addLogEntryToUI({ time, door, action, status }) {
    const container = document.getElementById('logContainer');
    if (!container) return;

    const empty = container.querySelector('.empty-log');
    if (empty) empty.remove();

    const ts  = normalizeTimestamp(time);
    const row = document.createElement('div');
    row.className = 'log-entry';
    row.innerHTML =
        `<span class="log-time">[${escapeHTML(ts)}]</span> ` +
        `<span class="log-clicked">${escapeHTML(door || 'Door')}</span> ` +
        `${escapeHTML(action || 'state changed to')} ` +
        `<span class="log-client">${escapeHTML(status || '')}</span>`;

    container.insertBefore(row, container.firstChild);
    while (container.children.length > 10) container.removeChild(container.lastChild);
}

/**
 * Bulk-render logs returned by GET /log?type=monitoring.
 * Payload shape: { logs: [ { timestamp, message }, … ] }
 */
function renderLogsFromPayload(data) {
    const container = document.getElementById('logContainer');
    if (!container) return;

    if (!data || !Array.isArray(data.logs) || data.logs.length === 0) {
        container.innerHTML = '<div class="empty-log">No recent door activity…</div>';
        return;
    }

    // Most-recent first; cap display at 10
    const rows = data.logs.slice(-10).reverse();
    container.innerHTML = rows.map(log => {
        const ts  = normalizeTimestamp(log.timestamp || log.time);
        const msg = escapeHTML(log.message || log.action || log.status || JSON.stringify(log));
        return `<div class="log-entry">
                    <span class="log-time">[${escapeHTML(ts)}]</span>
                    <span class="log-clicked">${msg}</span>
                </div>`;
    }).join('');
}

function clearLogs() {
    const c = document.getElementById('logContainer');
    if (c) c.innerHTML = '<div class="empty-log">No recent door activity…</div>';
}


// ============================================================
// POLLING FALLBACK  (used when SSE is unavailable)
// ============================================================

function pollMonitoringLogs() {
    const url = API_ENDPOINTS.LOGS_QUERY
        ? API_ENDPOINTS.LOGS_QUERY('monitoring')
        : '/log?type=monitoring';
    fetch(url, { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(renderLogsFromPayload)
        .catch(() => console.warn('[Monitor] Log poll failed'));
}

function pollStatus() {
    const primary = API_ENDPOINTS.STATUS_PRIMARY || '/api/status.json';
    const fallback = API_ENDPOINTS.STATUS_FALLBACK || '/status.json';
    fetch(primary, { cache: 'no-store' })
        .catch(() => fetch(fallback, { cache: 'no-store' }))
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(applyStatusEvent)
        .catch(err => console.warn('[Monitor] Status poll failed', err));
}

function startFallbackPolling() {
    if (fallbackPollingActive) return;
    fallbackPollingActive = true;
    console.warn('[Monitor] SSE unavailable – falling back to polling');
    setInterval(pollMonitoringLogs, 3000);
    setInterval(pollStatus,          3000);
}


// ============================================================
// SERVER-SENT EVENTS  (primary real-time channel)
// ============================================================

function startEventStream() {
    if (!('EventSource' in window)) {
        console.warn('[Monitor] EventSource not supported');
        return false;
    }

    monitorEventSource = new EventSource('/events');

    monitorEventSource.addEventListener('open', () => {
        console.log('[Monitor] SSE connected to ESP32 /events');
    });

    // "door" events: mag-contact open/close from ATmega digitalRead
    // Payload: { type, doorId, doorName, state, locked, timestamp, … }
    monitorEventSource.addEventListener('door', ev => {
        try {
            applyDoorEvent(JSON.parse(ev.data), { addLog: true });
        } catch (e) {
            console.warn('[Monitor] Bad door SSE payload', e, ev.data);
        }
    });

    // "status" events: full system snapshot including locked flags
    // Triggered by: DOOR_x_LOCKED / DOOR_x_UNLOCKED UART messages
    //               and STATS updates from ATmega sendStatusUpdate()
    monitorEventSource.addEventListener('status', ev => {
        try {
            applyStatusEvent(JSON.parse(ev.data));
        } catch (e) {
            console.warn('[Monitor] Bad status SSE payload', e, ev.data);
        }
    });

    monitorEventSource.onerror = () => {
        console.warn('[Monitor] SSE disconnected; browser will auto-retry');
        startFallbackPolling();
    };

    return true;
}


// ============================================================
// LIVE CCTV IMAGE REFRESH
// BUG FIX: original script.js targeted '.live-view-template'
// (the container div) instead of '.live-image-container' (the
// <img>), so imgElement.src was always undefined.  Fixed here
// and the duplicate setInterval in script.js should be removed.
// ============================================================

function refreshCCTV() {
    const img = document.querySelector('.live-image-container');
    const streamUrl = API_ENDPOINTS.STREAM || '/stream';
    if (img) img.src = `${streamUrl}?t=${Date.now()}`;
}

setInterval(refreshCCTV, 100);


// ============================================================
// EVACUATE BUTTON
// ============================================================

const ACTION_ENDPOINT = API_ENDPOINTS.ACTION || '/action';

const MODE_LABELS = {
    evacuate: 'Evacuation',
    normal:   'Normal-Traffic',
    exit:     'Exit-Only',
    entrance: 'Entrance-Only',
    lock:     'Lock-All'
};

function setOperationMode(modeId) {
    const label = MODE_LABELS[modeId] || modeId;
    fetch(ACTION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MODE_CHANGE', mode: label })
    })
    .then(r => r.ok ? r.json().catch(() => ({})) : Promise.reject(r.status))
    .then(() => showToast(`Mode → ${label}`, 'success'))
    .catch(err => {
        console.warn('[Monitor] Mode change failed', err);
        showToast(`Mode change failed: ${label}`, 'error');
    });
    localStorage.setItem('modeSync', JSON.stringify({ mode: modeId, ts: Date.now() }));
}


// ============================================================
// TOAST NOTIFICATION
// ============================================================

function showToast(message, type) {
    if (!document.getElementById('_toast-styles')) {
        const s = document.createElement('style');
        s.id = '_toast-styles';
        s.textContent = `
            @keyframes _toastIn  { from { transform:translateX(110%); opacity:0 } to { transform:none; opacity:1 } }
            @keyframes _toastOut { from { transform:none; opacity:1 } to { transform:translateX(110%); opacity:0 } }
        `;
        document.head.appendChild(s);
    }
    const colors = { success: 'rgba(46,204,113,.92)', error: 'rgba(231,76,60,.92)', info: 'rgba(52,152,219,.92)' };
    const t = document.createElement('div');
    t.style.cssText =
        `position:fixed;top:20px;right:20px;padding:12px 22px;border-radius:8px;` +
        `background:${colors[type] || colors.info};color:#fff;` +
        `box-shadow:0 4px 15px rgba(0,0,0,.3);z-index:10001;` +
        `animation:_toastIn .3s ease-out;font-size:13px;`;
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.animation = '_toastOut .3s ease-out forwards';
        setTimeout(() => t.parentNode && t.parentNode.removeChild(t), 310);
    }, 3000);
}


// ============================================================
// NAVIGATION (shared across pages)
// ============================================================

function openMonitorPage()  { window.location.href = 'monitor.html';   }
function openControlPage()  { window.location.href = 'control.html';   }
function openFaultsPage()   { window.location.href = 'faults.html';    }
function openAiPage()       { window.location.href = 'aicontrol.html'; }

function hideSideNavigationBar() {
    document.querySelector('.js-side-navigation-bar').innerHTML =
        '<div class="hidden-side-navigation-bar"></div>';
    document.querySelector('.js-navigation-menu').innerHTML =
        '<svg class="navigation-menu" onclick="showSideNavigationBar()" viewBox="0 0 24 18" width="30" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" role="button" aria-label="Open menu"><line x1="0" y1="1" x2="24" y2="1"/><line x1="0" y1="9" x2="24" y2="9"/><line x1="0" y1="17" x2="24" y2="17"/></svg>';
}

function showSideNavigationBar() {
    document.querySelector('.js-navigation-menu').innerHTML =
        '<svg class="navigation-menu" onclick="hideSideNavigationBar()" viewBox="0 0 24 18" width="30" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" role="button" aria-label="Close menu"><line x1="0" y1="1" x2="24" y2="1"/><line x1="0" y1="9" x2="24" y2="9"/><line x1="0" y1="17" x2="24" y2="17"/></svg>';
    document.querySelector('.js-side-navigation-bar').innerHTML = `
        <div class="shown-side-navigation-bar">
            <div onclick="openPrintLogsDialog()">
                <p>Print Info</p>
                <svg class="print-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-label="Print logs">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
            </div>
            <div>
                <p>Help</p>
                <a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp support">
                    <svg class="phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="#25D366" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                </a>
            </div>
            <div onclick="showThemeSettings()">
                <p>Settings</p>
                <svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
            </div>
            <div onclick="logout ? logout() : void 0">
                <p>Log Out</p>
                <svg class="logout-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </div>
        </div>`;
}

// Theme helpers (used by settings panel in showSideNavigationBar)
function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name === 'light' ? 'light' : 'dark');
}

function toggleTheme(name) {
    localStorage.setItem('systemTheme', name);
    applyTheme(name);
    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.toggle('active', el.dataset.theme === name);
    });
}

function showThemeSettings() {
    const current = localStorage.getItem('systemTheme') || 'dark';
    document.querySelector('.js-side-navigation-bar').innerHTML = `
        <div class="theme-settings-overlay" onclick="closeThemeSettings(event)">
            <div class="theme-settings-card" onclick="event.stopPropagation()">
                <div class="theme-card-header">
                    <h2>System Theme</h2>
                    <button class="close-theme-btn" onclick="closeThemeSettings()">✕</button>
                </div>
                <div class="theme-card-body">
                    <p class="theme-description">Choose your preferred theme</p>
                    <div class="theme-options">
                        <div class="theme-option ${current === 'dark' ? 'active' : ''}" data-theme="dark" onclick="toggleTheme('dark')">
                            <div class="theme-preview dark-preview"></div><span>Dark</span>
                        </div>
                        <div class="theme-option ${current === 'light' ? 'active' : ''}" data-theme="light" onclick="toggleTheme('light')">
                            <div class="theme-preview light-preview"></div><span>Light</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

function closeThemeSettings() {
    document.querySelector('.js-side-navigation-bar').innerHTML =
        '<div class="hidden-side-navigation-bar"></div>';
}


// ============================================================
// PRINT LOGS DIALOG  (unchanged logic, cleaned up)
// ============================================================

const ESP_LOG_FILE_CONFIG = [
    { key: 'monitoring', label: 'Monitoring Logs', url: '/logs/monitoring.txt' },
    { key: 'control',    label: 'Control Logs',    url: '/logs/control.txt'    },
    { key: 'faults',     label: 'Faults Logs',     url: '/logs/faults.txt'     },
    { key: 'ai',         label: 'AI Logs',          url: '/logs/ai.txt'         }
];

function openPrintLogsDialog() {
    closePrintLogsDialog();
    const items = ESP_LOG_FILE_CONFIG.map(f =>
        `<label class="print-checkbox-label">
            <input type="checkbox" class="log-file-checkbox" value="${f.key}" checked>
            <span>${f.label}</span>
        </label>`
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
                    <button type="button" class="btn-print"  onclick="printSelectedLogFiles()">PRINT</button>
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
    if (!keys.length) { if (errEl) errEl.textContent = 'Please select at least one log file.'; return; }
    if (errEl) errEl.textContent = '';

    const selected = ESP_LOG_FILE_CONFIG.filter(f => keys.includes(f.key));
    Promise.all(selected.map(f =>
        fetch(f.url, { cache: 'no-store', headers: { Accept: 'text/plain' } })
            .then(r => r.ok ? r.text() : Promise.reject(`Cannot load ${f.label}`))
            .then(text => ({ ...f, text }))
    ))
    .then(files => { closePrintLogsDialog(); buildAndPrintLogs(files); })
    .catch(err => { if (errEl) errEl.textContent = String(err); });
}

function buildAndPrintLogs(files) {
    const existing = document.getElementById('printableLogsArea');
    if (existing) existing.remove();

    const sections = files.map(f =>
        `<section class="printable-log-file"><h2>${f.label}</h2><pre>${escapeHTML(f.text)}</pre></section>`
    ).join('');

    document.body.insertAdjacentHTML('beforeend', `
        <div id="printableLogsArea" class="printable-log-area active">
            <div class="printable-logs-header">
                <h1>ESP Log Printout</h1>
                <p>${files.map(f => f.label).join(', ')}</p>
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


// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Restore saved theme
    applyTheme(localStorage.getItem('systemTheme') || 'dark');

    // Wire evacuate button
    const evBtn = document.querySelector('.evacuate');
    if (evBtn) evBtn.addEventListener('click', () => setOperationMode('evacuate'));

    // Paint doors to default closed/locked state
    initializeDoorUI();

    // Do an immediate status + log fetch so the UI is not blank
    pollStatus();
    pollMonitoringLogs();

    // Start SSE; fall back to polling if unavailable
    if (!startEventStream()) {
        startFallbackPolling();
    }
});
