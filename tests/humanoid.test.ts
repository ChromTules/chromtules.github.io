import { it, expect } from 'vitest';
import { createHumanoid, animateHumanoid } from '../src/world/Humanoid';
import { createPlayer } from '../src/entities/PlayerMotor';
it('has articulated arms and legs and animates a running stride', () => {
  const model = createHumanoid(0), p = createPlayer('host', 0);
  for (const name of ['torso', 'head', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftHand', 'rightHand']) expect(model.getObjectByName(name)).toBeDefined();
  p.velocity.z = -5; animateHumanoid(model, p, 0.15);
  expect(model.getObjectByName('leftHip')!.rotation.x).not.toBe(model.getObjectByName('rightHip')!.rotation.x);
  p.action = 'pass'; animateHumanoid(model, p, 1);
  expect(model.getObjectByName('leftShoulder')!.rotation.x).toBeGreaterThan(1);
});
