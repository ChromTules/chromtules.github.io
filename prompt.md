# Project: 3D First-Person Multiplayer Volleyball Game

Build a complete playable browser-based 3D first-person volleyball game. The game should emphasize fun, responsive volleyball gameplay rather than perfectly realistic physics.

The finished game must be deployable as a static website on GitHub Pages. There should be no traditional game server or backend. Multiplayer gameplay should use peer-to-peer WebRTC DataChannels.

## Core Technical Stack

Use:

- TypeScript
- Vite
- Three.js for 3D rendering
- Rapier (`@dimforge/rapier3d`) for physics
- WebRTC DataChannels for peer-to-peer multiplayer
- HTML/CSS for menus and HUD
- GitHub Pages for deployment

Do not use:

- React unless there is a compelling reason
- A Node.js backend
- WebSockets requiring a hosted server
- Firebase
- Supabase
- Any database
- Paid APIs or services
- A backend required for normal gameplay

The production build must consist entirely of static files that can be hosted on GitHub Pages.

## Overall Game Concept

Create a first-person 3D indoor volleyball game.

The player should move around a volleyball court from a first-person perspective and perform volleyball actions including:

- Bump / receive
- Set
- Spike
- Serve
- Jump
- Block
- Dive

The game should not attempt to perfectly simulate the player's arms or require pixel-perfect physical contact.

Instead, use generous action hitboxes / assist volumes around the player. When the player performs an appropriate action while the ball is within its valid region, calculate a desirable volleyball trajectory and apply it to the ball.

The goal is to create something that feels like volleyball while remaining accessible and responsive with keyboard and mouse controls.

## Primary Design Philosophy

Prioritize:

1. Responsive controls
2. Satisfying bump → set → spike gameplay
3. Skillful timing and positioning
4. Easy-to-understand mechanics
5. Multiplayer responsiveness
6. Fun over strict physical realism

Use Rapier for normal ball motion, gravity, collisions, players, the court, floor, walls where appropriate, and the net.

However, do NOT rely entirely on collision physics to produce volleyball actions.

Bumps, sets, spikes, and serves should deliberately modify the ball's velocity based on custom volleyball logic.

After the action occurs, Rapier should resume simulating the ball normally.

## Project Architecture

Organize the code cleanly.

A suggested structure is:

```text
src/
  main.ts

  game/
    Game.ts
    GameState.ts
    Constants.ts

  world/
    Court.ts
    Net.ts

  entities/
    Player.ts
    Ball.ts

  controls/
    FirstPersonControls.ts
    InputManager.ts

  volleyball/
    VolleyballController.ts
    Bump.ts
    Set.ts
    Spike.ts
    Serve.ts
    Block.ts
    Dive.ts
    Trajectory.ts
    Rules.ts

  physics/
    PhysicsWorld.ts

  network/
    NetworkManager.ts
    Host.ts
    Client.ts
    Protocol.ts
    Signaling.ts
    Interpolation.ts

  ui/
    Menu.ts
    HUD.ts
    MultiplayerMenu.ts

  utils/
```

The exact architecture may change if another organization is cleaner, but maintain good separation between rendering, physics, volleyball logic, networking, and UI.

Avoid giant classes or a single enormous `main.ts`.

## First-Person Player

Create FPS-style controls.

Default controls:

- W — forward
- A — left
- S — backward
- D — right
- Mouse — look
- Space — jump
- Left Click — bump / receive
- Right Click — set
- E — spike
- Shift — dive

Use Pointer Lock for first-person mouse controls.

Prevent players from leaving the playable court area.

Movement should feel responsive rather than highly realistic.

Players should have:

- Position
- Velocity
- Facing direction
- Grounded state
- Jump state
- Current volleyball action
- Action cooldowns
- Team
- Player ID

Implement reasonable acceleration/deceleration rather than extremely slippery movement.

## Camera

Use a first-person camera positioned around head height.

Mouse movement controls yaw and pitch.

Clamp vertical camera rotation to a reasonable range.

The player needs to be able to:

- Look upward to track sets
- Look downward while attacking
- Quickly follow the ball
- See the net while approaching

Avoid excessive camera bobbing.

## Volleyball Court

Create a recognizable indoor volleyball court.

Include:

- Court floor
- Boundary lines
- Center line
- Volleyball net
- Net posts
- Attack lines
- Simple surrounding gym environment

Exact official dimensions are preferred where practical, but gameplay can adjust dimensions slightly if needed.

The net should physically interact with the ball.

Players should not be able to walk through the net.

## Ball Physics

Create a volleyball using a Rapier rigid body.

The ball should have:

- Gravity
- Velocity
- Angular velocity where useful
- Floor collision
- Net collision
- Player/action interaction
- Reasonable restitution

Tune gravity and drag to make volleyball trajectories satisfying.

Physics may intentionally differ from real-world volleyball.

Keep important physics constants in a central configuration file so they are easy to tune.

Examples:

```text
BALL_GRAVITY_SCALE
BALL_RESTITUTION
BUMP_POWER
SET_POWER
SPIKE_POWER
SERVE_POWER
PLAYER_SPEED
PLAYER_JUMP_FORCE
ACTION_RANGE
```

Do not scatter unexplained magic numbers throughout the project.

## Assisted Volleyball Actions

This is one of the most important systems.

Do not require the player's rendered arms to physically collide perfectly with the ball.

Each action should have an invisible assist volume.

The assist volume should account for:

- Player position
- Facing direction
- Ball position
- Distance
- Ball height
- Timing
- Current action

Actions should have short timing windows.

If the ball is within a reasonable region during the active portion of an animation/action, perform the volleyball action.

The hit detection should be lenient enough that the game is fun.

Do not make the assist so strong that positioning and timing become irrelevant.

## Bump / Receive

Left Click performs a bump.

A bump should be primarily used for receiving low or incoming balls.

Create a generous hit region in front of and slightly above the player.

When successful:

- Redirect the ball upward.
- Send it toward the player's intended target.
- Reduce excessive incoming velocity where appropriate.
- Produce a controlled volleyball arc.

Player positioning and timing should influence accuracy.

Bad positioning should produce a less accurate pass rather than always completely missing.

The player should still be capable of whiffing if the ball is clearly outside the action region or the timing is very poor.

## Set

Right Click performs a set.

Sets should work primarily when the ball is above and slightly in front of the player.

The mechanic should be more assisted than a normal physical collision.

During a successful set, it is acceptable to briefly stabilize/control the ball for roughly 50–100 ms before launching it along the calculated trajectory.

The result should be:

- High arc
- Moderate velocity
- Predictable placement
- Suitable for another player to spike

The player should be able to control where the set goes.

## Spike

E performs a spike.

The player should generally:

1. Approach the net.
2. Jump.
3. Track the ball.
4. Time the spike.
5. Choose an attack direction.

Create a generous spike hit volume around and above the player's upper body.

A successful spike should apply strong velocity to the ball.

Allow directional control.

The player should be able to hit:

- Straight
- Cross-court
- Left
- Right
- Deep
- Sharp downward angles

Camera direction and/or the targeting system should influence the attack direction.

Looking farther downward should generally produce a sharper attack, within reasonable limits.

Timing should matter.

A well-timed spike should be:

- Faster
- More accurate
- Capable of a steeper downward trajectory

Poor timing should generally reduce power or accuracy instead of always causing a complete miss.

Extremely poor timing or positioning can result in a whiff.

## Blocking

Allow players near the net to jump and block.

The player's block region should become active while airborne near the net.

A ball entering this region should deflect naturally.

Blocking should use more physics-based behavior than setting, but still allow some leniency.

Players should be able to:

- Stuff a spike downward
- Deflect it upward
- Tool the block out of bounds

## Diving

Shift performs a dive.

The dive should:

- Quickly move the player in their movement/facing direction
- Temporarily lower their effective contact area
- Increase bump/receive reach
- Have a cooldown or recovery period

The player should not be able to spam dives continuously.

## Serving

Implement a simple serve mechanic.

Initially, support an easy standing serve.

The player should be able to:

1. Enter the serving position.
2. Initiate a serve.
3. Toss the ball automatically or semi-automatically.
4. Hit the serve.
5. Aim the serve toward the opposing court.

A more advanced jump serve can be added after the basic system works.

## Targeting System

A major problem with first-person volleyball is that the player needs to look at the incoming ball while also choosing where the outgoing ball should go.

Implement a lightweight targeting system to address this.

The player should have an intended volleyball target separate from their exact instantaneous camera direction.

For bumps and sets, this target represents approximately where the player wants the pass/set to arrive.

For spikes, it represents approximately where the player wants the ball to land.

Display a subtle target marker when useful.

Do not make it visually distracting.

Experiment with a system where camera movement adjusts the target, but the target can temporarily persist while the player tracks the ball.

The targeting system should feel intuitive with mouse controls.

## Trajectory Calculation

Create reusable trajectory utilities rather than hardcoding velocity vectors independently for every action.

For controlled actions such as sets and bumps, calculate an initial velocity that sends the ball toward a target with a desired arc.

Conceptually:

```text
ball position
      ↓
desired target
      ↓
desired arc / flight time
      ↓
calculate initial velocity
      ↓
apply velocity to Rapier ball
```

Create utilities such as:

```typescript
calculateArcVelocity(...)
calculateSpikeVelocity(...)
calculateServeVelocity(...)
```

Account for gravity.

This system should make sets and passes predictable.

## Action Feedback

Give the player clear feedback when an action occurs.

Use:

- Simple first-person hand/arm animation or placeholder geometry
- Ball hit sound
- Different sounds for bump/set/spike
- Small crosshair feedback
- Optional subtle screen feedback
- Ball velocity change
- Action cooldown animation

Do not require polished character assets for the initial implementation.

Procedural/simple placeholder player models are acceptable.

Gameplay comes first.

## Rules

Implement basic volleyball rules.

Track:

- Current score
- Serving team
- Ball in/out
- Ball touching the floor
- Net crossing
- Points
- Match reset

For the initial version, do not overcomplicate rules such as rotation violations.

Support rally scoring.

A default match can be first to 15, win by 2.

Make this configurable.

## Team Sizes

Architect multiplayer so that multiple players can exist, but build incrementally.

The development priority should be:

1. Single-player mechanics sandbox
2. 1v1
3. 2v2

The initial finished multiplayer version should at minimum support 1v1.

Design networking structures so that 2v2 can be added without rewriting the entire multiplayer layer.

If practical within the implementation, add 2v2.

Do not attempt 6v6 initially.

## Multiplayer Architecture

Use WebRTC DataChannels.

Do not create a traditional gameplay server.

One player should act as the authoritative host.

Architecture:

```text
             HOST BROWSER

         authoritative physics
              ball state
             game state
               score
                rules
                 |
        WebRTC DataChannels
         /       |       \
      Player   Player   Player
```

The host should be authoritative for:

- Ball physics
- Ball contacts
- Successful volleyball actions
- Score
- Rally state
- Serve state
- Match state

Clients send their inputs/state requests to the host.

Examples:

```text
movement input
camera orientation
jump
bump
set
spike
dive
```

Do not allow every browser to independently determine the authoritative ball state.

## Local Player Prediction

Do not make the local player's movement wait for the host.

Each player should immediately simulate their own movement locally.

Send movement/input information to the host.

Use host updates to correct major divergence when necessary.

The goal is responsive FPS movement despite network latency.

## Remote Player Interpolation

Do not snap remote players directly between network positions.

Maintain recent snapshots and interpolate remote player movement.

Create an interpolation buffer.

The result should visually smooth:

- Position
- Rotation
- Jumping
- Player actions

## Ball Networking

The host owns the authoritative volleyball.

Send ball snapshots frequently.

Snapshots should include values such as:

```typescript
{
    position,
    velocity,
    rotation,
    angularVelocity,
    timestamp
}
```

Clients should interpolate/extrapolate the ball between snapshots.

Avoid visible teleportation whenever possible.

When an authoritative volleyball contact occurs, synchronize the event immediately.

## DataChannels

Use separate channels if beneficial.

For example:

### Fast / Unreliable Channel

Configure:

```typescript
ordered: false
maxRetransmits: 0
```

Use it for rapidly changing state such as:

- Positions
- Velocities
- Camera direction
- Ball snapshots

Old packets should be discardable.

### Reliable Channel

Use an ordered reliable channel for:

- Player joined
- Player left
- Match started
- Point scored
- Serve started
- Rally reset
- Team selection
- Game configuration

Design a typed protocol in `Protocol.ts`.

Do not send arbitrary loosely structured objects throughout the project.

## Signaling Without a Server

The game must initially work without hosting a signaling server.

Implement manual WebRTC signaling.

Host workflow:

```text
Create Game
↓
Generate connection offer
↓
Display encoded connection code
↓
Host copies code and sends it to friend
```

Joining player:

```text
Join Game
↓
Paste host connection code
↓
Generate response code
↓
Copy response code
↓
Send response to host
```

Host:

```text
Paste response code
↓
Connect
```

Once established, gameplay communicates directly through WebRTC.

Encode signaling information into a copyable string, for example using JSON plus Base64 or another safe representation.

The UI should clearly guide players through this process.

Provide:

- Create Game
- Join Game
- Copy Offer
- Paste Offer
- Generate Answer
- Copy Answer
- Paste Answer
- Connection status

The application should not require Discord specifically; users can send codes however they want.

## ICE / STUN

Configure WebRTC with a reasonable public STUN server so direct connections can be established across NAT when possible.

Keep ICE configuration centralized.

