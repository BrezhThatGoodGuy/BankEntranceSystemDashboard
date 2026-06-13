/*
====================================================================
ESP32-CAM UNIFIED SYSTEM
Async Web Server + Live Camera Stream + AI Inference (Edge Impulse)
Optimized for Memory & Performance - Int8 Quantized Model (EON Compiler)
====================================================================
*/

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>
#include <LittleFS.h>
#include <time.h>
#include <eloquent_esp32cam.h>
#include <Threat_Detector_inferencing.h>
#include "edge-impulse-sdk/dsp/image/image.hpp"
#include "esp_camera.h"


using namespace eloq;

// ===== WiFi Configuration =====
const char* ssid = "@verydemure";
const char* password = "44936051";

// ===== NTP Configuration =====
#define NTP_SERVER_1     "pool.ntp.org"
#define NTP_SERVER_2     "time.google.com"
#define GMT_OFFSET_SEC   (2 * 3600)   // UTC+2 — Central Africa Time (Zimbabwe, no DST)
#define DST_OFFSET_SEC   0

// ===== UART Configuration (ATmega328p) =====
#define ATMEGA_RX_PIN 13
#define ATMEGA_TX_PIN 15
#define ATMEGA_BAUD   9600

// ===== Camera Configuration =====
#define CAMERA_MODEL_AI_THINKER
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define EI_CAMERA_RAW_FRAME_BUFFER_COLS           320
#define EI_CAMERA_RAW_FRAME_BUFFER_ROWS           240
#define EI_CAMERA_FRAME_BYTE_SIZE                 3

// ===== Web Server Configuration =====l
AsyncWebServer server(80);
AsyncEventSource events("/events");

// ===== Logging System =====
enum LogType {
    LOG_MONITORING,
    LOG_CONTROL,
    LOG_FAULTS,
    LOG_AI,
    LOG_TYPE_COUNT
};

const char* logFileNames[LOG_TYPE_COUNT] = {
    "/monitoring.log",
    "/control.log",
    "/faults.log",
    "/ai.log"
};

const char* doorNames[4] = {"Door 1", "Door 2", "Door 3", "Door 4"};
const int MAX_LOG_LINES = 100;
String logBuffers[LOG_TYPE_COUNT][MAX_LOG_LINES];
int logCounts[LOG_TYPE_COUNT] = {0, 0, 0, 0};

// ===== Live Door State =====
String doorContactStates[4] = {"closed", "closed", "closed", "closed"};
bool doorLockStates[4] = {true, true, true, true};
unsigned long lastDoorEventId = 0;

// ===== Camera & Inference State =====
bool ai_system_enabled = false;    // Background inference master switch
bool ai_threat_detection = false;  // Detection-specific switch (Masked/Weapon)
bool ai_door_control_enabled = false;
String current_operation_mode = "normal";
String current_operation_label = "Normal-Traffic";
String ai_weapon_operation_mode = "lock";
String ai_masked_operation_mode = "lock";


// ===== Camera & Inference State =====
static bool debug_nn = false;
static bool is_camera_initialised = false;
uint8_t *snapshot_buf = nullptr;
uint8_t *jpeg_buf = nullptr;
size_t jpeg_buf_len = 0;
camera_fb_t *pending_inference_fb = nullptr;
camera_fb_t *stored_capture_fb = nullptr;

const float CAPTURE_CONFIDENCE_THRESHOLD = 0.70f;

// ===== Inference Results Storage =====
struct InferenceResult {
    unsigned long timestamp;
    float inference_time_dsp;
    float inference_time_classification;
    float inference_time_anomaly;
    float max_confidence;
    const char* top_label;
    
    // For object detection
    uint32_t bbox_count;
    struct {
        const char* label;
        float confidence;
        uint32_t x, y, width, height;
    } bboxes[10];
};

InferenceResult last_result = {0};
bool new_inference_available = false;

int totalEntries = 0;
int totalExits = 0;
int clientsInside = 0;

// ===== Camera Configuration Structure =====
static camera_config_t camera_config = {
    .pin_pwdn = PWDN_GPIO_NUM,
    .pin_reset = RESET_GPIO_NUM,
    .pin_xclk = XCLK_GPIO_NUM,
    .pin_sscb_sda = SIOD_GPIO_NUM,
    .pin_sscb_scl = SIOC_GPIO_NUM,
    .pin_d7 = Y9_GPIO_NUM,
    .pin_d6 = Y8_GPIO_NUM,
    .pin_d5 = Y7_GPIO_NUM,
    .pin_d4 = Y6_GPIO_NUM,
    .pin_d3 = Y5_GPIO_NUM,
    .pin_d2 = Y4_GPIO_NUM,
    .pin_d1 = Y3_GPIO_NUM,
    .pin_d0 = Y2_GPIO_NUM,
    .pin_vsync = VSYNC_GPIO_NUM,
    .pin_href = HREF_GPIO_NUM,
    .pin_pclk = PCLK_GPIO_NUM,
    .xclk_freq_hz = 10000000,
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,
    .pixel_format = PIXFORMAT_JPEG,
    .frame_size = FRAMESIZE_QVGA,
    .jpeg_quality = 12,
    .fb_count = 2,
    .fb_location = CAMERA_FB_IN_PSRAM,
    .grab_mode = CAMERA_GRAB_WHEN_EMPTY,
};


