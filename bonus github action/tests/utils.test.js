const { capitalize, isValidEmail, slugify, paginate } = require('../src/utils');

describe('capitalize', () => {
  test('met la premiere lettre en majuscule', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('retourne une chaine vide si null', () => {
    expect(capitalize(null)).toBe('');
  });

  test('gere une chaine deja en majuscule', () => {
    expect(capitalize('HELLO')).toBe('Hello');
  });
});

describe('isValidEmail', () => {
  test('accepte un email valide', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  test('refuse un email sans @', () => {
    expect(isValidEmail('testexample.com')).toBe(false);
  });

  test('refuse un email vide', () => {
    expect(isValidEmail('')).toBe(false);
  });

  test('refuse null', () => {
    expect(isValidEmail(null)).toBe(false);
  });
});

describe('slugify', () => {
  test('convertit un texte en slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  test('supprime les caracteres speciaux', () => {
    expect(slugify('Bonjour! Comment ca va?')).toBe('bonjour-comment-ca-va');
  });

  test('retourne une chaine vide si null', () => {
    expect(slugify(null)).toBe('');
  });
});

describe('paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  test('retourne la premiere page', () => {
    const result = paginate(items, 1, 3);
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(4);
  });

  test('retourne la deuxieme page', () => {
    const result = paginate(items, 2, 3);
    expect(result.data).toEqual([4, 5, 6]);
  });

  test('gere une page vide', () => {
    const result = paginate(items, 5, 3);
    expect(result.data).toEqual([]);
  });
});
