# ESP32-CAM Unified System - Implementation Guide
## Live Streaming + AI Inference Integration

### Overview
This unified system combines:
- **Async WebServer** (from esp32.ino) - Non-blocking web service
- **Camera Management** (from Classifier.ino) - Efficient frame capture and processing
- **Edge Impulse Classifier** - Real-time AI inference with int8 quantization (EON compiler)
- **Persistent Logging** - Monitoring, control, faults, and AI events
- **Live Dashboard** - Real-time camera stream + inference overlay

---

## System Architecture

### ESP32 Firmware (`esp32_unified.ino`)

#### Memory Management
```
┌─────────────────────────────────────┐
│     ESP32-CAM PSRAM (4MB)           │
├─────────────────────────────────────┤
│ Camera Frame Buffer (320×240×3)     │
│ Snapshot Buffer (76.8KB)            │
│ JPEG Buffer (variable)              │
│ Inference Model (quantized int8)    │
│ Log Buffers (4 × 100 lines)         │
└─────────────────────────────────────┘
```

**Efficient Allocation:**
- Single snapshot buffer for RGB conversion
- Reusable frame buffer from camera
- Inference model runs in FLASH with PSRAM for activation tensors
- Log rotation: Keep latest 100 entries per log type

#### Key Components

1. **Camera Initialization**
   - OV2640 or OV3660 sensor support
   - JPEG format for streaming efficiency
   - Auto quality adjustment (quality=12)
   - PSRAM-based frame buffering

2. **Inference Engine**
   - Edge Impulse classifier runs every 2 seconds
   - Input: 320×240 RGB image
   - Output: Classification scores or bounding boxes
   - Processing time tracked (DSP + Classification + Anomaly)

3. **Web Server Endpoints**

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/stream` | GET | Live camera frame | JPEG image |
| `/api/inference` | GET | Latest inference results | JSON |
| `/api/inference-trigger` | POST | Manually trigger inference | JSON status |
| `/logs/{type}.txt` | GET | Raw log file | Plain text |
| `/log?type={type}` | GET | Structured log data | JSON array |
| `/action` | POST | Control actions (door/mode) | JSON status |
| `/status.json` | GET | System status | JSON |

4. **Logging System**
   ```
   LOG_MONITORING  → /monitoring.log  (Door events, sensor data)
   LOG_CONTROL     → /control.log     (Manual commands, door commands)
   LOG_FAULTS      → /faults.log      (System errors, failures)
   LOG_AI          → /ai.log          (Inference results, detections)
   ```

---

### Dashboard Frontend (`aicontrol.html` + `aicontrol-inference.js`)

#### Live Stream Architecture
```javascript
// Frame update loop (100ms interval)
/stream?t={timestamp}  // Cache-busting parameter
    ↓
<img id="esp32Feed">   // Displays JPEG frame
    ↓
Canvas overlay        // Draws bounding boxes if available
```

#### Inference Display Flow
```
/api/inference (500ms polling)
    ↓
Parse JSON result
    ↓
├─ Classification Mode:
│  └─ Display top label + confidence %
│     └─ Color code: Green (>75%), Orange (50-75%), Red (<50%)
│
└─ Object Detection Mode:
   ├─ Display bounding boxes on canvas
   ├─ Draw labels with confidence %
   └─ List detections with coordinates
```

#### Inference Result JSON Structure
```json
{
  "timestamp": 1624521600000,
  "top_label": "normal_person",
  "confidence": 0.95,
  "dsp_time": 45,
  "classification_time": 120,
  "anomaly_time": 0,
  "bounding_boxes": [
    {
      "label": "person",
      "confidence": 0.92,
      "x": 100,
      "y": 120,
      "width": 180,
      "height": 200
    }
  ]
}
```

---

## Installation & Deployment

### 1. Upload Firmware to ESP32
```bash
# Using Arduino IDE:
1. Install ESP32 board support (v2.0.4+)
2. Install required libraries:
   - Arduino AsyncTCP
   - ESPAsyncWebServer
   - Eloquent ESP32 Cam (for camera utilities)
   - Edge Impulse library (Threat_Detector_inferencing)
   
3. Open esp32_unified.ino
4. Select board: "AI THINKER ESP32-CAM"
5. Set partition scheme: "Huge APP (3MB No OTA)"
6. Upload to ESP32

