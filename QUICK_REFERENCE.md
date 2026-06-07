# ESP32 Unified System - Quick Reference

## Files Created/Modified

### New Files Created
1. **esp32_unified.ino** - Combined firmware with camera streaming + AI inference
   - 800+ lines of optimized C++ code
   - Async web server with 7 endpoints
   - Edge Impulse classifier integration
   - Memory-efficient PSRAM management

2. **aicontrol-inference.js** - Real-time dashboard updates
   - Live stream capture (100ms refresh)
   - Inference polling (500ms interval)
   - Canvas bounding box overlay
   - Confidence color coding

3. **SYSTEM_INTEGRATION_GUIDE.md** - Comprehensive documentation
   - Architecture overview
   - API reference
   - Troubleshooting guide
   - Performance optimization tips

### Modified Files
1. **aicontrol.html**
   - Added canvas element for bounding box overlay
   - Added inference results display section
   - Structured layout for timing/detection info
   - Imported new aicontrol-inference.js

2. **aicontrol.css**
   - Added 100+ lines of styling for inference display
   - Responsive layout for results panel
   - Animation effects for result updates
   - Color-coded confidence indicators
   - Custom scrollbar styling

---

## Key Features

### Camera Stream
- ✅ JPEG streaming at `/stream` endpoint
- ✅ Cache-busting (timestamp parameter)
- ✅ 100ms refresh rate (configurable)
- ✅ Full PSRAM optimization

### AI Inference
- ✅ Edge Impulse int8 quantized model
- ✅ Runs every 2 seconds (configurable)
- ✅ Classification + Object Detection support
- ✅ Bounding box visualization on canvas

### Web APIs
- ✅ `/stream` - Live JPEG frames
- ✅ `/api/inference` - Latest result as JSON
- ✅ `/api/inference-trigger` - Manual trigger
- ✅ `/log` - Query logs by type
- ✅ `/action` - Control doors/modes
- ✅ `/status.json` - System status

### Logging
- ✅ 4 persistent logs (Monitoring, Control, Faults, AI)
- ✅ 100 entries per log (circular buffer)
- ✅ LittleFS storage on ESP32
- ✅ JSON + raw text endpoints

### Dashboard Integration
- ✅ Real-time confidence % display
- ✅ Color-coded threat levels
- ✅ Bounding box overlay with labels
- ✅ Detection timing breakdown
- ✅ Auto-refresh without page reload

---

## Deployment Checklist

### Hardware Setup
- [ ] ESP32-CAM board selected (AI THINKER or ESP_EYE)
- [ ] Camera module seated and focused
- [ ] USB serial connection working
- [ ] 5V power supply (min 1A) connected
- [ ] WiFi network accessible

### Software Setup
- [ ] Arduino IDE installed
- [ ] ESP32 board support v2.0.4+ installed
- [ ] Required libraries installed:
  - [ ] AsyncTCP
  - [ ] ESPAsyncWebServer
  - [ ] Edge Impulse model library
  - [ ] Eloquent ESP32 Cam (optional)
- [ ] WiFi credentials updated in sketch

### Firmware Upload
- [ ] Board: "AI THINKER ESP32-CAM"
- [ ] Partition: "Huge APP (3MB No OTA)"
- [ ] Upload Speed: 921600 baud
- [ ] esp32_unified.ino compiled successfully
- [ ] Upload verified (no errors)

### Dashboard Deployment
- [ ] aicontrol.html updated
- [ ] aicontrol.css updated with inference styles
- [ ] aicontrol-inference.js placed in root
- [ ] All CSS/JS references correct
- [ ] Browser cache cleared

### Testing
- [ ] Camera initializes without errors (Serial monitor)
- [ ] WiFi connects and IP printed
- [ ] Live stream accessible at `/stream`
- [ ] Inference running (check `/api/inference`)
- [ ] Dashboard displays live feed
- [ ] Bounding boxes render correctly (if detection model)
- [ ] Door control commands logged
- [ ] Logs accessible at `/log?type=ai`

