export class ListManager {
  constructor() {
    this.lists = JSON.parse(localStorage.getItem("matrixLists")) || [];
    this._migrateLegacyData();
  }

  // Stellt sicher, dass ältere Einträge alle neuen Felder (inkl. Teilzahlung) besitzen
  _migrateLegacyData() {
    let changed = false;
    this.lists.forEach((list) => {
      (list.entries || []).forEach((entry) => {
        if (entry.type === "base") {
          if (entry.initialQuantity === undefined) {
            const sold = (entry.partialSales || []).reduce(
              (s, ps) => s + (ps.quantitySold || 0),
              0
            );
            entry.initialQuantity = (entry.quantity || 0) + sold;
            changed = true;
          }
          (entry.partialSales || []).forEach((ps, idx) => {
            if (!ps.id) {
              ps.id = `${list.id}-${idx}-${Date.now()}`;
              changed = true;
            }
            const total = ps.partialProfit || (ps.quantitySold || 0) * (ps.vkPrice || 0);
            if (ps.isCommission === undefined) {
              ps.isCommission = false;
              ps.paid = true;
              ps.paidAmount = total;
              ps.openAmount = 0;
              changed = true;
            } else if (ps.paidAmount === undefined || ps.openAmount === undefined) {
              if (ps.paid) {
                ps.paidAmount = total;
                ps.openAmount = 0;
              } else {
                ps.paidAmount = 0;
                ps.openAmount = total;
              }
              changed = true;
            }
          });
        }
      });
    });
    if (changed) this._save();
  }

  // Neue Liste erstellen (optional direkt mit mehreren Produkten)
  createList(name, initialEntries = [], createdDate = new Date().toISOString()) {
    const newList = {
      id: Date.now(),
      name,
      createdDate,
      entries: initialEntries.map((e) => ({
        type: "base",
        datum: e.datum || createdDate,
        product: e.product,
        initialQuantity: e.quantity,
        quantity: e.quantity,
        breakEvenPoint: e.breakEvenPoint || Math.ceil((e.baseCost || 0) / (e.targetPrice || 1)),
        targetPrice: e.targetPrice,
        baseCost: e.baseCost,
        partialSales: [],
      })),
    };
    this.lists.push(newList);
    this._save();
    return newList;
  }

  // Weiteres Basis-Produkt zu einer bestehenden Liste hinzufügen
  addEntryToList(listId, entry) {
    const list = this.lists.find((l) => l.id === listId);
    if (list) {
      if (entry.initialQuantity === undefined) {
        entry.initialQuantity = entry.quantity;
      }
      list.entries.push(entry);
      this._save();
      return true;
    }
    return false;
  }

  // Teilverkauf (Bar, Komplett-Kommission oder Kommission mit Anzahlung/Teilzahlung) hinzufügen
  addPartialSale(listId, partialSale) {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return false;

    const baseEntry = list.entries.find(
      (e) => e.type === "base" && e.product === partialSale.product
    );
    if (!baseEntry) return false;

    baseEntry.partialSales = baseEntry.partialSales || [];
    const totalAmount = parseFloat((partialSale.quantitySold * partialSale.vkPrice).toFixed(2));
    const isComm = Boolean(partialSale.isCommission);

    let paidUpfront = totalAmount;
    if (isComm) {
      paidUpfront = Math.min(
        totalAmount,
        Math.max(0, parseFloat((Number(partialSale.paidUpfront) || 0).toFixed(2)))
      );
    }
    const openAmount = Math.max(0, parseFloat((totalAmount - paidUpfront).toFixed(2)));
    const isFullyPaid = !isComm || openAmount <= 0;

    const saleRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: "sale",
      date: partialSale.date || new Date().toISOString(),
      product: partialSale.product,
      quantitySold: partialSale.quantitySold,
      vkPrice: partialSale.vkPrice,
      partialProfit: totalAmount,
      isCommission: isComm,
      hasPartialPayment: isComm && paidUpfront > 0 && openAmount > 0,
      paidAmount: paidUpfront,
      openAmount: openAmount,
      paid: isFullyPaid,
      paidDate: isFullyPaid ? new Date().toISOString() : null,
      personCode: partialSale.personCode ? partialSale.personCode.trim() : "",
      dueDate: partialSale.dueDate || null,
      reminderDate: partialSale.reminderDate || null,
      note: partialSale.note || "",
    };

    baseEntry.partialSales.push(saleRecord);

    // Verkaufte Menge vom Lagerbestand abziehen
    baseEntry.quantity = Math.max(
      0,
      parseFloat(((baseEntry.quantity || 0) - partialSale.quantitySold).toFixed(2))
    );

