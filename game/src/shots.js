// Screenshot staging: ?shot=cover|rings|harbour|landing puts the plane in a
// fixed, deterministic pose with a fixed seed, so the dossier screenshots are
// real renders of the game at its best moments — and restage exactly.
import { RUNWAY } from './terrain.js';

export function shotSetup() {
  const q = new URLSearchParams(window.location.search);
  return q.get('shot') || null;
}

// Places the flight state for a named shot. Returns a short label for the HUD.
export function applyShot(shot, flight, mission) {
  flight.damage = 0; flight.fuel = 92; flight.crashed = false; flight.landed = false;
  flight.onGround = false; flight.verticalSpeed = 0;
  if (shot === 'cover') {
    // Over the bay, looking north-west at ring 1: the ring reads as an open
    // ellipse (the course turns ~90 deg at ring 1, so a head-on approach
    // from ring 0 sees it edge-on as a bare bar). The bay bowl is carved
    // to sea level here, so the low pose is clear of terrain.
    flight.pos.set(-405, 125, -182);
    flight.heading = -3.04; flight.pitch = 0.02; flight.bank = -0.12;
    flight.speed = 62; flight.throttle = 0.68;
    mission.ringIndex = 1; mission.ringsPassed = 1;
    return 'Ring 2 of 5 — over the bay';
  }
  if (shot === 'rings') {
    // Face-on to ring 2 down its own axis (a ring faces the next ring, so
    // the face-on view comes from the far side of its normal): the ring
    // reads as a circle, close enough to read. Over the bay bowl throughout.
    flight.pos.set(-687, 95, -283);
    flight.heading = 0.64; flight.pitch = 0.03; flight.bank = 0.1;
    flight.speed = 58; flight.throttle = 0.62;
    mission.ringIndex = 1; mission.ringsPassed = 1;
    return 'Ring 2 of 5';
  }
  if (shot === 'harbour') {
    // Low over the water, village and lighthouse in frame.
    flight.pos.set(-700, 55, -420);
    flight.heading = 1.06; flight.pitch = 0.0; flight.bank = -0.2;
    flight.speed = 54; flight.throttle = 0.58;
    mission.ringIndex = 2; mission.ringsPassed = 2;
    return 'Ring 3 of 5 — low over the harbour';
  }
  if (shot === 'landing') {
    // Short final over the strip itself: the runway (x 0, z 180-600, y 8)
    // is a flat shelf cut into a hillside, so an approach from south of
    // the threshold flies into the hill — the old pose (6, 42, 60) crashed
    // before the screenshot. On the strip axis at 26 m the plane holds
    // clear of the ground through the settle and the strip fills the frame.
    flight.pos.set(0, 26, 240);
    flight.heading = 0.02; flight.pitch = -0.05; flight.bank = 0;
    flight.speed = 46; flight.throttle = 0.3;
    mission.ringIndex = 5; mission.ringsPassed = 5;
    return 'Final approach — land on the strip';
  }
  return '';
}
