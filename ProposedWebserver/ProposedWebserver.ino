#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>
#include <SD_MMC.h>
#include <eloquent_esp32cam.h>
#include <eloquent_esp32cam/extra/esp32/fs/sdmmc.h>

using namespace eloq;

// Replace with your network credentials
const char* ssid = "brezhnev";
const char* password = "brezhnev02";
unsigned long previousMillis = 0;
const long interval = 5000; // Update images every 5 seconds

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);

// JSON File paths on SD card
const char* DOORS_FILE = "/data/doors.json";
const char* FAULTS_FILE = "/data/faults.json";
const char* LOGS_FILE = "/data/logs.json";
const char* MODE_FILE = "/data/mode.json";
const char* AI_CONFIG_FILE = "/data/ai-config.json";

// Default JSON structures
const char* DEFAULT_DOORS_JSON = R"({
  "doors": [
    {"id": 1, "name": "ENT.D1", "label": "Entrance Door 1", "state": "closed", "locked": true, "position": "entrance", "lastChanged": "2026-04-24T08:00:00Z"},
    {"id": 2, "name": "ENT.D2", "label": "Entrance Door 2", "state": "closed", "locked": true, "position": "entrance", "lastChanged": "2026-04-24T08:00:00Z"},
    {"id": 3, "name": "EXT.D3", "label": "Exit Door 3", "state": "closed", "locked": true, "position": "exit", "lastChanged": "2026-04-24T08:00:00Z"},
    {"id": 4, "name": "EXT.D4", "label": "Exit Door 4", "state": "closed", "locked": true, "position": "exit", "lastChanged": "2026-04-24T08:00:00Z"}
  ],
  "timestamp": "2026-04-24T08:00:00Z"
})";