// ===== Function Declarations =====

void run_inference_task();
String formatTimestamp();
void loadAllLogFiles();
void appendLogEntry(int idx, const String &message);
void processAtmegaLine(const String &line);
void processActionPost(const String &body);
String buildDoorEventPayload(int doorId, const String &state, const String &rawLine);
String buildStatusPayload();
String buildAiConfigPayload();
String buildModePayload();
String buildFaultsPayload();
String buildAllLogsPayload();
void publishDoorEvent(int doorId, const String &state, const String &rawLine);
void releasePendingInferenceFrame();
void promotePendingInferenceFrame();
bool applyOperationMode(const String &mode, const String &source, const String &user = "");
String resolveInferenceDetectionType(const char *label);
void applyInferenceOperationMode();

// ===== LOGGING FUNCTIONS =====

// Returns an ISO-8601 local timestamp (e.g. "2026-06-13T14:30:05") when NTP is
// synced, or an uptime string ("UP+00:12:34") as a clearly-labelled fallback so
// log entries are never empty and the browser's Date() can parse the real form.
String formatTimestamp() {
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
        char buf[32];
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
        return String(buf);
    }
    // NTP not yet available — fall back to uptime counter
    unsigned long s = millis() / 1000;
    char buf[24];
    sprintf(buf, "UP+%02lu:%02lu:%02lu", s / 3600, (s / 60) % 60, s % 60);
    return String(buf);
}

int resolveLogType(const String &type) {
    if (type.equalsIgnoreCase("monitoring")) return LOG_MONITORING;
    if (type.equalsIgnoreCase("control")) return LOG_CONTROL;
    if (type.equalsIgnoreCase("faults")) return LOG_FAULTS;
    if (type.equalsIgnoreCase("ai")) return LOG_AI;
    return LOG_CONTROL;
}

String parseJsonString(const String &body, const String &key) {
    int keyIndex = body.indexOf('"' + key + '"');
    if (keyIndex < 0) return String();
    int colonIndex = body.indexOf(':', keyIndex);
    if (colonIndex < 0) return String();
    int start = body.indexOf('"', colonIndex + 1);
    if (start < 0) return String();
    int end = body.indexOf('"', start + 1);
    if (end < 0) return String();
    return body.substring(start + 1, end);
}

String parseStatValue(const String &line, const String &key) {
    int keyIndex = line.indexOf(key + "=");
    if (keyIndex < 0) return String();
    int start = keyIndex + key.length() + 1;
    int end = line.indexOf(';', start);
    if (end < 0) {
        end = line.length();
    }
    return line.substring(start, end);
}

void saveLogFile(int idx) {
    File file = LittleFS.open(logFileNames[idx], FILE_WRITE);
    if (!file) {
        Serial.printf("Failed to write %s\n", logFileNames[idx]);
        return;
    }
    for (int i = 0; i < logCounts[idx]; i++) {
        file.println(logBuffers[idx][i]);
    }
    file.close();
}

void loadLogFile(int idx) {
    File file = LittleFS.open(logFileNames[idx], FILE_READ);
    if (!file) {
        File create = LittleFS.open(logFileNames[idx], FILE_WRITE);
        if (create) create.close();
        logCounts[idx] = 0;
        return;
    }
    logCounts[idx] = 0;
    while (file.available()) {
        String line = file.readStringUntil('\n');
        line.trim();
        if (line.length() == 0) continue;
        if (logCounts[idx] < MAX_LOG_LINES) {
            logBuffers[idx][logCounts[idx]++] = line;
        } else {
            for (int j = 1; j < MAX_LOG_LINES; j++) {
                logBuffers[idx][j - 1] = logBuffers[idx][j];
            }
            logBuffers[idx][MAX_LOG_LINES - 1] = line;
        }
    }
    file.close();
}

void appendLogEntry(int idx, const String &message) {
    String entry = formatTimestamp() + "    " + message;
    if (logCounts[idx] < MAX_LOG_LINES) {
        logBuffers[idx][logCounts[idx]++] = entry;
    } else {
        for (int i = 1; i < MAX_LOG_LINES; i++) {
            logBuffers[idx][i - 1] = logBuffers[idx][i];
        }
        logBuffers[idx][MAX_LOG_LINES - 1] = entry;
    }
    saveLogFile(idx);
}

void loadAllLogFiles() {
    for (int idx = 0; idx < LOG_TYPE_COUNT; idx++) {
        loadLogFile(idx);
    }
}

String buildLogResponse(int idx) {
    String payload = "{\"logs\": [";
    for (int i = 0; i < logCounts[idx]; i++) {
        if (i) payload += ",";
        String line = logBuffers[idx][i];
        int sep = line.indexOf("    ");
        String timestamp = line;
        String message = "";
        if (sep >= 0) {
            timestamp = line.substring(0, sep);
            message = line.substring(sep + 4);
        }
        timestamp.replace("\\", "\\\\");
        message.replace("\\", "\\\\");
        message.replace("\"", "\\\"");
        payload += "{\"timestamp\":\"" + timestamp + "\",\"message\":\"" + message + "\"}";
    }
    payload += "]}";
    return payload;
}

