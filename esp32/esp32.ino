/*
====================================================================
ESP32-CAM WEB SERVER + LIVE CAMERA STREAM
Optimized for Flash Longevity & Stability
Added Persistent Monitoring, Control, Faults and AI Logs
====================================================================
*/

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>
#include <LittleFS.h>
#include <eloquent_esp32cam.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

using namespace eloq;

const char* ssid = "brezhnev";
const char* password = "brezhnev02";

#define ATMEGA_RX_PIN 13
#define ATMEGA_TX_PIN 15
#define ATMEGA_BAUD   9600

AsyncWebServer server(80);

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

const char log_html[] PROGMEM = R"rawhtml(
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ESP32-CAM Live System Logs</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #1e1e1e; color: #d4d4d4; padding: 20px; }
        h2 { color: #4fc1ff; }
        #log-container { 
            background-color: #000000; border: 1px solid #3c3c3c; padding: 15px; 
            height: 450px; overflow-y: scroll; font-family: 'Courier New', monospace; 
            white-space: pre-wrap; border-radius: 5px; font-size: 14px; line-height: 1.5;
        }
        .status { margin-bottom: 10px; font-size: 12px; color: #6a9955; }
    </style>
</head>
<body>
    <h2>Booth Controller Live Event Stream</h2>
    <div class="status">Auto-refreshing active (2s interval)...</div>
    <div id="log-container">Loading log streams from filesystem...</div>
    <script>
        function fetchLogs() {
            fetch('/logs/monitoring.txt').then(r => r.text()).then(data => {
                const c = document.getElementById('log-container');
                c.textContent = data; c.scrollTop = c.scrollHeight;
            }).catch(e => { document.getElementById('log-container').textContent = "Error updating system logs..."; });
        }
        fetchLogs(); setInterval(fetchLogs, 2000);
    </script>
</body>
</html>
)rawhtml";

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

    Serial.println("[ACTION] Parsed - action: " + action + ", door: " + door + ", state: " + state + ", mode: " + mode);

    if (action.equalsIgnoreCase("TOGGLE") && door.length() > 0) {
        String command = "DOOR_" + door + "_";
        if (state.equalsIgnoreCase("locked")) {
            command += "LOCKED";
        } else if (state.equalsIgnoreCase("unlocked")) {
            command += "UNLOCKED";
        } else {
            command += "AUTO";
        }
        Serial.println("[ATMEGA_CMD] " + command);
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
        Serial.println("[ATMEGA_CMD] " + command);
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

void setup() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
    Serial.begin(115200);
    Serial.println();
    Serial1.begin(ATMEGA_BAUD, SERIAL_8N1, ATMEGA_RX_PIN, ATMEGA_TX_PIN);
    Serial.println("UART1 (ATmega interface) initialized successfully.");
    if (!LittleFS.begin(true)) {
        Serial.println("CRITICAL ERROR: LittleFS Mount Failed");
        return;
    }
    Serial.println("LittleFS Mounted Successfully");
    delay(2000);
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.print('.');
    }
    Serial.println("\nWiFi Connected");
    loadAllLogFiles();
    server.serveStatic("/", LittleFS, "/").setDefaultFile("monitor.html");
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
        String body = buildLogResponse(idx);
        AsyncWebServerResponse *response = request->beginResponse(200, "application/json", body);
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        response->addHeader("Access-Control-Allow-Headers", "Content-Type");
        request->send(response);
    });
    server.on("/log", AsyncWebRequestMethod::HTTP_POST, [](AsyncWebServerRequest *request) {
        AsyncWebServerResponse *response = request->beginResponse(200, "application/json", "{\"status\":\"ok\"}");
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        response->addHeader("Access-Control-Allow-Headers", "Content-Type");
        request->send(response);
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
        String body;
        for (size_t i = 0; i < len; i++) body += (char)data[i];
        processLogPost(body);
    });

    // OPTIONS preflight for /log
    server.on("/log", HTTP_OPTIONS, [](AsyncWebServerRequest *request){
        AsyncWebServerResponse *response = request->beginResponse(204);
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        response->addHeader("Access-Control-Allow-Headers", "Content-Type");
        request->send(response);
    });
    server.on("/action", AsyncWebRequestMethod::HTTP_POST, [](AsyncWebServerRequest *request) {
        AsyncWebServerResponse *response = request->beginResponse(200, "application/json", "{\"status\":\"ok\"}");
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        response->addHeader("Access-Control-Allow-Headers", "Content-Type");
        request->send(response);
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
        String body;
        for (size_t i = 0; i < len; i++) body += (char)data[i];
        processActionPost(body);
    });

    // OPTIONS preflight for /action
    server.on("/action", HTTP_OPTIONS, [](AsyncWebServerRequest *request){
        AsyncWebServerResponse *response = request->beginResponse(204);
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        response->addHeader("Access-Control-Allow-Headers", "Content-Type");
        request->send(response);
    });
    server.on("/status.json", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        String payload = "{";
        payload += "\"uptime\":\"" + formatTimestamp() + "\",";
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
    server.onNotFound([](AsyncWebServerRequest *request) { request->send(404, "text/plain", "404 Not Found"); });
    server.on("/stream", AsyncWebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "text/plain", "Stream endpoint pending implementation");
    });
    server.begin();
    appendLogEntry(LOG_MONITORING, "========== SYSTEM START ==========");
}

void loop() {
    if (Serial1.available()) {
        String incomingData = Serial1.readStringUntil('\n');
        incomingData.trim();
        if (incomingData.length() > 0) {
            processAtmegaLine(incomingData);
        }
    }
}