    this._save();
    return saleRecord;
  }

  // Kommissions-Verkauf komplett als bezahlt markieren
  markSaleAsPaid(listId, saleId) {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return false;
    for (const entry of list.entries) {
      if (entry.type === "base" && entry.partialSales) {
        const sale = entry.partialSales.find((ps) => ps.id === saleId);
        if (sale) {
          const total = sale.partialProfit || 0;
          sale.paidAmount = total;
          sale.openAmount = 0;
          sale.paid = true;
          sale.paidDate = new Date().toISOString();
          this._save();
          return true;
        }
      }
    }
    return false;
  }

  // Weitere Teilzahlung auf einen offenen Kommissions-Posten buchen
  recordCommissionInstallment(listId, saleId, additionalAmount) {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return false;
    const add = Number(additionalAmount) || 0;
    if (add <= 0) return false;

    for (const entry of list.entries) {
      if (entry.type === "base" && entry.partialSales) {
        const sale = entry.partialSales.find((ps) => ps.id === saleId);
        if (sale) {
          const total = sale.partialProfit || 0;
          sale.paidAmount = Math.min(total, parseFloat(((sale.paidAmount || 0) + add).toFixed(2)));
          sale.openAmount = Math.max(0, parseFloat((total - sale.paidAmount).toFixed(2)));
          if (sale.openAmount <= 0) {
            sale.paid = true;
            sale.paidDate = new Date().toISOString();
          }
          this._save();
          return true;
        }
      }
    }
    return false;
  }

  // Kommissions-Erinnerung / Fälligkeitsdatum aktualisieren
  updateSaleReminder(listId, saleId, { dueDate, reminderDate }) {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return false;
    for (const entry of list.entries) {
      if (entry.type === "base" && entry.partialSales) {
        const sale = entry.partialSales.find((ps) => ps.id === saleId);
        if (sale) {
          if (dueDate !== undefined) sale.dueDate = dueDate;
          if (reminderDate !== undefined) sale.reminderDate = reminderDate;
          this._save();
          return true;
        }
      }
    }
    return false;
  }

  // Alle Kommissions-Einträge über alle Listen hinweg abrufen
  getAllCommissionSales() {
    const result = [];
    this.lists.forEach((list) => {
      (list.entries || []).forEach((entry) => {
        if (entry.type === "base" && entry.partialSales) {
          entry.partialSales.forEach((ps) => {
            if (ps.isCommission) {
              result.push({
                ...ps,
                listId: list.id,
                listName: list.name,
              });
            }
          });
        }
      });
    });
    return result;
  }

  // Portfolio-Gesamtstatistik für das Start-Dashboard (berücksichtigt Teilzahlungen exakt!)
  getPortfolioStats() {
    let totalInvested = 0;
    let totalRealizedCash = 0;
    let totalOpenCommission = 0;
    let totalInventoryValue = 0;
    const deals = [];

    this.lists.forEach((list) => {
      let listCost = 0;
      let listPaidRevenue = 0;
      let listOpenCommission = 0;
      let listRemainingQty = 0;
      let listInitialQty = 0;

      (list.entries || []).forEach((entry) => {
        if (entry.type === "base") {
          const cost = entry.baseCost || 0;
          const remQty = entry.quantity || 0;
          const initQty = entry.initialQuantity || remQty;
          const targetVk = entry.targetPrice || 0;

          listCost += cost;
          listRemainingQty += remQty;
          listInitialQty += initQty;
          totalInventoryValue += remQty * targetVk;

          let entryPaidRev = 0;
          let entryOpenComm = 0;

          (entry.partialSales || []).forEach((ps) => {
            const total = ps.partialProfit || 0;
            if (ps.isCommission) {
              const paidPart = ps.paid ? total : ps.paidAmount ?? 0;
              const openPart = ps.paid ? 0 : ps.openAmount ?? total - paidPart;
              entryPaidRev += paidPart;
              entryOpenComm += openPart;
            } else {
              entryPaidRev += total;
            }
          });

          listPaidRevenue += entryPaidRev;
          listOpenCommission += entryOpenComm;
        }
      });

      totalInvested += listCost;
      totalRealizedCash += listPaidRevenue;
      totalOpenCommission += listOpenCommission;

      const netCashBalance = listPaidRevenue - listCost;
      const netInclCommission = listPaidRevenue + listOpenCommission - listCost;
      const roiPct = listCost > 0 ? (netCashBalance / listCost) * 100 : 0;

      deals.push({
        listId: list.id,
        name: list.name,
        createdDate: list.createdDate,
        productCount: (list.entries || []).filter((e) => e.type === "base").length,
        invested: listCost,
        realizedCash: listPaidRevenue,
        openCommission: listOpenCommission,
        netCashBalance,
        netInclCommission,
        roiPct,
        remainingQty: parseFloat(listRemainingQty.toFixed(2)),
        initialQty: parseFloat(listInitialQty.toFixed(2)),
      });
    });

    const netTotalCash = totalRealizedCash - totalInvested;
    const netTotalInclCommission = totalRealizedCash + totalOpenCommission - totalInvested;
    const totalRoiPct = totalInvested > 0 ? (netTotalCash / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalRealizedCash,
      totalOpenCommission,
      totalInventoryValue,
      netTotalCash,
      netTotalInclCommission,
      totalRoiPct,
      deals,
    };
  }

  getLists() {
    return this.lists;
  }

  deleteList(listId) {
    const prevLen = this.lists.length;
    this.lists = this.lists.filter((l) => l.id !== listId);
    this._save();
    return this.lists.length < prevLen;
  }

  _save() {
    localStorage.setItem("matrixLists", JSON.stringify(this.lists));
  }
}