Clearly document that some network configurations may require TURN and therefore pure peer-to-peer connectivity cannot be guaranteed for every pair of users.

Do not require TURN for the basic project.

## Multiplayer Menu

Create a clean menu with approximately:

```text
VOLLEYBALL

Play Solo

Create Multiplayer Game

Join Multiplayer Game

Settings
```

The multiplayer connection flow should explain what the user needs to copy/paste.

Display useful connection states:

```text
Creating offer...
Waiting for answer...
Connecting...
Connected
Connection failed
Disconnected
```

## HUD

During gameplay display:

- Score
- Team
- Current server
- Crosshair
- Action indicators
- Connection status for multiplayer
- Optional target marker

Keep the HUD minimal.

Do not obscure the first-person view.

## Debug Mode

Create a debug mode that can be toggled during development.

It should be able to visualize:

- Player collider
- Ball collider
- Bump assist volume
- Set assist volume
- Spike assist volume
- Block volume
- Intended target
- Ball velocity
- Ball trajectory prediction
- Network statistics if available

This is important for tuning gameplay.

Make it easy to disable for production.

## Solo Development Mode

Before multiplayer is connected, the game must be fully testable locally.

Create a solo sandbox mode where the player can:

- Spawn/reset the ball
- Practice bumps
- Practice sets
- Practice spikes
- Serve
- Reset the rally

Optionally include a simple ball launcher so the player can practice receiving.

This mode should make development and tuning possible without establishing WebRTC connections.

## Graphics

Do not spend excessive time on assets initially.

Use simple but clean geometry.

Create:

- Gym floor
- Volleyball court
- Net
- Ball
- Basic player models
- Basic hands/arms if useful
- Lighting
- Simple gym environment

Use Three.js lighting and shadows carefully so performance remains good.

The game should run smoothly on an ordinary laptop.

Do not require a high-end GPU.

## Audio

Use simple placeholder/generated/local audio assets if available and legally appropriate.

At minimum design the audio system for:

- Ball bump
- Set
- Spike
- Floor impact
- Net impact
- Whistle
- Point scored

The game should still function if audio assets are unavailable.

## Performance

Target approximately 60 FPS on a typical modern laptop.

Avoid:

- Excessive physics bodies
- Huge textures
- Extremely high-poly assets
- Unnecessary allocations every frame
- Excessive network traffic

Use a fixed timestep for physics where appropriate.

Keep rendering and physics updates cleanly separated.

## Responsive Web Behavior

The primary target is desktop keyboard + mouse.

Show a clear message on unsupported mobile/touch-only devices rather than attempting poor mobile FPS controls.

Handle browser resizing.

Pause or appropriately handle gameplay when pointer lock is lost.

## GitHub Pages Deployment

Configure Vite correctly for GitHub Pages.

Include:

- Production build script
- Correct Vite base path handling
- GitHub Actions workflow for GitHub Pages deployment
- README deployment instructions

The following should work:

```bash
npm install
npm run dev
npm run build
```

The resulting build must not require a backend server.

## README

Write a thorough README containing:

- Project description
- Screenshots section placeholder
- Features
- Controls
- Architecture
- Tech stack
- Local development instructions
- Build instructions
- GitHub Pages deployment instructions
- Multiplayer connection instructions
- Explanation of WebRTC
- Explanation of host authority
- Known networking limitations
- STUN/TURN explanation
- Future improvements

## Code Quality

Use TypeScript types throughout the project.

Avoid `any` unless genuinely necessary.

Use descriptive class/function names.

Document complicated networking and trajectory calculations.

Keep systems modular.

Prefer small focused functions.

Clean up:

- Three.js resources
- Rapier bodies
- Event listeners
- WebRTC connections
- Pointer lock state

when appropriate.

Handle connection failures without crashing.

## Implementation Order

Implement this project incrementally.

### Phase 1 — Environment

Set up:

- Vite
- TypeScript
- Three.js
- Rapier
- Basic application structure
- GitHub Pages build configuration

Verify the project builds.

### Phase 2 — Court

Implement:

- Camera
- Court
- Net
- Lighting
- Basic environment

### Phase 3 — FPS Player

Implement:

- Pointer lock
- WASD
- Mouse look
- Player collider
- Jumping
- Court boundaries

### Phase 4 — Volleyball Physics

Implement:

- Ball
- Gravity
- Court collisions
- Net collisions
- Reset functionality

### Phase 5 — Volleyball Actions

Implement and tune:

1. Bump
2. Set
3. Jump
4. Spike
5. Block
6. Dive
7. Serve

Do not continue until the bump → set → spike loop feels reasonably playable.

### Phase 6 — Targeting

Implement:

- Pass target
- Set target
- Spike target
- Target visualization
- Trajectory calculations

### Phase 7 — Rules

Implement:

- Rally state
- Ball in/out
- Floor contacts
- Score
- Serving
- Match resets

### Phase 8 — Solo Practice

Implement:

- Practice mode
- Ball reset
- Ball launcher
- Debug visualization

### Phase 9 — WebRTC

Implement:

- Peer connections
- DataChannels
- Manual signaling
- Offer/answer UI
- STUN
- Connection states

### Phase 10 — Multiplayer 1v1

Implement:

- Host authority
- Input synchronization
- Player synchronization
- Local prediction
- Remote interpolation
- Ball synchronization
- Scoring synchronization

### Phase 11 — Multiplayer Improvements

Improve:

- Lag handling
- Interpolation
- Reconciliation
- Disconnect handling
- Joining flow

Then architect/add 2v2 if practical.

### Phase 12 — Polish

Add:

- Animations
- Sounds
- Better visual feedback
- Improved UI
- Settings
- Performance optimization

## Important Gameplay Requirement

Do not get stuck trying to make everything physically realistic.

The central gameplay loop should feel like:

```text
READ BALL
    ↓
MOVE INTO POSITION
    ↓
BUMP
    ↓
TEAMMATE POSITIONS
    ↓
SET
    ↓
APPROACH
    ↓
JUMP
    ↓
TIME SPIKE
    ↓
AIM
    ↓
ATTACK
```

The game should reward:

- Positioning
- Ball reading
- Timing
- Teamwork
- Aim
- Choosing the correct action

It should NOT primarily reward fighting with the physics engine.

## Important Multiplayer Requirement

Do not synchronize every Three.js object.

Synchronize meaningful game state.

Clients should render/interpolate from that state.

The host should be authoritative for important gameplay decisions, especially the volleyball.

Networking code should be designed separately from rendering code so multiplayer can be modified later without rewriting the entire game.

## Extensibility

Structure the project so future versions could add:

- 2v2
- 3v3
- 6v6
- Matchmaking
- Room codes through a lightweight signaling server
- TURN support
- Character customization
- Different gyms
- Ranked/unranked games
- Spectators
- AI opponents
- Jump serves
- Float serves
- Tips
- Roll shots
- Better blocking
- Diving/rolling animations
- Team formations
- Volleyball rotations

Do not implement all of these now.

The current priority is a polished core volleyball experience.

## Acceptance Criteria

The project is successful when:

1. `npm install` succeeds.
2. `npm run dev` launches the game.
3. `npm run build` produces a static deployable build.
4. The build works on GitHub Pages.
5. The player can move around a 3D volleyball court in first person.
6. The player can jump.
7. The volleyball has working 3D physics.
8. The ball interacts with the floor and net.
9. The player can bump.
10. The player can set.
11. The player can jump and spike.
12. The player can serve.
13. Bump/set/spike use forgiving assist volumes rather than requiring perfect collisions.
14. The player can intentionally control where the ball goes.
15. Timing and positioning still matter.
16. Solo practice is playable.
17. Two browsers can establish a WebRTC connection using manual copy/paste signaling.
18. Two players can play a 1v1 rally.
19. The host controls authoritative ball/game state.
20. Remote movement is interpolated rather than constantly teleporting.
21. The game keeps score.
22. A match can reset/start again without refreshing the page.
23. Multiplayer disconnections do not crash the application.
24. Debug tools exist for tuning hit regions and trajectories.
25. The codebase is modular enough to expand to 2v2.

## Development Instructions

Work autonomously through the implementation rather than only generating an outline.

Start by inspecting the existing repository, if any.

If the repository is empty, initialize the project.

Implement the game phase by phase.

After each major phase:

1. Run the TypeScript/compiler checks.
2. Run the production build.
3. Fix errors before continuing.
4. Check for obvious runtime issues.
5. Keep the project in a runnable state.

Do not stop after creating boilerplate.

Do not leave the core mechanics as TODO comments or pseudocode.

Implement functional versions of the systems.

When a sophisticated feature cannot reasonably be completed immediately, implement the simplest functional version first and structure it so it can be improved later.

For example:

- Use primitive player models before finding character models.
- Use simple action animations before skeletal animations.
- Use manual WebRTC signaling before building room-code signaling.
- Get 1v1 working before 2v2.
- Use simple sounds before building a complete audio system.

Do not sacrifice the working core game to prematurely polish secondary features.

Most importantly, spend significant effort tuning the bump, set, spike, ball trajectories, movement, jumping, and targeting mechanics. Those systems determine whether the game is actually enjoyable.