void processLogPost(const String &body) {
    String type = parseJsonString(body, "type");
    if (type.length() == 0) {
        type = "control";
    }
    String message = parseJsonString(body, "message");
    if (message.length() == 0) {
        String doorName = parseJsonString(body, "doorName");
        String action = parseJsonString(body, "action");
        String status = parseJsonString(body, "status");
        if (doorName.length() > 0 && action.length() > 0) {
            message = doorName + " " + action + " " + status;
        } else {
            message = body;
        }
    }
    int idx = resolveLogType(type);
    appendLogEntry(idx, message);
}

void processActionPost(const String &body) {
    Serial.println("[ACTION] Received POST: " + body);
    String door   = parseJsonString(body, "door");
    String action = parseJsonString(body, "action");
    String state  = parseJsonString(body, "state");
    String mode   = parseJsonString(body, "mode");
    String type   = parseJsonString(body, "type");
    String user   = parseJsonString(body, "user");

    // Build the attribution suffix used in every log line.
    // Empty when the action was triggered by the AI (no human user).
    String byUser = user.length() > 0 ? " by '" + user + "'" : "";

    if (action.equalsIgnoreCase("TOGGLE") && door.length() > 0) {
        String command = "DOOR_" + door + "_";
        if (state.equalsIgnoreCase("locked")) {
            command += "LOCKED";
        } else if (state.equalsIgnoreCase("unlocked")) {
            command += "UNLOCKED";
        } else {
            command += "AUTO";
        }
        Serial1.println(command);
        Serial.println("[ACTION] DOOR_TOGGLE: Door " + door + " to " + state + " -> " + command);
        appendLogEntry(LOG_CONTROL, "Door " + door + " set to " + state + byUser);

    } else if (action.equalsIgnoreCase("MODE_CHANGE") && mode.length() > 0) {
        applyOperationMode(mode, "ACTION", user);

    } else if (action.equalsIgnoreCase("AI_SYSTEM")) {
        ai_system_enabled = state.equalsIgnoreCase("ON");
        Serial.println("[AI] System enabled: " + String(ai_system_enabled ? "YES" : "NO"));
        appendLogEntry(LOG_AI, "AI System turned " + state + byUser);

    } else if (action.equalsIgnoreCase("AI_THREAT")) {
        ai_threat_detection = state.equalsIgnoreCase("ON");
        Serial.println("[AI] Threat detection active: " + String(ai_threat_detection ? "YES" : "NO"));
        appendLogEntry(LOG_AI, "AI Threat Detection turned " + state + byUser);

    } else if (action.equalsIgnoreCase("AI_DOOR_CONTROL")) {
        ai_door_control_enabled = state.equalsIgnoreCase("ON");
        Serial.println("[AI] Door control enabled: " + String(ai_door_control_enabled ? "YES" : "NO"));
        appendLogEntry(LOG_AI, "AI Door Control turned " + state + byUser);

    } else if (action.equalsIgnoreCase("AI_MODE") && mode.length() > 0) {
        if (type.equalsIgnoreCase("weapon")) {
            ai_weapon_operation_mode = mode;
        } else if (type.equalsIgnoreCase("masked")) {
            ai_masked_operation_mode = mode;
        }
        Serial.println("[AI] " + type + " detection mode set to: " + mode);
        appendLogEntry(LOG_AI, "AI " + type + " detection mode set to " + mode + byUser);
    }
}

bool applyOperationMode(const String &mode, const String &source, const String &user) {
    if (mode.length() == 0) {
        return false;
    }

    String next_mode = current_operation_mode;
    String next_label = current_operation_label;
    String command = "SET_MODE_";

    if (mode.equalsIgnoreCase("Evacuation") || mode.equalsIgnoreCase("Evacuate") || mode.equalsIgnoreCase("evacuate")) {
        command += "EVAC";
        next_mode = "evacuate";
        next_label = "Evacuation";
    } else if (mode.equalsIgnoreCase("Normal-Traffic") || mode.equalsIgnoreCase("Normal") || mode.equalsIgnoreCase("normal")) {
        command += "NORMAL";
        next_mode = "normal";
        next_label = "Normal-Traffic";
    } else if (mode.equalsIgnoreCase("Exit-Only") || mode.equalsIgnoreCase("exit")) {
        command += "CLOSED";
        next_mode = "exit";
        next_label = "Exit-Only";
    } else if (mode.equalsIgnoreCase("Entrance-Only") || mode.equalsIgnoreCase("entrance")) {
        command += "STAFF";
        next_mode = "entrance";
        next_label = "Entrance-Only";
    } else if (mode.equalsIgnoreCase("Lock-All") || mode.equalsIgnoreCase("Lockdown") || mode.equalsIgnoreCase("Lock-down") || mode.equalsIgnoreCase("lock")) {
        command += "LOCK";
        next_mode = "lock";
        next_label = "Lock-All";
    } else {
        command += mode;
        next_mode = mode;
        next_label = mode;
    }

    if (current_operation_mode.equalsIgnoreCase(next_mode)) {
        Serial.println("[" + source + "] MODE_CHANGE skipped: already " + next_label);
        return false;
    }

    current_operation_mode = next_mode;
    current_operation_label = next_label;

    String byUser = user.length() > 0 ? " by '" + user + "'" : "";
    Serial1.println(command);
    Serial.println("[" + source + "] MODE_CHANGE: " + next_label + " -> " + command);
    appendLogEntry(LOG_CONTROL, "Operation mode changed to " + next_label + byUser);

    return true;
}

