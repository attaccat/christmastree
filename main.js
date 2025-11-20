import * as THREE from 'https://unpkg.com/three@0.163.0/build/three.module.js';

// === 结构 ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 45, 90);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);
const ORBIT_RADIUS = 21, ORBIT_SPEED = 0.1, CAMERA_TILT = THREE.MathUtils.degToRad(5);
camera.position.set(ORBIT_RADIUS, Math.sin(CAMERA_TILT) * ORBIT_RADIUS, 0);
camera.lookAt(0, 4.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const randCirclePoint = (r, rot = 0) => {
  const a = Math.random() * Math.PI * 2 + rot;
  return [r * Math.cos(a), r * Math.sin(a)];
};
const makeMaterial = (size, opacity = 1, vertexColors = true) =>
  new THREE.PointsMaterial({
    size,
    vertexColors,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

// === 树 ===
const TREE_HEIGHT = 14, TREE_RADIUS = 6, TREE_Y_BASE = -2, LAYERS = 14, PARTICLES_PER_LAYER = 1000;
const RIM_RATIO = 0.25, CONNECT_RATIO = 0.5, TRUNK_RATIO = 0.10, LEAF_NOISE_Y = 0.8,
      RIM_INNER = 0.6, CONNECT_SPREAD = 0.75, LAYER_ROTATION_STRENGTH = 1.0;

const BASE_LAYER_POINTS = LAYERS * PARTICLES_PER_LAYER;
const TRUNK_POINTS = Math.floor(BASE_LAYER_POINTS * TRUNK_RATIO);
const TREE_POINTS = BASE_LAYER_POINTS + TRUNK_POINTS;

const treePos  = new Float32Array(TREE_POINTS * 3);
const treeCol  = new Float32Array(TREE_POINTS * 3);
const treeBase = new Float32Array(TREE_POINTS * 3);
const treePhase= new Float32Array(TREE_POINTS);
const treeAmp  = new Float32Array(TREE_POINTS);

const color = new THREE.Color();
let p = 0;
function pushTreePoint(x, y, z) {
  treePos.set([x, y, z], p * 3);
  color.setHSL(0.9 + Math.random() * 0.06, 0.6 + Math.random() * 0.25, 0.55 + Math.random() * 0.35);
  treeCol.set([color.r, color.g, color.b], p * 3);
  treeBase.set([color.r, color.g, color.b], p * 3);
  treePhase[p] = Math.random() * Math.PI * 2;
  treeAmp[p]   = 0.5 + Math.random() * 0.3;
  p++;
}

// 树干
for (let i = 0; i < TRUNK_POINTS; i++) {
  const y = TREE_Y_BASE + Math.random() * TREE_HEIGHT;
  const [x, z] = randCirclePoint((0.06 + Math.random() * 0.06) * TREE_RADIUS);
  pushTreePoint(x, y, z);
}
// 树枝树叶
for (let layer = 0; layer < LAYERS; layer++) {
  const h = layer / (LAYERS - 1);
  const yC = TREE_Y_BASE + h * TREE_HEIGHT;
  const radius = (1 - h) * TREE_RADIUS;
  const rot = (Math.random() * 2 - 1) * Math.PI * LAYER_ROTATION_STRENGTH;

  const count = PARTICLES_PER_LAYER;
  const rim   = Math.floor(count * RIM_RATIO);
  const conn  = Math.floor(count * CONNECT_RATIO);
  const leaf  = Math.max(0, count - rim - conn);

  for (let i = 0; i < rim; i++) {
    const [x, z] = randCirclePoint(radius * (RIM_INNER + Math.random() * (1 - RIM_INNER)), rot);
    const y = yC + (Math.random() - 0.5) * LEAF_NOISE_Y * 0.5;
    pushTreePoint(x, y, z);
  }
  for (let i = 0; i < conn; i++) {
    const other = THREE.MathUtils.clamp(layer + (Math.random() < 0.5 ? -1 : 1), 0, LAYERS - 1);
    const h2 = other / (LAYERS - 1);
    const y2 = TREE_Y_BASE + h2 * TREE_HEIGHT;
    const r2 = (1 - h2) * TREE_RADIUS;
    const r  = THREE.MathUtils.lerp(radius, r2, Math.random()) * (0.85 + Math.random() * 0.3) * CONNECT_SPREAD;
    const [x, z] = randCirclePoint(r, rot);
    pushTreePoint(x, THREE.MathUtils.lerp(yC, y2, Math.random()), z);
  }
  for (let i = 0; i < leaf; i++) {
    const [x, z] = randCirclePoint(radius * Math.pow(Math.random(), 0.6), rot);
    const y = yC + (Math.random() - 0.5) * LEAF_NOISE_Y;
    pushTreePoint(x * (0.97 + Math.random() * 0.06), y, z);
  }
}
while (p < TREE_POINTS) pushTreePoint(0, TREE_Y_BASE + TREE_HEIGHT, 0);

const treeGeo = new THREE.BufferGeometry();
treeGeo.setAttribute('position', new THREE.BufferAttribute(treePos, 3));
treeGeo.setAttribute('color', new THREE.BufferAttribute(treeCol, 3));
const tree = new THREE.Points(treeGeo, makeMaterial(0.05, 0.95));

// === 光球 ===
const STAR_POINTS = 2000;
const STAR_BASE_R = 0.6, STAR_SPIKE_R = 1.2, STAR_SPIKE_CHANCE = 0.35;
const STAR_Y = TREE_Y_BASE + TREE_HEIGHT + 0.8;
const starPos = new Float32Array(STAR_POINTS * 3);
const starCol = new Float32Array(STAR_POINTS * 3);
const starBase = new Float32Array(STAR_POINTS * 3);
const starPhase = new Float32Array(STAR_POINTS);
const starAmp = new Float32Array(STAR_POINTS);

function sampleDir() {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}
const gold = new THREE.Color();
let sp = 0;
function pushStarPoint(x, y, z, h, s, l) {
  const i3 = sp * 3;
  starPos[i3] = x; starPos[i3+1] = y; starPos[i3+2] = z;
  gold.setHSL(h, s, l);
  starCol[i3] = starBase[i3] = gold.r;
  starCol[i3+1] = starBase[i3+1] = gold.g;
  starCol[i3+2] = starBase[i3+2] = gold.b;
  starPhase[sp] = Math.random() * Math.PI * 2;
  starAmp[sp]   = 0.4 + Math.random() * 0.6;
  sp++;
}
for (let i = 0; i < STAR_POINTS; i++) {
  const [dx, dy, dz] = sampleDir();
  let r = STAR_BASE_R * (0.85 + Math.random() * 0.3);
  if (Math.random() < STAR_SPIKE_CHANCE) r = THREE.MathUtils.lerp(r, STAR_SPIKE_R, 0.7 + Math.random() * 0.3);
  const x = dx * r, y = STAR_Y + dy * r, z = dz * r;
  const hue = 0.12 + (Math.random() - 0.5) * 0.02;
  const sat = 0.9  + (Math.random() - 0.5) * 0.1;
  const lig = 0.75 + (Math.random() - 0.5) * 0.2;
  pushStarPoint(x, y, z, (hue+1)%1, THREE.MathUtils.clamp(sat,0,1), THREE.MathUtils.clamp(lig,0,1));
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
const star = new THREE.Points(starGeo, makeMaterial(0.07, 1.0));

// === 雪 ===
const SNOW = 3000;
const snowPos = new Float32Array(SNOW * 3);
const snowVel = new Float32Array(SNOW);
for (let i = 0; i < SNOW; i++) {
  snowPos.set([(Math.random() * 2 - 1) * 36, Math.random() * 36 - 3, (Math.random() * 2 - 1) * 36], i * 3);
  snowVel[i] = 50 + Math.random() * 12;
}
const snowGeo = new THREE.BufferGeometry();
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, makeMaterial(0.05, 0.9, false));

// === 地面 ===
const GROUND_POINTS = 30000;
const gPos = new Float32Array(GROUND_POINTS * 3);
const gCol = new Float32Array(GROUND_POINTS * 3);
const gBase = new Float32Array(GROUND_POINTS * 3);
const gPhase = new Float32Array(GROUND_POINTS);
const gAmp = new Float32Array(GROUND_POINTS);
for (let i = 0; i < GROUND_POINTS; i++) {
  const r = Math.random() * 45, a = Math.random() * Math.PI * 2;
  const x = r * Math.cos(a), z = r * Math.sin(a), c = 0.8 + Math.random() * 0.2;
  gPos.set([x, -1.5, z], i * 3);
  gCol.set([c, c, 1.0], i * 3);
  gBase.set([c, c, 1.0], i * 3);
  gPhase[i] = Math.random() * Math.PI * 2;
  gAmp[i] = 0.3 + Math.random() * 0.4;
}
const gGeo = new THREE.BufferGeometry();
gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
const ground = new THREE.Points(gGeo, makeMaterial(0.06, 0.7));

// === world ===
const world = new THREE.Group();
world.add(tree, ground, snow, star);
scene.add(world);

// === 动 ===
const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  world.rotation.y = t * ORBIT_SPEED * 0.5;

  const cx = Math.cos(t * ORBIT_SPEED), sz = Math.sin(t * ORBIT_SPEED);
  camera.position.set(cx * ORBIT_RADIUS, Math.sin(CAMERA_TILT) * ORBIT_RADIUS, sz * ORBIT_RADIUS);
  camera.lookAt(0, 4.5, 0);

  // 树
  const tc = treeGeo.attributes.color.array;
  for (let i = 0; i < TREE_POINTS; i++) {
    const f = 0.82 + 0.38 * Math.sin(t * 1.8 + treePhase[i]) * treeAmp[i];
    tc[i*3]   = treeBase[i*3]   * f;
    tc[i*3+1] = treeBase[i*3+1] * f;
    tc[i*3+2] = treeBase[i*3+2] * f;
  }
  treeGeo.attributes.color.needsUpdate = true;

  // 地
  const gc = gGeo.attributes.color.array;
  for (let i = 0; i < GROUND_POINTS; i++) {
    const f = 0.85 + 0.25 * Math.sin(t * 2 + gPhase[i]) * gAmp[i];
    gc[i*3]   = gBase[i*3]   * f;
    gc[i*3+1] = gBase[i*3+1] * f;
    gc[i*3+2] = gBase[i*3+2] * f;
  }
  gGeo.attributes.color.needsUpdate = true;

  // 球
  const sc = starGeo.attributes.color.array;
  for (let i = 0; i < STAR_POINTS; i++) {
    const f = 0.8 + 0.4 * Math.sin(t * 2.4 + starPhase[i]) * starAmp[i];
    sc[i*3]   = starBase[i*3]   * f;
    sc[i*3+1] = starBase[i*3+1] * f;
    sc[i*3+2] = starBase[i*3+2] * f;
  }
  starGeo.attributes.color.needsUpdate = true;
  star.rotation.y += 0.2 * dt;

  // 落雪
  const s = snowGeo.attributes.position.array;
  const wind = Math.sin(t) * 0.3;
  for (let i = 0; i < SNOW; i++) {
    s[i*3+1] -= snowVel[i] * dt;
    s[i*3]   += wind * dt;
    if (s[i*3+1] < -1.5) {
      s[i*3+1] = 30;
      s[i*3]   = (Math.random() * 2 - 1) * 36;
      s[i*3+2] = (Math.random() * 2 - 1) * 36;
    }
  }
  snowGeo.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
