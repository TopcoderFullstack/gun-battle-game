import {
  MeshBuilder, StandardMaterial, Color3, Vector3,
  PhysicsAggregate, PhysicsShapeType, HemisphericLight,
  DirectionalLight, ShadowGenerator, Scene, HavokPlugin,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";

export const MAP_SIZE = 400;
export const HALF = MAP_SIZE / 2;
export let havokPlugin = null;

export async function initPhysics(scene) {
  const havokInstance = await HavokPhysics({
    locateFile: (url) => `/havok/${url}`,
  });
  havokPlugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -20, 0), havokPlugin);
  return havokPlugin;
}

// Buildings data
const buildings = [
  { x: 0, z: 0, w: 30, d: 24, h: 14, color: [0.6, 0.53, 0.47], name: "Hotel" },
  { x: 45, z: -35, w: 20, d: 16, h: 10, color: [0.53, 0.6, 0.67], name: "Office" },
  { x: -40, z: 30, w: 18, d: 14, h: 10, color: [0.67, 0.73, 0.67], name: "Apartments" },
  { x: 35, z: 40, w: 16, d: 12, h: 8, color: [0.8, 0.67, 0.53], name: "Warehouse" },
  { x: -50, z: -40, w: 24, d: 18, h: 12, color: [0.6, 0.53, 0.67], name: "Hospital" },
  { x: -20, z: -50, w: 14, d: 12, h: 8, color: [0.73, 0.67, 0.6], name: "Gas Station" },
  { x: 55, z: 10, w: 12, d: 10, h: 6, color: [0.67, 0.73, 0.6], name: "House A" },
  { x: -55, z: -10, w: 12, d: 10, h: 6, color: [0.73, 0.67, 0.73], name: "House B" },
  { x: 10, z: 60, w: 14, d: 10, h: 6, color: [0.8, 0.73, 0.67], name: "House C" },
  { x: -10, z: -60, w: 16, d: 12, h: 8, color: [0.67, 0.8, 0.73], name: "Shack" },
];

export function getBuildings() { return buildings; }

export function createSceneBase(engine) {
  const scene = new Scene(engine);
  scene.clearColor = new Color3(0.53, 0.6, 0.8);

  // Skybox
  const skyMat = new StandardMaterial("skyMat", scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.emissiveColor = new Color3(0.35, 0.6, 0.9);
  const skybox = MeshBuilder.CreateBox("skybox", { size: 500 }, scene);
  skybox.material = skyMat;

  // Lighting
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;
  hemi.diffuse = new Color3(0.9, 0.9, 1.0);
  hemi.groundColor = new Color3(0.3, 0.4, 0.2);

  const sun = new DirectionalLight("sun", new Vector3(0.5, -0.8, -0.3), scene);
  sun.intensity = 1.3;
  sun.diffuse = new Color3(1.0, 0.95, 0.85);

  const shadowGen = new ShadowGenerator(2048, sun);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 32;

  return { scene, shadowGen };
}

export function buildWorld(scene, shadowGen) {

  // Terrain (ground plane with gentle hills)
  const ground = MeshBuilder.CreateGround("ground", { width: MAP_SIZE + 40, height: MAP_SIZE + 40, subdivisions: 64 }, scene);
  ground.checkCollisions = true;
  ground.isPickable = false;
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.35, 0.48, 0.23);
  groundMat.specularColor = Color3.Black();
  ground.material = groundMat;
  ground.receiveShadows = true;

  // Physics ground
  new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.8, restitution: 0.1 }, scene);

  // Terrain height variation (for pickups mainly, not complex physics)
  const hmap = [];
  for (let z = 0; z <= 64; z++) {
    hmap[z] = [];
    for (let x = 0; x <= 64; x++) {
      const wx = (x / 64 - 0.5) * (MAP_SIZE + 40);
      const wz = (z / 64 - 0.5) * (MAP_SIZE + 40);
      hmap[z][x] = terrainHeight(wx, wz);
    }
  }

  // Create buildings
  const allWalls = buildAllBuildings(scene, shadowGen);

  // Create trees
  createTrees(scene, shadowGen);

  // Create roads
  createRoads(scene);

  return { ground, walls: allWalls };
}

