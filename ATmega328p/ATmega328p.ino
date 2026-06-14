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
#define DOOR1G A0
#define DOOR1R A4
#define DOOR2G 9
#define DOOR2R A1
#define DOOR3G 8
#define DOOR3R 4
#define DOOR4G 3
#define DOOR4R 2

// ==================================================
// INPUT PINS
// ==================================================
#define door1 A3
#define door2 A2
#define door3 7
#define door4 6

#define pirBooth1 10
#define pirBooth2 11

#define modeSelector A2

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

volatile bool eventDoor1Open  = false;
volatile bool eventDoor1Close = false;
volatile bool eventDoor2Open  = false;
volatile bool eventDoor2Close = false;
volatile bool eventDoor3Open  = false;
volatile bool eventDoor3Close = false;
volatile bool eventDoor4Open  = false;
volatile bool eventDoor4Close = false;

bool lastGreenState[4] = {false, false, false, false};
bool lastRedState[4] = {false, false, false, false};

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
        setDoorOutput(i, false, true);
      } else {
        if (booth2State == IDLE_FIRST_DOOR) setDoorOutput(i, true, false);
        else if (booth2State == SECOND_DOOR_ENABLED) setDoorOutput(i, false, true);
        else setDoorOutput(i, true, false);
      }
      continue;
    }

    if (currentMode == MODE_STAFF_ENTRY) {
      if (i == 2 || i == 3) {
        setDoorOutput(i, false, true);
      } else {
        if (booth1State == IDLE_FIRST_DOOR) setDoorOutput(i, true, false);
        else if (booth1State == SECOND_DOOR_ENABLED) setDoorOutput(i, false, true);
        else setDoorOutput(i, true, false);
      }
      continue;
    }

    if (i == 0) {
      if (booth1State == IDLE_FIRST_DOOR) setDoorOutput(i, true, false);
      else if (booth1State == SECOND_DOOR_ENABLED) setDoorOutput(i, false, true);
      else setDoorOutput(i, true, false);
    } else if (i == 1) {
      if (booth1State == SECOND_DOOR_ENABLED) setDoorOutput(i, true, false);
      else setDoorOutput(i, false, true);
    } else if (i == 2) {
      if (booth2State == IDLE_FIRST_DOOR) setDoorOutput(i, true, false);
      else if (booth2State == SECOND_DOOR_ENABLED) setDoorOutput(i, false, true);
      else setDoorOutput(i, true, false);
    } else if (i == 3) {
      if (booth2State == SECOND_DOOR_ENABLED) setDoorOutput(i, true, false);
      else setDoorOutput(i, false, true);
    }
  }
}