const char* DEFAULT_FAULTS_JSON = R"({
  "faults": {
    "locks": [
      {"id": "EXT.D4 LOCK", "name": "EXT.D4 LOCK", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"},
      {"id": "ENT.D1 LOCK", "name": "ENT.D1 LOCK", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"},
      {"id": "EXT.D3 LOCK", "name": "EXT.D3 LOCK", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"},
      {"id": "ENT.D2 LOCK", "name": "ENT.D2 LOCK", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"}
    ],
    "motionControllers": [
      {"id": "EXT.D4 MC", "name": "EXT.D4 MC", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"},
      {"id": "ENT.D1 MC", "name": "ENT.D1 MC", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"},
      {"id": "EXT.D3 MC", "name": "EXT.D3 MC", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"},
      {"id": "ENT.D2 MC", "name": "ENT.D2 MC", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"}
    ],
    "pirSensors": [
      {"id": "BOOTH 1 PIR", "name": "BOOTH 1 PIR", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"},
      {"id": "BOOTH 2 PIR", "name": "BOOTH 2 PIR", "status": "normal", "lastChecked": "2026-04-24T08:00:00Z"}
    ]
  },
  "timestamp": "2026-04-24T08:00:00Z"
})";

const char* DEFAULT_LOGS_JSON = R"({
  "logs": [],
  "maxLogs": 50,
  "timestamp": "2026-04-24T08:00:00Z"
})";

const char* DEFAULT_MODE_JSON = R"({
  "mode": "normal",
  "label": "Normal-Traffic",
  "description": "Entrance and exit will be allowed and controlled",
  "timestamp": "2026-04-24T08:00:00Z"
})";

const char* DEFAULT_AI_CONFIG_JSON = R"({
  "aiSystem": {
    "enabled": false,
    "maskedFaceDetection": false,
    "weaponDetection": false,
    "aiDoorControl": false
  },
  "doorActions": {
    "weapon": {"1": "locked", "2": "locked", "3": "locked", "4": "locked"},
    "masked": {"1": "locked", "2": "locked", "3": "locked", "4": "locked"}
  },
  "timestamp": "2026-04-24T08:00:00Z"
})";

void setup() {
  Serial.begin(115200);
  Serial.println();

  // camera settings
  camera.pinout.aithinker();
  camera.brownout.disable();
  camera.resolution.vga();
  camera.quality.high();

  // Initialize SD Card
  if(!SD_MMC.begin()){
    Serial.println("CRITICAL ERROR: SD Card Mount Failed.");
    return;
  }

  // Initialize camera
  while (!camera.begin().isOk())
    Serial.println(camera.exception.toString());

  uint8_t cardType = SD_MMC.cardType();
  if(cardType == CARD_NONE){
    Serial.println("CRITICAL ERROR: No SD Card attached.");
    return;
  }
  Serial.println("SD Card Initialized Successfully.");

  // Initialize data directory and default files
  initializeDataFiles();

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");
  Serial.print("Access your server at: http://");
  Serial.println(WiFi.localIP());

  // Setup API endpoints
  setupAPIEndpoints();

  // Serve static files from SD card
  server.serveStatic("/", SD_MMC, "/data/").setDefaultFile("monitor.html");
   server.serveStatic("/", SD_MMC, "/api/").setDefaultFile("monitor.html");

  // Handle 404 Errors
  server.onNotFound([](AsyncWebServerRequest *request){
    request->send(404, "text/plain", "Error 404: File Not Found on SD Card.");
  });

  // Start the server
  server.begin();
  Serial.println("Async HTTP server started.");
}

// ========== DATA INITIALIZATION FUNCTIONS ==========

void initializeDataFiles() {
  // Create /data directory if it doesn't exist
  createDirectory("/data");
  
  // Initialize each JSON file if it doesn't exist
  if (!fileExists(DOORS_FILE)) {
    writeFile(SD_MMC, DOORS_FILE, DEFAULT_DOORS_JSON);
    Serial.println("Created doors.json");
  }
  if (!fileExists(FAULTS_FILE)) {
    writeFile(SD_MMC, FAULTS_FILE, DEFAULT_FAULTS_JSON);
    Serial.println("Created faults.json");
  }
  if (!fileExists(LOGS_FILE)) {
    writeFile(SD_MMC, LOGS_FILE, DEFAULT_LOGS_JSON);
    Serial.println("Created logs.json");
  }
  if (!fileExists(MODE_FILE)) {
    writeFile(SD_MMC, MODE_FILE, DEFAULT_MODE_JSON);
    Serial.println("Created mode.json");
  }
  if (!fileExists(AI_CONFIG_FILE)) {
    writeFile(SD_MMC, AI_CONFIG_FILE, DEFAULT_AI_CONFIG_JSON);
    Serial.println("Created ai-config.json");
  }
}

void createDirectory(const char* path) {
  if (!SD_MMC.exists(path)) {
    SD_MMC.mkdir(path);
    Serial.printf("Created directory: %s\n", path);
  }
}

bool fileExists(const char* path) {
  return SD_MMC.exists(path);
}

// ========== FILE OPERATIONS ==========

String readFileContent(fs::FS &fs, const char* path) {
  File file = fs.open(path, "r");
  if (!file) {
    Serial.printf("Failed to open file for reading: %s\n", path);
    return "";
  }
  
  String content = "";
  while (file.available()) {
    content += (char)file.read();
  }
  file.close();
  return content;
}

void writeFile(fs::FS &fs, const char* path, const char* content) {
  File file = fs.open(path, "w");
  if (!file) {
    Serial.printf("Failed to open file for writing: %s\n", path);
    return;
  }
  file.print(content);
  file.close();
  Serial.printf("Written to file: %s\n", path);
}

void appendToFile(fs::FS &fs, const char* path, const char* content) {
  File file = fs.open(path, "a");
  if (!file) {
    Serial.printf("Failed to open file for appending: %s\n", path);
    return;
  }
  file.print(content);
  file.close();
}

// ========== JSON PARSING HELPERS ==========

String getCurrentTimestamp() {
  // Simple timestamp in ISO format
  time_t now = time(nullptr);
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", localtime(&now));
  return String(buffer);
}

String extractJsonValue(const String& json, const String& key) {
  // Simple key-value extraction (not a full JSON parser)
  String searchKey = "\"" + key + "\"";
  int keyPos = json.indexOf(searchKey);
  if (keyPos == -1) return "";
  
  int colonPos = json.indexOf(":", keyPos);
  if (colonPos == -1) return "";
  
  int valueStart = colonPos + 1;
  while (valueStart < json.length() && (json[valueStart] == ' ' || json[valueStart] == '\t')) {
    valueStart++;
  }
  
  int valueEnd = valueStart;
  bool inString = false;
  while (valueEnd < json.length()) {
    char c = json[valueEnd];
    if (c == '"' && (valueEnd == 0 || json[valueEnd-1] != '\\')) {
      inString = !inString;
    }
    if (!inString && (c == ',' || c == '}' || c == '\n')) {
      break;
    }
    valueEnd++;
  }
  
  String value = json.substring(valueStart, valueEnd);
  value.trim();
  // Remove surrounding quotes if present
  if (value.startsWith("\"") && value.endsWith("\"")) {
    value = value.substring(1, value.length() - 1);
  }
  return value;
}

bool updateJsonField(const char* filePath, const String& key, const String& newValue) {
  String content = readFileContent(SD_MMC, filePath);
  if (content == "") return false;
  
  // Simple field update - replace value for the key
  String searchKey = "\"" + key + "\"";
  int keyPos = content.indexOf(searchKey);
  if (keyPos == -1) return false;
  
  int colonPos = content.indexOf(":", keyPos);
  if (colonPos == -1) return false;
  
  // Find the current value boundaries
  int valueStart = colonPos + 1;
  while (valueStart < content.length() && (content[valueStart] == ' ' || content[valueStart] == '\t')) {
    valueStart++;
  }
  
  bool isStringValue = (content[valueStart] == '"');
  int valueEnd = valueStart;
  if (isStringValue) {
    valueEnd = valueStart + 1;
    while (valueEnd < content.length()) {
      if (content[valueEnd] == '"' && content[valueEnd-1] != '\\') break;
      valueEnd++;
    }
    valueEnd++; // Include closing quote
  } else {
    while (valueEnd < content.length() && content[valueEnd] != ',' && content[valueEnd] != '}' && content[valueEnd] != '\n') {
      valueEnd++;
    }
  }
  
  // Build new content
  String prefix = content.substring(0, valueStart);
  String suffix = content.substring(valueEnd);
  String newContent = prefix + (isStringValue ? "\"" + newValue + "\"" : newValue) + suffix;
  
  writeFile(SD_MMC, filePath, newContent.c_str());
  return true;
}

// ========== API ENDPOINT SETUP ==========

void setupAPIEndpoints() {
  // ===== DOORS API =====
  server.on("/api/doors", HTTP_GET, [](AsyncWebServerRequest *request) {
    String doorsJson = readFileContent(SD_MMC, DOORS_FILE);
    request->send(200, "application/json", doorsJson);
  });

  server.on("/api/doors/update", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (request->hasParam("doorId", true) && request->hasParam("state", true)) {
      int doorId = request->getParam("doorId", true)->value().toInt();
      String state = request->getParam("state", true)->value();
      updateDoorState(doorId, state);
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Door state updated\"}");
    } else if (request->hasParam("locked", true) && request->hasParam("doorId", true)) {
      int doorId = request->getParam("doorId", true)->value().toInt();
      bool locked = (request->getParam("locked", true)->value() == "true");
      updateDoorLock(doorId, locked);
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Door lock updated\"}");
    } else {
      request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"Missing parameters\"}");
    }
  });

  // ===== MODE API =====
  server.on("/api/mode", HTTP_GET, [](AsyncWebServerRequest *request) {
    String modeJson = readFileContent(SD_MMC, MODE_FILE);
    request->send(200, "application/json", modeJson);
  });

  server.on("/api/mode/update", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (request->hasParam("mode", true)) {
      String mode = request->getParam("mode", true)->value();
      updateSystemMode(mode);
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Mode updated\"}");
    } else {
      request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"Missing mode parameter\"}");
    }
  });

  // ===== FAULTS API =====
  server.on("/api/faults", HTTP_GET, [](AsyncWebServerRequest *request) {
    String faultsJson = readFileContent(SD_MMC, FAULTS_FILE);
    request->send(200, "application/json", faultsJson);
  });

  server.on("/api/faults/update", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (request->hasParam("component", true) && request->hasParam("status", true)) {
      String component = request->getParam("component", true)->value();
      String status = request->getParam("status", true)->value();
      updateFaultStatus(component, status);
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Fault status updated\"}");
    } else {
      request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"Missing parameters\"}");
    }
  });

  // ===== AI CONFIG API =====
  server.on("/api/ai-config", HTTP_GET, [](AsyncWebServerRequest *request) {
    String aiConfigJson = readFileContent(SD_MMC, AI_CONFIG_FILE);
    request->send(200, "application/json", aiConfigJson);
  });

  server.on("/api/ai-config/update", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (request->hasParam("enabled", true)) {
      bool enabled = (request->getParam("enabled", true)->value() == "true");
      updateAIConfig("enabled", enabled ? "true" : "false");
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"AI config updated\"}");
    } else if (request->hasParam("maskedFaceDetection", true)) {
      bool enabled = (request->getParam("maskedFaceDetection", true)->value() == "true");
      updateAIConfig("maskedFaceDetection", enabled ? "true" : "false");
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"AI config updated\"}");
    } else if (request->hasParam("weaponDetection", true)) {
      bool enabled = (request->getParam("weaponDetection", true)->value() == "true");
      updateAIConfig("weaponDetection", enabled ? "true" : "false");
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"AI config updated\"}");
    } else {
      request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"Missing parameters\"}");
    }
  });

  // ===== LOGS API =====
  server.on("/api/logs", HTTP_GET, [](AsyncWebServerRequest *request) {
    String logsJson = readFileContent(SD_MMC, LOGS_FILE);
    request->send(200, "application/json", logsJson);
  });

  server.on("/api/logs/add", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (request->hasParam("message", true) && request->hasParam("type", true)) {
      String message = request->getParam("message", true)->value();
      String type = request->getParam("type", true)->value();
      addLogEntry(message, type);
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Log added\"}");
    } else {
      request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"Missing parameters\"}");
    }
  });

  server.on("/api/logs/clear", HTTP_POST, [](AsyncWebServerRequest *request) {
    clearLogs();
    request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Logs cleared\"}");
  });

  // ===== SYSTEM STATUS API =====
  server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    String statusJson = "{\"ip\":\"" + WiFi.localIP().toString() + "\",\"uptime\":" + String(millis()/1000) + ",\"freeHeap\":" + String(ESP.getFreeHeap()) + "}";
    request->send(200, "application/json", statusJson);
  });
}



