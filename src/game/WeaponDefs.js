import * as THREE from "three";

export const WEAPONS = {
  pistol: {
    name: "Pistol", id: "pistol", rarity: "common",
    damage: 25, cooldown: 0.28, ammo: 15, maxAmmo: 15, reserve: 60,
    reloadTime: 1.2, spread: 0.02, bullets: 1, range: 150,
    bulletSpeed: 700, color: 0xffcc00, fireMode: "semi",
    modelScale: 0.8, description: "9mm 半自动手枪",
  },
  smg: {
    name: "SMG", id: "smg", rarity: "common",
    damage: 18, cooldown: 0.07, ammo: 30, maxAmmo: 30, reserve: 120,
    reloadTime: 1.8, spread: 0.06, bullets: 1, range: 100,
    bulletSpeed: 600, color: 0x00ff88, fireMode: "auto",
    modelScale: 1.0, description: "冲锋枪，高射速",
  },
  shotgun: {
    name: "Shotgun", id: "shotgun", rarity: "uncommon",
    damage: 20, cooldown: 0.75, ammo: 5, maxAmmo: 5, reserve: 30,
    reloadTime: 2.5, spread: 0.18, bullets: 8, range: 60,
    bulletSpeed: 500, color: 0xff6600, fireMode: "semi",
    modelScale: 1.1, description: "霰弹枪，近距离毁灭",
  },
  rifle: {
    name: "AR", id: "rifle", rarity: "uncommon",
    damage: 28, cooldown: 0.12, ammo: 30, maxAmmo: 30, reserve: 120,
    reloadTime: 2.0, spread: 0.04, bullets: 1, range: 200,
    bulletSpeed: 800, color: 0x44aaff, fireMode: "auto",
    modelScale: 1.05, description: "突击步枪，全能型",
  },
  sniper: {
    name: "Sniper", id: "sniper", rarity: "rare",
    damage: 85, cooldown: 1.2, ammo: 5, maxAmmo: 5, reserve: 25,
    reloadTime: 2.8, spread: 0.005, bullets: 1, range: 350,
    bulletSpeed: 1200, color: 0xff4444, fireMode: "semi",
    modelScale: 1.2, description: "狙击步枪，一击致命", scope: true,
  },
  grenade: {
    name: "Grenade", id: "grenade", rarity: "uncommon",
    damage: 100, cooldown: 2.0, ammo: 1, maxAmmo: 1, reserve: 3,
    reloadTime: 0, spread: 0, bullets: 1, range: 30,
    bulletSpeed: 300, color: 0x88dd44, fireMode: "semi",
    modelScale: 0.5, description: "手雷，范围爆炸", isGrenade: true, explosionRadius: 8,
  },
};

export const WEAPON_LIST = Object.values(WEAPONS);

export const ITEMS = {
  bandage: { name: "Bandage", id: "bandage", rarity: "common", healAmount: 25, useTime: 1.5, description: "绷带，回复25HP", maxStack: 8 },
  medkit: { name: "Med Kit", id: "medkit", rarity: "uncommon", healAmount: 75, useTime: 3.0, description: "医疗包，回复75HP", maxStack: 3 },
  armor: { name: "Armor Vest", id: "armor", rarity: "uncommon", damageReduction: 0.35, durability: 100, description: "护甲，减少35%伤害", maxStack: 1 },
  helmet: { name: "Helmet", id: "helmet", rarity: "rare", damageReduction: 0.25, durability: 80, description: "头盔，减少25%暴击伤害", maxStack: 1 },
};

export function createWeaponModel(weaponDef) {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.25, metalness: 0.95 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.9 });
  const accentMat = new THREE.MeshStandardMaterial({ color: weaponDef.color, roughness: 0.2, metalness: 0.85, emissive: weaponDef.color, emissiveIntensity: 0.1 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.55, metalness: 0.05 });

  // === Receiver / Upper Body ===
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.55), darkMetal);
  receiver.position.set(0.22, -0.19, -0.4);
  group.add(receiver);

  // === Barrel ===
  const barrelLen = weaponDef.id === "sniper" ? 1.2 : weaponDef.id === "shotgun" ? 0.9 : 0.7;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, barrelLen, 8), metalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.22, -0.175, -0.4 - barrelLen / 2);
  group.add(barrel);

  // === Barrel shroud / heat shield ===
  if (weaponDef.id === "smg" || weaponDef.id === "rifle") {
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, barrelLen * 0.5, 8, 1, true), darkMetal);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0.22, -0.175, -0.45 - barrelLen * 0.2);
    group.add(shroud);
  }

  // === Scope (for sniper/rifle) ===
  if (weaponDef.scope || weaponDef.id === "rifle") {
    const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8), darkMetal);
    scopeBody.rotation.x = Math.PI / 2;
    scopeBody.position.set(0.22, -0.07, -0.35);
    group.add(scopeBody);
    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.045, 0.05, 8),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.05, metalness: 0.3, emissive: 0x224466, emissiveIntensity: 0.5 }));
    scopeLens.rotation.x = Math.PI / 2;
    scopeLens.position.set(0.22, -0.07, -0.22);
    group.add(scopeLens);
    // Scope mount
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.22), metalMat);
    mount.position.set(0.22, -0.09, -0.35);
    group.add(mount);
  }

  // === Magazine ===
  const magHeight = weaponDef.id === "smg" ? 0.28 : 0.22;
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, magHeight, 0.06), darkMetal);
  mag.position.set(0.22, -0.22 - magHeight / 2, -0.38);
  if (weaponDef.id === "shotgun") {
    // Tubular magazine under barrel
    const tubeMag = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), metalMat);
    tubeMag.rotation.x = Math.PI / 2;
    tubeMag.position.set(0.22, -0.23, -0.55);
    group.add(tubeMag);
  }
  group.add(mag);

  // === Trigger Guard + Trigger ===
  const guardGeo = new THREE.TorusGeometry(0.06, 0.015, 6, 8, Math.PI);
  const guard = new THREE.Mesh(guardGeo, metalMat);
  guard.position.set(0.22, -0.26, -0.2);
  guard.rotation.z = Math.PI / 2;
  group.add(guard);

  const trigger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), darkMetal);
  trigger.position.set(0.22, -0.28, -0.2);
  group.add(trigger);

  // === Grip / Handle ===
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), gripMat);
  grip.position.set(0.22, -0.35, -0.25);
  grip.rotation.x = 0.25;
  group.add(grip);

  // === Stock ===
  if (weaponDef.id === "sniper" || weaponDef.id === "shotgun" || weaponDef.id === "rifle") {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.25), gripMat);
    stock.position.set(0.22, -0.2, -0.1);
    group.add(stock);
    // Butt plate
    const butt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.5 }));
    butt.position.set(0.22, -0.19, 0.02);
    group.add(butt);
  }

  // === Sights ===
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.02), darkMetal);
  frontSight.position.set(0.22, -0.08, -0.7);
  if (!weaponDef.scope) {
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.02), darkMetal);
    rearSight.position.set(0.22, -0.09, -0.25);
    group.add(rearSight);
  }
  group.add(frontSight);

  // === Accent stripe ===
  const accent = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.03, 0.46), accentMat);
  accent.position.set(0.22, -0.125, -0.42);
  group.add(accent);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.22, -0.175, -0.4 - barrelLen);
  group.add(muzzle);

  return { group, muzzle };
}

export function createGroundWeaponModel(weaponDef) {
  const { group } = createWeaponModel(weaponDef);
  group.rotation.x = -Math.PI / 2;
  group.position.y = 0.35;
  return group;
}
