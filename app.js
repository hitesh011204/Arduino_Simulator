// ===============================
// GLOBAL STATE
// ===============================
const canvas = document.getElementById("canvas");
const components = document.querySelectorAll(".component");
const simToggleBtn = document.getElementById("simToggleBtn");

let isRunning = false;

// dragging
let dragTarget = null;
let offsetX = 0;
let offsetY = 0;

// wiring
const connections = [];

// pin assignment
const pinState = {
  led: 10,
  button: 2
};

// logic simulation state
const pinValues = {}; // pin number -> true(HIGH)/false(LOW)

// component references
let arduinoRef = null;
let ledRef = null;
let buttonRef = null;

// ===============================
// CODE VIEW ELEMENTS
// ===============================
const viewSelector = document.getElementById("viewSelector");
const componentsView = document.getElementById("componentsView");
const codeView = document.getElementById("codeView");
const arduinoCode = document.getElementById("arduinoCode");

// ===============================
// SVG WIRE LAYER
// ===============================
const wireLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
wireLayer.style.position = "absolute";
wireLayer.style.width = "100%";
wireLayer.style.height = "100%";
wireLayer.style.pointerEvents = "none";
canvas.appendChild(wireLayer);

// ===============================
// DRAG FROM SIDEBAR
// ===============================
components.forEach(comp => {
  comp.addEventListener("dragstart", e => {
    e.dataTransfer.setData("type", comp.dataset.type);
  });
});

// ===============================
// DROP ON CANVAS
// ===============================
canvas.addEventListener("dragover", e => e.preventDefault());
canvas.addEventListener("drop", e => {
  e.preventDefault();

  const type = e.dataTransfer.getData("type");
  const rect = canvas.getBoundingClientRect();

  let template = null;
  if (type === "arduino") template = document.getElementById("arduino-template");
  if (type === "led") template = document.getElementById("led-template");
  if (type === "button") template = document.getElementById("button-template");
  if (!template) return;

  const el = template.content.firstElementChild.cloneNode(true);
  el.style.left = e.clientX - rect.left + "px";
  el.style.top = e.clientY - rect.top + "px";

  canvas.appendChild(el);
  enableCanvasDragging(el);

  if (type === "arduino") {
    arduinoRef = el;
    enablePinSelection(el);
  }

  if (type === "led") {
    ledRef = el;
    redrawConnections();
  }

  if (type === "button") {
    buttonRef = el;
    redrawConnections();
    enableButtonSimulation(buttonRef);
  }
});

// ===============================
// VIEW SWITCHER
// ===============================
viewSelector.addEventListener("change", () => {
  if (viewSelector.value === "components") {
    componentsView.style.display = "block";
    codeView.style.display = "none";
  } else if (viewSelector.value === "code") {
    componentsView.style.display = "none";
    codeView.style.display = "block";
    generateArduinoCode();
  }
});

// ===============================
// PIN SELECTION
// ===============================
function enablePinSelection(arduino) {
  arduino.querySelectorAll(".pin").forEach(pin => {
    pin.addEventListener("click", e => {
      e.stopPropagation();
      askPinAssignment(pin);
    });
  });
}

function askPinAssignment(pinEl) {
  const pinNumber = Number(pinEl.dataset.pin);

  let input = prompt(
    `Assign component to pin ${pinNumber}:\nType "led" or "button" (leave blank to clear)`
  );
  if (input === null) return;
  input = input.trim().toLowerCase();

  if (input !== "led" && input !== "button" && input !== "") {
    alert("Invalid input! Only 'led', 'button', or blank allowed.");
    return;
  }

  assignPin(pinNumber, input);
}

// ===============================
// PIN ASSIGNMENT LOGIC
// ===============================
function assignPin(pin, component) {
  if (component === "") {
    if (pinState.led === pin) pinState.led = null;
    if (pinState.button === pin) pinState.button = null;
  } else {
    if ((component === "led" && pin === pinState.button) || (component === "button" && pin === pinState.led)) {
      alert("Pin already in use by other component!");
      return;
    }

    if (component === "led") pinState.led = pin;
    if (component === "button") pinState.button = pin;
  }

  redrawConnections();
  generateArduinoCode();
  updateLEDState();
  updateButtonVisual();
}

function getComponentUsingPin(pin) {
  if (pinState.led === pin) return "led";
  if (pinState.button === pin) return "button";
  return null;
}

// ===============================
// AUTO WIRING
// ===============================
function redrawConnections() {
  connections.forEach(c => c.wire.remove());
  connections.length = 0;

  document.querySelectorAll(".pin").forEach(p => p.classList.remove("connected"));

  if (arduinoRef && ledRef && pinState.led) autoWire("led");
  if (arduinoRef && buttonRef && pinState.button) autoWire("button");
}

function autoWire(type) {
  const pinNum = pinState[type];
  const arduinoPin = arduinoRef.querySelector(`.pin[data-pin="${pinNum}"]`);
  const target = type === "led" ? ledRef.querySelector(".pin") : buttonRef.querySelector(".pin");
  if (!arduinoPin || !target) return;

  createWire(arduinoPin, target);
}