// ========== DATA UPDATE FUNCTIONS ==========

void updateDoorState(int doorId, const String& state) {
  String content = readFileContent(SD_MMC, DOORS_FILE);
  
  // Find and update the specific door's state
  String searchId = "\"id\":" + String(doorId);
  int doorPos = content.indexOf(searchId);
  if (doorPos == -1) return;
  
  // Find the state field for this door
  int stateKeyPos = content.indexOf("\"state\"", doorPos);
  if (stateKeyPos == -1 || stateKeyPos > doorPos + 50) return;
  
  int colonPos = content.indexOf(":", stateKeyPos);
  int valueStart = colonPos + 1;
  while (valueStart < content.length() && (content[valueStart] == ' ' || content[valueStart] == '"')) {
    valueStart++;
  }
  
  int valueEnd = valueStart;
  while (valueEnd < content.length() && content[valueEnd] != '"') {
    valueEnd++;
  }
  
  String prefix = content.substring(0, valueStart);
  String suffix = content.substring(valueEnd + 1);
  String newContent = prefix + state + suffix;
  
  // Update timestamp
  int tsPos = newContent.lastIndexOf("\"timestamp\"");
  if (tsPos != -1) {
    int tsColon = newContent.indexOf(":", tsPos);
    int tsValueStart = tsColon + 1;
    while (tsValueStart < newContent.length() && (newContent[tsValueStart] == ' ' || newContent[tsValueStart] == '"')) {
      tsValueStart++;
    }
    int tsValueEnd = tsValueStart;
    while (tsValueEnd < newContent.length() && newContent[tsValueEnd] != '"') {
      tsValueEnd++;
    }
    String tsPrefix = newContent.substring(0, tsValueStart);
    String tsSuffix = newContent.substring(tsValueEnd + 1);
    newContent = tsPrefix + getCurrentTimestamp() + tsSuffix;
  }
  
  writeFile(SD_MMC, DOORS_FILE, newContent.c_str());
  addLogEntry("Door " + String(doorId) + " state changed to " + state, "door");
}

