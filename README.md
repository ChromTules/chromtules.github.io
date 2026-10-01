# Sideout

A third-person indoor volleyball game with an optional first-person view for desktop browsers. Practice your touch, play a match with AI, or invite a friend. Set each team to 1–6 players; AI controls every unclaimed slot. The current invitation flow supports two human players on opposing teams, with up to ten AI players. The entire production game is static: the host player's browser runs the match and connects directly to the guest over WebRTC.

## Run locally

Install Node.js 24 LTS (including npm), then:

```sh
npm install
npm run dev
```

Open the address printed by Vite, normally `http://127.0.0.1:5173`. Use a modern desktop browser with WebGL 2, WebAssembly, Pointer Lock, and WebRTC support. Click **Play solo**, or **Enter court** after connecting. If mouse capture is denied, click **Enter court** again. Press Escape to release your mouse.

This workspace also includes an ignored portable Node installation in `.tools`, used during development. On this Windows machine you can run `./dev.ps1` without changing your global PATH. It uses system Node if available, otherwise the portable installation.

## Features

- Indoor 3D court, physical net, ball, player colliders, and simple player/arm models.
- Responsive movement, jumping, precise forearm/hand contacts, standing serves, diving, and held defensive blocks.
- Third-person follow camera with a remappable first-person toggle. The local player's passing stance and swing are visible in either view.
- Hold a passing platform indefinitely; release to swing. Pass response depends on incoming speed, platform angle, player movement, and swing timing.
- Camera-directed spike aim, persistent set/serve target marker, configurable mouse sensitivity, audio volume, and graphics quality.
- Individually configurable team sizes from 1 to 6, including asymmetric matches. Coordinated AI fills unclaimed slots and takes over a disconnected guest on the host.
- Remappable keyboard controls with duplicate-key swapping, local persistence, and restore-defaults.
- Repeatable receiving and attacking drills, ball/rally reset, and optional debug visualization.
- Manual offer/answer exchange, host-authoritative team matches, guest movement prediction, reconciliation, and buffered remote-player/ball interpolation.
- Rally scoring, configurable 15/21/25-point matches, win by two, and restart without refreshing.
- Generated audio, with no required sound files. The game continues if audio is unavailable.

## Controls

| Control | Action |
| --- | --- |
| W / A / S / D | Move |
| Mouse | Look |
| Space | Jump |
| Q (hold) | Raise a defensive block near the net; jump to cover high attacks |
| Left mouse / Z | Hold passing platform; release to swing |
| Right click / X | Set |
| E | Spike while airborne |
| Shift | Dive and extend your receiving reach; recovery cooldown applies |
| F | Automatically toss and hit a standing serve |
| T | Hold/release the target marker |
| V | Toggle third-person / first-person camera |
| R | Reset solo practice |
| G | Start/restart the receiving drill |
| H | Start/restart the attacking drill |
| Backtick | Toggle collider/contact/trajectory/network debugging |
| Escape | Release the mouse and open the menu |

Change keyboard bindings in **Settings & controls**: click the key next to an action, then press the replacement. Assigning an occupied key swaps the two actions. Escape cancels capture, and **Restore default keys** resets everything. Bindings save in this browser; HUD hints follow them. Mouse bump/set and Escape remain available. These tables show defaults.

**Offline practice and AI matches pause while the mouse is released. Online matches keep running while a menu is open; your movement inputs stop.** If the guest leaves, the host continues with AI controlling that slot. If the host disconnects, the guest sees a connection-loss screen; host migration is not implemented. A host tab that is suspended or heavily throttled will stall the authoritative simulation; keep it active.

## Team matches and AI

Open **Settings & controls → Match teams** and choose 1–6 Blue players and 1–6 Coral players independently. These settings apply to the next match hosted on that browser. Choose **Play a match** for one human plus AI, or **Create multiplayer game** to invite a human opponent while AI fills both rosters. **Play solo** remains an unscored, single-player training court.

AI runs only in the authoritative simulation. A shared team decision runs at 10 Hz, predicts descending interceptions, assigns a receiver, covers formation positions, passes to a setter, sets an attacker, approaches and jumps for spikes, aims toward open court, dives for low balls, serves, and anticipates blocks against opposing attack sets. Nearby humans remain candidates for the receive; teammates do not always take the ball away from you. Bots use the same movement limits, contact volumes, timing windows, and cooldowns as people. They do not teleport or modify scores directly. The strategy is deterministic and deliberately readable; it is not a trained machine-learning model.