void processIncomingCommand(const String &command) {
  if (command == "SET_MODE_NORMAL") {
    currentMode = MODE_NORMAL;
  } else if (command == "SET_MODE_EVAC") {
    currentMode = MODE_EVACUATION;
  } else if (command == "SET_MODE_LOCK") {
    currentMode = MODE_LOCKDOWN;
  } else if (command == "SET_MODE_CLOSED") {
    currentMode = MODE_BANK_CLOSED;
  } else if (command == "SET_MODE_STAFF") {
    currentMode = MODE_STAFF_ENTRY;
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

ISR(PCINT1_vect) {
  unsigned long currentTime = millis();

  if ((currentTime - lastInterruptTime1) > debounceTime) {
    if (digitalRead(door1) == LOW) {
      if (booth1State == IDLE_FIRST_DOOR) {
        booth1State = WAIT_FIRST_DOOR_CLOSE;
        eventDoor1Open = true;
      }
      if (doorOverrideMode[0] == ONESHOT_UNLOCKED) {
        oneshotDoorOpened[0] = true;
      }
    } else {
      if (booth1State == WAIT_FIRST_DOOR_CLOSE) {
        booth1State = SECOND_DOOR_ENABLED;
        eventDoor1Close = true;
      }
      if (doorOverrideMode[0] == ONESHOT_UNLOCKED && oneshotDoorOpened[0]) {
        oneshotDoorOpened[0] = false;
        eventOneshotRevert[0] = true;
      }
    }
    lastInterruptTime1 = currentTime;
  }

  if ((currentTime - lastInterruptTime2) > debounceTime) {
    if (digitalRead(door2) == LOW) {
      if (booth1State == SECOND_DOOR_ENABLED) {
        booth1State = WAIT_SECOND_DOOR_CLOSE;
        eventDoor2Open = true;
      }
      if (doorOverrideMode[1] == ONESHOT_UNLOCKED) {
        oneshotDoorOpened[1] = true;
      }
    } else {
      if (booth1State == WAIT_SECOND_DOOR_CLOSE) {
        booth1State = IDLE_FIRST_DOOR;
        eventDoor2Close = true;
      }
      if (doorOverrideMode[1] == ONESHOT_UNLOCKED && oneshotDoorOpened[1]) {
        oneshotDoorOpened[1] = false;
        eventOneshotRevert[1] = true;
      }
    }
    lastInterruptTime2 = currentTime;
  }
}

ISR(PCINT2_vect) {
  unsigned long currentTime = millis();

  if ((currentTime - lastInterruptTime3) > debounceTime) {
    if (digitalRead(door3) == LOW) {
      if (booth2State == IDLE_FIRST_DOOR) {
        booth2State = WAIT_FIRST_DOOR_CLOSE;
        eventDoor3Open = true;
      }
      if (doorOverrideMode[2] == ONESHOT_UNLOCKED) {
        oneshotDoorOpened[2] = true;
      }
    } else {
      if (booth2State == WAIT_FIRST_DOOR_CLOSE) {
        booth2State = SECOND_DOOR_ENABLED;
        eventDoor3Close = true;
      }
      if (doorOverrideMode[2] == ONESHOT_UNLOCKED && oneshotDoorOpened[2]) {
        oneshotDoorOpened[2] = false;
        eventOneshotRevert[2] = true;
      }
    }
    lastInterruptTime3 = currentTime;
  }

  if ((currentTime - lastInterruptTime4) > debounceTime) {
    if (digitalRead(door4) == LOW) {
      if (booth2State == SECOND_DOOR_ENABLED) {
        booth2State = WAIT_SECOND_DOOR_CLOSE;
        eventDoor4Open = true;
      }
      if (doorOverrideMode[3] == ONESHOT_UNLOCKED) {
        oneshotDoorOpened[3] = true;
      }
    } else {
      if (booth2State == WAIT_SECOND_DOOR_CLOSE) {
        booth2State = IDLE_FIRST_DOOR;
        eventDoor4Close = true;
      }
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

  updateSystemLEDs();

  PCICR |= (1 << PCIE1);
  PCMSK1 |= (1 << PCINT10); PCMSK1 |= (1 << PCINT11);

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

  if (eventDoor1Open)  { Serial.println("DOOR_1_OPENED"); eventDoor1Open = false; }
  if (eventDoor1Close) { Serial.println("DOOR_1_CLOSED"); eventDoor1Close = false; }
  if (eventDoor2Open)  { Serial.println("DOOR_2_OPENED"); eventDoor2Open = false; }
  if (eventDoor2Close) {
    totalEntries++;
    Serial.println("DOOR_2_CLOSED");
    sendStatusUpdate();
    eventDoor2Close = false;
  }
  if (eventDoor3Open)  { Serial.println("DOOR_3_OPENED"); eventDoor3Open = false; }
  if (eventDoor3Close) { Serial.println("DOOR_3_CLOSED"); eventDoor3Close = false; }
  if (eventDoor4Open)  { Serial.println("DOOR_4_OPENED"); eventDoor4Open = false; }
  if (eventDoor4Close) {
    totalExits++;
    Serial.println("DOOR_4_CLOSED");
    sendStatusUpdate();
    eventDoor4Close = false;
  }

  // One-shot unlock: revert door to AUTO_MODE after it has been opened and closed once
  for (int i = 0; i < 4; i++) {
    if (eventOneshotRevert[i]) {
      eventOneshotRevert[i] = false;
      doorOverrideMode[i] = AUTO_MODE;
      Serial.println(String("DOOR_") + (i + 1) + "_AUTO");
    }
  }
}