void updateDoorLock(int doorId, bool locked) {
  String content = readFileContent(SD_MMC, DOORS_FILE);
  
  String searchId = "\"id\":" + String(doorId);
  int doorPos = content.indexOf(searchId);
  if (doorPos == -1) return;
  
  int lockKeyPos = content.indexOf("\"locked\"", doorPos);
  if (lockKeyPos == -1 || lockKeyPos > doorPos + 50) return;
  
  int colonPos = content.indexOf(":", lockKeyPos);
  int valueStart = colonPos + 1;
  while (valueStart < content.length() && (content[valueStart] == ' ' || content[valueStart] == ' ')) {
    valueStart++;
  }
  
  int valueEnd = valueStart;
  while (valueEnd < content.length() && content[valueEnd] != ',' && content[valueEnd] != '}') {
    valueEnd++;
  }
  
  String prefix = content.substring(0, valueStart);
  String suffix = content.substring(valueEnd);
  String newContent = prefix + (locked ? "true" : "false") + suffix;
  
  writeFile(SD_MMC, DOORS_FILE, newContent.c_str());
  addLogEntry("Door " + String(doorId) + " lock set to " + String(locked ? "locked" : "unlocked"), "door");
}

void updateSystemMode(const String& mode) {
  String content = readFileContent(SD_MMC, MODE_FILE);
  
  int modePos = content.indexOf("\"mode\"");
  if (modePos == -1) return;
  
  int colonPos = content.indexOf(":", modePos);
  int valueStart = colonPos + 1;
  while (valueStart < content.length() && (content[valueStart] == ' ' || content[valueStart] == '"')) {
    valueStart++;
  }
  
  int valueEnd = valueStart;
  while (valueEnd < content.length() && content[valueEnd] != '"') {
    valueEnd++;
  }
  
  String prefix = content.substring(0, valueStart);
  String suffix = content.substring(valueEnd + 1);
  String newContent = prefix + mode + suffix;
  
  // Update timestamp
  int tsPos = newContent.lastIndexOf("\"timestamp\"");
  if (tsPos != -1) {
    int tsColon = newContent.indexOf(":", tsPos);
    int tsValueStart = tsColon + 1;
    while (tsValueStart < newContent.length() && (newContent[tsValueStart] == ' ' || newContent[tsValueStart] == '"')) {
      tsValueStart++;
    }
    int tsValueEnd = tsValueStart;
    while (tsValueEnd < newContent.length() && newContent[tsValueEnd] != '"') {
      tsValueEnd++;
    }
    String tsPrefix = newContent.substring(0, tsValueStart);
    String tsSuffix = newContent.substring(tsValueEnd + 1);
    newContent = tsPrefix + getCurrentTimestamp() + tsSuffix;
  }
  
  writeFile(SD_MMC, MODE_FILE, newContent.c_str());
  addLogEntry("System mode changed to " + mode, "mode");
}

