import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExpirationCache } from '../src/index.js';

/**
 * A deterministic clock. Tests advance it explicitly instead of sleeping.
 */
function fakeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => { t += ms; },
  };
}

test('stores and retrieves a value before it expires', () => {
  const clock = fakeClock();
  const cache = new ExpirationCache(clock.now);
  cache.set('a', 1, 100);
  assert.equal(cache.get('a'), 1);
});

test('returns undefined after the lifetime has elapsed', () => {
  const clock = fakeClock();
  const cache = new ExpirationCache(clock.now);
  cache.set('a', 1, 100);
  clock.advance(100);
  assert.equal(cache.get('a'), undefined);
});

test('a lifetime of zero expires immediately', () => {
  const clock = fakeClock();
  const cache = new ExpirationCache(clock.now);
  cache.set('a', 1, 0);
  assert.equal(cache.get('a'), undefined);
});

test('overwriting a key replaces the stored value and lifetime', () => {
  const clock = fakeClock();
  const cache = new ExpirationCache(clock.now);
  cache.set('a', 1, 100);
  clock.advance(50);
  cache.set('a', 2, 100);
  clock.advance(60);
  // The original entry would have expired at t=100; the replacement expires at t=150.
  assert.equal(cache.get('a'), 2);
});

test('get on a missing key returns undefined', () => {
  const cache = new ExpirationCache(() => 0);
  assert.equal(cache.get('nope'), undefined);
});

test('sweep removes only expired entries and returns the count removed', () => {
  const clock = fakeClock();
  const cache = new ExpirationCache(clock.now);
  cache.set('short', 1, 50);
  cache.set('long', 2, 200);
  clock.advance(100);
  assert.equal(cache.sweep(), 1);
  assert.equal(cache.get('short'), undefined);
  assert.equal(cache.get('long'), 2);
  assert.equal(cache.size, 1);
});

test('sweep on an empty cache removes nothing', () => {
  const cache = new ExpirationCache(() => 0);
  assert.equal(cache.sweep(), 0);
});

test('sweep removes an entry exactly at its expiry instant', () => {
  const clock = fakeClock();
  const cache = new ExpirationCache(clock.now);
  cache.set('a', 1, 100);
  clock.advance(100);
  assert.equal(cache.sweep(), 1);
});

test('size counts expired-but-unswept entries', () => {
  const clock = fakeClock();
  const cache = new ExpirationCache(clock.now);
  cache.set('a', 1, 10);
  clock.advance(20);
  assert.equal(cache.size, 1);
  cache.sweep();
  assert.equal(cache.size, 0);
});

test('can store distinct falsy values', () => {
  const clock = fakeClock();
  const cache = new ExpirationCache(clock.now);
  cache.set('zero', 0, 100);
  cache.set('false', false, 100);
  cache.set('null', null, 100);
  assert.equal(cache.get('zero'), 0);
  assert.equal(cache.get('false'), false);
  assert.equal(cache.get('null'), null);
});

test('expiration is checked against the clock at call time, not at set time', () => {
  const clock = fakeClock();
  const cache = new ExpirationCache(clock.now);
  cache.set('a', 1, 100);
  clock.advance(99);
  assert.equal(cache.get('a'), 1);
  clock.advance(1);
  assert.equal(cache.get('a'), undefined);
});
