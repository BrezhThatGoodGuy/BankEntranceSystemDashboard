# Chapter: System Design and Web Interface Functionality

## Automated Bank Entrance Security System — Dashboard Architecture, Page Functionalities, and Design Methodologies

---

## 6.1 System Architecture Overview

The web dashboard is a three-tier system:

1. **Hardware Layer** — The ATmega328P microcontroller directly drives the door solenoid locks, reads magnetic contact sensors on each door, and reads PIR occupancy sensors in each mantrap booth. It communicates upward using hardware UART at 9600 baud via a two-wire TX/RX connection to the ESP32-CAM.

2. **Server Layer** — The ESP32-CAM runs a single unified firmware (`webserver.ino`) that manages: (a) UART communication with the ATmega328P, (b) an asynchronous HTTP web server that serves all dashboard pages from on-board flash storage (LittleFS), (c) a Server-Sent Events (SSE) channel at `/events` that pushes real-time state changes to all connected browsers, (d) an AI inference pipeline using a quantized Edge Impulse model, and (e) a persistent log buffer backed to LittleFS files.

3. **Browser Layer** — Five HTML pages (`monitor.html`, `control.html`, `faults.html`, `aicontrol.html`, `login.html`) are served directly from the ESP32. Each page loads its own JavaScript file as the primary controller, plus shared modules for the API client (`js/api-client.js`, `js/api-endpoints.js`) and authentication utilities (`logout.js`, `script.js`). There is no remote cloud server; the browser talks directly to the ESP32's IP address on the local WiFi network.

This architecture means the entire system — including the web pages — is self-contained within the ESP32. The bank's network only needs to provide a WiFi access point; no internet connectivity is required for normal operation (only for NTP time synchronization and the optional email fault-reporting feature).

---

## 6.2 Server-Side Web Infrastructure (webserver.ino)

### 6.2.1 Asynchronous Web Server

The ESP32 runs `ESPAsyncWebServer` on port 80. "Asynchronous" means the server handles multiple concurrent connections without blocking the main loop. This is critical because the dashboard has at least three simultaneous connection types at any given time: one long-lived SSE stream per open browser tab, periodic HTTP GET requests from the polling loops, and occasional HTTP POST commands from the operator. If a blocking server (such as the simpler `WebServer` library) were used, a long-running SSE connection would prevent any other request from being processed. The async model handles this transparently.

All web assets — the HTML files, CSS, JavaScript, and image files — are stored in LittleFS (a flash filesystem on the ESP32) and served by a single static handler:

```cpp
server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
```

This means no page content needs to be embedded in the firmware as C strings; files can be updated independently of the firmware by flashing the filesystem partition.

### 6.2.2 Dual Communication Design: HTTP REST and Server-Sent Events

The system uses two complementary channels between the ESP32 and the browser, each suited to a different communication pattern:

**HTTP REST (request-response):** Used for operator commands and data queries. The browser sends `POST /action` with a JSON body to issue a command, and `GET /api/status.json` (or equivalent) to request the current state. This channel is stateless — each request is independent. The single action endpoint handles all command types, differentiated by an `action` field in the payload:

```json
{ "action": "TOGGLE", "door": "1", "state": "unlock-once", "user": "Brezhnevndlovu" }
{ "action": "MODE_CHANGE", "mode": "Exit-Only", "user": "Brezhnevndlovu" }
{ "action": "SET_MAX_INSIDE", "value": "50", "user": "Brezhnevndlovu" }
```

The `processActionPost()` function on the ESP32 dispatches each incoming POST to the appropriate handler by inspecting the `action` field.

**Server-Sent Events (SSE):** Used for real-time push from the ESP32 to all browser tabs without the browser having to poll. The `/events` endpoint holds a long-lived HTTP connection open to each connected client. When something changes on the hardware — a door opens, the ATmega sends occupancy counts, an AI inference completes — the ESP32 pushes a named event to all connected clients simultaneously:

```cpp
events.send(buildStatusPayload().c_str(), "status", lastDoorEventId);
events.send(buildModePayload().c_str(),   "mode",   lastDoorEventId);
events.send(buildFaultsPayload().c_str(), "fault",  lastDoorEventId);
events.send(payload.c_str(),             "inference", lastDoorEventId);
```

Each event has a **type name** (the second argument) so that different browser tabs listening to the same `/events` stream can subscribe only to the events they care about. The monitor page listens for `'door'`, `'booth'`, and `'status'` events; the faults page listens for `'fault'` events; the AI control page listens for `'inference'` events; the control page listens for `'control'`, `'status'`, and `'mode'` events.

The SSE channel also handles **reconnection automatically** via the browser's `EventSource` API — if the WiFi drops and reconnects, the browser reopens the SSE connection from the last received event ID, and the ESP32 delivers the current status payload immediately on reconnect:

```cpp
events.onConnect([](AsyncEventSourceClient *client) {
    client->send(buildStatusPayload().c_str(), "status", millis(), 1000);
});
```

### 6.2.3 UART Bridge (ATmega328P ↔ ESP32)

The ESP32's `Serial1` hardware UART is configured on GPIO13 (RX) and GPIO15 (TX) at 9600 baud. In the main `loop()`, every line received from the ATmega on `Serial1` is processed by `processAtmegaLine()`:

```cpp
if (Serial1.available()) {
    String incomingData = Serial1.readStringUntil('\n');
    incomingData.trim();
    if (incomingData.length() > 0) processAtmegaLine(incomingData);
}
```

`processAtmegaLine()` parses the line prefix and routes it:

| Line prefix received        | Meaning                            | Action taken by ESP32                              |
|-----------------------------|------------------------------------|----------------------------------------------------|
| `DOOR_x_OPENED`             | Door x opened (mag contact active) | Publish door SSE event; append monitoring log      |
| `DOOR_x_CLOSED`             | Door x closed                      | Publish door SSE event; append monitoring log      |
| `DOOR_x_LOCKED/UNLOCKED`    | Lock state changed                 | Update `doorLockStates[]`; publish status SSE      |
| `DOOR_x_AUTO`               | One-shot unlock cycle complete     | Publish `control` SSE event; log the reversion     |
| `STATS:ENTRIES=n;EXITS=n;...` | Occupancy counts                 | Update counters; check capacity; publish status SSE|
| `BOOTH_x_OCCUPIED/VACANT`   | PIR sensor change                  | Update `boothOccupied[]`; publish booth SSE event  |
| `FAULT_LOCK_x`              | Door opened while locked           | Increment fault counter; publish fault SSE         |
| `FAULT_MC_x`                | Mag contact stuck open             | Increment MC fault counter; publish fault SSE      |
| `FAULT_PIR_x`               | PIR never triggered (5 timeouts)   | Set PIR fault active; publish fault SSE            |

Commands flow the other way: the ESP32 calls `Serial1.println(command)` to transmit a command string such as `SET_MODE_CLOSED` or `DOOR_1_UNLOCK_ONCE` to the ATmega. Using `println()` automatically appends `\r\n`; the ATmega reads with `readStringUntil('\n')` and strips the trailing `\r` with `.trim()`, resulting in an exact string match.

### 6.2.4 Operation Mode Control — `applyOperationMode()`

The system has five operation modes controlled from the dashboard. The mode logic is centralized in a single `applyOperationMode()` function that: validates the requested mode, checks whether a change is needed, updates internal state, sends the UART command to the ATmega, writes a log entry, and broadcasts a `mode` SSE event to all browsers:

```cpp
bool applyOperationMode(const String &mode, const String &source, const String &user) {
    // ... resolve next_mode and command string ...
    if (current_operation_mode.equalsIgnoreCase(next_mode)) return false; // no-op guard
    current_operation_mode = next_mode;
    Serial1.println(command);           // send to ATmega hardware
    appendLogEntry(LOG_CONTROL, "Operation mode changed to " + next_label + byUser);
    events.send(buildModePayload().c_str(), "mode", lastDoorEventId);
    return true;
}
```

The function accepts a `source` string (`"ACTION"`, `"AI"`, `"CAPACITY"`) and a `user` string. This means mode changes can originate from three places — a human operator, an AI inference result, or the automatic capacity enforcement — and each source is recorded separately in the logs. The `user` parameter traces directly to the system objective of operator accountability: `"by 'Brezhnevndlovu'"` or `"by 'Automatically'"` is appended to the log entry.

### 6.2.5 Automatic Capacity Enforcement

Every time the ATmega sends a `STATS:` occupancy update, the ESP32 checks whether the configured client limit has been reached:

```cpp
if (maxClientsInside > 0 && clientsInside >= maxClientsInside &&
    !current_operation_mode.equalsIgnoreCase("exit") &&
    !current_operation_mode.equalsIgnoreCase("lock")) {
    applyOperationMode("Exit-Only", "CAPACITY", "Automatically");
}
```

When the count of clients inside equals or exceeds `maxClientsInside`, the system automatically switches to Exit-Only mode — no new clients may enter, but existing clients can leave. There ia a function to prevent re-triggering if already in Exit-Only or Lock-All mode. This autonomously enforces a safe capacity limit without requiring the security officer to monitor the count manually and react.

### 6.2.6 Persistent Logging System

The ESP32 maintains four categorized log buffers in RAM, each up to 100 entries, mirrored to LittleFS files:

| Index | Name       | File               | Contents                                     |
|-------|------------|--------------------|----------------------------------------------|
| 0     | Monitoring | `/monitoring.log`  | Door open/close events, occupancy updates    |
| 1     | Control    | `/control.log`     | Mode changes, door overrides, capacity sets  |
| 2     | Faults     | `/faults.log`      | Lock faults, MC faults, PIR faults, clears  |
| 3     | AI         | `/ai.log`          | Inference results, confidence, timing         |

Every call to `appendLogEntry(idx, message)` prepends a timestamp (from NTP or uptime fallback), then writes all in-memory entries to the corresponding `.log` file via `saveLogFile(idx)`. At startup, `loadAllLogFiles()` rehydrates the RAM buffers from disk, so logs survive power cycles.

The timestamp uses `getLocalTime()` — NTP-synced UTC+2 (Zimbabwe time). If NTP has not yet synchronized, the function falls back to a human-readable uptime string (`UP+00:12:34`) so that log entries are never blank:

```cpp
String formatTimestamp() {
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
        char buf[32];
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
        return String(buf);
    }
    unsigned long s = millis() / 1000;
    sprintf(buf, "UP+%02lu:%02lu:%02lu", s/3600, (s/60)%60, s%60);
    return String(buf);
}
```

Logs are served to the browser both as structured JSON (`GET /api/logs.json`, `GET /log?type=monitoring`) for page display, and as plain text (`GET /logs/monitoring.txt`) for the print dialog.

### 6.2.7 Unified JSON Parsing — `parseJsonString()`

Because the ESP32 cannot include a full JSON library without memory pressure, a lightweight custom parser extracts individual string values from JSON bodies. It works by: finding the key, stepping past the colon, finding the opening quote of the value, and returning everything up to the closing quote:

```cpp
String parseJsonString(const String &body, const String &key) {
    int keyIndex = body.indexOf('"' + key + '"');
    int colonIndex = body.indexOf(':', keyIndex);
    int start = body.indexOf('"', colonIndex + 1);
    int end   = body.indexOf('"', start + 1);
    return body.substring(start + 1, end);
}
```

This parser only works on **quoted string values**. Any numeric field sent from the browser (such as the maximum capacity count) must arrive as a quoted string (`"value":"50"`) rather than a bare number (`"value":50`). The JavaScript on the sending side uses `String(val)` to enforce this:

```javascript
body: JSON.stringify({ action: 'SET_MAX_INSIDE', value: String(val), user: getActiveUser() })
```

---

## 6.3 Authentication and Session Management

### 6.3.1 Login (login.js)

The login page provides the access gate for the entire dashboard. A `submit` event listener on `#login-form` checks the submitted username and password against a two-tier credential store: a set of hardcoded administrator accounts (defined directly in the script for reliability) and a dynamic user registry stored in `localStorage.users` (populated by a registration form).

On a successful match, two `sessionStorage` keys are written:

```javascript
sessionStorage.setItem('isLoggedIn', 'true');
sessionStorage.setItem('username', username);
```

`sessionStorage` is scoped to the current browser tab and cleared automatically when the tab is closed. This means every new browser session requires a fresh login — operators cannot leave a session open persistently in the background and return to find themselves still logged in days later.

### 6.3.2 Session Guard on Every Protected Page

Every protected page script begins with an identical guard:

```javascript
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}
```

This check executes at script parse time, before `DOMContentLoaded`, so an unauthenticated user is redirected before any page content renders or any API call is made. All functional code is placed inside the `else` block, making authentication the mandatory first step.

### 6.3.3 Unified Audit Trail — User Identity on Every Action

Every POST action sent to the ESP32 includes the logged-in operator's username:

```javascript
function getActiveUser() {
    return sessionStorage.getItem('username') || 'Unknown';
}

fetch('/action', {
    method: 'POST',
    body: JSON.stringify({ action: 'MODE_CHANGE', mode: 'Exit-Only', user: getActiveUser() })
});
```

On the ESP32 side, `parseJsonString(body, "user")` extracts this value and appends it to every log entry:

```cpp
String byUser = user.length() > 0 ? " by '" + user + "'" : "";
appendLogEntry(LOG_CONTROL, "Operation mode changed to Exit-Only" + byUser);
```

This produces log entries such as:
```
2026-06-16T09:31:05    Operation mode changed to Exit-Only by 'Brezhnevndlovu'
2026-06-16T09:45:22    Door 1 set to unlock-once by 'Shyleen'
2026-06-16T10:02:44    Operation mode changed to Exit-Only by 'Automatically'
```

The three possible attribution types — a named manager, a named security officer, or the word "Automatically" for system-triggered actions — allow a review of the control log to show exactly who did what during an incident, and distinguish human decisions from automated responses. This directly addresses the system objective of maintaining a reliable audit trail for security accountability.

### 6.3.4 Logout (logout.js)

`logout()` removes both sessionStorage keys and redirects to `login.html`. It is accessible both from the sidebar navigation button and as an inline `onclick="logout()"` on the SVG icon. Because sessionStorage is tab-scoped, logging out of one tab does not close the session in another tab — each tab maintains its own session.

---

## 6.4 Control Page

### 6.4.1 Purpose and Layout

The Control page is the command interface for the security officer or manager. It provides: operation mode selection, manual per-door overrides, a live capacity card, and a door-action log. It is the page from which the physical state of the mantrap is directly commanded.

### 6.4.2 Operation Mode Selection

Five radio buttons represent the five operating modes of the mantrap. The mode names in the HTML map to a UART command and a physical door configuration on the ATmega:

| Radio ID   | Label           | UART command   | Effect on doors                             |
|------------|-----------------|----------------|---------------------------------------------|
| `#evacuate`| Evacuation      | `SET_MODE_EVAC`| All 4 doors unlock immediately              |
| `#normal`  | Normal-Traffic  | `SET_MODE_NORMAL` | Interlocked mantrap sequence for both booths |
| `#exit`    | Exit-Only       | `SET_MODE_CLOSED` | Entry booth locked; exit booth free        |
| `#entrance`| Entrance-Only   | `SET_MODE_STAFF`| Exit booth locked; entry booth free         |
| `#lock`    | Lock-All        | `SET_MODE_LOCK` | All 4 doors locked                          |

`initializeModeButtons()` attaches a `change` event listener to every `input[name="mode"]`. When a radio is selected, `setOperationMode(modeId)` fires, building a payload that includes the current time and the active user:

```javascript
function setOperationMode(modeId) {
    const payload = {
        action: 'MODE_CHANGE',
        mode: modeLabels[modeId] || modeId,
        time: new Date().toISOString(),
        user: getActiveUser()
    };
    sendModeAction(payload);
}
```

The ESP32's `applyOperationMode()` processes this, sends the UART command to the ATmega, logs the change with user attribution, and broadcasts a `mode` SSE event so that the radio button state on all other open browser tabs updates instantly.

**Cross-tab synchronization:** In addition to SSE, a `localStorage.modeSync` key (written as `JSON.stringify({ mode, ts })`) is set on every mode change. A `window.storage` event listener in `control.js` (`initializeModeSyncListener()`) catches writes to this key from other tabs and updates the radio button locally — this handles the case where SSE is not yet connected in the other tab.

### 6.4.3 Evacuate Button