void updateFaultStatus(const String& component, const String& status) {
  String content = readFileContent(SD_MMC, FAULTS_FILE);
  
  // Find component and update its status
  int compPos = content.indexOf("\"" + component + "\"");
  if (compPos == -1) return;
  
  int statusKeyPos = content.indexOf("\"status\"", compPos);
  if (statusKeyPos == -1 || statusKeyPos > compPos + 100) return;
  
  int colonPos = content.indexOf(":", statusKeyPos);
  int valueStart = colonPos + 1;
  while (valueStart < content.length() && (content[valueStart] == ' ' || content[valueStart] == '"')) {
    valueStart++;
  }
  
  int valueEnd = valueStart;
  while (valueEnd < content.length() && content[valueEnd] != '"') {
    valueEnd++;
  }
  
  String prefix = content.substring(0, valueStart);
  String suffix = content.substring(valueEnd + 1);
  String newContent = prefix + status + suffix;
  
  // Update lastChecked timestamp
  int checkedPos = content.indexOf("\"lastChecked\"", compPos);
  if (checkedPos != -1 && checkedPos < compPos + 100) {
    int checkedColon = content.indexOf(":", checkedPos);
    int checkedStart = checkedColon + 1;
    while (checkedStart < content.length() && (content[checkedStart] == ' ' || content[checkedStart] == '"')) {
      checkedStart++;
    }
    int checkedEnd = checkedStart;
    while (checkedEnd < content.length() && content[checkedEnd] != '"') {
      checkedEnd++;
    }
    String chPrefix = newContent.substring(0, checkedStart);
    String chSuffix = newContent.substring(checkedEnd + 1);
    newContent = chPrefix + getCurrentTimestamp() + chSuffix;
  }
  
  writeFile(SD_MMC, FAULTS_FILE, newContent.c_str());
  addLogEntry("Component " + component + " status: " + status, "fault");
}

