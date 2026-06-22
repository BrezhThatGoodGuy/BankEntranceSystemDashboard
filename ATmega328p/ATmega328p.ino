/*
====================================================================
 ATmega328P Dual Interlocking Door Controller
 Bidirectional UART + Operational Modes Switch
 PULL-DOWN RESISTOR INPUT VERSION + ESP32 LOGGING & CONTROL
====================================================================
*/

// ==================================================
// OUTPUT PINS
// ==================================================
#define DOOR1G A0   // physical pin 23 (PC0)
#define DOOR1R A4   // physical pin 27 (PC4)
#define DOOR2G 9    // physical pin 15 (PB1)
#define DOOR2R A1   // physical pin 24 (PC1)
#define DOOR3G 8    // physical pin 14 (PB0)
#define DOOR3R 4    // physical pin  6 (PD4)
#define DOOR4G 3    // physical pin  5 (PD3)
#define DOOR4R 2    // physical pin  4 (PD2)

// ==================================================
// INPUT PINS
// ==================================================
#define door1 A3    // physical pin 26 (PC3)
#define door2 13    // physical pin 19 (PB5)
#define door3 7     // physical pin 13 (PD7)
#define door4 6     // physical pin 12 (PD6)

#define pirBooth1 10  // physical pin 16 (PB2)
#define pirBooth2 11  // physical pin 17 (PB3)

#define modeSelector A2  // physical pin 25 (PC2)

// ==================================================
// DEBOUNCE TIME
// ==================================================
const unsigned long debounceTime = 50;

// ==================================================
// STATE MACHINE & MODES
// ==================================================
enum BoothState {
  IDLE_FIRST_DOOR,
  WAIT_FIRST_DOOR_CLOSE,
  WAIT_PIR_CONFIRM,        // first door closed; waiting for PIR to confirm occupant
  SECOND_DOOR_ENABLED,
  WAIT_SECOND_DOOR_CLOSE
};

enum OperationMode {
  MODE_NORMAL,
  MODE_EVACUATION,
  MODE_LOCKDOWN,
  MODE_BANK_CLOSED,
  MODE_STAFF_ENTRY
};

enum DoorOverrideMode {
  AUTO_MODE,
  FORCE_LOCKED,
  FORCE_UNLOCKED,
  ONESHOT_UNLOCKED  // unlocked for one door cycle, then reverts to AUTO_MODE
};

volatile BoothState booth1State = IDLE_FIRST_DOOR;
volatile BoothState booth2State = IDLE_FIRST_DOOR;
OperationMode currentMode = MODE_NORMAL;
volatile DoorOverrideMode doorOverrideMode[4] = {AUTO_MODE, AUTO_MODE, AUTO_MODE, AUTO_MODE};

// One-shot unlock tracking: set in ISR, cleared in loop()
volatile bool oneshotDoorOpened[4]  = {false, false, false, false};
volatile bool eventOneshotRevert[4] = {false, false, false, false};

// ==================================================
// DEBOUNCE TIMERS & EVENT FLAGS
// ==================================================
volatile unsigned long lastInterruptTime1 = 0;
volatile unsigned long lastInterruptTime2 = 0;
volatile unsigned long lastInterruptTime3 = 0;
volatile unsigned long lastInterruptTime4 = 0;
volatile unsigned long lastModeSelectorTime = 0;

volatile bool eventModeSelectorChange = false;
volatile bool eventDoor1Open  = false;
volatile bool eventDoor1Close = false;
volatile bool eventDoor2Open  = false;
volatile bool eventDoor2Close = false;
volatile bool eventDoor3Open  = false;
volatile bool eventDoor3Close = false;
volatile bool eventDoor4Open  = false;
volatile bool eventDoor4Close = false;

// PIR booth occupancy — written in ISR, read in loop
volatile bool pir1State       = false;
volatile bool pir2State       = false;
volatile bool eventPir1Change = false;
volatile bool eventPir2Change = false;
volatile unsigned long lastPir1Time = 0;
volatile unsigned long lastPir2Time = 0;

// PIR confirmation timeout — if PIR never goes HIGH after first door closes, reset after 7 s
volatile unsigned long booth1PirWaitStart = 0;
volatile unsigned long booth2PirWaitStart = 0;
const unsigned long pirWaitTimeout = 7000UL;

