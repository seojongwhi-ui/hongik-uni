import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadCuteAvatar } from './CuteAvatarController.js';
import { CarFront, Gauge, OctagonAlert, Play, Route, createIcons } from 'lucide';
import { setupSpeedometer } from './speedometer.js';
import { reactionForUtterance } from './speechReactions.js';
import { setupSpeechRecognition } from './speechRecognition.js';
import { gazeCueAt } from './presenceMotion.js';
import './style.css';

createIcons({ icons: { CarFront, Gauge, OctagonAlert, Play, Route } });

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
const seatMat = mat(0x505454);
const seatSide = mat(0x2d3233);
const seatSeam = mat(0x666c69);
const cabin = mat(0x636a69);
const trim = mat(0x252b2c);
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
const sideGlass = new THREE.MeshBasicMaterial({ color: 0xb8c9ca, side: THREE.DoubleSide });
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

const ceiling = box(world, roofLiner, [cabinCenterX, 3.87, 2.5], [14, 0.68, 20]);
ceiling.castShadow = false;
box(world, trim, [0, -1.6, 1.15], [14, 0.34, 1.55]);
box(world, cabin, [0, -1.83, 1.25], [14, 0.28, 1.45]);
box(world, mat(0x454d4c), [0, -1.28, -2.2], [14, 0.35, 2.5]);

for (const side of [-1, 1]) {
  const door = new THREE.Group();
  door.name = side < 0 ? 'closed-passenger-door' : 'closed-driver-door';
  door.position.x = cabinCenterX + side * 2.65;
  door.rotation.y = Math.PI / 2;
  world.add(door);
  const inside = -side;
  box(door, sidePanel, [-0.575, 0.22, 0], [8.85, 2.56, 0.18]);
  box(door, sideInset, [-0.575, 0.64, inside * 0.105], [8.55, 1.18, 0.055]);
  panel(door, sideGlass, [[-4.91, 1.53], [3.76, 1.53], [3.76, 3.48], [-4.67, 3.48]], 0);
  for (const [from, to] of [
    [[-4.95, 1.5, 0], [3.85, 1.5, 0]],
    [[-4.69, 3.5, 0], [3.85, 3.5, 0]],
    [[-4.95, 1.5, 0], [-4.69, 3.5, 0]],
    [[3.85, 1.5, 0], [3.85, 3.5, 0]],
    [[1.65, 1.5, 0], [1.65, 3.5, 0]],
  ]) strap(door, windowFrame, from, to, 0.12, 0.21);
  box(door, trim, [0.1, 1.02, inside * 0.2], [1.8, 0.15, 0.38]);
  box(door, sidePanel, [-0.22, 1.3, inside * 0.145], [0.64, 0.17, 0.055]);
  box(door, doorHandle, [-0.22, 1.3, inside * 0.19], [0.4, 0.055, 0.055]);
  box(door, trim, [1.65, 0.22, inside * 0.14], [0.026, 2.44, 0.015]);
}
strap(world, pillarTrim, [-1.19, 3.55, -3.48], [5.71, 3.55, -3.48], 0.16, 0.3);

box(world, seatSide, [cabinCenterX, 0.05, -0.19], [0.7, 0.46, 1.56]);
ellipsoid(world, seatMat, [cabinCenterX, 0.33, -0.24], [0.35, 0.13, 0.61]);

// The foreground dashboard gives the mounted display its front-cabin point of view.
box(world, dashboardFront, [cabinCenterX, -4.11, 1.55], [12.4, 10, 0.48]);
box(world, dashboardTop, [cabinCenterX, 0.93, 1.48], [12.2, 0.16, 0.72]);
box(world, dashboardFront, [cabinCenterX, 0.6, 1.82], [0.92, 0.5, 0.58]);
box(world, dashboardTop, [cabinCenterX, 1.03, 1.78], [1.02, 0.12, 0.7]);

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
const passengerDisplayX = 1.18;
passenger.position.x = passengerDisplayX;
world.add(passenger);
makeFrontSeat(passenger, 0, true);

let avatarController = null;
let updateAvatarBelt = null;
let lastDisplayedSpeed = 0;