The `EVACUATE!` button (`class="evacuate"`) in the page header is wired separately from the radio buttons by `initializeEvacuateButton()`. Clicking it directly calls `setOperationMode('evacuate')` without waiting for any confirmation dialog. The urgency design — prominently positioned, no confirmation — reflects the safety requirement that evacuation must be triggerable instantly by any logged-in user from any page. The same button exists on every page (monitor, faults, AI control) so the operator never has to navigate away from their current view to trigger an evacuation.

### 6.4.4 Per-Door Manual Override

The four door buttons in the `.door-grid` represent physical doors (ENT.D1, ENT.D2, EXT.D3, EXT.D4). Each button carries a `data-id` attribute. Clicking toggles between two states:

- **auto-controlled** → sends `DOOR_x_UNLOCK_ONCE` — the ATmega unlocks the door for one cycle (until the door is opened and re-closed), then automatically reverts to normal interlock control.
- **unlocked** → sends `DOOR_x_AUTO` — returns the door to automatic interlock control immediately.

The button's visual class (`auto-controlled` or `unlocked`) and status text (`UNLOCK` or `CANCEL`) update immediately on click (optimistic UI) without waiting for the ESP32 to confirm. When the ATmega completes the one-shot cycle, it sends `DOOR_x_AUTO` back over UART. The ESP32 receives this, publishes a `control` SSE event (`{ type: 'auto', doorId: x }`), and the browser's SSE handler calls `revertDoorToAuto(doorId)` to silently snap the button back to `auto-controlled` — no action required from the operator. This achieves the objective of letting a security officer admit one person through a specific door without permanently overriding the interlock sequence.

### 6.4.5 Capacity Monitoring and Enforcement Card

The capacity card shows three live figures: clients currently inside, total entries today, and the maximum inside limit. It is updated by the SSE `status` event via `updateCapacityCard(data)`:

```javascript
function updateCapacityCard(data) {
    document.getElementById('cap-inside').textContent = data.inside ?? '--';
    document.getElementById('cap-total').textContent  = data.entries ?? '--';
    // Status message with colour coding:
    const ratio = maxLimit > 0 ? data.inside / maxLimit : 0;
    if (ratio >= 1.0)       { msg.textContent = 'CAPACITY REACHED — Exit-Only enforced'; msg.className = 'cap-status-msg critical'; }
    else if (ratio >= 0.8)  { msg.textContent = 'Nearing capacity'; msg.className = 'cap-status-msg warning'; }
    else                    { msg.textContent = ''; }
}
```

The operator can set a maximum inside count by entering a number and clicking the `Set` button. This sends `{ action: 'SET_MAX_INSIDE', value: String(val), user }` to the ESP32. The value must be sent as a quoted string rather than a bare integer because the ESP32's custom `parseJsonString()` parser only reads quoted values. Once set, the ESP32 begins enforcing the limit automatically on every STATS update from the ATmega — no further operator action is required.

### 6.4.6 Live Door-Action Log

`loadLogData()` fetches `GET /log?type=control` on page load, then the refresh button (↓) re-calls `pollStatus()` and the log fetch on demand. The `displayLog()` function renders the 10 most recent control-log entries from the ESP32 in reverse chronological order inside `#logContainer`. If the ESP32 is unreachable, the function falls back to `window.API.fetchLogs()` from the shared API client module.

### 6.4.7 Print Logs Dialog

The Print Info button in the sidebar opens a modal (`openPrintLogsDialog()`) where the operator selects which log files to print. The function builds checkboxes from the `ESP_LOG_FILE_CONFIG` array:

```javascript
const ESP_LOG_FILE_CONFIG = [
    { key: 'monitoring', label: 'Monitoring Logs', url: '/logs/monitoring.txt' },
    { key: 'control',    label: 'Control Logs',    url: '/logs/control.txt'    },
    { key: 'faults',     label: 'Faults Logs',     url: '/logs/faults.txt'     },
    { key: 'ai',         label: 'AI Logs',          url: '/logs/ai.txt'         }
];
```

On clicking PRINT, `printSelectedLogFiles()` fetches each selected file from the ESP32 as plain text using `fetch(url, { cache: 'no-store' })`, then `buildAndPrintLogs()` appends a `#printableLogsArea` div to the body and calls `window.print()`. A `@media print` CSS rule in `style.css` hides all body content and makes only `#printableLogsArea` visible during printing. A `{ once: true }` `afterprint` listener removes the printable area element as soon as the print dialog closes.

---

## 6.5 Monitor Page

### 6.5.1 Purpose and Layout

The Monitor page is the observational interface — a real-time visual representation of the physical mantrap. It shows: the contact state (open/closed) and lock state (locked/unlocked) of each of the four doors, PIR occupancy in each booth, a live CCTV feed from the ESP32-CAM, and four live counters (system uptime, total entries, total exits, and clients currently inside).

### 6.5.2 Door State Visualisation

The HTML template (`.bank-booth-template`) contains paired `<div>` elements for each door's open and closed states. For example, the outside entrance door has `.outside-entrance-opened` and `.outside-entrance-closed`. The JavaScript function `updateDoorMagContactUI(doorId, state)` shows the correct child element and hides the other:

```javascript
cfg.openEls.forEach(el  => el.style.display = state === 'opened' ? 'block' : 'none');
cfg.closeEls.forEach(el => el.style.display = state === 'closed' ? 'block' : 'none');
```

The lock state is shown as an SVG padlock icon per door (`#ent-d1-lock-icon`, `#ent-d2-lock-icon`, `#ext-d3-lock-icon`, `#ext-d4-lock-icon`). `updateDoorLockIcon(doorId, locked)` swaps the SVG path data, `viewBox`, and CSS class between a closed red padlock and an open green padlock:

```javascript
if (locked) {
    svg.setAttribute('viewBox', '0 0 32 40');
    svg.innerHTML = closedPadlockPath;  // red
} else {
    svg.setAttribute('viewBox', '6 4 44 56');
    svg.innerHTML = openPadlockPath;    // green
}
```

These two functions are composed into `updateDoorUI(doorId, doorData)`, which is called whenever a `door` or `status` SSE event arrives.

### 6.5.3 PIR Occupancy Indicators

Two elements (`.object-detected-entrance`, `.object-detected-exit`) visually represent whether a person is detected in each mantrap booth. `updateBoothOccupancy(boothId, occupied)` toggles a CSS `.occupied` class on these elements, which drives an opacity and colour change defined in the stylesheet. This provides the security officer with an immediate visual cue that someone is standing inside the vestibule without them needing to watch the CCTV feed.

Occupancy data arrives from the ATmega as `BOOTH_1_OCCUPIED` or `BOOTH_1_VACANT` over UART, which the ESP32 converts to a `booth` SSE event: `{ "booth": 1, "occupied": true }`. The monitor page's SSE handler passes this directly to `updateBoothOccupancy`.

### 6.5.4 Live Counter Panel

The panel at the bottom of the monitor page shows four values updated in real time: `#system-uptime`, `#total-entries`, `#total-exits`, and `#clients-inside`. These are populated by `applyStatusEvent(data)`, which handles the `status` SSE event from the ESP32:

```javascript
function applyStatusEvent(data) {
    document.getElementById('system-uptime').textContent  = normalizeTimestamp(data.uptime);
    document.getElementById('total-entries').textContent  = data.entries ?? '--';
    document.getElementById('total-exits').textContent    = data.exits   ?? '--';
    document.getElementById('clients-inside').textContent = data.inside  ?? '--';
    // then iterate data.doors[] and data.booths[] for door + PIR updates
}
```

The entry and exit counts come from the ATmega, which increments `totalEntries` each time Door 2 (inner entry door) closes, and `totalExits` each time Door 4 (inner exit door) closes. This is because a client completes an entry only when they have passed fully through the mantrap and the inner door closes behind them.

### 6.5.5 Dual-Channel Update Strategy

The monitor page runs two update channels simultaneously, both started unconditionally in `DOMContentLoaded`:

1. **SSE (`startEventStream()`):** Receives instant push events the moment the ATmega reports a change. Door open/close animations update within milliseconds of the physical event.

2. **HTTP Polling (`startFallbackPolling()`):** Every 3 seconds, `pollStatus()` requests the full state snapshot from `/api/status.json`, and `pollMonitoringLogs()` requests the latest monitoring log. This guarantees that the counters and door lock states stay current even during quiet periods when no ATmega events are being generated.

The polling was originally designed as a fallback for when SSE fails. The design was updated to run both channels in parallel — polling provides the baseline data currency (counters that update on a schedule), while SSE delivers instant event-driven animations. This addresses the challenge that SSE only pushes data when something changes; if the bank is empty for 20 minutes, SSE sends nothing, and a polling-only strategy would show stale values.

### 6.5.6 Live CCTV Feed

The `<img class="live-image-container" src="/stream">` element points to the ESP32-CAM's JPEG snapshot endpoint. The `refreshCCTV()` function updates the image `src` with a cache-busting timestamp every 100ms:

```javascript
function refreshCCTV() {
    const el = document.querySelector('.live-image-container');
    el.src = `/stream?t=${Date.now()}`;
}
setInterval(refreshCCTV, 100);
```

At 10 frames per second, this approximates a low-latency video feed using only standard JPEG GET requests. The `/stream` endpoint on the ESP32 calls `esp_camera_fb_get()` to capture one JPEG frame and sends it with `Cache-Control: no-store` headers, ensuring the browser never serves a cached frame. This design avoids the complexity of a true MJPEG multipart stream while still providing acceptable real-time monitoring.

---

## 6.6 Faults Page

### 6.6.1 Purpose and Layout

The Faults page provides diagnostics of all hardware health conditions monitored by the system. It displays colour-coded fault boxes for each monitored component, a running log of fault events, an operator-controlled fault acknowledgement and clear action, and a fault-reporting mechanism via email.

The page monitors three categories of fault across ten components: four door lock faults, four door magnetic contact (MC) faults, and two PIR sensor faults.

### 6.6.2 Lock Fault Detection — How It Works

A lock fault indicates that a door opened physically while its lock LED was in the red (locked) state. The detection logic runs on the ATmega:

When a door's magnetic contact sensor transitions from closed to open (indicating the door has been physically opened), the ATmega's ISR checks whether the lock's green LED is currently off and the red LED is on:

```cpp
if (lastRedState[0] && !faultActive[0] && (_t - lastModeChangeTime > modeFaultGrace)) {
    Serial.println("FAULT_LOCK_1");
    faultActive[0] = true;
}
```

A `modeFaultGrace` period of 200ms is subtracted from the check — this prevents false faults during a mode change, when the ATmega is switching all LEDs simultaneously and a door might be briefly mismatched. When the door closes again, `FAULT_LOCK_1_CLEAR` is sent and `faultActive[0]` is reset.

On the ESP32 side, each `FAULT_LOCK_x` message increments `lockFaultCount[idx]`. When the count reaches 5, the fault is marked as acknowledged and a special log entry is written:

```cpp
lockFaultCount[idx]++;
appendLogEntry(LOG_FAULTS, faultLockNames[idx] + " — fault detected (occurrence " + String(lockFaultCount[idx]) + "/5)");
if (lockFaultCount[idx] >= 5 && !lockFaultAcknowledged[idx]) {
    lockFaultAcknowledged[idx] = true;
    appendLogEntry(LOG_FAULTS, faultLockNames[idx] + " — FAULT ACKNOWLEDGED after 5 occurrences");
}
```

The threshold of 5 occurrences distinguishes a one-off anomaly from a persistent hardware fault. A door being opened once during a lock transition might be an edge case; the same door being opened while locked five separate times indicates a genuine lock mechanism failure requiring maintenance.

The `buildFaultsPayload()` function includes `"status": "fault"` for any component with `lockFaultAcknowledged[idx] == true`, and `"count"` for the raw occurrence number. The browser's `updateFaultBox()` function reads both fields to drive the visual display.

### 6.6.3 Magnetic Contact (MC) Fault Detection — Progressive Timer Method

An MC fault indicates that a door has been held open for an unusually long time, suggesting the magnetic contact may be stuck (mechanically broken or obstructed). This is more nuanced than the lock fault because a door being open is normal; it is only a fault if the door remains open beyond reasonable time thresholds.

The ATmega implements a **progressive threshold escalation**: five time thresholds are stored in flash memory (`PROGMEM`) to avoid using RAM:

```cpp
const unsigned long MC_THRESHOLDS[] PROGMEM = {5000UL, 15000UL, 35000UL, 65000UL, 125000UL};
```

When a door opens, `mcOpenTime[i]` is set to `millis()` and `mcCheckStage[i]` is reset to 0. Every main loop iteration, `checkMcFaults()` reads the current time and checks whether the open duration has exceeded the current stage's threshold:

```cpp
if (now - mcOpenTime[i] >= pgm_read_dword(&MC_THRESHOLDS[mcCheckStage[i]])) {
    Serial.print("FAULT_MC_"); Serial.println(i + 1);
    mcCheckStage[i]++;
    mcFaultSent[i] = true;
}
```

The result is an escalating fault pattern: the ESP32 receives `FAULT_MC_1` at 5s, again at 15s, 35s, 65s, and 125s — five escalating alerts as the door remains open longer and longer. Each alert increments `mcFaultCount[idx]` on the ESP32. When the door finally closes, `FAULT_MC_1_CLEAR` is sent and a clear log entry is written. This design generates proportional concern: a door open for 5 seconds is noteworthy; one open for over 2 minutes is serious.

### 6.6.4 PIR Sensor Fault Detection — Timeout Count Method

A PIR fault indicates that the mantrap's occupancy sensor is not responding. The detection is based on the booth state machine: when a person enters the first door and it closes behind them, the system enters `WAIT_PIR_CONFIRM` state and waits up to 7 seconds for the PIR to confirm their presence before enabling the second door. If the PIR never goes high within 7 seconds, the state resets to `IDLE_FIRST_DOOR` and a timeout counter is incremented.

After 5 consecutive timeouts without a successful PIR detection, the ATmega sends `FAULT_PIR_1` or `FAULT_PIR_2`. Conversely, when the PIR successfully detects a presence (advancing the state to `SECOND_DOOR_ENABLED`), the timeout counter is reset to zero. If the counter was at 5 or more (fault active), `FAULT_PIR_1_CLEAR` is also sent:

```cpp
// In loop():
if (eventPir1Success) {
    pir1TimeoutCount = 0;
    if (pir1FaultActive) { pir1FaultActive = false; Serial.println("FAULT_PIR_1_CLEAR"); }
    eventPir1Success = false;
}
```

This method distinguishes sensor failure from absence of clients: a sensor that simply has no one to detect will never enter `WAIT_PIR_CONFIRM` because the first door never opens. The fault count only increments during actual booth use (first door opened and closed) where a detection should have happened but did not.

### 6.6.5 Fault Box Visual Display

Each hardware component has a corresponding `<div class="fault-box" data-fault-id="...">` in the faults page HTML. The `data-fault-id` attribute value matches the component name string used in `buildFaultsPayload()` (e.g. `"ENT.D1 LOCK"`, `"ENT.D2 MC"`, `"BOOTH 1 PIR"`). The JavaScript `updateFaultBox(componentId, status, count)` function queries these elements by their `data-fault-id` value:

```javascript
const box = document.querySelector(`.fault-box[data-fault-id="${componentId}"]`);
box.querySelector('.fault-status').textContent = status === 'fault' ? 'FAULT' : 'Normal';
const bar = box.querySelector('.fault-health-bar-fill');
bar.style.width = `${Math.min(count / 5 * 100, 100)}%`;
bar.style.background = _barColors[Math.min(count, 5)];
```

The health bar fills progressively from green (0 counts) through yellow, orange, red, and dark red as fault counts accumulate toward 5. The count badge shows `"x/5"` — providing both a visual gauge and a numeric indicator.

### 6.6.6 Fault Acknowledgement and Clearing

The `clearAllFaults()` function sends `{ action: 'CLEAR_FAULTS', user }` to the ESP32. This resets all fault counters and acknowledgement flags for all three fault categories — locks, MC controllers, and PIR sensors — and broadcasts a refreshed fault SSE event. The corresponding log entry records which operator triggered the clear. This provides a formal acknowledgement step: faults are reviewed, cleared by an identified operator, and the clearance is logged.

### 6.6.7 Fault Reporting by Email

The `openReportModal(componentName)` function opens a modal where the operator can describe the fault in their own words. `openInGmail()` then constructs a structured email body with component identity, fault count, acknowledgement status, operator notes, and a timestamp, then opens the Gmail compose URL:

```javascript
const url = `https://mail.google.com/mail/?view=cm&fs=1`
           + `&to=brezhnevndlovu02@gmail.com,s.nhema@nust.ac.zw`
           + `&su=FAULT REPORT: ${component}`
           + `&body=${encodeURIComponent(body)}`;
window.open(url, '_blank');
```

The email is addressed to multiple reciepients. This extends the fault-response chain beyond the physical location: a maintenance technician reading the logs at 9AM can see that a fault was reported by email at 2AM, and cross-reference the email body with the fault log to understand the timeline.

---

## 6.7 AI Control Page

### 6.7.1 Purpose and Layout

The AI Control page allows the operator to configure and monitor the Edge Impulse threat detection AI. It exposes three independent controls: the AI system master switch, per-detector toggles (masked face detection and weapon detection), and per-detector door response mode selection. It also displays the live inference feed and results from the ESP32-CAM.

### 6.7.2 AI Configuration Toggle Architecture

The AI configuration has a hierarchical structure:
- **Master switch (`ai_system_enabled`):** If OFF, no inference runs at all. Disabling this also greys out all sub-options in the UI (`ai-config-section` pointer-events and opacity via CSS).
- **Threat detection toggle (`ai_threat_detection`):** Gates whether masked-face or weapon detection outputs trigger door responses. Both masked and weapon sub-toggles are ORed into this single ESP32 flag via `syncThreatState()`.
- **AI door control (`ai_door_control_enabled`):** Gates whether the AI's detection can actually send mode change commands. This decouples "should we run inference?" from "should inference results affect doors?" — allowing monitoring without automated response.

```javascript
function syncThreatState() {
    const active = window.aiConfig.aiSystem.maskedFaceDetection
                || window.aiConfig.aiSystem.weaponDetection;
    fetch('/action', { method: 'POST', body: JSON.stringify({
        action: 'AI_THREAT', state: active ? 'ON' : 'OFF', user: getActiveUser()
    })});
}
```

### 6.7.4 Per-Detector Response Mode Configuration

For each threat detector (weapon, masked face), the operator selects which operation mode the system should switch to when that threat is detected:

```javascript
function updateAiMode(type, mode) {
    window.aiConfig.operationModes[type] = mode;
    saveConfigToStorage(window.aiConfig);
    syncAiMode(type, mode);  // POST { action: 'AI_MODE', type, mode, user }
}
```

On the ESP32, `ai_weapon_operation_mode` and `ai_masked_operation_mode` are stored as strings (defaulting to `"lock"`). When an inference result above the 0.50 confidence threshold is received and AI door control is enabled, `applyInferenceOperationMode()` resolves which configured mode to apply and calls `applyOperationMode()`:

```cpp
void applyInferenceOperationMode() {
    if (!ai_door_control_enabled || last_result.max_confidence < 0.50f) return;
    String type = resolveInferenceDetectionType(last_result.top_label);
    String mode = type == "weapon" ? ai_weapon_operation_mode : ai_masked_operation_mode;
    if (applyOperationMode(mode, "AI", "Automatically")) {
        appendLogEntry(LOG_AI, "AI " + type + " detection applied mode " + mode + " at "
                      + String(last_result.max_confidence * 100, 1) + "%");
    }
}
```

`resolveInferenceDetectionType()` normalizes the label string to either `"weapon"` or `"masked"` by checking for substrings (`"gun"`, `"knife"`, `"pistol"`, `"mask"`, etc.), making the system robust against variations in how the Edge Impulse model names its output labels.

### 6.7.5 Live Inference Display (aicontrol-inference.js)

The `InferenceDisplay` class manages the visual inference results. It opens its own `EventSource('/events')` and listens for `'inference'` events from the ESP32. Each event carries both the classification metadata and a base64-encoded JPEG of the captured frame:

```cpp
// On ESP32 side:
payload += ",\"imageB64\":\"";
payload += b64;                 // base64 of stored_capture_fb
payload += "\"}";
events.send(payload.c_str(), "inference", lastDoorEventId);
```

On the browser side, `_displayFrameFromB64(imageB64)` creates an `Image` object, sets its `src` to the data URL, and on load calls `_drawBoundingBoxes()` to overlay detection results on a canvas element positioned over the feed image:

```javascript
_drawBoundingBoxes(data) {
    const scaleX = this.canvas.width  / this.feedImg.naturalWidth;
    const scaleY = this.canvas.height / this.feedImg.naturalHeight;
    data.bounding_boxes.forEach((bb, idx) => {
        this.ctx.strokeRect(bb.x * scaleX, bb.y * scaleY, bb.width * scaleX, bb.height * scaleY);
        this.ctx.fillText(`${bb.label} ${(bb.confidence*100).toFixed(0)}%`, ...);
    });
}
```

The canvas is scaled to match the displayed image dimensions, ensuring that bounding boxes line up correctly regardless of the browser window size. Boxes are only drawn for the most recent frame and cleared on each new inference result.

The `_watchConfig()` method runs every 500ms and calls `_isDetectionActive()` — if the operator has disabled all detectors, the inference display is hidden and a placeholder is shown immediately, without waiting for the next SSE event.

### 6.7.6 Inference Loop on the ESP32

The main loop on the ESP32 triggers inference continuously when both the master switch and the threat detection toggle are enabled:

```cpp
static unsigned long last_inference = 0;
if (ai_system_enabled && ai_threat_detection && (millis() - last_inference > 500)) {
    last_inference = millis();
    run_inference_task();
}
```

`run_inference_task()` allocates a frame buffer, calls `ei_camera_capture()` to get a JPEG from the camera and convert it to RGB888, constructs an `ei::signal_t` for the classifier, runs `run_classifier()` from the Edge Impulse SDK, extracts the top label and bounding boxes, and if confidence exceeds 0.50 promotes the frame to `stored_capture_fb` and calls `broadcastInferenceSSE()`. The confidence threshold prevents low-quality or uncertain detections from triggering door responses or cluttering the display.

The 500ms minimum interval means inference runs at approximately 2 frames per second — appropriate for detecting a person approaching the entrance, and slow enough to keep the ESP32's processing load manageable while also serving web requests.

---

## 6.8 Shared Infrastructure Across All Pages

### 6.8.1 API Client Module (js/api-client.js)

The `window.API` object exposed by `api-client.js` provides a consistent interface for all data fetching. The `startPolling(endpointKey, callback, interval)` function manages named intervals, preventing duplicate pollers from accumulating if called more than once:

```javascript
function startPolling(endpointKey, callback, interval = null) {
    stopPolling(endpointKey);  // clear any existing interval first
    const pollerId = setInterval(async () => {
        const data = await fetchAPI(url);
        if (data) callback(data);
    }, pollInterval);
    activePollers[endpointKey] = pollerId;
    // also run immediately:
    (async () => { const data = await fetchAPI(url); if (data) callback(data); })();
}
```

All endpoint URLs are centralised in `api-endpoints.js` as `window.API_ENDPOINTS`. If the ESP32's IP address changes (for example, after a DHCP lease renewal), only this one file needs to change. Individual page scripts reference endpoints by name (`API_ENDPOINTS.STATUS_PRIMARY`) rather than by hardcoded path.

### 6.8.2 Theme System

All pages support light and dark themes. `applyTheme(name)` sets `document.documentElement.setAttribute('data-theme', name)`. All CSS is written using `[data-theme="light"]` and `[data-theme="dark"]` selector blocks, so the entire colour scheme swaps at the document root level without any JavaScript needing to touch individual elements. The selected theme is persisted to `localStorage.systemTheme` and an IIFE at the top of each page script reads and applies it before the DOM renders, preventing a flash of the wrong theme.

### 6.8.3 Toast Notification System

Every page uses the same `showNotification(message, type)` function to display brief status toasts. The function creates a `<div>` element dynamically, applies `@keyframes slideIn/slideOut` CSS (injected once into a `<style>` tag identified by `#toast-styles`), appends the toast to `document.body`, and removes it after 3 seconds. The injection guard ensures multiple calls do not add duplicate `<style>` blocks. Green is used for success; red for error.

