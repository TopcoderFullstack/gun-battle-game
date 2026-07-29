import * as THREE from "three";

const MAP_S = 400;
const HALF = MAP_S / 2;

export function createSky(scene) {
  const verts = [];
  const cols = [];
  const skyRadius = 180;
  const skyHeight = 100;
  const segments = 64;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * skyRadius;
    const z = Math.sin(angle) * skyRadius;
    verts.push(x, skyHeight, z);
    cols.push(0.6, 0.85, 1.0);
    verts.push(x, 0, z);
    cols.push(0.85, 0.92, 1.0);
  }

  const skyGeo = new THREE.BufferGeometry();
  skyGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(verts, 3)
  );
  skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));

  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      attribute vec3 color;
      varying vec3 vColor;
      varying vec3 vPos;
      void main() {
        vColor = color;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying vec3 vPos;
      void main() {
        float h = vPos.y / 100.0;
        vec3 skyTop = vec3(0.25, 0.55, 0.9);
        vec3 skyHorizon = vec3(0.7, 0.82, 0.95);
        vec3 col = mix(skyHorizon, skyTop, clamp(h, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = "sky";
  scene.add(sky);

  // Sun
  const sunGeo = new THREE.SphereGeometry(5, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(80, 80, -60);
  sun.name = "sun";
  scene.add(sun);

  // Directional sun light
  const sunLight = new THREE.DirectionalLight(0xfff5e8, 1.5);
  sunLight.position.copy(sun.position);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 400;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  sunLight.shadow.bias = -0.0001;
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x8899bb, 0.5));
  scene.add(new THREE.HemisphereLight(0x8899cc, 0x445533, 0.4));

  return { sky, sun, sunLight };
}

export function createClouds(scene) {
  const cloudGroup = new THREE.Group();
  for (let i = 0; i < 30; i++) {
    const cloud = createCloudCluster();
    cloud.position.set(
      (Math.random() - 0.5) * 300,
      50 + Math.random() * 40,
      (Math.random() - 0.5) * 300
    );
    cloud.userData.speed = 0.5 + Math.random() * 2;
    cloud.userData.offset = Math.random() * Math.PI * 2;
    cloudGroup.add(cloud);
  }
  scene.add(cloudGroup);
  return cloudGroup;
}

function createCloudCluster() {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 7, 7);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const count = 5 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    const blob = new THREE.Mesh(geo, mat);
    blob.position.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 8
    );
    blob.scale.setScalar(2 + Math.random() * 4);
    group.add(blob);
  }
  return group;
}

export function createTrees(scene, walls) {
  const treeGroup = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 5, 8);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x8B6914,
    roughness: 0.9,
  });
  const leafGeo = new THREE.ConeGeometry(3, 6, 8, 4);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a1e,
    roughness: 0.8,
  });
  const leafMat2 = new THREE.MeshStandardMaterial({
    color: 0x3a7a28,
    roughness: 0.8,
  });

  const trees = [];
  const half = HALF - 10;
  for (let i = 0; i < 120; i++) {
    let tx, tz;
    do {
      tx = (Math.random() - 0.5) * half * 2;
      tz = (Math.random() - 0.5) * half * 2;
    } while (isNearBuilding(tx, tz, 8));

    const group = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    const leafCount = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < leafCount; j++) {
      const mat = Math.random() < 0.5 ? leafMat : leafMat2;
      const leaf = new THREE.Mesh(leafGeo, mat);
      leaf.position.y = 4.5 + j * 2.5;
      leaf.scale.setScalar(0.7 + Math.random() * 0.6);
      leaf.rotation.y = Math.random() * Math.PI;
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      group.add(leaf);
    }

    group.position.set(tx, 0, tz);
    treeGroup.add(group);

    const r = 0.5;
    trees.push({
      minX: tx - r,
      maxX: tx + r,
      minZ: tz - r,
      maxZ: tz + r,
      minY: 0,
      maxY: 10,
    });
  }

  scene.add(treeGroup);
  walls.push(...trees);
  return treeGroup;
}

