// Procedural island terrain: heightmap, beach, harbour bay, runway plateau,
// water, trees, houses and a lighthouse — all from one fixed seed.
import * as THREE from 'three';
import { makeNoise, mulberry32 } from './rng.js';

export const SEA_LEVEL = 0.5;
export const RUNWAY = { x: 0, zMin: 180, zMax: 600, y: 8, halfWidth: 14 };
export const BAY = { x: -520, z: -320, r: 420 };

const noise2 = makeNoise(20261127);

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth(a, b, v) { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }

// The one height function: physics, terrain mesh and placement all agree on it.
export function terrainHeight(x, z) {
  const d = Math.sqrt(x * x + z * z);
  const island = Math.pow(clamp01(1 - (d / 1250) * (d / 1250)), 1.25);
  let h = 95 * island + noise2(x, z) * 58 * island;
  // Harbour bay: carve a bowl of sea into the south-west shore.
  const db = Math.sqrt((x - BAY.x) * (x - BAY.x) + (z - BAY.z) * (z - BAY.z));
  const carve = 1 - smooth(BAY.r * 0.55, BAY.r, db);
  h = h * (1 - carve) + (-7) * carve;
  // Runway plateau: flatten the coastal strip to one even height.
  const mx = Math.max(0, Math.abs(x - RUNWAY.x) - RUNWAY.halfWidth);
  const mz = Math.max(0, Math.max(RUNWAY.zMin - z, z - RUNWAY.zMax));
  const md = Math.sqrt(mx * mx + mz * mz);
  const flat = 1 - smooth(0, 55, md);
  h = h * (1 - flat) + RUNWAY.y * flat;
  return Math.max(h, -8);
}

export function buildTerrain(scene) {
  const group = new THREE.Group();
  const rand = mulberry32(777);

  // --- Island mesh with vertex colours: sand, grass, rock by height and slope.
  const SIZE = 2600, SEG = 128;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(0xd9c28a), grass = new THREE.Color(0x5d8a3c),
    deepGrass = new THREE.Color(0x3f6b2e), rock = new THREE.Color(0x8a7f74),
    cliff = new THREE.Color(0x6e6258);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const hx = terrainHeight(x + 6, z) - terrainHeight(x - 6, z);
    const hz = terrainHeight(x, z + 6) - terrainHeight(x, z - 6);
    const slope = Math.sqrt(hx * hx + hz * hz) / 12;
    if (h < 3.5) c.copy(sand);
    else if (slope > 0.85) c.copy(cliff);
    else if (h > 55) c.copy(rock).lerp(deepGrass, 0.35);
    else c.copy(grass).lerp(deepGrass, clamp01((h - 8) / 50));
    // subtle patchiness so the ground does not read flat
    const p = 0.92 + 0.16 * noise2(x * 2.7, z * 2.7);
    colors[i * 3] = c.r * p; colors[i * 3 + 1] = c.g * p; colors[i * 3 + 2] = c.b * p;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  group.add(ground);

  // --- Sea: one wide plane; its opacity breathes slowly in the main loop.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(5200, 5200),
    new THREE.MeshLambertMaterial({ color: 0x1d6f8e, transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = SEA_LEVEL;
  group.add(water);

  // --- Runway: dark strip, centre dashes, threshold bars, edge lights, windsock.
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.6, RUNWAY.zMax - RUNWAY.zMin),
    new THREE.MeshLambertMaterial({ color: 0x2c2f36 }));
  strip.position.set(RUNWAY.x, RUNWAY.y + 0.3, (RUNWAY.zMin + RUNWAY.zMax) / 2);
  group.add(strip);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2f2e8 });
  for (let z = RUNWAY.zMin + 30; z < RUNWAY.zMax - 20; z += 40) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 14), dashMat);
    dash.position.set(RUNWAY.x, RUNWAY.y + 0.7, z);
    group.add(dash);
  }
  for (const z of [RUNWAY.zMin + 8, RUNWAY.zMax - 8]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(22, 0.15, 4), dashMat);
    bar.position.set(RUNWAY.x, RUNWAY.y + 0.7, z);
    group.add(bar);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffc861 });
  for (let z = RUNWAY.zMin + 10; z <= RUNWAY.zMax - 10; z += 30) {
    for (const sx of [-15.5, 15.5]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.9, 6, 6), lightMat);
      l.position.set(RUNWAY.x + sx, RUNWAY.y + 1, z);
      group.add(l);
    }
  }
  const sockPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 12, 6),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
  sockPole.position.set(30, RUNWAY.y + 6, RUNWAY.zMin + 40);
  group.add(sockPole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 7, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8590c }));
  sock.rotation.z = Math.PI / 2;
  sock.position.set(34, RUNWAY.y + 11, RUNWAY.zMin + 40);
  group.add(sock);

  // --- Trees: cones on trunks, only on gentle grass away from the runway.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b2f });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x3a7d33 });
  let placed = 0, guard = 0;
  while (placed < 260 && guard++ < 4000) {
    const x = (rand() - 0.5) * 2200, z = (rand() - 0.5) * 2200;
    const h = terrainHeight(x, z);
    if (h < 7 || h > 62) continue;
    if (Math.abs(x - RUNWAY.x) < 45 && z > RUNWAY.zMin - 60 && z < RUNWAY.zMax + 60) continue;
    const s = 0.8 + rand() * 0.9;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.7 * s, 3 * s, 5), trunkMat);
    trunk.position.y = 1.5 * s;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2 * s, 8 * s, 7), rand() < 0.5 ? leafMat : leafMat2);
    cone.position.y = (3 + 4) * s;
    tree.add(trunk, cone);
    tree.position.set(x, h, z);
    group.add(tree);
    placed++;
  }

  // --- Harbour village: small houses with pitched roofs along the bay shore.
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xe8ddc4 });
  const wallMat2 = new THREE.MeshLambertMaterial({ color: 0xd8c2a0 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xa8442e });
  const roofMat2 = new THREE.MeshLambertMaterial({ color: 0x37557a });
  for (let i = 0; i < 22; i++) {
    const a = -2.4 + i * 0.13;
    const x = BAY.x + Math.cos(a) * (BAY.r * 0.92);
    const z = BAY.z + Math.sin(a) * (BAY.r * 0.92);
    const h = terrainHeight(x, z);
    if (h < 2 || h > 20) continue;
    const w = 7 + rand() * 5, d = 6 + rand() * 4, hh = 4 + rand() * 2;
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), rand() < 0.5 ? wallMat : wallMat2);
    walls.position.y = hh / 2;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 3, 4), rand() < 0.5 ? roofMat : roofMat2);
    roof.position.y = hh + 1.5;
    roof.rotation.y = Math.PI / 4;
    house.add(walls, roof);
    house.position.set(x, h, z);
    house.rotation.y = rand() * Math.PI;
    group.add(house);
  }

  // --- Lighthouse at the bay mouth, lamp glowing.
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 4.5, 26, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2ede2 }));
  tower.position.y = 13;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.7, 5, 10),
    new THREE.MeshLambertMaterial({ color: 0xc0392b }));
  band.position.y = 16;
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  lamp.position.y = 27.5;
  lh.add(tower, band, lamp);
  const lhGround = terrainHeight(BAY.x + BAY.r * 0.98, BAY.z + 60);
  lh.position.set(BAY.x + BAY.r * 0.98, Math.max(lhGround, 0), BAY.z + 60);
  group.add(lh);

  scene.add(group);
  return { group, water, lamp };
}
