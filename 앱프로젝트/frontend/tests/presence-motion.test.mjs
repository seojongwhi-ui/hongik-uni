import assert from 'node:assert/strict';
import test from 'node:test';
import { blinkScaleAt, gazeCueAt, presenceMotionTiming } from '../src/presenceMotion.js';

test('passenger spends most of each presence cycle looking toward the road', () => {
  let roadSamples = 0;
  let driverSamples = 0;
  for (let time = 0; time < presenceMotionTiming.gazeCycleDuration; time += 100) {
    if (gazeCueAt(time).target === 'driver') driverSamples++;
    else roadSamples++;
  }
  assert.ok(roadSamples / (roadSamples + driverSamples) > 0.78);
});

test('eyes lead the head when attention shifts to the driver', () => {
  const cue = gazeCueAt(7250);
  assert.equal(cue.target, 'driver');
  assert.equal(cue.eyeAttention, 1);
  assert.equal(cue.headAttention, 0);
  assert.equal(gazeCueAt(7420).headAttention, 1);
});

test('blinks are brief, irregular, and disabled for reduced motion', () => {
  assert.equal(blinkScaleAt(3000), 1);
  assert.ok(blinkScaleAt(3275) < 0.2);
  assert.equal(blinkScaleAt(3500), 1);
  assert.equal(blinkScaleAt(3275, true), 1);
});
