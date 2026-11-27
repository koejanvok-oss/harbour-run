// Sky: gradient dome, sun, drifting clouds, and the scene lights.
// One consistent late-afternoon palette with the terrain and the HUD.
import * as THREE from 'three';
import { mulberry32 } from './rng.js';

export function buildSky(scene) {
  // Gradient dome: pale horizon warming to deep blue overhead.
  const geo = new THREE.SphereGeometry(4200, 24, 16);
  const top = new THREE.Color(0x2f6fb2), mid = new THREE.Color(0x9cc8e8),
    low = new THREE.Color(0xf6d9a0);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 4200;
    if (y > 0.25) c.copy(mid).lerp(top, Math.min(1, (y - 0.25) / 0.6));
    else c.copy(low).lerp(mid, Math.max(0, (y + 0.08) / 0.33));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false }));
  scene.add(dome);

  // Low sun, warm and large.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(150, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe6a3, fog: false }));
  sun.position.set(-2600, 620, -2600);
  sun.lookAt(0, 0, 0);
  scene.add(sun);

  // Puffy clouds: clusters of flattened white spheres, drifting slowly.
  const rand = mulberry32(4242);
  const clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 14; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = 26 + rand() * 42;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), cloudMat);
      puff.position.set((rand() - 0.5) * 130, (rand() - 0.5) * 14, (rand() - 0.5) * 60);
      puff.scale.y = 0.42;
      cloud.add(puff);
    }
    cloud.position.set((rand() - 0.5) * 3400, 320 + rand() * 220, (rand() - 0.5) * 3400);
    scene.add(cloud);
    clouds.push({ group: cloud, speed: 2 + rand() * 3 });
  }

  // Warm key light from the sun's side, cool ambient fill.
  const sunLight = new THREE.DirectionalLight(0xffe3b3, 1.9);
  sunLight.position.set(-900, 500, -700);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0xbcd8ee, 0.85));
  const hemi = new THREE.HemisphereLight(0x9cc8e8, 0x4a6b3a, 0.5);
  scene.add(hemi);

  scene.fog = new THREE.Fog(0xc3d9e8, 900, 3600);
  return {
    update(dt) {
      for (const cl of clouds) {
        cl.group.position.x += cl.speed * dt;
        if (cl.group.position.x > 1900) cl.group.position.x = -1900;
      }
    },
  };
}
