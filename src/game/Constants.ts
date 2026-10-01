export const C = {
  dt: 1 / 60, gravity: 9.81, ballRadius: 0.21, restitution: 0.62,
  courtX: 4.5, courtZ: 9, runX: 6.5, runZ: 11.5, netHeight: 2.43,
  speed: 5.8, acceleration: 32, jumpSpeed: 6.8, playerRadius: 0.32, eye: 1.64,
  diveSpeed: 10, diveDuration: 0.48, diveCooldown: 1.65,
  actionWindow: 0.22, actionCooldown: 0.36, contactGap: 0.20,
  bumpRange: 1.15, setRange: 0.95, spikeRange: 1.1, blockRange: 0.85,
  bumpApex: 5.1, setApex: 6.0, spikePower: 17, serveApex: 5.6,
  snapshotInterval: 1 / 20, inputInterval: 1 / 30, interpolationDelay: 100,
  extrapolationLimit: 100, inputTimeout: 0.35, pointDelay: 2,
} as const;
export const ICE: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
