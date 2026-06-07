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
#include <Threat_Detector_inferencing.h>
#include "edge-impulse-sdk/dsp/image/image.hpp"
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

using namespace eloq;

// ===== WiFi Configuration =====
const char* ssid = "brezhnev";
const char* password = "brezhnev02";

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

// ===== Web Server Configuration =====
AsyncWebServer server(80);

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

// ===== Camera & Inference State =====
static bool debug_nn = false;
static bool is_camera_initialised = false;
uint8_t *snapshot_buf = nullptr;
uint8_t *jpeg_buf = nullptr;
size_t jpeg_buf_len = 0;

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
    .xclk_freq_hz = 20000000,
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,
    .pixel_format = PIXFORMAT_JPEG,
    .frame_size = FRAMESIZE_QVGA,
    .jpeg_quality = 12,
    .fb_count = 1,
    .fb_location = CAMERA_FB_IN_PSRAM,
    .grab_mode = CAMERA_GRAB_WHEN_EMPTY,
};

// ===== Function Declarations =====
bool ei_camera_init(void);
void ei_camera_deinit(void);
bool ei_camera_capture(uint32_t img_width, uint32_t img_height, uint8_t *out_buf);
static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr);
void run_inference_task();
String formatTimestamp();
void loadAllLogFiles();
void appendLogEntry(int idx, const String &message);
void processAtmegaLine(const String &line);
void processActionPost(const String &body);

// ===== LOGGING FUNCTIONS =====
String formatTimestamp() {
    unsigned long totalSeconds = millis() / 1000;
    unsigned long seconds = totalSeconds % 60;
    unsigned long minutes = (totalSeconds / 60) % 60;
    unsigned long hours = (totalSeconds / 3600) % 24;
    const char* baseDate = "24/04/26";
    char buffer[32];
    sprintf(buffer, "%s---%02lu:%02lu:%02lu", baseDate, hours, minutes, seconds);
    return String(buffer);
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
    String door = parseJsonString(body, "door");
    String action = parseJsonString(body, "action");
    String state = parseJsonString(body, "state");
    String mode = parseJsonString(body, "mode");
    
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
        appendLogEntry(LOG_CONTROL, "Door " + door + " set to " + state);
    } else if (action.equalsIgnoreCase("MODE_CHANGE") && mode.length() > 0) {
        String command = "SET_MODE_";
        if (mode.equalsIgnoreCase("Evacuation") || mode.equalsIgnoreCase("Evacuate")) command += "EVAC";
        else if (mode.equalsIgnoreCase("Normal-Traffic") || mode.equalsIgnoreCase("Normal")) command += "NORMAL";
        else if (mode.equalsIgnoreCase("Exit-Only")) command += "CLOSED";
        else if (mode.equalsIgnoreCase("Entrance-Only")) command += "STAFF";
        else if (mode.equalsIgnoreCase("Lock-All") || mode.equalsIgnoreCase("Lockdown") || mode.equalsIgnoreCase("Lock-down")) command += "LOCK";
        else command += mode;
        Serial1.println(command);
        Serial.println("[ACTION] MODE_CHANGE: " + mode + " -> " + command);
        appendLogEntry(LOG_CONTROL, "Operation mode changed to " + mode);
    }
}

void processAtmegaLine(const String &line) {
    if (line.startsWith("DOOR_")) {
        int doorId = line.charAt(5) - '0';
        if (doorId >= 1 && doorId <= 4) {
            String suffix = line.substring(7);
            String message = "Door " + String(doorId) + " " + suffix;
            appendLogEntry(LOG_MONITORING, message);
        }
    }
}

// ===== CAMERA FUNCTIONS =====
bool ei_camera_init(void) {
    if (is_camera_initialised) return true;

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
    esp_camera_fb_return(fb);

    if (!converted) {
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

    return true;
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
    last_result.bbox_count = result.bounding_boxes_count;
    for (uint32_t i = 0; i < result.bounding_boxes_count && i < 10; i++) {
        ei_impulse_result_bounding_box_t bb = result.bounding_boxes[i];
        if (bb.value == 0) continue;
        
        last_result.bboxes[i].label = bb.label;
        last_result.bboxes[i].confidence = bb.value;
        last_result.bboxes[i].x = bb.x;
        last_result.bboxes[i].y = bb.y;
        last_result.bboxes[i].width = bb.width;
        last_result.bboxes[i].height = bb.height;
        
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
    // Stream endpoint - returns individual JPEG frames
    server.on("/stream", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
            request->send(500, "text/plain", "Camera capture failed");
            return;
        }
        
        request->send_P(200, "image/jpeg", (const uint8_t*)fb->buf, fb->len, [](void* arg) {
            camera_fb_return((camera_fb_t*)arg);
        }, fb);
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
        String payload = "{";
        payload += "\"uptime\":\"" + formatTimestamp() + "\",";
        payload += "\"camera_ready\":" + String(is_camera_initialised ? "true" : "false") + ",";
        payload += "\"entries\":0,";
        payload += "\"exits\":0,";
        payload += "\"inside\":0,";
        payload += "\"doors\":[";
        for (int i = 0; i < 4; i++) {
            if (i) payload += ",";
            payload += "{\"id\":\"" + String(i + 1) + "\",\"name\":\"" + String(doorNames[i]) + "\"}";
        }
        payload += "]}";
        request->send(200, "application/json", payload);
    });

    server.onNotFound([](AsyncWebServerRequest *request) {
        request->send(404, "text/plain", "404 Not Found");
    });
}

// ===== SETUP =====
void setup() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
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

    // Run inference periodically (every 2 seconds)
    static unsigned long last_inference = 0;
    if (millis() - last_inference > 2000) {
        last_inference = millis();
        run_inference_task();
    }

    delay(10);
}

#if !defined(EI_CLASSIFIER_SENSOR) || EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_CAMERA
#error "Invalid model for current sensor"
#endif
