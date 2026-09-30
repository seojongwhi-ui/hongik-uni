import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CarFront, Gauge, OctagonAlert, Play, createIcons } from 'lucide';
import { setupSpeedometer } from './speedometer.js';
import { reactionForUtterance } from './speechReactions.js';
import { setupSpeechRecognition } from './speechRecognition.js';
import './style.css';

createIcons({ icons: { CarFront, Gauge, OctagonAlert, Play } });

const sessionButton = document.getElementById('session-start');
const sessionButtonText = document.getElementById('session-start-text');
const consent = document.getElementById('session-consent');
let sessionApproved = false;

function showReconnect() {
  sessionButton.hidden = false;
  sessionButtonText.textContent = '다시 연결';
  sessionButton.setAttribute('aria-label', '기능 다시 연결');
  sessionButton.title = '기능 다시 연결';
}

const speedometer = setupSpeedometer({ onNeedsAttention: showReconnect, onSpeedChange: updateLiveSpeed });

const host = document.getElementById('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe5eae5);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
host.appendChild(renderer.domElement);

const mat = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
const passengerSkin = mat(0xc4a28b, 0.9);
const passengerSkinShade = mat(0xaf8975, 0.95);
const passengerJacket = mat(0x52695a, 0.9);
const passengerShirt = mat(0xe3e3da, 0.92);
const passengerHair = mat(0x332b28, 0.96);
const eyeWhite = mat(0xf2f2eb, 0.85);
const passengerIris = mat(0x29483d, 0.72);
const cheek = mat(0xc58c84, 1);
const seatMat = mat(0x505454);
const seatSide = mat(0x2d3233);
const seatSeam = mat(0x666c69);
const cabin = mat(0x636a69);
const trim = mat(0x252b2c);
const belt = mat(0x8b9496);
const faceInk = mat(0x2c4138);
const avatarEyeWhite = mat(0xf6f4ee, 0.72);
const avatarIris = mat(0x30453f, 0.66);
const avatarNose = mat(0xb78470, 0.84);
const avatarMouth = mat(0x87464b, 0.82);
const driverSkin = mat(0xb9a28e);
const driverShirt = mat(0x416066);
const driverHair = mat(0x252728);
const driverInk = mat(0x252d2b);
const dashboardFront = mat(0x252c2c);
const dashboardTop = mat(0x444d4b);

function mesh(geometry, material, parent, position = [0, 0, 0], scale = [1, 1, 1]) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  item.scale.set(...scale);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function ellipsoid(parent, material, position, scale) {
  return mesh(new THREE.SphereGeometry(1, 28, 20), material, parent, position, scale);
}

function box(parent, material, position, scale, radius = 0) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const item = mesh(geo, material, parent, position, scale);
  if (radius) item.rotation.z = radius;
  return item;
}

function strap(parent, material, from, to, width, depth) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const direction = new THREE.Vector3().subVectors(b, a);
  const item = mesh(new THREE.BoxGeometry(width, direction.length(), depth), material, parent);
  item.position.copy(a).add(b).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return item;
}

function limb(parent, material, from, to, radius) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const direction = new THREE.Vector3().subVectors(b, a);
  const item = mesh(new THREE.CapsuleGeometry(radius, Math.max(0, direction.length() - 2 * radius), 8, 20), material, parent);
  item.position.copy(a).add(b).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return item;
}

function curvedLimb(parent, material, points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return mesh(new THREE.TubeGeometry(curve, 20, radius, 12, false), material, parent);
}

function panel(parent, material, points, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(...points[0]);
  for (const point of points.slice(1)) shape.lineTo(...point);
  shape.closePath();
  const item = mesh(new THREE.ShapeGeometry(shape), material, parent, [0, 0, depth]);
  item.castShadow = false;
  item.receiveShadow = false;
  return item;
}

const world = new THREE.Group();
scene.add(world);
const cabinCenterX = 2.26;
const windowFrame = mat(0x3b4649);
const windowTrim = mat(0xaab4b2);
const rearGlass = new THREE.MeshBasicMaterial({ color: 0xa6b9b8 });
const sideGlass = new THREE.MeshBasicMaterial({ color: 0xd1d9d4 });
const glassDetail = new THREE.MeshBasicMaterial({ color: 0x93a9a8 });
const pillarTrim = mat(0x91958d);
const roofLiner = mat(0x353b3c);
const sidePanel = mat(0x141819);
const sideInset = mat(0x292f30);
const doorHandle = mat(0x818987, 0.5);
sidePanel.side = THREE.DoubleSide;
sideInset.side = THREE.DoubleSide;

