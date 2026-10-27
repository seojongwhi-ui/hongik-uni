import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createOccupant } from '../src/occupant.js';

const make = (driving) => createOccupant({ driving, skinColor: 0xc4a28b, shirtColor: 0x657c68, hairColor: 0x44332d });

test('only the passenger has detailed eyes and five distinct facial expressions', () => {
  const passenger = make(false);
  const driver = make(true);
  assert.equal(passenger.eyes.length, 2);
  assert.equal(passenger.brows.length, 2);
  assert.equal(passenger.cheeks.length, 2);
  assert.equal(passenger.gazeParts.length, 8);
  assert.equal(driver.gazeParts.length, 0);
  assert.ok(passenger.eyes.every((eye) => eye.name === 'expressive-eye' && eye.children.length >= 6));
  assert.ok(driver.eyes.every((eye) => eye.children.length === 1));
  assert.deepEqual(Object.keys(passenger.mouths).sort(), ['attentive', 'concerned', 'neutral', 'surprised', 'warm']);
  const bounds = {};
  for (const [name, mouth] of Object.entries(passenger.mouths)) {
    assert.equal(mouth.visible, name === 'neutral');
    const size = new THREE.Box3().setFromObject(mouth).getSize(new THREE.Vector3());
    bounds[name] = size;
    mouth.traverse((item) => {
      if (!item.isMesh) return;
      const positions = item.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        assert.ok(Number.isFinite(positions.getZ(i)));
      }
    });
  }
  assert.ok(bounds.surprised.y > bounds.neutral.y * 2);
  assert.ok(bounds.surprised.y > bounds.attentive.y * 1.5);
  assert.ok(bounds.warm.x > bounds.neutral.x);
  assert.ok(bounds.concerned.x > bounds.attentive.x * 2);
});

test('passenger carries the styled avatar hair and layered collar details', () => {
  const passenger = make(false);
  const driver = make(true);
  assert.ok(passenger.root.getObjectByName('avatar-hair'));
  assert.equal(passenger.root.getObjectsByProperty('name', 'avatar-collar').length, 2);
  assert.equal(passenger.root.getObjectsByProperty('name', 'avatar-collar-button').length, 1);
  assert.equal(driver.root.getObjectsByProperty('name', 'avatar-hair').length, 0);
  assert.equal(driver.root.getObjectsByProperty('name', 'avatar-collar').length, 0);
});

test('enhanced reactions animate passenger arms while subtle mode keeps the resting pose', () => {
  const passenger = make(false);
  const arms = passenger.root.getObjectsByProperty('name', 'continuous-arm');
  const hands = passenger.root.getObjectsByProperty('name', 'gesture-hand');
  assert.equal(arms.length, 2);
  assert.equal(hands.length, 2);
  const restingHands = hands.map((hand) => hand.position.clone());
  passenger.updateGesture('surprised', 1, true);
  assert.ok(arms.every((arm) => arm.morphTargetInfluences[arm.morphTargetDictionary.surprised] > 0.99));
  assert.ok(hands.every((hand, index) => hand.position.y > restingHands[index].y + 0.35));
  passenger.updateGesture('surprised', 1, false);
  assert.ok(arms.every((arm) => arm.morphTargetInfluences[arm.morphTargetDictionary.surprised] < 0.01));
  assert.ok(hands.every((hand, index) => hand.position.distanceTo(restingHands[index]) < 0.01));
});

for (const driving of [false, true]) {
  test(`${driving ? 'driver' : 'passenger'} belt stays anchored and clears the torso during reactions`, () => {
    const figure = make(driving);
    const belt = figure.root.getObjectByName('seatbelt');
    const body = figure.root.getObjectByName('torso-surface');
    const positions = belt.geometry.attributes.position;
    const centerAt = (index) => new THREE.Vector3().fromBufferAttribute(positions, index)
      .add(new THREE.Vector3().fromBufferAttribute(positions, index + 1)).multiplyScalar(0.5);
    figure.updateBelt();
    const start = centerAt(0);
    const end = centerAt(positions.count - 2);
    const ray = new THREE.Raycaster();
    for (const [lean, sway, forward] of [[0, 0, 0], [0.14, 0.012, 0.07], [-0.08, -0.012, 0]]) {
      figure.torso.rotation.set(lean, 0, sway);
      figure.torso.position.z = forward;
      figure.updateBelt();
      figure.root.updateMatrixWorld(true);
      assert.ok(centerAt(0).distanceTo(start) < 1e-6);
      assert.ok(centerAt(positions.count - 2).distanceTo(end) < 1e-6);
      let surfaceSamples = 0;
      for (let index = 2; index < positions.count - 2; index += 2) {
        const point = centerAt(index);
        ray.set(new THREE.Vector3(point.x, point.y, 5), new THREE.Vector3(0, 0, -1));
        const hit = ray.intersectObject(body, false)[0];
        if (hit) {
          surfaceSamples++;
          assert.ok(point.z >= hit.point.z + 0.004, `belt enters torso at ${point.toArray()}`);
        }
      }
      assert.ok(surfaceSamples > 15, 'not enough chest and waist samples');
    }
  });
}