// PIR health: count consecutive timeouts; 5 in a row without a successful detection = fault
volatile bool eventPir1Success = false;   // set in ISR when PIR1 fires during WAIT_PIR_CONFIRM
volatile bool eventPir2Success = false;
uint8_t pir1TimeoutCount = 0;
uint8_t pir2TimeoutCount = 0;
bool    pir1FaultActive  = false;
bool    pir2FaultActive  = false;
const uint8_t PIR_FAULT_THRESHOLD = 5;

bool lastGreenState[4] = {false, false, false, false};
bool lastRedState[4]   = {false, false, false, false};

// Lock fault detection
bool faultActive[4] = {false, false, false, false};
unsigned long lastModeChangeTime  = 0;
const unsigned long modeFaultGrace = 200;

// MC fault detection — Method 3 progressive timer (thresholds in flash)
const unsigned long MC_THRESHOLDS[] PROGMEM = {5000UL, 15000UL, 35000UL, 65000UL, 125000UL};
unsigned long mcOpenTime[4]   = {0, 0, 0, 0};
uint8_t       mcCheckStage[4] = {0, 0, 0, 0};
bool          mcFaultSent[4]  = {false, false, false, false};

const char* doorNames[4] = {"ENT.D1", "ENT.D2", "EXT.D3", "EXT.D4"};

// Counters for monitor display
int totalEntries = 0;
int totalExits = 0;
int clientsInside = 0;

void sendStatusUpdate() {
  clientsInside = totalEntries - totalExits;
  Serial.print("STATS:ENTRIES=");
  Serial.print(totalEntries);
  Serial.print(";EXITS=");
  Serial.print(totalExits);
  Serial.print(";INSIDE=");
  Serial.println(clientsInside);
}

// ==================================================
// LED UPDATE ROUTINE BASED ON OPERATIONAL MODE
// ==================================================

void setDoorOutput(int index, bool leftGreen, bool leftRed) {
  const int greenPins[4] = {DOOR1G, DOOR2G, DOOR3G, DOOR4G};
  const int redPins[4] = {DOOR1R, DOOR2R, DOOR3R, DOOR4R};

  digitalWrite(greenPins[index], leftGreen ? HIGH : LOW);
  digitalWrite(redPins[index], leftRed ? HIGH : LOW);

  if (lastGreenState[index] != leftGreen || lastRedState[index] != leftRed) {
    lastGreenState[index] = leftGreen;
    lastRedState[index] = leftRed;
    if (leftGreen && !leftRed) {
      Serial.println(String("DOOR_") + (index + 1) + "_UNLOCKED");
    } else if (!leftGreen && leftRed) {
      Serial.println(String("DOOR_") + (index + 1) + "_LOCKED");
    }
  }
}

void updateSystemLEDs() {
  for (int i = 0; i < 4; i++) {
    if (doorOverrideMode[i] == FORCE_UNLOCKED || doorOverrideMode[i] == ONESHOT_UNLOCKED) {
      setDoorOutput(i, true, false);
      continue;
    }
    if (doorOverrideMode[i] == FORCE_LOCKED) {
      setDoorOutput(i, false, true);
      continue;
    }

    if (currentMode == MODE_EVACUATION) {
      setDoorOutput(i, true, false);
      continue;
    }

    if (currentMode == MODE_LOCKDOWN) {
      setDoorOutput(i, false, true);
      continue;
    }

    if (currentMode == MODE_BANK_CLOSED) {
      if (i == 0 || i == 1) {
        setDoorOutput(i, false, true);                              // Entry booth always locked
      } else if (i == 2) {
        // Exit booth entry door: green only while idle or door is physically open
        if (booth2State == IDLE_FIRST_DOOR || booth2State == WAIT_FIRST_DOOR_CLOSE)
          setDoorOutput(i, true, false);
        else
          setDoorOutput(i, false, true);
      } else {
        // Exit booth outer door: green only when person is in vestibule
        if (booth2State == SECOND_DOOR_ENABLED) setDoorOutput(i, true, false);
        else                                     setDoorOutput(i, false, true);
      }
      continue;
    }

    if (currentMode == MODE_STAFF_ENTRY) {
      if (i == 2 || i == 3) {
        setDoorOutput(i, false, true);                              // Exit booth always locked
      } else if (i == 0) {
        // Entry booth outer door: green only while idle or door is physically open
        if (booth1State == IDLE_FIRST_DOOR || booth1State == WAIT_FIRST_DOOR_CLOSE)
          setDoorOutput(i, true, false);
        else
          setDoorOutput(i, false, true);
      } else {
        // Entry booth inner door: green only when person is in vestibule
        if (booth1State == SECOND_DOOR_ENABLED) setDoorOutput(i, true, false);
        else                                     setDoorOutput(i, false, true);
      }
      continue;
    }

    if (i == 0) {
      // Outer entry door: green only while idle or door is physically open;
      // must stay red while someone is in the vestibule (incl. while door 2 is open)
      if (booth1State == IDLE_FIRST_DOOR || booth1State == WAIT_FIRST_DOOR_CLOSE)
        setDoorOutput(i, true, false);
      else
        setDoorOutput(i, false, true);
    } else if (i == 1) {
      if (booth1State == SECOND_DOOR_ENABLED) setDoorOutput(i, true, false);
      else                                     setDoorOutput(i, false, true);
    } else if (i == 2) {
      // Outer exit door: green only while idle or door is physically open;
      // must stay red while someone is in the vestibule (incl. while door 4 is open)
      if (booth2State == IDLE_FIRST_DOOR || booth2State == WAIT_FIRST_DOOR_CLOSE)
        setDoorOutput(i, true, false);
      else
        setDoorOutput(i, false, true);
    } else if (i == 3) {
      if (booth2State == SECOND_DOOR_ENABLED) setDoorOutput(i, true, false);
      else                                     setDoorOutput(i, false, true);
    }
  }
}