// From the front of a left-hand-drive car, the passenger seat appears left of the center console.
box(world, mat(0x747b77), [0, 1.8, -4.8], [22, 9, 0.2]);
box(world, mat(0x515b59), [0, -0.75, -4.42], [22, 1.55, 0.3]);
const rearCabin = new THREE.Group();
rearCabin.position.x = cabinCenterX - 1.18;
world.add(rearCabin);
panel(rearCabin, rearGlass, [[-2.52, 1.58], [4.88, 1.58], [4.38, 3.51], [-2.02, 3.51]], -4.63);
for (const [height, width] of [[2.02, 6.7], [2.45, 6.4], [2.88, 6.1]]) {
  box(rearCabin, glassDetail, [1.18, height, -4.59], [width, 0.012, 0.015]);
}
panel(rearCabin, pillarTrim, [[-4.5, 1.3], [-2.56, 1.3], [-2.02, 3.51], [-2.62, 3.95], [-4.5, 3.95]], -4.12);
panel(rearCabin, pillarTrim, [[4.91, 1.3], [6.86, 1.3], [6.86, 3.95], [4.38, 3.95], [4.38, 3.51]], -4.12);
strap(rearCabin, windowFrame, [-2.52, 1.58, -4.35], [-2.02, 3.51, -4.35], 0.22, 0.22);
strap(rearCabin, windowFrame, [-2.02, 3.51, -4.35], [4.38, 3.51, -4.35], 0.22, 0.22);
strap(rearCabin, windowFrame, [4.38, 3.51, -4.35], [4.88, 1.58, -4.35], 0.22, 0.22);
strap(rearCabin, windowFrame, [-2.52, 1.58, -4.35], [4.88, 1.58, -4.35], 0.23, 0.3);
strap(rearCabin, windowTrim, [-1.91, 3.31, -4.2], [4.27, 3.31, -4.2], 0.025, 0.035);
box(rearCabin, roofLiner, [1.18, 3.86, -4.0], [10.2, 0.58, 0.46]);

box(rearCabin, mat(0x555f61), [1.18, 1.37, -3.88], [7.9, 0.18, 0.78]);
box(rearCabin, seatSide, [1.18, 0.76, -3.25], [6.2, 1.18, 0.47]);
box(rearCabin, seatMat, [1.18, 0.78, -2.96], [5.9, 0.98, 0.16]);
box(rearCabin, seatSide, [1.18, 0.13, -2.9], [6.4, 0.4, 1.1]);
ellipsoid(rearCabin, seatMat, [1.18, 0.34, -2.84], [3.04, 0.24, 0.54]);
for (const x of [-1.11, 3.47]) {
  box(rearCabin, seatSide, [x - 0.18, 1.4, -3.14], [0.055, 0.31, 0.06]);
  box(rearCabin, seatSide, [x + 0.18, 1.4, -3.14], [0.055, 0.31, 0.06]);
  ellipsoid(rearCabin, seatMat, [x, 1.69, -3.08], [0.43, 0.3, 0.24]);
}

panel(world, sideGlass, [[-3.35, 1.3], [-1.37, 1.3], [-1.52, 3.16], [-2.65, 3.47]], -3.85);
panel(world, sideGlass, [[5.89, 1.3], [7.87, 1.3], [7.17, 3.47], [6.04, 3.16]], -3.85);
box(world, roofLiner, [cabinCenterX, 3.87, -1.35], [14, 0.68, 5.9]);
box(world, trim, [0, -1.6, 1.15], [14, 0.34, 1.55]);
box(world, cabin, [0, -1.83, 1.25], [14, 0.28, 1.45]);
box(world, mat(0x454d4c), [0, -1.28, -2.2], [14, 0.35, 2.5]);