const buildings = [
  { x: 0, z: 0, w: 30, d: 24, h: 14, floors: 3, color: 0x998877, name: "Hotel", doors: [{ offset: -6 }, { offset: 6 }] },
  { x: 45, z: -35, w: 20, d: 16, h: 10, floors: 2, color: 0x8899aa, name: "Office", doors: [{ offset: 0 }, { offset: 4 }] },
  { x: -40, z: 30, w: 18, d: 14, h: 10, floors: 2, color: 0xaabbaa, name: "Apartments", doors: [{ offset: 3 }] },
  { x: 35, z: 40, w: 16, d: 12, h: 8, floors: 1, color: 0xccaa88, name: "Warehouse", doors: [{ offset: 0 }, { offset: -4 }] },
  { x: -50, z: -40, w: 24, d: 18, h: 12, floors: 2, color: 0x9988aa, name: "Hospital", doors: [{ offset: 4 }, { offset: -5 }] },
  { x: -20, z: -50, w: 14, d: 12, h: 8, floors: 1, color: 0xbbaa99, name: "Gas Station", doors: [{ offset: 0 }] },
  { x: 55, z: 10, w: 12, d: 10, h: 6, floors: 1, color: 0xaabb99, name: "House A", doors: [{ offset: -3 }] },
  { x: -55, z: -10, w: 12, d: 10, h: 6, floors: 1, color: 0xbbaabb, name: "House B", doors: [{ offset: 2 }] },
  { x: 10, z: 60, w: 14, d: 10, h: 6, floors: 1, color: 0xccbbaa, name: "House C", doors: [{ offset: 0 }] },
  { x: -10, z: -60, w: 16, d: 12, h: 8, floors: 1, color: 0xaaccbb, name: "Shack", doors: [{ offset: 0 }, { offset: 3 }] },
];

function isNearBuilding(tx, tz, minDist) {
  for (const b of buildings) {
    const hw = b.w / 2 + minDist;
    const hd = b.d / 2 + minDist;
    if (tx > b.x - hw && tx < b.x + hw && tz > b.z - hd && tz < b.z + hd) {
      return true;
    }
  }
  return false;
}