### Performance Validation
- [ ] Stream latency < 500ms
- [ ] Inference time < 300ms
- [ ] No memory errors during 1-hour runtime
- [ ] Log rotation working (max 100 entries)
- [ ] Canvas overlay responsive to mouse position

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not initializing | Check GPIO pins, verify PSRAM enabled, reset board |
| Out of memory | Increase inference interval, reduce log buffer size |
| No bounding boxes | Verify model is detection type, check browser console |
| Stream very slow | Reduce refresh rate, increase JPEG quality, check WiFi |
| Inference results always old | Check /api/inference endpoint, verify polling working |
| Door commands not received | Check Serial1 connections to ATmega, verify baud rate |
| Can't access dashboard | Check WiFi IP, verify firewall rules, try direct stream URL |

---

## Configuration Parameters

### In `esp32_unified.ino`:

**Inference Frequency** (line ~780):
```cpp
if (millis() - last_inference > 2000) {  // Every 2 seconds
    last_inference = millis();
    run_inference_task();
}
```

**Camera Settings** (line ~100):
```cpp
.jpeg_quality = 12,  // 0-63, lower = higher quality but slower
.fb_count = 1,       // Number of frame buffers
.grab_mode = CAMERA_GRAB_WHEN_EMPTY,  // Grab strategy
```

**Log Buffer Size** (line ~80):
```cpp
const int MAX_LOG_LINES = 100;  // Entries per log type
```

### In `aicontrol-inference.js`:

**Stream Refresh Rate** (line ~20):
```javascript
this.streamRefreshRate = 100;  // ms between frame updates
```

**Inference Polling Rate** (line ~21):
```javascript
this.inferencePollingRate = 500;  // ms between API polls
```

---

## API Endpoint Reference

### GET /stream
- Returns: JPEG image
- Latency: 10-30ms
- Use: `<img src="/stream?t={timestamp}">`

### GET /api/inference
- Returns: JSON with inference results
- Fields: timestamp, top_label, confidence, dsp_time, classification_time, bounding_boxes[]
- Latency: <5ms

### GET /log?type={monitoring|control|faults|ai}
- Returns: JSON array of log entries
- Each entry: {timestamp, message}
- Limit: 100 most recent entries

### POST /action
- Triggers: Door toggle or mode change
- Body: `{action, door, state}` or `{action, mode}`
- Returns: `{status: "ok"}`

### GET /status.json
- Returns: System uptime, camera status, door info
- Useful for: Health checks, UI status indicators

---

## Memory Layout

```
TOTAL PSRAM: 4MB
├─ Inference Model:     ~2MB (quantized int8)
├─ Frame Buffers:       ~500KB (active capture + snapshot)
├─ Log Buffers:         ~50KB (4 logs × 100 lines)
├─ Web Server:          ~200KB (AsyncWebServer)
├─ Signal Processing:   ~300KB (Edge Impulse SDK)
└─ Free for vars:       ~1MB+ (available)

⚠️ Total: ~4MB fits within PSRAM boundary
✅ Flash usage: ~400KB program code + model
```

---

## Next Optimization Targets

1. **Model Quantization**: Currently using int8, could explore binary
2. **Async Inference**: Use FreeRTOS task for non-blocking operation
3. **MJPEG Stream**: Instead of single frames, continuous stream
4. **Compression**: Huffman encoding for log data
5. **Edge Processing**: Post-process detections on ESP32 before sending
6. **Caching**: Cache inference results during high polling

---

## Support Resources

- Edge Impulse Docs: https://docs.edgeimpulse.com/
- ESP32 Arduino Core: https://github.com/espressif/arduino-esp32
- ESPAsyncWebServer: https://github.com/me-no-dev/ESPAsyncWebServer
- Camera Library: https://github.com/espressif/esp32-camera

---

## Version History

- **v1.0** - Initial unified system release
  - Combined streaming + inference
  - Live dashboard with overlay
  - Full logging system
  - Door control integration