function terrainHeight(x, z) {
  return Math.sin(x * 0.02) * Math.cos(z * 0.03) * 3 +
    Math.sin((x + 50) * 0.015) * Math.sin((z - 30) * 0.018) * 2.5 +
    Math.cos(x * 0.01) * Math.sin(z * 0.025) * 1.5;
}

function buildAllBuildings(scene, shadowGen) {
  const allWalls = [];

  for (const b of buildings) {
    const hw = b.w / 2, hd = b.d / 2;
    const wallMat = new StandardMaterial("wall_" + b.name, scene);
    wallMat.diffuseColor = new Color3(...b.color);
    wallMat.specularColor = new Color3(0.05, 0.05, 0.05);

    const floorMat = new StandardMaterial("floor_" + b.name, scene);
    floorMat.diffuseColor = new Color3(0.3, 0.3, 0.3);

    // Floor
    const floor = MeshBuilder.CreatePlane("floor_" + b.name, { width: b.w, height: b.d }, scene);
    floor.rotation.x = Math.PI / 2;
    floor.position.set(b.x, 0.02, b.z);
    floor.material = floorMat;
    floor.receiveShadows = true;

    // Walls with door gaps
    const doorW = 3;
    const doorOff = 0;
    const wallT = 0.4;

    // Front wall: left segment + right segment (gap for door)
    const fwLeft = (hw + doorOff - doorW / 2);
    if (fwLeft > 0.5) {
      addWallBox(scene, b.name + "_fwL", b.x - hw + fwLeft / 2, b.h / 2, b.z - hd,
        fwLeft, b.h, wallT, wallMat, shadowGen, scene, allWalls, b);
    }
    const fwRight = (hw - doorOff - doorW / 2);
    if (fwRight > 0.5) {
      addWallBox(scene, b.name + "_fwR", b.x + hw - fwRight / 2, b.h / 2, b.z - hd,
        fwRight, b.h, wallT, wallMat, shadowGen, scene, allWalls, b);
    }

    // Back wall (solid)
    addWallBox(scene, b.name + "_bw", b.x, b.h / 2, b.z + hd,
      b.w, b.h, wallT, wallMat, shadowGen, scene, allWalls, b);

    // Left wall (solid)
    addWallBox(scene, b.name + "_lw", b.x - hw, b.h / 2, b.z,
      wallT, b.h, b.d, wallMat, shadowGen, scene, allWalls, b);

    // Right wall (solid)
    addWallBox(scene, b.name + "_rw", b.x + hw, b.h / 2, b.z,
      wallT, b.h, b.d, wallMat, shadowGen, scene, allWalls, b);

    // Roof
    const roofMat = new StandardMaterial("roof_" + b.name, scene);
    roofMat.diffuseColor = new Color3(0.33, 0.2, 0.13);
    const roof = MeshBuilder.CreateCylinder("roof_" + b.name, {
      diameterTop: 0, diameterBottom: Math.max(b.w, b.d) * 1.05, height: 3, tessellation: 4
    }, scene);
    roof.position.set(b.x, b.h + 1.5, b.z);
    roof.rotation.y = Math.PI / 4;
    roof.material = roofMat;
    shadowGen.addShadowCaster(roof);

    // Interior dividers
    if (b.w > 15) {
      const intMat = new StandardMaterial("int_" + b.name, scene);
      intMat.diffuseColor = new Color3(0.8, 0.8, 0.75);
      for (let ri = 1; ri <= 2; ri++) {
        const rx = b.x - hw + (b.w / 3) * ri;
        const gap = (Math.random() - 0.5) * b.d * 0.5;
        const frontH = hd + gap - 1.5;
        const backH = hd - gap - 1.5;
        if (frontH > 0.5) {
          addWallBox(scene, b.name + `_id${ri}f`, rx, b.h * 0.45, b.z - hd + frontH / 2,
            0.3, b.h * 0.9, frontH, intMat, shadowGen, scene, allWalls, b);
        }
        if (backH > 0.5) {
          addWallBox(scene, b.name + `_id${ri}b`, rx, b.h * 0.45, b.z + hd - backH / 2,
            0.3, b.h * 0.9, backH, intMat, shadowGen, scene, allWalls, b);
        }
      }
    }
  }

  return allWalls;
}

