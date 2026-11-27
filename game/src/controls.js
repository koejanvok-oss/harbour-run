// Input: keyboard throttle/bank/pitch, mouse steering, and the pause/mute keys.
// The game never reads the network and never stores anything.
export function createControls(onPause, onMute, onRestart) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, active: false, lastMove: 0 };
  let throttleTarget = 0;
  let paused = false;
  let muted = false;

  function key(e) { return e.code; }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    keys.add(key(e));
    if (e.code === 'KeyP') { paused = !paused; onPause(paused); }
    if (e.code === 'KeyM') { muted = !muted; onMute(muted); }
    if (e.code === 'KeyR') onRestart();
    if (e.code === 'Digit1') window.dispatchEvent(new CustomEvent('mission-pick', { detail: 'rings' }));
    if (e.code === 'Digit2') window.dispatchEvent(new CustomEvent('mission-pick', { detail: 'landing' }));
    if (e.code === 'Digit3') window.dispatchEvent(new CustomEvent('mission-pick', { detail: 'circuit' }));
  });
  window.addEventListener('keyup', (e) => keys.delete(key(e)));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    mouse.active = true;
    mouse.lastMove = performance.now();
  });
  window.addEventListener('mousedown', (e) => {
    if (e.target && e.target.closest && e.target.closest('.mission')) return;
    mouse.active = true;
  });

  return {
    get paused() { return paused; },
    get muted() { return muted; },
    // Normalised pilot input for one frame: pitch/bank in radians, throttle 0..1.
    read(dt) {
      // Throttle: W raises the target, S lowers it; it stays where left.
      if (keys.has('KeyW')) throttleTarget = Math.min(1, throttleTarget + dt * 0.7);
      if (keys.has('KeyS')) throttleTarget = Math.max(0, throttleTarget - dt * 0.9);
      let bank = 0, pitch = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) bank -= 0.85;
      if (keys.has('KeyD') || keys.has('ArrowRight')) bank += 0.85;
      if (keys.has('ArrowUp') || keys.has('KeyI')) pitch += 0.4;
      if (keys.has('ArrowDown') || keys.has('KeyK')) pitch -= 0.34;
      // Mouse: hold the pointer off-centre to steer; it fades out after 2.5 s idle.
      const mouseFresh = mouse.active && (performance.now() - mouse.lastMove < 2500);
      if (mouseFresh) {
        bank += mouse.x * 0.55;
        pitch -= mouse.y * 0.22;
      }
      return {
        pitch: Math.max(-0.42, Math.min(0.5, pitch)),
        bank: Math.max(-1.05, Math.min(1.05, bank)),
        throttleTarget,
        brake: keys.has('Space'),
      };
    },
    resetThrottle() { throttleTarget = 0; },
  };
}
