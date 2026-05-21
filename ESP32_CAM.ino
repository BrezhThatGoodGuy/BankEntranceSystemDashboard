/*
====================================================================
ESP32-CAM WEB SERVER + LIVE CAMERA STREAM
Optimized for Flash Longevity & Stability
Added Automating Reverse Mode Directives Every 20 Seconds
====================================================================
*/

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <WebServer.h>
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
WebServer streamServer(81);

// ** NEW: Operational Mode Sequencer State Tracking **
unsigned long lastModeSwitchTime = 0;
const unsigned long modeSwitchInterval = 20000; // 20 Seconds in ms
int systemModeCounter = 0; 

// ==================================================
// LIVE HTML INTERFACE
// ==================================================
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
            fetch('/log.txt').then(r => r.text()).then(data => {
                const c = document.getElementById('log-container');
                c.textContent = data; c.scrollTop = c.scrollHeight;
            }).catch(e => { document.getElementById('log-container').textContent = "Error updating system logs..."; });
        }
        fetchLogs(); setInterval(fetchLogs, 2000);
    </script>
</body>
</html>
)rawhtml";

void appendLog(String text) {
    File file = LittleFS.open("/log.txt", FILE_APPEND);
    if (!file) {
        Serial.println("Failed to open log file");
        return;
    }
    file.print("["); file.print(millis()); file.print("] ");
    file.println(text);
    file.close();
}

void handleStream() {
    WiFiClient client = streamServer.client();
    String response = "HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
    client.print(response);
    Serial.println("Stream Client Disconnected");
}

// ==================================================
// SETUP
// ==================================================
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
        delay(3000); Serial.print(".");
    }
    Serial.println("\nWiFi Connected");

    server.serveStatic("/", LittleFS, "/").setDefaultFile("monitor.html");
    
    server.on("/log.html", WebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send_P(200, "text/html", log_html);
    });

    server.on("/log.txt", WebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request) {
        AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/log.txt", "text/plain");
        response->addHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response->addHeader("Content-Disposition", "inline");
        request->send(response);
    });

    server.onNotFound([](AsyncWebServerRequest *request) { request->send(404, "text/plain", "404 Not Found"); });

    server.begin();
    streamServer.on("/stream", http_method::HTTP_GET, handleStream);
    streamServer.begin();

    appendLog("========== SYSTEM START ==========");
    // Seed initial clock tracking flag
    lastModeSwitchTime = millis();
}

// ==================================================
// LOOP
// ==================================================
void loop() {
    streamServer.handleClient();

    // ==================================================
    // NEW: AUTOMATING REVERSE TRANSMISSION (EVERY 20s)
    // ==================================================
    if (millis() - lastModeSwitchTime >= modeSwitchInterval) {
        lastModeSwitchTime = millis();
        
        String commandString = "";
        String logLabel = "";

        // Cycle through all 5 operational conditions sequentially
        systemModeCounter = (systemModeCounter + 1) % 5;

        switch (systemModeCounter) {
            case 0:
                commandString = "SET_MODE_NORMAL";
                logLabel = "Normal Mode";
                break;
            case 1:
                commandString = "SET_MODE_EVAC";
                logLabel = "Evacuation";
                break;
            case 2:
                commandString = "SET_MODE_LOCK";
                logLabel = "Lock-down";
                break;
            case 3:
                commandString = "SET_MODE_CLOSED";
                logLabel = "Bank- Closed";
                break;
            case 4:
                commandString = "SET_MODE_STAFF";
                logLabel = "Staff Entry";
                break;
        }

        // Push instruction down to the ATmega controller
        Serial1.println(commandString);

        // Echo tracking to native monitor and structural log payload
        Serial.print("[Mode Trigger Sent]: "); Serial.println(commandString);
        appendLog("=======Mode changed to " + logLabel + "=======");
    }

    // ==================================================
    // READ ATMEGA UART DATA (NON-BLOCKING)
    // ==================================================
    if (Serial1.available()) {
        String incomingData = Serial1.readStringUntil('\n');
        incomingData.trim();
        
        if (incomingData.length() > 0) {
            Serial.print("[ATmega Serial Data Recv]: ");
            Serial.println(incomingData);
            appendLog("ATmega: " + incomingData);
        }
    }
}
