import * as THREE from 'three';
import { createPassengerFace, createPassengerHeadGeometry } from './passengerFace.js';

const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

function shape(parent, geometry, surface, position, scale = [1, 1, 1]) {
  const item = new THREE.Mesh(geometry, surface);
  item.position.set(...position);
  item.scale.set(...scale);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function oval(parent, surface, position, scale) {
  return shape(parent, new THREE.SphereGeometry(1, 32, 24), surface, position, scale);
}

function tube(parent, surface, points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return shape(parent, new THREE.TubeGeometry(curve, 24, radius, 12, false), surface, [0, 0, 0]);
}

function passengerHair(head, hair) {
  const pointAt = (angle, progress, offset = 0) => {
    const front = THREE.MathUtils.smoothstep(Math.cos(angle), 0.1, 0.85);
    const centerPart = 0.07 * Math.max(0, Math.cos(angle)) ** 14;
    const hairline = -0.34 + 0.6 * front - centerPart;
    const polar = progress * Math.acos(hairline / 0.51);
    const radius = Math.cos(polar) < 0 ? Math.max(Math.sin(polar), 0.9) : Math.sin(polar);
    return [
      (0.48 + offset) * radius * Math.sin(angle),
      (0.51 + offset) * Math.cos(polar),
      (0.48 + offset) * radius * Math.cos(angle) - 0.025,
    ];
  };
  // Keep the last ring open so its triangles form a smooth, non-polar hairline.
  const geometry = new THREE.SphereGeometry(1, 80, 48, 0, Math.PI * 2, 0, Math.PI - 0.0001);
  const positions = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    // Follow a continuous hairline around the forehead, ears and nape.
    positions.setXYZ(i, ...pointAt(uv.getX(i) * Math.PI * 2, 1 - uv.getY(i)));
  }
  geometry.computeVertexNormals();
  const cap = shape(head, geometry, hair, [0, 0, 0]);
  cap.name = 'avatar-hair';
  const strandMaterial = hair.clone();
  strandMaterial.color.multiplyScalar(1.035);
  for (let strand = 0; strand < 12; strand++) {
    const angle = strand / 12 * Math.PI * 2;
    const points = Array.from({ length: 24 }, (_, index) => {
      const progress = 0.12 + index / 23 * 0.85;
      return pointAt(angle + 0.16 * (1 - progress), progress, 0.002);
    });
    tube(head, strandMaterial, points, 0.001);
  }
  for (const side of [-1, 1]) {
    const backHair = oval(head, hair, [side * 0.28, -0.28, -0.16], [0.18, 0.34, 0.23]);
    backHair.name = 'avatar-hair';
  }
}

function armGeometry(points) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const segments = 48;
  const radialSegments = 24;
  const geometry = new THREE.TubeGeometry(curve, segments, 1, radialSegments, false);
  const position = geometry.attributes.position;
  const center = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  // One continuous surface avoids overlapping shoulder, elbow and sleeve lobes.
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments;
    curve.getPointAt(t, center);
    const radius = THREE.MathUtils.lerp(0.16, 0.085, t);
    for (let j = 0; j <= radialSegments; j++) {
      const index = ring * (radialSegments + 1) + j;
      vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(radius).add(center);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  geometry.computeVertexNormals();
  geometry.clearGroups();
  const sleeveIndices = 27 * radialSegments * 6;
  geometry.addGroup(0, sleeveIndices, 0);
  geometry.addGroup(sleeveIndices, geometry.index.count - sleeveIndices, 1);
  return geometry;
}

function smoothArm(parent, shirt, skin, points, poses = {}) {
  const geometry = armGeometry(points);
  geometry.morphAttributes.position = [];
  geometry.morphAttributes.normal = [];
  for (const [name, pose] of Object.entries(poses)) {
    const target = armGeometry(pose);
    target.attributes.position.name = name;
    target.attributes.normal.name = name;
    geometry.morphAttributes.position.push(target.attributes.position);
    geometry.morphAttributes.normal.push(target.attributes.normal);
  }
  const item = shape(parent, geometry, [shirt, skin], [0, 0, 0]);
  item.name = 'continuous-arm';
  item.updateMorphTargets();
  return item;
}

