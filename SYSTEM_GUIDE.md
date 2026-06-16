# Bank Entrance Security System — System Guide

## Automated Dual-Mantrap Access Controller with AI Threat Detection

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Hardware Components](#2-hardware-components)
3. [Wiring Reference](#3-wiring-reference)
4. [Software Prerequisites](#4-software-prerequisites)
5. [Flashing the ATmega328P](#5-flashing-the-atmega328p)
6. [Flashing the ESP32-CAM](#6-flashing-the-esp32-cam)
7. [Uploading the Web Dashboard to ESP32](#7-uploading-the-web-dashboard-to-esp32)
8. [Network and WiFi Configuration](#8-network-and-wifi-configuration)
9. [First Boot Checklist](#9-first-boot-checklist)
10. [Dashboard Login and Accounts](#10-dashboard-login-and-accounts)
11. [Monitor Page — Real-Time View](#11-monitor-page--real-time-view)
12. [Control Page — Operator Commands](#12-control-page--operator-commands)
13. [Faults Page — Diagnostics](#13-faults-page--diagnostics)
14. [AI Control Page — Threat Detection](#14-ai-control-page--threat-detection)
15. [Operation Modes Reference](#15-operation-modes-reference)
16. [Fault Types Reference](#16-fault-types-reference)
17. [Log Files Reference](#17-log-files-reference)
18. [Troubleshooting](#18-troubleshooting)
19. [API Quick Reference](#19-api-quick-reference)
20. [Hardware Pin Reference](#20-hardware-pin-reference)

---

## 1. System Overview

The Bank Entrance Security System controls two interlocked mantrap booths at a bank entrance. Each booth has two doors with magnetic solenoid locks that operate in sequence — the second door only unlocks after the first door has fully closed and a PIR sensor confirms a person is present inside. This prevents tailgating and ensures only one person passes through at a time.

The system has three hardware layers:

```
BROWSER (Dashboard)
       |
    WiFi (HTTP + SSE)
       |
   ESP32-CAM          <-- web server, AI inference, WiFi bridge
       |
  UART (9600 baud)
       |
  ATmega328P          <-- door controller, lock LEDs, mag contacts, PIR sensors
       |
  Solenoid Locks + Magnetic Contacts + PIR Sensors
```

**Booth 1 — Entry Booth (left side)**
- Door 1 (ENT.D1): outer/street-facing entrance door
- Door 2 (ENT.D2): inner/bank-facing exit of the vestibule

**Booth 2 — Exit Booth (right side)**
- Door 3 (EXT.D3): outer/bank-facing entry to the vestibule
- Door 4 (EXT.D4): inner/street-facing exit door

---

## 2. Hardware Components

| Component | Quantity | Role |
|-----------|----------|------|
| ATmega328P (DIP-28) | 1 | Door controller — reads sensors, drives lock LEDs |
| ESP32-CAM (AI Thinker) | 1 | Web server, AI inference engine, WiFi bridge |
| Magnetic solenoid locks | 4 | Physical door locking mechanism |
| Magnetic contact sensors | 4 | Door open/closed detection (normally-open with pull-down) |
| PIR sensors | 2 | Person detection inside each vestibule |
| Green LEDs (or relay) | 4 | Indicate door unlocked state |
| Red LEDs (or relay) | 4 | Indicate door locked state |
| FTDI USB-to-Serial (3.3V) | 1 | For programming the ATmega328P |
| 16MHz crystal + 22pF caps | 1 set | ATmega clock |
| Decoupling capacitors (100nF) | several | Power stability on ATmega |
| 5V / 3.3V power supply | 1 | System power |

---

## 3. Wiring Reference

### 3.1 ATmega328P Door Outputs (Lock LEDs / Relays)

All output pins are wired to the gate of a transistor or relay driver that switches the solenoid lock or LED.

| Door | Green (Unlock) Pin | Red (Locked) Pin | Physical DIP-28 Pins |
|------|--------------------|------------------|----------------------|
| ENT.D1 (Door 1) | A0  | A4  | 23 (green), 27 (red) |
| ENT.D2 (Door 2) | D9  | A1  | 15 (green), 24 (red) |
| EXT.D3 (Door 3) | D8  | D4  | 14 (green), 6 (red)  |
| EXT.D4 (Door 4) | D3  | D2  | 5 (green), 4 (red)   |

### 3.2 ATmega328P Sensor Inputs

All door contact inputs use **pull-down resistors**. The signal goes HIGH when the magnetic contact opens (door opened) and LOW when the contact closes (door shut).

| Sensor | Arduino Pin | Physical DIP-28 Pin |
|--------|-------------|---------------------|
| Door 1 mag contact | A3  | 26 |
| Door 2 mag contact | D13 | 19 |
| Door 3 mag contact | D7  | 13 |
| Door 4 mag contact | D6  | 12 |
| PIR Booth 1        | D10 | 16 |
| PIR Booth 2        | D11 | 17 |
| Mode selector (opt)| A2  | 25 |

### 3.3 UART Connection — ATmega328P to ESP32-CAM

This is a **cross-connection**: TX of one device goes to RX of the other.

```
ATmega328P (DIP pin 3)  D1 / TX  ──────────►  ESP32 GPIO13 (RX of Serial1)
ATmega328P (DIP pin 2)  D0 / RX  ◄──────────  ESP32 GPIO15 (TX of Serial1)
ATmega328P GND                   ──────────   ESP32 GND   (common ground)
```

> Both wires must be connected. The system can receive door events (ATmega → ESP32) with only the first wire, but mode commands will not reach the ATmega without the second wire (ESP32 → ATmega).

Baud rate: **9600** on both sides.

> **GPIO15 note:** On the AI Thinker ESP32-CAM, GPIO15 is also routed to the SD card CMD line. Do not initialise the SD card library if using GPIO15 for UART.

### 3.4 Power

- ATmega328P: 5V supply. All ATmega GPIO is 5V tolerant.
- ESP32-CAM: 3.3V (use the 3.3V pin or a dedicated regulator). The ESP32 GPIO is 3.3V.
- If the ATmega runs at 5V and the ESP32 at 3.3V, a **voltage divider or level shifter** on the ATmega TX → ESP32 RX line is recommended (ATmega TX output is 5V; ESP32 RX input tolerates max 3.6V). The ESP32 TX → ATmega RX direction is safe as-is (3.3V HIGH is recognised by ATmega as logic HIGH).

---

## 4. Software Prerequisites

### Arduino IDE Setup

1. Install **Arduino IDE 2.x** or **1.8.x**.
2. Add the ESP32 board package URL in Preferences:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Install **esp32 by Espressif** via Boards Manager.
4. Install the following libraries via Library Manager:
   - `ESPAsyncWebServer` (by lacamera or me-no-dev)
   - `AsyncTCP`
   - `eloquent_esp32cam`
   - `Edge Impulse — Threat_Detector_inferencing` (install as a ZIP from your Edge Impulse project export)
5. For ATmega programming, the standard **Arduino AVR Boards** package is sufficient (included by default).

### LittleFS Upload Tool

The dashboard files (HTML, CSS, JS, images) are stored in the ESP32's flash filesystem. To upload them, install the **LittleFS upload plugin** for Arduino IDE:
- For IDE 1.x: `arduino-esp32fs-plugin`
- For IDE 2.x: `arduino-littlefs-upload` (CTRL+SHIFT+P → "Upload LittleFS to Pico/ESP8266/ESP32")

Place all dashboard files inside a `data/` folder in the same directory as `webserver.ino`.

---

## 5. Flashing the ATmega328P

### Method: FTDI USB-to-Serial Programmer

1. Connect the FTDI adapter to the ATmega:
   - FTDI TX → ATmega DIP pin 2 (D0/RX)
   - FTDI RX → ATmega DIP pin 3 (D1/TX)
   - FTDI GND → ATmega GND (DIP pin 8 or 22)
   - FTDI VCC (5V) → ATmega VCC (DIP pin 7)
   - FTDI DTR → 100nF capacitor → ATmega RESET (DIP pin 1)

2. In Arduino IDE:
   - Board: **Arduino Uno** (or Arduino Duemilanove w/ ATmega328)
   - Processor: **ATmega328P**
   - Port: whichever COM/ttyUSB port the FTDI appears on
   - Programmer: **AVRISP mkII** (or leave as default)

3. Open `ATmega328p/ATmega328p.ino` and click **Upload**.

4. On successful upload, the ATmega will immediately start controlling the doors. All door LEDs should briefly flash as `updateSystemLEDs()` runs for the first time.

> Disconnect the FTDI adapter after flashing. The FTDI's TX line on the ATmega's RX pin (D0) will conflict with the ESP32-CAM UART connection. Only one device should be connected to D0 at a time.

---

## 6. Flashing the ESP32-CAM

The AI Thinker ESP32-CAM requires a USB-to-Serial adapter for programming (it has no built-in USB).

### Wiring for Programming Mode

```
FTDI TX  →  ESP32-CAM U0RXD (GPIO3)
FTDI RX  →  ESP32-CAM U0TXD (GPIO1)
FTDI GND →  ESP32-CAM GND
FTDI VCC →  ESP32-CAM 5V
            ESP32-CAM IO0  →  GND  (this puts it into bootloader mode)
```

> The IO0 → GND jumper must be connected **before** powering on the board.

### Upload Steps

1. In Arduino IDE:
   - Board: **AI Thinker ESP32-CAM**
   - Upload Speed: **115200** (or 460800 if your adapter supports it)
   - Port: whichever COM/ttyUSB the FTDI appears on

2. Open `webserver/webserver.ino`.

3. Click **Upload**. When the IDE shows `Connecting...`, briefly press the RESET button on the ESP32-CAM.

4. After upload completes: **remove the IO0 → GND jumper**, then press RESET again to boot normally.

5. Open the Serial Monitor at 115200 baud. You should see:
   ```
   UART1 (ATmega interface) initialized
   LittleFS Mounted Successfully
   Camera initialized successfully
   Connecting to WiFi....
   WiFi Connected
   IP Address: 192.168.x.x
   NTP sync OK: 2026-06-16T09:00:00
   ESP32 Unified System Ready!
   ```

---

## 7. Uploading the Web Dashboard to ESP32

The dashboard HTML, CSS, JS, and image files must be uploaded to LittleFS separately from the firmware.

1. Ensure all dashboard files are inside a `data/` folder within the `webserver/` sketch directory:
   ```
   webserver/
   ├── webserver.ino
   └── data/
       ├── index.html
       ├── login.html
       ├── monitor.html
       ├── control.html
       ├── faults.html
       ├── aicontrol.html
       ├── style.css
       ├── monitor.css
       ├── control.js
       ├── monitor.js
       ├── faults.js
       ├── aicontrol.js
       ├── aicontrol-inference.js
       ├── login.js
       ├── logout.js
       ├── script.js
       ├── utility.js
       ├── js/
       │   ├── api-endpoints.js
       │   ├── api-client.js
       │   └── bankSystem.js
       └── images/
           ├── connecta-logo.png
           ├── locked-padlock.png
           └── unlocked-padlock.png
   ```

2. With the ESP32-CAM in normal boot mode (IO0 not grounded), select **Tools → ESP32 Sketch Data Upload** (IDE 1.x) or press **CTRL+SHIFT+P → Upload LittleFS** (IDE 2.x).

3. The tool will erase the filesystem partition and upload all files. This takes 15–30 seconds.

4. Press RESET on the ESP32-CAM after the upload completes.

> The firmware upload and the filesystem upload are independent. Reflashing the firmware does NOT erase the filesystem (and vice versa), so log files survive firmware updates.

---

## 8. Network and WiFi Configuration

The WiFi credentials are set as constants at the top of `webserver.ino`:

```cpp
const char* ssid     = "@*******re";
const char* password = "44*****51";
```

Change these to match your local WiFi network, then re-flash the ESP32 firmware.

The ESP32 connects to your WiFi router as a **station (client)**, not as an access point. The dashboard is accessed via the ESP32's IP address assigned by your router's DHCP server. To find the IP:
- Check the Serial Monitor output after boot (it prints `IP Address: 192.168.x.x`).
- Check your router's DHCP client list for a device named "espressif".
- Assign a **static/reserved DHCP lease** in your router settings using the ESP32's MAC address, so the IP never changes. This is strongly recommended for production use.

**NTP time synchronization** runs automatically over the internet after WiFi connects. The system uses UTC+2 (Central Africa Time, Zimbabwe). If the network has no internet access, log timestamps will show as `UP+HH:MM:SS` (time since boot) rather than real-world date/time.

---

## 9. First Boot Checklist

After powering the fully assembled system for the first time:

- [ ] ESP32 Serial Monitor shows "WiFi Connected" and prints an IP address
- [ ] NTP sync succeeds ("NTP sync OK: YYYY-MM-DDTHH:MM:SS")
- [ ] All four door lock LEDs light red (all doors locked at startup)
- [ ] Navigate to `http://<ESP32-IP>` in a browser — the login page loads
- [ ] Log in with a valid account (see Section 10)
- [ ] Monitor page shows all four doors in locked/closed state
- [ ] Open Door 1 physically — monitor page shows ENT.D1 as open (green indicator)
- [ ] Close Door 1 — Door 2 should NOT yet unlock (PIR must detect presence first)
- [ ] Stand in the vestibule (PIR booth 1 activates) — Door 2 unlocks and shows green
- [ ] Pass through Door 2 and close it — both doors return to locked/closed
- [ ] Control page: change mode to Evacuation — all four door LEDs go green
- [ ] Change back to Normal-Traffic — interlocks resume
- [ ] Faults page: all components show "Normal" status

---

## 10. Dashboard Login and Accounts

The dashboard requires login on every new browser session. Navigate to `http://<ESP32-IP>/login.html`.

### Default Accounts

| Username | Password | Role |
|----------|----------|------|
| `brezhnevndlovu02@gmail.com` | `#31May2026` | Administrator / Developer |
| `Shyleen` | `supervisor` | Security Supervisor |

### Adding Accounts

Additional accounts can be added through the `create_account.html` page. New accounts are stored in `localStorage.users` in the browser and are available on that browser only (not synchronised across devices, as there is no central user database).

### Session Behaviour

- Sessions are stored in `sessionStorage` — they expire automatically when the browser tab is closed.
- Each tab requires its own login session.
- Logging out clears the session and redirects to the login page.
- The logged-in username is attached to every command sent to the ESP32, creating a named audit trail.

---

## 11. Monitor Page — Real-Time View

Navigate to Monitor from the top navigation bar. This page is view-only — no commands are sent from here except the Evacuate button.


### What You See

**Door contact indicators (centre booth diagram):**
Each of the four doors has a visual element that changes to show opened (e.g. a gap in the door outline) or closed state. These update via Server-Sent Events within milliseconds of the physical door moving.

**Lock state padlocks (left and right of the booth diagram):**
- Red closed padlock = door is locked
- Green open padlock = door is unlocked

**Booth PIR occupancy:**
- `X -->` indicator lights up when Booth 1 (entry) PIR detects a person
- `<-- O` indicator lights up when Booth 2 (exit) PIR detects a person

**Live CCTV feed:**
The ESP32-CAM image refreshes every 100ms, providing approximately 10 frames per second of live video from inside the entrance.

**Counter panel:**
- **Uptime** — current system time (NTP-synced) or time since boot
- **Entries** — total people who have completed entry through Booth 1 today
- **Exits** — total people who have completed exit through Booth 2 today
- **Inside** — estimated clients currently inside the bank (Entries minus Exits)

### Refresh Button (↓)

Manually re-fetches the status and monitoring log from the ESP32. Useful if the page was loaded during a brief WiFi disruption.

### How Updates Arrive

The page runs both Server-Sent Events (for instant updates) and 3-second HTTP polling (to ensure counters stay current even when no physical events occur). Both run simultaneously.

---

## 12. Control Page — Operator Commands

This page is the primary command interface. All actions are logged with the current operator's username.

### 12.1 Operation Mode Selection

Click the label button next to any mode to activate it immediately. The selected mode is sent to the ESP32, which transmits the corresponding UART command to the ATmega, and the doors respond within approximately 200ms.

See [Section 15](#15-operation-modes-reference) for a full description of what each mode does.

### 12.2 Door Controls

Four buttons, one per door. Click to toggle the door's state:

| Button shows | Click does |
|--------------|------------|
| `UNLOCK` | Sends a one-shot unlock command to that door. The door unlocks for one cycle (until opened and re-closed), then automatically returns to normal interlock control. |
| `CANCEL` | Immediately returns the door to automatic interlock control without waiting for a cycle to complete. |

The button updates immediately on click (the UI doesn't wait for ESP32 confirmation). When the ATmega completes a one-shot cycle, it notifies the ESP32 via UART, which pushes an SSE event and the button silently snaps back to `UNLOCK`.

### 12.3 Capacity Card

**Inside Clients Estimate / Total Clients Today:** Live counts from the ATmega, updated whenever a mantrap cycle completes.

**Set Maximum Inside:** Enter a number and click **Set**. Once set:
- The status message below the counter turns orange when inside count reaches 80% of the limit
- The message turns red and says "CAPACITY REACHED" at 100%
- The system automatically switches to Exit-Only mode when the limit is reached — no operator action required
- Set to 0 (or blank) to remove the limit

### 12.4 Door Actions Log

Shows the 10 most recent control-log entries fetched from the ESP32. Includes mode changes, door overrides, and capacity adjustments with timestamps and operator names.

### 12.5 Print Info

Opens a dialog to select which log files to print. Select one or more logs, click PRINT. The system fetches the raw log text from the ESP32 and opens the browser print dialog, showing only the log content.

### 12.6 Settings Panel (Sidebar)

Three radio toggle pairs in the sidebar (Traffic-Volume, AI-Decision, Navigation-Help). These are currently configuration placeholders — they do not send commands to the ESP32 in the current firmware version.

---

## 13. Faults Page — Diagnostics

### 13.1 Fault Categories

**Lock Faults (4 — one per door):** Triggered when a door's magnetic contact sensor opens (door physically opened) while that door's lock was in the locked (red LED) state. Indicates the lock failed to hold or was forced.

**Magnetic Contact Faults (4 — one per door):** Triggered when a door is held open for an extended period. Uses a progressive timer — alerts are sent at 5s, 15s, 35s, 65s, and 125s of continuous open state. A door left open for 35 seconds will have generated 3 MC fault events.

**PIR Sensor Faults (2 — one per booth):** Triggered when a person enters the first door and closes it, but the PIR sensor never detects them in the vestibule within 7 seconds — 5 times in a row. This indicates the PIR sensor may be disconnected, misaligned, or failed.

### 13.2 Fault Box Indicators

Each component has a fault box showing:
- **Status text:** `Normal` or `FAULT`
- **Count badge:** `x/5` — how many fault events have accumulated
- **Health bar:** Fills from left to right as faults accumulate; colour changes from green → yellow → orange → red as the count rises toward 5

A component reaches `FAULT` status when its count reaches 5.

### 13.3 Clearing Faults

Click **Clear All Faults** to reset all fault counters to zero. This action is logged with the operator's name. Faults will begin re-accumulating if the underlying hardware issue has not been resolved.

### 13.4 Reporting a Fault

Click the **Report** button on any fault box to open the report modal. Enter a description of the observed problem. Click **Open in Gmail** — the system opens a pre-filled email to the maintenance and supervision team. Close the modal with the **X** button or by clicking the grey backdrop.

### 13.5 Fault Log

The lower section shows the most recent fault log entries fetched from the ESP32, including timestamps and details of each fault event and any clears.

---

## 14. AI Control Page — Threat Detection

### 14.1 System Enable

The **AI System** master toggle must be ON for any inference to run. When OFF, the ESP32 does not capture frames or run the classifier, and all sub-options are greyed out.

### 14.2 Threat Detection Toggles

- **Masked Face Detection:** Enables detection of individuals wearing face coverings.
- **Weapon Detection:** Enables detection of firearms, knives, and other weapons.

Either or both can be enabled independently. The ESP32 combines both into a single `AI_THREAT` flag — inference runs if at least one is enabled.

### 14.3 AI Door Control

When ON, detections above the 50% confidence threshold automatically trigger a mode change. When OFF, inference still runs and results are displayed, but no door response occurs — useful for monitoring without automated intervention.

### 14.4 Response Mode Configuration

For each detector type, select what the system should do when a threat is detected:

| Mode option | Effect |
|-------------|--------|
| Normal-Traffic | No change (return to normal — use this to disable a previously set response) |
| Exit-Only | Stop new entries; allow bank to empty |
| Entrance-Only | Stop exits; contain existing occupants |
| Lock-All | Immediately lock all doors |
| Evacuation | Unlock all doors immediately |

The most common security configuration is: Weapon detected → Lock-All; Masked face → Exit-Only.

### 14.5 Inference Display

When inference is active and a detection occurs above 50% confidence:
- The captured JPEG frame from the ESP32-CAM is displayed
- Coloured bounding boxes are overlaid showing what was detected and where
- Labels show the detection class and confidence percentage
- The timing panel shows DSP processing time and classification time in milliseconds

When no threat is detected, the display shows "No Threatful Situations Detected."

If AI System is turned off, or all detector toggles are off, the display shows a disabled placeholder.

### 14.6 Configuration Persistence

The AI configuration is saved to `localStorage` in the browser. When you return to the AI Control page, it restores from localStorage immediately, then fetches the live ESP32 state to confirm. A 5-second guard prevents the ESP32's polling response from overwriting a toggle you just changed.

---

## 15. Operation Modes Reference

| Mode | UART command sent | Entry (D1, D2) | Exit (D3, D4) | Use case |
|------|-------------------|----------------|----------------|----------|
| **Normal-Traffic** | `SET_MODE_NORMAL` | Interlocked sequence | Interlocked sequence | Standard operating hours |
| **Evacuation** | `SET_MODE_EVAC` | Both unlocked | Both unlocked | Emergency — clear the building immediately |
| **Exit-Only** | `SET_MODE_CLOSED` | Both locked | Interlocked sequence | Capacity limit reached; end of day clearing |
| **Entrance-Only** | `SET_MODE_STAFF` | Interlocked sequence | Both locked | Staff arrival before opening; restrict outflow |
| **Lock-All** | `SET_MODE_LOCK` | Both locked | Both locked | Security incident; AI weapon detection |

### Interlocked Sequence (Normal Booth Operation)

1. Outer door unlocked (green LED) — person may enter
2. Person opens outer door → outer door goes red (locked)
3. Person closes outer door → PIR sensor must detect them in vestibule
4. PIR confirms presence → inner door unlocks (green LED)
5. Person opens inner door and passes through
6. Person closes inner door → inner door goes red (locked)
7. Outer door returns to green (unlocked) for the next person

If the PIR does not detect anyone within 7 seconds of the outer door closing, the booth resets to step 1. This handles the case where someone opened the door and walked away.

### Automatic Mode Changes

The system can switch modes automatically without operator input in two cases:

1. **Capacity limit reached:** When `clientsInside >= maxClientsInside`, switches to Exit-Only. Logged as `"by 'Automatically'"`.
2. **AI threat detected:** When inference confidence > 50% and AI Door Control is ON, applies the configured response mode. Logged as `"by 'Automatically'"`.

---

## 16. Fault Types Reference

| Fault code (UART) | Name | Trigger condition | Auto-clear condition |
|-------------------|------|-------------------|---------------------|
| `FAULT_LOCK_x` | Lock fault | Door x opened while lock LED was red | Door x closes → `FAULT_LOCK_x_CLEAR` |
| `FAULT_MC_x` | MC (stuck open) fault | Door x open for 5s / 15s / 35s / 65s / 125s | Door x closes → `FAULT_MC_x_CLEAR` |
| `FAULT_PIR_x` | PIR sensor fault | 5 consecutive vestibule timeouts without PIR detection | PIR successfully detects a person → `FAULT_PIR_x_CLEAR` |

**Door numbering:**
- Fault suffix `_1` = ENT.D1 (outer entry door, Booth 1)
- Fault suffix `_2` = ENT.D2 (inner entry door, Booth 1)
- Fault suffix `_3` = EXT.D3 (outer exit door, Booth 2)
- Fault suffix `_4` = EXT.D4 (inner exit door, Booth 2)
- PIR suffix `_1` = Booth 1 (entry vestibule), `_2` = Booth 2 (exit vestibule)

---

## 17. Log Files Reference

Four separate log channels are maintained, each stored as a LittleFS file on the ESP32. Each entry is prefixed with a timestamp.

| Log | File | Contains |
|-----|------|----------|
| Monitoring | `/monitoring.log` | All door open/close events, occupancy updates, PIR changes |
| Control | `/control.log` | Mode changes, door overrides, capacity limit sets — all with operator names |
| Faults | `/faults.log` | All fault events, clears, acknowledgements, and manual clears |
| AI | `/ai.log` | Each inference result: label, confidence %, timing in ms, automated actions |

**Log capacity:** 100 entries per file. When full, the oldest entry is dropped to make room for the newest (FIFO circular buffer).

**Log access:**
- Structured JSON: `GET /api/logs.json` (all logs combined) or `GET /log?type=monitoring`
- Plain text (for printing): `GET /logs/monitoring.txt`, `/logs/control.txt`, `/logs/faults.txt`, `/logs/ai.txt`

**Log persistence:** Log files survive ESP32 reboots and firmware reflashes. They are erased only if the LittleFS partition is reformatted (e.g. by uploading a new filesystem image).

---

## 18. Troubleshooting

### Door LEDs do not change when a mode is selected from the dashboard

1. Check that the UART wire from ESP32 GPIO15 → ATmega DIP pin 2 (D0/RX) is connected and making good contact. This is the ESP32→ATmega direction — the most commonly missed wire.
2. Check that both devices share a common GND.
3. Open the Serial Monitor on the ESP32 at 115200 baud. When you click a mode button, you should see `[ACTION] MODE_CHANGE: Exit-Only -> SET_MODE_CLOSED`. If you see this but the ATmega does not respond, the UART wire is the problem.
4. Confirm the ATmega is running (its LEDs should be in some state). If all ATmega outputs are off, it may not have booted — check its 5V supply and that the crystal oscillator is connected.

### Door events do not appear on the Monitor page

1. Check the UART wire from ATmega DIP pin 3 (D1/TX) → ESP32 GPIO13. This is the ATmega→ESP32 direction.
2. Open the Serial Monitor. You should see lines like `ATmega: DOOR_1_OPENED` when a door moves. If not, this wire is suspect.
3. Confirm the ATmega baud rate is 9600 (`Serial.begin(9600)` in `setup()`).

### Dashboard does not load in the browser

1. Confirm the ESP32 has connected to WiFi — check Serial Monitor for `IP Address: 192.168.x.x`.
2. Ensure your computer is on the same WiFi network as the ESP32.
3. Try `http://<IP>` not `https://` — the server runs plain HTTP only.
4. If the IP address has changed, check your router's DHCP table. Set up a static DHCP reservation to prevent this.
5. If files are missing (blank page, 404 errors), the LittleFS filesystem may not have been uploaded — see [Section 7](#7-uploading-the-web-dashboard-to-esp32).

### Monitor page stats show `--` and never update

1. The ESP32 may not be receiving STATS packets from the ATmega. The ATmega sends `STATS:ENTRIES=n;EXITS=n;INSIDE=n` each time an inner door cycle completes (Door 2 or Door 4 closes). No door activity = no stats update.
2. Use the refresh button (↓) on the monitor page to manually re-poll `/api/status.json`.
3. Check that the WiFi connection is stable — intermittent WiFi will drop SSE events.

### PIR does not trigger the second door

1. Physically verify the PIR sensor output goes HIGH when a person stands in the vestibule. Use a multimeter or connect a test LED.
2. Confirm the PIR is wired to the correct ATmega pin (D10 for Booth 1, D11 for Booth 2).
3. Check the PIR's sensitivity and hold-time trimpots. Some PIR modules have very short hold times or very narrow detection angles.
4. Observe the Monitor page booth indicators — if the PIR fires, `BOOTH_1_OCCUPIED` will appear and the booth indicator lights up. If it never lights up, the PIR signal is not reaching the ATmega.

### FAULT_PIR_x appears after 5 booth entries

The PIR sensor has failed to detect a person 5 times in a row during normal booth operation. Possible causes:
- PIR sensor wiring disconnected or broken
- PIR sensor aimed incorrectly for the vestibule position
- PIR sensitivity set too low
- PIR sensor has failed

Check the physical sensor, re-aim or adjust sensitivity, then clear the fault from the Faults page. If the PIR subsequently detects correctly, the fault will auto-clear in the log.

### Camera shows no image or black screen

1. The camera initialisation is logged at startup — check Serial Monitor for `Camera initialized successfully` vs `Camera initialization failed!`.
2. Camera module requires 500mA+ at 3.3V. Insufficient power is the most common cause of init failure on ESP32-CAM boards.
3. If the camera initialised but the stream shows black, try adjusting the JPEG quality setting in the camera config (`jpeg_quality`: lower number = higher quality, more memory).

### AI inference runs but no bounding boxes appear

1. Open the AI Control page and check that both AI System and at least one detector toggle are ON.
2. Confidence threshold is fixed at 50%. If the model is returning scores below this, detections will be suppressed. Check the AI log for inference results.
3. Ensure the Edge Impulse model was compiled for object detection (`EI_CLASSIFIER_OBJECT_DETECTION == 1`). If the model is a classifier (not object detection), it returns class probabilities without bounding boxes.

### Login says "Invalid username or password"

1. Usernames are case-sensitive.
2. The hardcoded accounts are `brezhnevndlovu02@gmail.com` (password `#31May2026`) and `Shyleen` (password `supervisor`).
3. Dynamic accounts (from `create_account.html`) are stored in `localStorage` — they only exist in the browser they were created in. If you're using a different device or browser, those accounts won't be available.

---

## 19. API Quick Reference

All endpoints are relative to `http://<ESP32-IP>`. All POST bodies are JSON (`Content-Type: application/json`).

### GET Endpoints

| Endpoint | Response | Description |
|----------|----------|-------------|
| `/` | HTML | Login page (index.html) |
| `/api/status.json` | JSON | Full system status: doors, counters, booths |
| `/api/mode.json` | JSON | Current operation mode and label |
| `/api/faults.json` | JSON | All fault states (locks, MC, PIR) |
| `/api/ai-config` | JSON | Current AI enable/disable state |
| `/api/inference` | JSON | Last inference result (metadata only) |
| `/log?type=monitoring` | JSON | Monitoring log entries (up to 100) |
| `/log?type=control` | JSON | Control log entries |
| `/log?type=faults` | JSON | Fault log entries |
| `/log?type=ai` | JSON | AI inference log entries |
| `/logs/monitoring.txt` | Plain text | Monitoring log as raw text |
| `/logs/control.txt` | Plain text | Control log as raw text |
| `/logs/faults.txt` | Plain text | Faults log as raw text |
| `/logs/ai.txt` | Plain text | AI log as raw text |
| `/stream` | JPEG | Single camera frame (call repeatedly for video) |
| `/capture` | JPEG | Last inference-captured frame |
| `/events` | SSE stream | Real-time server push (door, booth, status, fault, mode, inference events) |

### POST /action — Command Payloads

**Change operation mode:**
```json
{ "action": "MODE_CHANGE", "mode": "Exit-Only", "user": "Brezhnevndlovu" }
```
Valid mode values: `Normal-Traffic`, `Evacuation`, `Exit-Only`, `Entrance-Only`, `Lock-All`

**Toggle a door:**
```json
{ "action": "TOGGLE", "door": "1", "state": "unlock-once", "user": "Shyleen" }
```
Valid state values: `unlock-once`, `unlocked`, `locked`, `auto`

**Set capacity limit:**
```json
{ "action": "SET_MAX_INSIDE", "value": "50", "user": "Brezhnevndlovu" }
```

**AI system toggle:**
```json
{ "action": "AI_SYSTEM", "state": "ON", "user": "Brezhnevndlovu" }
{ "action": "AI_THREAT", "state": "ON", "user": "Brezhnevndlovu" }
{ "action": "AI_DOOR_CONTROL", "state": "OFF", "user": "Brezhnevndlovu" }
```

**Set AI response mode:**
```json
{ "action": "AI_MODE", "type": "weapon", "mode": "Lock-All", "user": "Brezhnevndlovu" }
{ "action": "AI_MODE", "type": "masked", "mode": "Exit-Only", "user": "Brezhnevndlovu" }
```

**Clear all faults:**
```json
{ "action": "CLEAR_FAULTS", "user": "Brezhnevndlovu" }
```

**Trigger manual inference:**
`POST /api/inference-trigger` with any body

### SSE Event Types (`/events`)

| Event name | Payload fields | Consumed by |
|------------|----------------|-------------|
| `status` | `uptime`, `entries`, `exits`, `inside`, `max_inside`, `doors[]`, `booths[]` | Monitor, Control |
| `door` | `doorId`, `state` (opened/closed), `locked`, `timestamp` | Monitor |
| `booth` | `booth` (1 or 2), `occupied` (true/false) | Monitor |
| `mode` | `mode`, `label`, `timestamp` | Control |
| `fault` | `faults.locks[]`, `faults.magneticContacts[]`, `faults.pirSensors[]` | Faults |
| `control` | `type` ("auto"), `doorId` | Control |
| `inference` | `top_label`, `confidence`, `bounding_boxes[]`, `imageB64`, `dsp_time`, `classification_time` | AI Control |

---

## 20. Hardware Pin Reference

### ATmega328P (DIP-28) Complete Pin Map

| DIP Pin | Arduino | Function in this system |
|---------|---------|------------------------|
| 1  | RESET | Reset (100nF cap to FTDI DTR for programming) |
| 2  | D0/RX | UART RX — receives commands from ESP32 GPIO15 |
| 3  | D1/TX | UART TX — sends events to ESP32 GPIO13 |
| 4  | D2 | Door 4 RED LED output (EXT.D4 locked indicator) |
| 5  | D3 | Door 4 GREEN LED output (EXT.D4 unlocked indicator) |
| 6  | D4 | Door 3 RED LED output (EXT.D3 locked indicator) |
| 7  | VCC | +5V supply |
| 8  | GND | Ground |
| 9  | XTAL1 | 16MHz crystal |
| 10 | XTAL2 | 16MHz crystal |
| 11 | D5 | (unused) |
| 12 | D6 | Door 4 mag contact input (EXT.D4) |
| 13 | D7 | Door 3 mag contact input (EXT.D3) |
| 14 | D8 | Door 3 GREEN LED output (EXT.D3 unlocked indicator) |
| 15 | D9 | Door 2 GREEN LED output (ENT.D2 unlocked indicator) |
| 16 | D10 | PIR Booth 1 input (entry vestibule) |
| 17 | D11 | PIR Booth 2 input (exit vestibule) |
| 18 | D12 | (unused) |
| 19 | D13 | Door 2 mag contact input (ENT.D2) |
| 20 | AVCC | +5V (analog supply — tie to VCC with 100nF to GND) |
| 21 | AREF | Analog reference (tie to AVCC or leave floating) |
| 22 | GND | Analog ground |
| 23 | A0  | Door 1 GREEN LED output (ENT.D1 unlocked indicator) |
| 24 | A1  | Door 2 RED LED output (ENT.D2 locked indicator) |
| 25 | A2  | Mode selector input (optional physical switch) |
| 26 | A3  | Door 1 mag contact input (ENT.D1) |
| 27 | A4  | Door 1 RED LED output (ENT.D1 locked indicator) |
| 28 | A5  | (unused) |

### ESP32-CAM (AI Thinker) Pins Used

| GPIO | Function |
|------|----------|
| GPIO13 | UART1 RX — receives from ATmega D1/TX |
| GPIO15 | UART1 TX — sends to ATmega D0/RX (also SD card CMD — do not use SD card) |
| GPIO0  | Boot mode select (GND = programming mode; float = normal boot) |
| GPIO1  | USB serial TX (U0TXD) — Arduino Serial monitor |
| GPIO3  | USB serial RX (U0RXD) — Arduino Serial programming |
| GPIO32 | Camera PWDN |
| GPIO0  | Camera XCLK |
| GPIO26 | Camera SIOD (I2C data) |
| GPIO27 | Camera SIOC (I2C clock) |
| GPIO25 | Camera VSYNC |
| GPIO23 | Camera HREF |
| GPIO22 | Camera PCLK |
| GPIO35,34,39,36,21,19,18,5 | Camera data bus (Y9–Y2) |

---

*System Guide — Automated Bank Entrance Security System*
*Project by: Brezhnevndlovu*
*Supervisor: S. Nhema, NUST*
*Last updated: June 2026*