for (const side of [-1, 1]) {
  const x = cabinCenterX + side * 3.6;
  const door = box(world, sidePanel, [x, -0.64, -2.23], [0.38, 1.3, 2.86]);
  door.rotation.y = side * 0.12;
  box(world, sideInset, [x - side * 0.2, -0.61, -2.25], [0.05, 0.56, 2.32]);
  box(world, sideInset, [x - side * 0.12, 0.04, -1.84], [0.34, 0.14, 1.5]);
  const innerX = cabinCenterX + side * 3.06;
  const outerX = cabinCenterX + side * 5.72;
  panel(world, sidePanel, [
    [outerX, -1.6], [innerX, -1.6], [innerX, 0.78],
    [innerX + side * 0.35, 1.05], [outerX, 1.34],
  ], -2.4);
  panel(world, sideInset, [
    [outerX - side * 0.1, -1.16], [innerX + side * 0.18, -1.16],
    [innerX + side * 0.18, 0.37], [outerX - side * 0.1, 0.58],
  ], -2.37);
  box(world, sideInset, [innerX + side * 0.67, 0.63, -2.25], [0.85, 0.12, 0.3]);
  box(world, doorHandle, [innerX + side * 0.86, 0.43, -2.18], [0.4, 0.045, 0.06]);
  strap(world, windowFrame, [x, 0.12, -3.3], [x + side * 0.15, 3.55, -3.48], 0.22, 0.31);
}
strap(world, pillarTrim, [-1.19, 3.55, -3.48], [5.71, 3.55, -3.48], 0.16, 0.3);

box(world, seatSide, [cabinCenterX, 0.05, -0.19], [0.7, 0.46, 1.56]);
ellipsoid(world, seatMat, [cabinCenterX, 0.33, -0.24], [0.35, 0.13, 0.61]);

// The foreground dashboard gives the mounted display its front-cabin point of view.
box(world, dashboardFront, [cabinCenterX, -0.5, 1.55], [12.4, 2.5, 0.48]);
box(world, dashboardTop, [cabinCenterX, 0.79, 1.48], [12.2, 0.16, 0.72]);
box(world, dashboardFront, [cabinCenterX, 0.6, 1.82], [0.92, 0.5, 0.58]);
box(world, dashboardTop, [cabinCenterX, 0.89, 1.78], [1.02, 0.12, 0.7]);

function makeFrontSeat(parent, x = 0, occupied = false) {
  const seat = new THREE.Group();
  seat.position.x = x;
  parent.add(seat);
  box(seat, seatSide, [0, 0.18, -0.58], [1.63, 0.38, 1.42]);
  ellipsoid(seat, seatMat, [0, 0.39, -0.46], [0.72, 0.17, 0.62]);
  const back = box(seat, seatSide, [0, 1.35, -0.82], [1.5, 2.19, 0.42]);
  back.rotation.x = -0.13;
  const backPad = ellipsoid(seat, seatMat, [0, 1.4, -0.52], [0.64, 1.01, 0.2]);
  backPad.rotation.x = -0.13;
  for (const height of [0.97, 1.4, 1.83]) {
    box(seat, seatSeam, [0, height, -0.31], [0.76, 0.012, 0.018]);
  }
  for (const side of [-1, 1]) {
    ellipsoid(seat, seatMat, [side * 0.63, 1.34, -0.39], [0.15, 0.97, 0.18]);
    box(seat, windowTrim, [side * 0.19, occupied ? 2.34 : 2.47, -0.7], [0.04, occupied ? 0.19 : 0.34, 0.05]);
  }
  const headrestY = occupied ? 2.4 : 2.67;
  ellipsoid(seat, seatSide, [0, headrestY, -0.72], [0.51, occupied ? 0.27 : 0.33, 0.25]);
  ellipsoid(seat, seatMat, [0, headrestY, -0.52], [0.44, occupied ? 0.23 : 0.28, 0.14]);
  return seat;
}

const passenger = new THREE.Group();
passenger.position.x = 1.18;
world.add(passenger);
makeFrontSeat(passenger, 0, true);
const driverSeat = makeFrontSeat(world, 3.52, true);

const steeringWheel = mesh(new THREE.TorusGeometry(0.72, 0.1, 12, 48), trim, world, [3.64, 1.12, 1.25]);
steeringWheel.rotation.y = -0.25;

const person = new THREE.Group();
passenger.add(person);
const passengerBodyProfile = [
  [0, 0.3], [0.34, 0.3], [0.47, 0.42], [0.51, 0.7],
  [0.47, 1.02], [0.52, 1.25], [0.62, 1.46], [0.58, 1.62], [0.4, 1.76], [0, 1.79],
];
const driverBodyProfile = [
  [0, 0.3], [0.27, 0.3], [0.39, 0.42], [0.43, 0.7],
  [0.42, 1.08], [0.51, 1.42], [0.49, 1.61], [0.32, 1.76], [0, 1.81],
];
const passengerBody = mesh(
  new THREE.LatheGeometry(passengerBodyProfile.map(([radius, height]) => new THREE.Vector2(radius, height)), 48),
  passengerJacket,
  person,
  [0, 0, 0.03],
  [1.06, 1, 0.76],
);
passengerBody.geometry.computeVertexNormals();
ellipsoid(person, passengerJacket, [0, 0.44, 0.12], [0.51, 0.25, 0.37]);
ellipsoid(person, passengerSkin, [0, 1.79, -0.005], [0.145, 0.17, 0.13]);
panel(person, passengerShirt, [[-0.2, 1.64], [-0.02, 1.51], [-0.02, 1.7]], 0.47);
panel(person, passengerShirt, [[0.2, 1.64], [0.02, 1.51], [0.02, 1.7]], 0.47);

