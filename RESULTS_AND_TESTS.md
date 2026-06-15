# Chapter: Results and Testing

## Bank Entrance Security System — Integration Testing, Bug Analysis, and Lessons Learned

---

## 5.1 Overview

This chapter documents the integration testing, observed defects, root-cause analyses, and corrective actions carried out on the Automated Bank Entrance Security System. Testing was conducted on the fully assembled prototype — comprising the ATmega328P door controller, the ESP32-CAM web server, and the browser-based dashboard — under both simulated and real hardware conditions.

Testing spanned three communication layers:

1. **ATmega328P ↔ ESP32-CAM** — Hardware UART at 9600 baud (Serial1)
2. **ESP32-CAM ↔ Browser** — HTTP REST (POST /action, GET /api/\*) and Server-Sent Events (GET /events)
3. **Browser UI** — JavaScript state management, DOM updates, and print rendering

Each bug is documented with: observed symptom, investigation method, root cause, fix applied, and lesson learned.

---

## 5.2 Test 1 — Operation Mode Commands Not Reaching the ATmega328P

### 5.2.1 Symptom

After integrating Server-Sent Events (SSE) for real-time dashboard updates, clicking the mode buttons on the Control page (e.g., switching from Normal-Traffic to Exit-Only) produced no visible change in the door LEDs or lock state on the physical hardware. The browser showed a success notification, and the ESP32 returned `{"status":"ok"}` to the POST request, but the ATmega328P did not respond.

### 5.2.2 Initial Hypothesis — SSE Blocking HTTP

The first hypothesis was that the newly added SSE connection was interfering with the HTTP POST requests used to send commands. The concern was that a persistent SSE connection might consume the ESP32's network resources or cause POST requests to queue and time out.

**This hypothesis was disproved.** SSE (Server-Sent Events) uses a separate, long-lived TCP connection that is independent of HTTP POST connections. The browser opens one TCP stream for the event channel and a separate TCP connection for each POST request. The ESP32's `AsyncWebServer` handles both concurrently without blocking. The POST requests were reaching the ESP32 and being processed correctly.

### 5.2.3 Deeper Investigation — Command Chain Trace

The command flow was traced end-to-end:

```
Browser click
    → fetch() POST to /action
    → ESP32 processActionPost()
    → applyOperationMode()
    → Serial1.println("SET_MODE_CLOSED")     [UART TX on GPIO15]
    → ATmega328P Serial.readStringUntil('\n')
    → processIncomingCommand()
    → currentMode = MODE_BANK_CLOSED
    → updateSystemLEDs()                      [LED change visible here]
```

Inserting `Serial.println()` debug statements on the ESP32 confirmed that `applyOperationMode()` was being called and the UART command was being sent. The problem was therefore downstream — in the physical hardware layer.

### 5.2.4 Root Cause — Silent Skip Guard in applyOperationMode()

A guard condition was found in `applyOperationMode()`:

```cpp
if (current_operation_mode.equalsIgnoreCase(next_mode)) {
    Serial.println("[" + source + "] MODE_CHANGE skipped: already " + next_label);
    return false;
}
```

If the ESP32's stored `current_operation_mode` already matched the requested mode (for example, if a previous session or an AI-triggered change had already applied "exit"), the function returned `false` silently — no UART command was sent, no SSE event was broadcast, and the browser received `{"status":"ok"}` regardless. From the user's perspective, the command appeared to be sent but had no effect.

Additionally, even when the guard did not trigger and the UART command was sent, the Control page UI had no immediate confirmation mechanism. It relied on polling `/api/mode.json` every **five seconds** to learn the new mode. In the time gap between sending the command and the next poll, repeated clicking could cause the guard to block subsequent sends.

### 5.2.5 Fix Applied

Two changes were made:

**ESP32 (webserver.ino)** — `applyOperationMode()` now broadcasts a `mode` SSE event immediately after a successful UART send:

```cpp
Serial1.println(command);
lastDoorEventId++;
events.send(buildModePayload().c_str(), "mode", lastDoorEventId);
return true;
```

**Browser (control.js)** — The Control page SSE handler now listens for the `mode` event and updates the radio button immediately:

```javascript
evtSource.addEventListener('mode', function(e) {
    const data = JSON.parse(e.data);
    if (data && data.mode) {
        updateModeFromAPI(data);
    }
});
```

### 5.2.6 Lesson Learned

