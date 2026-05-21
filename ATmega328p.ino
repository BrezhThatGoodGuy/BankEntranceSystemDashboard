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

// ** NEW: System Operational Modes **
enum OperationMode {
  MODE_NORMAL,
  MODE_EVACUATION,
  MODE_LOCKDOWN,
  MODE_BANK_CLOSED,
  MODE_STAFF_ENTRY
};

volatile BoothState booth1State = IDLE_FIRST_DOOR;
volatile BoothState booth2State = IDLE_FIRST_DOOR;
OperationMode currentMode = MODE_NORMAL; // Default mode

// ==================================================
// DEBOUNCE TIMERS & EVENT FLAGS
// ==================================================
volatile unsigned long lastInterruptTime1 = 0;
volatile unsigned long lastInterruptTime2 = 0;
volatile unsigned long lastInterruptTime3 = 0;
volatile unsigned long lastInterruptTime4 = 0;

volatile bool eventDoor1Open  = false; volatile bool eventDoor1Close = false;
volatile bool eventDoor2Open  = false; volatile bool eventDoor2Close = false;
volatile bool eventDoor3Open  = false; volatile bool eventDoor3Close = false;
volatile bool eventDoor4Open  = false; volatile bool eventDoor4Close = false;

// ==================================================
// LED UPDATE ROUTINE BASED ON OPERATIONAL MODE
// ==================================================
void updateSystemLEDs() {
  switch (currentMode) {
    
    case MODE_EVACUATION:
      // All green HIGH, All red LOW
      digitalWrite(DOOR1G, HIGH); digitalWrite(DOOR1R, LOW);
      digitalWrite(DOOR2G, HIGH); digitalWrite(DOOR2R, LOW);
      digitalWrite(DOOR3G, HIGH); digitalWrite(DOOR3R, LOW);
      digitalWrite(DOOR4G, HIGH); digitalWrite(DOOR4R, LOW);
      break;

    case MODE_LOCKDOWN:
      // All red HIGH, All green LOW
      digitalWrite(DOOR1G, LOW);  digitalWrite(DOOR1R, HIGH);
      digitalWrite(DOOR2G, LOW);  digitalWrite(DOOR2R, HIGH);
      digitalWrite(DOOR3G, LOW);  digitalWrite(DOOR3R, HIGH);
      digitalWrite(DOOR4G, LOW);  digitalWrite(DOOR4R, HIGH);
      break;

    case MODE_BANK_CLOSED:
      // Entry path locked (D1/D2 red)
      digitalWrite(DOOR1G, LOW);  digitalWrite(DOOR1R, HIGH);
      digitalWrite(DOOR2G, LOW);  digitalWrite(DOOR2R, HIGH);
      // Exit path operates normally (D3/D4 evaluation)
      if (booth2State == IDLE_FIRST_DOOR) {
        digitalWrite(DOOR3G, HIGH); digitalWrite(DOOR3R, LOW);
        digitalWrite(DOOR4G, LOW);  digitalWrite(DOOR4R, HIGH);
      } else if (booth2State == SECOND_DOOR_ENABLED) {
        digitalWrite(DOOR3G, LOW);  digitalWrite(DOOR3R, HIGH);
        digitalWrite(DOOR4G, HIGH); digitalWrite(DOOR4R, LOW);
      }
      break;

    case MODE_STAFF_ENTRY:
      // Exit path locked (D3/D4 red)
      digitalWrite(DOOR3G, LOW);  digitalWrite(DOOR3R, HIGH);
      digitalWrite(DOOR4G, LOW);  digitalWrite(DOOR4R, HIGH);
      // Entrance path operates normally (D1/D2 evaluation)
      if (booth1State == IDLE_FIRST_DOOR) {
        digitalWrite(DOOR1G, HIGH); digitalWrite(DOOR1R, LOW);
        digitalWrite(DOOR2G, LOW);  digitalWrite(DOOR2R, HIGH);
      } else if (booth1State == SECOND_DOOR_ENABLED) {
        digitalWrite(DOOR1G, LOW);  digitalWrite(DOOR1R, HIGH);
        digitalWrite(DOOR2G, HIGH); digitalWrite(DOOR2R, LOW);
      }
      break;

    case MODE_NORMAL:
    default:
      // Standard interlocking layout rules
      if (booth1State == IDLE_FIRST_DOOR) {
        digitalWrite(DOOR1G, HIGH); digitalWrite(DOOR1R, LOW);
        digitalWrite(DOOR2G, LOW);  digitalWrite(DOOR2R, HIGH);
      } else if (booth1State == SECOND_DOOR_ENABLED) {
        digitalWrite(DOOR1G, LOW);  digitalWrite(DOOR1R, HIGH);
        digitalWrite(DOOR2G, HIGH); digitalWrite(DOOR2R, LOW);
      }
      
      if (booth2State == IDLE_FIRST_DOOR) {
        digitalWrite(DOOR3G, HIGH); digitalWrite(DOOR3R, LOW);
        digitalWrite(DOOR4G, LOW);  digitalWrite(DOOR4R, HIGH);
      } else if (booth2State == SECOND_DOOR_ENABLED) {
        digitalWrite(DOOR3G, LOW);  digitalWrite(DOOR3R, HIGH);
        digitalWrite(DOOR4G, HIGH); digitalWrite(DOOR4R, LOW);
      }
      break;
  }
}