for (const side of [-1, 1]) {
  const shoulder = [side * 0.54, 1.48, 0.07];
  const elbow = [side * 0.67, 1.17, 0.23];
  const wrist = [side * 0.53, 0.84, 0.4];
  ellipsoid(person, passengerJacket, shoulder, [0.17, 0.18, 0.16]);
  curvedLimb(person, passengerJacket, [shoulder, elbow, wrist], 0.135);
  ellipsoid(person, passengerSkin, [side * 0.5, 0.76, 0.46], [0.105, 0.1, 0.075]);
}

strap(person, belt, [0.48, 1.64, 0.4], [-0.42, 0.72, 0.48], 0.06, 0.025);
box(person, trim, [-0.42, 0.72, 0.5], [0.14, 0.1, 0.06]);

const head = new THREE.Group();
head.position.set(0, 2.18, 0.1);
person.add(head);
ellipsoid(head, passengerSkin, [0, 0, 0], [0.435, 0.48, 0.42]);
ellipsoid(head, passengerSkinShade, [-0.405, -0.01, -0.015], [0.055, 0.1, 0.045]);
ellipsoid(head, passengerSkinShade, [0.405, -0.01, -0.015], [0.055, 0.1, 0.045]);
ellipsoid(head, passengerHair, [0, 0.31, -0.065], [0.44, 0.18, 0.38]);
const hairline = new THREE.Shape();
hairline.moveTo(-0.39, 0.2);
hairline.lineTo(-0.37, 0.31);
hairline.quadraticCurveTo(-0.2, 0.43, 0, 0.38);
hairline.quadraticCurveTo(0.21, 0.43, 0.38, 0.3);
hairline.lineTo(0.39, 0.19);
hairline.quadraticCurveTo(0.25, 0.15, 0.13, 0.2);
hairline.quadraticCurveTo(0, 0.14, -0.13, 0.2);
hairline.quadraticCurveTo(-0.27, 0.15, -0.39, 0.2);
const fringe = mesh(new THREE.ShapeGeometry(hairline), passengerHair, head, [0, 0, 0.424]);
fringe.castShadow = false;
ellipsoid(head, passengerHair, [-0.385, 0.13, 0.06], [0.052, 0.16, 0.1]);
ellipsoid(head, passengerHair, [0.385, 0.13, 0.06], [0.052, 0.16, 0.1]);

const eyes = [];
const brows = [];
for (const side of [-1, 1]) {
  const eye = new THREE.Group();
  eye.position.set(side * 0.145, 0.055, 0.397);
  ellipsoid(eye, eyeWhite, [0, 0, -0.004], [0.064, 0.055, 0.016]);
  ellipsoid(eye, passengerIris, [0, -0.002, 0.013], [0.03, 0.04, 0.013]);
  head.add(eye);
  eyes.push(eye);

  const brow = new THREE.Group();
  brow.position.set(side * 0.145, 0.2, 0.39);
  limb(brow, passengerHair, [-0.065, 0, 0], [0.065, 0, 0], 0.013);
  head.add(brow);
  brows.push(brow);
}
ellipsoid(head, passengerSkinShade, [0, -0.07, 0.414], [0.04, 0.058, 0.045]);
ellipsoid(head, cheek, [-0.245, -0.12, 0.39], [0.055, 0.03, 0.01]);
ellipsoid(head, cheek, [0.245, -0.12, 0.39], [0.055, 0.03, 0.01]);

function mouthLine(points) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return mesh(new THREE.TubeGeometry(curve, 16, 0.013, 8, false), faceInk, head);
}

