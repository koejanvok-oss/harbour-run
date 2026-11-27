# harbour-run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/koejanvok-oss/harbour-run/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/koejanvok-oss/harbour-run/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A bush plane, one island, and a runway that keeps moving away. Fly the
little yellow plane around a procedural coastal island: thread five rings
over the harbour bay, land on the coastal strip, or race the whole circuit
against the clock on one tank of fuel.

## Play

Open `game/index.html` in a desktop browser (served by any static server —
the game makes no network requests). Keyboard and mouse:

- **W / S** — throttle
- **A / D** or **← / →** — bank and turn
- **↑ / ↓** — climb and descend
- **Mouse** — steers gently
- **Space** — air brake · **P** — pause · **M** — sound · **R** — restart

Pick a mission on the title screen (or press 1 / 2 / 3):

1. **Ring Run** — thread all five rings over the bay.
2. **Harbour Landing** — take off from the strip and put her down gently.
3. **Circuit Dash** — rings one to five, then land, against the clock.

Fuel drains with the throttle and the airframe remembers hard landings, so
every sortie is a decision: push for the next ring or save fuel for the
way home.

## How it is built

- `game/index.html` — page, HUD and instrument panel.
- `game/src/main.js` — boot, game loop, chase camera, screens.
- `game/src/terrain.js` — procedural island: heightmap, beach, harbour bay,
  runway plateau, water, trees, village and lighthouse.
- `game/src/sky.js` — gradient sky dome, sun, drifting clouds, lights.
- `game/src/aircraft.js` — the bush plane, built from primitives.
- `game/src/physics.js` — arcade flight model: lift, stall, banking turns,
  takeoffs, landings and crashes.
- `game/src/controls.js` — keyboard and mouse input.
- `game/src/missions.js` — the three missions and the ring course.
- `game/src/hud.js` — HUD numbers, fuel gauge and lit instruments.
- `game/src/audio.js` — synthesised engine, chimes and fanfares (WebAudio).
- `game/src/shots.js` — deterministic `?shot=` staging for screenshots.
- `game/src/rng.js` — seeded randomness so the island restages exactly.
- `game/vendor/three.module.min.js` — Three.js r160, vendored as a minified
  build (the only library; everything else is this game's own code).

Screenshots under `screenshots/` are real renders of the game's own code,
taken in a browser with `?shot=cover|rings|harbour|landing`.

## Hand in

`main.ts` (Node standard library only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with the kit's
`vendor/makefun-game.ts` library.

## Run it

```sh
cd game && python3 -m http.server 8000
# open http://localhost:8000 in desktop Chrome
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=koejanvok-oss&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
