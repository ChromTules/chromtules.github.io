import * as T from 'three';
import { C } from '../game/Constants';
export function createCourt(scene: T.Scene) {
  scene.background = new T.Color('#a9c2cd'); scene.fog = new T.Fog('#a9c2cd', 26, 65);
  scene.add(new T.HemisphereLight(0xe9f5ff, 0x847660, 2.2));
  const sun = new T.DirectionalLight(0xfff5df, 3.1); sun.position.set(-8, 16, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 18, bottom: -18, far: 45 }); sun.shadow.bias = -0.001; scene.add(sun);
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, roughness = 0.8) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color, roughness }));
    mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = h > 0.1; scene.add(mesh); return mesh;
  };
  box(28, 0.15, 36, 0, -0.1, 0, '#bd915d');
  // Long maple boards keep the court grounded without textures or downloads.
  for (let x = -13.5; x < 14; x += 0.6) box(0.018, 0.003, 36, x, -0.02, 0, '#a77c4f');
  box(9, 0.015, 18, 0, 0.005, 0, '#247fa3');
  for (const x of [-4.5, 4.5]) box(0.065, 0.018, 18.06, x, 0.018, 0, '#f4f8fa');
  for (const z of [-9, -3, 0, 3, 9]) box(9.06, 0.019, 0.065, 0, 0.018, z, '#f4f8fa');
  for (const x of [-4.9, 4.9]) { box(0.18, 2.75, 0.18, x, 1.375, 0, '#dee8eb'); box(0.32, 1.75, 0.32, x, 0.875, 0, '#143952'); }
  const gridPositions: number[] = [];
  for (let x = -4.6; x <= 4.61; x += 0.18) gridPositions.push(x, 0.85, 0, x, C.netHeight, 0);
  for (let y = 0.85; y <= C.netHeight; y += 0.18) gridPositions.push(-4.6, y, 0, 4.6, y, 0);
  const grid = new T.BufferGeometry(); grid.setAttribute('position', new T.Float32BufferAttribute(gridPositions, 3));
  scene.add(new T.LineSegments(grid, new T.LineBasicMaterial({ color: '#233944', transparent: true, opacity: 0.7 })));
  box(9.3, 0.085, 0.07, 0, C.netHeight, 0, '#f4f8fa'); box(9.3, 0.04, 0.04, 0, 0.85, 0, '#e9f0f3');
  for (const x of [-4.5, 4.5]) box(0.03, 0.8, 0.03, x, C.netHeight + 0.4, 0, '#ef7947');
  box(28, 8, 0.25, 0, 4, -18, '#d5e0e3'); box(28, 8, 0.25, 0, 4, 18, '#d5e0e3');
  for (const x of [-14, 14]) {
    box(0.25, 8, 36, x, 4, 0, '#d5e0e3'); box(0.3, 1.8, 36, x, 0.9, 0, '#143952');
    for (let z = -14; z <= 14; z += 7) { box(0.35, 3, 4.5, x * 0.995, 5.2, z, '#b1d5e6'); box(0.5, 0.08, 4.5, x * 0.991, 5.2, z, '#eef6f9'); }
  }
  for (const z of [-18, 18]) box(28, 1.8, 0.3, 0, 0.9, z, '#143952');
  for (const z of [-13, -6, 1, 8, 15]) box(28, 0.25, 0.22, 0, 8, z, '#78919d');
  for (const x of [-9, 9]) for (const z of [-8, 0, 8]) { box(1.7, 0.08, 0.65, x, 7.85, z, '#ffffff'); }
  for (const x of [-9, 9]) { box(1.2, 0.16, 10, x, 0.65, 1, '#aa7751'); for (const z of [-3, 5]) box(0.8, 0.6, 0.15, x, 0.3, z, '#143952'); }
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#143952'; ctx.fillRect(0, 0, 1024, 256); ctx.fillStyle = '#f4f8fa'; ctx.font = 'italic 130px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SIDEOUT', 512, 165);
  const banner = new T.Mesh(new T.PlaneGeometry(8, 2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(canvas) })); banner.position.set(0, 5.1, -17.8); scene.add(banner);
}