const mouths = {
  neutral: mouthLine([[-0.105, -0.205, 0.422], [0, -0.205, 0.43], [0.105, -0.205, 0.422]]),
  attentive: ellipsoid(head, faceInk, [0, -0.207, 0.429], [0.047, 0.061, 0.016]),
  concerned: mouthLine([[-0.12, -0.235, 0.405], [0, -0.17, 0.44], [0.12, -0.235, 0.405]]),
  surprised: mesh(new THREE.TorusGeometry(0.069, 0.013, 10, 32), faceInk, head, [0, -0.25, 0.46], [1, 1.18, 1]),
  warm: mouthLine([[-0.14, -0.17, 0.41], [0, -0.235, 0.425], [0.14, -0.17, 0.41]]),
};

function addAvatarFace(avatar, headBone) {
  const headMesh = avatar.getObjectByName('Casual_Head_1');
  if (!headMesh || !headBone) return;

  avatar.updateMatrixWorld(true);
  const headBounds = new THREE.Box3().setFromObject(headMesh);
  const center = headBounds.getCenter(new THREE.Vector3());
  const headSize = headBounds.getSize(new THREE.Vector3());
  const face = new THREE.Group();
  const faceCenter = new THREE.Vector3(
    center.x,
    center.y + headSize.y * 0.03,
    headBounds.max.z + 0.012,
  );
  face.position.copy(headBone.worldToLocal(faceCenter));
  face.scale.setScalar(0.00082);
  face.name = 'passenger-face-features';
  headBone.add(face);

  for (const side of [-1, 1]) {
    ellipsoid(face, avatarEyeWhite, [side * 0.2, 0.015, 0], [0.115, 0.072, 0.021]);
    ellipsoid(face, avatarIris, [side * 0.2, 0.01, 0.024], [0.038, 0.046, 0.015]);
    limb(face, passengerHair, [side * 0.36, 0.22, 0.035], [side * 0.13, 0.195, 0.04], 0.012);
  }
  ellipsoid(face, avatarNose, [0, -0.09, 0.028], [0.075, 0.105, 0.055]);
  limb(face, avatarMouth, [-0.15, -0.54, 0.035], [0.15, -0.54, 0.035], 0.018);
}

const passengerAvatar = new THREE.Group();
passenger.add(passengerAvatar);
const passengerBones = {};
const passengerPoseRotations = {};
let passengerAvatarReady = false;

new GLTFLoader().load('/models/passenger-casual.glb', (gltf) => {
  const avatar = gltf.scene;
  avatar.name = 'rigged-passenger';
  avatar.position.set(0, -1.28, -0.28);
  avatar.scale.setScalar(2.08);
  avatar.traverse((item) => {
    if (item.isMesh) {
      if (item.name === 'Casual_Head_4') item.visible = false;
      item.castShadow = true;
      item.receiveShadow = true;
    }
    if (item.isBone) passengerBones[item.name] = item;
  });

  const bendBone = (name, angle) => passengerBones[name]?.rotateX(angle);

  // Keep the model seated with both knees oriented toward the footwell.
  bendBone('UpperLegL', -0.9);
  bendBone('UpperLegR', -0.9);
  bendBone('LowerLegL', 0.95);
  bendBone('LowerLegR', 0.95);
  passengerBones.UpperLegL?.rotateZ(0.7);
  passengerBones.UpperLegR?.rotateZ(0.3);
  bendBone('UpperArmL', -0.3);
  bendBone('UpperArmR', -0.3);
  passengerBones.UpperArmL?.rotateZ(-0.35);
  passengerBones.LowerArmL?.rotateZ(-0.25);
  passengerBones.UpperArmR?.rotateZ(0.25);
  passengerBones.LowerArmR?.rotateZ(0.15);

  addAvatarFace(avatar, passengerBones.Head);

  for (const name of ['Head', 'Chest']) {
    if (passengerBones[name]) passengerPoseRotations[name] = passengerBones[name].rotation.clone();
  }
  passengerAvatar.add(avatar);
  person.visible = false;
  passengerAvatarReady = true;
}, undefined, () => {
  // Keep the procedural passenger visible if the bundled model cannot load.
  passengerAvatarReady = false;
});

// Mirror the driver-side belt geometry for the passenger seat.
strap(passenger, belt, [-0.45, 1.64, 0.39], [0.43, 0.38, 0.49], 0.06, 0.024);

const driver = new THREE.Group();
driver.position.set(3.52, 0, -0.02);
world.add(driver);
const driverBody = mesh(
  new THREE.LatheGeometry(driverBodyProfile.map(([radius, height]) => new THREE.Vector2(radius, height)), 40),
  driverShirt,
  driver,
  [0, 0, 0.04],
  [1.12, 1, 0.82],
);
driverBody.geometry.computeVertexNormals();
ellipsoid(driver, driverShirt, [0, 0.36, 0.15], [0.52, 0.26, 0.41]);
strap(driver, belt, [0.45, 1.64, 0.39], [-0.43, 0.38, 0.49], 0.06, 0.024);