# Update WiFi credentials in sketch:
const char* ssid = "your_ssid";
const char* password = "your_password";
```

### 2. Deploy Web Files
```bash
# Convert to LittleFS format and upload:
1. Files to include on LittleFS:
   - monitor.html (if serving as default)
   - Any CSS/JS files needed on device

2. Using Arduino IDE:
   - Sketch → Show Sketch Folder
   - Create data/ subdirectory
   - Place files in data/
   - Tools → ESP32 Sketch Data Upload
```

### 3. Configure Network
- ESP32 will broadcast its IP address via Serial (115200 baud)
- Example: `IP Address: 192.168.1.100`
- Access dashboard at: `http://192.168.1.100/` (if monitor.html uploaded)

---

## API Usage Examples

### Get Current Inference Result
```bash
curl http://192.168.1.100/api/inference

# Response:
{
  "timestamp": 1624521600000,
  "top_label": "threat_detected",
  "confidence": 0.87,
  ...
}
```

### Trigger Manual Inference
```bash
curl -X POST http://192.168.1.100/api/inference-trigger
```

### Get Live Frame
```bash
# Download current frame:
curl http://192.168.1.100/stream > frame.jpg

# Or embed in HTML:
<img src="http://192.168.1.100/stream">
```

### Query Logs
```bash
# Get JSON-formatted logs:
curl "http://192.168.1.100/log?type=ai"

# Response:
{
  "logs": [
    {
      "timestamp": "24/04/26---12:30:45",
      "message": "Inference: threat_detected (87.3%) - DSP: 45ms, Class: 120ms"
    }
  ]
}
```

### Send Door Control Command
```bash
curl -X POST http://192.168.1.100/action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "TOGGLE",
    "door": "1",
    "state": "unlocked"
  }'
```

---

## Performance Optimization

### Memory Usage
- **Snapshot Buffer**: 76.8 KB (static allocation)
- **Log Buffers**: ~20 KB (10 lines × 4 logs × ~500 chars)
- **Model Inference**: Runs in quantized int8 for 90% size reduction
- **Free PSRAM for WebServer**: ~3+ MB

### Processing Timeline
```
Frame Capture:     ~10-20ms
RGB Conversion:    ~15-25ms
Classifier (DSP):  40-80ms    (Feature extraction)
Classification:    100-200ms  (Inference)
Total Latency:     ~150-300ms per inference cycle
```

### Optimization Tips
1. **Reduce Inference Frequency** - Change 2000ms to higher value in loop()
   ```cpp
   if (millis() - last_inference > 5000) {  // Run every 5 seconds
   ```

2. **Adjust JPEG Quality** - Trade quality for speed
   ```cpp
   .jpeg_quality = 15,  // Lower = higher quality, slower
   .jpeg_quality = 8,   // Higher compression for faster stream
   ```

3. **Batch API Requests** - Reduce polling on dashboard
   ```javascript
   this.inferencePollingRate = 1000;  // Poll every 1 second instead of 500ms
   ```

---

## Troubleshooting

### Issue: Camera Not Initializing
```
Error: Camera init failed with error 0x...

Solution:
1. Check GPIO pin configuration matches hardware
2. Verify PSRAM is enabled (Tools → PSRAM: Enabled)
3. Check power supply (min 1A at 5V)
4. Reset ESP32 by holding RST button for 2 seconds
```

### Issue: Out of Memory During Inference
```
Error: Failed to allocate snapshot buffer

Solution:
1. Increase inference interval (currently 2000ms)
2. Reduce log buffer size (change MAX_LOG_LINES = 50)
3. Check for memory leaks - verify all malloc() have corresponding free()
```

### Issue: Bounding Boxes Not Drawing
```
Dashboard shows inference but no boxes

Solution:
1. Verify model outputs object detection: check EI_CLASSIFIER_OBJECT_DETECTION
2. Canvas must be sized to match image dimensions - check resizeCanvas()
3. Check browser console for JavaScript errors (F12)
4. Ensure /api/inference returns bounding_boxes array
```

