# Multiplayer Volleyball Implementation Plan

**Execution status:** Tasks 1–6 are implemented. The original task checkboxes below preserve the planning breakdown; the current implementation and verification record is `docs/implementation/progress.md`. The subsequent teams/AI/controls amendment is also implemented. Local production/subpath validation is available; publishing to a remote GitHub Pages site has not been performed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user selects delegation. Steps use checkbox syntax for tracking.

**Goal:** Deliver a playable first-person volleyball sandbox and online 1v1 game with a static GitHub Pages build.

**Architecture:** The host browser runs fixed-step Rapier physics and authoritative rules. Clients predict their own movement, send inputs, and render buffered authoritative game snapshots. Rendering, physics, action eligibility, trajectory calculation, rules, protocol validation, transport, and UI remain separate modules.

**Tech Stack:** TypeScript, Vite, Three.js, @dimforge/rapier3d, native WebRTC, HTML/CSS, Vitest, browser integration tests.

**Spec:** `docs/superpowers/specs/2026-09-30-volleyball-design.md`; full acceptance checklist in `prompt.md`.

## Global Constraints

- Static GitHub Pages deployment; no gameplay backend, database, or paid service.
- Manual copy/paste WebRTC signaling, centralized public STUN configuration, no mandatory TURN relay.
- Desktop keyboard and mouse; pointer lock; explicit touch-only device message.
- Solo practice and online 1v1 required; model players as collections for later 2v2.
- Host authority over ball contacts, ball physics, scoring, serving, and match state.
- First to 15, win by two, configurable match point target.
- Centralized tuning; forgiving action volumes with finite timing windows and cooldowns.
- Target approximately 60 FPS with simple geometry and bounded graphics cost.
- No unfinished core mechanics; dispose session resources on teardown.
- Run compiler checks and production build after each major phase.

## Review Focus

1. Replayed or reordered action packets must not apply a second hit; test in Task 4.
2. Pointer-lock loss must clear held inputs; test in Task 2.
3. A bounced or rolling dead ball must not award repeated points; test in Task 3.
4. Malformed, oversized, or incompatible connection codes must produce recoverable UI errors; test in Task 4.
5. Starting another session after disconnect must not retain peers, timers, or input listeners; test in Task 5.

## Shared interfaces and file boundaries

`src/game/Types.ts` owns serializable types. Game code uses these interfaces rather than sharing Three.js objects over the network:

```ts
export type Team = 0 | 1;
export type Vec3 = { x: number; y: number; z: number };
export type Action = 'bump' | 'set' | 'spike' | 'dive' | 'serve';
export type Phase = 'waiting' | 'serving' | 'rally' | 'point' | 'match-over';
export interface InputFrame {
  sequence: number; moveX: number; moveZ: number;
  yaw: number; pitch: number; jump: boolean; target: Vec3;
}
export interface ActionRequest { sequence: number; action: Action }
export interface PlayerState {
  id: string; team: Team; position: Vec3; velocity: Vec3;
  yaw: number; pitch: number; grounded: boolean;
  action: Action | 'block' | null; actionUntil: number;
}
export interface BallState {
  position: Vec3; velocity: Vec3;
  rotation: { x: number; y: number; z: number; w: number };
  angularVelocity: Vec3;
}
export interface MatchState {
  score: [number, number]; servingTeam: Team;
  phase: Phase; winner: Team | null; targetScore: number;
}
export interface Snapshot {
  tick: number; timestamp: number; acknowledgedInput: number;
  players: PlayerState[]; ball: BallState; match: MatchState;
}
```

`Game.ts` coordinates modules and lifecycle; it does not implement all their behavior. `Constants.ts` owns physics, movement, action, rendering, and network tuning. `PhysicsWorld.ts` owns Rapier and fixed-step updates. `Court.ts` and `PlayerView.ts` own scene geometry. `InputManager.ts` owns event capture; `PlayerMotor.ts` owns movement. `Trajectory.ts`, `Actions.ts`, and `Rules.ts` contain independently testable volleyball logic. `NetworkManager.ts` owns peers/channels, `Signaling.ts` owns code encoding, `Protocol.ts` owns messages and validation, and `Interpolation.ts` owns buffered playback. UI and audio have their own modules.