void updateAIConfig(const String& key, const String& value) {
  String content = readFileContent(SD_MMC, AI_CONFIG_FILE);
  
  int keyPos = content.indexOf("\"" + key + "\"");
  if (keyPos == -1) return;
  
  int colonPos = content.indexOf(":", keyPos);
  int valueStart = colonPos + 1;
  while (valueStart < content.length() && (content[valueStart] == ' ' || content[valueStart] == ' ')) {
    valueStart++;
  }
  
  int valueEnd = valueStart;
  if (value == "true" || value == "false") {
    while (valueEnd < content.length() && content[valueEnd] != ',' && content[valueEnd] != '}') {
      valueEnd++;
    }
  } else {
    while (valueEnd < content.length() && content[valueEnd] != '"') {
      valueEnd++;
    }
  }
  
  String prefix = content.substring(0, valueStart);
  String suffix = content.substring(valueEnd);
  String newContent = prefix + value + suffix;
  
  // Update timestamp
  int tsPos = newContent.lastIndexOf("\"timestamp\"");
  if (tsPos != -1) {
    int tsColon = newContent.indexOf(":", tsPos);
    int tsValueStart = tsColon + 1;
    while (tsValueStart < newContent.length() && (newContent[tsValueStart] == ' ' || newContent[tsValueStart] == '"')) {
      tsValueStart++;
    }
    int tsValueEnd = tsValueStart;
    while (tsValueEnd < newContent.length() && newContent[tsValueEnd] != '"') {
      tsValueEnd++;
    }
    String tsPrefix = newContent.substring(0, tsValueStart);
    String tsSuffix = newContent.substring(tsValueEnd + 1);
    newContent = tsPrefix + getCurrentTimestamp() + tsSuffix;
  }
  
  writeFile(SD_MMC, AI_CONFIG_FILE, newContent.c_str());
  addLogEntry("AI Config " + key + " set to " + value, "ai");
}

void addLogEntry(const String& message, const String& type) {
  String content = readFileContent(SD_MMC, LOGS_FILE);
  
  // Find logs array
  int logsStart = content.indexOf("\"logs\":[");
  if (logsStart == -1) return;
  
  int arrayStart = logsStart + 8; // After "logs":[
  int arrayEnd = content.indexOf("]", arrayStart);
  if (arrayEnd == -1) arrayEnd = content.indexOf("]", logsStart + 9);
  
  // Create new log entry
  String newEntry = "{\"timestamp\":\"" + getCurrentTimestamp() + "\",\"type\":\"" + type + "\",\"message\":\"" + message + "\"}";
  
  String prefix = content.substring(0, arrayStart);
  String suffix = content.substring(arrayEnd);
  
  // Add comma if there are existing logs
  if (arrayStart < arrayEnd) {
    newEntry = ", " + newEntry;
  }
  
  String newContent = prefix + newEntry + suffix;
  
  // Update timestamp
  int tsPos = newContent.lastIndexOf("\"timestamp\"");
  if (tsPos != -1) {
    int tsColon = newContent.indexOf(":", tsPos);
    int tsValueStart = tsColon + 1;
    while (tsValueStart < newContent.length() && (newContent[tsValueStart] == ' ' || newContent[tsValueStart] == '"')) {
      tsValueStart++;
    }
    int tsValueEnd = tsValueStart;
    while (tsValueEnd < newContent.length() && newContent[tsValueEnd] != '"') {
      tsValueEnd++;
    }
    String tsPrefix = newContent.substring(0, tsValueStart);
    String tsSuffix = newContent.substring(tsValueEnd + 1);
    newContent = tsPrefix + getCurrentTimestamp() + tsSuffix;
  }
  
  writeFile(SD_MMC, LOGS_FILE, newContent.c_str());
}

