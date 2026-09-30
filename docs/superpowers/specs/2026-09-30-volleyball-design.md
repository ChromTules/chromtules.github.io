# First-person multiplayer volleyball

Status: approved and implemented. The subsequent teams/AI/controls amendment expands the initial scope; see 2026-09-30-teams-ai-controls.md and the execution ledger for verification.

## Intent and scope

Build a playable desktop browser volleyball game from the updated, complete prompt.md. Prioritize responsive movement, assisted bump/set/spike contacts, and working 1v1 multiplayer. Deliver static assets suitable for GitHub Pages, with no gameplay backend, database, or paid service. The 25 acceptance criteria in prompt.md are the release checklist.

The first release includes a single-player practice court and online 1v1. Player collections and team identifiers permit later 2v2 expansion, but 2v2 is outside the first release's acceptance criteria.

## Required connection approach

The updated prompt explicitly requires manual WebRTC signaling. The host copies an encoded invitation containing its gathered session description; the guest imports it and copies an encoded response back. The host imports the response to establish DataChannels. Provide clearly labeled create/join, copy/paste offer, generate/copy/paste answer, and connection status UI. Users exchange codes through any medium they choose. No hosted signaling service is required.

Manual signaling will use a configurable public STUN service for address discovery. With no TURN relay, connectivity across all network configurations cannot be guaranteed. Connection setup must expose progress, timeout, retry, and actionable failure messages instead of promising universal connectivity. Connection payloads must be bounded and validated before use.

## Game and presentation

Use TypeScript, Vite, Three.js, Rapier, and HTML/CSS. Render an indoor gym with a wood court, readable boundary and attack lines, a physical net, posts, lighting, and simple player models. A compact menu offers practice, host, join, and controls. The HUD shows score, server, rally status, target, action feedback, and connection status.

Preserve the specified WASD, mouse, Space, left/right click, E, and Shift controls. Add F for serve and T to hold/release the intended target. Escape releases pointer lock and opens the pause overlay; an online match continues while the overlay is open. Grounded movement accelerates quickly and stops firmly. Jumping near the net activates a block region. Dives lower the camera/contact region and use a recovery cooldown.

Practice provides repeatable ball feeds and rally reset so one person can learn all actions. Online play uses standing serves, rally scoring, and first to 15 with a two-point lead. The match point target is configurable.

Include settings for mouse sensitivity, audio volume, and graphics quality. Show the local team in the HUD. Handle browser resizing and display a desktop keyboard-and-mouse requirement on touch-only devices. Pointer-lock loss clears held inputs and pauses solo practice; online play continues with neutral local inputs and a visible overlay. Provide rematch/reset without a page refresh.

Use simple geometry, bounded rendering resolution, and modest shadows to target approximately 60 FPS on a typical modern laptop. Design synthesized audio cues for bump, set, spike, floor, net, whistle, and point events; unavailable audio must not prevent play.

## Simulation and actions

Keep rendering, input, physics, volleyball rules, networking, and UI in separate modules. Centralize tuning constants. Run host physics at a fixed 60 Hz with bounded catch-up work. Rapier handles the ball, floor, net, walls, and player collision constraints. Constrain players to their own playable side.

Each action has a finite active window and cooldown. Contacts consider distance, facing, relative ball height, and timing. Contact quality affects accuracy and power. Shared trajectory utilities compute gravity-aware passes, sets, serves, and spikes. Bumps and sets use a persistent intended target; spikes additionally consider camera pitch. Avoid perfect-contact requirements while retaining genuine misses outside assist volumes.

Track the last touching team, current ball side, floor contacts, in/out position, serving team, and rally phase. Award one point per ended rally. Use explicit waiting, serving, rally, point, and match-over phases. Rotation violations are excluded. Block contacts alter velocity without awarding arbitrary points. Provide procedural arms, synthesized contact sounds, crosshair feedback, and cooldown indicators.

## Multiplayer data flow

The host owns player movement validation, successful actions, physics, score, and match state. The guest sends bounded movement inputs, camera orientation, and numbered action requests. The host never accepts guest ball positions, scores, or successful-contact claims.

Use versioned, validated protocol messages with player IDs and team IDs. Send regular authoritative snapshots containing a simulation tick, player states, ball state, score, and rally phase. Interpolate remote motion; predict local guest movement and reconcile it against host snapshots. Separate transient state traffic from reliable session and match events. Detect disconnects, stop the online match with a clear message, and allow returning to the menu. Host migration is excluded.

Use an unordered channel with maxRetransmits: 0 for transient state and an ordered reliable channel for session, action requests, authoritative contact events, configuration, and rally/match events. Timestamp ball snapshots and include position, velocity, rotation, and angular velocity. Buffer remote snapshots to interpolate position, orientation, jumping, and action presentation; use bounded ball extrapolation when necessary. Discard stale snapshots and synchronize successful ball contacts immediately. Synchronize game state, not Three.js objects.

## Debugging and lifecycle

Provide a toggleable debug overlay that draws player/ball colliders, bump/set/spike assist volumes, block regions, intended targets, ball velocity, and predicted trajectories. Include available connection statistics. Keep debug rendering disabled by default and easy to disable in production.

Dispose Three.js resources, Rapier bodies/worlds, event listeners, WebRTC connections, and pointer-lock state on session teardown. Repeated practice sessions, failed connection attempts, and rematches must not accumulate stale state or resources.

## Delivery and verification

Include setup/run/build instructions, controls, the manual connection exchange, known connection limitations, and GitHub Pages deployment configuration with relative asset paths. Deployment credentials and publication are not required to produce the build.

Include a GitHub Actions Pages deployment workflow and a README covering features, architecture, stack, screenshot placeholder, development/build/deployment commands, controls, connection steps, WebRTC and host authority, STUN/TURN limitations, and future improvements. Verify npm install, npm run dev, and npm run build. Actual GitHub Pages publication and remote-site verification require an available repository and deployment access; do not claim those checks from a local build alone.

Follow the prompt's incremental phases: environment, court, FPS player, ball physics, actions, targeting, rules, solo/debug tools, WebRTC, 1v1 synchronization, network improvements, and polish. Establish a playable bump/set/spike loop before expanding multiplayer. Run compiler checks and a production build after each major phase, correct failures, and check for runtime issues. Complete functional core systems rather than leaving placeholders.

Verify trajectory endpoints, contact eligibility and cooldowns, scoring and win-by-two behavior, protocol validation, and host authority with automated tests. Run TypeScript checks and a production build. Exercise practice in a browser, including pointer lock, movement, action feedback, and reset. Exercise host and guest in separate browser contexts, exchange actual connection payloads, and verify connection, movement, ball synchronization, scoring, and disconnect handling. Report any browser/network validation that the available environment prevents.
