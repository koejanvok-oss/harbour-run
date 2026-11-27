// Missions: three ways to fly the same island, each with its own goal.
// Rings hang over the bay and the coast; the runway waits at the end of all of them.
import * as THREE from 'three';
import { RUNWAY, BAY } from './terrain.js';

export const MISSIONS = {
  rings: {
    name: 'RING RUN',
    blurb: 'Thread all five rings over the bay.',
    airborne: true,
    rings: [
      { x: -260, y: 110, z: -120 },
      { x: -420, y: 95, z: -330 },
      { x: -610, y: 80, z: -180 },
      { x: -430, y: 120, z: 60 },
      { x: -180, y: 100, z: -60 },
    ],
    needsLanding: false,
    timeLimit: 0,
  },
  landing: {
    name: 'HARBOUR LANDING',
    blurb: 'Take off from the strip and put her down gently.',
    airborne: false,
    rings: [],
    needsLanding: true,
    timeLimit: 0,
  },
  circuit: {
    name: 'CIRCUIT DASH',
    blurb: 'Rings one to five, then land — against the clock, on one tank.',
    airborne: true,
    rings: [
      { x: -260, y: 110, z: -120 },
      { x: -420, y: 95, z: -330 },
      { x: -610, y: 80, z: -180 },
      { x: -430, y: 120, z: 60 },
      { x: -180, y: 100, z: -60 },
    ],
    needsLanding: true,
    timeLimit: 240,
  },
};

export function buildRings(scene, positions) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
  const matDone = new THREE.MeshBasicMaterial({ color: 0x37d67a });
  const meshes = positions.map((p) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(18, 1.4, 10, 40), mat.clone());
    ring.position.set(p.x, p.y, p.z);
    // Face each ring along the route: look at the next ring, or back at the island.
    const next = positions[(positions.indexOf(p) + 1) % positions.length];
    ring.lookAt(next.x, next.y, next.z);
    group.add(ring);
    // A small floating beacon above each ring so it reads from far away.
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    beacon.position.set(p.x, p.y + 26, p.z);
    group.add(beacon);
    return { mesh: ring, beacon, passed: false };
  });
  scene.add(group);
  return {
    group, meshes,
    markPassed(i) { meshes[i].passed = true; meshes[i].mesh.material = matDone; },
    reset() { for (const m of meshes) { m.passed = false; m.mesh.material = mat; } },
    dispose() { scene.remove(group); },
  };
}

export function createMissionState() {
  return {
    key: 'rings',
    def: MISSIONS.rings,
    ringIndex: 0,
    ringsPassed: 0,
    elapsed: 0,
    done: false,
    result: '',
  };
}

// Returns an event: 'ring' | 'complete' | 'timeout' | null.
export function stepMission(m, flight, dt) {
  if (m.done) return null;
  m.elapsed += dt;
  if (m.def.timeLimit > 0 && m.elapsed > m.def.timeLimit) {
    m.done = true;
    m.result = 'Out of time — the circuit beat you to the runway.';
    return 'timeout';
  }
  if (m.ringIndex < m.def.rings.length) {
    const r = m.def.rings[m.ringIndex];
    const dx = flight.pos.x - r.x, dy = flight.pos.y - r.y, dz = flight.pos.z - r.z;
    if (dx * dx + dy * dy + dz * dz < 17 * 17) {
      m.ringsPassed++;
      m.ringIndex++;
      if (m.ringIndex >= m.def.rings.length && !m.def.needsLanding) {
        m.done = true;
        m.result = `All five rings, ${m.elapsed.toFixed(1)} seconds. Clean flying.`;
        return 'complete';
      }
      return 'ring';
    }
  }
  if (m.def.needsLanding && flight.landed && m.ringIndex >= m.def.rings.length) {
    m.done = true;
    const dmg = flight.damage > 0 ? ` — airframe took ${flight.damage}% damage.` : ' — a greaser.';
    m.result = m.def.rings.length > 0
      ? `Circuit complete in ${m.elapsed.toFixed(1)} seconds.${dmg}`
      : `Down safe on the strip.${dmg}`;
    return 'complete';
  }
  return null;
}

export function nextRingTarget(m) {
  if (m.ringIndex < m.def.rings.length) return m.def.rings[m.ringIndex];
  if (m.def.needsLanding) return { x: RUNWAY.x, y: RUNWAY.y + 30, z: (RUNWAY.zMin + RUNWAY.zMax) / 2 };
  return null;
}

export { BAY };
