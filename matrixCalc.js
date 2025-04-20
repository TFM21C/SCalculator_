// ----------------------------------------------------------
// DOMContentLoaded-Event-Listener
// ----------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const matrixCalcBtn = document.getElementById("matrix-calc-btn");
  const matrixCalcView = document.getElementById("matrix-calc-view");
  const advancedCalcView = document.getElementById("advanced-calc-view");
  const homeView = document.getElementById("home-view"); // Startseite
  const backToAdvancedCalcBtns = document.querySelectorAll(
    "#back-to-advanced-calc"
  );
  const startCalculationBtn = document.getElementById("start-calculation");

  if (matrixCalcBtn && matrixCalcView && advancedCalcView && homeView) {
    // Öffnet die Matrix-Kalkulation
    matrixCalcBtn.addEventListener("click", () => {
      advancedCalcView.classList.add("hidden");
      matrixCalcView.classList.remove("hidden");
    });

    // Zurück-Buttons logischerweise implementieren
    backToAdvancedCalcBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        matrixCalcView.classList.add("hidden");
        homeView.classList.remove("hidden"); // Zurück zur Startseite
      });
    });

    // "Berechnung starten"-Button
    if (startCalculationBtn) {
      startCalculationBtn.addEventListener("click", (event) => {
        event.preventDefault(); // Verhindert das automatische Neuladen der Seite

        // Eingabewerte aus dem Formular auslesen
        const purchasePrice = parseFloat(
          document.getElementById("purchase-price").value
        );

        const quantity = parseFloat(document.getElementById("quantity").value);
        const targetPrice = parseFloat(
          document.getElementById("target-price").value
        );
        const product = document.getElementById("product").value;

        // Überprüfen, ob alle Werte gültig sind
        if (
          isNaN(purchasePrice) ||
          isNaN(quantity) ||
          isNaN(targetPrice) ||
          !product
        ) {
          alert("Bitte alle Felder korrekt ausfüllen!");
          return;
        }

        // Berechnungen durchführen
        const results = matrixCalculator.calculateBreakEven(
          purchasePrice,
          quantity,
          targetPrice
        );

        // Ergebnisse in die Tabelle einfügen
        matrixCalculator.updateBreakEvenTable(results, product);

        // Historie speichern
        matrixCalculator.saveToHistory({
          purchasePrice,
          quantity,
          targetPrice,
          product,
        });

        alert("Berechnung abgeschlossen!");
      });
    }
  }
});

// ----------------------------------------------------------
// Klasse: MatrixCalculator
// ----------------------------------------------------------
export class MatrixCalculator {
  constructor() {
    this.history = [];
    this.historyList = document.getElementById("history-list");
    this.correctionTable = document.getElementById("correction-table");
    this.purchasePriceInput = document.getElementById("purchase-price");
    this.quantityInput = document.getElementById("quantity");
    this.targetPriceInput = document.getElementById("target-price");
    this.productInput = document.getElementById("product");
    this.breakEvenResults = [];
    this.correctionData = [];
  }

  // ------------------------------------------------------
  // Methode: Tabelle aktualisieren (interaktiv)
  // ------------------------------------------------------
  updateBreakEvenTable(results, productName) {
    const tableBody = document.querySelector("#break-even-table tbody");
    tableBody.innerHTML = ""; // Tabelle leeren

    results.forEach((result) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${productName}</td>
        <td>${result.breakEvenPoint}</td>
        <td>${result.price} €</td>
        <td>${result.profit} €</td>
      `;
      tableBody.appendChild(row);
    });
  }

  // ------------------------------------------------------
  // Methode: Ergebnisse zur Historie hinzufügen
  // ------------------------------------------------------
  saveToHistory(data) {
    const historyEntry = {
      ...data,
      timestamp: new Date().toISOString(),
      updatedQuantity: data.quantity,
      updatedProfit: 0,
    };

    this.history.push(historyEntry);

    const listItem = document.createElement("li");
    listItem.textContent = `Produkt: ${data.product}, EK: ${data.purchasePrice} €, VK: ${data.targetPrice} €, Menge: ${data.quantity}`;
    listItem.addEventListener("click", () => {
      this.loadFromHistory(historyEntry);
    });

    this.historyList.appendChild(listItem);
  }

  // ------------------------------------------------------
  // Methode: Historischen Eintrag laden
  // ------------------------------------------------------
  loadFromHistory(entry) {
    this.purchasePriceInput.value = entry.purchasePrice;
    this.quantityInput.value = entry.updatedQuantity || entry.quantity;
    this.targetPriceInput.value = entry.targetPrice;
    this.productInput.value = entry.product;

    const results = this.calculateBreakEven(
      entry.purchasePrice,
      entry.quantity,
      entry.targetPrice
    );
    this.updateBreakEvenTable(results, entry.product);
    this.updateCorrectionTable();
  }

  // ------------------------------------------------------
  // Methode: Berechnung des Break-Even-Points
  // ------------------------------------------------------
  calculateBreakEven(purchasePrice, quantity, targetPrice) {
    const breakEvenPoint = Math.ceil(purchasePrice / targetPrice);
    const remainingQuantity = quantity - breakEvenPoint;
    const profit = Math.max(remainingQuantity * targetPrice - purchasePrice, 0);

    const result = {
      breakEvenPoint,
      price: targetPrice,
      profit,
    };

    this.breakEvenResults = [result];
    return [result];
  }

  // ------------------------------------------------------
  // Methode: Korrekturen-Tabelle aktualisieren
  // ------------------------------------------------------
  updateCorrectionTable() {
    const correctionTableBody = document.querySelector(
      "#correction-table tbody"
    );
    correctionTableBody.innerHTML = ""; // Tabelle leeren

    this.correctionData.forEach((data, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox" class="correction-checkbox" data-index="${index}" /></td>
        <td contenteditable="true" class="editable-quantity">${
          data.quantity
        }</td>
        <td contenteditable="true" class="editable-price">${data.price.toFixed(
          2
        )}</td>
        <td>${data.profit.toFixed(2)} €</td>
      `;
      correctionTableBody.appendChild(row);

      // Event Listener für Änderungen
      row.querySelector(".editable-quantity").addEventListener("input", (e) => {
        const newQuantity = parseFloat(e.target.textContent) || 0;
        this.updateCorrectionData(index, "quantity", newQuantity);
      });

      row.querySelector(".editable-price").addEventListener("input", (e) => {
        const newPrice = parseFloat(e.target.textContent) || 0;
        this.updateCorrectionData(index, "price", newPrice);
      });

      row
        .querySelector(".correction-checkbox")
        .addEventListener("change", (e) => {
          if (e.target.checked) {
            this.applyCorrectionToBreakEven(data);
          }
        });
    });
  }

  // ------------------------------------------------------
  // Methode: Korrekturen anwenden
  // ------------------------------------------------------
  updateCorrectionData(index, field, value) {
    const data = this.correctionData[index];
    data[field] = value;

    if (field === "quantity" || field === "price") {
      data.profit = (data.price - data.cost) * data.quantity;
    }

    this.updateCorrectionTable();
  }

  applyCorrectionToBreakEven(correction) {
    const newResult = {
      breakEvenPoint: Math.ceil(correction.cost / correction.price),
      price: correction.price,
      profit: correction.profit,
    };

    this.breakEvenResults.push(newResult);
    this.updateBreakEvenTable(this.breakEvenResults, "Produkt");
  }
}