// ==================================================
// INTERRUPT SERVICE ROUTINES (STATE TRACKING ONLY)
// ==================================================
ISR(PCINT1_vect) {
  unsigned long currentTime = millis();

  if ((currentTime - lastInterruptTime1) > debounceTime) {
    if (digitalRead(door1) == LOW) {
      if (booth1State == IDLE_FIRST_DOOR) {
        booth1State = WAIT_FIRST_DOOR_CLOSE;
        eventDoor1Open = true;
      }
    } else {
      if (booth1State == WAIT_FIRST_DOOR_CLOSE) {
        booth1State = SECOND_DOOR_ENABLED;
        eventDoor1Close = true;
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
    } else {
      if (booth1State == WAIT_SECOND_DOOR_CLOSE) {
        booth1State = IDLE_FIRST_DOOR;
        eventDoor2Close = true;
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
    } else {
      if (booth2State == WAIT_FIRST_DOOR_CLOSE) {
        booth2State = SECOND_DOOR_ENABLED;
        eventDoor3Close = true;
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
    } else {
      if (booth2State == WAIT_SECOND_DOOR_CLOSE) {
        booth2State = IDLE_FIRST_DOOR;
        eventDoor4Close = true;
      }
    }
    lastInterruptTime4 = currentTime;
  }
}

// ==================================================
// SETUP
// ==================================================
void setup() {
  Serial.begin(9600); // TX/RX Pins 2 & 3 hardware mapping
  
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

// ==================================================
// MAIN LOOP - TRANSMIT LOGS & PARSE COMMANDS
// ==================================================
void loop() {
  
  // ** NEW: Check for Mode Directives from ESP32 **
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "SET_MODE_NORMAL")       currentMode = MODE_NORMAL;
    else if (command == "SET_MODE_EVAC")    currentMode = MODE_EVACUATION;
    else if (command == "SET_MODE_LOCK")    currentMode = MODE_LOCKDOWN;
    else if (command == "SET_MODE_CLOSED")  currentMode = MODE_BANK_CLOSED;
    else if (command == "SET_MODE_STAFF")   currentMode = MODE_STAFF_ENTRY;
  }

  // Refresh physical LED matrices based on current state & operational mode
  updateSystemLEDs();

  // ---- TRANSMIT DOOR EVENTS TO ESP32 ----
  if (eventDoor1Open)  { Serial.println("DOOR_1_OPENED"); eventDoor1Open = false; }
  if (eventDoor1Close) { Serial.println("DOOR_1_CLOSED"); eventDoor1Close = false; }
  if (eventDoor2Open)  { Serial.println("DOOR_2_OPENED"); eventDoor2Open = false; }
  if (eventDoor2Close) { Serial.println("DOOR_2_CLOSED"); eventDoor2Close = false; }
  if (eventDoor3Open)  { Serial.println("DOOR_3_OPENED"); eventDoor3Open = false; }
  if (eventDoor3Close) { Serial.println("DOOR_3_CLOSED"); eventDoor3Close = false; }
  if (eventDoor4Open)  { Serial.println("DOOR_4_OPENED"); eventDoor4Open = false; }
  if (eventDoor4Close) { Serial.println("DOOR_4_CLOSED"); eventDoor4Close = false; }
}