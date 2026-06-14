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
// ENT.D1 and EXT.D3 default unlocked (green); ENT.D2 and EXT.D4 default locked (red)
const currentDoorStates = {
    1: { state: 'closed', locked: false },
    2: { state: 'closed', locked: true  },
    3: { state: 'closed', locked: false },
    4: { state: 'closed', locked: true  }
};

// ── Booth PIR occupancy ──────────────────────────────────────
const boothOccupied = { 1: false, 2: false };

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

    icon.setAttribute('aria-label', `${cfg.name} – ${isLocked ? 'Locked' : 'Unlocked'}`);
    icon.classList.toggle('locked',   isLocked);
    icon.classList.toggle('unlocked', !isLocked);

    if (isLocked) {
        icon.setAttribute('viewBox', '0 0 32 40');
        icon.setAttribute('width',  '35');
        icon.setAttribute('height', '44');
        icon.innerHTML =
            '<path d="M8,18 L8,11 C8,3 24,3 24,11 L24,18" stroke="#dc2626" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<rect x="2" y="17" width="28" height="21" rx="5" fill="#dc2626"/>' +
            '<circle cx="16" cy="26" r="3.5" fill="rgba(0,0,0,0.3)"/>' +
            '<rect x="14.5" y="26" width="3" height="6" rx="1.5" fill="rgba(0,0,0,0.3)"/>';
    } else {
        icon.setAttribute('viewBox', '0 0 64 64');
        icon.setAttribute('width',  '35');
        icon.setAttribute('height', '44');
        icon.innerHTML =
            '<path d="M24 28V20C24 14 29 9 35 9C41 9 46 14 46 20" fill="none" stroke="#00AA00" stroke-width="6" stroke-linecap="round" transform="rotate(-25 24 28)"/>' +
            '<rect x="14" y="28" width="36" height="28" rx="4" fill="#00CC00" stroke="#008800" stroke-width="2"/>' +
            '<circle cx="32" cy="40" r="4" fill="#FFFFFF"/>' +
            '<rect x="30" y="40" width="4" height="8" fill="#FFFFFF"/>';
    }
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

/**
 * Show or hide the booth occupancy indicator.
 * boothId 1 → entrance (.object-detected-entrance)
 * boothId 2 → exit     (.object-detected-exit)
 * Transition driven by CSS: .occupied adds opacity 1 + full colour.
 */
function updateBoothOccupancy(boothId, occupied) {
    boothOccupied[boothId] = occupied;
    const selector = boothId === 1 ? '.object-detected-entrance' : '.object-detected-exit';
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.toggle('occupied', occupied);
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

    // ── Booth PIR occupancy (GET fallback path) ───────────────
    if (Array.isArray(data.booths)) {
        data.booths.forEach(b => {
            updateBoothOccupancy(Number(b.id), b.occupied === true);
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

    // "booth" events: PIR occupancy change from ATmega BOOTH_x_OCCUPIED/VACANT
    // Payload: { booth: 1|2, occupied: true|false }
    monitorEventSource.addEventListener('booth', ev => {
        try {
            const data = JSON.parse(ev.data);
            updateBoothOccupancy(Number(data.booth), data.occupied === true);
        } catch (e) {
            console.warn('[Monitor] Bad booth SSE payload', e, ev.data);
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="34" height="34" stroke="none">
                        <circle cx="16" cy="16" r="16" fill="#25D366"/>
                        <path fill="#FFFFFF" d="M16 6.5c-5.2 0-9.5 4-9.5 9c0 1.8.6 3.5 1.7 5L7 25.5l5.2-1.6c1.2.6 2.5.9 3.8.9 5.2 0 9.5-4 9.5-9s-4.3-9.3-9.5-9.3z"/>
                        <path fill="#25D366" d="M13.3 11.2c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.7.1-.9.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.3 3.2.2.2 2.2 3.4 5.4 4.7 2.7 1.1 3.2.9 3.8.8.6-.1 1.8-.8 2-1.5 .3-.7.3-1.3.2-1.5-.1-.2-.5-.3-1.1-.6-.6-.3-1.4-.7-1.6-.8-.2-.1-.5-.1-.7.2 -.2.3-.8.8-1 .9-.2.1-.4.1-.7 0-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.5-1.8-1.7-2.1 -.2-.3 0-.5.1-.7.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2.1-.4 0-.6 -.1-.2-.7-1.7-.9-2.3z"/>
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

// Apply saved theme immediately on every page load
(function () {
    const saved = localStorage.getItem('systemTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
}());


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