void clearLogs() {
  String content = readFileContent(SD_MMC, LOGS_FILE);
  
  int logsStart = content.indexOf("\"logs\":[");
  if (logsStart == -1) return;
  
  int arrayStart = logsStart + 8;
  int arrayEnd = content.indexOf("]", arrayStart);
  if (arrayEnd == -1) arrayEnd = content.indexOf("]", logsStart + 9);
  
  String prefix = content.substring(0, arrayStart);
  String suffix = content.substring(arrayEnd + 1);
  String newContent = prefix + "]" + suffix;
  
  // Update timestamp
  int tsPos = newContent.lastIndexOf("\"timestamp\"");
  if (tsPos != -1) {
    int tsColon = newContent.indexOf(":", tsPos);
    int tsValueStart = tsColon + 1;
    while (tsValueStart < newContent.length() && (newContent[tsValueStart] == ' ' || newContent[tsValueStart] == '"')) {
      tsValueStart++;
    }
    int tsValueEnd = tsValueStart;
    while (tsValueEnd < newContent.length() && newContent[tsValueEnd] != '"') {
      tsValueEnd++;
    }
    String tsPrefix = newContent.substring(0, tsValueStart);
    String tsSuffix = newContent.substring(tsValueEnd + 1);
    newContent = tsPrefix + getCurrentTimestamp() + tsSuffix;
  }
  
  writeFile(SD_MMC, LOGS_FILE, newContent.c_str());
  addLogEntry("Logs cleared", "system");
}

// ========== IMAGE MANAGEMENT FUNCTIONS ==========

void deleteOldest(fs::FS &fs, const char *third) {
  Serial.printf("Deleting file: %s\n", third);
  if (fs.remove(third)) {
    Serial.println("Deleted Oldest third");
  } else {
    Serial.println("Delete failed");
  }
}

void renameSecond(fs::FS &fs, const char *second, const char *third) {
  Serial.printf("Renaming file %s to %s\n", second, third);
  if (fs.rename(second, third)) {
    Serial.println("second renamed to third");
  } else {
    Serial.println("Rename failed");
  }
}

void renameFirst(fs::FS &fs, const char *first, const char *second) {
  Serial.printf("Renaming file %s to %s\n", first, second);
  if (fs.rename(first, second)) {
    Serial.println("1st renamed to second");
  } else {
    Serial.println("Rename failed");
  }
}

void renameRecent(fs::FS &fs, const char *recent, const char *first) {
  Serial.printf("Renaming file %s to %s\n", recent, first);
  if (fs.rename(recent, first)) {
    Serial.println("Recent renamed to 1st");
  } else {
    Serial.println("Rename failed");
  }
}

void updateImages() {
  if (!camera.capture().isOk()) {
    Serial.println(camera.exception.toString());
    return;
  }

  if (sdmmc.save(camera.frame).to("/recent.jpg").isOk()) {
    Serial.println("Took a recent Picture");
    deleteOldest(SD_MMC, "/third.jpg");
    renameSecond(SD_MMC, "/second.jpg", "/third.jpg");
    renameFirst(SD_MMC, "/first.jpg", "/second.jpg");
    renameRecent(SD_MMC, "/recent.jpg", "/first.jpg");
  } else {
    Serial.println("tried to capture");
  }
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    updateImages();
  }
}
