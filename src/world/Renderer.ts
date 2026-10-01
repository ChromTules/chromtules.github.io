import * as T from 'three';
import { C } from '../game/Constants';
import type { BallState, PlayerState, Vec3 } from '../game/Types';
import { createCourt } from './Court';
import { cameraPose } from './Camera';
import { swingPhase } from '../volleyball/Actions';
export class Renderer {
  scene = new T.Scene(); camera = new T.PerspectiveCamera(78, 1, 0.04, 100);
  renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  ball = new T.Group(); target: T.Mesh; arms = new T.Group();
  private players = new Map<string, T.Group>();
  private abort = new AbortController();
  private trail: T.Mesh[] = [];
  private debugObjects: T.Object3D[] = [];
  private vector = new T.Vector3();
  debug = false;
  firstPerson = false;
  constructor(container: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.domElement.id = 'court'; container.append(this.renderer.domElement);
    createCourt(this.scene); this.camera.rotation.order = 'YXZ'; this.scene.add(this.camera);
    const core = new T.Mesh(new T.SphereGeometry(C.ballRadius, 24, 16), new T.MeshStandardMaterial({ color: '#fff2d9', roughness: 0.5 })); core.castShadow = true; this.ball.add(core);
    for (let n = 0; n < 3; n++) { const band = new T.Mesh(new T.TorusGeometry(C.ballRadius * 0.985, 0.021, 6, 40), new T.MeshStandardMaterial({ color: n === 1 ? '#143952' : '#ef7947' })); band.rotation.set(n * Math.PI / 3, n * 0.9, n * 0.6); this.ball.add(band); }
    this.scene.add(this.ball);
    this.target = new T.Mesh(new T.RingGeometry(0.24, 0.3, 40), new T.MeshBasicMaterial({ color: '#ffcf84', side: T.DoubleSide, transparent: true, opacity: 0.8 })); this.target.rotation.x = -Math.PI / 2; this.scene.add(this.target);
    for (const x of [-0.23, 0.23]) { const arm = new T.Mesh(new T.CapsuleGeometry(0.065, 0.42, 4, 8), new T.MeshStandardMaterial({ color: '#e5b493', depthTest: false })); arm.rotation.x = Math.PI / 2; arm.position.set(x, -0.37, -0.45); arm.renderOrder = 10; this.arms.add(arm); }
    this.camera.add(this.arms);
    for (let n = 0; n < 24; n++) { const dot = new T.Mesh(new T.SphereGeometry(0.032, 5, 4), new T.MeshBasicMaterial({ color: '#ffc76d' })); dot.visible = false; this.scene.add(dot); this.trail.push(dot); }
    window.addEventListener('resize', () => this.resize(), { signal: this.abort.signal }); this.resize();
  }
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); }
  quality(high: boolean) { this.renderer.setPixelRatio(high ? Math.min(devicePixelRatio, 1.5) : 1); this.renderer.shadowMap.enabled = high; }
  update(ball: BallState, players: PlayerState[], local: PlayerState | undefined, target: Vec3, time: number, menu: boolean) {
    this.ball.position.copy(ball.position); this.ball.quaternion.copy(ball.rotation);
    this.target.position.set(target.x, 0.04, target.z); this.target.visible = !menu;
    this.arms.visible = !menu && this.firstPerson;
    if (menu) { this.camera.position.set(12, 7.2, 14); this.camera.lookAt(0, 1.1, -1); }
    else if (local) {
      const dive = time < local.diveUntil;
      const pose = cameraPose(local, this.firstPerson, time);
      this.camera.position.copy(pose.position);
      this.camera.rotation.set(pose.pitch, pose.yaw, dive && this.firstPerson ? 0.07 : 0, 'YXZ');
      const active = local.action === 'block' || (local.action && local.actionUntil > time);
      this.arms.position.y = active ? (local.action === 'set' || local.action === 'spike' || local.action === 'block' ? 0.5 : 0.1) : -0.15;
      this.arms.rotation.x = active ? -0.25 : 0;
      if (local.action === 'pass' || local.action === 'bump') {
        const swing = Math.sin(swingPhase(local, time) * Math.PI);
        this.arms.position.y = -0.05 + swing * 0.24; this.arms.rotation.x = -swing * 0.65;
        this.arms.children.forEach((arm, i) => { arm.position.x = i === 0 ? -0.10 : 0.10; });
      } else this.arms.children.forEach((arm, i) => { arm.position.x = i === 0 ? -0.23 : 0.23; });
    }
    for (const p of players) {
      let model = this.players.get(p.id);
      if (!model) { model = this.playerModel(p.team); this.players.set(p.id, model); this.scene.add(model); }
      const shown = p.id === local?.id ? local : p;
      model.visible = p.id !== local?.id || menu || !this.firstPerson; model.position.copy(shown.position); model.rotation.y = shown.yaw;
      model.scale.y = p.action === 'dive' ? 0.55 : 1;
      const raised = shown.action === 'block' || ((shown.action === 'set' || shown.action === 'spike') && shown.actionUntil > time);
      const passing = shown.action === 'pass' || (shown.action === 'bump' && shown.actionUntil > time);
      model.children.slice(2).forEach((arm, i) => {
        const swing = Math.sin(swingPhase(shown, time) * Math.PI);
        arm.rotation.x = raised ? Math.PI : passing ? Math.PI / 2 + swing * 0.65 : 0.12;
        arm.rotation.z = passing ? (i === 0 ? 0.32 : -0.32) : 0;
      });
    }
    for (const [id, model] of this.players) if (!players.some(p => p.id === id)) model.visible = false;
    this.trail.forEach((dot, n) => { dot.visible = this.debug; const t = n * 0.075; dot.position.set(ball.position.x + ball.velocity.x * t, ball.position.y + ball.velocity.y * t - 0.5 * C.gravity * t * t, ball.position.z + ball.velocity.z * t); if (dot.position.y < 0) dot.visible = false; });
    if (this.debug && local) this.drawDebug(local, ball);
    else this.clearDebug();
    this.renderer.render(this.scene, this.camera);
  }
  private playerModel(team: number) {
    const group = new T.Group(), shirt = new T.MeshStandardMaterial({ color: team === 0 ? '#55b6dc' : '#ef7947' }), skin = new T.MeshStandardMaterial({ color: '#d3a17b' });
    const body = new T.Mesh(new T.CapsuleGeometry(0.26, 0.75, 4, 8), shirt); body.position.y = 0.85; body.castShadow = true; group.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.2, 12, 8), skin); head.position.y = 1.65; group.add(head);
    for (const x of [-0.25, 0.25]) { const pivot = new T.Group(); pivot.position.set(x, 1.25, 0); const arm = new T.Mesh(new T.CapsuleGeometry(0.065, 0.68, 4, 8), skin); arm.position.y = -0.34; pivot.add(arm); group.add(pivot); }
    return group;
  }
  private drawDebug(p: PlayerState, ball: BallState) {
    if (!this.debugObjects.length) {
      for (const [radius, color] of [[C.bumpRange, '#59ffa6'], [C.setRange, '#ffee65'], [C.spikeRange, '#ff7759'], [C.blockRange, '#bd89ff'], [C.playerRadius, '#ffffff'], [C.ballRadius, '#ffffff']] as const) {
        const mesh = new T.Mesh(new T.SphereGeometry(radius, 12, 8), new T.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.35 })); this.scene.add(mesh); this.debugObjects.push(mesh);
      }
      const arrow = new T.ArrowHelper(new T.Vector3(0, 1, 0), new T.Vector3(), 1, 0xffcc66); this.scene.add(arrow); this.debugObjects.push(arrow);
    }
    [1, 2.1, 2.5, 2.4, 0.85].forEach((height, i) => { this.debugObjects[i].position.set(p.position.x, p.position.y + height, p.position.z); this.debugObjects[i].scale.y = i === 4 ? 2.7 : 0.35; });
    this.debugObjects[5].position.copy(ball.position);
    const arrow = this.debugObjects[6] as T.ArrowHelper; arrow.position.copy(ball.position); this.vector.copy(ball.velocity); const length = this.vector.length(); if (length > 0.01) { arrow.setDirection(this.vector.normalize()); arrow.setLength(Math.min(length * 0.2, 4)); }
  }
  private clearDebug() { for (const object of this.debugObjects) { this.scene.remove(object); object.traverse(o => { if (o instanceof T.Mesh || o instanceof T.Line) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => m.dispose()); } }); } this.debugObjects = []; }
  dispose() { this.abort.abort(); this.clearDebug(); this.scene.traverse(o => { if (o instanceof T.Mesh || o instanceof T.Line) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => { const map = (m as T.MeshStandardMaterial).map; map?.dispose(); m.dispose(); }); } }); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