> **Silent no-ops in control systems are dangerous.** When a function silently skips an action (because state already matches), the caller receives no meaningful feedback. In a safety-critical system such as a bank entrance controller, this can cause an operator to believe a command was executed when it was not. All skip conditions should either: (a) be clearly communicated to the caller via return value and logged, or (b) send an explicit confirmation (such as an SSE event with the current state) so the UI always reflects reality regardless of whether a change occurred.

> **SSE does not block HTTP.** SSE and HTTP POST are independent TCP channels. Adding a persistent SSE connection to a web application does not degrade the responsiveness of POST-based control commands.

---

## 5.3 Test 2 — Unidirectional UART: Commands Sent but Not Received

### 5.3.1 Symptom

After confirming the ESP32 was sending UART commands, the door LEDs on the ATmega328P still did not change. However, door contact events (OPENED/CLOSED) from the ATmega were correctly reaching the ESP32 and appearing on the dashboard. Only the **command direction** (ESP32 → ATmega) was failing; the **event direction** (ATmega → ESP32) worked correctly.

### 5.3.2 Investigation — Command Syntax Verification

The command strings on both sides were compared in detail:

| Operation     | ESP32 sends (Serial1.println) | ATmega expects (== comparison) |
|---------------|-------------------------------|--------------------------------|
| Exit-Only     | `SET_MODE_CLOSED`             | `"SET_MODE_CLOSED"` ✓          |
| Normal-Traffic| `SET_MODE_NORMAL`             | `"SET_MODE_NORMAL"` ✓          |
| Evacuation    | `SET_MODE_EVAC`               | `"SET_MODE_EVAC"` ✓            |
| Entrance-Only | `SET_MODE_STAFF`              | `"SET_MODE_STAFF"` ✓           |
| Lock-All      | `SET_MODE_LOCK`               | `"SET_MODE_LOCK"` ✓            |
| Door unlock   | `DOOR_1_UNLOCK_ONCE`          | startsWith + endsWith ✓        |

The `Serial1.println()` function appends `\r\n`. The ATmega reads with `Serial.readStringUntil('\n')` then calls `.trim()` which strips the carriage return `\r`. The resulting string matches the expected literals exactly. **Command syntax was not the cause.**

### 5.3.3 Root Cause — Physical Wiring (One Direction of UART Not Connected)

The evidence pointed conclusively to a hardware issue:

- **ATmega TX (D1, physical DIP-28 pin 3)** → **ESP32 GPIO13 (RX of Serial1)**: Working — door events arrive.
- **ESP32 GPIO15 (TX of Serial1)** → **ATmega RX (D0, physical DIP-28 pin 2)**: Not working — commands do not arrive.

Only the ATmega-to-ESP32 wire had been connected. The return wire (ESP32-to-ATmega) was either missing or making poor contact.

An additional finding was noted: on the AI Thinker ESP32-CAM module, **GPIO15 is also routed to the SD card slot (CMD line)** on the PCB. Although this does not affect UART operation when no SD library is initialised, it was flagged as a potential source of interference if the SD card were ever inserted and the card's CMD pull-up interacted with UART signalling.

### 5.3.4 Lesson Learned

> **UART is bidirectional but requires two physically separate wires.** The TX line of one device must connect to the RX line of the other, and vice versa. Because the two directions are electrically independent, it is entirely possible for one direction to function correctly while the other is completely open. This failure mode is particularly confusing because partial functionality (events arriving from the ATmega) creates a false impression that UART is working.

> **Confirm both wires when commissioning a UART link.** A simple loopback test — sending a known character from the ESP32 and verifying it arrives on the ATmega's Serial monitor, and vice versa — should be performed before any higher-level protocol testing.

> **GPIO15 on the ESP32-CAM AI Thinker is a shared pin.** It serves as both UART1 TX and the SD card CMD line. Using it for UART is valid, but the SD card must not be initialised while UART is active on that pin.

---

## 5.4 Test 3 — parseJsonString() Limitation with Numeric Values

### 5.4.1 Symptom

When implementing the "Set Maximum Inside Clients" feature, the ESP32's custom JSON parser failed to extract numeric values sent from the browser. The action `SET_MAX_INSIDE` with value `50` resulted in `maxClientsInside` remaining zero.

### 5.4.2 Root Cause — Parser Only Handles Quoted String Values

The ESP32 uses a lightweight custom parser because it cannot include a full JSON library without exceeding memory constraints:

```cpp
String parseJsonString(const String &body, const String &key) {
    int keyIndex = body.indexOf('"' + key + '"');
    // ... finds the next quoted value after the colon
    int start = body.indexOf('"', colonIndex + 1);
    int end   = body.indexOf('"', start + 1);
    return body.substring(start + 1, end);
}
```

This parser looks for the opening `"` after the colon. A bare numeric value such as `"value": 50` has no opening quote, so `start` is set to `-1` and the function returns an empty string.

### 5.4.3 Fix Applied

The JavaScript was changed to send the number as a quoted string:

```javascript
body: JSON.stringify({ action: 'SET_MAX_INSIDE', value: String(val), user: getActiveUser() })
```

This produces `"value":"50"` (with quotes) in the JSON body, which the parser can handle correctly.

### 5.4.4 Lesson Learned

> **Know the limitations of your parser before designing the protocol.** When an embedded system uses a custom parser instead of a full JSON library, the browser-side code must be written to match the parser's expectations — not the other way around. In this system, all values that need to be extracted by `parseJsonString()` must be sent as quoted strings, even when they represent numeric data. The `.toInt()` method on the C++ `String` class then converts back to integer on the receiving side.

---

## 5.5 Test 4 — Monitor Page Statistics and Door States Never Update

### 5.5.1 Symptom

On the Monitor page, the statistics panel (Entries, Exits, Inside count, Uptime) displayed persistent zeros. The door state visual indicators in the booth diagram and the log container remained in their initial state regardless of physical door events.

The Control page, by contrast, correctly showed live client count and total entry statistics, which updated in response to door events.

### 5.5.2 Investigation

The Monitor page had an SSE connection (`new EventSource('/events')`) and event listeners for `door`, `booth`, and `status` events. These listeners called `applyDoorEvent()`, `updateBoothOccupancy()`, and `applyStatusEvent()` respectively — all of which update the DOM.

The key difference was in the **update strategy**:

| Page    | Primary update channel | Fallback polling         |
|---------|------------------------|--------------------------|
| Control | SSE `status` event     | Always running (API poll)|
| Monitor | SSE `status` event     | **Only if SSE fails**    |

The Monitor page called `startFallbackPolling()` only inside the SSE `onerror` handler. In modern browsers, `EventSource` is always supported, so `startEventStream()` always returned `true`. The `onerror` callback does not fire immediately on connection — it fires when the connection is lost. If the ESP32 was slow to push the first `status` event (for example, because no door activity had occurred), the Monitor page would remain blank indefinitely.

Additionally, the **refresh button** had been wired incorrectly:

```javascript
// monitor.html (before fix)
<button class="refresh-btn" onclick="clearLogs()">↻</button>
```

`clearLogs()` replaced the log container with the empty-state message. Clicking the refresh button made the situation worse, not better.

### 5.5.3 Fix Applied

Polling was decoupled from SSE failure and made unconditional. Both channels now run simultaneously:

```javascript
// monitor.js DOMContentLoaded (after fix)
pollStatus();
pollMonitoringLogs();
startFallbackPolling();   // always starts 3-second intervals
startEventStream();       // SSE on top for instant events
```

A `refreshMonitorLogs()` function was added and wired to the refresh button:

```javascript
function refreshMonitorLogs() {
    pollMonitoringLogs();
    pollStatus();
}
```

### 5.5.4 Lesson Learned

> **SSE should be treated as an enhancement, not a sole data source.** SSE provides instant push updates when events occur, but it depends on the server generating events. If no physical events occur (no doors open, no ATmega STATS packet arrives), no SSE events are sent and the browser UI never updates, even though the ESP32 and ATmega are functioning correctly. Pairing SSE with periodic polling ensures the UI accurately reflects system state even during quiet periods.

> **Verify what a UI control actually does before labelling it "Refresh."** A button labelled with a refresh symbol that clears data is worse than no button at all. Every user-facing control action must be audited to confirm it behaves according to its label.

---

## 5.6 Test 5 — Control Page Produces Blank Print Output

### 5.6.1 Symptom

Clicking "Print Info" on the Control page sidebar and then confirming the print dialog produced a completely blank page. All other pages (Monitor, Faults, AI Control) printed correctly.

### 5.6.2 Root Cause — Direct window.print() Call Without Printable DOM Element

The Control page sidebar had the print button wired directly to `window.print()`:

```javascript
// control.js showSideNavigationBar() (before fix)
'<svg class="print-icon" onclick="window.print()" ...>'
```

The `@media print` CSS rule — present in `style.css` — hides all page content and then reveals only `#printableLogsArea`:

```css
@media print {
    body * { visibility: hidden; }
    #printableLogsArea, #printableLogsArea * { visibility: visible; }
}
```

Because the Control page called `window.print()` directly, `#printableLogsArea` was never appended to the DOM. The print rule then hid the entire page (`body * { visibility: hidden }`) and had nothing to reveal — producing a blank white page.

All other pages used the correct flow:
```
openPrintLogsDialog()
    → user selects log files
    → printSelectedLogFiles()
    → fetches log files from ESP32
    → buildAndPrintLogs()
    → appends #printableLogsArea to body
    → window.print()
```

### 5.6.3 Fix Applied

The sidebar onclick was changed from `window.print()` to `openPrintLogsDialog()`, and the complete print dialog function set (`openPrintLogsDialog`, `closePrintLogsDialog`, `printSelectedLogFiles`, `buildAndPrintLogs`, `escapeHTML`) was added to `control.js`.

### 5.6.4 Lesson Learned

> **`window.print()` must only be called after the printable content exists in the DOM.** The `@media print` visibility pattern (`body * hidden, #target visible`) is a common technique, but it requires the target element to already be present. Calling `window.print()` before the content is rendered produces a blank page with no warning or error — a particularly silent failure.

> **Shared UI behaviours (such as a print dialog) should be extracted into a shared module.** Having the same print dialog implemented independently in four different page scripts increased the risk of divergence. In this project, the Control page was inadvertently left on an older pattern (`window.print()`) while the other pages had been updated, because there was no single shared implementation.

---

## 5.7 Test 6 — Capacity Enforcement Mode Switch Conflicts

### 5.7.1 Symptom

When the bank reached its configured maximum client capacity, the ESP32 automatically switched to Exit-Only mode. However, if the operator then manually switched back to Normal-Traffic before clients had exited (thus keeping `clientsInside >= maxClientsInside`), the system immediately switched back to Exit-Only on the next STATS update from the ATmega — with no indication to the operator that this was occurring.

### 5.7.2 Root Cause — State Check Occurs on Every STATS Packet

The capacity enforcement was checked inside the STATS handler, which fires every time the ATmega sends an occupancy update:

```cpp
if (insideValue.length() > 0) {
    clientsInside = insideValue.toInt();
    if (maxClientsInside > 0 && clientsInside >= maxClientsInside &&
        !current_operation_mode.equalsIgnoreCase("exit") &&
        !current_operation_mode.equalsIgnoreCase("lock")) {
        applyOperationMode("Exit-Only", "CAPACITY", "Automatically");
    }
}
```

This is correct behaviour — the system should enforce capacity — but the operator was unaware that the system was overriding their manual selection because no persistent message communicated the reason.

### 5.7.3 Fix Applied

The existing log entry in `applyOperationMode()` with the "CAPACITY" source and "Automatically" attribution already records the event in the control log. The mode SSE event added in Test 1 additionally updates the Control page radio buttons instantly, making the override visible. The capacity status message on the Control page (`cap-status-msg`) also shows "Capacity reached — Exit-Only mode enforced" when `clientsInside >= maxClientsInside`.

### 5.7.4 Lesson Learned

> **Automatic overrides of manual commands must be clearly communicated.** In a safety-critical system, an operator clicking a mode button and having it silently reversed by an automatic rule is a significant usability failure that could create confusion during a security incident. Every automatic override should: (a) immediately update the UI to reflect the new state, (b) display a visible reason for the override, and (c) log the event with attribution ("Automatically" in this system).

---

## 5.8 Test 7 — UI Component Defects

### 5.8.1 Modal Close Button Not Displaying Correctly (Monitor Page)

**Symptom:** The close button on the print log selection modal on the Monitor page did not display or function as expected. On other pages the close button worked correctly.

**Root Cause:** The close button used the HTML entity `×` (the mathematical multiplication sign ×) as its visible character. Depending on the font stack, system font rendering, and browser, this character may render at unexpected sizes or positions relative to the button boundaries.

**Fix:** Changed to plain ASCII `X` across all pages:

```html
<button type="button" class="close-modal-btn" onclick="closePrintLogsDialog()">X</button>
```