void processIncomingCommand(const String &command) {
  if (command == "SET_MODE_NORMAL") {
    currentMode = MODE_NORMAL;           lastModeChangeTime = millis();
  } else if (command == "SET_MODE_EVAC") {
    currentMode = MODE_EVACUATION;       lastModeChangeTime = millis();
  } else if (command == "SET_MODE_LOCK") {
    currentMode = MODE_LOCKDOWN;         lastModeChangeTime = millis();
  } else if (command == "SET_MODE_CLOSED") {
    currentMode = MODE_BANK_CLOSED;      lastModeChangeTime = millis();
  } else if (command == "SET_MODE_STAFF") {
    currentMode = MODE_STAFF_ENTRY;      lastModeChangeTime = millis();
  } else if (command.startsWith("DOOR_")) {
    int doorId = command.substring(5, 6).toInt();
    if (doorId >= 1 && doorId <= 4) {
      if (command.endsWith("_LOCKED")) {
        doorOverrideMode[doorId - 1] = FORCE_LOCKED;
        oneshotDoorOpened[doorId - 1] = false;
      } else if (command.endsWith("_UNLOCKED")) {
        doorOverrideMode[doorId - 1] = FORCE_UNLOCKED;
        oneshotDoorOpened[doorId - 1] = false;
      } else if (command.endsWith("_AUTO")) {
        doorOverrideMode[doorId - 1] = AUTO_MODE;
        oneshotDoorOpened[doorId - 1] = false;
      } else if (command.endsWith("_UNLOCK_ONCE")) {
        oneshotDoorOpened[doorId - 1] = false;
        eventOneshotRevert[doorId - 1] = false;
        doorOverrideMode[doorId - 1] = ONESHOT_UNLOCKED;
      }
    }
  }
}

void checkMcFaults() {
  unsigned long now = millis();
  for (uint8_t i = 0; i < 4; i++) {
    if (!mcOpenTime[i] || mcCheckStage[i] >= 5) continue;
    if (now - mcOpenTime[i] >= pgm_read_dword(&MC_THRESHOLDS[mcCheckStage[i]])) {
      Serial.print("FAULT_MC_"); Serial.println(i + 1);
      mcCheckStage[i]++;
      mcFaultSent[i] = true;
    }
  }
}