## Task 1: Runnable environment and court

**Files:** `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts`, `src/style.css`, `src/game/Types.ts`, `src/game/Constants.ts`, `src/world/Court.ts`, `src/physics/PhysicsWorld.ts`, `src/game/Game.ts`.

**Produces:** A resizable Three.js court and initialized Rapier world that builds as static assets.

- [ ] Locate an existing Node/npm runtime; if absent, obtain a supported portable Node distribution inside the workspace. Verify its checksum, keep it ignored, and use it through a task-local PATH. Do not modify machine-wide settings.
- [ ] Initialize Git if still absent. Ignore dependencies, distribution files, local tools, and test outputs.
- [ ] Create Vite/TypeScript setup with these scripts and strict type checking:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "check": "tsc --noEmit",
    "build": "npm run check && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run"
  }
}
```

- [ ] Install current compatible dependencies and commit the generated lockfile. Consult official documentation for the installed Rapier WASM initialization and Vite bundling requirements; confirm the emitted WASM is loaded from the deployment base path.
- [ ] Configure relative deployment paths and clean up scene resources on disposal:

```ts
import { defineConfig } from 'vite';
export default defineConfig({ base: './' });
```

- [ ] Build a 9 by 18 meter court with center/attack/boundary lines, net at approximately 2.43 meters, posts, gym walls, floor, lights, and restrained shadows. Keep a runoff margin outside court lines so out balls can land visibly.
- [ ] Give the floor, net, and appropriate environment geometry matching fixed colliders. Use a physical ball with CCD in Task 3.
- [ ] Run `npm run check` and `npm run build`; start the dev server and inspect court rendering, resize behavior, WASM loading, and browser errors. Commit the runnable environment.

## Task 2: FPS controls, movement, target, and settings

**Files:** `src/controls/InputManager.ts`, `src/entities/PlayerMotor.ts`, `src/entities/PlayerView.ts`, `src/volleyball/Targeting.ts`, `src/ui/Menu.ts`, `src/ui/HUD.ts`, `src/ui/Settings.ts`, `tests/movement.test.ts`, `tests/input.test.ts`.

**Consumes:** `InputFrame`, `PlayerState`, court dimensions and Rapier world. **Produces:** Immediate controlled movement, first-person camera, target control, procedural remote players and arms.

- [ ] Write failing movement tests for acceleration, stopping, jump/landing, net boundary, and diagonal speed normalization. Test clearing held input through a public `clear()` method:

```ts
it('releases movement when input is cleared', () => {
  const input = new InputManager();
  input.setKey('KeyW', true);
  input.clear();
  expect(input.sample(1).moveZ).toBe(0);
  input.dispose();
});
```

- [ ] Run the focused tests to confirm failure before implementing the tested methods.
- [ ] Implement mouse yaw/pitch, Pointer Lock, WASD, jump, dive input, left/right action clicks, E spike, F serve, and T target hold. Suppress the context menu on the play canvas. Clear keys on blur and pointer-lock loss.
- [ ] Implement `PlayerMotor.step(input: InputFrame, dt: number): PlayerState` using shared movement math and Rapier collision constraints. Bound speed and acceleration; normalize diagonals and prevent crossing the net.
- [ ] Update the intended target only while released and looking toward a usable floor intersection; preserve it while looking up. Clamp targets to playable bounds. Draw a small floor marker.
- [ ] Add menu/settings/HUD, volume/sensitivity/quality controls, touch-only guidance, resize handling, and pause/resume. Solo pauses on lock loss; online mode sends neutral input.
- [ ] Run focused tests, compiler checks, and build. Manually verify looking straight up/down, target persistence, jumping, releasing the pointer, and returning to play. Commit the controls.

## Task 3: Playable volleyball, scoring, and solo tuning

**Files:** `src/entities/Ball.ts`, `src/volleyball/Trajectory.ts`, `src/volleyball/Actions.ts`, `src/volleyball/Rules.ts`, `src/game/Practice.ts`, `src/ui/DebugView.ts`, `src/audio/Audio.ts`, `tests/trajectory.test.ts`, `tests/actions.test.ts`, `tests/rules.test.ts`.

**Produces:** `calculateArcVelocity(from: Vec3, target: Vec3, apex: number, gravity: number): Vec3`, `Rules.floorContact(position: Vec3): void`, `Rules.reset(): void`, and host action resolution from validated requests.

- [ ] Write failing trajectory tests that integrate the returned velocity under gravity and verify arrival at the target. Pin the arc calculation to this relationship:

```ts
const vy = Math.sqrt(2 * gravity * (apex - from.y));
const flight = vy / gravity + Math.sqrt(2 * (apex - target.y) / gravity);
const velocity = {
  x: (target.x - from.x) / flight,
  y: vy,
  z: (target.z - from.z) / flight,
};
```

- [ ] Test impossible/nonfinite inputs, minimum apex clearance, different target heights, misses outside assist volumes, cooldown rejection, and quality-dependent power. Test rules for line balls, out balls, rally scoring, server changes, and win-by-two.
- [ ] Add a repeated dead-ball contact regression test before implementing scoring:

```ts
it('awards only one point per rally', () => {
  const rules = new Rules(15);
  rules.beginRally(0);
  rules.floorContact({ x: 0, y: 0, z: 4 });
  rules.floorContact({ x: 0, y: 0, z: 4 });
  expect(rules.state.score[0] + rules.state.score[1]).toBe(1);
});
```

- [ ] Run tests, then implement CCD ball physics, bounded fixed stepping, arc utilities, action windows, quality scoring, cooldowns, and host-authoritative contacts. Bump/set arcs must account for effective ball gravity; tune drag so it does not undermine targeting.
- [ ] Implement automatic standing-serve toss/hit from a serving position, directed spikes, airborne near-net blocks, dive movement/reach and recovery, last-touch attribution, rally ending, match ending, and reset.
- [ ] Implement practice feeds for receiving and attacking, ball reset, and repeatable drills. Let solo practice support successive contacts without requiring a teammate.
- [ ] Add procedural arm actions, distinct synthesized hit sounds, floor/net/point/whistle cues, and crosshair/cooldown feedback. Audio initialization failure must be nonfatal.
- [ ] Add debug collider/assist-volume drawings, target and velocity markers, and sampled trajectory prediction. Disable by default.
- [ ] Run all tests, compiler check, and build. Play the bump/set/spike loop and adjust central constants until contacts are reachable, sets trackable, and misses understandable. Verify a low net collision and a fast spike. Commit the playable solo game.

## Task 4: Typed WebRTC transport and manual connection flow

**Files:** `src/network/Protocol.ts`, `src/network/Signaling.ts`, `src/network/NetworkManager.ts`, `src/ui/MultiplayerMenu.ts`, `tests/protocol.test.ts`, `tests/signaling.test.ts`.

**Produces:** Versioned messages, `encodeSignal(description: RTCSessionDescriptionInit): string`, `decodeSignal(code: string): RTCSessionDescriptionInit`, and `NetworkManager` methods `createOffer`, `acceptOffer`, `acceptAnswer`, `sendInput`, `sendAction`, `sendSnapshot`, and `dispose`.

- [ ] Write failing decoding tests for round trips, malformed Base64/JSON, wrong versions, invalid SDP type, and oversize payloads. Limit decoded signaling data to 128 KiB and ordinary game messages to 64 KiB. Report errors in the menu without losing navigation.

```ts
it('rejects oversized connection codes', () => {
  expect(() => decodeSignal('A'.repeat(200_000))).toThrow();
});
it('rejects nonfinite or unbounded movement', () => {
  expect(parseMessage({ type: 'input', input: { moveX: Infinity } })).toBeNull();
});
```

- [ ] Define discriminated protocol messages for handshake, configuration, inputs, numbered actions, snapshots, contact events, points, reset, and disconnect. Validate every boundary field and bind peer identity to the connection rather than trusting packet IDs.
- [ ] Test duplicate and stale action rejection using monotonically increasing action sequence numbers. Do not share sequencing counters between lossy movement and reliable actions.
- [ ] Implement complete ICE gathering before generating codes, with centralized STUN configuration and a bounded timeout. Configure state channel with `{ ordered: false, maxRetransmits: 0 }`; reliable events use the default reliable ordered mode.
- [ ] Implement connection state labels, copy buttons with selectable-text fallback, error recovery, and idempotent disposal. Do not transmit state until channels and handshake are ready.
- [ ] Run tests/check/build. Connect two browser contexts through actual generated offers/answers and exchange validated messages. Commit the working transport.

## Task 5: Authoritative online 1v1 and motion smoothing

**Files:** `src/network/Host.ts`, `src/network/Client.ts`, `src/network/Interpolation.ts`, `src/game/Game.ts`, `tests/interpolation.test.ts`, `tests/authority.test.ts`, `tests/lifecycle.test.ts`.

**Consumes:** Transport, shared player motor, action resolver, ball, rules. **Produces:** Online match with host simulation, guest prediction/reconciliation, and interpolated presentation.

- [ ] Write failing tests for ordered snapshot playback, shortest-path yaw interpolation, stale snapshot rejection, bounded extrapolation, and replay-safe action handling. Test that guest-supplied score/ball changes cannot enter the host simulation.
- [ ] Implement 60 Hz host simulation, approximately 20 Hz snapshots, bounded input send rate, timestamps, input acknowledgments, and stale-input neutralization. Cap accumulated physics work after stalls.
- [ ] Predict guest movement immediately with the shared motor; retain unacknowledged inputs and reconcile to host state. Smooth small visual corrections while snapping impossible major divergence.
- [ ] Implement a short snapshot buffer for remote positions, rotations, jumps, actions, and ball state; cap extrapolation during gaps. Authoritative contact events immediately update the ball's trajectory presentation.
- [ ] Implement scoring/serve synchronization, rematch requests, host-controlled restart, connection statistics, and clear disconnect handling. Detect channel backpressure and drop superseded state snapshots.
- [ ] Add lifecycle test coverage for repeat dispose and a fresh session after disconnect:

```ts
it('closes peers and clears callbacks on repeated disposal', () => {
  const session = createSessionWithFakePeer();
  session.dispose();
  session.dispose();
  expect(session.peer.close).toHaveBeenCalledTimes(1);
  expect(session.activeListenerCount()).toBe(0);
});
```

- [ ] Run tests/check/build. Play a two-context rally, verify score agreement and rematch without reload, disconnect the guest, then create a fresh session. Check behavior with delayed snapshots and host backgrounding. Commit online play.

## Task 6: Deployment, documentation, and complete acceptance review

**Files:** `.github/workflows/deploy.yml`, `README.md`, `tests/browser/volleyball.spec.ts`, `playwright.config.ts`, final fixes in relevant modules.

- [ ] Add a Pages workflow that checks out source, selects a supported Node runtime, installs with `npm ci`, runs tests/build, uploads `dist`, and deploys via the official Pages actions. Scope deployment permissions to contents read, pages write, and id-token write; serialize deployments.
- [ ] Write README sections required by prompt.md: features, controls, architecture, stack, setup, build, Pages deployment, screenshot placeholder, copy/paste exchange, WebRTC, host authority, STUN/TURN, known limitations, and future work.
- [ ] Add browser smoke coverage for practice start/reset, settings, malformed connection code, two-page signaling, peer connection, synchronized score, rematch, and disconnect recovery. Verify real canvas initialization and page-error absence; do not substitute button presence for gameplay verification.
- [ ] Run clean dependency installation, tests, TypeScript checks, production build, and browser checks. Serve the production output under a non-root URL to verify relative assets and WASM loading.
- [ ] Review all 25 acceptance criteria, record evidence and any environment limits, and fix core failures. Inspect performance and debug-disabled rendering. Do not claim remote network success or deployed Pages success without observing it.
- [ ] Update checked plan items, commit completed work where supported, and deliver run instructions, validation results, and material limitations.

## Plan self-review

The tasks cover the complete supplied specification, including all action types, solo feeds, target persistence, match reset, static WASM loading, validated manual signaling, guest prediction, buffered interpolation, debug tools, settings, teardown, documentation, and deployment automation. Tests for the five review-focus cases belong to their owning tasks. The remaining execution prerequisites are a working Node/npm runtime and the user's plan review/execution-method selection required by the planning skill.
