import * as THREE from "three";
import { WEAPON_LIST, createGroundWeaponModel } from "./WeaponDefs.js";
import { getBuildings, getMapHalf } from "./Scene.js";

const pickups = [];

export function spawnLoot(scene) {
  pickups.length = 0;
  const buildings = getBuildings();
  const half = getMapHalf();

  for (const b of buildings) {
    const count = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const rx = b.x + (Math.random() - 0.5) * (b.w * 0.8);
      const rz = b.z + (Math.random() - 0.5) * (b.d * 0.8);

      if (Math.random() < 0.6) {
        spawnWeapon(scene, rx, rz);
      } else {
        spawnItem(scene, rx, rz);
      }
    }
  }

  // Outdoor scattered loot
  for (let i = 0; i < 15; i++) {
    const rx = (Math.random() - 0.5) * half * 2;
    const rz = (Math.random() - 0.5) * half * 2;
    if (Math.random() < 0.5) spawnWeapon(scene, rx, rz);
    else spawnItem(scene, rx, rz);
  }
}

function randomWeaponDef() {
  const r = Math.random();
  if (r < 0.35) return WEAPON_LIST.find((w) => w.id === "pistol");
  if (r < 0.6) return WEAPON_LIST.find((w) => w.id === "smg");
  if (r < 0.78) return WEAPON_LIST.find((w) => w.id === "shotgun");
  if (r < 0.92) return WEAPON_LIST.find((w) => w.id === "rifle");
  if (r < 0.97) return WEAPON_LIST.find((w) => w.id === "sniper");
  return WEAPON_LIST.find((w) => w.id === "grenade");
}

function spawnWeapon(scene, x, z) {
  const def = randomWeaponDef();
  const model = createGroundWeaponModel(def);
  model.position.set(x, getTerrainHeight(x, z) + 0.3, z);
  model.scale.setScalar(def.modelScale);
  model.rotation.y = Math.random() * Math.PI * 2;
  scene.add(model);

  // Floating ring indicator
  const ringGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 16);
  const ringMat = new THREE.MeshBasicMaterial({
    color: rarityColor(def.rarity),
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.1, z);

  pickups.push({
    type: "weapon",
    model,
    ring,
    def,
    position: new THREE.Vector3(x, model.position.y, z),
  });
}

function spawnItem(scene, x, z) {
  const items = [
    { id: "bandage", name: "Bandage", color: 0x88ff88, rarity: "common" },
    { id: "medkit", name: "Med Kit", color: 0xff4444, rarity: "uncommon" },
    { id: "armor", name: "Armor", color: 0x4488ff, rarity: "uncommon" },
    { id: "helmet", name: "Helmet", color: 0xff88ff, rarity: "rare" },
  ];
  const def = items[Math.floor(Math.random() * items.length)];

  const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.3,
    emissive: def.color,
    emissiveIntensity: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const y = getTerrainHeight(x, z) + 0.3;
  mesh.position.set(x, y, z);
  scene.add(mesh);

  pickups.push({
    type: "item",
    model: mesh,
    def,
    position: new THREE.Vector3(x, y, z),
    bobOffset: Math.random() * Math.PI * 2,
  });
}

function rarityColor(rarity) {
  switch (rarity) {
    case "common":
      return 0xaaaaaa;
    case "uncommon":
      return 0x4488ff;
    case "rare":
      return 0xff44ff;
    default:
      return 0xaaaaaa;
  }
}

export function getPickups() {
  return pickups;
}

export function updatePickups(time, scene) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i];
    if (pk.removed) {
      if (pk.model.parent) scene.remove(pk.model);
      pickups.splice(i, 1);
      continue;
    }
    // Bob animation
    const bob = Math.sin(time * 3 + pk.bobOffset) * 0.1;
    if (pk.model) {
      pk.model.position.y = pk.position.y + bob;
      pk.model.rotation.y += 0.02;
    }
  }
}

function getTerrainHeight(x, z) {
  const h =
    Math.sin(x * 0.02) * Math.cos(z * 0.03) * 3 +
    Math.sin((x + 50) * 0.015) * Math.sin((z - 30) * 0.018) * 2.5 +
    Math.cos(x * 0.01) * Math.sin(z * 0.025) * 1.5;
  return h * 0.7;
}
