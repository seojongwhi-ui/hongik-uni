import assert from 'node:assert/strict';
import { test } from 'node:test';
import { speedFromPosition } from '../src/speedometer.js';

function fix(latitude, longitude, speed, timestamp, accuracy = 5) {
  return { coords: { latitude, longitude, speed, accuracy }, timestamp };
}

test('uses device speed in meters per second when available', () => {
  const result = speedFromPosition(fix(37, 127, 13.9, 5000), null);
  assert.equal(result.source, 'device');
  assert.ok(Math.abs(result.kmh - 50.04) < 0.01);
});

test('estimates speed from accurate GPS fixes when device speed is missing', () => {
  const result = speedFromPosition(fix(37, 127.001, null, 5000), fix(37, 127, null, 0));
  assert.equal(result.source, 'estimate');
  assert.ok(result.kmh > 60 && result.kmh < 70);
});

test('does not turn small GPS drift into driving speed', () => {
  const result = speedFromPosition(fix(37, 127.00001, null, 5000), fix(37, 127, null, 0));
  assert.equal(result.kmh, 0);
});

test('does not estimate speed from stale or inaccurate positions', () => {
  assert.equal(speedFromPosition(fix(37, 127, null, 5000), null), null);
  assert.equal(speedFromPosition(fix(37, 127.001, null, 1000), fix(37, 127, null, 0)), null);
  assert.equal(speedFromPosition(fix(37, 127.001, null, 5000, 100), fix(37, 127, null, 0)), null);
});
