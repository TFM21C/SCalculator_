// modules/Calculator.js

export class Calculator {
  constructor() {
    // Falls du interne Zustände brauchst, z.B. letze Operation, ...
    this.lastResult = 0;
  }

  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    return a * b;
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error("Division durch 0 ist nicht erlaubt!");
    }
    return a / b;
  }
}