Serving currently belongs to the first slot on the serving team, without rotation rules. Team formations reset between rallies. A bot in that serving slot serves automatically. The default match is 3v3, with one player per slot and all unused slots filled. A disconnected human can join a fresh session; in-place reconnect is not implemented.

## Learn the rally

1. Press **G** for a receive. Hold **left mouse/Z** to extend your forearms and move behind the descending ball. The ball must reach the small platform in front of you; balls beside your body or well above your arms miss it. You can hold this stance indefinitely.
2. Let the ball rebound from the stationary platform, or **release left mouse/Z** to swing through contact for more lift and power. Turn and adjust your look angle to orient the platform. Holding longer does not charge extra power. Incoming speed and your movement also affect the result; the pass is not automatically guided to the marker.
3. Follow your pass and right-click while the ball reaches your hands overhead. Sets retain target assistance but use a smaller hand contact region and a shorter timing window.
4. Approach the net, watch the set descend, jump, and press **E** with the ball above and in front of your hitting hand. Timing and placement influence power. Turn your camera left/right to choose the spike direction; looking down produces a sharper attack and looking nearer level sends it deeper.
5. Use **H** for repeated attacking practice. Use **R**, then **F**, for serving practice. You must be behind the end line to initiate a serve. Press **V** to change perspective without changing your aim.

The marker starts near your side of the net. Look down toward the floor to move it; looking up to track a ball preserves it. **T** freezes it while you look elsewhere. It is only a reference for passing. Sets keep the target on your team's side. Serves map it to the opposing side. Spikes primarily use your current camera heading and downward angle, with a small contribution from the marker for stability; a held old marker does not lock your spike direction. Aim is constrained to a usable attack into the opposing court. The crosshair projects your player's aim in both perspectives, and the orange edge indicator helps locate a ball outside the view.

Dive with Shift to extend your platform toward a low ball. To defend at the net, face the opposing court and **hold Q**, then jump to reach high attacks. Jumping alone no longer raises a block. Blocks can redirect a ball up/down or out; the defending touch is attributed immediately. Court-boundary lines count as in. Rules intentionally omit rotations, double-touch faults, and strict three-touch enforcement so training and small-team combinations remain accessible.

## Play with a friend

Both players open the same deployed game version.

1. The host chooses **Create multiplayer game**. Wait for a code, copy it, and send it to the guest through any messaging app.
2. The guest chooses **Join multiplayer game**, pastes the offer, and clicks **Generate answer**. They copy their answer and send it back.
3. The host pastes that answer and clicks **Connect with answer**.
4. Both players click **Enter court**. Blue hosts and serves first; Coral is the guest. The ball is held for the serving player until they press F.

Keep both original tabs open while exchanging codes. Codes belong to the current live peer connection; use fresh codes after leaving, reloading, or a failed connection. If automatic copying is unavailable, select the text and copy manually. Only send codes to the person you intend to play with.

The host can restart through the Escape menu. A guest can request a rematch after the match ends. A guest disconnect activates AI takeover on the host; a host disconnect ends the guest's session. Exchange fresh codes for a new human session. There is no host migration or persistent match storage.

### What WebRTC does here

Manual signaling exchanges session descriptions and connection candidates. After connecting, WebRTC DataChannels carry gameplay directly between the two browsers. Unordered, non-retransmitted state packets carry positions and snapshots. Reliable ordered packets carry jumps, action requests, authoritative contact events, restart requests, and the version handshake. No Three.js objects travel over the network.

The host owns Rapier physics, hit success, score, serving, and match state. The guest sends bounded inputs and independently numbered action requests; guest snapshots and scores are ignored by the host. Guest movement is predicted immediately and reconciled with host snapshots. Remote movement uses a short snapshot buffer, with capped extrapolation during gaps. This is a friendly peer-hosted game, not an anti-cheat system: the authoritative host is trusted.

### STUN, TURN, and limitations

`src/game/Constants.ts` centralizes ICE configuration and defaults to a public Google STUN endpoint. STUN helps discover addresses for direct connections. Some firewalls, carrier NATs, corporate networks, VPNs, and symmetric NAT configurations still block peer-to-peer traffic. A TURN relay can help those cases, but no TURN service or credentials are included or required by this project.

