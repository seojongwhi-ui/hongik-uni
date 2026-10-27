import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { blinkScaleAt } from './presenceMotion.js';
import { polishAvatar } from './avatarAppearance.js';

export async function loadCuteAvatar(scene, {
  url = '/models/cute_seated_avatar.glb',
  position = [0, 0, 0],
  scale = 1,
  polish = true,
} = {}) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const avatar = gltf.scene;
  const root = avatar.getObjectByName('AvatarRoot') || avatar;
  avatar.position.set(...position);
  avatar.scale.setScalar(scale);
  scene.add(avatar);
  if (polish) polishAvatar(avatar);

  const get = (name) => avatar.getObjectByName(name);
  const head = get('HeadPivot');
  const leftArm = get('LeftArmPivot');
  const rightArm = get('RightArmPivot');
  const leftEye = get('LeftEye');
  const rightEye = get('RightEye');
  const mouthSmile = get('MouthSmile');
  const mouthOpen = get('MouthOpen');
  const brows = [get('LeftBrow'), get('RightBrow')];
  const gazeParts = ['LeftIris', 'LeftPupil', 'LeftEyeGlint', 'LeftTinyGlint',
    'RightIris', 'RightPupil', 'RightEyeGlint', 'RightTinyGlint']
    .map(get).filter(Boolean).map((part) => ({ part, baseX: part.position.x }));
  avatar.traverse((part) => {
    if (part.isMesh) {
      part.castShadow = true;
      part.receiveShadow = true;
    }
  });

  // The open mouth is stored INSIDE the head to be invisible in a raw GLB preview.
  // Move it forward before enabling it for speech.
  if (mouthOpen) {
    mouthOpen.position.z += 0.23;
    mouthOpen.visible = false;
  }
  const smilePivot = new THREE.Group();
  if (mouthSmile && head) {
    smilePivot.position.set(0, 0.095, 0.44);
    head.add(smilePivot);
    mouthSmile.position.set(0, -0.095, -0.44);
    smilePivot.add(mouthSmile);
  }

  let t = 0;
  let isSpeaking = false;
  let emotion = 'calm';
  let speedKmh = 0;
  let jolt = 0;
  let wave = 0;
  let lookDirection = 0;
  let eyeAttention = 0;
  let headAttention = 0;
  let intensity = 1;

  const lerp = (a, b, v) => a + (b - a) * v;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  const controller = {
    avatar,
    // For lip movements that follow actual speech, connect voice activity here.
    setSpeaking(value) { isSpeaking = Boolean(value); },
    setEmotion(value) {
      if (['calm', 'happy', 'surprised', 'concerned', 'attentive'].includes(value)) emotion = value;
    },
    setSpeed(value) { speedKmh = Math.max(0, Number(value) || 0); },
    setReactionIntensity(value) { intensity = clamp(Number(value) || 0, 0, 1); },
    setGaze(eye, headTurn, direction) {
      eyeAttention = clamp(eye, 0, 1);
      headAttention = clamp(headTurn, 0, 1);
      lookDirection = direction < 0 ? -1 : 1;
    },
    react(type) {
      if (type === 'brake' || type === 'suddenStop') jolt = 1;
      if (type === 'departure') jolt = -0.55;
      if (type === 'wave') wave = 2.2;
      if (type === 'lookLeft') { lookDirection = -1; headAttention = 1; eyeAttention = 1; }
      if (type === 'lookRight') { lookDirection = 1; headAttention = 1; eyeAttention = 1; }
      if (type === 'lookForward') { headAttention = 0; eyeAttention = 0; }
    },
    update(delta, { elapsedMs = t * 1000, reducedMotion = false } = {}) {
      delta = clamp(delta || 0, 0, 0.06);
      t += delta;
      jolt = Math.sign(jolt) * Math.max(0, Math.abs(jolt) - delta * 2.8);
      wave = Math.max(0, wave - delta);

      // Gentle body motion when sitting in a moving vehicle.
      const speedFactor = clamp(speedKmh / 100, 0, 1);
      const idleSway = reducedMotion ? 0 : Math.sin(t * 1.1) * (0.017 + 0.008 * speedFactor);
      if (root) {
        root.rotation.z = lerp(root.rotation.z, idleSway + (reducedMotion ? 0 : jolt * 0.11 * intensity), clamp(delta * 5, 0, 1));
        root.rotation.x = lerp(root.rotation.x, reducedMotion ? 0 : jolt * 0.075 * intensity, clamp(delta * 5, 0, 1));
      }
      if (head) {
        const goalY = lookDirection * headAttention * (0.2 + 0.07 * intensity)
          + (reducedMotion ? 0 : Math.sin(t * 0.63) * 0.018);
        const goalX = (reducedMotion ? 0 : Math.sin(t * 1.0) * 0.015 - jolt * 0.14 * intensity)
          + (emotion === 'surprised' ? -0.08 * intensity : 0);
        const goalZ = emotion === 'concerned' ? 0.12 * intensity
          : emotion === 'happy' ? -0.035 * intensity : 0;
        head.rotation.y = lerp(head.rotation.y, goalY, clamp(delta * 3.8, 0, 1));
        head.rotation.x = lerp(head.rotation.x, goalX, clamp(delta * 5, 0, 1));
        head.rotation.z = lerp(head.rotation.z, goalZ, clamp(delta * 4, 0, 1));
      }
      for (const { part, baseX } of gazeParts) {
        part.position.x = lerp(part.position.x, baseX + lookDirection * eyeAttention * 0.023,
          clamp(delta * 9, 0, 1));
      }

      const blink = blinkScaleAt(elapsedMs, reducedMotion);
      const emotionalSquint = emotion === 'happy' ? 0.79
        : emotion === 'concerned' ? 0.86 : emotion === 'surprised' ? 1.2 : 1;
      for (const eye of [leftEye, rightEye]) {
        if (eye) eye.scale.y = Math.max(0.1, blink * emotionalSquint);
      }
      for (const brow of brows) {
        if (brow) brow.position.y = lerp(brow.position.y,
          emotion === 'surprised' ? 0.055 * intensity : emotion === 'concerned' ? 0.018 : 0,
          clamp(delta * 8, 0, 1));
      }

      smilePivot.scale.y = lerp(smilePivot.scale.y,
        emotion === 'concerned' ? -0.85 : emotion === 'happy' ? 1.13 : 1,
        clamp(delta * 8, 0, 1));
      const mouthMove = isSpeaking && Math.sin(t * 16) > -0.30;
      const showOpenMouth = mouthMove || emotion === 'surprised';
      if (mouthOpen) {
        mouthOpen.visible = showOpenMouth;
        mouthOpen.scale.y = emotion === 'surprised' ? 1.25 : (0.58 + 0.28 * (1 + Math.sin(t * 19)));
      }
      if (mouthSmile) mouthSmile.visible = !showOpenMouth;

      if (leftArm) {
        const waving = !reducedMotion && wave > 0 ? Math.sin(t * 13) * 0.35 : 0;
        leftArm.rotation.z = lerp(leftArm.rotation.z, waving, clamp(delta * 6, 0, 1));
      }
      if (rightArm) {
        rightArm.rotation.z = lerp(rightArm.rotation.z,
          reducedMotion ? 0 : Math.sin(t * 0.8) * 0.02, clamp(delta * 4, 0, 1));
      }
    },
    dispose() {
      scene.remove(avatar);
      const geometries = new Set();
      const materials = new Set();
      avatar.traverse(obj => {
        if (obj.geometry) geometries.add(obj.geometry);
        if (obj.material) {
          const list = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const material of list) materials.add(material);
        }
      });
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
    },
  };
  return controller;
}
