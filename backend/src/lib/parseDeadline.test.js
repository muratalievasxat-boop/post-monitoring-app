import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeadline } from './parseDeadline.js';

// ── null / empty ──────────────────────────────────────────────────────────────
test('null → null', () => assert.equal(parseDeadline(null), null));
test('empty string → null', () => assert.equal(parseDeadline(''), null));
test('whitespace → null', () => assert.equal(parseDeadline('   '), null));
test('non-date text → null', () => assert.equal(parseDeadline('непонятная строка'), null));

// ── year only ─────────────────────────────────────────────────────────────────
test('"2024 год"', () => assert.equal(parseDeadline('2024 год'), '2024-12-31'));
test('"2026 год"', () => assert.equal(parseDeadline('2026 год'), '2026-12-31'));
test('"2025 года"', () => assert.equal(parseDeadline('2025 года'), '2025-12-31'));
test('bare year "2024"', () => assert.equal(parseDeadline('2024'), '2024-12-31'));

// ── quarters (Arabic numerals) ────────────────────────────────────────────────
test('"1 квартал 2025 года"', () => assert.equal(parseDeadline('1 квартал 2025 года'), '2025-03-31'));
test('"2 квартал 2026 года"', () => assert.equal(parseDeadline('2 квартал 2026 года'), '2026-06-30'));
test('"3 квартал 2025 года"', () => assert.equal(parseDeadline('3 квартал 2025 года'), '2025-09-30'));
test('"4 квартал 2026 год"', () => assert.equal(parseDeadline('4 квартал 2026 год'), '2026-12-31'));
test('"4 квартал 2025 года"', () => assert.equal(parseDeadline('4 квартал 2025 года'), '2025-12-31'));
test('newline in quarter "2 квартал\\n2026 года"', () =>
  assert.equal(parseDeadline('2 квартал\n2026 года'), '2026-06-30'));

// ── quarters (Latin Roman numerals) ───────────────────────────────────────────
test('"I квартал 2025 года" (Latin I)', () =>
  assert.equal(parseDeadline('I квартал 2025 года'), '2025-03-31'));
test('"II квартал 2025 года"', () =>
  assert.equal(parseDeadline('II квартал 2025 года'), '2025-06-30'));
test('"III квартал 2025 года"', () =>
  assert.equal(parseDeadline('III квартал 2025 года'), '2025-09-30'));
test('"IV квартал 2025 года"', () =>
  assert.equal(parseDeadline('IV квартал 2025 года'), '2025-12-31'));

// ── quarters (Cyrillic Ukrainian І look-alike) ────────────────────────────────
test('"І квартал 2025 года" (Cyrillic І)', () =>
  assert.equal(parseDeadline('І квартал 2025 года'), '2025-03-31'));
test('"ІІ квартал 2025 года"', () =>
  assert.equal(parseDeadline('ІІ квартал 2025 года'), '2025-06-30'));
test('"ІІІ квартал 2025 года"', () =>
  assert.equal(parseDeadline('ІІІ квартал 2025 года'), '2025-09-30'));
test('"ІV квартал 2025 года"', () =>
  assert.equal(parseDeadline('ІV квартал 2025 года'), '2025-12-31'));

// ── quarter edge cases ────────────────────────────────────────────────────────
test('"І квартал" (no year) → null', () =>
  assert.equal(parseDeadline('І квартал'), null));
test('"6 квартал 2026 год" falls back to year', () =>
  assert.equal(parseDeadline('6 квартал 2026 год'), '2026-12-31'));

// ── half-year ─────────────────────────────────────────────────────────────────
test('"1 полугодие 2025 года"', () =>
  assert.equal(parseDeadline('1 полугодие 2025 года'), '2025-06-30'));
test('"2 полугодие 2025 года"', () =>
  assert.equal(parseDeadline('2 полугодие 2025 года'), '2025-12-31'));
test('"1 полугодие\\n2025 года" (newline)', () =>
  assert.equal(parseDeadline('1 полугодие\n2025 года'), '2025-06-30'));
test('"1 полгуодие 2026 год" (typo)', () =>
  assert.equal(parseDeadline('1 полгуодие 2026 год'), '2026-06-30'));

// ── "конец / конц / до конца" ─────────────────────────────────────────────────
test('"конец 2026 года"', () => assert.equal(parseDeadline('конец 2026 года'), '2026-12-31'));
test('"конец 2026 год"', () => assert.equal(parseDeadline('конец 2026 год'), '2026-12-31'));
test('"конц 2026 год" (typo)', () => assert.equal(parseDeadline('конц 2026 год'), '2026-12-31'));
test('"До конца 2025 года"', () => assert.equal(parseDeadline('До конца 2025 года'), '2025-12-31'));
test('"до конца 2026 года"', () => assert.equal(parseDeadline('до конца 2026 года'), '2026-12-31'));
test('"до конца 2025 год"', () => assert.equal(parseDeadline('до конца 2025 год'), '2025-12-31'));

// ── exact date ────────────────────────────────────────────────────────────────
test('"до 1 июля 2025 года"', () =>
  assert.equal(parseDeadline('до 1 июля 2025 года'), '2025-07-01'));
test('"до 31 декабря 2024 года"', () =>
  assert.equal(parseDeadline('до 31 декабря 2024 года'), '2024-12-31'));
