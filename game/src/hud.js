// HUD: the numbers, the mission line, the fuel gauge and the lit instruments.
// The gauges are small canvases drawn by hand — an artificial horizon, an
// airspeed dial and an altimeter — so the panel looks flown, not pasted on.
export function createHud() {
  const el = (id) => document.getElementById(id);
  const alt = el('hud-alt'), spd = el('hud-spd'), hdg = el('hud-hdg'), vs = el('hud-vs');
  const mname = el('hud-mname'), mprog = el('hud-mprog'), msg = el('hud-msg');
  const fuelTxt = el('hud-fuel-txt'), fuelBar = el('hud-fuel-bar');
  const thrFill = el('thr-fill');
  const horizon = el('gauge-horizon').getContext('2d');
  const speedG = el('gauge-speed').getContext('2d');
  const altG = el('gauge-alt').getContext('2d');
  let msgTimer = 0;

  function show(ids) {
    for (const id of ['hud-top', 'hud-mission', 'hud-fuel', 'instruments']) {
      el(id).classList.toggle('hidden', !ids.includes(id));
    }
  }
  function flash(text, seconds = 2.6) {
    msg.textContent = text;
    msg.classList.remove('hidden');
    msgTimer = seconds;
  }
  function drawHorizon(ctx, pitch, bank) {
    const W = 96, H = 96, cx = 48, cy = 48;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(bank);
    const dy = THREE_pitchToPixels(pitch);
    ctx.fillStyle = '#2f6fb2';
    ctx.fillRect(-60, -60, 120, dy + 60);
    ctx.fillStyle = '#8a6b45';
    ctx.fillRect(-60, dy, 120, 120);
    ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-44, dy); ctx.lineTo(44, dy); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(28, 48); ctx.lineTo(44, 48); ctx.moveTo(52, 48); ctx.lineTo(68, 48); ctx.stroke();
    ctx.beginPath(); ctx.arc(48, 48, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffd166'; ctx.fill();
    ctx.strokeStyle = 'rgba(234,246,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(48, 48, 44, 0, Math.PI * 2); ctx.stroke();
  }
  function THREE_pitchToPixels(pitch) { return Math.max(-40, Math.min(40, pitch * 70)); }

  function drawDial(ctx, value, max, label, unit, ticks) {
    const W = 96, H = 96;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a1c2c';
    ctx.beginPath(); ctx.arc(48, 48, 44, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9fd8ef'; ctx.lineWidth = 1;
    for (let i = 0; i <= ticks; i++) {
      const a = -Math.PI * 0.75 + (i / ticks) * Math.PI * 1.5;
      const x1 = 48 + Math.cos(a) * 36, y1 = 48 + Math.sin(a) * 36;
      const x2 = 48 + Math.cos(a) * 42, y2 = 48 + Math.sin(a) * 42;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    const a = -Math.PI * 0.75 + (Math.max(0, Math.min(1, value / max))) * Math.PI * 1.5;
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(48, 48);
    ctx.lineTo(48 + Math.cos(a) * 34, 48 + Math.sin(a) * 34); ctx.stroke();
    ctx.fillStyle = '#eaf6ff'; ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(value)), 48, 66);
    ctx.fillStyle = '#9fd8ef'; ctx.font = '9px system-ui, sans-serif';
    ctx.fillText(label, 48, 80);
    ctx.fillText(unit, 48, 30);
  }

  return {
    show, flash,
    update(f, m, dt) {
      const kt = f.speed * 1.944;
      alt.textContent = Math.round(f.pos.y - 8);
      spd.textContent = Math.round(kt);
      let h = ((-f.heading * 180) / Math.PI) % 360;
      if (h < 0) h += 360;
      hdg.textContent = String(Math.round(h)).padStart(3, '0') + '°';
      vs.textContent = (f.verticalSpeed >= 0 ? '+' : '') + f.verticalSpeed.toFixed(1);
      mname.textContent = m.def.name;
      let prog;
      if (m.def.rings.length > 0 && m.ringIndex < m.def.rings.length) {
        prog = `Ring ${m.ringIndex + 1} of ${m.def.rings.length}`;
      } else if (m.def.needsLanding) {
        prog = f.landed ? 'Down safe' : 'Land on the strip';
      } else {
        prog = 'Complete';
      }
      if (m.def.timeLimit > 0) prog += ` · ${Math.max(0, m.def.timeLimit - m.elapsed).toFixed(0)}s left`;
      if (f.damage > 0) prog += ` · damage ${f.damage}%`;
      mprog.textContent = prog;
      fuelTxt.textContent = `${Math.round(f.fuel)}%`;
      fuelBar.classList.toggle('low', f.fuel < 25);
      fuelBar.firstElementChild.style.width = `${Math.max(0, f.fuel)}%`;
      thrFill.style.height = `${Math.round(f.throttle * 100)}%`;
      if (msgTimer > 0) {
        msgTimer -= dt;
        if (msgTimer <= 0) msg.classList.add('hidden');
      }
      drawHorizon(horizon, f.pitch, f.bank);
      drawDial(speedG, kt, 200, 'AIRSPEED', 'kt', 8);
      drawDial(altG, Math.max(0, f.pos.y - 8), 400, 'ALTITUDE', 'm', 8);
    },
  };
}
