// modules/QuickCalc.js

import { Calculator } from "./Calculator.js";

export class QuickCalc {
  constructor() {
    this.calculator = new Calculator();
  }

  // Beispiel: Methode, die zwei Zahlen addiert
  // und evtl. direkt ein Ergebnis-Objekt zurückgibt.
  quickAdd(a, b) {
    const result = this.calculator.add(a, b);
    return {
      operation: `${a} + ${b}`,
      result,
    };
  }

  // Analog für sub, mul, div ...
  quickSubtract(a, b) {
    const result = this.calculator.subtract(a, b);
    return {
      operation: `${a} - ${b}`,
      result,
    };
  }
}