String resolveInferenceDetectionType(const char *label) {
    if (label == nullptr) {
        return String();
    }

    String normalized = String(label);
    normalized.toLowerCase();

    if (normalized.indexOf("weapon") >= 0 || normalized.indexOf("gun") >= 0 || normalized.indexOf("knife") >= 0 || normalized.indexOf("pistol") >= 0 || normalized.indexOf("rifle") >= 0 || normalized.indexOf("firearm") >= 0) {
        return "weapon";
    }

    if (normalized.indexOf("mask") >= 0 || normalized.indexOf("masked") >= 0 || normalized.indexOf("face") >= 0) {
        return "masked";
    }

    return String();
}

void applyInferenceOperationMode() {
    if (!ai_door_control_enabled || last_result.max_confidence < CAPTURE_CONFIDENCE_THRESHOLD) {
        return;
    }

    String detection_type = resolveInferenceDetectionType(last_result.top_label);
    if (detection_type.length() == 0) {
        Serial.println("[AI] No inference mode mapping for label: " + String(last_result.top_label ? last_result.top_label : "unknown"));
        return;
    }

    String configured_mode = detection_type.equals("weapon")
        ? ai_weapon_operation_mode
        : ai_masked_operation_mode;

    if (configured_mode.length() == 0) {
        return;
    }

    if (applyOperationMode(configured_mode, "AI")) {
        appendLogEntry(
            LOG_AI,
            "AI " + detection_type + " detection applied mode " + configured_mode +
            " at " + String(last_result.max_confidence * 100.0f, 1) + "%"
        );
    }
}

String jsonEscape(String value) {
    value.replace("\\", "\\\\");
    value.replace("\"", "\\\"");
    value.replace("\n", " ");
    value.replace("\r", " ");
    return value;
}

String buildDoorEventPayload(int doorId, const String &state, const String &rawLine) {
    String normalizedState = state;
    normalizedState.toLowerCase();
    String message = "Door " + String(doorId) + " " + normalizedState;
    String payload = "{";
    payload += "\"type\":\"door\",";
    payload += "\"eventId\":" + String(lastDoorEventId) + ",";
    payload += "\"doorId\":" + String(doorId) + ",";
    payload += "\"doorName\":\"" + String(doorNames[doorId - 1]) + "\",";
    payload += "\"state\":\"" + normalizedState + "\",";
    payload += "\"locked\":" + String(doorLockStates[doorId - 1] ? "true" : "false") + ",";
    payload += "\"message\":\"" + jsonEscape(message) + "\",";
    payload += "\"raw\":\"" + jsonEscape(rawLine) + "\",";
    payload += "\"timestamp\":\"" + formatTimestamp() + "\",";
    payload += "\"millis\":" + String(millis());
    payload += "}";
    return payload;
}

void publishDoorEvent(int doorId, const String &state, const String &rawLine) {
    if (doorId < 1 || doorId > 4) return;
    doorContactStates[doorId - 1] = state;
    doorContactStates[doorId - 1].toLowerCase();
    lastDoorEventId++;
    String payload = buildDoorEventPayload(doorId, doorContactStates[doorId - 1], rawLine);
    events.send(payload.c_str(), "door", lastDoorEventId);
    events.send(buildStatusPayload().c_str(), "status", lastDoorEventId);
}

void processAtmegaLine(const String &line) {
    if (line.startsWith("DOOR_")) {
        int doorId = line.charAt(5) - '0';
        if (doorId >= 1 && doorId <= 4) {
            String suffix = line.substring(7);
            String message = "Door " + String(doorId) + " " + suffix;
            appendLogEntry(LOG_MONITORING, message);
            if (suffix.equalsIgnoreCase("OPENED")) {
                publishDoorEvent(doorId, "opened", line);
            } else if (suffix.equalsIgnoreCase("CLOSED")) {
                publishDoorEvent(doorId, "closed", line);
            } else if (suffix.equalsIgnoreCase("LOCKED")) {
                doorLockStates[doorId - 1] = true;
                lastDoorEventId++;
                events.send(buildStatusPayload().c_str(), "status", lastDoorEventId);
            } else if (suffix.equalsIgnoreCase("UNLOCKED")) {
                doorLockStates[doorId - 1] = false;
                lastDoorEventId++;
                events.send(buildStatusPayload().c_str(), "status", lastDoorEventId);
            }
        }
    } else if (line.startsWith("STATS:")) {
        String entriesValue = parseStatValue(line, "ENTRIES");
        String exitsValue = parseStatValue(line, "EXITS");
        String insideValue = parseStatValue(line, "INSIDE");

        if (entriesValue.length() > 0) {
            totalEntries = entriesValue.toInt();
        }
        if (exitsValue.length() > 0) {
            totalExits = exitsValue.toInt();
        }
        if (insideValue.length() > 0) {
            clientsInside = insideValue.toInt();
        }

        appendLogEntry(LOG_MONITORING, "Occupancy counts updated: Entries=" + String(totalEntries) + ", Exits=" + String(totalExits) + ", Inside=" + String(clientsInside));
        lastDoorEventId++;
        events.send(buildStatusPayload().c_str(), "status", lastDoorEventId);
    }
}

