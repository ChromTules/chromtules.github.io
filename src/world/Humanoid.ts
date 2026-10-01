import * as T from 'three';
import type { PlayerState } from '../game/Types';
import { swingPhase } from '../volleyball/Actions';

/** Lightweight articulated athlete, built locally with no external model downloads. */
export function createHumanoid(team: number): T.Group {
  const root = new T.Group(), rig = new T.Group(); rig.name = 'rig'; root.add(rig);
  const shirt = new T.MeshStandardMaterial({ color: team === 0 ? '#299cc7' : '#ec683c', roughness: 0.85 });
  const shorts = new T.MeshStandardMaterial({ color: '#18354c' });
  const skin = new T.MeshStandardMaterial({ color: team === 0 ? '#b9805c' : '#d5a07b' });
  const white = new T.MeshStandardMaterial({ color: '#f5f4e8' }), dark = new T.MeshStandardMaterial({ color: '#252a30' });
  const box = (parent: T.Object3D, name: string, size: number[], pos: number[], material: T.Material) => {
    const mesh = new T.Mesh(new T.BoxGeometry(...size as [number, number, number]), material); mesh.name = name; mesh.position.set(...pos as [number, number, number]); mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  const joint = (parent: T.Object3D, name: string, x: number, y: number, z = 0) => { const j = new T.Group(); j.name = name; j.position.set(x, y, z); parent.add(j); return j; };
  const segment = (parent: T.Object3D, name: string, radius: number, length: number, material: T.Material) => {
    const mesh = new T.Mesh(new T.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 4, 8), material); mesh.name = name; mesh.position.y = -length / 2; mesh.castShadow = true; parent.add(mesh);
  };
  box(rig, 'hips', [0.34, 0.22, 0.23], [0, 0.87, 0], shorts);
  const torso = box(rig, 'torso', [0.43, 0.46, 0.25], [0, 1.2, 0], shirt);
  for (const x of [-0.18, 0.18]) box(torso, 'jerseyStripe', [0.025, 0.44, 0.26], [x, 0, 0], white);
  box(torso, 'jerseyNumber', [0.045, 0.19, 0.01], [0, 0, 0.132], white);
  segment(joint(rig, 'neck', 0, 1.51), 'neckSkin', 0.065, 0.12, skin);
  const head = new T.Mesh(new T.SphereGeometry(0.165, 12, 10), skin); head.name = 'head'; head.scale.set(0.87, 1.13, 0.93); head.position.y = 1.67; head.castShadow = true; rig.add(head);
  const hair = new T.Mesh(new T.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), dark); hair.position.y = 1.71; rig.add(hair);
  for (const x of [-0.055, 0.055]) box(rig, 'eye', [0.025, 0.025, 0.018], [x, 1.69, -0.15], dark);
  box(rig, 'nose', [0.035, 0.045, 0.04], [0, 1.645, -0.16], skin);
  for (const [side, sign] of [['left', -1], ['right', 1]] as const) {
    const shoulder = joint(rig, `${side}Shoulder`, sign * 0.255, 1.39);
    segment(shoulder, `${side}Sleeve`, 0.09, 0.16, shirt); segment(shoulder, `${side}UpperArm`, 0.066, 0.3, skin);
    const elbow = joint(shoulder, `${side}Elbow`, 0, -0.3); segment(elbow, `${side}Forearm`, 0.058, 0.3, skin);
    box(elbow, `${side}Hand`, [0.10, 0.13, 0.06], [0, -0.34, 0], skin);
    const hip = joint(rig, `${side}Hip`, sign * 0.12, 0.87);
    segment(hip, `${side}Shorts`, 0.11, 0.23, shorts); segment(hip, `${side}Thigh`, 0.087, 0.39, skin);
    const knee = joint(hip, `${side}Knee`, 0, -0.39); segment(knee, `${side}Shin`, 0.065, 0.36, skin);
    box(knee, `${side}Kneepad`, [0.145, 0.13, 0.09], [0, -0.015, -0.045], dark);
    box(knee, `${side}Sock`, [0.115, 0.16, 0.13], [0, -0.27, 0], white);
    box(knee, `${side}Shoe`, [0.15, 0.10, 0.27], [0, -0.39, -0.055], white);
    box(knee, `${side}Sole`, [0.155, 0.025, 0.275], [0, -0.435, -0.055], dark);
  }
  const joints: Record<string, T.Object3D> = {}; root.traverse(o => { if (o.name) joints[o.name] = o; }); root.userData.joints = joints;
  return root;
}

export function animateHumanoid(model: T.Group, p: PlayerState, time: number) {
  const j = model.userData.joints as Record<string, T.Object3D>;
  const speed = Math.min(1, Math.hypot(p.velocity.x, p.velocity.z) / 5.8), stride = Math.sin(time * 11) * speed;
  const passing = p.action === 'pass' || (p.action === 'bump' && p.actionUntil > time);
  const active = p.actionUntil > time, swing = Math.sin(swingPhase(p, time) * Math.PI);
  j.rig.rotation.set(0, 0, 0); j.rig.position.y = Math.abs(stride) * 0.025;
  for (const [side, sign] of [['left', -1], ['right', 1]] as const) {
    j[`${side}Hip`].rotation.x = p.grounded ? stride * sign * 0.7 : -0.3;
    j[`${side}Knee`].rotation.x = p.grounded ? Math.max(0, -stride * sign) * 0.9 : 0.7;
    const arm = j[`${side}Shoulder`], elbow = j[`${side}Elbow`]; arm.rotation.set(-stride * sign * 0.45, 0, sign * -0.08); elbow.rotation.x = -0.15;
    if (passing) { arm.rotation.set(1.22 + swing * 0.65, 0, -sign * 0.28); elbow.rotation.x = 0.08; }
    if (p.action === 'block' || (p.action === 'set' && active)) { arm.rotation.set(2.9, 0, sign * 0.12); elbow.rotation.x = p.action === 'set' ? -0.35 : -0.1; }
    if ((p.action === 'spike' && active) || (p.action === 'serve' && active)) {
      arm.rotation.x = side === 'right' ? 2.8 - Math.sin(time * 12) * 0.5 : 1.2; elbow.rotation.x = side === 'right' ? -0.45 : -0.2;
    }
    if (p.serve.stage === 'charging') { arm.rotation.x = side === 'left' ? 1 : -0.3; elbow.rotation.x = -0.2; }
    if (p.action === 'dive' && time < p.diveUntil) { j.rig.rotation.x = -1.3; j.rig.position.y = 0.24; arm.rotation.x = 2.7; elbow.rotation.x = 0; }
  }
}
