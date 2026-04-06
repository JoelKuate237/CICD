// ============================================================
// FICHIER : tests/utils.test.js
// Tests unitaires des fonctions de src/utils.js
// ============================================================

const { add, multiply, isEven } = require('../src/utils');

describe('Tests unitaires des utilitaires', () => {
  test('add(2, 3) doit retourner 5', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('add(-1, 1) doit retourner 0', () => {
    expect(add(-1, 1)).toBe(0);
  });

  test('multiply(4, 5) doit retourner 20', () => {
    expect(multiply(4, 5)).toBe(20);
  });

  test('multiply(0, 100) doit retourner 0', () => {
    expect(multiply(0, 100)).toBe(0);
  });

  test('isEven(4) doit retourner true', () => {
    expect(isEven(4)).toBe(true);
  });

  test('isEven(7) doit retourner false', () => {
    expect(isEven(7)).toBe(false);
  });
});