String buildStatusPayload() {
    String payload = "{";
    payload += "\"uptime\":\"" + formatTimestamp() + "\",";
    payload += "\"camera_ready\":" + String(is_camera_initialised ? "true" : "false") + ",";
    payload += "\"entries\":" + String(totalEntries) + ",";
    payload += "\"exits\":" + String(totalExits) + ",";
    payload += "\"inside\":" + String(clientsInside) + ",";
    payload += "\"doors\":[";
    for (int i = 0; i < 4; i++) {
        if (i) payload += ",";
        payload += "{\"id\":" + String(i + 1) + ",\"name\":\"" + String(doorNames[i]) + "\",\"state\":\"" + doorContactStates[i] + "\",\"locked\":" + String(doorLockStates[i] ? "true" : "false") + "}";
    }
    payload += "]}";
    return payload;
}

// Returns the live AI config so the browser can stay in sync without
// clobbering toggle state. Must include the aiSystem block or
// updateAiConfigFromAPI will receive undefined and flip toggles off.
String buildAiConfigPayload() {
    String payload = "{";
    payload += "\"aiSystem\":{";
    payload += "\"enabled\":"              + String(ai_system_enabled   ? "true" : "false") + ",";
    payload += "\"maskedFaceDetection\":"  + String(ai_threat_detection ? "true" : "false") + ",";
    payload += "\"weaponDetection\":"      + String(ai_threat_detection ? "true" : "false") + ",";
    payload += "\"aiDoorControl\":"       + String(ai_door_control_enabled ? "true" : "false");
    payload += "},";
    payload += "\"operationModes\":{\"weapon\":\"" + jsonEscape(ai_weapon_operation_mode) + "\",\"masked\":\"" + jsonEscape(ai_masked_operation_mode) + "\"}";
    payload += "}";
    return payload;
}

String buildModePayload() {
    String payload = "{";
    payload += "\"mode\":\"" + jsonEscape(current_operation_mode) + "\",";
    payload += "\"label\":\"" + jsonEscape(current_operation_label) + "\",";
    payload += "\"timestamp\":\"" + formatTimestamp() + "\"";
    payload += "}";
    return payload;
}

String buildFaultsPayload() {
    String now = formatTimestamp();
    String payload = "{";
    payload += "\"faults\":{";
    payload += "\"locks\":[";
    const char* lockNames[4] = {"EXT.D4 LOCK", "ENT.D1 LOCK", "EXT.D3 LOCK", "ENT.D2 LOCK"};
    for (int i = 0; i < 4; i++) {
        if (i) payload += ",";
        payload += "{\"id\":\"" + String(lockNames[i]) + "\",\"name\":\"" + String(lockNames[i]) + "\",\"status\":\"normal\",\"lastChecked\":\"" + now + "\"}";
    }
    payload += "],\"motionControllers\":[";
    const char* mcNames[4] = {"EXT.D4 MC", "ENT.D1 MC", "EXT.D3 MC", "ENT.D2 MC"};
    for (int i = 0; i < 4; i++) {
        if (i) payload += ",";
        payload += "{\"id\":\"" + String(mcNames[i]) + "\",\"name\":\"" + String(mcNames[i]) + "\",\"status\":\"normal\",\"lastChecked\":\"" + now + "\"}";
    }
    payload += "],\"pirSensors\":[";
    const char* pirNames[2] = {"BOOTH 1 PIR", "BOOTH 2 PIR"};
    for (int i = 0; i < 2; i++) {
        if (i) payload += ",";
        payload += "{\"id\":\"" + String(pirNames[i]) + "\",\"name\":\"" + String(pirNames[i]) + "\",\"status\":\"normal\",\"lastChecked\":\"" + now + "\"}";
    }
    payload += "]},\"timestamp\":\"" + now + "\"}";
    return payload;
}

String buildAllLogsPayload() {
    String payload = "{\"logs\":[";
    bool first = true;
    for (int idx = 0; idx < LOG_TYPE_COUNT; idx++) {
        for (int i = 0; i < logCounts[idx]; i++) {
            if (!first) payload += ",";
            first = false;
            String line = logBuffers[idx][i];
            int sep = line.indexOf("    ");
            String timestamp = line;
            String message = "";
            if (sep >= 0) {
                timestamp = line.substring(0, sep);
                message = line.substring(sep + 4);
            }
            payload += "{\"type\":\"" + String(idx) + "\",\"timestamp\":\"" + jsonEscape(timestamp) + "\",\"message\":\"" + jsonEscape(message) + "\"}";
        }
    }
    payload += "],\"maxLogs\":" + String(MAX_LOG_LINES) + ",\"timestamp\":\"" + formatTimestamp() + "\"}";
    return payload;
}

