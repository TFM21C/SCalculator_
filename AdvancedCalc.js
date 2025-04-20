// modules/AdvancedCalc.js

import { Calculator } from "./Calculator.js";

/**
 * Beispielhafte Klasse für "mehrstufige" Eingaben
 * oder komplexere Formeln (z.B. Zinseszins).
 */
export class AdvancedCalc {
  constructor() {
    this.calculator = new Calculator();
  }

  calculateMultipleValues(valuesArray) {
    // Beispiel: Summiere alle Werte in einem Array
    // Nur als Dummy, du könntest hier beliebig komplexe Abläufe erstellen
    const sum = valuesArray.reduce((acc, cur) => {
      return this.calculator.add(acc, cur);
    }, 0);
    return {
      operation: `Summe von ${valuesArray.join(", ")}`,
      result: sum,
    };
  }

  // Oder z.B. Zinseszins, Matrizenrechnung etc.
}