### Issue: Stream Lagging or Freezing
```
Live feed updates slowly

Solution:
1. Reduce streamRefreshRate (currently 100ms)
2. Check WiFi signal strength
3. Reduce JPEG quality (.jpeg_quality = 15)
4. Check network bandwidth (other devices using WiFi)
5. Ensure inference polling doesn't block stream updates
```

---

## Model-Specific Configuration

### For Classification Models
- Output is automatically handled by else branch in code
- Confidence displayed as percentage
- Useful for: threat types, person vs object, masked/unmasked

### For Object Detection Models
- Requires: `EI_CLASSIFIER_OBJECT_DETECTION == 1` in model
- Outputs bounding boxes with labels and confidence
- Canvas overlay draws rectangles with labels
- Useful for: person detection, weapon detection, anomalies

### Switching Models
1. Generate new model from Edge Impulse
2. Update library: `#include <Your_Model_inferencing.h>`
3. Update input size if different:
   ```cpp
   #define EI_CAMERA_RAW_FRAME_BUFFER_COLS  320  // Update to model input
   #define EI_CAMERA_RAW_FRAME_BUFFER_ROWS  240
   ```

---

## Communication Protocol (ATmega328p)

### Serial1 Configuration
- **Baud**: 9600
- **Pins**: RX=GPIO13, TX=GPIO15
- **Format**: `DOOR_{n}_{EVENT}\n`

### Commands to ATmega
```
DOOR_1_LOCKED       → Lock door 1
DOOR_1_UNLOCKED     → Unlock door 1
DOOR_1_AUTO         → Auto control door 1
SET_MODE_EVAC       → Evacuation mode
SET_MODE_NORMAL     → Normal traffic mode
SET_MODE_CLOSED     → Exit only mode
SET_MODE_STAFF      → Entrance only mode
SET_MODE_LOCK       → Lockdown mode
```

### Events from ATmega
```
DOOR_1_OPENED
DOOR_1_CLOSED
DOOR_1_LOCKED
DOOR_1_SENSOR_ERROR
```

---

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser/Dashboard                         │
│  - Display live stream from /stream                         │
│  - Poll /api/inference every 500ms                          │
│  - Draw bounding boxes on canvas                            │
│  - Display AI control toggles                               │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP/JSON
             ▼
┌─────────────────────────────────────────────────────────────┐
│              ESP32-CAM Web Server (Async)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  GET /stream           → JPEG Frame                 │   │
│  │  GET /api/inference    → JSON (Latest Result)       │   │
│  │  POST /api/inference-trigger → Trigger Inference    │   │
│  │  GET/POST /log         → Logging API                │   │
│  │  POST /action          → Door/Mode Control          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────────────┐
    │                         │
    ▼                         ▼
┌──────────────┐      ┌──────────────────┐
│   Camera     │      │  Edge Impulse    │
│ OV2640/3660  │      │  Classifier      │
│              │      │  (int8 quantized)│
│ Streaming    │      │                  │
│ 320×240 JPEG │      │  Every 2 sec     │
└──────────────┘      └────────┬─────────┘
                               │
                        Inference Result
                        + Bounding Boxes
                        
    ┌────────────────────────┐
    │   Logging System       │
    │ ┌──────────────────┐   │
    │ │ /monitoring.log  │   │
    │ │ /control.log     │   │
    │ │ /faults.log      │   │
    │ │ /ai.log          │   │
    │ └──────────────────┘   │
    │ (LittleFS - Persistent)│
    └────────────────────────┘
             │
    ┌────────▼────────┐
    │     Serial1      │
    │   ATmega328p     │
    │   (9600 baud)    │
    │  Door Control    │
    └──────────────────┘
```

---

## Next Steps

1. **Calibrate Model** - Fine-tune for your specific use case (lighting, angles, threats)
2. **Set Alert Thresholds** - Define confidence levels for triggering actions
3. **Test Integration** - Verify door control commands reach ATmega
4. **Monitor Performance** - Use AI logs to track inference accuracy
5. **Optimize Parameters** - Adjust timing, quality, and polling rates

---

## Version Info
- **ESP32 Arduino Core**: 2.0.4+
- **Model**: Edge Impulse Threat Detector (Quantized int8, EON Compiler)
- **WebServer**: ESPAsyncWebServer 1.2.3+
- **Framework**: LittleFS for persistent storage
- **Dashboard**: HTML5 Canvas for real-time overlay
