import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reactionForUtterance } from '../src/speechReactions.js';

test('explicit frustration cue gets a concerned reaction', () => {
  assert.equal(reactionForUtterance('아, 정말 짜증 나'), 'concerned');
  assert.equal(reactionForUtterance('이 차 너무 위험해'), 'concerned');
});

test('positive cue gets a warm reaction', () => {
  assert.equal(reactionForUtterance('고마워'), 'warm');
  assert.equal(reactionForUtterance('괜찮아'), 'warm');
});

test('explicit surprise cue gets a surprised reaction', () => {
  assert.equal(reactionForUtterance('아 깜짝이야!'), 'surprised');
  assert.equal(reactionForUtterance('헉, 놀랐어'), 'surprised');
});

test('other speech receives attention without an emotion claim', () => {
  assert.equal(reactionForUtterance('저기 신호등이 있네'), 'attentive');
  assert.equal(reactionForUtterance('  '), 'neutral');
});
