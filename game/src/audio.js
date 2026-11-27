// Sound: everything synthesised with WebAudio — engine hum, ring chimes,
// a landing fanfare and a crash thud. No audio files, no network.
export function createAudio() {
  let ctx = null, engineOsc = null, engineGain = null, noiseGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return;
    started = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter).connect(engineGain).connect(ctx.destination);
      engineOsc.start();
      // Wind noise: a looped noise buffer through a bandpass.
      const len = ctx.sampleRate * 1.5;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
      noiseGain = ctx.createGain();
      noiseGain.gain.value = 0;
      noise.connect(bp).connect(noiseGain).connect(ctx.destination);
      noise.start();
    } catch (e) {
      ctx = null;
    }
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  return {
    ensure,
    setMuted(m) { muted = m; if (engineGain) engineGain.gain.value = m ? 0 : 0.05; },
    // Called every frame while flying: engine pitch follows throttle, wind follows speed.
    update(throttle, speed, flying) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      engineOsc.frequency.setTargetAtTime(52 + throttle * 68, t, 0.1);
      engineGain.gain.setTargetAtTime(flying ? 0.045 + throttle * 0.05 : 0.0, t, 0.15);
      noiseGain.gain.setTargetAtTime(flying ? Math.min(0.06, speed * 0.0006) : 0, t, 0.2);
    },
    ring() { blip(880, 0.35, 'sine', 0.2); blip(1318, 0.4, 'sine', 0.16, 0.09); },
    land() {
      blip(523, 0.3, 'triangle', 0.2); blip(659, 0.3, 'triangle', 0.2, 0.12);
      blip(784, 0.5, 'triangle', 0.22, 0.24);
    },
    crash() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 0.5);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.65);
    },
    click() { blip(1200, 0.06, 'square', 0.06); },
  };
}
