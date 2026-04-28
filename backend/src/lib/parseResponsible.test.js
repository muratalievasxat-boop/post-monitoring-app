import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResponsible } from './parseResponsible.js';

test('null returns empty result', () => {
  const r = parseResponsible(null);
  assert.equal(r.primary, null);
  assert.deepEqual(r.co, []);
  assert.equal(r.raw, '');
});

test('empty string returns empty result', () => {
  const r = parseResponsible('');
  assert.equal(r.primary, null);
  assert.deepEqual(r.co, []);
});

test('whitespace-only returns empty result', () => {
  const r = parseResponsible('   ');
  assert.equal(r.primary, null);
  assert.deepEqual(r.co, []);
});

test('single org sets primary only', () => {
  const r = parseResponsible('МНЭ');
  assert.equal(r.primary, 'МНЭ');
  assert.deepEqual(r.co, []);
});

test('newline-separated: first = primary, rest = co', () => {
  const r = parseResponsible('МНЭ\nМЗК\nМСХ');
  assert.equal(r.primary, 'МНЭ');
  assert.deepEqual(r.co, ['МЗК', 'МСХ']);
});

test('comma-separated on one line: first = primary, rest = co', () => {
  const r = parseResponsible('МНЭ, МЗК, МСХ');
  assert.equal(r.primary, 'МНЭ');
  assert.deepEqual(r.co, ['МЗК', 'МСХ']);
});

test('newline wins over comma when both present', () => {
  const r = parseResponsible('МНЭ, МЗК\nМСХ');
  assert.equal(r.primary, 'МНЭ, МЗК');
  assert.deepEqual(r.co, ['МСХ']);
});

test('deduplicates co entries', () => {
  const r = parseResponsible('МНЭ\nМЗК\nМЗК');
  assert.equal(r.primary, 'МНЭ');
  assert.deepEqual(r.co, ['МЗК']);
});

test('primary not included in co even if repeated', () => {
  const r = parseResponsible('МНЭ\nМНЭ\nМЗК');
  assert.equal(r.primary, 'МНЭ');
  assert.deepEqual(r.co, ['МЗК']);
});

test('raw field is preserved verbatim', () => {
  const raw = '  МНЭ\nМЗК  ';
  assert.equal(parseResponsible(raw).raw, raw);
});

test('trims whitespace from each part', () => {
  const r = parseResponsible('  МНЭ  \n  МЗК  ');
  assert.equal(r.primary, 'МНЭ');
  assert.deepEqual(r.co, ['МЗК']);
});