// Handles PIR booth sensors on D10 (pirBooth1) and D11 (pirBooth2)
ISR(PCINT0_vect) {
  unsigned long currentTime = millis();

  // door2 = D13 (PB5/PCINT5)
  if ((currentTime - lastInterruptTime2) > debounceTime) {
    if (digitalRead(door2) == LOW) {
      if (booth1State == SECOND_DOOR_ENABLED) booth1State = WAIT_SECOND_DOOR_CLOSE;
      eventDoor2Open = true;
      if (doorOverrideMode[1] == ONESHOT_UNLOCKED) oneshotDoorOpened[1] = true;
    } else {
      if (booth1State == WAIT_SECOND_DOOR_CLOSE) booth1State = IDLE_FIRST_DOOR;
      eventDoor2Close = true;
      if (doorOverrideMode[1] == ONESHOT_UNLOCKED && oneshotDoorOpened[1]) {
        oneshotDoorOpened[1] = false;
        eventOneshotRevert[1] = true;
      }
    }
    lastInterruptTime2 = currentTime;
  }

  // pirBooth1 = D10 (PB2/PCINT2)
  if ((currentTime - lastPir1Time) > debounceTime) {
    bool reading = digitalRead(pirBooth1) == HIGH;
    if (reading != pir1State) {
      pir1State = reading;
      eventPir1Change = true;
      lastPir1Time = currentTime;
      if (reading && booth1State == WAIT_PIR_CONFIRM) {
        booth1State = SECOND_DOOR_ENABLED;
        eventPir1Success = true;
      }
    }
  }

  // pirBooth2 = D11 (PB3/PCINT3)
  if ((currentTime - lastPir2Time) > debounceTime) {
    bool reading = digitalRead(pirBooth2) == HIGH;
    if (reading != pir2State) {
      pir2State = reading;
      eventPir2Change = true;
      lastPir2Time = currentTime;
      if (reading && booth2State == WAIT_PIR_CONFIRM) {
        booth2State = SECOND_DOOR_ENABLED;
        eventPir2Success = true;
      }
    }
  }
}

ISR(PCINT1_vect) {
  unsigned long currentTime = millis();

  // modeSelector = A2 (PC2/PCINT10)
  if ((currentTime - lastModeSelectorTime) > debounceTime) {
    eventModeSelectorChange = true;
    lastModeSelectorTime = currentTime;
  }

  if ((currentTime - lastInterruptTime1) > debounceTime) {
    if (digitalRead(door1) == LOW) {
      if (booth1State == IDLE_FIRST_DOOR) booth1State = WAIT_FIRST_DOOR_CLOSE;
      eventDoor1Open = true;
      if (doorOverrideMode[0] == ONESHOT_UNLOCKED) oneshotDoorOpened[0] = true;
    } else {
      if (booth1State == WAIT_FIRST_DOOR_CLOSE) {
        if (pir1State) {
          booth1State = SECOND_DOOR_ENABLED;
        } else {
          booth1State = WAIT_PIR_CONFIRM;
          booth1PirWaitStart = currentTime;
        }
      }
      eventDoor1Close = true;
      if (doorOverrideMode[0] == ONESHOT_UNLOCKED && oneshotDoorOpened[0]) {
        oneshotDoorOpened[0] = false;
        eventOneshotRevert[0] = true;
      }
    }
    lastInterruptTime1 = currentTime;
  }
}

ISR(PCINT2_vect) {
  unsigned long currentTime = millis();

  if ((currentTime - lastInterruptTime3) > debounceTime) {
    if (digitalRead(door3) == LOW) {
      if (booth2State == IDLE_FIRST_DOOR) booth2State = WAIT_FIRST_DOOR_CLOSE;
      eventDoor3Open = true;
      if (doorOverrideMode[2] == ONESHOT_UNLOCKED) oneshotDoorOpened[2] = true;
    } else {
      if (booth2State == WAIT_FIRST_DOOR_CLOSE) {
        if (pir2State) {
          booth2State = SECOND_DOOR_ENABLED;
        } else {
          booth2State = WAIT_PIR_CONFIRM;
          booth2PirWaitStart = currentTime;
        }
      }
      eventDoor3Close = true;
      if (doorOverrideMode[2] == ONESHOT_UNLOCKED && oneshotDoorOpened[2]) {
        oneshotDoorOpened[2] = false;
        eventOneshotRevert[2] = true;
      }
    }
    lastInterruptTime3 = currentTime;
  }

  if ((currentTime - lastInterruptTime4) > debounceTime) {
    if (digitalRead(door4) == LOW) {
      if (booth2State == SECOND_DOOR_ENABLED) booth2State = WAIT_SECOND_DOOR_CLOSE;
      eventDoor4Open = true;
      if (doorOverrideMode[3] == ONESHOT_UNLOCKED) oneshotDoorOpened[3] = true;
    } else {
      if (booth2State == WAIT_SECOND_DOOR_CLOSE) booth2State = IDLE_FIRST_DOOR;
      eventDoor4Close = true;
      if (doorOverrideMode[3] == ONESHOT_UNLOCKED && oneshotDoorOpened[3]) {
        oneshotDoorOpened[3] = false;
        eventOneshotRevert[3] = true;
      }
    }
    lastInterruptTime4 = currentTime;
  }
}

