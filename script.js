// script.js

// Referenzen auf die Buttons und Panels
const burgerMenuBtn = document.getElementById("burger-menu-btn");
const historyPanel = document.getElementById("history-panel");
const loginBtn = document.getElementById("login-btn");
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");

const quickCalcBtn = document.getElementById("quick-calc-btn");
const advancedCalcBtn = document.getElementById("advanced-calc-btn");
const loadOpBtn = document.getElementById("load-op-btn");
const closeHistoryBtn = document.getElementById("close-history-btn");

// Beim Klick auf den X-Button -> Verlauf wieder verstecken
closeHistoryBtn.addEventListener("click", () => {
  historyPanel.classList.add("hidden");
});
// Toggle-Funktion für Anzeigen/Verstecken eines Elements
function toggleElement(element) {
  element.classList.toggle("hidden");
}

// Zusätzliche Funktion zum Umschalten des Verlaufs
function toggleHistoryPanel() {
  toggleElement(historyPanel);
}

// Burger-Menü klick -> Verlauf anzeigen/ausblenden
burgerMenuBtn.addEventListener("click", toggleHistoryPanel);

// Login-Button klick -> Login-Modal
loginBtn.addEventListener("click", () => {
  toggleElement(loginModal);
});

// Login-Formular submit -> Modal schließen (Prototyp)
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // Hier könnte man prüfen, ob username/pass ok sind
  toggleElement(loginModal);
  alert("Erfolgreich eingeloggt (Prototyp)");
});

// Schnelle Kalkulation
quickCalcBtn.addEventListener("click", () => {
  // Öffne einfache Rechenansicht
  alert("Hier könnte eine einfache Eingabe für +, -, *, / erscheinen");
});

// Erweiterte Kalkulation
advancedCalcBtn.addEventListener("click", () => {
  // Evtl. neue „Stage“ anzeigen
  alert(
    "Hier können mehrere Werte eingegeben werden, bevor das Ergebnis kommt."
  );
});

// Operation laden
loadOpBtn.addEventListener("click", () => {
  // Z.B. auf Verlauf zugreifen und eine frühere Rechnung laden
  alert("Hier würde man aus dem Verlauf gespeicherte Operationen laden.");
});
