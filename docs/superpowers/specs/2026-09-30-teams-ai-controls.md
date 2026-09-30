# Team play, defense, and custom controls

Scope amendment requested during the approved native implementation: defensive blocking, configurable team sizes, competent AI in nonhuman slots, camera-directed spikes, and remappable keyboard controls. Continue the existing static/WebRTC architecture and native execution. Original verification remains relevant; expanded requirements require additional tests.

## Behavior

- Configure each team from one to six players before a match. Separate unscored practice from a scored match against AI. Retain the existing two-human host/guest connection, with AI filling all remaining slots. The optional preference question received no answer; this default was announced before implementation.
- Unclaimed slots use host-owned AI. Clients render authoritative AI snapshots and never run competing bot physics. Track slot identity/controller separately from team.
- AI predicts reachable ball positions, assigns one primary receiver, covers court, sends controlled passes to a teammate, sets an attacker, approaches/jumps/spikes, serves, dives for low balls, and positions a blocker. AI uses the same movement limits, hit regions, action windows, and cooldowns as humans. Bound decision frequency and keep human players eligible for receiver/attacker assignments so bots do not claim every ball.
- Hold the block key (default Q) to raise hands near the net; jump for height. Preserve the approachable automatic airborne block. Give block-specific feedback and contact attribution.
- Spike yaw follows the camera heading; pitch controls attack depth/steepness. Blend a small amount of the intended target for controllability without locking spikes to an old marker. Clamp impossible trajectories, not normal cross-court aim.
- Bind movement, jump, block, bump, set, spike, dive, serve, target hold, reset, drills, and debug. Preserve mouse bump/set. Capture physical key codes; reject reserved browser/system keys, swap duplicate assignments, show current bindings in controls/HUD, persist validated configuration in localStorage, and provide defaults reset. Storage failure must not prevent play.

## Implementation and acceptance

1. Add typed roster configuration, role-preserving spawn formations, and tests for 1–6 slots, asymmetric teams, stable IDs, and human/AI counts.
2. Add shared key binding storage and capture UI; test remapped movement/actions, duplicate swapping, corrupt storage, and default restoration.
3. Add explicit defensive input and camera spike utility; test left/right and deep/sharp aim, block reach/timing, and protocol validation.
4. Add host-only team AI and integrate roster/snapshot rendering. Verify reachable interception, coordinated contacts, auto-serving, defensive blocks, legal movement and action limits, and bounded roster-size networking.
5. Exercise scored solo team play and multiplayer compatibility, update README, run compiler/build/unit/browser checks. The earlier automatic review usage-limit block cleared; network-enabled tests can now run.

Initial base: 28 unit tests, five browser tests, clean install, production build, and a subpath production smoke check passed before this amendment. Expanded verification and review results are recorded in docs/implementation/progress.md.