function attachAvatarBelt(avatar) {
  const bodyRoot = avatar.getObjectByName('AvatarRoot') || avatar;
  const webbing = mat(0x242a29, 0.94);
  webbing.side = THREE.DoubleSide;
  const count = 40;
  const vertices = new Float32Array((count + 1) * 2 * 3);
  const indices = [];
  for (let index = 0; index < count; index++) {
    const base = index * 2;
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  const ribbon = mesh(geometry, webbing, passenger);
  ribbon.castShadow = false;
  box(passenger, trim, [-0.65, 1.99, -0.24], [0.12, 0.24, 0.12]);
  box(passenger, mat(0x9a4544), [0.6, 0.58, 0.3], [0.14, 0.14, 0.18]);

  const torsoPoints = [
    [-0.38, 1.76, 0.18], [-0.25, 1.47, 0.24],
    [0.04, 1.18, 0.28], [0.3, 0.91, 0.28],
  ];
  return () => {
    passenger.updateWorldMatrix(true, false);
    bodyRoot.updateWorldMatrix(true, false);
    const points = [new THREE.Vector3(-0.65, 1.99, -0.24)];
    for (const coordinates of torsoPoints) {
      points.push(passenger.worldToLocal(bodyRoot.localToWorld(new THREE.Vector3(...coordinates))));
    }
    points.push(new THREE.Vector3(0.6, 0.58, 0.3));
    const curve = new THREE.CatmullRomCurve3(points);
    for (let index = 0; index <= count; index++) {
      const point = curve.getPoint(index / count);
      const tangent = curve.getTangent(index / count);
      const across = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize().multiplyScalar(0.043);
      const offset = index * 6;
      vertices.set([point.x - across.x, point.y - across.y, point.z - across.z,
        point.x + across.x, point.y + across.y, point.z + across.z], offset);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  };
}

const passengerPane = document.getElementById('passenger-pane');
const passengerState = document.getElementById('passenger-state-text');
const query = new URLSearchParams(window.location.search);
const enhancedReactions = query.get('reaction') !== 'subtle';
// In the front-facing cabin view, the real driver's side is the right edge.
const driverGazeDirection = query.get('driver') === 'left' ? -1 : 1;
const dangerFlash = document.getElementById('danger-flash');
const driveButton = document.getElementById('simulate-drive');
const driveButtonText = document.getElementById('simulate-drive-text');
const simulationBanner = document.getElementById('simulation-banner');
const simulationEvent = document.getElementById('simulation-event');
const simulationStep = document.getElementById('simulation-step');
const simulationProgress = document.getElementById('simulation-progress-value');
let expression = 'neutral';
let expressionExpiresAt = Infinity;
let scenario = 'none';
let scenarioExpiresAt = 0;
let liveSpeeding = false;
let vehicleMoving = null;
let departureStartedAt = -Infinity;
let driveSimulationStartedAt = -Infinity;
let driveSimulationFrame = null;
let driveSimulationStep = -1;
let dangerFlashTimer = null;
let speakingTimer = null;
let greetingTimer = null;
let greetingPlayed = false;
let greetingActive = false;
let sessionActive = false;
const GREETING_TEXT = '안녕, 오늘도 같이 가자.';
const PROTOTYPE_SPEED_THRESHOLD_KMH = 50;
const DEPARTURE_START_KMH = 3;
const DEPARTURE_STOP_KMH = 1;
const DEPARTURE_EFFECT_MS = 1300;
const DRIVE_SIMULATION_DURATION_MS = 25000;
const DRIVE_SEQUENCE = [
  { at: 0, speed: 0, event: '출발 준비', expression: 'attentive', motion: 'departure' },
  { at: 900, speed: 24, event: '출발 및 도심 진입', expression: 'neutral' },
  { at: 3500, speed: 38, event: '운전자 욕설 감지', expression: 'concerned', scenario: 'profanity' },
  { at: 6500, speed: 43, event: '안정 주행', expression: 'warm' },
  { at: 9000, speed: 58, event: '제한속도 초과', expression: 'concerned', scenario: 'speeding' },
  { at: 12500, speed: 44, event: '전방 주시 이탈', expression: 'attentive', scenario: 'distraction' },
  { at: 15500, speed: 41, event: '옆 차량 끼어들기', expression: 'surprised', scenario: 'swerving' },
  { at: 18000, speed: 7, event: '돌발 상황 · 급정거', expression: 'surprised', scenario: 'braking' },
  { at: 21500, speed: 30, event: '상황 회복 및 재출발', expression: 'warm', motion: 'departure' },
  { at: 24000, speed: 0, event: '주행 종료', expression: 'neutral' },
];

function triggerDangerFlash() {
  if (!enhancedReactions) return;
  clearTimeout(dangerFlashTimer);
  dangerFlash.classList.remove('is-active');
  void dangerFlash.offsetWidth;
  dangerFlash.classList.add('is-active');
  dangerFlashTimer = setTimeout(() => dangerFlash.classList.remove('is-active'), 1250);
}

function clearDangerFlash() {
  clearTimeout(dangerFlashTimer);
  dangerFlash.classList.remove('is-active');
}

function setExpression(next) {
  expression = next;
  avatarController?.setEmotion(next === 'warm' ? 'happy' : next === 'neutral' ? 'calm' : next);
  passengerPane.dataset.expression = next;
  if (next !== 'surprised' && scenario !== 'braking' && scenario !== 'swerving') clearDangerFlash();
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
  avatarController?.react('departure');
}

function updateLiveSpeed(displayedSpeed) {
  lastDisplayedSpeed = displayedSpeed ?? 0;
  avatarController?.setSpeed(lastDisplayedSpeed);
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

function simulateScenario(next, duration = 4500, label = null) {
  scenario = next;
  scenarioExpiresAt = performance.now() + duration;
  passengerPane.dataset.scenario = next;
  const reaction = next === 'speeding' || next === 'profanity' ? 'concerned'
    : next === 'distraction' ? 'attentive' : 'surprised';
  setExpression(reaction);
  if (next === 'braking' || next === 'swerving') {
    avatarController?.react('brake');
    triggerDangerFlash();
  }
  passengerState.textContent = label ?? (next === 'speeding' ? '과속 시뮬레이션' : '급정거 시뮬레이션');
}

function applyDriveStep(step, index) {
  driveSimulationStep = index;
  speedometer.setSimulatedSpeed(step.speed);
  if (step.motion === 'departure') triggerDepartureJolt();
  scenario = step.scenario ?? 'none';
  scenarioExpiresAt = Infinity;
  passengerPane.dataset.scenario = scenario;
  setExpression(step.expression);
  if (step.scenario === 'braking' || step.scenario === 'swerving') {
    avatarController?.react('brake');
    triggerDangerFlash();
  }
  expressionExpiresAt = Infinity;
  passengerState.textContent = step.event;
  simulationEvent.textContent = step.event;
  simulationStep.textContent = `${index + 1} / ${DRIVE_SEQUENCE.length}`;
}

function finishDriveSimulation(cancelled = false) {
  if (driveSimulationFrame !== null) cancelAnimationFrame(driveSimulationFrame);
  driveSimulationFrame = null;
  driveSimulationStartedAt = -Infinity;
  driveSimulationStep = -1;
  driveButton.setAttribute('aria-pressed', 'false');
  driveButtonText.textContent = '자동 주행';
  passengerPane.dataset.autoSimulation = 'false';
  simulationBanner.hidden = true;
  scenario = 'none';
  passengerPane.dataset.scenario = 'none';
  speedometer.clearSimulatedSpeed();
  setExpression('neutral');
  passengerState.textContent = cancelled ? '시뮬레이션 중지' : '주행 완료';
}

function updateDriveSimulation(now) {
  const elapsed = now - driveSimulationStartedAt;
  const nextIndex = DRIVE_SEQUENCE.findLastIndex((step) => elapsed >= step.at);
  if (nextIndex !== driveSimulationStep && nextIndex >= 0) applyDriveStep(DRIVE_SEQUENCE[nextIndex], nextIndex);
  simulationProgress.style.width = `${Math.min(100, elapsed / DRIVE_SIMULATION_DURATION_MS * 100)}%`;
  if (elapsed >= DRIVE_SIMULATION_DURATION_MS) {
    finishDriveSimulation(false);
    return;
  }
  driveSimulationFrame = requestAnimationFrame(updateDriveSimulation);
}

function startDriveSimulation() {
  if (driveSimulationFrame !== null) {
    finishDriveSimulation(true);
    return;
  }
  driveSimulationStartedAt = performance.now();
  driveButton.setAttribute('aria-pressed', 'true');
  driveButtonText.textContent = '주행 중지';
  passengerPane.dataset.autoSimulation = 'true';
  simulationBanner.hidden = false;
  simulationProgress.style.width = '0%';
  applyDriveStep(DRIVE_SEQUENCE[0], 0);
  driveSimulationFrame = requestAnimationFrame(updateDriveSimulation);
}

function stopAutoBeforeManual() {
  if (driveSimulationFrame !== null) finishDriveSimulation(true);
}

driveButton.addEventListener('click', startDriveSimulation);
document.getElementById('simulate-departure').addEventListener('click', () => {
  stopAutoBeforeManual();
  triggerDepartureJolt();
});
document.getElementById('simulate-speeding').addEventListener('click', () => {
  stopAutoBeforeManual();
  simulateScenario('speeding');
});
document.getElementById('simulate-braking').addEventListener('click', () => {
  stopAutoBeforeManual();
  simulateScenario('braking');
});

setExpression('neutral');
const speechRecognition = setupSpeechRecognition({
  onUtterance: (transcript) => {
    avatarController?.setSpeaking(true);
    clearTimeout(speakingTimer);
    speakingTimer = setTimeout(() => avatarController?.setSpeaking(false), 700);
    if (scenario === 'none' && !liveSpeeding) {
      const reaction = reactionForUtterance(transcript);
      setExpression(reaction);
      if (reaction === 'surprised') triggerDangerFlash();
    }
  },
  onStop: () => {
    clearTimeout(speakingTimer);
    avatarController?.setSpeaking(false);
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
  sessionActive = true;
  sessionButton.hidden = true;
  speedometer.start();
  if (!greetingPlayed) {
    greetingPlayed = true;
    greetPassenger();
  } else if (!greetingActive) speechRecognition.start();
}

function finishGreeting() {
  if (!greetingActive) return;
  greetingActive = false;
  clearTimeout(greetingTimer);
  avatarController?.setSpeaking(false);
  if (passengerState.textContent === GREETING_TEXT && scenario === 'none' && !liveSpeeding) {
    setExpression('neutral');
  }
  if (sessionActive && !document.hidden) speechRecognition.start();
}

function greetPassenger() {
  greetingActive = true;
  setExpression('warm');
  passengerState.textContent = GREETING_TEXT;
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    greetingTimer = setTimeout(finishGreeting, 2800);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(GREETING_TEXT);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.95;
  utterance.onstart = () => avatarController?.setSpeaking(true);
  utterance.onend = finishGreeting;
  utterance.onerror = finishGreeting;
  greetingTimer = setTimeout(() => {
    window.speechSynthesis.cancel();
    finishGreeting();
  }, 6000);
  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    finishGreeting();
  }
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
  sessionActive = false;
  if (greetingActive) {
    window.speechSynthesis?.cancel();
    finishGreeting();
  }
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
leftLight.shadow.mapSize.set(2048, 2048);
leftLight.shadow.normalBias = 0.025;
leftLight.shadow.bias = -0.0001;
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
  camera.fov = ratio < 1 ? 49 : ratio < 1.35 ? 43 : 39;
  const targetX = narrowPortrait ? 1.35 : 1.5;
  const cameraX = narrowPortrait ? 2.18 : 2.45;
  const distance = ratio < 0.75 ? 6.6 : ratio < 1 ? 5.8 : ratio < 1.35 ? 5.2 : 4.9;
  camera.position.set(cameraX, 2.32, distance);
  controls.target.set(targetX, 1.52, 0);
  camera.aspect = ratio;
  camera.updateProjectionMatrix();
  controls.update();
  renderer.setSize(width, height);
}

new ResizeObserver(resize).observe(host);
resize();

const clock = new THREE.Clock();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const presenceStartedAt = performance.now();
let lastTime = 0;

loadCuteAvatar(passenger, {
  position: [0, -0.21, -0.05], polish: query.get('appearance') !== 'original',
}).then((controller) => {
  avatarController = controller;
  controller.setReactionIntensity(enhancedReactions ? 1 : 0.45);
  controller.setSpeed(lastDisplayedSpeed);
  controller.setEmotion(expression === 'warm' ? 'happy' : expression === 'neutral' ? 'calm' : expression);
  updateAvatarBelt = attachAvatarBelt(controller.avatar);
  passengerPane.dataset.model = 'ready';
}).catch((error) => {
  passengerPane.dataset.model = 'error';
  console.error('Failed to load passenger avatar', error);
});

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

  const presenceElapsed = now - presenceStartedAt;
  const gazeCue = gazeCueAt(presenceElapsed);
  const reactionAttention = expression === 'concerned' || expression === 'surprised'
    || expression === 'attentive';
  const eyeAttention = reactionAttention ? 1 : gazeCue.eyeAttention;
  const headAttention = reactionAttention ? 1 : gazeCue.headAttention;
  avatarController?.setGaze(eyeAttention, headAttention, driverGazeDirection);
  avatarController?.update(delta, { elapsedMs: presenceElapsed, reducedMotion: reducedMotion.matches });

  if (!reducedMotion.matches) {
    const departureWave = departureActive ? Math.sin(departureAge * 25) * Math.exp(-departureAge * 3.2) : 0;
    world.position.y = THREE.MathUtils.damp(world.position.y, departureWave * 0.065, 18, delta);
    world.rotation.z = THREE.MathUtils.damp(world.rotation.z, departureWave * 0.0045, 18, delta);
  }
  updateAvatarBelt?.();
  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
