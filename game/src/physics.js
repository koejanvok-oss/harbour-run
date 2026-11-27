// Flight model: a forgiving arcade sim with real trade-offs.
// Speed comes from the throttle; lift needs speed; banking turns the plane;
// climbing bleeds speed; the ground, the fuel gauge and the clock all argue back.
import * as THREE from 'three';
import { terrainHeight, RUNWAY } from './terrain.js';

export const MAX_SPEED = 92;      // m/s at full throttle, level
export const STALL_SPEED = 24;    // m/s: below this the wing gives up
export const CRUISE_CLIMB = 9;    // m/s of climb at cruise when pitched up

export function createFlight() {
  return {
    pos: new THREE.Vector3(0, RUNWAY.y + 2, 240),
    heading: 0,          // radians; 0 = +Z, along the runway
    pitch: 0,            // radians, nose up positive
    bank: 0,             // radians, right wing down positive
    speed: 0,
    throttle: 0,
    fuel: 100,
    damage: 0,
    verticalSpeed: 0,
    onGround: true,
    landed: false,
    crashed: false,
  };
}

export function resetFlight(f, mode) {
  f.heading = 0; f.pitch = 0; f.bank = 0; f.damage = 0;
  f.fuel = 100; f.verticalSpeed = 0; f.landed = false; f.crashed = false;
  if (mode === 'landing') {
    f.pos.set(0, RUNWAY.y + 2, 240);
    f.speed = 0; f.throttle = 0; f.onGround = true;
  } else {
    f.pos.set(-260, 130, 60);
    f.heading = Math.PI; f.speed = 55; f.throttle = 0.62; f.onGround = false;
  }
}

// One fixed step. Returns an event string: 'landed' | 'crashed' | 'fuel-out' | null.
export function stepFlight(f, input, dt) {
  if (f.crashed || f.landed) return null;

  // --- Throttle and brakes.
  const target = input.brake ? 0 : f.throttle;
  f.throttle += ((input.throttleTarget ?? f.throttle) - f.throttle) * Math.min(1, dt * 1.6);
  if (input.brake) f.throttle = Math.max(0, f.throttle - dt * 1.4);

  // --- Attitude: pitch and bank chase the pilot's input, damped.
  const pitchTarget = THREE.MathUtils.clamp(input.pitch, -0.42, 0.5);
  const bankTarget = THREE.MathUtils.clamp(input.bank, -1.05, 1.05);
  f.pitch += (pitchTarget - f.pitch) * Math.min(1, dt * 2.2);
  f.bank += (bankTarget - f.bank) * Math.min(1, dt * 2.6);

  // --- Speed: throttle pulls toward its top speed; drag grows with the square.
  const topSpeed = MAX_SPEED * (0.25 + 0.75 * f.throttle);
  const drag = 0.06 + 0.9 * (f.speed / MAX_SPEED) * (f.speed / MAX_SPEED);
  f.speed += ((topSpeed - f.speed) * 0.35 - drag * f.speed * 0.12) * dt;
  if (input.brake) f.speed = Math.max(0, f.speed - dt * 26);
  f.speed = Math.max(0, f.speed);

  // --- Lift: climbing costs speed, sinking gains a little; below stall the wing quits.
  const stalled = f.speed < STALL_SPEED && !f.onGround;
  const liftFactor = stalled ? 0.25 : 1;
  const climbRate = Math.sin(f.pitch) * f.speed * liftFactor
    - (stalled ? 9 : 0) - (f.onGround ? 0 : 0.4);
  f.verticalSpeed += (climbRate - f.verticalSpeed) * Math.min(1, dt * 2);

  // --- Turning: bank rolls the lift sideways into a heading change.
  // Banking right (right wing down) turns right: heading grows toward +X.
  const turnRate = Math.sin(f.bank) * (f.speed / 40) * 0.55 * (stalled ? 0.4 : 1);
  f.heading += turnRate * dt;

  // --- Move.
  const forward = new THREE.Vector3(Math.sin(f.heading), 0, Math.cos(f.heading));
  f.pos.addScaledVector(forward, f.speed * Math.cos(f.pitch) * dt);
  f.pos.y += f.verticalSpeed * dt;

  // --- Fuel: the throttle drinks; empty tanks mean a glider.
  if (!f.onGround) {
    f.fuel -= dt * (0.12 + f.throttle * 0.55);
    if (f.fuel <= 0) {
      f.fuel = 0;
      f.throttle = 0;
      if (f.speed < STALL_SPEED + 4) return 'fuel-out';
    }
  }

  // --- Takeoff: fast enough on the strip and the wheels leave the ground.
  if (f.onGround) {
    const ground = terrainHeight(f.pos.x, f.pos.z);
    f.pos.y = ground + 2;
    if (f.speed > 34 && f.pitch > 0.06) {
      f.onGround = false;
      f.verticalSpeed = 2;
    }
    // Rolling off the strip into the grass at speed is a crash.
    const offStrip = Math.abs(f.pos.x - RUNWAY.x) > RUNWAY.halfWidth + 6
      || f.pos.z < RUNWAY.zMin - 10 || f.pos.z > RUNWAY.zMax + 10;
    if (offStrip && f.speed > 22) {
      f.crashed = true;
      return 'crashed';
    }
    return null;
  }

  // --- Ground contact in the air.
  const ground = terrainHeight(f.pos.x, f.pos.z);
  if (f.pos.y <= ground + 1.6) {
    const onStrip = Math.abs(f.pos.x - RUNWAY.x) <= RUNWAY.halfWidth
      && f.pos.z >= RUNWAY.zMin && f.pos.z <= RUNWAY.zMax;
    const gentle = f.verticalSpeed > -6.5 && Math.abs(f.bank) < 0.28
      && Math.abs(f.pitch) < 0.22 && f.speed < 58;
    if (onStrip && gentle) {
      f.pos.y = RUNWAY.y + 2;
      f.onGround = true;
      f.landed = true;
      f.verticalSpeed = 0;
      f.pitch = 0; f.bank = 0;
      return 'landed';
    }
    if (onStrip && f.verticalSpeed > -11 && Math.abs(f.bank) < 0.4) {
      // A hard touchdown: it counts, but the airframe remembers it.
      f.damage += 30;
      f.pos.y = RUNWAY.y + 2;
      f.onGround = true;
      f.landed = true;
      f.verticalSpeed = 0;
      f.pitch = 0; f.bank = 0;
      return 'landed';
    }
    f.crashed = true;
    return 'crashed';
  }
  if (f.pos.y > 420) { f.pos.y = 420; f.verticalSpeed = Math.min(f.verticalSpeed, 0); }
  return null;
}

export function groundClearance(f) {
  return f.pos.y - terrainHeight(f.pos.x, f.pos.z);
}
