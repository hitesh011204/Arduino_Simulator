// ===============================
// DRAG & DROP
// ===============================

const canvas = document.getElementById("canvas");
const components = document.querySelectorAll(".component");

components.forEach(comp => {
  comp.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", comp.id);
  });
});

canvas.addEventListener("dragover", e => e.preventDefault());

canvas.addEventListener("drop", e => {
  e.preventDefault();

  const id = e.dataTransfer.getData("text/plain");
  const original = document.getElementById(id);
  if (!original) return;

  const newComp = document.createElement("div");
  newComp.className = "canvas-component";
  newComp.innerHTML = original.innerHTML;

  const rect = canvas.getBoundingClientRect();
  newComp.style.left = e.clientX - rect.left + "px";
  newComp.style.top = e.clientY - rect.top + "px";

  canvas.appendChild(newComp);
});

// ===============================
// START / STOP SIMULATION
// ===============================

let isRunning = false;
const simToggleBtn = document.getElementById("simToggleBtn");

simToggleBtn.addEventListener("click", () => {
  isRunning = !isRunning;

  if (isRunning) {
    simToggleBtn.textContent = "STOP";
    simToggleBtn.classList.add("stop");
    alert("Simulation Started");
  } else {
    simToggleBtn.textContent = "START";
    simToggleBtn.classList.remove("stop");
    alert("Simulation Stopped");
  }
});

// ===============================
// DROPDOWN VIEW SWITCH
// ===============================

const viewSelector = document.getElementById("viewSelector");
const componentsView = document.getElementById("componentsView");
const codeView = document.getElementById("codeView");
const arduinoCode = document.getElementById("arduinoCode");

viewSelector.addEventListener("change", () => {
  if (viewSelector.value === "components") {
    componentsView.classList.remove("hidden");
    codeView.classList.add("hidden");
  } else {
    componentsView.classList.add("hidden");
    codeView.classList.remove("hidden");
    generateArduinoCode();
  }
});

// ===============================
// AUTO CODE GENERATION
// ===============================

function generateArduinoCode() {
  const comps = document.querySelectorAll(".canvas-component");

  let hasLED = false;
  let hasButton = false;

  comps.forEach(c => {
    if (c.innerText.includes("LED")) hasLED = true;
    if (c.innerText.includes("Button")) hasButton = true;
  });

  let code = `// Auto-generated Arduino Code

void setup() {
`;

  if (hasLED) code += `  pinMode(13, OUTPUT);\n`;
  if (hasButton) code += `  pinMode(2, INPUT);\n`;

  code += `}

void loop() {
`;

  if (hasLED && hasButton) {
    code += `  if (digitalRead(2) == HIGH) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
`;
  }

  code += `}
`;

  arduinoCode.textContent = code;
}
