import * as THREE from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';

const surface = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
const jawWidth = (y) => 1 - 0.055 * THREE.MathUtils.smoothstep(-y, 0.1, 0.42);
const faceDepth = (x, y) => 0.44 * Math.sqrt(Math.max(0, 1 - (x / (0.44 * jawWidth(y))) ** 2 - (y / 0.46) ** 2));
const tessellate = new TessellateModifier(0.025, 5);

export function createPassengerHeadGeometry() {
  const geometry = new THREE.SphereGeometry(1, 64, 48);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i) * 0.46;
    positions.setXYZ(i, positions.getX(i) * 0.44 * jawWidth(y), y, positions.getZ(i) * 0.44);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function add(parent, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function oval(parent, material, position, scale) {
  const mesh = add(parent, new THREE.SphereGeometry(1, 32, 24), material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

function line(parent, material, points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return add(parent, new THREE.TubeGeometry(curve, 32, radius, 10, false), material);
}

// Map facial contours onto the head, including their corners at oblique angles.
function onFace(points, offset = 0.012) {
  return points.map(([x, y]) => [x, y, faceDepth(x, y) + offset]);
}

function patch(parent, material, points) {
  const contour = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = tessellate.modify(new THREE.ShapeGeometry(contour));
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    position.setZ(i, faceDepth(position.getX(i), position.getY(i)) + 0.009);
  }
  geometry.computeVertexNormals();
  return add(parent, geometry, material);
}

function eyeOutline(angle) {
  const sine = Math.sin(angle);
  return [0.075 * Math.cos(angle), (sine >= 0 ? 0.045 : 0.033)
    * Math.sign(sine) * Math.abs(sine) ** 1.4, 0.006];
}

function eyeWhite(parent, white, lid) {
  const vertices = [];
  const indices = [];
  const segments = 48;
  const rings = 6;
  for (let ring = 0; ring <= rings; ring++) {
    const radius = ring / rings;
    for (let i = 0; i <= segments; i++) {
      const [x, y] = eyeOutline(i / segments * Math.PI * 2);
      vertices.push(x * radius, y * radius, 0.006 + 0.02 * (1 - radius * radius));
      if (ring < rings && i < segments) {
        const a = ring * (segments + 1) + i;
        const b = a + segments + 1;
        indices.push(a, b, b + 1, a, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  add(parent, geometry, white);
  for (const half of [0, 1]) {
    const points = Array.from({ length: 25 }, (_, i) => eyeOutline((half + i / 24) * Math.PI));
    line(parent, lid, points, half === 0 ? 0.0035 : 0.002);
  }
}

export function createPassengerFace(head, skin, hair) {
  const white = surface(0xe8d7c5);
  const iris = surface(0x403126);
  const pupil = surface(0x251e19);
  const lid = surface(0xb4836b);
  const lips = surface(0xab6e62);
  const inside = surface(0x482c2e);
  const blush = new THREE.MeshStandardMaterial({
    color: 0xc87872, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false,
  });
  const eyes = [];
  const brows = [];
  const cheeks = [];
  const gazeParts = [];

  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.name = 'expressive-eye';
    eye.position.set(side * 0.145, 0.055, faceDepth(0.145, 0.055) + 0.008);
    eye.rotation.y = side * 0.3;
    head.add(eye);
    eyeWhite(eye, white, lid);
    const gaze = [
      oval(eye, iris, [0.003, 0, 0.025], [0.031, 0.039, 0.008]),
      oval(eye, pupil, [0.003, -0.001, 0.032], [0.017, 0.031, 0.004]),
      oval(eye, white, [-0.003, 0.011, 0.037], [0.004, 0.005, 0.002]),
      oval(eye, white, [0.01, -0.012, 0.037], [0.002, 0.002, 0.001]),
    ];
    for (const part of gaze) {
      part.userData.gazeBaseX = part.position.x;
      gazeParts.push(part);
    }
    eyes.push(eye);

    const brow = new THREE.Group();
    brow.position.set(side * 0.145, 0.17, faceDepth(0.145, 0.17) + 0.015);
    brow.rotation.y = side * 0.3;
    line(brow, hair, [[-0.067, -0.003, -0.005], [-0.026, 0.009, 0.006],
      [0.026, 0.012, 0.006], [0.067, -0.003, -0.008]], 0.008);
    head.add(brow);
    brows.push(brow);
  }

  oval(head, skin, [0, -0.055, 0.435], [0.034, 0.069, 0.045]);
  oval(head, skin, [0, -0.092, 0.472], [0.037, 0.031, 0.035]);
  for (const side of [-1, 1]) {
    oval(head, skin, [side * 0.027, -0.101, 0.449], [0.02, 0.015, 0.023]);
    cheeks.push(oval(head, blush, [side * 0.265, -0.115, faceDepth(0.265, -0.115) + 0.014],
      [0.068, 0.032, 0.012]));
  }

  const mouths = {};
  const poses = {
    neutral: { width: 0.103, corner: -0.191, top: -0.208, bottom: -0.222 },
    warm: { width: 0.137, corner: -0.183, top: -0.208, bottom: -0.227 },
    concerned: { width: 0.12, corner: -0.237, top: -0.206, bottom: -0.218 },
    attentive: { width: 0.045, corner: -0.221, top: -0.194, bottom: -0.252 },
    surprised: { width: 0.069, corner: -0.226, top: -0.15, bottom: -0.31 },
  };
  for (const [name, pose] of Object.entries(poses)) {
    const mouth = new THREE.Group();
    mouth.name = `mouth-${name}`;
    const { width: w, corner, top, bottom } = pose;
    const upper = [];
    const lower = [];
    for (let i = 0; i <= 24; i++) {
      const x = -w + 2 * w * i / 24;
      const arch = Math.sqrt(Math.max(0, 1 - (x / w) ** 2));
      upper.push([x, corner + (top - corner) * arch]);
      lower.push([x, corner + (bottom - corner) * arch]);
    }
    patch(mouth, inside, [...upper, ...lower.slice().reverse()]);
    line(mouth, lips, onFace(upper), 0.005);
    line(mouth, lips, onFace(lower), 0.007);
    mouth.visible = name === 'neutral';
    head.add(mouth);
    mouths[name] = mouth;
  }
  return { eyes, brows, mouths, cheeks, gazeParts };
}