const driverArmPoints = [
  [[-0.45, 1.48, 0.08], [-0.62, 1.28, 0.42], [-0.48, 1.2, 1.03]],
  [[0.45, 1.48, 0.08], [0.65, 1.28, 0.42], [0.72, 1.2, 1.03]],
];
for (const [shoulder, elbow, wrist] of driverArmPoints) {
  ellipsoid(driver, driverShirt, shoulder, [0.16, 0.18, 0.16]);
  limb(driver, driverShirt, shoulder, elbow, 0.13);
  ellipsoid(driver, driverShirt, elbow, [0.13, 0.13, 0.13]);
  limb(driver, driverSkin, elbow, wrist, 0.105);
  ellipsoid(driver, driverSkin, wrist, [0.14, 0.16, 0.14]);
}

const driverHead = new THREE.Group();
driverHead.position.set(0, 2.2, 0.12);
driver.add(driverHead);
ellipsoid(driverHead, driverSkin, [0, 0, 0], [0.44, 0.46, 0.44]);
ellipsoid(driverHead, driverHair, [0, 0.25, -0.035], [0.45, 0.24, 0.43]);
for (const side of [-1, 1]) {
  ellipsoid(driverHead, driverInk, [side * 0.14, 0.055, 0.414], [0.035, 0.047, 0.018]);
  limb(driverHead, driverHair, [side * 0.205, 0.17, 0.39], [side * 0.075, 0.18, 0.415], 0.011);
}
ellipsoid(driverHead, driverSkin, [0, -0.065, 0.435], [0.04, 0.06, 0.05]);
const driverMouthCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.09, -0.2, 0.405),
  new THREE.Vector3(0, -0.21, 0.422),
  new THREE.Vector3(0.09, -0.2, 0.405),
]);
mesh(new THREE.TubeGeometry(driverMouthCurve, 12, 0.011, 8, false), driverInk, driverHead);

const passengerPane = document.getElementById('passenger-pane');
const passengerState = document.getElementById('passenger-state-text');
let expression = 'neutral';
let expressionExpiresAt = Infinity;
let scenario = 'none';
let scenarioStartedAt = 0;
let scenarioExpiresAt = 0;
let liveSpeeding = false;
let vehicleMoving = null;
let departureStartedAt = -Infinity;
const PROTOTYPE_SPEED_THRESHOLD_KMH = 50;
const DEPARTURE_START_KMH = 3;
const DEPARTURE_STOP_KMH = 1;
const DEPARTURE_EFFECT_MS = 1300;

function setExpression(next) {
  expression = next;
  for (const [name, mouth] of Object.entries(mouths)) mouth.visible = name === next;
  passengerPane.dataset.expression = next;
  if (scenario === 'none') passengerState.textContent = next === 'neutral' ? '대기 중' : '반응 중';
  expressionExpiresAt = next === 'neutral' ? Infinity : performance.now() + 4500;
}

function applyLiveSpeedReaction() {
  if (scenario !== 'none') return;
  setExpression(liveSpeeding ? 'concerned' : 'neutral');
  if (liveSpeeding) {
    passengerState.textContent = '실험 기준 초과';
    expressionExpiresAt = Infinity;
  }
}

function triggerDepartureJolt() {
  departureStartedAt = performance.now();
  passengerPane.dataset.motion = 'departure';
}

function updateLiveSpeed(displayedSpeed) {
  if (displayedSpeed !== null) {
    if (vehicleMoving === null) {
      vehicleMoving = displayedSpeed >= DEPARTURE_START_KMH;
      passengerPane.dataset.motion = vehicleMoving ? 'moving' : 'stationary';
    } else if (!vehicleMoving && displayedSpeed >= DEPARTURE_START_KMH) {
      vehicleMoving = true;
      triggerDepartureJolt();
    } else if (vehicleMoving && displayedSpeed <= DEPARTURE_STOP_KMH) {
      vehicleMoving = false;
      passengerPane.dataset.motion = 'stationary';
    }
  }
  const speeding = displayedSpeed !== null && displayedSpeed > PROTOTYPE_SPEED_THRESHOLD_KMH;
  if (speeding === liveSpeeding) return;
  liveSpeeding = speeding;
  passengerPane.dataset.speeding = String(speeding);
  applyLiveSpeedReaction();
}

