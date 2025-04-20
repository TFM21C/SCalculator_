// modules/HistoryManager.j

export class HistoryManager {
  constructor() {
    // Array für alle bisherigen Operationen
    this.history = [];
    // Optional: Schon vorhandene History aus Local Storage laden
    this.loadFromLocalStorage();
  }

  addToHistory(operationObj) {
    // operationObj = { operation: string, result: number }
    this.history.push(operationObj);
    this.saveToLocalStorage();
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    this.saveToLocalStorage();
  }

  saveToLocalStorage() {
    localStorage.setItem("calcHistory", JSON.stringify(this.history));
  }

  loadFromLocalStorage() {
    const data = localStorage.getItem("calcHistory");
    if (data) {
      this.history = JSON.parse(data);
    }
  }
}
