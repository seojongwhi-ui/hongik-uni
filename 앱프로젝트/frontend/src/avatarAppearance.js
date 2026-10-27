import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

function smoothSurface(part, material) {
  const source = part.geometry.clone();
  source.deleteAttribute('normal');
  const geometry = mergeVertices(source, 0.00001);
  source.dispose();
  geometry.computeVertexNormals();
  part.geometry = geometry;
  part.material = material ?? part.material.clone();
  part.material.flatShading = false;
  part.material.needsUpdate = true;
}

function softenHair(head) {
  const pieces = head.children.filter((part) => part.isMesh && /Hair/.test(part.name));
  const lobes = pieces.map((part) => {
    part.geometry.computeBoundingBox();
    const bounds = part.geometry.boundingBox;
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    if (part.name.startsWith('HairBang')) {
      radius.z *= 0.83;
      radius.y *= 0.88;
      center.y += 0.08;
      center.z -= 0.025;
    }
    if (part.name.startsWith('HairTuft')) {
      radius.y *= 0.7;
      center.y -= 0.035;
    }
    return { center, radius, distanceScale: Math.min(radius.x, radius.y, radius.z) };
  });
  const material = new THREE.MeshStandardMaterial({ color: 0x73574e, roughness: 0.82 });
  const resolution = 64;
  const surface = new MarchingCubes(resolution, material, false, false, 30000);
  surface.isolation = 0;
  const center = new THREE.Vector3(0, 0.57, 0);
  const extent = new THREE.Vector3(0.75, 0.72, 0.72);
  // Blend the original hair volumes into one surface, only once when loading.
  for (let z = 0; z < resolution; z++) {
    const pz = (2 * z / resolution - 1) * extent.z + center.z;
    for (let y = 0; y < resolution; y++) {
      const py = (2 * y / resolution - 1) * extent.y + center.y;
      for (let x = 0; x < resolution; x++) {
        const px = (2 * x / resolution - 1) * extent.x + center.x;
        let distance = 10;
        for (const lobe of lobes) {
          const dx = (px - lobe.center.x) / lobe.radius.x;
          const dy = (py - lobe.center.y) / lobe.radius.y;
          const dz = (pz - lobe.center.z) / lobe.radius.z;
          const next = (Math.sqrt(dx * dx + dy * dy + dz * dz) - 1) * lobe.distanceScale;
          const blend = Math.max(0, 0.055 - Math.abs(distance - next)) / 0.055;
          distance = Math.min(distance, next) - blend * blend * 0.055 * 0.25;
        }
        surface.field[x + y * resolution + z * resolution * resolution] = -distance;
      }
    }
  }
  surface.update();
  const geometry = new THREE.BufferGeometry();
  for (const name of ['position', 'normal']) {
    const attribute = surface.geometry.getAttribute(name);
    geometry.setAttribute(name, new THREE.BufferAttribute(attribute.array.slice(0, surface.count * 3), 3));
  }
  geometry.scale(extent.x, extent.y, extent.z);
  geometry.translate(center.x, center.y, center.z);
  geometry.normalizeNormals();
  geometry.computeBoundingSphere();
  surface.geometry.dispose();
  const hair = new THREE.Mesh(geometry, material);
  hair.name = 'SoftHair';
  head.add(hair);
  for (const piece of pieces) piece.visible = false;
}