### 6.8.4 Navigation Model

Navigation between pages uses simple `window.location.href` assignments from named functions (`openMonitorPage()`, `openControlPage()`, etc.). All pages load fresh from the ESP32's LittleFS on each navigation — there is no client-side routing. The session guard at the top of each page script ensures that direct URL access without logging in is blocked regardless of which page is entered.

---

## 6.9 Summary: How Each Functionality Addresses System Objectives

| Functionality | Mechanism | Objective Addressed |
|---------------|-----------|---------------------|
| Mantrap interlock control (5 modes) | ATmega state machine + ESP32 UART commands + browser radio buttons | Controlled access — only one door opens at a time; human cannot tailgate |
| PIR-gated second door | `WAIT_PIR_CONFIRM` state; 7s timeout before reset | Confirms physical presence before granting second-door access |
| Real-time door state display | SSE `door`/`status` events → `updateDoorUI()` | Security officer awareness without requiring physical inspection |
| Booth occupancy indicator | ATmega PIR → UART → ESP32 → SSE `booth` → CSS class toggle | Immediate visual of vestibule occupancy; supplements CCTV |
| Automatic capacity enforcement | STATS-triggered `applyOperationMode("Exit-Only", "CAPACITY", "Automatically")` | Autonomous limit enforcement; removes operator burden during busy periods |
| Operator audit trail | `user` field in every POST; `byUser` appended to log entries | Accountability: every change traceable to a named operator or "Automatically" |
| Lock fault detection | ATmega: door opened while LED red → `FAULT_LOCK_x` → ESP32 counter | Identifies mechanical lock failures before they become security breaches |
| MC fault detection (progressive) | ATmega: 5-stage open-duration timer → escalating `FAULT_MC_x` → ESP32 | Proportional alert: longer a door stays open, more serious the fault |
| PIR fault detection (timeout count) | ATmega: 5 consecutive WAIT_PIR_CONFIRM timeouts → `FAULT_PIR_x` | Distinguishes sensor failure from normal vacancy; alerts to sensor health |
| AI threat detection + response | Edge Impulse inference → `applyInferenceOperationMode()` → UART command | Automated response to visual threats without requiring human reaction time |
| Configurable AI door response mode | `ai_weapon_operation_mode` / `ai_masked_operation_mode` settable per detector | Flexible policy: weapon detection can trigger lockdown; mask can trigger exit-only |
| Session-scoped authentication | `sessionStorage.isLoggedIn` + script-time guard on every page | Access control for the management interface; auto-clear on tab close |
| Persistent log archive | `appendLogEntry()` → `saveLogFile()` to LittleFS; survive power cycles | Evidence preservation for post-incident review |
| Printable log report | Log fetch → `#printableLogsArea` DOM → `window.print()` via `@media print` rule | Physical paper records for audit, compliance, or offline review |
| Cross-tab mode synchronization | `localStorage.modeSync` + `window.storage` event listener | Consistent UI state when manager and officer both have the dashboard open |

---

*Documentation prepared as part of the Final Year Project: Automated Bank Entrance Security System.*
*Last updated: June 2026.*
