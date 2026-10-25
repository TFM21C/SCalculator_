// ==========================================================================
// SCalculator Pro v2 – TradeRepublic Dashboard, Listen-Builder & Kommission
// ==========================================================================
import { HistoryManager } from "./HistoryManager.js";
import { MatrixCalculator } from "./matrixCalc.js";
import { ListManager } from "./ListManager.js";

document.addEventListener("DOMContentLoaded", () => {
  const historyManager = new HistoryManager();
  const matrixCalculator = new MatrixCalculator();
  const listManager = new ListManager();

  // State
  let currentCalcMode = "angebot"; // "angebot" | "quick" | "liste"
  let currentDetailListId = null;
  let builderTargetListId = null; // null = neue Liste, Zahl = Produkte zu bestehender Liste hinzufügen
  let stagedProducts = [];
  let dashboardFilter = "all"; // "all" | "plus" | "minus"
  let commStatusFilter = "open"; // "open" | "overdue" | "paid" | "all"
  let commSelectedPerson = ""; // "" = alle Personen
  let reminderModalTarget = null; // { listId, saleId }
  let installmentModalTarget = null; // { listId, saleId, openAmount, personCode }
  let partialPaymentMode = "eur"; // "eur" | "units"

  // ==================================================
  // Formatierungs-Helfer
  // ==================================================
  function fmtEur(val, showPlus = false) {
    const num = Number(val) || 0;
    const prefix = showPlus && num > 0 ? "+" : "";
    return `${prefix}${num.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  function parseNum(val) {
    if (val === undefined || val === null || val === "") return 0;
    return parseFloat(String(val).replace(",", ".")) || 0;
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function isSaleOverdueOrReminderDue(sale) {
    if (!sale.isCommission || sale.paid) return false;
    const today = todayIso();
    if (sale.dueDate && sale.dueDate <= today) return true;
    if (sale.reminderDate && sale.reminderDate <= today) return true;
    return false;
  }

  function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2900);
  }

  // ==================================================
  // Theme Switcher
  // ==================================================
  const htmlRoot = document.documentElement;
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeIconSun = document.getElementById("theme-icon-sun");
  const themeIconMoon = document.getElementById("theme-icon-moon");

  function applyTheme(theme) {
    htmlRoot.setAttribute("data-theme", theme);
    localStorage.setItem("scalcTheme", theme);
    themeIconSun.classList.toggle("hidden", theme !== "dark");
    themeIconMoon.classList.toggle("hidden", theme === "dark");
  }

  applyTheme(localStorage.getItem("scalcTheme") || "dark");
  themeToggleBtn.addEventListener("click", () => {
    applyTheme(htmlRoot.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  // ==================================================
  // Navigation (5 Bottom Tabs)
  // ==================================================
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabDashboard = document.getElementById("tab-dashboard");
  const tabQuick = document.getElementById("tab-quick");
  const tabLists = document.getElementById("tab-lists");
  const tabCommission = document.getElementById("tab-commission");
  const tabMatrix = document.getElementById("tab-matrix");

  function switchTab(targetId) {
    [tabDashboard, tabQuick, tabLists, tabCommission, tabMatrix].forEach((panel) => {
      if (!panel) return;
      const active = panel.id === targetId;
      panel.classList.toggle("hidden", !active);
      panel.classList.toggle("active", active);
    });

    navTabs.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.target === targetId);
    });

    if (targetId === "tab-dashboard") renderDashboard();
    if (targetId === "tab-lists") renderListsOverview();
    if (targetId === "tab-commission") renderCommissionTab();
  }

  navTabs.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.target));
  });

  // ==================================================
  // TAB 1: PORTFOLIO DASHBOARD (TRADE REPUBLIC / BITPANDA STYLE)
  // ==================================================
  const portfolioTotalBalance = document.getElementById("portfolio-total-balance");
  const portfolioRoiPill = document.getElementById("portfolio-roi-pill");
  const portfolioSubBalance = document.getElementById("portfolio-sub-balance");
  const portfolioBarFill = document.getElementById("portfolio-bar-fill");
  const portfolioBarLeft = document.getElementById("portfolio-bar-left");
  const portfolioBarRight = document.getElementById("portfolio-bar-right");
  const pMetricInvested = document.getElementById("p-metric-invested");
  const pMetricCash = document.getElementById("p-metric-cash");
  const pMetricComm = document.getElementById("p-metric-comm");
  const pMetricCommBox = document.getElementById("p-metric-comm-box");
  const dashboardDealsList = document.getElementById("dashboard-deals-list");
  const dashboardEmptyDeals = document.getElementById("dashboard-empty-deals");
  const dashboardAlertBanner = document.getElementById("dashboard-alert-banner");
  const dashboardAlertText = document.getElementById("dashboard-alert-text");
  const dashboardAlertAction = document.getElementById("dashboard-alert-action");

  function renderDashboard() {
    const stats = listManager.getPortfolioStats();
    updateGlobalBadges();

    // Hero Zahlen
    portfolioTotalBalance.textContent = fmtEur(stats.netTotalCash, true);
    portfolioTotalBalance.className = `portfolio-big-number ${
      stats.netTotalCash > 0
        ? "text-emerald"
        : stats.netTotalCash < 0
        ? "text-danger"
        : ""
    }`;

    const roiSign = stats.totalRoiPct > 0 ? "+" : "";
    portfolioRoiPill.textContent = `${roiSign}${stats.totalRoiPct.toFixed(1)} %`;
    portfolioRoiPill.className = `roi-pill ${
      stats.netTotalCash > 0 ? "positive" : stats.netTotalCash < 0 ? "negative" : ""
    }`;

    portfolioSubBalance.innerHTML = `Inkl. offener Kommission: <strong>${fmtEur(
      stats.netTotalInclCommission,
      true
    )}</strong>`;

    const progressPct =
      stats.totalInvested > 0
        ? Math.min(100, Math.round((stats.totalRealizedCash / stats.totalInvested) * 100))
        : 0;
    portfolioBarFill.style.width = `${progressPct}%`;
    portfolioBarLeft.textContent = `${progressPct}% Break-Even erreicht`;
    portfolioBarRight.textContent = `Rest-Lagerwert (VK): ${fmtEur(stats.totalInventoryValue)}`;

    pMetricInvested.textContent = fmtEur(stats.totalInvested);
    pMetricCash.textContent = fmtEur(stats.totalRealizedCash);
    pMetricComm.textContent = fmtEur(stats.totalOpenCommission);

    // Deals / Käufe Performance Liste
    dashboardDealsList.innerHTML = "";
    const filteredDeals = stats.deals.filter((d) => {
      if (dashboardFilter === "plus") return d.netCashBalance >= 0;
      if (dashboardFilter === "minus") return d.netCashBalance < 0;
      return true;
    });

    if (stats.deals.length === 0) {
      dashboardEmptyDeals.classList.remove("hidden");
    } else {
      dashboardEmptyDeals.classList.add("hidden");
      filteredDeals.forEach((deal) => {
        const isPos = deal.netCashBalance >= 0;
        const card = document.createElement("div");
        card.className = "deal-card";
        card.innerHTML = `
          <div class="deal-left">
            <span class="deal-title">${deal.name}</span>
            <span class="deal-sub">
              EK: ${fmtEur(deal.invested)} · Einnahmen: ${fmtEur(deal.realizedCash)}
              ${deal.openCommission > 0 ? ` · <span class="text-amber">Komm.: ${fmtEur(deal.openCommission)}</span>` : ""}
              · Rest: ${deal.remainingQty} Einh.
            </span>
          </div>
          <div class="deal-right">
            <span class="deal-pnl ${isPos ? "text-emerald" : "text-danger"}">
              ${fmtEur(deal.netCashBalance, true)}
            </span>
            <span class="deal-roi-tag ${isPos ? "profit-positive" : "profit-pending"}">
              ${deal.roiPct >= 0 ? "+" : ""}${deal.roiPct.toFixed(1)}%
            </span>
          </div>
        `;
        card.addEventListener("click", () => {
          const theList = listManager.getLists().find((l) => l.id === deal.listId);
          if (theList) {
            switchTab("tab-lists");
            renderListDetailsView(theList);
          }
        });
        dashboardDealsList.appendChild(card);
      });
    }
  }

  document.querySelectorAll("#dashboard-deal-filters .pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#dashboard-deal-filters .pill-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      dashboardFilter = btn.dataset.filter;
      renderDashboard();
    });
  });

  // Quick-Action Buttons auf dem Dashboard
  document.getElementById("qa-book-sale").addEventListener("click", () => {
    switchTab("tab-quick");
    setQuickMode("liste");
  });
  document.getElementById("qa-new-list").addEventListener("click", () => {
    switchTab("tab-lists");
    openListBuilder(null);
  });
  document.getElementById("qa-check-offer").addEventListener("click", () => {
    switchTab("tab-quick");
    setQuickMode("angebot");
  });
  pMetricCommBox.addEventListener("click", () => {
    switchTab("tab-commission");
  });
  dashboardAlertAction.addEventListener("click", () => {
    commStatusFilter = "overdue";
    switchTab("tab-commission");
  });
  document.getElementById("toggle-notifications-btn").addEventListener("click", () => {
    commStatusFilter = "overdue";
    switchTab("tab-commission");
  });

  // ==================================================
  // TAB 2: SCHNELLRECHNER (ANGEBOT | QUICK | LISTE) – OHNE NUMPAD
  // ==================================================
  const segmentBtns = document.querySelectorAll("#tab-quick .segment-btn");
  const skStandardFields = document.getElementById("sk-standard-fields");
  const listUpdateInputs = document.getElementById("list-update-inputs");
  const calcModeSubtitle = document.getElementById("calc-mode-subtitle");
  const realtimeCalcCheckbox = document.getElementById("realtime-calc");

  const inputFirst = document.getElementById("inputFirst");
  const inputSecond = document.getElementById("inputSecond");
  const boxInputFirst = document.getElementById("box-inputFirst");
  const boxInputSecond = document.getElementById("box-inputSecond");
  const labelInputFirst = document.getElementById("label-inputFirst");
  const labelInputSecond = document.getElementById("label-inputSecond");
  const unitInputFirst = document.getElementById("unit-inputFirst");
  const unitInputSecond = document.getElementById("unit-inputSecond");
  const labelInputErgebnis = document.getElementById("label-inputErgebnis");
  const resultFormulaPreview = document.getElementById("result-formula-preview");
  const inputErgebnis = document.getElementById("inputErgebnis");
  const btnSaveQuickCalc = document.getElementById("btnSaveQuickCalc");

  // Felder im Reiter "Liste" (Teilverkauf)
  const listNameSelect = document.getElementById("list-name-select");
  const productNameSelect = document.getElementById("product-name-select");
  const saleProductStatus = document.getElementById("sale-product-status");
  const saleRemainingStock = document.getElementById("sale-remaining-stock");
  const breakEvenDisplay = document.getElementById("break-even-display");
  const saleTargetVk = document.getElementById("sale-target-vk");
  const quantityInput = document.getElementById("quantity-input");
  const salesPriceDisplay = document.getElementById("sales-price-display");
  const boxQuantityInput = document.getElementById("box-quantity-input");
  const boxSalesPrice = document.getElementById("box-sales-price-display");
  const saleIsCommission = document.getElementById("sale-is-commission");
  const commissionExtraFields = document.getElementById("commission-extra-fields");
  const salePersonCode = document.getElementById("sale-person-code");
  const saleHasPartial = document.getElementById("sale-has-partial");
  const partialPaymentFields = document.getElementById("partial-payment-fields");
  const partialModeEurBtn = document.getElementById("partial-mode-eur-btn");
  const partialModeUnitsBtn = document.getElementById("partial-mode-units-btn");
  const salePartialInput = document.getElementById("sale-partial-input");
  const labelSalePartialInput = document.getElementById("label-sale-partial-input");
  const saleDueDate = document.getElementById("sale-due-date");
  const saleReminderDate = document.getElementById("sale-reminder-date");
  const saleBannerTitle = document.getElementById("sale-banner-title");
  const salePreviewOutput = document.getElementById("sale-preview-output");
  const salePreviewSub = document.getElementById("sale-preview-sub");
  const btnBookSale = document.getElementById("btnBookSale");

  let activeInput = inputFirst;

  function setActiveField(inp) {
    activeInput = inp;
    [boxInputFirst, boxInputSecond, boxQuantityInput, boxSalesPrice].forEach((b) =>
      b?.classList.remove("active-field")
    );
    if (inp === inputFirst) boxInputFirst.classList.add("active-field");
    if (inp === inputSecond) boxInputSecond.classList.add("active-field");
    if (inp === quantityInput) boxQuantityInput.classList.add("active-field");
    if (inp === salesPriceDisplay) boxSalesPrice.classList.add("active-field");
  }

  [inputFirst, inputSecond, quantityInput, salesPriceDisplay].forEach((inp) => {
    inp.addEventListener("focus", () => setActiveField(inp));
    inp.addEventListener("input", () => {
      if (currentCalcMode === "liste") {
        updateSalePreview();
      } else if (realtimeCalcCheckbox.checked) {
        updateQuickCalculation();
      }
    });
  });

  // Preset-Chips füllen das aktuell fokussierte Eingabefeld
  document.querySelectorAll(".preset-btn").forEach((chip) => {
    chip.addEventListener("click", () => {
      const val = chip.getAttribute("data-value");
      if (activeInput && val) {
        activeInput.value = val;
        activeInput.focus();
        activeInput.dispatchEvent(new Event("input"));
      }
    });
  });

  function setQuickMode(mode) {
    currentCalcMode = mode;
    segmentBtns.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));

    if (mode === "liste") {
      skStandardFields.classList.add("hidden");
      listUpdateInputs.classList.remove("hidden");
      fillListNameSelect();
      updateKnownPersonsDatalist();
      setActiveField(quantityInput);
      updateSalePreview();
    } else {
      skStandardFields.classList.remove("hidden");
      listUpdateInputs.classList.add("hidden");

      if (mode === "angebot") {
        calcModeSubtitle.textContent =
          "Angebot prüfen: Z. B. 25 Stk. für 200 € → Was kostet 1 Stück?";
        labelInputFirst.textContent = "Angebotene Menge (Stk / g)";
        inputFirst.placeholder = "z. B. 25";
        unitInputFirst.textContent = "Stk / g";

        labelInputSecond.textContent = "Gesamtpreis des Angebots (€)";
        inputSecond.placeholder = "z. B. 200";
        unitInputSecond.textContent = "€ Gesamt";

        labelInputErgebnis.textContent = "Stückpreis / Kurs (1 Einheit)";
        resultFormulaPreview.textContent = "Gesamtpreis ÷ Menge";
      } else {
        // mode === "quick"
        calcModeSubtitle.textContent =
          "Quick-Rechner: Menge × Einzelpreis = Gesamtpreis";
        labelInputFirst.textContent = "Menge (Stk / g)";
        inputFirst.placeholder = "z. B. 10";
        unitInputFirst.textContent = "Stk / g";

        labelInputSecond.textContent = "Preis je Einheit (€)";
        inputSecond.placeholder = "z. B. 12.50";
        unitInputSecond.textContent = "€ / Einh.";

        labelInputErgebnis.textContent = "Gesamtpreis (€)";
        resultFormulaPreview.textContent = "Menge × Preis";
      }

      setActiveField(inputFirst);
      updateQuickCalculation();
    }
  }

  segmentBtns.forEach((btn) => {
    btn.addEventListener("click", () => setQuickMode(btn.dataset.mode));
  });

  function updateQuickCalculation() {
    const v1 = parseNum(inputFirst.value); // Menge
    const v2 = parseNum(inputSecond.value); // Gesamtpreis (bei Angebot) oder Stückpreis (bei Quick)

    if (v1 > 0 && v2 > 0) {
      if (currentCalcMode === "angebot") {
        const unitPrice = v2 / v1;
        inputErgebnis.textContent = `${fmtEur(unitPrice)} / Stk.`;
        resultFormulaPreview.textContent = `${fmtEur(v2)} ÷ ${v1} Stk.`;
      } else {
        const total = v1 * v2;
        inputErgebnis.textContent = fmtEur(total);
        resultFormulaPreview.textContent = `${v1} × ${fmtEur(v2)}`;
      }
    } else {
      inputErgebnis.textContent = "0,00 €";
      resultFormulaPreview.textContent =
        currentCalcMode === "angebot" ? "Gesamtpreis ÷ Menge" : "Menge × Preis";
    }
  }

  btnSaveQuickCalc.addEventListener("click", () => {
    const v1 = parseNum(inputFirst.value);
    const v2 = parseNum(inputSecond.value);
    if (v1 <= 0 || v2 <= 0) {
      showToast("Bitte zwei Werte größer 0 eingeben");
      return;
    }
    const res = currentCalcMode === "angebot" ? v2 / v1 : v1 * v2;
    const formatted =
      currentCalcMode === "angebot" ? `${fmtEur(res)} / Stk.` : fmtEur(res);

    historyManager.addToHistory({
      operation:
        currentCalcMode === "angebot"
          ? `Angebot: ${v1} Stk. für ${fmtEur(v2)}`
          : `Quick: ${v1} × ${fmtEur(v2)}`,
      result: formatted,
      rawValue: res.toFixed(2),
    });
    renderHistory();
    showToast(`Im Verlauf gespeichert: ${formatted}`);
  });

  // Kommissions-Checkbox & Teilzahlungs-Checkbox im Reiter "Liste"
  saleIsCommission.addEventListener("change", () => {
    const isComm = saleIsCommission.checked;
    commissionExtraFields.classList.toggle("hidden", !isComm);
    if (!isComm) {
      saleHasPartial.checked = false;
      partialPaymentFields.classList.add("hidden");
    }
    btnBookSale.textContent = isComm
      ? "🤝 Auf Kommission buchen"
      : "✓ Verkauf jetzt buchen";
    updateSalePreview();
  });

  saleHasPartial.addEventListener("change", () => {
    const hasPart = saleHasPartial.checked;
    partialPaymentFields.classList.toggle("hidden", !hasPart);
    if (hasPart) salePartialInput.focus();
    updateSalePreview();
  });

  function setPartialMode(mode) {
    partialPaymentMode = mode;
    partialModeEurBtn.classList.toggle("active", mode === "eur");
    partialModeUnitsBtn.classList.toggle("active", mode === "units");
    if (mode === "eur") {
      labelSalePartialInput.textContent = "Bereits bezahlter Betrag (€)";
      salePartialInput.placeholder = "z. B. 50";
    } else {
      labelSalePartialInput.textContent = "Bereits bezahlte Stücke / Einheiten (z. B. 2 Ganze)";
      salePartialInput.placeholder = "z. B. 2";
    }
    updateSalePreview();
  }

  partialModeEurBtn.addEventListener("click", () => setPartialMode("eur"));
  partialModeUnitsBtn.addEventListener("click", () => setPartialMode("units"));
  salePartialInput.addEventListener("input", updateSalePreview);

  function updateKnownPersonsDatalist() {
    const datalist = document.getElementById("known-persons-datalist");
    if (!datalist) return;
    const persons = new Set();
    listManager.getAllCommissionSales().forEach((s) => {
      if (s.personCode) persons.add(s.personCode);
    });
    datalist.innerHTML = "";
    persons.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      datalist.appendChild(opt);
    });
  }

  function fillListNameSelect(preselectListId = null) {
    const allLists = listManager.getLists();
    listNameSelect.innerHTML = '<option value="">-- Liste wählen --</option>';
    allLists.forEach((lst) => {
      const option = document.createElement("option");
      option.value = lst.id;
      option.textContent = lst.name;
      listNameSelect.appendChild(option);
    });

    if (preselectListId) {
      listNameSelect.value = String(preselectListId);
      listNameSelect.dispatchEvent(new Event("change"));
    } else if (allLists.length === 1) {
      listNameSelect.value = String(allLists[0].id);
      listNameSelect.dispatchEvent(new Event("change"));
    } else {
      productNameSelect.innerHTML = '<option value="">-- Produkt wählen --</option>';
      saleProductStatus.classList.add("hidden");
    }
  }

  listNameSelect.addEventListener("change", () => {
    const listId = parseInt(listNameSelect.value);
    saleProductStatus.classList.add("hidden");
    if (!listId) {
      productNameSelect.innerHTML = '<option value="">-- Produkt wählen --</option>';
      return;
    }
    const theList = listManager.getLists().find((l) => l.id === listId);
    if (!theList) return;
    const baseEntries = theList.entries.filter((e) => e.type === "base");
    productNameSelect.innerHTML = '<option value="">-- Produkt wählen --</option>';
    baseEntries.forEach((entry) => {
      const opt = document.createElement("option");
      opt.value = entry.product;
      opt.textContent = `${entry.product} (${entry.quantity} übrig)`;
      productNameSelect.appendChild(opt);
    });
    if (baseEntries.length === 1) {
      productNameSelect.value = baseEntries[0].product;
      productNameSelect.dispatchEvent(new Event("change"));
    }
  });

  productNameSelect.addEventListener("change", () => {
    const listId = parseInt(listNameSelect.value);
    const product = productNameSelect.value;
    if (!listId || !product) {
      saleProductStatus.classList.add("hidden");
      return;
    }
    const theList = listManager.getLists().find((l) => l.id === listId);
    if (!theList) return;
    const baseEntry = theList.entries.find(
      (e) => e.type === "base" && e.product === product
    );
    if (!baseEntry) return;

    const soldUnits = (baseEntry.partialSales || []).reduce(
      (sum, ps) => sum + (ps.quantitySold || 0),
      0
    );
    saleProductStatus.classList.remove("hidden");
    saleRemainingStock.textContent = `${baseEntry.quantity ?? 0} Einh.`;
    breakEvenDisplay.textContent = `${soldUnits} / ${baseEntry.breakEvenPoint || 0} Einh.`;
    saleTargetVk.textContent = fmtEur(baseEntry.targetPrice || 0);
    salesPriceDisplay.value = baseEntry.targetPrice || "";
    updateSalePreview();
  });

  function getCalculatedUpfrontEur(qty, vk) {
    if (!saleIsCommission.checked || !saleHasPartial.checked) return 0;
    const raw = parseNum(salePartialInput.value);
    if (raw <= 0) return 0;
    const total = qty * vk;
    const upfront = partialPaymentMode === "units" ? raw * vk : raw;
    return Math.min(total, Math.max(0, upfront));
  }

  function updateSalePreview() {
    const qty = parseNum(quantityInput.value);
    const vk = parseNum(salesPriceDisplay.value);
    const total = qty * vk;

    if (!saleIsCommission.checked) {
      saleBannerTitle.textContent = "Betrag dieser Buchung (Sofort bezahlt)";
      salePreviewOutput.textContent = fmtEur(total);
      salePreviewSub.textContent =
        qty > 0 && vk > 0 ? `${qty} Einh. × ${fmtEur(vk)}` : "Menge × VK-Preis";
      return;
    }

    const upfront = getCalculatedUpfrontEur(qty, vk);
    const openRest = Math.max(0, total - upfront);

    if (saleHasPartial.checked && upfront > 0) {
      saleBannerTitle.textContent = "Offener Restbetrag auf Kommission";
      salePreviewOutput.textContent = fmtEur(openRest);
      salePreviewSub.textContent = `Gesamt: ${fmtEur(total)} · Sofort angezahlt: ${fmtEur(upfront)}`;
    } else {
      saleBannerTitle.textContent = "Offener Kommissions-Betrag (Später zahlbar)";
      salePreviewOutput.textContent = fmtEur(total);
      salePreviewSub.textContent =
        qty > 0 && vk > 0 ? `${qty} Einh. × ${fmtEur(vk)} (0,00 € angezahlt)` : "Menge × VK-Preis";
    }
  }

  btnBookSale.addEventListener("click", () => {
    const listId = parseInt(listNameSelect.value);
    if (!listId) {
      showToast("Bitte zuerst eine Liste auswählen");
      return;
    }
    const product = productNameSelect.value;
    if (!product) {
      showToast("Bitte ein Produkt auswählen");
      return;
    }
    const quantity = parseNum(quantityInput.value);
    const vkPrice = parseNum(salesPriceDisplay.value);
    if (quantity <= 0 || vkPrice <= 0) {
      showToast("Menge und VK-Preis müssen größer 0 sein");
      return;
    }

    const isComm = saleIsCommission.checked;
    const personCode = salePersonCode.value.trim();
    if (isComm && !personCode) {
      showToast("Bitte ein Personen-Kürzel für die Kommission eingeben!");
      salePersonCode.focus();
      return;
    }

    const paidUpfront = getCalculatedUpfrontEur(quantity, vkPrice);

    const saleRecord = listManager.addPartialSale(listId, {
      product,
      quantitySold: quantity,
      vkPrice,
      isCommission: isComm,
      paidUpfront,
      personCode,
      dueDate: isComm ? saleDueDate.value || null : null,
      reminderDate: isComm ? saleReminderDate.value || null : null,
    });

    if (saleRecord) {
      showToast(
        isComm
          ? paidUpfront > 0
            ? `Kommission für „${personCode}“: ${fmtEur(paidUpfront)} bar + ${fmtEur(saleRecord.openAmount)} offen!`
            : `Kommission für „${personCode}“ (${fmtEur(saleRecord.openAmount)} offen) eingetragen!`
          : `Verkauf (+${fmtEur(quantity * vkPrice)}) gebucht!`
      );
      quantityInput.value = "";
      salePersonCode.value = "";
      salePartialInput.value = "";
      saleDueDate.value = "";
      saleReminderDate.value = "";
      saleIsCommission.checked = false;
      saleHasPartial.checked = false;
      commissionExtraFields.classList.add("hidden");
      partialPaymentFields.classList.add("hidden");
      productNameSelect.dispatchEvent(new Event("change"));
      updateGlobalBadges();
    }
  });

  // ==================================================
  // TAB 3: LISTEN (ÜBERSICHT, LISTEN-BUILDER & DETAIL-STATISTIK)
  // ==================================================
  const listOverviewPanel = document.getElementById("list-overview-panel");
  const listBuilderView = document.getElementById("list-builder-view");
  const listDetailView = document.getElementById("list-detail-view");
  const listsEmptyState = document.getElementById("lists-empty-state");
  const listsOverview = document.getElementById("lists-overview");
  const listDetailContainer = document.getElementById("list-detail-container");

  // Builder Elemente
  const builderTitle = document.getElementById("builder-title");
  const builderListName = document.getElementById("builder-list-name");
  const builderProductName = document.getElementById("builder-product-name");
  const builderEk = document.getElementById("builder-ek");
  const builderQty = document.getElementById("builder-qty");
  const builderVk = document.getElementById("builder-vk");
  const bPrevUnit = document.getElementById("b-prev-unit");
  const bPrevBe = document.getElementById("b-prev-be");
  const bPrevProfit = document.getElementById("b-prev-profit");
  const builderAddProductBtn = document.getElementById("builder-add-product-btn");
  const builderStagedCount = document.getElementById("builder-staged-count");
  const builderStagedList = document.getElementById("builder-staged-list");
  const builderSaveListBtn = document.getElementById("builder-save-list-btn");

  function openListBuilder(existingListId = null) {
    builderTargetListId = existingListId;
    stagedProducts = [];
    listOverviewPanel.classList.add("hidden");
    listDetailView.classList.add("hidden");
    listBuilderView.classList.remove("hidden");

    if (existingListId) {
      const lst = listManager.getLists().find((l) => l.id === existingListId);
      builderTitle.textContent = `Produkte zu „${lst ? lst.name : "Liste"}“ hinzufügen`;
      builderListName.value = lst ? lst.name : "";
      builderListName.disabled = true;
      builderSaveListBtn.textContent = "✓ Produkte in Liste speichern";
    } else {
      builderTitle.textContent = "Neue Liste erstellen";
      builderListName.value = "";
      builderListName.disabled = false;
      builderSaveListBtn.textContent = "✓ Liste jetzt erstellen";
      builderListName.focus();
    }

    clearBuilderProductInputs();
    renderStagedProducts();
  }

  function clearBuilderProductInputs() {
    builderProductName.value = "";
    builderEk.value = "";
    builderQty.value = "";
    builderVk.value = "";
    updateBuilderLivePreview();
  }

  function updateBuilderLivePreview() {
    const ek = parseNum(builderEk.value);
    const qty = parseNum(builderQty.value);
    const vk = parseNum(builderVk.value);
    const unit = qty > 0 ? ek / qty : 0;
    const be = vk > 0 ? Math.ceil(ek / vk) : 0;
    const profit = qty * vk - ek;

    bPrevUnit.textContent = fmtEur(unit);
    bPrevBe.textContent = `${be} Einh.`;
    bPrevProfit.textContent = fmtEur(profit, true);
  }

  [builderEk, builderQty, builderVk].forEach((inp) =>
    inp.addEventListener("input", updateBuilderLivePreview)
  );

  builderAddProductBtn.addEventListener("click", () => {
    const prod = builderProductName.value.trim();
    const ek = parseNum(builderEk.value);
    const qty = parseNum(builderQty.value);
    const vk = parseNum(builderVk.value);

    if (!prod || ek <= 0 || qty <= 0 || vk <= 0) {
      showToast("Bitte Produktname, EK, Menge und Ziel-VK eingeben");
      return;
    }

    stagedProducts.push({
      product: prod,
      baseCost: ek,
      quantity: qty,
      targetPrice: vk,
      breakEvenPoint: Math.ceil(ek / vk),
    });

    clearBuilderProductInputs();
    renderStagedProducts();
    builderProductName.focus();
    showToast(`„${prod}“ vorgemerkt`);
  });

  function renderStagedProducts() {
    builderStagedCount.textContent = stagedProducts.length;
    builderStagedList.innerHTML = "";

    if (stagedProducts.length === 0) {
      const li = document.createElement("li");
      li.className = "text-muted small";
      li.textContent = "Noch kein Produkt hinzugefügt (du kannst oben direkt ein Produkt eintragen).";
      builderStagedList.appendChild(li);
      return;
    }

    stagedProducts.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className = "staged-item";
      li.innerHTML = `
        <div>
          <strong>${item.product}</strong>
          <span class="text-muted small" style="margin-left: 0.4rem;">
            Menge: ${item.quantity} · EK: ${fmtEur(item.baseCost)} · Ziel-VK: ${fmtEur(item.targetPrice)} (BE: ${item.breakEvenPoint})
          </span>
        </div>
        <button type="button" class="btn btn-danger-ghost btn-sm" data-idx="${idx}">✕</button>
      `;
      li.querySelector("button").addEventListener("click", () => {
        stagedProducts.splice(idx, 1);
        renderStagedProducts();
      });
      builderStagedList.appendChild(li);
    });
  }

  builderSaveListBtn.addEventListener("click", () => {
    // Falls noch Werte im Produktformular stehen, automatisch übernehmen
    const pendingProd = builderProductName.value.trim();
    const pendingEk = parseNum(builderEk.value);
    const pendingQty = parseNum(builderQty.value);
    const pendingVk = parseNum(builderVk.value);
    if (pendingProd && pendingEk > 0 && pendingQty > 0 && pendingVk > 0) {
      stagedProducts.push({
        product: pendingProd,
        baseCost: pendingEk,
        quantity: pendingQty,
        targetPrice: pendingVk,
        breakEvenPoint: Math.ceil(pendingEk / pendingVk),
      });
    }

    if (builderTargetListId) {
      if (stagedProducts.length === 0) {
        showToast("Bitte mindestens ein Produkt eintragen");
        return;
      }
      stagedProducts.forEach((p) => {
        listManager.addEntryToList(builderTargetListId, {
          type: "base",
          datum: new Date().toISOString(),
          product: p.product,
          initialQuantity: p.quantity,
          quantity: p.quantity,
          breakEvenPoint: p.breakEvenPoint,
          targetPrice: p.targetPrice,
          baseCost: p.baseCost,
          partialSales: [],
        });
      });
      const updated = listManager.getLists().find((l) => l.id === builderTargetListId);
      showToast("Produkte zur Liste hinzugefügt!");
      renderListDetailsView(updated);
      updateGlobalBadges();
      return;
    }

    const listName = builderListName.value.trim();
    if (!listName) {
      showToast("Bitte zuerst den Namen der Liste eingeben");
      builderListName.focus();
      return;
    }
    if (stagedProducts.length === 0) {
      showToast("Bitte mindestens ein Produkt hinzufügen");
      builderProductName.focus();
      return;
    }

    const created = listManager.createList(listName, stagedProducts);
    showToast(`Liste „${created.name}“ mit ${stagedProducts.length} Produkt(en) erstellt!`);
    updateGlobalBadges();
    renderListDetailsView(created);
  });

  document.getElementById("open-list-builder-btn").addEventListener("click", () => {
    openListBuilder(null);
  });
  document.getElementById("cancel-list-builder-btn").addEventListener("click", () => {
    renderListsOverview();
  });
  document.getElementById("add-product-to-existing-list-btn").addEventListener("click", () => {
    if (currentDetailListId) openListBuilder(currentDetailListId);
  });

  function renderListsOverview() {
    listBuilderView.classList.add("hidden");
    listDetailView.classList.add("hidden");
    listOverviewPanel.classList.remove("hidden");
    listsOverview.innerHTML = "";
    updateGlobalBadges();

    const stats = listManager.getPortfolioStats();
    if (stats.deals.length === 0) {
      listsEmptyState.classList.remove("hidden");
      return;
    }
    listsEmptyState.classList.add("hidden");

    stats.deals.forEach((deal) => {
      const li = document.createElement("li");
      li.className = "list-item-card";
      const isPos = deal.netCashBalance >= 0;
      li.innerHTML = `
        <div class="deal-left">
          <span class="deal-title">${deal.name}</span>
          <span class="deal-sub">
            ${new Date(deal.createdDate).toLocaleDateString("de-DE")} · ${deal.productCount} Produkt(e) · Rest: ${deal.remainingQty}/${deal.initialQty}
            ${deal.openCommission > 0 ? ` · <span class="text-amber">Komm.: ${fmtEur(deal.openCommission)}</span>` : ""}
          </span>
        </div>
        <div class="deal-right">
          <span class="deal-pnl ${isPos ? "text-emerald" : "text-amber"}">
            ${fmtEur(deal.netCashBalance, true)}
          </span>
          <span class="text-muted small">EK: ${fmtEur(deal.invested)}</span>
        </div>
      `;
      li.addEventListener("click", () => {
        const rawList = listManager.getLists().find((l) => l.id === deal.listId);
        if (rawList) renderListDetailsView(rawList);
      });
      listsOverview.appendChild(li);
    });
  }

  function renderListDetailsView(list) {
    currentDetailListId = list.id;
    listOverviewPanel.classList.add("hidden");
    listBuilderView.classList.add("hidden");
    listDetailView.classList.remove("hidden");
    listDetailContainer.innerHTML = "";

    const baseEntries = (list.entries || []).filter((e) => e.type === "base");
    let totalEk = 0;
    let paidCash = 0;
    let openComm = 0;
    let remUnits = 0;
    let initUnits = 0;

    baseEntries.forEach((e) => {
      totalEk += e.baseCost || 0;
      remUnits += e.quantity || 0;
      initUnits += e.initialQuantity || e.quantity || 0;
      (e.partialSales || []).forEach((ps) => {
        const total = ps.partialProfit || 0;
        if (ps.isCommission) {
          const pAmt = ps.paid ? total : ps.paidAmount ?? 0;
          const oAmt = ps.paid ? 0 : ps.openAmount ?? total - pAmt;
          paidCash += pAmt;
          openComm += oAmt;
        } else {
          paidCash += total;
        }
      });
    });

    const netCash = paidCash - totalEk;

    // Header + Statistik-Dashboard der Liste
    const headerHtml = document.createElement("div");
    headerHtml.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <h2>${list.name}</h2>
        <p class="text-muted small">Erstellt am ${new Date(list.createdDate).toLocaleDateString("de-DE")}</p>
      </div>

      <div class="kpi-grid" style="margin-bottom: 1.1rem;">
        <div class="kpi-card ${netCash >= 0 ? "kpi-success" : "kpi-highlight"}">
          <span class="kpi-label">Aktuelle Bilanz (Bar)</span>
          <strong class="kpi-value ${netCash >= 0 ? "text-emerald" : "text-danger"}">${fmtEur(netCash, true)}</strong>
          <span class="kpi-sub">EK: ${fmtEur(totalEk)} · Bar-Umsatz: ${fmtEur(paidCash)}</span>
        </div>
        <div class="kpi-card kpi-amber">
          <span class="kpi-label">Offene Kommission</span>
          <strong class="kpi-value text-amber">${fmtEur(openComm)}</strong>
          <span class="kpi-sub">Inkl. Komm.: ${fmtEur(netCash + openComm, true)}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Waren-Bestand</span>
          <strong class="kpi-value">${parseFloat(remUnits.toFixed(2))} / ${parseFloat(initUnits.toFixed(2))}</strong>
          <span class="kpi-sub">Noch verfügbare Einheiten</span>
        </div>
      </div>
    `;
    listDetailContainer.appendChild(headerHtml);

    if (baseEntries.length === 0) {
      const p = document.createElement("p");
      p.className = "text-muted";
      p.textContent = "Noch keine Produkte in dieser Liste.";
      listDetailContainer.appendChild(p);
      return;
    }

    // Produkte + Verkaufshistorie
    const scrollWrap = document.createElement("div");
    scrollWrap.className = "table-scroll";
    const table = document.createElement("table");
    table.className = "modern-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Produkt / Verkauf</th>
          <th>Bestand / Menge</th>
          <th>EK / VK-Kurs</th>
          <th>Status / Person</th>
          <th>Betrag / Bilanz</th>
          <th>Aktion</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    baseEntries.forEach((entry) => {
      let paidSum = 0;
      let commSum = 0;
      (entry.partialSales || []).forEach((ps) => {
        const total = ps.partialProfit || 0;
        if (ps.isCommission) {
          const pAmt = ps.paid ? total : ps.paidAmount ?? 0;
          const oAmt = ps.paid ? 0 : ps.openAmount ?? total - pAmt;
          paidSum += pAmt;
          commSum += oAmt;
        } else {
          paidSum += total;
        }
      });
      const prodNet = paidSum - (entry.baseCost || 0);

      const tr = document.createElement("tr");
      tr.style.background = "var(--bg-elevated)";
      tr.style.fontWeight = "600";
      tr.innerHTML = `
        <td>📦 ${entry.product}</td>
        <td><strong>${entry.quantity ?? 0}</strong> / ${entry.initialQuantity ?? entry.quantity} übrig</td>
        <td>EK: ${fmtEur(entry.baseCost)} (Ziel: ${fmtEur(entry.targetPrice)})</td>
        <td>Break-Even: ${entry.breakEvenPoint || 0} Einh.</td>
        <td class="${prodNet >= 0 ? "text-emerald" : "text-amber"}">
          ${fmtEur(prodNet, true)}
          ${commSum > 0 ? `<br><small class="text-amber">(+${fmtEur(commSum)} Komm.)</small>` : ""}
        </td>
        <td>–</td>
      `;
      tbody.appendChild(tr);

      (entry.partialSales || []).forEach((ps) => {
        const psRow = document.createElement("tr");
        const isOpenComm = ps.isCommission && !ps.paid;
        const pAmt = ps.paid ? ps.partialProfit : ps.paidAmount ?? 0;
        const oAmt = ps.paid ? 0 : ps.openAmount ?? ps.partialProfit - pAmt;
        psRow.innerHTML = `
          <td style="padding-left: 1.4rem; color: var(--text-secondary);">
            ↳ ${new Date(ps.date).toLocaleDateString("de-DE")}
          </td>
          <td>-${ps.quantitySold} Einh.</td>
          <td>${fmtEur(ps.vkPrice)} / Einh.</td>
          <td>
            ${
              ps.isCommission
                ? `<span class="comm-person-tag">${ps.personCode || "?"}</span> ${
                    ps.paid
                      ? '<span class="text-emerald">✓ Komplett bezahlt</span>'
                      : `<span class="text-amber">Offen: ${fmtEur(oAmt)}${
                          pAmt > 0 ? ` (Angezahlt: ${fmtEur(pAmt)})` : ""
                        }${ps.dueDate ? ` · bis ${ps.dueDate}` : ""}</span>`
                  }`
                : '<span class="text-emerald">Bar bezahlt</span>'
            }
          </td>
          <td class="${isOpenComm ? "text-amber" : "text-emerald"}" style="font-weight:600;">
            +${fmtEur(ps.partialProfit)}
          </td>
          <td>
            ${
              isOpenComm
                ? `<button type="button" class="btn btn-emerald btn-sm mark-paid-inline">Rest bezahlt ✓</button>`
                : ""
            }
          </td>
        `;
        const paidBtn = psRow.querySelector(".mark-paid-inline");
        if (paidBtn) {
          paidBtn.addEventListener("click", () => {
            listManager.markSaleAsPaid(list.id, ps.id);
            showToast(`Zahlung von „${ps.personCode}“ verbucht!`);
            renderListDetailsView(listManager.getLists().find((l) => l.id === list.id));
            updateGlobalBadges();
          });
        }
        tbody.appendChild(psRow);
      });
    });

    scrollWrap.appendChild(table);
    listDetailContainer.appendChild(scrollWrap);
  }

  document.getElementById("back-to-lists-btn").addEventListener("click", () => {
    renderListsOverview();
  });

  document.getElementById("jump-to-sale-btn").addEventListener("click", () => {
    switchTab("tab-quick");
    setQuickMode("liste");
    if (currentDetailListId) {
      fillListNameSelect(currentDetailListId);
    }
  });

  document.getElementById("delete-list-btn").addEventListener("click", () => {
    if (!currentDetailListId) return;
    if (confirm("Möchtest du diese Liste wirklich löschen?")) {
      listManager.deleteList(currentDetailListId);
      currentDetailListId = null;
      renderListsOverview();
      updateGlobalBadges();
      showToast("Liste gelöscht");
    }
  });

  // ==================================================
  // TAB 4: KOMMISSION & SCHULDNER-SYSTEM (PERSONEN-SUBMENÜ, FILTER, WECKER)
  // ==================================================
  const commTotalOpen = document.getElementById("comm-total-open");
  const commOpenCount = document.getElementById("comm-open-count");
  const commOverdueAmount = document.getElementById("comm-overdue-amount");
  const commOverdueCount = document.getElementById("comm-overdue-count");
  const commPaidAmount = document.getElementById("comm-paid-amount");
  const commPaidCount = document.getElementById("comm-paid-count");
  const commSearchInput = document.getElementById("comm-search-input");
  const commPersonPills = document.getElementById("comm-person-pills");
  const commPersonDossier = document.getElementById("comm-person-dossier");
  const commEmptyState = document.getElementById("comm-empty-state");
  const commEntriesList = document.getElementById("comm-entries-list");

  const reminderModal = document.getElementById("reminder-modal");
  const reminderModalClose = document.getElementById("reminder-modal-close");
  const editDueDate = document.getElementById("edit-due-date");
  const editReminderDate = document.getElementById("edit-reminder-date");
  const saveReminderBtn = document.getElementById("save-reminder-btn");

  function renderCommissionTab() {
    updateGlobalBadges();
    const allComm = listManager.getAllCommissionSales();

    const openSales = allComm.filter((s) => !s.paid);
    const overdueSales = openSales.filter((s) => isSaleOverdueOrReminderDue(s));
    const paidSales = allComm.filter((s) => s.paid);

    const getOpenAmt = (s) => (s.paid ? 0 : s.openAmount ?? s.partialProfit ?? 0);
    const getPaidAmt = (s) => (s.paid ? s.partialProfit ?? 0 : s.paidAmount ?? 0);

    const openSum = openSales.reduce((sum, s) => sum + getOpenAmt(s), 0);
    const overdueSum = overdueSales.reduce((sum, s) => sum + getOpenAmt(s), 0);
    const paidSum = allComm.reduce((sum, s) => sum + getPaidAmt(s), 0);

    commTotalOpen.textContent = fmtEur(openSum);
    commOpenCount.textContent = `${openSales.length} offene Posten`;
    commOverdueAmount.textContent = fmtEur(overdueSum);
    commOverdueCount.textContent = `${overdueSales.length} fällig / ansprechen`;
    commPaidAmount.textContent = fmtEur(paidSum);
    commPaidCount.textContent = `${paidSales.length} komplett erledigt`;

    // Status-Filter-Buttons synchronisieren
    document.querySelectorAll("#comm-status-filters .pill-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.status === commStatusFilter);
    });

    // Personen-Submenü (Kumulierte Summen pro Person inkl. Teilzahlungen)
    const personMap = new Map();
    allComm.forEach((s) => {
      const code = s.personCode || "Unbekannt";
      if (!personMap.has(code)) {
        personMap.set(code, { code, openSum: 0, paidSum: 0, openCount: 0, totalCount: 0 });
      }
      const p = personMap.get(code);
      p.totalCount += 1;
      p.paidSum += getPaidAmt(s);
      p.openSum += getOpenAmt(s);
      if (!s.paid) p.openCount += 1;
    });

    commPersonPills.innerHTML = "";
    const allPill = document.createElement("button");
    allPill.type = "button";
    allPill.className = `person-pill ${commSelectedPerson === "" ? "active" : ""}`;
    allPill.textContent = "Alle Personen";
    allPill.addEventListener("click", () => {
      commSelectedPerson = "";
      renderCommissionTab();
    });
    commPersonPills.appendChild(allPill);

    personMap.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `person-pill ${commSelectedPerson === p.code ? "active" : ""}`;
      btn.innerHTML = `<span>👤 ${p.code}</span> <strong>${fmtEur(p.openSum)}</strong>`;
      btn.addEventListener("click", () => {
        commSelectedPerson = commSelectedPerson === p.code ? "" : p.code;
        renderCommissionTab();
      });
      commPersonPills.appendChild(btn);
    });

    // Personen-Dossier (Spezifische Akte, wenn eine Person geklickt wurde)
    if (commSelectedPerson && personMap.has(commSelectedPerson)) {
      const p = personMap.get(commSelectedPerson);
      commPersonDossier.classList.remove("hidden");
      commPersonDossier.innerHTML = `
        <div class="card-header-row" style="margin-bottom: 0.35rem;">
          <div>
            <h3>👤 Personen-Akte: ${p.code}</h3>
            <p class="text-muted small">Gesamtverlauf über alle Listen hinweg</p>
          </div>
          <div style="text-align: right;">
            <span class="text-muted small">Offene Gesamtschuld:</span>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 1.35rem; font-weight: 700; color: var(--amber);">
              ${fmtEur(p.openSum)}
            </div>
            <span class="text-muted small">Bereits gezahlt: ${fmtEur(p.paidSum)}</span>
          </div>
        </div>
      `;
    } else {
      commPersonDossier.classList.add("hidden");
    }

    // Einträge filtern
    const query = commSearchInput.value.trim().toLowerCase();
    const filtered = allComm
      .filter((s) => {
        if (commSelectedPerson && (s.personCode || "Unbekannt") !== commSelectedPerson) {
          return false;
        }
        if (commStatusFilter === "open" && s.paid) return false;
        if (commStatusFilter === "overdue" && !isSaleOverdueOrReminderDue(s)) return false;
        if (commStatusFilter === "paid" && !s.paid) return false;

        if (query) {
          const hay = `${s.personCode} ${s.product} ${s.listName}`.toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    commEntriesList.innerHTML = "";
    if (filtered.length === 0) {
      commEmptyState.classList.remove("hidden");
      return;
    }
    commEmptyState.classList.add("hidden");

    filtered.forEach((s) => {
      const overdue = isSaleOverdueOrReminderDue(s);
      const openAmt = getOpenAmt(s);
      const paidAmt = getPaidAmt(s);
      const card = document.createElement("div");
      card.className = `comm-card ${overdue ? "overdue" : ""}`;
      card.innerHTML = `
        <div class="deal-left">
          <div>
            <span class="comm-person-tag">👤 ${s.personCode || "Unbekannt"}</span>
            <strong>${s.product}</strong> (${s.quantitySold} Einh. × ${fmtEur(s.vkPrice)} = ${fmtEur(s.partialProfit)})
          </div>
          <span class="deal-sub">
            Liste: <strong>${s.listName}</strong> · Verkauft am ${new Date(s.date).toLocaleDateString("de-DE")}
            ${paidAmt > 0 && !s.paid ? ` · <span class="text-emerald">Bereits gezahlt: ${fmtEur(paidAmt)}</span>` : ""}
            ${s.dueDate ? ` · 📅 Zahltag: <strong>${s.dueDate}</strong>` : ""}
            ${s.reminderDate ? ` · 🔔 Erinnerung: <strong>${s.reminderDate}</strong>` : ""}
          </span>
        </div>

        <div class="comm-actions">
          <div style="text-align: right; margin-right: 0.4rem;">
            <strong style="font-family: 'JetBrains Mono', monospace; font-size: 1.05rem;" class="${
              s.paid ? "text-emerald" : overdue ? "text-danger" : "text-amber"
            }">
              ${s.paid ? fmtEur(s.partialProfit) : `Offen: ${fmtEur(openAmt)}`}
            </strong>
          </div>
          ${
            !s.paid
              ? `
                <button type="button" class="btn btn-secondary btn-sm btn-installment" title="Teilzahlung eintragen">💶 Teilzahlung</button>
                <button type="button" class="btn btn-secondary btn-sm btn-remind" title="Erinnerung / Datum einstellen">🔔 Datum</button>
                <button type="button" class="btn btn-emerald btn-sm btn-mark-paid">✓ Komplett</button>
              `
              : `<span class="text-emerald small">Bezahlt am ${new Date(
                  s.paidDate || s.date
                ).toLocaleDateString("de-DE")}</span>`
          }
        </div>
      `;

      const instBtn = card.querySelector(".btn-installment");
      if (instBtn) {
        instBtn.addEventListener("click", () => {
          installmentModalTarget = {
            listId: s.listId,
            saleId: s.id,
            openAmount: openAmt,
            personCode: s.personCode,
          };
          document.getElementById(
            "installment-modal-title"
          ).textContent = `Teilzahlung von „${s.personCode}“`;
          document.getElementById(
            "installment-modal-info"
          ).textContent = `Produkt: ${s.product} · Aktuell noch offen: ${fmtEur(openAmt)}`;
          document.getElementById("installment-amount-input").value = "";
          document.getElementById("installment-modal").classList.remove("hidden");
          document.getElementById("installment-amount-input").focus();
        });
      }

      const remindBtn = card.querySelector(".btn-remind");
      if (remindBtn) {
        remindBtn.addEventListener("click", () => {
          reminderModalTarget = { listId: s.listId, saleId: s.id };
          document.getElementById(
            "reminder-modal-title"
          ).textContent = `Erinnerung für „${s.personCode}“ (${s.product})`;
          editDueDate.value = s.dueDate || "";
          editReminderDate.value = s.reminderDate || "";
          reminderModal.classList.remove("hidden");
        });
      }

      const paidBtn = card.querySelector(".btn-mark-paid");
      if (paidBtn) {
        paidBtn.addEventListener("click", () => {
          listManager.markSaleAsPaid(s.listId, s.id);
          showToast(`Restbetrag von „${s.personCode}“ (${fmtEur(openAmt)}) als bezahlt markiert!`);
          renderCommissionTab();
        });
      }

      commEntriesList.appendChild(card);
    });
  }

  document.querySelectorAll("#comm-status-filters .pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      commStatusFilter = btn.dataset.status;
      renderCommissionTab();
    });
  });

  commSearchInput.addEventListener("input", () => renderCommissionTab());

  reminderModalClose.addEventListener("click", () => {
    reminderModal.classList.add("hidden");
  });

  saveReminderBtn.addEventListener("click", () => {
    if (!reminderModalTarget) return;
    listManager.updateSaleReminder(reminderModalTarget.listId, reminderModalTarget.saleId, {
      dueDate: editDueDate.value || null,
      reminderDate: editReminderDate.value || null,
    });
    reminderModal.classList.add("hidden");
    showToast("Erinnerung & Zahltag gespeichert!");
    renderCommissionTab();
  });

  // Teilzahlungs-Modal Events
  const installmentModal = document.getElementById("installment-modal");
  const installmentModalClose = document.getElementById("installment-modal-close");
  const saveInstallmentBtn = document.getElementById("save-installment-btn");

  installmentModalClose.addEventListener("click", () => {
    installmentModal.classList.add("hidden");
  });

  saveInstallmentBtn.addEventListener("click", () => {
    if (!installmentModalTarget) return;
    const amt = parseNum(document.getElementById("installment-amount-input").value);
    if (amt <= 0) {
      showToast("Bitte einen Betrag größer 0 eingeben");
      return;
    }
    const ok = listManager.recordCommissionInstallment(
      installmentModalTarget.listId,
      installmentModalTarget.saleId,
      amt
    );
    if (ok) {
      installmentModal.classList.add("hidden");
      showToast(`Teilzahlung (${fmtEur(amt)}) von „${installmentModalTarget.personCode}“ verbucht!`);
      renderCommissionTab();
    }
  });

  // ==================================================
  // FIREBASE AUTHENTICATION (LOGIN, REGISTRIERUNG, PASSWORT-RESET)
  // Alle App-Daten bleiben 100% lokal im Browser (localStorage)!
  // ==================================================
  const authUserBtn = document.getElementById("auth-user-btn");
  const authStatusDot = document.getElementById("auth-status-dot");
  const authModal = document.getElementById("auth-modal");
  const authModalClose = document.getElementById("auth-modal-close");
  const authLoggedInView = document.getElementById("auth-logged-in-view");
  const authFormsView = document.getElementById("auth-forms-view");
  const authUserEmail = document.getElementById("auth-user-email");
  const authLogoutBtn = document.getElementById("auth-logout-btn");
  const authTabBtns = document.querySelectorAll("#auth-tabs .segment-btn");
  const authForm = document.getElementById("auth-form");
  const authEmailInput = document.getElementById("auth-email");
  const authPasswordInput = document.getElementById("auth-password");
  const authSubmitBtn = document.getElementById("auth-submit-btn");
  const authForgotLink = document.getElementById("auth-forgot-link");
  const authErrorMsg = document.getElementById("auth-error-msg");
  const exportDataBtn = document.getElementById("export-data-btn");
  const importDataFile = document.getElementById("import-data-file");

  // Service Worker für echte iPhone / Android PWA-Installation registrieren
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // Lokales Backup (Export & Import als JSON-Datei auf dem Gerät)
  if (exportDataBtn) {
    exportDataBtn.addEventListener("click", () => {
      const payload = {
        app: "StreetC Pro",
        exportedAt: new Date().toISOString(),
        matrixLists: listManager.getLists(),
        calcHistory: historyManager.getHistory(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `streetc-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Backup-Datei heruntergeladen!");
    });
  }

  if (importDataFile) {
    importDataFile.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (Array.isArray(parsed.matrixLists)) {
            localStorage.setItem("matrixLists", JSON.stringify(parsed.matrixLists));
            listManager.lists = parsed.matrixLists;
            listManager._migrateLegacyData();
          }
          if (Array.isArray(parsed.calcHistory)) {
            localStorage.setItem("calcHistory", JSON.stringify(parsed.calcHistory));
            historyManager.loadFromLocalStorage();
          }
          renderDashboard();
          renderHistory();
          showToast("Backup erfolgreich wiederhergestellt!");
        } catch {
          showToast("Ungültige Backup-Datei");
        }
      };
      reader.readAsText(file);
    });
  }

  let currentAuthMode = "login"; // "login" | "register"
  let firebaseAuthInstance = null;
  let firebaseFns = null;

  function showAuthNotice(msg) {
    if (!authErrorMsg) return;
    if (!msg) {
      authErrorMsg.classList.add("hidden");
      authErrorMsg.textContent = "";
    } else {
      authErrorMsg.textContent = msg;
      authErrorMsg.classList.remove("hidden");
    }
  }

  async function initFirebaseAuth() {
    try {
      const [{ initializeApp }, authMod] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js"),
      ]);
      const firebaseConfig = {
        apiKey: "AIzaSyBEVzoU8XExcYFEYCj-9WZXmdhAb0Rh7Pc",
        authDomain: "taschenrechnerpro.firebaseapp.com",
        projectId: "taschenrechnerpro",
        storageBucket: "taschenrechnerpro.firebasestorage.app",
        messagingSenderId: "605428309138",
        appId: "1:605428309138:web:ffa9e542cc6f8ad327da4b",
      };
      const app = initializeApp(firebaseConfig);
      firebaseAuthInstance = authMod.getAuth(app);
      firebaseFns = authMod;

      authMod.onAuthStateChanged(firebaseAuthInstance, (user) => {
        if (user) {
          authStatusDot.classList.remove("hidden");
          authUserEmail.textContent = user.email;
          authLoggedInView.classList.remove("hidden");
          authFormsView.classList.add("hidden");
        } else {
          authStatusDot.classList.add("hidden");
          authLoggedInView.classList.add("hidden");
          authFormsView.classList.remove("hidden");
        }
      });
    } catch (err) {
      console.warn("Firebase Auth Hinweis:", err);
    }
  }

  initFirebaseAuth();

  authUserBtn.addEventListener("click", () => {
    authModal.classList.remove("hidden");
  });
  authModalClose.addEventListener("click", () => {
    authModal.classList.add("hidden");
  });

  authTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentAuthMode = btn.dataset.authtab;
      authTabBtns.forEach((b) => b.classList.toggle("active", b === btn));
      authSubmitBtn.textContent =
        currentAuthMode === "login" ? "Jetzt einloggen" : "Kostenlos registrieren";
    });
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = authEmailInput.value.trim();
    const pass = authPasswordInput.value;
    if (!email || pass.length < 6) {
      showToast("Bitte gültige E-Mail und Passwort (mind. 6 Zeichen) eingeben");
      return;
    }
    if (!firebaseAuthInstance || !firebaseFns) {
      showToast("Auth-Service wird geladen...");
      return;
    }

    try {
      showAuthNotice("");
      if (currentAuthMode === "login") {
        await firebaseFns.signInWithEmailAndPassword(firebaseAuthInstance, email, pass);
        showToast("Erfolgreich bei StreetC eingeloggt!");
      } else {
        await firebaseFns.createUserWithEmailAndPassword(firebaseAuthInstance, email, pass);
        showToast("Account erfolgreich registriert!");
      }
      authPasswordInput.value = "";
      authModal.classList.add("hidden");
    } catch (err) {
      // Falls in Firebase Console "Email/Password" oder "streetc.netlify.app" noch nicht freigeschaltet wurde:
      const code = err.code || "";
      if (code.includes("unauthorized-domain") || code.includes("operation-not-allowed")) {
        showAuthNotice(
          `Firebase-Hinweis (${code}): Bitte in der Firebase-Konsole (Projekt taschenrechnerpro) unter Authentication -> Sign-in method "E-Mail/Passwort" aktivieren und unter Settings -> Authorized domains "streetc.netlify.app" eintragen.`
        );
      } else {
        showAuthNotice(`Login-Hinweis: ${code || err.message}`);
      }
      showToast(`Hinweis: ${code || err.message}`);
    }
  });

  authForgotLink.addEventListener("click", async () => {
    const email = authEmailInput.value.trim();
    if (!email) {
      showToast("Bitte oben deine E-Mail-Adresse eintragen, dann hier klicken!");
      authEmailInput.focus();
      return;
    }
    if (!firebaseAuthInstance || !firebaseFns) return;
    try {
      await firebaseFns.sendPasswordResetEmail(firebaseAuthInstance, email);
      showToast(`Passwort-Reset-Link wurde an ${email} gesendet!`);
    } catch (err) {
      showToast(`Fehler beim Senden: ${err.code || err.message}`);
    }
  });

  authLogoutBtn.addEventListener("click", async () => {
    if (firebaseAuthInstance && firebaseFns) {
      await firebaseFns.signOut(firebaseAuthInstance);
      showToast("Ausgeloggt");
    }
  });

  // ==================================================
  // Globale Badges & Interne Erinnerungs-Glocke
  // ==================================================
  function updateGlobalBadges() {
    const listsCount = listManager.getLists().length;
    const listsBadge = document.getElementById("lists-count-badge");
    listsBadge.textContent = listsCount;
    listsBadge.classList.toggle("hidden", listsCount === 0);

    const allComm = listManager.getAllCommissionSales();
    const openComm = allComm.filter((s) => !s.paid);
    const overdueComm = openComm.filter((s) => isSaleOverdueOrReminderDue(s));

    const commNavBadge = document.getElementById("comm-nav-badge");
    commNavBadge.textContent = openComm.length;
    commNavBadge.classList.toggle("hidden", openComm.length === 0);

    const notifBadge = document.getElementById("notif-badge");
    notifBadge.textContent = overdueComm.length;
    notifBadge.classList.toggle("hidden", overdueComm.length === 0);

    if (overdueComm.length > 0) {
      dashboardAlertBanner.classList.remove("hidden");
      const names = [...new Set(overdueComm.map((s) => s.personCode || "Unbekannt"))].join(", ");
      dashboardAlertText.textContent = `🔔 ${overdueComm.length} Zahlungserinnerung(en) fällig (${names})!`;
    } else {
      dashboardAlertBanner.classList.add("hidden");
    }
  }

  // ==================================================
  // TAB 5: MATRIX & BREAK-EVEN SIMULATOR
  // ==================================================
  const matrixForm = document.getElementById("matrix-form");
  const addToListBtn = document.getElementById("add-to-list-btn");
  const matrixKpiGrid = document.getElementById("matrix-kpi-grid");
  const matrixTablesWrap = document.getElementById("matrix-tables-wrap");
  const kpiUnitCost = document.getElementById("kpi-unit-cost");
  const kpiMarginPct = document.getElementById("kpi-margin-pct");
  const kpiBreakeven = document.getElementById("kpi-breakeven");
  const kpiRemaining = document.getElementById("kpi-remaining");
  const kpiProfit = document.getElementById("kpi-profit");
  const kpiRevenue = document.getElementById("kpi-revenue");

  MatrixCalculator.prototype.calculateBreakEven = function (
    purchasePrice,
    quantity,
    targetPrice
  ) {
    const ek = purchasePrice;
    const vk = targetPrice * quantity;
    const breakEven = Math.ceil(ek / targetPrice);
    const remainingQuantity = Math.max(0, parseFloat((quantity - breakEven).toFixed(2)));
    const reingewinn = vk - ek;
    return [
      {
        warenmenge: quantity,
        ek,
        vk,
        breakEven,
        remainingQuantity,
        reingewinn,
      },
    ];
  };

  MatrixCalculator.prototype.initializeCorrectionData = function (warenmenge, ek, vk) {
    const unitCost = warenmenge > 0 ? ek / warenmenge : 0;
    this.correctionData = [
      {
        warenmenge,
        ek: unitCost,
        vk,
        gewinn: (vk - unitCost) * warenmenge,
      },
    ];
  };

  MatrixCalculator.prototype.updateBreakEvenTable = function (results, productName) {
    const breakEvenTable = document.querySelector("#break-even-table tbody");
    if (!breakEvenTable) return;
    breakEvenTable.innerHTML = "";
    results.forEach((result) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${productName}</strong></td>
        <td>${result.warenmenge}</td>
        <td>${fmtEur(result.ek)}</td>
        <td>${fmtEur(result.vk)}</td>
        <td>${result.breakEven} Einh.</td>
        <td>${result.remainingQuantity}</td>
        <td class="text-emerald" style="font-weight: 700;">${fmtEur(result.reingewinn, true)}</td>
      `;
      breakEvenTable.appendChild(row);
    });
  };

  MatrixCalculator.prototype.updateCorrectionTable = function () {
    const correctionTable = document.querySelector("#correction-table tbody");
    if (!correctionTable) return;
    correctionTable.innerHTML = "";
    this.correctionData.forEach((data, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox" class="correction-checkbox" data-index="${index}" /></td>
        <td contenteditable="true" class="editable-quantity">${data.warenmenge}</td>
        <td contenteditable="true" class="editable-vk">${data.vk.toFixed(2)}</td>
        <td><strong>${fmtEur(data.gewinn, true)}</strong></td>
      `;
      correctionTable.appendChild(row);

      row.querySelector(".editable-quantity").addEventListener("blur", (e) => {
        data.warenmenge = parseNum(e.target.textContent);
        data.gewinn = (data.vk - data.ek) * data.warenmenge;
        this.updateCorrectionTable();
      });

      row.querySelector(".editable-vk").addEventListener("blur", (e) => {
        data.vk = parseNum(e.target.textContent);
        data.gewinn = (data.vk - data.ek) * data.warenmenge;
        this.updateCorrectionTable();
      });

      row.querySelector(".correction-checkbox").addEventListener("change", (e) => {
        if (e.target.checked) {
          this.applyCorrectionToBreakEven(data);
          showToast("Szenario übernommen");
        }
      });
    });
  };

  MatrixCalculator.prototype.applyCorrectionToBreakEven = function (correction) {
    const newRow = {
      warenmenge: correction.warenmenge,
      ek: correction.ek * correction.warenmenge,
      vk: correction.vk * correction.warenmenge,
      breakEven: Math.ceil((correction.ek * correction.warenmenge) / correction.vk),
      remainingQuantity: Math.max(0, this.remainingQuantity - correction.warenmenge),
      reingewinn:
        correction.vk * correction.warenmenge - correction.ek * correction.warenmenge,
    };
    this.breakEvenResults.push(newRow);
    this.updateBreakEvenTable(this.breakEvenResults, this.productName);
  };

  matrixForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const purchasePrice = parseNum(document.getElementById("purchase-price").value);
    const quantity = parseNum(document.getElementById("quantity").value);
    const targetPrice = parseNum(document.getElementById("target-price").value);
    const productName = document.getElementById("product").value.trim();

    if (purchasePrice <= 0 || quantity <= 0 || targetPrice <= 0 || !productName) {
      showToast("Bitte alle Felder gültig ausfüllen");
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
    matrixCalculator.initializeCorrectionData(quantity, purchasePrice, targetPrice);
    matrixCalculator.updateBreakEvenTable(results, productName);
    matrixCalculator.updateCorrectionTable();

    const unitCost = purchasePrice / quantity;
    const revenue = targetPrice * quantity;
    const profit = revenue - purchasePrice;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    kpiUnitCost.textContent = fmtEur(unitCost);
    kpiMarginPct.textContent = `Marge: ${marginPct.toFixed(1)}%`;
    kpiBreakeven.textContent = `${results[0].breakEven} Einh.`;
    kpiRemaining.textContent = `${results[0].remainingQuantity} Einh. im Plus`;
    kpiProfit.textContent = fmtEur(profit, true);
    kpiRevenue.textContent = `Umsatz: ${fmtEur(revenue)}`;

    matrixKpiGrid.classList.remove("hidden");
    matrixTablesWrap.classList.remove("hidden");
    addToListBtn.disabled = false;
    showToast("Break-Even berechnet");
  });

  // Matrix -> In Liste übernehmen Modal
  const listModal = document.getElementById("list-modal");
  const listModalCloseBtn = document.getElementById("list-modal-close-btn");
  const newListBtn = document.getElementById("new-list-btn");
  const chooseListBtn = document.getElementById("choose-list-btn");
  const newListForm = document.getElementById("new-list-form");
  const existingListForm = document.getElementById("existing-list-form");
  const newListNameInput = document.getElementById("new-list-name");
  const createListConfirmBtn = document.getElementById("create-list-confirm-btn");
  const existingListSelect = document.getElementById("existing-list-select");
  const chooseListConfirmBtn = document.getElementById("choose-list-confirm-btn");

  function showModalTab(tab) {
    const isNew = tab === "new";
    newListBtn.classList.toggle("active", isNew);
    chooseListBtn.classList.toggle("active", !isNew);
    newListForm.classList.toggle("hidden", !isNew);
    existingListForm.classList.toggle("hidden", isNew);
    if (!isNew) {
      existingListSelect.innerHTML = "";
      listManager.getLists().forEach((list) => {
        const option = document.createElement("option");
        option.value = list.id;
        option.textContent = list.name;
        existingListSelect.appendChild(option);
      });
    }
  }

  addToListBtn.addEventListener("click", () => {
    listModal.classList.remove("hidden");
    showModalTab(listManager.getLists().length === 0 ? "new" : "existing");
  });
  newListBtn.addEventListener("click", () => showModalTab("new"));
  chooseListBtn.addEventListener("click", () => showModalTab("existing"));
  listModalCloseBtn.addEventListener("click", () => listModal.classList.add("hidden"));

  createListConfirmBtn.addEventListener("click", () => {
    const name = newListNameInput.value.trim();
    if (!name) return showToast("Bitte Listennamen eingeben");
    const created = listManager.createList(name);
    newListNameInput.value = "";
    listModal.classList.add("hidden");
    saveMatrixProductToList(created.id);
  });

  chooseListConfirmBtn.addEventListener("click", () => {
    const id = parseInt(existingListSelect.value);
    if (!id) return showToast("Bitte Liste wählen");
    listModal.classList.add("hidden");
    saveMatrixProductToList(id);
  });

  function saveMatrixProductToList(listId) {
    const product = document.getElementById("product").value.trim();
    const qty = matrixCalculator.originalQuantity || 0;
    const be = matrixCalculator.breakEvenResults[0]?.breakEven || 0;
    const vk = parseNum(document.getElementById("target-price").value);
    const ek = parseNum(document.getElementById("purchase-price").value);

    listManager.addEntryToList(listId, {
      type: "base",
      datum: new Date().toISOString(),
      product,
      initialQuantity: qty,
      quantity: qty,
      breakEvenPoint: be,
      targetPrice: vk,
      baseCost: ek,
      partialSales: [],
    });
    updateGlobalBadges();
    showToast(`„${product}“ in Liste gespeichert!`);
  }

  // ==================================================
  // Rechenverlauf Drawer
  // ==================================================
  const toggleHistoryBtn = document.getElementById("toggle-history-btn");
  const closeHistoryBtn = document.getElementById("close-history-btn");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const historyPanel = document.getElementById("history-panel");
  const historyBackdrop = document.getElementById("history-backdrop");
  const historyList = document.getElementById("history-list");
  const historyBadge = document.getElementById("history-badge");

  function closeHistoryDrawer() {
    historyPanel.classList.add("hidden");
    historyBackdrop.classList.add("hidden");
  }

  toggleHistoryBtn.addEventListener("click", () => {
    historyPanel.classList.remove("hidden");
    historyBackdrop.classList.remove("hidden");
  });
  closeHistoryBtn.addEventListener("click", closeHistoryDrawer);
  historyBackdrop.addEventListener("click", closeHistoryDrawer);

  clearHistoryBtn.addEventListener("click", () => {
    historyManager.clearHistory();
    renderHistory();
    showToast("Verlauf geleert");
  });

  function renderHistory() {
    const items = historyManager.getHistory();
    historyList.innerHTML = "";
    historyBadge.textContent = items.length;
    historyBadge.classList.toggle("hidden", items.length === 0);

    if (items.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Noch keine Berechnungen vorhanden.";
      li.style.color = "var(--text-muted)";
      historyList.appendChild(li);
      return;
    }

    items
      .slice()
      .reverse()
      .forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${item.operation}</span><strong class="text-emerald">${item.result}</strong>`;
        li.addEventListener("click", () => {
          if (activeInput && item.rawValue) {
            activeInput.value = item.rawValue;
            activeInput.dispatchEvent(new Event("input"));
            closeHistoryDrawer();
            showToast(`Wert ${item.rawValue} eingesetzt`);
          }
        });
        historyList.appendChild(li);
      });
  }

  // Initialer Start auf dem TradeRepublic-Dashboard
  renderHistory();
  setQuickMode("angebot");
  renderDashboard();
});