// ===== CAMERA FUNCTIONS =====
bool ei_camera_init(void) {
    if (is_camera_initialised) return true;
        pinMode(PWDN_GPIO_NUM, OUTPUT);
    digitalWrite(PWDN_GPIO_NUM, HIGH);  // Power down
    delay(100);
    digitalWrite(PWDN_GPIO_NUM, LOW);   // Power up
    delay(100);

    esp_err_t err = esp_camera_init(&camera_config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x\n", err);
        return false;
    }

    sensor_t * s = esp_camera_sensor_get();
    if (s->id.PID == OV3660_PID) {
        s->set_vflip(s, 1);
        s->set_brightness(s, 1);
        s->set_saturation(s, 0);
    }

    is_camera_initialised = true;
    return true;
}

void ei_camera_deinit(void) {
    esp_err_t err = esp_camera_deinit();
    if (err != ESP_OK) {
        ei_printf("Camera deinit failed\n");
        return;
    }
    is_camera_initialised = false;
}

bool ei_camera_capture(uint32_t img_width, uint32_t img_height, uint8_t *out_buf) {
    bool do_resize = false;

    if (!is_camera_initialised) {
        ei_printf("ERR: Camera is not initialized\r\n");
        return false;
    }

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        ei_printf("Camera capture failed\n");
        return false;
    }

    bool converted = fmt2rgb888(fb->buf, fb->len, PIXFORMAT_JPEG, out_buf);

    if (!converted) {
        esp_camera_fb_return(fb);
        ei_printf("Conversion failed\n");
        return false;
    }

    if ((img_width != EI_CAMERA_RAW_FRAME_BUFFER_COLS)
        || (img_height != EI_CAMERA_RAW_FRAME_BUFFER_ROWS)) {
        do_resize = true;
    }

    if (do_resize) {
        ei::image::processing::crop_and_interpolate_rgb888(
            out_buf,
            EI_CAMERA_RAW_FRAME_BUFFER_COLS,
            EI_CAMERA_RAW_FRAME_BUFFER_ROWS,
            out_buf,
            img_width,
            img_height);
    }

    releasePendingInferenceFrame();
    pending_inference_fb = fb;

    return true;
}

void releasePendingInferenceFrame() {
    if (pending_inference_fb != nullptr) {
        esp_camera_fb_return(pending_inference_fb);
        pending_inference_fb = nullptr;
    }
}

void promotePendingInferenceFrame() {
    if (pending_inference_fb == nullptr) {
        return;
    }

    if (stored_capture_fb != nullptr) {
        esp_camera_fb_return(stored_capture_fb);
    }

    stored_capture_fb = pending_inference_fb;
    pending_inference_fb = nullptr;
}

static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr) {
    size_t pixel_ix = offset * 3;
    size_t pixels_left = length;
    size_t out_ptr_ix = 0;

    while (pixels_left != 0) {
        out_ptr[out_ptr_ix] = (snapshot_buf[pixel_ix + 2] << 16) + (snapshot_buf[pixel_ix + 1] << 8) + snapshot_buf[pixel_ix];
        out_ptr_ix++;
        pixel_ix += 3;
        pixels_left--;
    }
    return 0;
}

// ===== INFERENCE FUNCTIONS =====
void run_inference_task() {
    // Allocate snapshot buffer for RGB conversion
    snapshot_buf = (uint8_t*)malloc(EI_CAMERA_RAW_FRAME_BUFFER_COLS * EI_CAMERA_RAW_FRAME_BUFFER_ROWS * EI_CAMERA_FRAME_BYTE_SIZE);
    
    if (snapshot_buf == nullptr) {
        Serial.println("ERR: Failed to allocate snapshot buffer!");
        appendLogEntry(LOG_AI, "Inference Failed: Out of Memory");
        return;
    }

    // Capture frame
    if (!ei_camera_capture((size_t)EI_CLASSIFIER_INPUT_WIDTH, (size_t)EI_CLASSIFIER_INPUT_HEIGHT, snapshot_buf)) {
        Serial.println("Failed to capture image for inference");
        free(snapshot_buf);
        snapshot_buf = nullptr;
        appendLogEntry(LOG_AI, "Frame Capture Failed");
        return;
    }

    // Setup signal for classifier
    ei::signal_t signal;
    signal.total_length = EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT;
    signal.get_data = &ei_camera_get_data;

    // Run classifier
    ei_impulse_result_t result = {0};
    EI_IMPULSE_ERROR err = run_classifier(&signal, &result, debug_nn);
    
    if (err != EI_IMPULSE_OK) {
        Serial.printf("ERR: Failed to run classifier (%d)\n", err);
        free(snapshot_buf);
        snapshot_buf = nullptr;
        releasePendingInferenceFrame();
        appendLogEntry(LOG_AI, "Classifier Error");
        return;
    }

    // Store results
    last_result.timestamp = millis();
    last_result.inference_time_dsp = result.timing.dsp;
    last_result.inference_time_classification = result.timing.classification;
    last_result.inference_time_anomaly = result.timing.anomaly;
    last_result.max_confidence = 0.0f;
    last_result.top_label = nullptr;
    last_result.bbox_count = 0;

    // Extract classification results
#if EI_CLASSIFIER_OBJECT_DETECTION == 1
    Serial.println("Object detection results:");
    // bbox_count was reset to 0 above; increment only for valid (non-zero value) boxes
    for (uint32_t i = 0; i < result.bounding_boxes_count && last_result.bbox_count < 10; i++) {
        ei_impulse_result_bounding_box_t bb = result.bounding_boxes[i];
        if (bb.value == 0) continue;

        uint32_t j = last_result.bbox_count;
        last_result.bboxes[j].label      = bb.label;
        last_result.bboxes[j].confidence = bb.value;
        last_result.bboxes[j].x          = bb.x;
        last_result.bboxes[j].y          = bb.y;
        last_result.bboxes[j].width      = bb.width;
        last_result.bboxes[j].height     = bb.height;
        last_result.bbox_count++;

        if (bb.value > last_result.max_confidence) {
            last_result.max_confidence = bb.value;
            last_result.top_label = bb.label;
        }

        Serial.printf("  %s (%.2f%%) [x:%u, y:%u, w:%u, h:%u]\r\n",
                bb.label, bb.value * 100, bb.x, bb.y, bb.width, bb.height);
    }
#else
    Serial.println("Classification results:");
    for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
        if (result.classification[i].value > last_result.max_confidence) {
            last_result.max_confidence = result.classification[i].value;
            last_result.top_label = ei_classifier_inferencing_categories[i];
        }
        Serial.printf("  %s: %.5f\r\n", ei_classifier_inferencing_categories[i], result.classification[i].value);
    }