function simulateScenario(next) {
  scenario = next;
  scenarioStartedAt = performance.now();
  scenarioExpiresAt = scenarioStartedAt + 4500;
  passengerPane.dataset.scenario = next;
  setExpression(next === 'speeding' ? 'concerned' : 'surprised');
  passengerState.textContent = next === 'speeding' ? '과속 시뮬레이션' : '급정거 시뮬레이션';
}

document.getElementById('simulate-departure').addEventListener('click', triggerDepartureJolt);
document.getElementById('simulate-speeding').addEventListener('click', () => simulateScenario('speeding'));
document.getElementById('simulate-braking').addEventListener('click', () => simulateScenario('braking'));

setExpression('neutral');
const speechRecognition = setupSpeechRecognition({
  onUtterance: (transcript) => {
    if (scenario === 'none' && !liveSpeeding) setExpression(reactionForUtterance(transcript));
  },
  onStop: () => {
    if (scenario === 'none' && !liveSpeeding) setExpression('neutral');
  },
  onNeedsAttention: showReconnect,
});

function startSession() {
  if (!sessionApproved) {
    if (!consent.open) consent.showModal();
    return;
  }
  if (document.hidden) return;
  sessionButton.hidden = true;
  speedometer.start();
  speechRecognition.start();
}

sessionButton.addEventListener('click', startSession);
document.getElementById('session-confirm').addEventListener('click', () => {
  sessionApproved = true;
  consent.close();
  startSession();
});
document.getElementById('session-cancel').addEventListener('click', () => consent.close());
consent.showModal();

function pauseSession() {
  if (!sessionApproved) return;
  speedometer.stop();
  speechRecognition.stop();
}

window.addEventListener('pagehide', pauseSession);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseSession();
  else if (sessionApproved) startSession();
});

const leftLight = new THREE.DirectionalLight(0xffe7cb, 2.6);
leftLight.position.set(-3, 5, 4);
leftLight.castShadow = true;
leftLight.shadow.mapSize.set(1024, 1024);
leftLight.shadow.camera.left = -5;
leftLight.shadow.camera.right = 5;
leftLight.shadow.camera.top = 5;
leftLight.shadow.camera.bottom = -5;
scene.add(leftLight);
const fillLight = new THREE.DirectionalLight(0xd7eee5, 1.3);
fillLight.position.set(4, 2, 1);
scene.add(fillLight);
scene.add(new THREE.AmbientLight(0xffffff, 1.4));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minAzimuthAngle = -0.3;
controls.maxAzimuthAngle = 0.3;
controls.minPolarAngle = 1.25;
controls.maxPolarAngle = 1.8;
controls.target.set(cabinCenterX, 1.35, 0);

function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  const ratio = width / height;
  const narrowPortrait = ratio < 0.75;
  driverSeat.position.x = narrowPortrait ? 3.05 : 3.52;
  driver.position.x = narrowPortrait ? 3.05 : 3.52;
  steeringWheel.position.x = narrowPortrait ? 3.17 : 3.64;
  camera.fov = ratio < 1 ? 50 : ratio < 1.35 ? 45 : 42;
  const focusX = narrowPortrait ? 2.05 : 2.2;
  camera.position.set(focusX, 2.15, ratio < 1 ? 7.2 : ratio < 1.35 ? 6.0 : 5.8);
  controls.target.set(focusX, 1.35, 0);
  camera.aspect = ratio;
  camera.updateProjectionMatrix();
  controls.update();
  renderer.setSize(width, height);
}

new ResizeObserver(resize).observe(host);
resize();

const clock = new THREE.Clock();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let lastTime = 0;