If address gathering stalls, the UI can generate a code with already gathered local candidates and explain that discovery was limited. This can allow same-network play; it does not guarantee internet connectivity. Try a different network or fresh codes if a connection fails. Disconnect detection and connection progress are visible in the menu/HUD. Two browsers on one machine validate the connection flow, but cannot establish compatibility with every pair of internet networks.

## Architecture and tuning

| Directory | Responsibility |
| --- | --- |
| `src/game` | Lifecycle, authoritative simulation, shared state, constants |
| `src/physics` | Rapier world, ball and player bodies, collision events |
| `src/world` | Court geometry, third-/first-person cameras, player models, debug drawing |
| `src/entities` | Shared player movement and dive logic |
| `src/controls` | Pointer Lock, mouse, keyboard, input clearing |
| `src/ai` | Host-owned interception, team roles, attack/defense decisions |
| `src/volleyball` | Contact eligibility/quality, gravity-aware trajectories, scoring |
| `src/network` | Signaling, channels, typed validation, host inputs, prediction, interpolation |
| `src/ui` | Menus, settings, connection flow, HUD |
| `src/audio` | Generated contact and point/whistle tones |

Tech stack: TypeScript, Vite, Three.js, `@dimforge/rapier3d`, WebRTC, HTML/CSS; Vitest and Playwright for checks. Vite's WASM plugin emits Rapier's WASM as a static asset. There is no React or gameplay server. The Vite server is only a local development tool.

Tune gameplay in `src/game/Constants.ts`: gravity, restitution, movement/jump/dive behavior, contact ranges/windows/cooldowns, arc heights, spike power, and network rates. Physics runs at a fixed 60 Hz with bounded catch-up; snapshots target 20 Hz and movement messages target 30 Hz. Responsive movement uses shared acceleration and court constraints; kinematic Rapier player bodies interact with the physical ball. Rendering caps pixel ratio and provides a lower-cost lighting mode.

Debug mode shows approximate assist regions, colliders, target, ball velocity, future ballistic positions, frame rate, and network traffic totals. It is off by default. The scene is procedural; optional Google Fonts enhance menu typography, with local font fallbacks when offline.

## Checks and production build

```sh
npm test
npm run check
npm run build
npm run preview
```

`dist/` is the complete production website, including the WASM asset. It requires static HTTP(S) hosting rather than opening `index.html` through `file://`.

For browser checks:

```sh
npx playwright install chromium
npm run test:browser
npm run test:production
```

The browser suite includes actual Rapier contacts, a full receive–set–jump–spike practice sequence, net collisions, jump/block regressions, three-minute AI matches, 6v6 roster/reset checks, remapping persistence, Pointer Lock, and two-browser copy/paste signaling with scoring/rematch/disconnect. `test:production` serves the existing build under `/volleyball/` and checks asset loading, WASM, Pointer Lock, and serving. Run `npm run build` first. Browser tests need local peer networking; restrictive sandboxes can block ICE even when ordinary page rendering works.

## Deploy to GitHub Pages

1. Push the project to your GitHub repository, using `main` or `master` as the deployment branch.
2. Open **Settings → Pages** and select **GitHub Actions** as the source.
3. The included `.github/workflows/deploy.yml` installs dependencies, runs unit tests, builds, and deploys `dist`. It also supports manual dispatch from the Actions tab.
4. Open the URL from the deployment job and test a match with your friend.

Vite uses `base: './'`, so assets work for both a user site and a project site such as `https://your-name.github.io/your-repository/`. No environment secrets or backend configuration are needed. HTTPS is provided by GitHub Pages and is appropriate for browser APIs. Publishing requires your repository access; no remote deployment has been performed by this implementation.

## Screenshots

Add your preferred gameplay screenshots here. Browser smoke tests write menu and practice captures to the ignored `test-results/` directory.

## Future improvements

More simultaneous human guests, AI difficulty/personality options, optional room-code signaling and TURN configuration, jump/float serves, richer animations, spectators, and stricter rules. Current sessions support two human players with AI completing 1–6-player teams; player collections and separated transport/simulation modules provide extension points for a larger human lobby.
