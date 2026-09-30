import RAPIER from '@dimforge/rapier3d';
import { C } from '../game/Constants';
import type { BallState, PlayerState, Vec3 } from '../game/Types';
export class PhysicsWorld {
  world = new RAPIER.World({ x: 0, y: -C.gravity, z: 0 });
  events = new RAPIER.EventQueue(true);
  ball: RAPIER.RigidBody;
  ballCollider: RAPIER.Collider;
  floor: RAPIER.Collider;
  net: RAPIER.Collider;
  private players = new Map<string, RAPIER.RigidBody>();
  private disposed = false;
  constructor() {
    this.world.timestep = C.dt;
    this.floor = this.fixed(15, 0.1, 19, 0, -0.1, 0);
    this.net = this.fixed(4.6, C.netHeight / 2, 0.035, 0, C.netHeight / 2, 0);
    this.fixed(0.15, 5, 19, -14, 5, 0); this.fixed(0.15, 5, 19, 14, 5, 0);
    this.fixed(14, 5, 0.15, 0, 5, -18); this.fixed(14, 5, 0.15, 0, 5, 18);
    this.ball = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 5).setCcdEnabled(true).setLinearDamping(0).setAngularDamping(0.2));
    this.ballCollider = this.world.createCollider(RAPIER.ColliderDesc.ball(C.ballRadius).setRestitution(C.restitution).setFriction(0.25).setDensity(1).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), this.ball);
  }
  private fixed(x: number, y: number, z: number, px: number, py: number, pz: number) {
    return this.world.createCollider(RAPIER.ColliderDesc.cuboid(x, y, z).setTranslation(px, py, pz).setRestitution(0.35));
  }
  syncPlayer(p: PlayerState) {
    let body = this.players.get(p.id);
    if (!body) {
      body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.position.x, p.position.y + 0.9, p.position.z));
      this.world.createCollider(RAPIER.ColliderDesc.capsule(0.5, C.playerRadius).setRestitution(0.1).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
      this.players.set(p.id, body);
    }
    body.setNextKinematicTranslation({ x: p.position.x, y: p.position.y + (p.action === 'dive' ? 0.4 : 0.9), z: p.position.z });
  }
  reset(position: Vec3) { this.ball.setTranslation(position, true); this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true); this.ball.setAngvel({ x: 0, y: 0, z: 0 }, true); }
  launch(velocity: Vec3) { this.ball.setLinvel(velocity, true); this.ball.setAngvel({ x: velocity.z * 0.4, y: 1, z: -velocity.x * 0.4 }, true); }
  state(): BallState { return { position: { ...this.ball.translation() }, velocity: { ...this.ball.linvel() }, rotation: { ...this.ball.rotation() }, angularVelocity: { ...this.ball.angvel() } }; }
  step(onContact: (kind: 'floor' | 'net' | string) => void) {
    this.world.step(this.events);
    this.events.drainCollisionEvents((a, b, started) => {
      if (!started || (a !== this.ballCollider.handle && b !== this.ballCollider.handle)) return;
      const collider = a === this.ballCollider.handle ? b : a;
      if (collider === this.floor.handle) onContact('floor');
      else if (collider === this.net.handle) onContact('net');
      else for (const [id, body] of this.players) if (body.collider(0).handle === collider) onContact(id);
    });
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.players.clear(); this.events.free(); this.world.free(); }
}
