// Seeded randomness and value-noise helpers shared by terrain and placement.
// Everything in the game is deterministic from one seed, so screenshots restage exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 2D value noise: a grid of random heights, bilinearly interpolated
// with a smoothstep, stacked in three octaves for hills that read at a glance.
export function makeNoise(seed) {
  const rand = mulberry32(seed);
  const grids = [];
  for (let o = 0; o < 3; o++) {
    const n = 8 << o;
    const g = new Float32Array((n + 1) * (n + 1));
    for (let i = 0; i < g.length; i++) g[i] = rand();
    grids.push({ n, g });
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  function sample(grid, x, z) {
    const { n, g } = grid;
    const fx = ((x / 240) % 1 + 1) % 1 * n;
    const fz = ((z / 240) % 1 + 1) % 1 * n;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const tx = smooth(fx - ix), tz = smooth(fz - iz);
    const at = (i, j) => g[((j % (n + 1)) * (n + 1)) + (i % (n + 1))];
    const a = at(ix, iz), b = at(ix + 1, iz), c = at(ix, iz + 1), d = at(ix + 1, iz + 1);
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
  }
  return function noise2(x, z) {
    return (sample(grids[0], x, z) - 0.5) * 2 * 0.55
      + (sample(grids[1], x, z) - 0.5) * 2 * 0.3
      + (sample(grids[2], x, z) - 0.5) * 2 * 0.15;
  };
}