**Lesson Learned:** Plain ASCII characters (A–Z, 0–9, punctuation) render identically across all fonts, browsers, and operating systems. HTML entities and Unicode symbols (×, ✕, ⓧ) depend on font support and may fail silently on embedded or limited systems. For UI controls that must reliably render everywhere, use the simplest character that communicates the intent.

### 5.8.2 Refresh Button Renders as an Awkward Circle

**Symptom:** The log refresh buttons on the Control and Monitor pages appeared as small circles containing the ↻ rotation symbol. On some screen sizes and font renders, the symbol was misaligned within the circle and difficult to click.

**Root Cause:** The CSS defined a fixed `width: 22px; height: 22px; border-radius: 11px` — creating a perfect circle. The rotation symbol ↻ inside a 22-pixel circle produced an icon that was visually ambiguous (could be confused with a loading spinner) and too small to click accurately on touch devices.

**Fix:** Removed the fixed width/height and replaced with padding-based sizing. Changed the icon from ↻ to ↓ (downward arrow):

```css
.refresh-btn {
    background: none;
    border: 1px solid rgba(255, 142, 3, 0.4);
    border-radius: 4px;
    color: rgb(255, 142, 3);
    font-size: 0.8rem;
    padding: 1px 7px;
    line-height: 1.5;
}
```

**Lesson Learned:** Button dimensions should be driven by content (text + padding), not fixed pixel values. Fixed-size icon buttons that contain Unicode symbols are unpredictable across font sizes and display densities. Simple text or arrows communicate function without requiring icon font support.

---

## 5.9 Summary of Communication Protocol Findings

The following table summarises all protocol-level findings from testing:

| Layer                    | Finding                                                   | Impact                              |
|--------------------------|-----------------------------------------------------------|-------------------------------------|
| UART (ATmega → ESP32)    | TX/RX wiring must be cross-connected (TX→RX, RX→TX)      | Missing wire = complete command loss|
| UART (ESP32 → ATmega)    | `\r` appended by `println()` must be stripped by `.trim()`| Unparseable commands if not trimmed |
| UART Command Syntax      | Exact string match (`==`) used; no tolerance for variation| Any deviation = silently ignored    |
| JSON Parsing (ESP32)     | Custom parser only handles quoted string values           | Numeric JSON values not extracted   |
| HTTP POST (Browser→ESP32)| Independent of SSE; not affected by open SSE connection   | POST reliability confirmed          |
| SSE (ESP32→Browser)      | Events only pushed when ATmega generates activity         | UI can appear stale during quiet periods |
| SSE `mode` Event         | Not emitted before fix; UI relied on 5-second polling     | 5s delay between command and visual feedback |
| SSE vs. Polling          | SSE alone insufficient; polling needed for initial state  | Combined approach required          |

---

## 5.10 User Attribution and Audit Trail

A recurring requirement during development was the ability to determine *who* performed *what* action and *when*. The following attribution mechanisms were implemented and tested:

- All POST actions to `/action` include a `user` field populated from `sessionStorage.getItem('username')`.
- `processActionPost()` extracts this field and appends `" by 'username'"` to every log entry.
- Automatic actions (capacity enforcement, AI inference-triggered mode changes) use the fixed string `"Automatically"` as the user attribution, making them clearly distinguishable from manual operator actions in the log.
- Fault acknowledgements record the operator who cleared them.

**Test Result:** All control log entries correctly attributed actions to the logged-in user. Automatically triggered mode changes were correctly labelled "Automatically" rather than inheriting a previous operator's username.

---

## 5.11 Deferred Items and Known Limitations

The following items were identified during testing but deferred:

| Item                            | Reason Deferred                                         | Impact              |
|---------------------------------|---------------------------------------------------------|---------------------|
| PIR sensor fault detection      | PIR sensors not yet soldered to prototype               | Fault UI exists; no server-side array |
| EventBus SSE refactor           | Each page opens its own `/events` connection (3+ total) | Minor resource use on ESP32 |
| SSE heartbeat                   | No keep-alive mechanism; stale connections not detected | Reconnect depends on browser |
| ATmega → ESP32 TX wire missing  | Hardware wiring issue; not a software defect            | Mode commands have no effect until wired |
| SD card pin conflict on GPIO15  | SD card not used; no active conflict observed           | Risk if SD card initialised in future |

---

*Documentation prepared as part of the Final Year Project: Automated Bank Entrance Security System.*
*Last updated: June 2026.*