function addWallBox(scene, name, x, y, z, w, h, d, mat, shadowGen, _scene, walls, b) {
  const box = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  box.position.set(x, y, z);
  box.material = mat;
  box.receiveShadows = true;
  box.checkCollisions = true;
  box.isPickable = false;
  shadowGen.addShadowCaster(box);
  new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 0, friction: 0.6 }, scene);

  walls.push({
    minX: x - w / 2, maxX: x + w / 2,
    minZ: z - d / 2, maxZ: z + d / 2,
    minY: y - h / 2, maxY: y + h / 2,
  });
}

function createTrees(scene, shadowGen) {
  const trunkMat = new StandardMaterial("trunk", scene);
  trunkMat.diffuseColor = new Color3(0.55, 0.41, 0.08);
  const leafMat = new StandardMaterial("leaf", scene);
  leafMat.diffuseColor = new Color3(0.18, 0.35, 0.12);
  const leafMat2 = new StandardMaterial("leaf2", scene);
  leafMat2.diffuseColor = new Color3(0.23, 0.48, 0.16);

  for (let i = 0; i < 100; i++) {
    let tx, tz;
    do {
      tx = (Math.random() - 0.5) * (MAP_SIZE - 30);
      tz = (Math.random() - 0.5) * (MAP_SIZE - 30);
    } while (isNearBuilding(tx, tz, 10));

    const tree = MeshBuilder.CreateCylinder("tree_t" + i, { height: 5, diameterTop: 0.3, diameterBottom: 0.4, tessellation: 8 }, scene);
    tree.position.set(tx, 2.5, tz);
    tree.material = trunkMat;
    shadowGen.addShadowCaster(tree);

    const leafCount = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < leafCount; j++) {
      const leaf = MeshBuilder.CreateCylinder("tree_l" + i + "_" + j, {
        diameterTop: 0, diameterBottom: 5 + Math.random() * 3, height: 6, tessellation: 8
      }, scene);
      leaf.position.set(tx, 4.5 + j * 2.5, tz);
      leaf.material = Math.random() < 0.5 ? leafMat : leafMat2;
      shadowGen.addShadowCaster(leaf);
    }
  }
}

function createRoads(scene) {
  const roadMat = new StandardMaterial("road", scene);
  roadMat.diffuseColor = new Color3(0.3, 0.3, 0.3);

  const roads = [
    { sx: -HALF, sz: 0, ex: HALF, ez: 0, w: 6 },
    { sx: 0, sz: -HALF, ex: 0, ez: HALF, w: 6 },
  ];

  for (const r of roads) {
    const dx = r.ex - r.sx, dz = r.ez - r.sz;
    const len = Math.sqrt(dx * dx + dz * dz);
    const ang = Math.atan2(dx, dz);
    const road = MeshBuilder.CreatePlane("road" + Math.random(), { width: r.w, height: len }, scene);
    road.rotation.x = Math.PI / 2;
    road.rotation.z = ang;
    road.position.set((r.sx + r.ex) / 2, 0.05, (r.sz + r.ez) / 2);
    road.material = roadMat;
  }
}

function isNearBuilding(tx, tz, minDist) {
  for (const b of buildings) {
    const hw = b.w / 2 + minDist, hd = b.d / 2 + minDist;
    if (tx > b.x - hw && tx < b.x + hw && tz > b.z - hd && tz < b.z + hd) return true;
  }
  return false;
}

export function checkWallCollision(px, pz, radius, walls) {
  for (const w of walls) {
    const cx = Math.max(w.minX, Math.min(px, w.maxX));
    const cz = Math.max(w.minZ, Math.min(pz, w.maxZ));
    if ((px - cx) ** 2 + (pz - cz) ** 2 < radius * radius) return true;
  }
  return false;
}

export function terrainH(x, z) {
  return terrainHeight(x, z) * 0.7;
}
