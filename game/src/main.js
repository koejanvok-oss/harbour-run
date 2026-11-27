// Harbour Run — boot, game loop, chase camera, screens and mission wiring.
import * as THREE from 'three';
import { buildTerrain, RUNWAY } from './terrain.js';
import { buildSky } from './sky.js';
import { buildAircraft } from './aircraft.js';
import { createFlight, resetFlight, stepFlight } from './physics.js';
import { createControls } from './controls.js';
import { MISSIONS, buildRings, createMissionState, stepMission, nextRingTarget } from './missions.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { shotSetup, applyShot } from './shots.js';

const app = document.getElementById('app');
const screen = document.getElementById('screen');
const titleHtml = screen.innerHTML;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 9000);
camera.position.set(0, 40, 200);

const sky = buildSky(scene);
const terrain = buildTerrain(scene);
const aircraft = buildAircraft();
scene.add(aircraft.group);

// Target arrow: a small cone floating above the plane, pointing at the next
// ring (or the runway), so the pilot always knows where the game is.
const arrow = new THREE.Group();
const arrowCone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 8),
  new THREE.MeshBasicMaterial({ color: 0xffd166 }));
arrowCone.rotation.x = Math.PI / 2;
const arrowRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.35, 8, 24),
  new THREE.MeshBasicMaterial({ color: 0xffd166 }));
arrow.add(arrowCone, arrowRing);
arrow.visible = false;
scene.add(arrow);

const flight = createFlight();
const mission = createMissionState();
const hud = createHud();
const audio = createAudio();
let rings = null;
let state = 'title'; // title | flying | paused | over
let endInfo = { big: '', sub: '' };
let shotMode = null;
let frameCount = 0;
let hudClock = 0;

const controls = createControls(
  (paused) => {
    if (state === 'flying' && paused) { state = 'paused'; showPaused(); }
    else if (state === 'paused' && !paused) { state = 'flying'; hideScreen(); }
  },
  (muted) => audio.setMuted(muted),
  () => { if (state !== 'title') startMission(mission.key); },
);

function showScreen(html) { screen.innerHTML = html; screen.classList.remove('hidden'); }
function hideScreen() { screen.classList.add('hidden'); }
function showTitle() { screen.innerHTML = titleHtml; screen.classList.remove('hidden'); bindMissionCards(); }
function showPaused() {
  showScreen(`<div class="big">PAUSED</div><div class="sub">Press P or click to keep flying.</div>`);
  screen.onclick = () => { controls.read(0); state = 'flying'; hideScreen(); };
}
function showEnd(big, sub) {
  state = 'over';
  showScreen(`<div class="big">${big}</div><div class="sub">${sub}</div>
    <div class="go" style="margin-top:18px">Press R to fly again, or pick a mission below.</div>
    <div class="missions" style="margin-top:18px">
      <div class="mission" data-mission="rings"><b>1 · RING RUN</b><span>Thread all five rings over the bay.</span></div>
      <div class="mission" data-mission="landing"><b>2 · HARBOUR LANDING</b><span>Take off and put her down gently.</span></div>
      <div class="mission" data-mission="circuit"><b>3 · CIRCUIT DASH</b><span>Rings, then land — against the clock.</span></div>
    </div>`);
  bindMissionCards();
}

function bindMissionCards() {
  screen.querySelectorAll('.mission').forEach((card) => {
    card.addEventListener('click', () => {
      audio.ensure(); audio.click();
      startMission(card.dataset.mission);
    });
  });
}

function startMission(key) {
  const def = MISSIONS[key];
  mission.key = key;
  mission.def = def;
  mission.ringIndex = 0;
  mission.ringsPassed = 0;
  mission.elapsed = 0;
  mission.done = false;
  mission.result = '';
  if (rings) rings.dispose();
  rings = def.rings.length > 0 ? buildRings(scene, def.rings) : null;
  resetFlight(flight, def.airborne ? 'air' : 'landing');
  controls.resetThrottle();
  state = 'flying';
  hideScreen();
  hud.show(['hud-top', 'hud-mission', 'hud-fuel', 'instruments']);
  hud.flash(def.blurb, 3.2);
  audio.ensure();
  frameCount = 0;
}

