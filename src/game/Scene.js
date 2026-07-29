import * as THREE from "three";
import gsap from "gsap";

const MAP_SIZE = 80;
const WALL_H = 8;
const FLOOR_Y = 0;
const CEIL_Y = 10;

function createMaterial(hex, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: opts.roughness ?? 0.8,
    metalness: opts.metalness ?? 0.1,
    ...opts,
  });
}

export function buildScene(scene) {
  // Ambient
  scene.add(new THREE.AmbientLight(0x334455, 0.6));

  // Directional (sun)
  const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
  sun.position.set(30, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  scene.add(sun);

  // Hemisphere for better ambient color variation
  scene.add(new THREE.HemisphereLight(0x8899cc, 0x332211, 0.4));

  // Point lights for atmosphere
  const pl1 = new THREE.PointLight(0xff8844, 3, 30);
  pl1.position.set(10, 6, 10);
  scene.add(pl1);
  const pl2 = new THREE.PointLight(0x4488ff, 3, 30);
  pl2.position.set(-10, 6, -10);
  scene.add(pl2);

  // Fog
  scene.fog = new THREE.FogExp2(0x111122, 0.0008);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x222233,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = FLOOR_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid lines on ground (decorative)
  const gridHelper = new THREE.PolarGridHelper(MAP_SIZE, 64, 32, 64, 0x444466, 0x333355);
  gridHelper.position.y = FLOOR_Y + 0.02;
  scene.add(gridHelper);

  // Skybox-ish ceiling
  const ceilGeo = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x111122,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEIL_Y;
  scene.add(ceiling);

  // Walls generated from layout
  const wallData = generateWallLayout();
  return wallData;
}

function generateWallLayout() {
  const layout = [];
  const half = MAP_SIZE;

  // Outer boundary walls
  layout.push({
    x: 0,
    z: -half,
    w: MAP_SIZE * 2,
    d: 1,
    h: WALL_H,
    color: 0x3a3a4a,
  });
  layout.push({
    x: 0,
    z: half,
    w: MAP_SIZE * 2,
    d: 1,
    h: WALL_H,
    color: 0x3a3a4a,
  });
  layout.push({
    x: -half,
    z: 0,
    w: 1,
    d: MAP_SIZE * 2,
    h: WALL_H,
    color: 0x3a3a4a,
  });
  layout.push({
    x: half,
    z: 0,
    w: 1,
    d: MAP_SIZE * 2,
    h: WALL_H,
    color: 0x3a3a4a,
  });

  // Interior walls - L shapes, corridors, rooms
  const segments = [
    [10, -20, 8, 1],
    [10, 0, 8, 1],
    [-6, -10, 1, 8],
    [-10, 10, 10, 1],
    [5, 15, 1, 6],
    [20, -10, 1, 12],
    [20, 5, 6, 1],
    [-20, 0, 1, 10],
    [-15, -5, 6, 1],
    [-20, 15, 6, 1],
    [-18, -25, 1, 8],
    [0, 25, 12, 1],
    [8, -30, 1, 8],
    [-25, -30, 10, 1],
    [30, -20, 1, 10],
    [-30, 20, 8, 1],
    [25, 25, 1, 8],
    [-25, 25, 8, 1],
    [15, -15, 4, 4],
    [-15, -15, 4, 4],
    [0, 10, 4, 4],
    [25, -5, 4, 4],
    [-25, -5, 4, 4],
  ];

  for (const [cx, cz, w, d] of segments) {
    layout.push({
      x: cx,
      z: cz,
      w,
      d,
      h: WALL_H * 0.6,
      color: 0x4a4a5a,
    });
  }

  // Create wall meshes and return collision data
  const collisionWalls = [];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  for (const w of layout) {
    const geo = new THREE.BoxGeometry(w.w, w.h, w.d);
    const mat = createMaterial(w.color, { roughness: 0.9, metalness: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(w.x, w.h / 2 + FLOOR_Y, w.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    collisionWalls.push({
      minX: w.x - w.w / 2,
      maxX: w.x + w.w / 2,
      minZ: w.z - w.d / 2,
      maxZ: w.z + w.d / 2,
      minY: FLOOR_Y,
      maxY: w.h + FLOOR_Y,
    });
  }

  // Decorative crates/barrels
  const crateGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x664422,
    roughness: 0.7,
    metalness: 0.15,
  });
  const cratePositions = [
    [5, 0.6, 5],
    [-5, 0.6, -5],
    [12, 0.6, 12],
    [-12, 0.6, -12],
    [18, 0.6, -8],
    [-18, 0.6, 8],
    [8, 0.6, -18],
    [-8, 0.6, 18],
    [22, 0.6, 22],
    [-22, 0.6, -22],
    [0, 0.6, -15],
    [0, 0.6, 15],
  ];

  for (const [cx, cy, cz] of cratePositions) {
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(cx, cy, cz);
    crate.rotation.y = Math.random() * Math.PI;
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);

    collisionWalls.push({
      minX: cx - 0.6,
      maxX: cx + 0.6,
      minZ: cz - 0.6,
      maxZ: cz + 0.6,
      minY: 0,
      maxY: 1.2,
    });
  }

  return collisionWalls;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);
export { scene };