// ===============================
// GENERATE ARDUINO CODE
// ===============================
function generateArduinoCode() {
  let code = `// Arduino Simulation Code\nvoid setup() {\n`;
  if (pinState.led) code += `  pinMode(${pinState.led}, OUTPUT); // LED\n`;
  if (pinState.button) code += `  pinMode(${pinState.button}, INPUT); // Button\n`;
  code += `}\n\nvoid loop() {\n`;

  if (pinState.button && pinState.led) {
    code += `  int buttonState = digitalRead(${pinState.button});\n`;
    code += `  digitalWrite(${pinState.led}, buttonState);\n`;
  } else {
    if (pinState.led) code += `  // digitalWrite(${pinState.led}, HIGH/LOW);\n`;
    if (pinState.button) code += `  // int buttonState = digitalRead(${pinState.button});\n`;
  }

  code += `}\n`;
  arduinoCode.textContent = code;
}

// ===============================
// CANVAS DRAGGING
// ===============================
function enableCanvasDragging(component) {
  component.addEventListener("mousedown", e => {
    if (e.target.classList.contains("pin")) return;

    dragTarget = component;
    const r = component.getBoundingClientRect();
    offsetX = e.clientX - r.left;
    offsetY = e.clientY - r.top;
    component.style.zIndex = 1000;
  });
}

document.addEventListener("mousemove", e => {
  if (!dragTarget) return;
  const c = canvas.getBoundingClientRect();
  dragTarget.style.left = e.clientX - c.left - offsetX + "px";
  dragTarget.style.top = e.clientY - c.top - offsetY + "px";
  updateAllWires();
});

document.addEventListener("mouseup", () => {
  if (dragTarget) dragTarget.style.zIndex = "";
  dragTarget = null;
});

// ===============================
// WIRE HELPERS
// ===============================
function createWire(a, b) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("stroke", "#222");
  line.setAttribute("stroke-width", "2");

  wireLayer.appendChild(line);
  connections.push({ from: a, to: b, wire: line });

  a.classList.add("connected");
  b.classList.add("connected");

  updateWirePosition(a, b, line);
}

function updateAllWires() {
  connections.forEach(c => updateWirePosition(c.from, c.to, c.wire));
}

function updateWirePosition(a, b, line) {
  const p1 = pinCenter(a);
  const p2 = pinCenter(b);

  line.setAttribute("x1", p1.x);
  line.setAttribute("y1", p1.y);
  line.setAttribute("x2", p2.x);
  line.setAttribute("y2", p2.y);
}

function pinCenter(pin) {
  const r = pin.getBoundingClientRect();
  const c = canvas.getBoundingClientRect();
  return {
    x: r.left - c.left + r.width / 2,
    y: r.top - c.top + r.height / 2
  };
}

// ===============================
// BUTTON LOGIC (REAL PUSH BUTTON)
// ===============================
function enableButtonSimulation(button) {
  const btnTerminal = button.querySelector(".pin");
  const buttonPin = pinState.button;
  const ledPin = pinState.led;

  if (buttonPin !== null) pinValues[buttonPin] = false;
  if (ledPin !== null) pinValues[ledPin] = false;

  updateButtonVisual();
  updateLEDState();

  btnTerminal.addEventListener("mousedown", () => {
    if (!buttonPin) return;
    pinValues[buttonPin] = true;
    if (ledPin) pinValues[ledPin] = true;
    updateButtonVisual();
    updateLEDState();
  });

  btnTerminal.addEventListener("mouseup", () => {
    if (!buttonPin) return;
    pinValues[buttonPin] = false;
    if (ledPin) pinValues[ledPin] = false;
    updateButtonVisual();
    updateLEDState();
  });

  btnTerminal.addEventListener("mouseleave", () => {
    if (!buttonPin) return;
    pinValues[buttonPin] = false;
    if (ledPin) pinValues[ledPin] = false;
    updateButtonVisual();
    updateLEDState();
  });
}

function updateLEDState() {
  if (!ledRef || !pinState.led) return;
  const ledTerminal = ledRef.querySelector(".pin");
  const state = pinValues[pinState.led] || false;
  if (state) {
    ledTerminal.style.background = "#ffeb3b";
    ledTerminal.style.boxShadow = "0 0 15px #ffeb3b";
  } else {
    ledTerminal.style.background = "#333";
    ledTerminal.style.boxShadow = "none";
  }
}

function updateButtonVisual() {
  if (!buttonRef || !pinState.button) return;
  const btnTerminal = buttonRef.querySelector(".pin");
  const state = pinValues[pinState.button] || false;
  if (state) {
    btnTerminal.style.background = "#ff5722";
    btnTerminal.style.boxShadow = "0 0 10px #ff5722";
  } else {
    btnTerminal.style.background = "#333";
    btnTerminal.style.boxShadow = "none";
  }
}

// ===============================
// SIMULATION TOGGLE BUTTON
// ===============================
simToggleBtn.onclick = () => {
  isRunning = !isRunning;
  simToggleBtn.textContent = isRunning ? "STOP" : "START";
  simToggleBtn.classList.toggle("stop", isRunning);
};
