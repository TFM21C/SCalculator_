export class ListManager {
  constructor() {
    this.lists = JSON.parse(localStorage.getItem("matrixLists")) || [];
  }

  // Neue Liste erstellen
  createList(name, createdDate = new Date().toISOString()) {
    const newList = {
      id: Date.now(),
      name,
      createdDate,
      entries: [],
    };
    this.lists.push(newList);
    this._save();
    return newList;
  }

  // Basis-Eintrag hinzufügen (z. B. aus MatrixCalc)
  addEntryToList(listId, entry) {
    const list = this.lists.find((l) => l.id === listId);
    if (list) {
      list.entries.push(entry);
      this._save();
      return true;
    }
    return false;
  }

  // Teilverkauf hinzufügen
  addPartialSale(listId, partialSale) {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return false;

    // Suche den "base"-Eintrag, falls du an ein bestimmtes Produkt binden willst
    const baseEntry = list.entries.find(
      (e) => e.type === "base" && e.product === partialSale.product
    );
    if (!baseEntry) {
      // Falls kein Basis-Eintrag existiert, optional:
      // -> partialSale direkt in entries pushen oder false zurückgeben
      return false;
    }

    baseEntry.partialSales = baseEntry.partialSales || [];
    baseEntry.partialSales.push(partialSale);

    // Optional: baseEntry.quantity -= partialSale.quantitySold;
    // etc.

    this._save();
    return true;
  }

  getLists() {
    return this.lists;
  }

  _save() {
    localStorage.setItem("matrixLists", JSON.stringify(this.lists));
  }
}
