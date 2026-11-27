// The aircraft: a little bush plane built from primitives, with a spinning
// propeller, blinking navigation lights and landing gear that drops on approach.
import * as THREE from 'three';

export function buildAircraft() {
  const plane = new THREE.Group();
  const yellow = new THREE.MeshLambertMaterial({ color: 0xf2a81d });
  const cream = new THREE.MeshLambertMaterial({ color: 0xf6ead2 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1d3a4d });

  // Fuselage: a tapered body with a rounded nose and a cream belly stripe.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.55, 7.4, 12), yellow);
  body.rotation.x = Math.PI / 2;
  plane.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), yellow);
  nose.scale.set(1, 1, 1.15);
  nose.position.z = 3.7;
  plane.add(nose);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 0.6, 5.6, 12, 1, true, 0, Math.PI), cream);
  stripe.rotation.x = Math.PI / 2;
  stripe.rotation.z = Math.PI;
  stripe.position.y = -0.12;
  plane.add(stripe);

  // Canopy: dark glass bubble over the cockpit.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8), glass);
  canopy.scale.set(1, 0.72, 1.7);
  canopy.position.set(0, 0.85, 1.1);
  plane.add(canopy);

  // Main wings: one long slab with rounded tips, slight dihedral.
  const wingGeo = new THREE.BoxGeometry(13.5, 0.28, 2.3);
  const wing = new THREE.Mesh(wingGeo, cream);
  wing.position.set(0, 0.15, 0.6);
  plane.add(wing);
  const tipMat = new THREE.MeshLambertMaterial({ color: 0xd83a2e });
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 2.3), tipMat);
    tip.position.set(s * 6.5, 0.15, 0.6);
    plane.add(tip);
  }

  // Tail: horizontal stabiliser and a tall red fin.
  const stab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), cream);
  stab.position.set(0, 0.25, -3.4);
  plane.add(stab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.1, 1.7), tipMat);
  fin.position.set(0, 1.05, -3.4);
  plane.add(fin);

  // Propeller: hub + two blades, spun in the main loop.
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 10), dark);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x22242a });
  for (const s of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.4, 0.12), bladeMat);
    blade.position.y = s * 1.7;
    prop.add(blade);
  }
  prop.position.z = 4.55;
  plane.add(prop);

  // Landing gear: two fixed legs with wheels, plus a tail wheel.
  const gearMat = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), gearMat);
    leg.position.set(s * 1.1, -1.15, 1.4);
    leg.rotation.z = s * 0.35;
    plane.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 1.35, -1.8, 1.4);
    plane.add(wheel);
  }

  // Navigation lights: red left, green right, white tail — blinked by time.
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2e2e }));
  navL.position.set(-6.9, 0.15, 0.6);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x2eff5e }));
  navR.position.set(6.9, 0.15, 0.6);
  const navT = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  navT.position.set(0, 0.3, -3.75);
  plane.add(navL, navR, navT);

  return {
    group: plane,
    update(dt, throttle, time) {
      prop.rotation.z += dt * (4 + throttle * 46);
      const blink = Math.sin(time * 4) > 0;
      navL.visible = blink;
      navR.visible = blink;
      navT.visible = Math.sin(time * 2.4) > 0.2;
    },
  };
}