void setup() {
  Serial.begin(9600);

  pinMode(DOOR1G, OUTPUT); pinMode(DOOR1R, OUTPUT);
  pinMode(DOOR2G, OUTPUT); pinMode(DOOR2R, OUTPUT);
  pinMode(DOOR3G, OUTPUT); pinMode(DOOR3R, OUTPUT);
  pinMode(DOOR4G, OUTPUT); pinMode(DOOR4R, OUTPUT);

  pinMode(door1, INPUT); pinMode(door2, INPUT);
  pinMode(door3, INPUT); pinMode(door4, INPUT);
  pinMode(pirBooth1, INPUT);
  pinMode(pirBooth2, INPUT);
  pinMode(modeSelector, INPUT);

  updateSystemLEDs();

  PCICR  |= (1 << PCIE0);
  PCMSK0 |= (1 << PCINT2);  // pirBooth1 = D10 (PB2)
  PCMSK0 |= (1 << PCINT3);  // pirBooth2 = D11 (PB3)
  PCMSK0 |= (1 << PCINT5);  // door2     = D13 (PB5)

  PCICR |= (1 << PCIE1);
  PCMSK1 |= (1 << PCINT10); // modeSelector = A2 (PC2)
  PCMSK1 |= (1 << PCINT11); // door1 = A3 (PC3)

  PCICR |= (1 << PCIE2);
  PCMSK2 |= (1 << PCINT22); PCMSK2 |= (1 << PCINT23);

  sei();
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    if (command.length() > 0) {
      processIncomingCommand(command);
    }
  }

  updateSystemLEDs();

  if (eventDoor1Open) {
    unsigned long _t = millis();
    Serial.println("DOOR_1_OPENED");
    if (lastRedState[0] && !faultActive[0] && (_t - lastModeChangeTime > modeFaultGrace)) {
      Serial.println("FAULT_LOCK_1"); faultActive[0] = true;
    }
    mcOpenTime[0] = _t ? _t : 1; mcCheckStage[0] = 0; mcFaultSent[0] = false;
    eventDoor1Open = false;
  }
  if (eventDoor1Close) {
    Serial.println("DOOR_1_CLOSED");
    if (faultActive[0]) { Serial.println("FAULT_LOCK_1_CLEAR"); faultActive[0] = false; }
    if (mcFaultSent[0]) { Serial.println("FAULT_MC_1_CLEAR");   mcFaultSent[0] = false; }
    mcOpenTime[0] = 0;
    eventDoor1Close = false;
  }

  if (eventDoor2Open) {
    unsigned long _t = millis();
    Serial.println("DOOR_2_OPENED");
    if (lastRedState[1] && !faultActive[1] && (_t - lastModeChangeTime > modeFaultGrace)) {
      Serial.println("FAULT_LOCK_2"); faultActive[1] = true;
    }
    mcOpenTime[1] = _t ? _t : 1; mcCheckStage[1] = 0; mcFaultSent[1] = false;
    eventDoor2Open = false;
  }
  if (eventDoor2Close) {
    totalEntries++;
    Serial.println("DOOR_2_CLOSED");
    if (faultActive[1]) { Serial.println("FAULT_LOCK_2_CLEAR"); faultActive[1] = false; }
    if (mcFaultSent[1]) { Serial.println("FAULT_MC_2_CLEAR");   mcFaultSent[1] = false; }
    mcOpenTime[1] = 0;
    sendStatusUpdate();
    eventDoor2Close = false;
  }

  if (eventDoor3Open) {
    unsigned long _t = millis();
    Serial.println("DOOR_3_OPENED");
    if (lastRedState[2] && !faultActive[2] && (_t - lastModeChangeTime > modeFaultGrace)) {
      Serial.println("FAULT_LOCK_3"); faultActive[2] = true;
    }
    mcOpenTime[2] = _t ? _t : 1; mcCheckStage[2] = 0; mcFaultSent[2] = false;
    eventDoor3Open = false;
  }
  if (eventDoor3Close) {
    Serial.println("DOOR_3_CLOSED");
    if (faultActive[2]) { Serial.println("FAULT_LOCK_3_CLEAR"); faultActive[2] = false; }
    if (mcFaultSent[2]) { Serial.println("FAULT_MC_3_CLEAR");   mcFaultSent[2] = false; }
    mcOpenTime[2] = 0;
    eventDoor3Close = false;
  }

  if (eventDoor4Open) {
    unsigned long _t = millis();
    Serial.println("DOOR_4_OPENED");
    if (lastRedState[3] && !faultActive[3] && (_t - lastModeChangeTime > modeFaultGrace)) {
      Serial.println("FAULT_LOCK_4"); faultActive[3] = true;
    }
    mcOpenTime[3] = _t ? _t : 1; mcCheckStage[3] = 0; mcFaultSent[3] = false;
    eventDoor4Open = false;
  }
  if (eventDoor4Close) {
    totalExits++;
    Serial.println("DOOR_4_CLOSED");
    if (faultActive[3]) { Serial.println("FAULT_LOCK_4_CLEAR"); faultActive[3] = false; }
    if (mcFaultSent[3]) { Serial.println("FAULT_MC_4_CLEAR");   mcFaultSent[3] = false; }
    mcOpenTime[3] = 0;
    sendStatusUpdate();
    eventDoor4Close = false;
  }

  if (eventPir1Change) {
    Serial.println(pir1State ? "BOOTH_1_OCCUPIED" : "BOOTH_1_VACANT");
    eventPir1Change = false;
  }
  if (eventPir2Change) {
    Serial.println(pir2State ? "BOOTH_2_OCCUPIED" : "BOOTH_2_VACANT");
    eventPir2Change = false;
  }

  checkMcFaults();

  // PIR confirmation timeout: if nobody detected within 7 s of first door closing, reset booth
  unsigned long _now = millis();
  if (booth1State == WAIT_PIR_CONFIRM && (_now - booth1PirWaitStart) >= pirWaitTimeout) {
    booth1State = IDLE_FIRST_DOOR;
    if (!pir1FaultActive) {
      pir1TimeoutCount++;
      if (pir1TimeoutCount >= PIR_FAULT_THRESHOLD) {
        pir1FaultActive = true;
        Serial.println("FAULT_PIR_1");
      }
    }
  }
  if (booth2State == WAIT_PIR_CONFIRM && (_now - booth2PirWaitStart) >= pirWaitTimeout) {
    booth2State = IDLE_FIRST_DOOR;
    if (!pir2FaultActive) {
      pir2TimeoutCount++;
      if (pir2TimeoutCount >= PIR_FAULT_THRESHOLD) {
        pir2FaultActive = true;
        Serial.println("FAULT_PIR_2");
      }
    }
  }

  // PIR success: reset timeout counter; clear fault if previously raised
  if (eventPir1Success) {
    pir1TimeoutCount = 0;
    if (pir1FaultActive) { pir1FaultActive = false; Serial.println("FAULT_PIR_1_CLEAR"); }
    eventPir1Success = false;
  }
  if (eventPir2Success) {
    pir2TimeoutCount = 0;
    if (pir2FaultActive) { pir2FaultActive = false; Serial.println("FAULT_PIR_2_CLEAR"); }
    eventPir2Success = false;
  }

  // One-shot unlock: revert door to AUTO_MODE after it has been opened and closed once
  for (int i = 0; i < 4; i++) {
    if (eventOneshotRevert[i]) {
      eventOneshotRevert[i] = false;
      doorOverrideMode[i] = AUTO_MODE;
      Serial.println(String("DOOR_") + (i + 1) + "_AUTO");
    }
  }

  if (eventModeSelectorChange) {
    currentMode = (OperationMode)((currentMode + 1) % 5);
    lastModeChangeTime = millis();
    static const char* const modeNames[] = {"NORMAL", "EVACUATION", "LOCKDOWN", "BANK_CLOSED", "STAFF_ENTRY"};
    Serial.print("MODE_SELECTOR:");
    Serial.println(modeNames[currentMode]);
    updateSystemLEDs();
    eventModeSelectorChange = false;
  }
}
