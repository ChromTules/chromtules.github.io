# Execution ledger — 2026-09-30-volleyball

Approved spec and implementation plan; native execution selected.

- Ruling: Work in this newly initialized repository on feat/volleyball. There was no existing repository or branch to isolate. No existing implementation is displaced.
- Ruling: Use native PowerShell bookkeeping rather than Bash skill helper scripts in this Windows environment. This ledger preserves progress.
- Pre-flight: Task 1 types feed Tasks 2–5; shared serializable inputs and snapshots are the contract. The input acknowledgment belongs to the receiving guest, not the host's local input stream.
- Pre-flight: Task 3 fixed-step simulation feeds Task 5; only the host steps the authoritative ball, while client player prediction reuses the movement math.
- Pre-flight: Task 4 channels feed Task 5; reliable action sequences are independent from transient movement sequences.
- Design tokens: navy #143952, court blue #247fa3, maple #bd915d, orange #ef7947, chalk #f4f8fa. Condensed Impact display lettering, Segoe UI body, tabular score numerals. Left-side menu over a live gym; no dashboard card grid.
- Tasks 1–6 implemented: portable Node 24 verified by SHA256; original rendering, solo actions, scoring, peer networking, README and Pages workflow delivered.
- Verification: clean npm ci (zero reported vulnerabilities), 28 unit tests, five Playwright tests, TypeScript/build and production subpath smoke check passed.
- Independent review: reliable jump ordering, opposing contact suppression and timing quality findings reproduced and fixed with regression tests. No deferred review findings.
- Ruling: use Vite WASM plugin and native top-level await; obsolete Rollup-dependent helper was incompatible with current Vite. Requires modern browsers already specified.
- Ruling: allow signaling with gathered local candidates when public STUN times out. UI reports limited discovery; internet reachability remains network-dependent.
- Follow-up guest hit test: tighter software-rendering timing initially missed the receive window. Adjusted to performance mode/earlier detection; network-enabled rerun blocked by automatic review usage limit, not a safety determination.
- User scope amendment: teams of configurable sizes, AI filling nonhuman slots, defensive block controls, camera-directed spike aiming, and remappable keys. See 2026-09-30-teams-ai-controls.md; continuing the approved native implementation.
- Amendment implemented: asymmetric 1–6-player rosters, scored offline AI matches, host-owned coordinated AI, guest AI takeover, held defensive blocks, camera yaw/pitch spike aim, and persisted keyboard remapping with duplicate swaps/default restoration.
- Human-capacity ruling: continue the existing two-human invitation flow and fill remaining slots with AI; announced after the optional preference question received no answer.
- Independent amendment review: fixed jump-edge consumption by action sampling, explicitly remapped Right Shift conflicting with the default dive alias, and stale key capture after leaving Settings. Regression tests pass; README reflects the new controls/team behavior.
- The account usage-limit restriction cleared. Actual two-browser signaling, guest movement/contact, score synchronization, restart, and disconnect takeover now pass. The earlier guest receive failure was test setup: the rally had ended before the receiver was positioned; the corrected test positions the guest before serving and uses separate browser processes.
- AI integration evidence: a three-minute 3v3 simulation produced 59 bumps, 41 sets, 43 spikes, one block, and 52 net crossings, with both teams contacting the ball and no invalid player positions. A 12-player simulation verifies full rosters, reset/controller preservation, and scoring.
- AI peer assertion correction: a human-assigned receive does not require an AI hit. The integration test checks synchronized bot movement instead; separate simulation coverage checks bot contacts and rallies.
- Final amendment verification: TypeScript check, production build, 44 unit tests across 11 files, all nine Playwright tests, and production subpath smoke passed. Production validation covers HTML/JS/CSS/WASM loading, WebGL, Pointer Lock, and serving. Visually inspected the rendered team-match screenshot. No unresolved review findings. Remote publishing and network compatibility across arbitrary internet connections remain unverified.

## Approved camera and precision amendment

- User approved the bounded in-chat design: third-person default with remappable V first-person toggle, smaller forearm/hand contacts, indefinitely held passing platform, release-to-swing, and velocity/platform-based passing instead of target-guided passes.
- Implemented player-relative shoulder camera, visible local player/arm swing, first-person arms, projected player-aim crosshair, and bounded camera positions. Existing saved key mappings migrate without stealing a previously assigned V.
- Pass contact uses incoming relative velocity, camera-controlled platform normal, bounded swing surface velocity, player movement, and contact quality. Departing balls do not repeatedly bounce against a held platform. Focus loss clears held inputs without triggering a swing. Set/spike/block reach and action windows are smaller; blocking requires the held block control.
- AI calculates interception positions and platform angles using the same contact/response mechanics, with held receive and low-ball dives. Guest held state and reliable release swings use the existing authoritative networking flow.
- Independent review found stale action timing penalizing indefinite holds and a held-pass condition suppressing AI dives. Both were reproduced with failing regression tests and fixed.
- Verification: 54 unit tests in 14 files, production build, all 11 browser tests passed. Browser coverage includes two camera modes, remapped camera toggle, sustained holding, physical rebound, focus clearing, actual guest contact, peer held-state synchronization, scoring, disconnect takeover, and AI rallies. Final three-minute AI match included 24 sets, 5 spikes, 29 crossings, and no invalid player positions. Updated README and inspected third-/first-person screenshots.
- Final production subpath smoke passed after the copy cleanup: HTML, JS, CSS, WASM, WebGL, Pointer Lock, and serving. No remote publishing performed.

## AI spike clearance and FOV follow-up

- Reproduced an AI spike whose ball center reached the net at 2.37 m, below the 2.64 m net-plus-ball clearance. AI pitch selection did not account for gravity, net geometry, or quality-dependent speed.
- AI now searches reachable camera aim/pitch candidates using the actual spike trajectory, checks slow-contact quality, and includes net thickness, ball radius and a safety margin. It maintains aim during the swing and rechecks clearance at contact. Unsafe AI spikes are withheld; human spike physics/aim are unchanged.
- Added a saved 60–120° vertical FOV slider, default 78°, with live numeric feedback and immediate projection updates in both camera modes. Invalid stored values fall back to the default; unavailable storage does not prevent adjustment.
- Verification: reproduced failing net-clearance regression before the fix; six-minute simulation after the fix has 11 spikes and zero unsafe trajectories. Sustained rally test passes with sets, spikes, blocks and scoring. All 54 unit tests, three targeted browser checks, production build and subpath smoke passed. FOV browser coverage verifies values above default, camera switching and reload persistence.
