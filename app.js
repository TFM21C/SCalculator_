// Module-Importe
// ==================================================
// (Import-Anweisungen müssen ganz oben stehen – in ES-Modulen laufen sie vor der DOMContentLoaded)
import { QuickCalc } from "./QuickCalc.js";
import { AdvancedCalc } from "./AdvancedCalc.js";
import { HistoryManager } from "./HistoryManager.js";
import { MatrixCalculator } from "./matrixCalc.js";
import { ListManager } from "./ListManager.js";
document.addEventListener("DOMContentLoaded", () => {
  // ==================================================

  // ==================================================
  // DOM-Elemente Initialisierung
  // ==================================================
  const burgerMenuBtn = document.getElementById("burger-menu-btn");
  const toggleHistoryBtn = document.getElementById("toggle-history-btn");
  const loginBtn = document.getElementById("login-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");

  const menuPanel = document.getElementById("menu-panel");
  const menuOverlay = document.getElementById("menu-overlay");
  const closeMenuBtn = document.getElementById("close-menu-btn");

  const addToListBtn = document.getElementById("add-to-list-btn");
  addToListBtn.addEventListener("click", () => {
    console.log("addToListBtn wurde geklickt");
    listModal.classList.remove("hidden");
    newListForm.classList.add("hidden");
    existingListForm.classList.add("hidden");
  });
  const listModal = document.getElementById("list-modal");
  const newListBtn = document.getElementById("new-list-btn");
  const chooseListBtn = document.getElementById("choose-list-btn");
  const newListForm = document.getElementById("new-list-form");
  const existingListForm = document.getElementById("existing-list-form");
  const newListNameInput = document.getElementById("new-list-name");
  const createListConfirmBtn = document.getElementById(
    "create-list-confirm-btn"
  );
  const existingListSelect = document.getElementById("existing-list-select");
  const chooseListConfirmBtn = document.getElementById(
    "choose-list-confirm-btn"
  );
  const listModalCloseBtn = document.getElementById("list-modal-close-btn");

  const homeView = document.getElementById("home-view");
  const quickCalcChoiceView = document.getElementById("quick-calc-choice-view");
  const quickCalcView = document.getElementById("quick-calc-view");
  const advancedCalcView = document.getElementById("advanced-calc-view");
  const matrixCalcView = document.getElementById("matrix-calc-view");
  const listView = document.getElementById("list-view");
  const listDetailView = document.getElementById("list-detail-view");
  const listDetailContainer = document.getElementById("list-detail-container");

  const quickCalcBtn = document.getElementById("quick-calc-btn");
  const advancedCalcBtn = document.getElementById("advanced-calc-btn");
  const loadOpBtn = document.getElementById("load-op-btn");
  const cashPriceBtn = document.getElementById("cash-price-btn");
  const gramPriceBtn = document.getElementById("gram-price-btn");
  const listUpdateBtn = document.getElementById("list-update-btn");
  const closeChoiceViewBtn = document.getElementById("close-choice-view");
  const closeQuickCalcBtn = document.getElementById("close-quick-calc");

  const realtimeCalcCheckbox = document.getElementById("realtime-calc");
  const inputCash = document.getElementById("inputCash");
  const inputPreisJe = document.getElementById("inputPreisJe");
  const inputErgebnis = document.getElementById("inputErgebnis");
  const calcModeSelect = document.getElementById("calc-mode-select");

  // Neue Felder für "Liste bearbeiten"
  const listUpdateInputs = document.getElementById("list-update-inputs");
  const listNameSelect = document.getElementById("list-name-select");
  const productNameSelect = document.getElementById("product-name-select");
  const quantityInput = document.getElementById("quantity-input");
  const salesPriceDisplay = document.getElementById("sales-price-display");
  const breakEvenDisplay = document.getElementById("break-even-display");

  // Wrapper für Standard-SK-Felder
  const skStandardFields = document.getElementById("sk-standard-fields");

  const btnCalculate = document.getElementById("btnCalculate");
  const equal = document.getElementById("equal");

  const matrixCalcBtn = document.getElementById("matrix-calc-btn");
  const matrixForm = document.getElementById("matrix-form");

  const homeNav = document.getElementById("home-nav");
  const quickCalcNav = document.getElementById("quick-calc-nav");
  const advancedCalcNav = document.getElementById("advanced-calc-nav");
  const matrixCalcNav = document.getElementById("matrix-calc-nav");
  const statCalcNav = document.getElementById("stat-calc-nav");
  const financialCalcNav = document.getElementById("financial-calc-nav");

  const listMenuBtn = document.getElementById("list-menu-btn");
  const listsOverview = document.getElementById("lists-overview");
  const backToHomeFromListBtn = document.getElementById(
    "back-to-home-from-list"
  );

  // ==================================================
  // Instanzen der Klassen
  // ==================================================
  const quickCalcInstance = new QuickCalc();
  const advancedCalcInstance = new AdvancedCalc();
  const historyManager = new HistoryManager();
  const matrixCalculator = new MatrixCalculator();
  const listManager = new ListManager();

  let isListEditMode = false;

  // ==================================================
  // Utility-Funktionen
  // ==================================================
  function clearQuickCalcInputs() {
    inputCash.value = "";
    inputPreisJe.value = "";
    inputErgebnis.value = "";
  }

  function showView(viewToShow) {
    const views = [
      homeView,
      quickCalcChoiceView,
      quickCalcView,
      advancedCalcView,
      matrixCalcView,
      listView,
      listDetailView,
    ];
    views.forEach((view) => view && view.classList.add("hidden"));
    if (viewToShow) {
      viewToShow.classList.remove("hidden");
      if (viewToShow.id === "quick-calc-view") {
        clearQuickCalcInputs();
        updateUIForCalcMode();
      }
    }
  }

  function toggleElement(element) {
    element.classList.toggle("hidden");
  }

  // ==================================================
  // Verlauf (Historie) Rendering
  // ==================================================
  function renderHistory() {
    const historyList = document.getElementById("history-list");
    if (!historyList) return;
    historyList.innerHTML = "";
    historyManager.getHistory().forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.operation} = ${item.result}`;
      historyList.appendChild(li);
    });
  }

  // ==================================================
  // UI-Aktualisierungsfunktionen für Schnelle Kalkulation
  // ==================================================
  function updateUIForCalcMode() {
    if (calcModeSelect.value === "divide") {
      document.querySelector("label[for='inputCash']").textContent =
        "Cash (€):";
      document.querySelector("label[for='inputPreisJe']").textContent =
        "Preis je (€):";
      document.querySelector("label[for='inputErgebnis']").textContent =
        "Ergebnis:";
      inputCash.placeholder = "Cash";
      inputPreisJe.placeholder = "Preis je";
    } else if (calcModeSelect.value === "multiply") {
      document.querySelector("label[for='inputCash']").textContent =
        "Menge (g):";
      document.querySelector("label[for='inputPreisJe']").textContent =
        "Preis (€):";
      document.querySelector("label[for='inputErgebnis']").textContent =
        "Gesamt:";
      inputCash.placeholder = "Menge in g";
      inputPreisJe.placeholder = "Preis in €";
    }
  }

  function updateRealtimeCalculation() {
    const value1 = parseFloat(inputCash.value.replace(",", ".")) || 0;
    const value2 = parseFloat(inputPreisJe.value.replace(",", ".")) || 0;
    if (value1 && value2) {
      const result =
        calcModeSelect.value === "divide" ? value1 / value2 : value1 * value2;
      inputErgebnis.value =
        calcModeSelect.value === "divide"
          ? `${result.toFixed(2)} g`
          : `${result.toFixed(2)} €`;
    } else {
      inputErgebnis.value = "";
    }
  }

  // ==================================================
  // "Liste bearbeiten"-Modus
  // ==================================================
  function activateListEditMode(active) {
    isListEditMode = active;
    if (active) {
      skStandardFields.classList.add("hidden");
      listUpdateInputs.classList.remove("hidden");
      btnCalculate.textContent = "In Liste hinzufügen";
      calcModeSelect.style.display = "none";
      fillListNameSelect();
    } else {
      skStandardFields.classList.remove("hidden");
      listUpdateInputs.classList.add("hidden");
      btnCalculate.textContent = "Berechnen";
      calcModeSelect.style.display = "block";
    }
  }

  function fillListNameSelect() {
    listNameSelect.innerHTML =
      '<option value="">-- Bitte Liste wählen --</option>';
    const allLists = listManager.getLists();
    allLists.forEach((lst) => {
      const option = document.createElement("option");
      option.value = lst.id;
      option.textContent = lst.name;
      listNameSelect.appendChild(option);
    });
    productNameSelect.innerHTML =
      '<option value="">-- Bitte Produkt wählen --</option>';
  }

  listNameSelect.addEventListener("change", () => {
    const listId = parseInt(listNameSelect.value);
    if (!listId) {
      productNameSelect.innerHTML =
        '<option value="">-- Bitte Produkt wählen --</option>';
      return;
    }
    const theList = listManager.getLists().find((l) => l.id === listId);
    if (!theList) return;
    const products = theList.entries
      .filter((e) => e.type === "base")
      .map((e) => e.product);
    productNameSelect.innerHTML =
      '<option value="">-- Bitte Produkt wählen --</option>';
    products.forEach((prod) => {
      const opt = document.createElement("option");
      opt.value = prod;
      opt.textContent = prod;
      productNameSelect.appendChild(opt);
    });
  });

  productNameSelect.addEventListener("change", () => {
    const listId = parseInt(listNameSelect.value);
    const product = productNameSelect.value;
    if (!listId || !product) return;
    const theList = listManager.getLists().find((l) => l.id === listId);
    if (!theList) return;
    const baseEntry = theList.entries.find(
      (e) => e.type === "base" && e.product === product
    );
    if (!baseEntry) return;
    salesPriceDisplay.value = baseEntry.targetPrice || 0;
    breakEvenDisplay.value = `0/${baseEntry.breakEvenPoint || 0}`;
  });

  // ==================================================
  // Modal Event Listener – Listen Modal
  // ==================================================
  newListBtn.addEventListener("click", () => {
    console.log("Neue Liste erstellen geklickt");
    newListForm.classList.remove("hidden");
    existingListForm.classList.add("hidden");
  });

  chooseListBtn.addEventListener("click", () => {
    console.log("Bestehende Liste wählen geklickt");
    existingListForm.classList.remove("hidden");
    newListForm.classList.add("hidden");
    existingListSelect.innerHTML = "";
    listManager.getLists().forEach((list) => {
      const option = document.createElement("option");
      option.value = list.id;
      option.textContent = `${list.name} (${new Date(
        list.createdDate
      ).toLocaleDateString()})`;
      existingListSelect.appendChild(option);
    });
  });

  createListConfirmBtn.addEventListener("click", () => {
    console.log("Liste erstellen bestätigen geklickt");
    const listName = newListNameInput.value.trim();
    if (!listName) {
      alert("Bitte geben Sie einen Namen für die neue Liste ein.");
      return;
    }
    const newList = listManager.createList(listName);
    alert(`Liste "${newList.name}" wurde erstellt.`);
    listModal.classList.add("hidden");
    addCurrentMatrixResultToList(newList.id);
  });

  chooseListConfirmBtn.addEventListener("click", () => {
    console.log("Bestehende Liste übernehmen geklickt");
    const selectedListId = parseInt(existingListSelect.value);
    if (!selectedListId) {
      alert("Bitte wählen Sie eine Liste aus.");
      return;
    }
    listModal.classList.add("hidden");
    addCurrentMatrixResultToList(selectedListId);
  });

  listModalCloseBtn.addEventListener("click", () => {
    console.log("List Modal schließen geklickt");
    listModal.classList.add("hidden");
  });

  // ==================================================
  // Verlauf Dropdown (Historie)
  // ==================================================
  if (toggleHistoryBtn && document.getElementById("history-panel")) {
    toggleHistoryBtn.addEventListener("click", () => {
      const historyPanel = document.getElementById("history-panel");
      historyPanel.classList.toggle("show");
      toggleHistoryBtn.textContent = historyPanel.classList.contains("show")
        ? "Verlauf verbergen"
        : "Verlauf anzeigen";
    });
  }

  // ==================================================
  // Burger-Menü & Navigation
  // ==================================================
  function openMenu() {
    menuPanel.classList.remove("hidden");
    menuOverlay.classList.remove("hidden");
  }
  function closeMenu() {
    menuPanel.classList.add("hidden");
    menuOverlay.classList.add("hidden");
  }
  burgerMenuBtn.addEventListener("click", openMenu);
  menuOverlay.addEventListener("click", closeMenu);
  closeMenuBtn.addEventListener("click", closeMenu);

  if (homeNav) {
    homeNav.addEventListener("click", () => {
      showView(homeView);
      closeMenu();
    });
  }
  if (quickCalcNav) {
    quickCalcNav.addEventListener("click", () => {
      showView(quickCalcChoiceView);
      closeMenu();
    });
  }
  if (advancedCalcNav) {
    advancedCalcNav.addEventListener("click", () => {
      showView(advancedCalcView);
      closeMenu();
    });
  }
  if (matrixCalcNav) {
    matrixCalcNav.addEventListener("click", () => {
      showView(matrixCalcView);
      closeMenu();
    });
  }
  if (statCalcNav) {
    statCalcNav.addEventListener("click", () => {
      alert("Statistische Berechnung ist in Arbeit.");
      closeMenu();
    });
  }
  if (financialCalcNav) {
    financialCalcNav.addEventListener("click", () => {
      alert("Finanzberechnung ist in Arbeit.");
      closeMenu();
    });
  }

  // ==================================================
  // Navigation außerhalb des Menüs
  // ==================================================
  quickCalcBtn.addEventListener("click", () => {
    showView(quickCalcChoiceView);
    activateListEditMode(false);
  });
  advancedCalcBtn.addEventListener("click", () => showView(advancedCalcView));
  loadOpBtn.addEventListener("click", () => {
    renderListsOverview();
    showView(listView);
  });

  // ==================================================
  // Schnelle Kalkulation
  // ==================================================
  let activeInput = inputCash;
  inputCash.addEventListener("focus", () => {
    activeInput = inputCash;
  });
  inputPreisJe.addEventListener("focus", () => {
    activeInput = inputPreisJe;
  });

  document.addEventListener("DOMContentLoaded", () => {
    if (inputCash) inputCash.focus();
  });

  const keypadButtons = document.querySelectorAll(
    "#keypad-area-buttons button"
  );
  keypadButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const btnText = e.target.textContent.trim();
      if (button.classList.contains("clear")) {
        activeInput.value = "";
      } else if (button.classList.contains("special")) {
        activeInput.value = activeInput.value.slice(0, -1);
      } else if (button.id === "equal") {
        // ggf. weitere Berechnungen
      } else if (button.id === "close-quick-calc") {
        showView(homeView);
        activateListEditMode(false);
      } else {
        activeInput.value += btnText;
      }
      activeInput.focus();
    });
  });

  // QuickCalcChoice Buttons
  cashPriceBtn.addEventListener("click", () => {
    showView(quickCalcView);
    activateListEditMode(false);
  });
  gramPriceBtn.addEventListener("click", () => {
    showView(quickCalcView);
    calcModeSelect.value = "multiply";
    activateListEditMode(false);
  });
  listUpdateBtn.addEventListener("click", () => {
    showView(quickCalcView);
    activateListEditMode(true);
  });

  closeChoiceViewBtn.addEventListener("click", () => showView(homeView));
  closeQuickCalcBtn.addEventListener("click", () => {
    showView(homeView);
    activateListEditMode(false);
  });

  if (realtimeCalcCheckbox) {
    realtimeCalcCheckbox.addEventListener("change", () => {
      if (realtimeCalcCheckbox.checked) {
        [inputCash, inputPreisJe].forEach((input) => {
          input.addEventListener("input", updateRealtimeCalculation);
        });
      } else {
        [inputCash, inputPreisJe].forEach((input) => {
          input.removeEventListener("input", updateRealtimeCalculation);
        });
      }
    });
  }

  updateUIForCalcMode();
  calcModeSelect.addEventListener("change", () => {
    updateUIForCalcMode();
    updateRealtimeCalculation();
  });
  const toggleModeBtn = document.getElementById("toggle-mode-btn");
  if (toggleModeBtn) {
    const calcModes = [
      { value: "divide", label: "Cash / Preis je" },
      { value: "multiply", label: "g × €" },
    ];
    toggleModeBtn.addEventListener("click", () => {
      const currentIndex = calcModes.findIndex(
        (mode) => mode.value === calcModeSelect.value
      );
      const nextIndex = (currentIndex + 1) % calcModes.length;
      calcModeSelect.value = calcModes[nextIndex].value;
      updateUIForCalcMode();
      updateRealtimeCalculation();
    });
  }
  if (calcModeSelect) {
    calcModeSelect.addEventListener("change", () => {
      updateRealtimeCalculation();
    });
  }

  // btnCalculate: entweder "Berechnen" oder "In Liste hinzufügen"
  btnCalculate.addEventListener("click", () => {
    if (isListEditMode) {
      addPartialSaleToList();
    } else {
      doQuickCalc();
    }
  });

  function doQuickCalc() {
    const value1 = parseFloat(inputCash.value.replace(",", ".")) || 0;
    const value2 = parseFloat(inputPreisJe.value.replace(",", ".")) || 0;
    if (!value1 || !value2) {
      alert("Bitte gültige Werte eingeben!");
      return;
    }
    const result =
      calcModeSelect.value === "divide" ? value1 / value2 : value1 * value2;
    inputErgebnis.value =
      calcModeSelect.value === "divide"
        ? `${result.toFixed(2)} g`
        : `${result.toFixed(2)} €`;
    historyManager.addToHistory({
      operation:
        calcModeSelect.value === "divide"
          ? `${value1} ÷ ${value2}`
          : `${value1} × ${value2}`,
      result,
    });
    renderHistory();
  }

  // ==================================================
  // "Teilverkauf" in Liste hinzufügen
  // ==================================================
  function addPartialSaleToList() {
    const listId = parseInt(listNameSelect.value);
    if (!listId) {
      alert("Bitte eine Liste auswählen!");
      return;
    }
    const product = productNameSelect.value;
    if (!product) {
      alert("Bitte ein Produkt wählen!");
      return;
    }
    const quantity = parseFloat(quantityInput.value) || 0;
    const vkPrice = parseFloat(salesPriceDisplay.value) || 0;
    if (quantity <= 0 || vkPrice <= 0) {
      alert("Menge und VK-Preis müssen > 0 sein!");
      return;
    }
    const partialSale = {
      type: "sale",
      date: new Date().toISOString(),
      product,
      quantitySold: quantity,
      vkPrice,
      partialProfit: quantity * vkPrice,
    };
    const success = listManager.addPartialSale(listId, partialSale);
    if (success) {
      alert("Teilverkauf hinzugefügt!");
      quantityInput.value = "";
      salesPriceDisplay.value = "";
      breakEvenDisplay.value = "";
      productNameSelect.innerHTML =
        '<option value="">-- Bitte Produkt wählen --</option>';
      listNameSelect.value = "";
    } else {
      alert(
        "Fehler beim Hinzufügen: Liste nicht gefunden oder kein passender Basis-Eintrag!"
      );
    }
  }

  // ==================================================
  // Matrix Kalkulation
  // ==================================================
  matrixCalcBtn.addEventListener("click", () => showView(matrixCalcView));
  matrixForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const purchasePrice = parseFloat(
      document.getElementById("purchase-price").value
    );
    const quantity = parseFloat(document.getElementById("quantity").value);
    const targetPrice = parseFloat(
      document.getElementById("target-price").value
    );
    const productName = document.getElementById("product").value.trim();
    if (
      isNaN(purchasePrice) ||
      isNaN(quantity) ||
      isNaN(targetPrice) ||
      !productName
    ) {
      alert("Bitte alle Felder korrekt ausfüllen!");
      return;
    }
    matrixCalculator.productName = productName;
    matrixCalculator.originalQuantity = quantity;
    matrixCalculator.remainingQuantity = quantity;
    const results = matrixCalculator.calculateBreakEven(
      purchasePrice,
      quantity,
      targetPrice
    );
    matrixCalculator.breakEvenResults = results;
    matrixCalculator.initializeCorrectionData(
      quantity,
      purchasePrice,
      targetPrice
    );
    matrixCalculator.updateBreakEvenTable(results, productName);
    matrixCalculator.updateCorrectionTable();
    alert("Berechnung abgeschlossen!");
  });

  // ==================================================
  // Übernahme der Matrix-Ergebnisse in eine Liste
  // ==================================================
  function addCurrentMatrixResultToList(listId) {
    const product = document.getElementById("product").value.trim();
    const remainingQuantity = matrixCalculator.remainingQuantity;
    const breakEvenPoint = matrixCalculator.breakEvenResults[0]
      ? matrixCalculator.breakEvenResults[0].breakEven
      : 0;
    const targetPrice =
      parseFloat(document.getElementById("target-price").value) || 0;
    const baseCost =
      parseFloat(document.getElementById("purchase-price").value) || 0;
    const entry = {
      type: "base",
      datum: new Date().toISOString(),
      product: product,
      quantity: remainingQuantity,
      breakEvenPoint: breakEvenPoint,
      targetPrice,
      baseCost,
      partialSales: [],
    };
    const success = listManager.addEntryToList(listId, entry);
    if (success) {
      alert("Ergebnis wurde der Liste hinzugefügt.");
    } else {
      alert("Fehler beim Hinzufügen zur Liste.");
    }
  }

  // ==================================================
  // Listen-View Rendering
  // ==================================================
  function renderListsOverview() {
    listsOverview.innerHTML = "";
    const allLists = listManager.getLists();
    allLists.forEach((list) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${new Date(
        list.createdDate
      ).toLocaleDateString()}</strong> - ${list.name}`;
      li.addEventListener("click", () => {
        renderListDetailsView(list);
        showView(listDetailView);
      });
      listsOverview.appendChild(li);
    });
  }

  function renderListDetailsView(list) {
    listDetailContainer.innerHTML = "";
    const title = document.createElement("h3");
    title.textContent = `Liste: ${list.name} (Erstellt am ${new Date(
      list.createdDate
    ).toLocaleDateString()})`;
    listDetailContainer.appendChild(title);
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Datum</th>
          <th>Produkt</th>
          <th>Übrige Menge</th>
          <th>Break-Even</th>
          <th>Zielverkaufspreis</th>
          <th>Gewinn bis jetzt</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    list.entries.forEach((entry, idx) => {
      if (entry.type === "base") {
        const tr = document.createElement("tr");
        if (idx === 0) {
          tr.style.fontWeight = "bold";
        }
        let partialProfit = 0;
        if (entry.partialSales) {
          partialProfit = entry.partialSales.reduce(
            (sum, ps) => sum + ps.partialProfit,
            0
          );
        }
        const totalProfit = partialProfit - entry.baseCost;
        tr.innerHTML = `
          <td>${new Date(entry.datum).toLocaleDateString()}</td>
          <td>${entry.product}</td>
          <td>${entry.quantity || 0}</td>
          <td>${entry.breakEvenPoint || 0}</td>
          <td>${entry.targetPrice || 0}</td>
          <td>${totalProfit.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
        if (entry.partialSales) {
          entry.partialSales.forEach((ps) => {
            const psRow = document.createElement("tr");
            psRow.innerHTML = `
              <td>${new Date(ps.date).toLocaleDateString()}</td>
              <td>${ps.product}</td>
              <td>${ps.quantitySold}</td>
              <td>-</td>
              <td>${ps.vkPrice}</td>
              <td>${ps.partialProfit.toFixed(2)}</td>
            `;
            tbody.appendChild(psRow);
          });
        }
      }
    });
    listDetailContainer.appendChild(table);
  }

  if (listMenuBtn) {
    listMenuBtn.addEventListener("click", () => {
      renderListsOverview();
      showView(listView);
    });
  }
  backToHomeFromListBtn.addEventListener("click", () => {
    showView(homeView);
  });

  // ==================================================
  // MatrixCalculator Erweiterungen (Prototypen)
  // ==================================================
  MatrixCalculator.prototype.calculateBreakEven = function (
    purchasePrice,
    quantity,
    targetPrice
  ) {
    const ek = purchasePrice * quantity;
    const vk = targetPrice * quantity;
    const breakEven = Math.ceil(ek / targetPrice);
    const remainingQuantity = quantity;
    const reingewinn = vk - ek;
    return [
      {
        warenmenge: quantity,
        ek: ek,
        vk: vk,
        breakEven: breakEven,
        remainingQuantity: remainingQuantity,
        reingewinn: reingewinn,
      },
    ];
  };

  MatrixCalculator.prototype.initializeCorrectionData = function (
    warenmenge,
    ek,
    vk
  ) {
    this.correctionData = [
      {
        warenmenge: warenmenge,
        ek: ek,
        vk: vk,
        gewinn: (vk - ek) * warenmenge,
      },
    ];
  };

  MatrixCalculator.prototype.updateCorrectionTable = function () {
    const correctionTable = document.querySelector("#correction-table tbody");
    if (!correctionTable) return;
    correctionTable.innerHTML = "";
    this.correctionData.forEach((data, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox" class="correction-checkbox" data-index="${index}" /></td>
        <td contenteditable="true" class="editable-quantity">${
          data.warenmenge
        }</td>
        <td contenteditable="true" class="editable-vk">${data.vk.toFixed(
          2
        )}</td>
        <td>${data.gewinn.toFixed(2)} €</td>
      `;
      correctionTable.appendChild(row);
      row.querySelector(".editable-quantity").addEventListener("input", (e) => {
        const newQuantity = parseFloat(e.target.textContent) || 0;
        data.warenmenge = newQuantity;
        this.updateRemainingQuantity();
        this.updateCorrectionTable();
      });
      row.querySelector(".editable-vk").addEventListener("input", (e) => {
        const newVK = parseFloat(e.target.textContent) || 0;
        data.vk = newVK;
        data.gewinn = (newVK - data.ek) * data.warenmenge;
        this.updateCorrectionTable();
      });
      row
        .querySelector(".correction-checkbox")
        .addEventListener("change", (e) => {
          if (e.target.checked) {
            this.applyCorrectionToBreakEven(data);
          }
        });
    });
  };

  MatrixCalculator.prototype.updateRemainingQuantity = function () {
    const totalCorrection = this.correctionData.reduce(
      (sum, data) => sum + data.warenmenge,
      0
    );
    this.remainingQuantity = Math.max(
      this.originalQuantity - totalCorrection,
      0
    );
    this.updateBreakEvenTable(this.breakEvenResults, this.productName);
  };

  MatrixCalculator.prototype.applyCorrectionToBreakEven = function (
    correction
  ) {
    const newRow = {
      warenmenge: correction.warenmenge,
      ek: correction.ek * correction.warenmenge,
      vk: correction.vk * correction.warenmenge,
      breakEven: Math.ceil(
        (correction.ek * correction.warenmenge) / correction.vk
      ),
      remainingQuantity: this.remainingQuantity - correction.warenmenge,
      reingewinn:
        correction.vk * correction.warenmenge -
        correction.ek * correction.warenmenge,
    };
    this.breakEvenResults.push(newRow);
    this.updateBreakEvenTable(this.breakEvenResults, this.productName);
  };

  MatrixCalculator.prototype.updateBreakEvenTable = function (
    results,
    productName
  ) {
    const breakEvenTable = document.querySelector("#break-even-table tbody");
    if (!breakEvenTable) return;
    breakEvenTable.innerHTML = "";
    results.forEach((result) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${productName}</td>
        <td>${result.warenmenge}</td>
        <td>${result.ek !== undefined ? result.ek.toFixed(2) : "-"} €</td>
        <td>${result.vk !== undefined ? result.vk.toFixed(2) : "-"} €</td>
        <td>${result.breakEven !== undefined ? result.breakEven : "-"}</td>
        <td>${
          result.remainingQuantity !== undefined
            ? result.remainingQuantity
            : "-"
        }</td>
        <td>${
          result.reingewinn !== undefined ? result.reingewinn.toFixed(2) : "-"
        } €</td>
      `;
      breakEvenTable.appendChild(row);
    });
  };
});