window.addEventListener('mission-pick', (e) => {
  if (state === 'title' || state === 'over') startMission(e.detail);
});
window.addEventListener('keydown', (e) => {
  if ((e.code === 'Enter' || e.code === 'Space') && state === 'title') {
    audio.ensure();
    startMission('rings');
  }
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateCamera(dt) {
  const forward = new THREE.Vector3(Math.sin(flight.heading), 0, Math.cos(flight.heading));
  const desired = flight.pos.clone()
    .addScaledVector(forward, -17)
    .add(new THREE.Vector3(0, 5.5, 0));
  // Keep the camera out of the hillside when the plane skims low ground.
  desired.y = Math.max(desired.y, 4);
  const k = 1 - Math.pow(0.0001, dt);
  camera.position.lerp(desired, k);
  const look = flight.pos.clone().addScaledVector(forward, 26).add(new THREE.Vector3(0, 1.5, 0));
  camera.up.set(0, 1, 0);
  camera.lookAt(look);
  camera.rotateZ(-flight.bank * 0.32);
}

function updateArrow() {
  const target = nextRingTarget(mission);
  if (!target || state !== 'flying') { arrow.visible = false; return; }
  arrow.visible = true;
  arrow.position.copy(flight.pos).add(new THREE.Vector3(0, 7, 0));
  const dx = target.x - flight.pos.x, dz = target.z - flight.pos.z;
  const bearing = Math.atan2(dx, dz);
  arrow.rotation.y = bearing;
  arrow.rotation.x = 0;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const s = dist > 300 ? 1.3 : 1;
  arrow.scale.setScalar(s);
}

function endFlight(kind) {
  if (kind === 'crashed') {
    audio.crash();
    showEnd('CRASHED', 'The island wins this one. The airframe is in the trees — press R and go again.');
  } else if (kind === 'complete') {
    audio.land();
    showEnd('MISSION COMPLETE', mission.result);
  } else if (kind === 'timeout') {
    showEnd('OUT OF TIME', mission.result);
  }
}

function tick() {
  requestAnimationFrame(tick);
  const dt = 1 / 60;
  frameCount++;
  const time = frameCount * dt;

  if (state === 'flying' && !controls.paused) {
    const input = controls.read(dt);
    // Gentle auto-throttle in shot mode so the scene holds its pose.
    if (shotMode) input.throttleTarget = flight.throttle;
    const ev = stepFlight(flight, input, dt);
    if (ev === 'landed') {
      audio.land();
      hud.flash('Down on the strip.', 2.4);
    } else if (ev === 'crashed') {
      endFlight('crashed');
    } else if (ev === 'fuel-out') {
      hud.flash('Fuel empty — glide her home.', 3.5);
    }
    const mev = stepMission(mission, flight, dt);
    if (mev === 'ring') {
      if (rings) rings.markPassed(mission.ringIndex - 1);
      audio.ring();
      hud.flash(mission.ringIndex < mission.def.rings.length
        ? `Ring ${mission.ringIndex} down — ${mission.def.rings.length - mission.ringIndex} to go.`
        : 'Last ring! Bring her home to the strip.', 2.4);
    } else if (mev === 'complete') {
      endFlight('complete');
    } else if (mev === 'timeout') {
      endFlight('timeout');
    }
    audio.update(flight.throttle, flight.speed, !flight.onGround);
  }

  // Pose the aircraft from the flight state, every frame, in every state.
  aircraft.group.position.copy(flight.pos);
  aircraft.group.rotation.set(-flight.pitch, flight.heading, -flight.bank, 'YXZ');
  aircraft.update(dt, flight.throttle, time);
  updateCamera(dt);
  updateArrow();
  sky.update(dt);
  terrain.water.material.opacity = 0.86 + Math.sin(time * 0.5) * 0.03;
  terrain.lamp.material.color.setHSL(0.12, 0.9, 0.6 + Math.sin(time * 2) * 0.15);

  hudClock += dt;
  if (hudClock > 0.1) {
    hud.update(flight, mission, hudClock);
    hudClock = 0;
  }

  renderer.render(scene, camera);

  // Screenshot staging: settle, then tell the screenshot driver we are ready.
  if (shotMode && frameCount === 75) window.__ready = true;
}

// --- Boot: title screen, or a staged shot straight into the air.
bindMissionCards();
shotMode = shotSetup();
if (shotMode) {
  const key = shotMode === 'landing' ? 'landing' : 'rings';
  startMission(key);
  const label = applyShot(shotMode, flight, mission);
  hud.flash(label, 30);
  state = 'flying';
} else {
  // Idle scene behind the title: the plane parked on the strip at dusk light.
  flight.pos.set(0, RUNWAY.y + 2, 240);
  flight.heading = 0.35;
  aircraft.group.position.copy(flight.pos);
  aircraft.group.rotation.set(0, flight.heading, 0, 'YXZ');
  camera.position.set(-26, 14, 200);
  camera.lookAt(0, 12, 300);
}

// Test handle: playtests drive the game through this.
window.__game = {
  flight, mission,
  get state() { return state; },
  startMission,
};
tick();