// Both occupants use the same seated proportions and face coordinates.
export function createOccupant({ driving = false, skinColor, shirtColor, hairColor }) {
  const root = new THREE.Group();
  root.name = driving ? 'driver-occupant' : 'passenger-occupant';
  const skin = material(skinColor);
  skin.roughness = 0.68;
  const shirt = material(shirtColor);
  const hair = material(hairColor);
  hair.roughness = 0.7;
  const ink = material(0x26322f);
  const trousers = material(0x343f42);
  const avatarAccent = material(0xe9d5b7);
  const torso = new THREE.Group();
  torso.position.y = 0.64;
  root.add(torso);
  const upper = new THREE.Group();
  upper.position.y = -0.64;
  torso.add(upper);

  const profile = [
    [0, 0.56], [0.3, 0.56], [0.42, 0.66], [0.43, 0.86],
    [0.43, 1.1], [0.49, 1.38], [0.48, 1.57], [0.33, 1.73], [0, 1.79],
  ];
  const body = shape(upper, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 48),
    shirt, [0, 0, 0.04], [1.1, 1, 0.8]);
  body.name = 'torso-surface';
  if (!driving) {
    for (const side of [-1, 1]) {
      const collar = tube(upper, avatarAccent,
        [[side * 0.21, 1.67, 0.37], [side * 0.12, 1.58, 0.46], [0, 1.49, 0.465]], 0.014);
      collar.name = 'avatar-collar';
    }
    const trim = hair.clone();
    trim.color.multiplyScalar(1.55);
    tube(upper, trim, [[0, 1.47, 0.46], [0, 1.23, 0.43], [0, 0.84, 0.41]], 0.007);
    for (const [index, y, z] of [[0, 1.4, 0.465], [1, 1.2, 0.44], [2, 1.0, 0.414]]) {
      const button = oval(upper, hair, [0, y, z], [0.024, 0.024, 0.012]);
      button.name = index === 0 ? 'avatar-collar-button' : 'avatar-cardigan-button';
    }
  }
  oval(upper, skin, [0, 1.81, 0.04], [0.14, 0.19, 0.13]);
  oval(root, trousers, [0, 0.62, -0.025], [0.43, 0.17, 0.31]);
  const gestureArms = [];
  for (const side of [-1, 1]) {
    oval(root, trousers, [side * 0.235, 0.59, 0.38], [0.205, 0.17, 0.53]);
    tube(root, trousers, [[side * 0.235, 0.59, 0.78], [side * 0.235, 0.28, 0.87],
      [side * 0.235, -0.34, 0.83]], 0.14);
    const shoulder = [side * 0.36, 1.52, 0.075];
    const elbow = driving ? [side * 0.62, 1.24, 0.43] : [side * 0.61, 1.14, 0.15];
    const wrist = driving ? [side * 0.58, 1.17, 1.12] : [side * 0.37, 0.81, 0.6];
    const rest = [shoulder, [side * 0.51, 1.46, 0.15], elbow, wrist];
    const poses = driving ? {} : {
      concerned: side < 0
        ? rest
        : [shoulder, [0.48, 1.47, 0.18], [0.52, 1.29, 0.34], [0.13, 1.23, 0.52]],
      attentive: side < 0
        ? rest
        : [shoulder, [0.5, 1.47, 0.18], [0.61, 1.27, 0.43], [0.62, 1.2, 0.76]],
      surprised: [shoulder, [side * 0.5, 1.48, 0.17], [side * 0.62, 1.35, 0.36], [side * 0.45, 1.25, 0.78]],
      warm: side < 0
        ? rest
        : [shoulder, [0.47, 1.47, 0.18], [0.48, 1.28, 0.34], [0.09, 1.19, 0.49]],
    };
    const arm = smoothArm(upper, shirt, skin, rest, poses);
    const hand = oval(upper, skin, wrist, driving ? [0.13, 0.15, 0.13] : [0.105, 0.08, 0.16]);
    if (!driving) {
      hand.name = 'gesture-hand';
      gestureArms.push({
        arm,
        hand,
        rest: new THREE.Vector3(...wrist),
        wrists: Object.fromEntries(Object.entries(poses).map(([name, points]) =>
          [name, new THREE.Vector3(...points.at(-1))])),
      });
    }
  }

  const head = new THREE.Group();
  head.position.set(0, driving ? 2.2 : 2.22, 0.12);
  if (!driving) head.scale.set(0.99, 1.02, 1);
  head.name = 'head';
  upper.add(head);
  if (driving) {
    oval(head, skin, [0, 0, 0], [0.44, 0.46, 0.44]);
    oval(head, hair, [0, 0.265, -0.06], [0.455, 0.225, 0.43]);
  } else {
    shape(head, createPassengerHeadGeometry(), skin, [0, 0, 0]);
    passengerHair(head, hair);
  }
  for (const side of [-1, 1]) {
    oval(head, skin, [side * 0.425, -0.025, -0.015], [0.06, 0.1, 0.065]);
  }
  let eyes = [];
  let brows = [];
  let cheeks = [];
  let gazeParts = [];
  let mouths;
  if (!driving) {
    ({ eyes, brows, mouths, cheeks, gazeParts } = createPassengerFace(head, skin, hair));
  } else {
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.14, 0.055, 0.415);
      oval(eye, ink, [0, 0, 0], [0.035, 0.047, 0.018]);
      head.add(eye);
      eyes.push(eye);
      const brow = new THREE.Group();
      brow.position.set(side * 0.14, 0.2, 0.387);
      tube(brow, hair, [[-0.064, 0, 0], [0.064, 0.008, 0.005]], 0.012);
      head.add(brow);
      brows.push(brow);
    }
    oval(head, skin, [0, -0.065, 0.435], [0.04, 0.06, 0.05]);
    mouths = {
      neutral: tube(head, ink, [[-0.095, -0.2, 0.404], [0, -0.211, 0.418], [0.095, -0.2, 0.404]], 0.011),
      attentive: oval(head, ink, [0, -0.21, 0.407], [0.039, 0.045, 0.017]),
      concerned: tube(head, ink, [[-0.105, -0.224, 0.392], [0, -0.185, 0.426], [0.105, -0.224, 0.392]], 0.012),
      surprised: oval(head, ink, [0, -0.21, 0.41], [0.05, 0.069, 0.018]),
      warm: tube(head, ink, [[-0.125, -0.175, 0.408], [0, -0.225, 0.416], [0.125, -0.175, 0.408]], 0.012),
    };
    for (const [name, mouth] of Object.entries(mouths)) mouth.visible = name === 'neutral';
  }

  // Seat endpoints stay fixed; the intermediate ribbon points follow the upper body.
  const outer = driving ? 1 : -1;
  const webbing = material(0x737d7b);
  const hardware = material(0x2c3334);
  const anchor = new THREE.Vector3(outer * 0.65, 1.99, -0.25);
  const buckle = new THREE.Vector3(-outer * 0.6, 0.58, 0.31);
  shape(root, new THREE.BoxGeometry(0.105, 0.14, 0.095), hardware, anchor.toArray());
  shape(root, new THREE.BoxGeometry(0.11, 0.14, 0.09), hardware, buckle.toArray());
  shape(root, new THREE.BoxGeometry(0.066, 0.025, 0.008), material(0x9a514b),
    [buckle.x, buckle.y + 0.047, buckle.z + 0.049]);
  tube(root, hardware, [buckle.toArray(), [-outer * 0.67, 0.36, 0.08]], 0.035);
  const segments = 40;
  const vertices = new Float32Array((segments + 1) * 2 * 3);
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const n = i * 2;
    indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  const ribbon = new THREE.BufferGeometry();
  ribbon.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  ribbon.setIndex(indices);
  webbing.side = THREE.DoubleSide;
  const beltMesh = shape(root, ribbon, webbing, [0, 0, 0]);
  beltMesh.name = 'seatbelt';
  const torsoPoints = [
    [outer * 0.4, 1.68, 0.31], [outer * 0.23, 1.46, 0.44],
    [0, 1.14, 0.432], [-outer * 0.28, 0.81, 0.39],
  ].map((p) => new THREE.Vector3(...p));
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const across = new THREE.Vector3();
  const points = [anchor.clone(), ...torsoPoints.map(() => new THREE.Vector3()), buckle.clone()];
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  function updateBelt() {
    upper.updateWorldMatrix(true, false);
    for (let i = 0; i < torsoPoints.length; i++) {
      points[i + 1].copy(torsoPoints[i]);
      root.worldToLocal(upper.localToWorld(points[i + 1]));
    }
    for (let i = 0; i <= segments; i++) {
      curve.getPoint(i / segments, point);
      curve.getTangent(i / segments, tangent);
      across.set(tangent.y, -tangent.x, 0).normalize().multiplyScalar(0.03);
      ribbon.attributes.position.setXYZ(i * 2, point.x - across.x, point.y - across.y, point.z);
      ribbon.attributes.position.setXYZ(i * 2 + 1, point.x + across.x, point.y + across.y, point.z);
    }
    ribbon.attributes.position.needsUpdate = true;
    ribbon.computeVertexNormals();
    ribbon.computeBoundingSphere();
  }
  function updateGesture(nextExpression, delta, enhanced = true) {
    if (driving) return;
    const targetName = enhanced && nextExpression !== 'neutral' ? nextExpression : null;
    for (const gesture of gestureArms) {
      for (const [name, index] of Object.entries(gesture.arm.morphTargetDictionary)) {
        const target = name === targetName ? 1 : 0;
        gesture.arm.morphTargetInfluences[index] = THREE.MathUtils.damp(
          gesture.arm.morphTargetInfluences[index], target, 9, delta,
        );
      }
      const targetWrist = targetName ? gesture.wrists[targetName] : gesture.rest;
      gesture.hand.position.lerp(targetWrist, 1 - Math.exp(-9 * delta));
      const handScale = enhanced && nextExpression === 'surprised' ? 1.12 : 1;
      gesture.hand.scale.x = THREE.MathUtils.damp(gesture.hand.scale.x, 0.105 * handScale, 9, delta);
      gesture.hand.scale.y = THREE.MathUtils.damp(gesture.hand.scale.y, 0.08 * handScale, 9, delta);
      gesture.hand.scale.z = THREE.MathUtils.damp(gesture.hand.scale.z, 0.16 * handScale, 9, delta);
    }
  }
  return { root, torso, head, eyes, brows, mouths, cheeks, gazeParts, updateBelt, updateGesture };
}