#endif

    // Log inference result
    char log_msg[128];
    sprintf(log_msg, "Inference: %s (%.1f%%) - DSP: %dms, Class: %dms",
            last_result.top_label ? last_result.top_label : "Unknown",
            last_result.max_confidence * 100,
            (int)last_result.inference_time_dsp,
            (int)last_result.inference_time_classification);
    appendLogEntry(LOG_AI, log_msg);

    if (last_result.max_confidence >= CAPTURE_CONFIDENCE_THRESHOLD) {
        promotePendingInferenceFrame();
        applyInferenceOperationMode();
    } else {
        releasePendingInferenceFrame();
    }

    new_inference_available = true;
    free(snapshot_buf);
    snapshot_buf = nullptr;
}

String buildInferenceJsonResponse() {
    String payload = "{";
    payload += "\"timestamp\":" + String(last_result.timestamp) + ",";
    payload += "\"top_label\":\"" + String(last_result.top_label ? last_result.top_label : "N/A") + "\",";
    payload += "\"confidence\":" + String(last_result.max_confidence, 3) + ",";
    payload += "\"dsp_time\":" + String((int)last_result.inference_time_dsp) + ",";
    payload += "\"classification_time\":" + String((int)last_result.inference_time_classification) + ",";
    payload += "\"anomaly_time\":" + String((int)last_result.inference_time_anomaly) + ",";
    payload += "\"bounding_boxes\":[";
    
    for (uint32_t i = 0; i < last_result.bbox_count && i < 10; i++) {
        if (i > 0) payload += ",";
        payload += "{";
        payload += "\"label\":\"" + String(last_result.bboxes[i].label) + "\",";
        payload += "\"confidence\":" + String(last_result.bboxes[i].confidence, 3) + ",";
        payload += "\"x\":" + String(last_result.bboxes[i].x) + ",";
        payload += "\"y\":" + String(last_result.bboxes[i].y) + ",";
        payload += "\"width\":" + String(last_result.bboxes[i].width) + ",";
        payload += "\"height\":" + String(last_result.bboxes[i].height);
        payload += "}";
    }
    
    payload += "]}";
    return payload;
}