function softenSleeve(avatar, side, material) {
  const pivot = avatar.getObjectByName(`${side}ArmPivot`);
  const direction = side === 'Left' ? 1 : -1;
  const points = [[0.19, 0.025, -0.055], [0.015, 0.01, -0.015], [-0.08, -0.16, 0.075],
    [-0.145, -0.345, 0.215], [-0.055, -0.39, 0.345], [0.106, -0.38, 0.47]];
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x * direction, y, z)));
  const segments = 40;
  const radialSegments = 20;
  const geometry = new THREE.TubeGeometry(curve, segments, 1, radialSegments, false);
  const position = geometry.getAttribute('position');
  const vertex = new THREE.Vector3();
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments;
    const center = curve.getPointAt(t);
    const shoulder = THREE.MathUtils.lerp(0.10, 0.185, THREE.MathUtils.smoothstep(t, 0, 0.2));
    const radius = THREE.MathUtils.lerp(shoulder, 0.115, THREE.MathUtils.smoothstep(t, 0.2, 1));
    for (let edge = 0; edge <= radialSegments; edge++) {
      const index = ring * (radialSegments + 1) + edge;
      vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(radius).add(center);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  geometry.computeVertexNormals();
  const sleeve = new THREE.Mesh(geometry, material);
  sleeve.name = `${side}SoftSleeve`;
  pivot.add(sleeve);
  for (const name of ['UpperSleeve', 'Elbow', 'LowerSleeve']) avatar.getObjectByName(`${side}${name}`).visible = false;

  const cuff = avatar.getObjectByName(`${side}Cuff`);
  cuff.geometry.dispose();
  cuff.geometry = new THREE.CylinderGeometry(0.111, 0.12, 0.075, 24);
  cuff.position.copy(curve.getPointAt(1));
  cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(1));

  // Flatten the palm over the sloping thigh and join its heel to the cuff.
  const hand = avatar.getObjectByName(`${side}Hand`);
  hand.geometry = new THREE.SphereGeometry(1, 32, 20);
  hand.scale.set(0.105, 0.057, 0.14);
  hand.position.set(0.12 * direction, -0.40, 0.595);
  hand.rotation.x = 0.20;
  hand.material = hand.material.clone();
  hand.material.flatShading = false;
  hand.material.needsUpdate = true;

  const thumb = avatar.getObjectByName(`${side}Thumb`);
  thumb.geometry = new THREE.SphereGeometry(1, 24, 16);
  thumb.scale.set(0.042, 0.039, 0.075);
  thumb.position.set(0.205 * direction, -0.41, 0.55);
  thumb.rotation.x = 0.20;
  thumb.material = hand.material;
}

function fitNeck(avatar) {
  const head = avatar.getObjectByName('HeadPivot');
  head.position.y += 0.32;
  const neck = avatar.getObjectByName('Neck');
  neck.geometry = new THREE.CapsuleGeometry(0.12, 0.18, 10, 24);
  neck.position.set(0, 1.82, 0.02);
  neck.material = neck.material.clone();
  neck.material.flatShading = false;
  neck.material.needsUpdate = true;
}

export function polishAvatar(avatar) {
  softenHair(avatar.getObjectByName('HeadPivot'));
  fitNeck(avatar);
  const fabric = new THREE.MeshStandardMaterial({ color: 0x79b9a8, roughness: 0.96 });
  const ribbing = new THREE.MeshStandardMaterial({ color: 0x68a593, roughness: 1 });
  const surfaces = ['Torso', 'HoodBack', 'BellySoft', 'KangarooPocket', 'PocketUpperSeam', 'CollarDark',
    'LeftCuff', 'RightCuff', 'LeftHoodString', 'RightHoodString', 'LeftCordTip', 'RightCordTip'];
  for (const name of surfaces) {
    const part = avatar.getObjectByName(name);
    const material = /HoodString|CordTip/.test(name) ? undefined
      : /Cuff|Seam|Collar/.test(name) ? ribbing : fabric;
    smoothSurface(part, material);
  }
  const collar = avatar.getObjectByName('CollarDark');
  collar.geometry.dispose();
  collar.geometry = new THREE.TorusGeometry(0.153, 0.024, 12, 48);
  collar.position.set(0, 1.73, 0.02);
  collar.rotation.x = Math.PI / 2;
  const seam = avatar.getObjectByName('PocketUpperSeam');
  seam.geometry.translate(0, -1.2, -0.2655);
  seam.geometry.scale(1, 0.4, 0.65);
  seam.geometry.translate(0, 1.2, 0.25);
  for (const side of ['Left', 'Right']) softenSleeve(avatar, side, fabric);
}