function animate() {
  const t = clock.getElapsedTime();
  const delta = Math.min(t - lastTime, 0.05);
  lastTime = t;
  const now = performance.now();
  const departureAge = (now - departureStartedAt) / 1000;
  const departureActive = departureAge >= 0 && departureAge < DEPARTURE_EFFECT_MS / 1000;
  if (!departureActive && passengerPane.dataset.motion === 'departure') {
    passengerPane.dataset.motion = vehicleMoving ? 'moving' : 'stationary';
  }
  if (scenario !== 'none' && now > scenarioExpiresAt) {
    scenario = 'none';
    passengerPane.dataset.scenario = 'none';
    applyLiveSpeedReaction();
  } else if (now > expressionExpiresAt) setExpression('neutral');

  const browAngle = expression === 'concerned' ? 0.28 : expression === 'warm' ? -0.1 : 0;
  brows[0].rotation.z = THREE.MathUtils.damp(brows[0].rotation.z, browAngle, 7, delta);
  brows[1].rotation.z = THREE.MathUtils.damp(brows[1].rotation.z, -browAngle, 7, delta);
  const browHeight = expression === 'surprised' ? 0.28 : 0.2;
  for (const brow of brows) brow.position.y = THREE.MathUtils.damp(brow.position.y, browHeight, 7, delta);
  const eyeHeight = expression === 'surprised' ? 1.5 : expression === 'warm' ? 0.7 : expression === 'concerned' || expression === 'attentive' ? 1.1 : 1;
  const eyeWidth = expression === 'surprised' ? 1.25 : 1;
  const blink = !reducedMotion.matches && Math.abs(Math.sin(t * 0.83)) > 0.996 ? 0.12 : 1;
  for (const eye of eyes) {
    eye.scale.x = THREE.MathUtils.damp(eye.scale.x, eyeWidth, 15, delta);
    eye.scale.y = THREE.MathUtils.damp(eye.scale.y, eyeHeight * blink, 15, delta);
  }

  if (!reducedMotion.matches) {
    const departureWave = departureActive ? Math.sin(departureAge * 25) * Math.exp(-departureAge * 3.2) : 0;
    const departureLean = departureActive && departureAge < 0.55
      ? Math.sin(Math.PI * departureAge / 0.55) * Math.exp(-departureAge * 0.8)
      : 0;
    world.position.y = THREE.MathUtils.damp(world.position.y, departureWave * 0.065, 18, delta);
    world.rotation.z = THREE.MathUtils.damp(world.rotation.z, departureWave * 0.0045, 18, delta);
    person.position.y = Math.sin(t * 1.6) * 0.018;
    person.rotation.z = Math.sin(t * 0.7) * 0.012;
    passengerAvatar.position.copy(person.position);
    passengerAvatar.rotation.copy(person.rotation);
    driver.position.y = Math.sin(t * 1.45 + 0.8) * 0.012;
    driverHead.rotation.y = Math.sin(t * 0.38) * 0.025;
    driverHead.rotation.z = Math.sin(t * 0.52 + 0.4) * 0.008;
    const eventAge = (now - scenarioStartedAt) / 1000;
    const brakePulse = scenario === 'braking' && eventAge < 1.3 ? Math.sin(Math.PI * eventAge / 1.3) : 0;
    person.rotation.x = THREE.MathUtils.damp(person.rotation.x, brakePulse * 0.14 - (scenario === 'speeding' ? 0.035 : 0) - departureLean * 0.08, 9, delta);
    driver.rotation.x = THREE.MathUtils.damp(driver.rotation.x, -departureLean * 0.055, 9, delta);
    person.position.z = THREE.MathUtils.damp(person.position.z, brakePulse * 0.07, 9, delta);
    const turn = expression === 'neutral' ? -0.1 : -0.26;
    const tilt = expression === 'concerned' ? 0.1 : expression === 'warm' ? -0.05 : 0;
    head.rotation.y = THREE.MathUtils.damp(head.rotation.y, turn + Math.sin(t * 0.48) * 0.05, 4, delta);
    head.rotation.z = THREE.MathUtils.damp(head.rotation.z, tilt + Math.sin(t * 0.65) * 0.012, 4, delta);
    head.rotation.x = THREE.MathUtils.damp(head.rotation.x, expression === 'surprised' ? -0.12 : 0, 5, delta);
    if (passengerAvatarReady) {
      const avatarHead = passengerBones.Head;
      const avatarChest = passengerBones.Chest;
      const headPose = passengerPoseRotations.Head;
      const chestPose = passengerPoseRotations.Chest;
      if (avatarHead && headPose) {
        avatarHead.rotation.y = THREE.MathUtils.damp(avatarHead.rotation.y, headPose.y + turn * 0.7, 4, delta);
        avatarHead.rotation.z = THREE.MathUtils.damp(avatarHead.rotation.z, headPose.z + tilt, 4, delta);
        avatarHead.rotation.x = THREE.MathUtils.damp(
          avatarHead.rotation.x,
          headPose.x + (expression === 'surprised' ? -0.1 : 0),
          5,
          delta,
        );
      }
      if (avatarChest && chestPose) {
        avatarChest.rotation.x = THREE.MathUtils.damp(
          avatarChest.rotation.x,
          chestPose.x + brakePulse * 0.08 - (scenario === 'speeding' ? 0.025 : 0),
          8,
          delta,
        );
      }
    }
  }
  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