export function createBuildings(scene) {
  const buildWalls = [];
  const wallThick = 0.4;
  const doorWidth = 2.8;

  for (const b of buildings) {
    const group = new THREE.Group();
    group.position.set(b.x, 0, b.z);

    const hw = b.w / 2;
    const hd = b.d / 2;
    const wallH = b.h;

    // Materials
    const wallMat = new THREE.MeshStandardMaterial({
      color: b.color, roughness: 0.7, metalness: 0.05,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x555555, roughness: 0.85,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x553322, roughness: 0.8,
    });
    const interiorMat = new THREE.MeshStandardMaterial({
      color: 0xccccbb, roughness: 0.8, metalness: 0,
    });
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x8899dd, roughness: 0.2, metalness: 0.6, side: THREE.DoubleSide,
    });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    group.add(floor);

    // Helper: create a wall segment
    function addWallPiece(x, z, w, d, h, mat, castShadow = true) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, h / 2, z);
      if (castShadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
      group.add(mesh);
      return mesh;
    }

    // Helper: add collision box
    function addCollision(cx, cz, cw, cd, ch) {
      buildWalls.push({
        minX: b.x + cx - cw / 2,
        maxX: b.x + cx + cw / 2,
        minZ: b.z + cz - cd / 2,
        maxZ: b.z + cz + cd / 2,
        minY: 0,
        maxY: ch,
      });
    }

    // --- Front wall (with door opening) ---
    const doorOffset = b.doors?.[0]?.offset || 0;
    const leftW = hw + doorOffset - doorWidth / 2;
    const rightW = hw - doorOffset - doorWidth / 2;

    if (leftW > 0.3) {
      addWallPiece(-hw + leftW / 2, -hd, leftW, wallThick, wallH, wallMat);
      addCollision(-hw + leftW / 2, -hd, leftW, wallThick, wallH);
    }
    if (rightW > 0.3) {
      addWallPiece(hw - rightW / 2, -hd, rightW, wallThick, wallH, wallMat);
      addCollision(hw - rightW / 2, -hd, rightW, wallThick, wallH);
    }
    // Door top beam
    addWallPiece(doorOffset, -hd, doorWidth, wallThick * 0.6, 0.5, wallMat, false);
    addWallPiece(doorOffset, -hd, doorWidth, wallThick * 0.6, 0.5, wallMat, false);
    // Door frame sides
    addWallPiece(doorOffset - doorWidth / 2, -hd, wallThick * 0.5, wallThick, wallH, wallMat, false);
    addWallPiece(doorOffset + doorWidth / 2, -hd, wallThick * 0.5, wallThick, wallH, wallMat, false);
    // Top beam collision
    addCollision(doorOffset, -hd, doorWidth, wallThick * 0.6, wallH);

    // --- Back wall (with optional back door) ---
    const hasBackDoor = b.doors?.length > 1;
    const backDoorOff = b.doors?.[1]?.offset || 0;
    if (hasBackDoor) {
      const blW = hw + backDoorOff - doorWidth / 2;
      const brW = hw - backDoorOff - doorWidth / 2;
      if (blW > 0.3) {
        addWallPiece(-hw + blW / 2, hd, blW, wallThick, wallH, wallMat);
        addCollision(-hw + blW / 2, hd, blW, wallThick, wallH);
      }
      if (brW > 0.3) {
        addWallPiece(hw - brW / 2, hd, brW, wallThick, wallH, wallMat);
        addCollision(hw - brW / 2, hd, brW, wallThick, wallH);
      }
      addCollision(backDoorOff, hd, doorWidth, wallThick * 0.6, wallH);
    } else {
      addWallPiece(0, hd, b.w, wallThick, wallH, wallMat);
      addCollision(0, hd, b.w, wallThick, wallH);
    }

    // --- Left wall ---
    addWallPiece(-hw, 0, wallThick, b.d, wallH, wallMat);
    addCollision(-hw, 0, wallThick, b.d, wallH);

    // --- Right wall ---
    addWallPiece(hw, 0, wallThick, b.d, wallH, wallMat);
    addCollision(hw, 0, wallThick, b.d, wallH);

    // --- Interior room dividers ---
    const numRooms = b.floors || 1;
    for (let ri = 0; ri < numRooms - 1; ri++) {
      const rx = (ri + 1) * (b.w / numRooms) - hw;
      // Wall with gap for passage
      const gapZ = (Math.random() - 0.5) * b.d * 0.6;
      const frontW = hd + gapZ - 1.5;
      const backW = hd - gapZ - 1.5;
      if (frontW > 0.5) {
        addWallPiece(rx, -hd + frontW / 2, wallThick * 0.6, frontW, wallH * 0.9, interiorMat);
        addCollision(rx, -hd + frontW / 2, wallThick * 0.6, frontW, wallH * 0.9);
      }
      if (backW > 0.5) {
        addWallPiece(rx, hd - backW / 2, wallThick * 0.6, backW, wallH * 0.9, interiorMat);
        addCollision(rx, hd - backW / 2, wallThick * 0.6, backW, wallH * 0.9);
      }
    }

    // --- Interior props: crates, shelves ---
    const crateGeo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.7 });
    for (let ci = 0; ci < 4; ci++) {
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(
        (Math.random() - 0.5) * (b.w - 2),
        0.4,
        (Math.random() - 0.5) * (b.d - 2)
      );
      crate.castShadow = true;
      crate.receiveShadow = true;
      group.add(crate);

      addCollision(crate.position.x, crate.position.z, 1.2, 0.8, 0.8);
    }

    // --- Windows on front and back walls ---
    const winGeo = new THREE.PlaneGeometry(1.8, 2.2);
    const winCount = Math.floor((b.w - 8) / 4);
    for (let wi = 0; wi < Math.max(winCount, 0); wi++) {
      const wx = -hw + 4 + wi * 4;
      if (Math.abs(wx - doorOffset) > doorWidth / 2 + 1.5) {
        const winF = new THREE.Mesh(winGeo, winMat);
        winF.position.set(wx, wallH * 0.55, -hd - 0.01);
        group.add(winF);
      }
      if (!hasBackDoor || Math.abs(wx - backDoorOff) > doorWidth / 2 + 1.5) {
        const winB = new THREE.Mesh(winGeo, winMat);
        winB.position.set(wx, wallH * 0.55, hd + 0.01);
        group.add(winB);
      }
    }

    // --- Roof ---
    if (b.floors <= 2) {
      const roofGeo = new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.7, 3, 4);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = wallH + 1.5;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);
    } else {
      // Flat roof for taller buildings
      const roof = new THREE.Mesh(
        new THREE.PlaneGeometry(b.w + 1, b.d + 1),
        roofMat
      );
      roof.rotation.x = -Math.PI / 2;
      roof.position.y = wallH + 0.2;
      roof.castShadow = true;
      roof.receiveShadow = true;
      group.add(roof);
    }

    // --- Side entrance for larger buildings ---
    if (b.w > 15 && b.d > 12) {
      // Add a side door on one side wall - remove part of left wall collision
      const sideDoorZ = 0;
      // We can't easily remove collision, but we can add non-colliding visual
      const sdGeo = new THREE.PlaneGeometry(2, 3);
      const sdMat = new THREE.MeshStandardMaterial({
        color: 0x553322, roughness: 0.7, side: THREE.DoubleSide,
      });
      const sideDoor = new THREE.Mesh(sdGeo, sdMat);
      sideDoor.position.set(-hw - 0.42, 1.5, sideDoorZ);
      group.add(sideDoor);
    }

    scene.add(group);
  }

  return buildWalls;
}

