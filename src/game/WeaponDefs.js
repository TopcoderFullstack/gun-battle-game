import * as THREE from "three";

export const WEAPONS = {
  pistol: {
    name: "Pistol",
    id: "pistol",
    rarity: "common",
    damage: 25,
    cooldown: 0.28,
    ammo: 15,
    maxAmmo: 15,
    reserve: 60,
    reloadTime: 1.2,
    spread: 0.02,
    bullets: 1,
    range: 150,
    bulletSpeed: 700,
    color: 0xffcc00,
    fireMode: "semi",
    modelScale: 0.8,
    description: "9mm 半自动手枪",
  },
  smg: {
    name: "SMG",
    id: "smg",
    rarity: "common",
    damage: 18,
    cooldown: 0.07,
    ammo: 30,
    maxAmmo: 30,
    reserve: 120,
    reloadTime: 1.8,
    spread: 0.06,
    bullets: 1,
    range: 100,
    bulletSpeed: 600,
    color: 0x00ff88,
    fireMode: "auto",
    modelScale: 1.0,
    description: "冲锋枪，高射速",
  },
  shotgun: {
    name: "Shotgun",
    id: "shotgun",
    rarity: "uncommon",
    damage: 20,
    cooldown: 0.75,
    ammo: 5,
    maxAmmo: 5,
    reserve: 30,
    reloadTime: 2.5,
    spread: 0.18,
    bullets: 8,
    range: 60,
    bulletSpeed: 500,
    color: 0xff6600,
    fireMode: "semi",
    modelScale: 1.1,
    description: "霰弹枪，近距离毁灭",
  },
  rifle: {
    name: "AR",
    id: "rifle",
    rarity: "uncommon",
    damage: 28,
    cooldown: 0.12,
    ammo: 30,
    maxAmmo: 30,
    reserve: 120,
    reloadTime: 2.0,
    spread: 0.04,
    bullets: 1,
    range: 200,
    bulletSpeed: 800,
    color: 0x44aaff,
    fireMode: "auto",
    modelScale: 1.05,
    description: "突击步枪，全能型",
  },
  sniper: {
    name: "Sniper",
    id: "sniper",
    rarity: "rare",
    damage: 85,
    cooldown: 1.2,
    ammo: 5,
    maxAmmo: 5,
    reserve: 25,
    reloadTime: 2.8,
    spread: 0.005,
    bullets: 1,
    range: 350,
    bulletSpeed: 1200,
    color: 0xff4444,
    fireMode: "semi",
    modelScale: 1.2,
    description: "狙击步枪，一击致命",
    scope: true,
  },
  grenade: {
    name: "Grenade",
    id: "grenade",
    rarity: "uncommon",
    damage: 100,
    cooldown: 2.0,
    ammo: 1,
    maxAmmo: 1,
    reserve: 3,
    reloadTime: 0,
    spread: 0,
    bullets: 1,
    range: 30,
    bulletSpeed: 300,
    color: 0x88dd44,
    fireMode: "semi",
    modelScale: 0.5,
    description: "手雷，范围爆炸",
    isGrenade: true,
    explosionRadius: 8,
  },
};

export const WEAPON_LIST = Object.values(WEAPONS);

export const ITEMS = {
  bandage: {
    name: "Bandage",
    id: "bandage",
    rarity: "common",
    healAmount: 25,
    useTime: 1.5,
    description: "绷带，回复25HP",
    maxStack: 8,
  },
  medkit: {
    name: "Med Kit",
    id: "medkit",
    rarity: "uncommon",
    healAmount: 75,
    useTime: 3.0,
    description: "医疗包，回复75HP",
    maxStack: 3,
  },
  armor: {
    name: "Armor Vest",
    id: "armor",
    rarity: "uncommon",
    damageReduction: 0.35,
    durability: 100,
    description: "护甲，减少35%伤害",
    maxStack: 1,
  },
  helmet: {
    name: "Helmet",
    id: "helmet",
    rarity: "rare",
    damageReduction: 0.25,
    durability: 80,
    description: "头盔，减少25%爆头伤害",
    maxStack: 1,
  },
};

export function createWeaponModel(weaponDef) {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(0.1, 0.15, 0.4);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.9,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0.22, -0.2, -0.35);
  group.add(body);

  const barrelGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.7, 8);
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.2,
    metalness: 0.95,
  });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.22, -0.18, -0.7);
  group.add(barrel);

  const gripGeo = new THREE.BoxGeometry(0.07, 0.2, 0.07);
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x553322,
    roughness: 0.6,
  });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.set(0.22, -0.35, -0.28);
  grip.rotation.x = 0.3;
  group.add(grip);

  const magazineGeo = new THREE.BoxGeometry(0.06, 0.2, 0.04);
  const magazineMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.4,
    metalness: 0.9,
  });
  const magazine = new THREE.Mesh(magazineGeo, magazineMat);
  magazine.position.set(0.22, -0.3, -0.35);
  group.add(magazine);

  // Color accent
  const accentGeo = new THREE.BoxGeometry(0.09, 0.04, 0.35);
  const accentMat = new THREE.MeshStandardMaterial({
    color: weaponDef.color,
    roughness: 0.3,
    metalness: 0.7,
  });
  const accent = new THREE.Mesh(accentGeo, accentMat);
  accent.position.set(0.22, -0.13, -0.35);
  group.add(accent);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.22, -0.18, -1.05);
  group.add(muzzle);

  return { group, muzzle };
}

export function createGroundWeaponModel(weaponDef) {
  const { group, muzzle } = createWeaponModel(weaponDef);
  group.rotation.x = -Math.PI / 2;
  group.position.y = 0.3;
  return group;
}