// ===== WEB SERVER ENDPOINTS =====
void setupWebServerEndpoints() {
    events.onConnect([](AsyncEventSourceClient *client) {
        if (client->lastId()) {
            Serial.printf("SSE client reconnected, last message ID: %u\n", client->lastId());
        }
        client->send(buildStatusPayload().c_str(), "status", millis(), 1000);
    });
    server.addHandler(&events);

    server.on("/stream", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
            request->send(500, "text/plain", "Camera capture failed");
            return;
        }

        AsyncWebServerResponse *response = request->beginResponse(
            200,
            "image/jpeg",
            (uint8_t*)fb->buf,
            fb->len
        );

        // Allow the browser to load this image regardless of origin,
        // and prevent stale frames from being served from cache.
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        response->addHeader("Pragma", "no-cache");

        request->send(response);
        esp_camera_fb_return(fb);
    });

    // Single-frame capture endpoint for inference snapshots
    server.on("/capture", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        if (stored_capture_fb == nullptr) {
            request->send(404, "text/plain", "No stored inference frame available");
            return;
        }

        AsyncWebServerResponse *response = request->beginResponse(
            200,
            "image/jpeg",
            (uint8_t*)stored_capture_fb->buf,
            stored_capture_fb->len
        );

        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        response->addHeader("Pragma", "no-cache");

        request->send(response);
    });

    // Inference results endpoint
    server.on("/api/inference", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", buildInferenceJsonResponse());
    });

    // Inference state endpoint for polling
    server.on("/api/inference-status", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        String status = "{\"new_result\":" + String(new_inference_available ? "true" : "false") + "}";
        new_inference_available = false;
        request->send(200, "application/json", status);
    });

    // Trigger inference endpoint
    server.on("/api/inference-trigger", AsyncWebRequestMethod::HTTP_POST, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", "{\"status\":\"inference triggered\"}");
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
        run_inference_task();
    });

    // AI config endpoint — browser polls this to stay in sync with the ESP32's
    // actual enabled/disabled state. Separate from /status.json so it can never
    // return a payload without the aiSystem block (which would flip toggles off).
    server.on("/api/ai-config", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", buildAiConfigPayload());
    });

    // Dynamic JSON endpoints used by the browser API client.
    // These override same-named LittleFS files so UI state comes from the ESP32.
    server.on("/api/mode.json", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", buildModePayload());
    });

    server.on("/api/faults.json", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", buildFaultsPayload());
    });

    server.on("/api/logs.json", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", buildAllLogsPayload());
    });

    // Log endpoints
    server.on("/logs/monitoring.txt", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(LittleFS, "/monitoring.log", "text/plain");
    });
    
    server.on("/logs/control.txt", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(LittleFS, "/control.log", "text/plain");
    });
    
    server.on("/logs/faults.txt", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(LittleFS, "/faults.log", "text/plain");
    });
    
    server.on("/logs/ai.txt", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(LittleFS, "/ai.log", "text/plain");
    });

    server.on("/log", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        String type = "control";
        if (request->hasParam("type")) {
            type = request->getParam("type")->value();
        }
        int idx = resolveLogType(type);
        request->send(200, "application/json", buildLogResponse(idx));
    });

    server.on("/log", AsyncWebRequestMethod::HTTP_POST, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", "{\"status\":\"ok\"}");
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
        String body;
        for (size_t i = 0; i < len; i++) body += (char)data[i];
        processLogPost(body);
    });

    server.on("/action", AsyncWebRequestMethod::HTTP_POST, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", "{\"status\":\"ok\"}");
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
        String body;
        for (size_t i = 0; i < len; i++) body += (char)data[i];
        processActionPost(body);
    });

    server.on("/status.json", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", buildStatusPayload());
    });

    server.on("/api/status.json", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", buildStatusPayload());
    });

    // Serve static files from LittleFS; default to index.html for root requests
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    server.onNotFound([](AsyncWebServerRequest *request) {
        request->send(404, "text/plain", "Hmmmmmmmmmm       Brezh!         Chekai code dzenyu chief.");
    });
}

// ===== SETUP =====
void setup() {
    
    Serial.begin(115200);
    
    // Initialize UART for ATmega328p communication
    Serial1.begin(ATMEGA_BAUD, SERIAL_8N1, ATMEGA_RX_PIN, ATMEGA_TX_PIN);
    Serial.println("UART1 (ATmega interface) initialized");

    // Initialize LittleFS
    if (!LittleFS.begin(true)) {
        Serial.println("CRITICAL ERROR: LittleFS Mount Failed");
        return;
    }
    Serial.println("LittleFS Mounted Successfully");
    delay(1000);

    // Initialize Camera
    if (!ei_camera_init()) {
        Serial.println("Camera initialization failed!");
    } else {
        Serial.println("Camera initialized successfully");
    }

    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    int timeout = 20;
    while (WiFi.status() != WL_CONNECTED && timeout > 0) {
        delay(1000);
        Serial.print('.');
        timeout--;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi Connected");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());

        // Sync real-world time over NTP
        configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);
        Serial.print("Waiting for NTP sync");
        struct tm timeinfo;
        int ntpAttempts = 0;
        while (!getLocalTime(&timeinfo) && ntpAttempts < 20) {
            delay(500);
            Serial.print('.');
            ntpAttempts++;
        }
        if (getLocalTime(&timeinfo)) {
            char timeBuf[32];
            strftime(timeBuf, sizeof(timeBuf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
            Serial.println("\nNTP sync OK: " + String(timeBuf));
        } else {
            Serial.println("\nNTP sync failed — uptime timestamps will be used");
        }
    } else {
        Serial.println("\nWiFi Connection Failed");
    }

    // Load log files from LittleFS
    loadAllLogFiles();

    // Setup web server endpoints
    setupWebServerEndpoints();
    server.begin();

    appendLogEntry(LOG_MONITORING, "========== SYSTEM START ==========");
    appendLogEntry(LOG_AI, "AI System initialized with Edge Impulse classifier");
    
    Serial.println("ESP32 Unified System Ready!");
    Serial.println("Access camera at: http://" + WiFi.localIP().toString() + "/stream");
    Serial.println("Inference results at: http://" + WiFi.localIP().toString() + "/api/inference");
}

// ===== MAIN LOOP =====
void loop() {
    // Handle serial communication from ATmega328p
    if (Serial1.available()) {
        String incomingData = Serial1.readStringUntil('\n');
        incomingData.trim();
        if (incomingData.length() > 0) {
            Serial.println("ATmega: " + incomingData);
            processAtmegaLine(incomingData);
        }
    }

    // Run inference only when both master switch and a detector are active.
    // Interval matches the JS polling rate (3 s) so every poll gets fresh data.
    static unsigned long last_inference = 0;
    if (ai_system_enabled && ai_threat_detection &&
        (millis() - last_inference > 500)) {
        last_inference = millis();
        run_inference_task();
    }

    delay(10);
}

#if !defined(EI_CLASSIFIER_SENSOR) || EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_CAMERA
#error "Invalid model for current sensor"
#endif