export function createTerrain(scene) {
  const terrainGeo = new THREE.PlaneGeometry(MAP_S + 20, MAP_S + 20, 64, 64);
  terrainGeo.rotateX(-Math.PI / 2);
  const positions = terrainGeo.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);

    // Gentle hills
    let h =
      Math.sin(x * 0.02) * Math.cos(z * 0.03) * 3 +
      Math.sin((x + 50) * 0.015) * Math.sin((z - 30) * 0.018) * 2.5 +
      Math.cos(x * 0.01) * Math.sin(z * 0.025) * 1.5;

    // Flatten near buildings
    for (const b of buildings) {
      const dx = x - b.x;
      const dz = z - b.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const flatDist = Math.max(b.w, b.d) * 0.8;
      if (dist < flatDist) {
        h *= dist / flatDist;
      }
    }

    positions.setY(i, h * 0.7);
  }

  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x5a7a3a,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.y = -0.1;
  terrain.receiveShadow = true;
  terrain.name = "terrain";
  scene.add(terrain);

  // Road paths
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.95,
  });

  const roads = [
    { sx: -HALF, sz: 0, ex: HALF, ez: 0, w: 6 },
    { sx: 0, sz: -HALF, ex: 0, ez: HALF, w: 6 },
    { sx: -80, sz: -80, ex: 80, ez: 80, w: 4 },
    { sx: 80, sz: -70, ex: -70, ez: 80, w: 4 },
  ];

  for (const r of roads) {
    const dx = r.ex - r.sx;
    const dz = r.ez - r.sz;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const roadGeo = new THREE.PlaneGeometry(r.w, len);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = angle;
    road.position.set(
      (r.sx + r.ex) / 2,
      0.05,
      (r.sz + r.ez) / 2
    );
    road.receiveShadow = true;
    scene.add(road);

    // Dashed center line
    const lineGeo = new THREE.PlaneGeometry(0.3, len);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = angle;
    line.position.set(
      (r.sx + r.ex) / 2,
      0.055,
      (r.sz + r.ez) / 2
    );
    scene.add(line);
  }

  return terrain;
}

export function getBuildings() {
  return buildings;
}

export function getMapHalf() {
  return HALF - 5;
}

let allWalls = [];

export function setAllWalls(walls) {
  allWalls = walls;
}

export function checkWallCollision(px, pz, radius, walls = allWalls) {
  for (const w of walls) {
    const closestX = Math.max(w.minX, Math.min(px, w.maxX));
    const closestZ = Math.max(w.minZ, Math.min(pz, w.maxZ));
    const dx = px - closestX;
    const dz = pz - closestZ;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}
