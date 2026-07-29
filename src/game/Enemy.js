import * as THREE from "three";
import gsap from "gsap";

const enemies = [];

function getSkin() { return [0xffccaa, 0xddbb99, 0xccaa88, 0xffddaa, 0xeeddcc][Math.floor(Math.random() * 5)]; }
function getShirt() { return [0x3366aa, 0x44aa44, 0xaa4444, 0xaa8833, 0x666688, 0x445566, 0x884444, 0x335544][Math.floor(Math.random() * 8)]; }
function getPants() { return [0x333344, 0x445533, 0x444444, 0x553322][Math.floor(Math.random() * 4)]; }

export function createEnemyModel(scene, position, aiProfile) {
  const group = new THREE.Group();
  group.position.copy(position);

  const skin = getSkin();
  const shirt = getShirt();
  const pants = getPants();

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.75 });
  const shoesMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
  const gearMat = new THREE.MeshStandardMaterial({ color: 0x334433, roughness: 0.5, metalness: 0.1 });

  // Shoes
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.3), shoesMat);
  leftShoe.position.set(-0.16, 0.05, 0.04);
  leftShoe.castShadow = true;
  group.add(leftShoe);
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.3), shoesMat);
  rightShoe.position.set(0.16, 0.05, 0.04);
  rightShoe.castShadow = true;
  group.add(rightShoe);

  // Legs
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.85, 8), pantsMat);
  leftLeg.position.set(-0.16, 0.5, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.85, 8), pantsMat);
  rightLeg.position.set(0.16, 0.5, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Belt / waist
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.3, metalness: 0.5 }));
  belt.position.y = 0.95;
  group.add(belt);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.28), shirtMat);
  torso.position.y = 1.32;
  torso.castShadow = true;
  group.add(torso);

  // Vest / tactical gear
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.3), gearMat);
  vest.position.y = 1.3;
  group.add(vest);

  // Pouches on vest
  for (let p = 0; p < 3; p++) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x555533, roughness: 0.5, metalness: 0.1 }));
    pouch.position.set(-0.15 + p * 0.14, 1.3, 0.17);
    group.add(pouch);
  }

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.7, 8);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.32, 1.25, 0);
  leftArm.rotation.z = 0.15;
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.32, 1.25, 0);
  rightArm.rotation.z = -0.15;
  rightArm.castShadow = true;
  group.add(rightArm);

  // Hands
  const handGeo = new THREE.SphereGeometry(0.07, 6, 6);
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.set(-0.35, 0.85, 0);
  group.add(leftHand);
  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.set(0.35, 0.85, 0);
  group.add(rightHand);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8), skinMat);
  neck.position.y = 1.72;
  group.add(neck);

  // Head
  const headGeo = new THREE.SphereGeometry(0.18, 12, 10);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.85;
  head.castShadow = true;
  group.add(head);

  // Hair
  const hairColor = Math.random() < 0.3 ? 0x884422 : Math.random() < 0.5 ? 0x222222 : 0x553322;
  const hairGeo = new THREE.SphereGeometry(0.19, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2.2);
  const hair = new THREE.Mesh(hairGeo, new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 }));
  hair.position.y = 1.89;
  group.add(hair);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.025, 4, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const lEye = new THREE.Mesh(eyeGeo, eyeMat);
  lEye.position.set(-0.06, 1.86, -0.16);
  group.add(lEye);
  const rEye = new THREE.Mesh(eyeGeo, eyeMat);
  rEye.position.set(0.06, 1.86, -0.16);
  group.add(rEye);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.03, 4, 4);
  const lEar = new THREE.Mesh(earGeo, skinMat);
  lEar.position.set(-0.18, 1.85, 0);
  group.add(lEar);
  const rEar = new THREE.Mesh(earGeo, skinMat);
  rEar.position.set(0.18, 1.85, 0);
  group.add(rEar);

  // Backpack
  const bpGeo = new THREE.BoxGeometry(0.28, 0.4, 0.15);
  const bp = new THREE.Mesh(bpGeo, new THREE.MeshStandardMaterial({ color: 0x445544, roughness: 0.6, metalness: 0.1 }));
  bp.position.set(0, 1.2, 0.2);
  group.add(bp);

  // Weapon in right hand
  const gunGroup = new THREE.Group();
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.35), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.9 }));
  gunBody.position.y = 0.08;
  gunGroup.add(gunBody);
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.15, metalness: 0.95 }));
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.08, -0.3);
  gunGroup.add(gunBarrel);
  const gunGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.6 }));
  gunGrip.position.set(0, -0.05, -0.1);
  gunGroup.add(gunGrip);

  gunGroup.position.set(0.38, 1.05, 0.05);
  group.add(gunGroup);

  // Nametag
  const ntCanvas = document.createElement("canvas");
  ntCanvas.width = 128; ntCanvas.height = 32;
  const ntCtx = ntCanvas.getContext("2d");
  ntCtx.fillStyle = "white";
  ntCtx.font = "bold 16px Arial";
  ntCtx.textAlign = "center";
  ntCtx.fillText(aiProfile.name || "Enemy", 64, 20);
  const ntTex = new THREE.CanvasTexture(ntCanvas);
  const ntMat = new THREE.SpriteMaterial({ map: ntTex, transparent: true, depthTest: false, depthWrite: false });
  const nameSprite = new THREE.Sprite(ntMat);
  nameSprite.scale.set(1.5, 0.38, 1);
  nameSprite.position.y = 2.2;
  group.add(nameSprite);

  // HP bar
  const barCanvas = document.createElement("canvas");
  barCanvas.width = 64; barCanvas.height = 8;
  const barCtx = barCanvas.getContext("2d");
  const barTex = new THREE.CanvasTexture(barCanvas);
  const barSprMat = new THREE.SpriteMaterial({ map: barTex, transparent: true, depthTest: false, depthWrite: false });
  const hpBar = new THREE.Sprite(barSprMat);
  hpBar.scale.set(1.2, 0.15, 1);
  hpBar.position.y = 2.3;
  group.add(hpBar);

  scene.add(group);

  const enemy = {
    mesh: group, head, torso, leftArm, rightArm, gunGroup, nameSprite,
    hpBar, barCanvas, barCtx, barTex,
    hp: aiProfile.hp || 100, maxHp: aiProfile.hp || 100, alive: true,
    profile: aiProfile,
    state: "idle", stateTimer: 0, shootCooldown: 0,
    shootInterval: 0.6 + Math.random() * 1.0,
    accuracy: aiProfile.accuracy || 0.7,
    lastKnownPlayerPos: null,
    patrolPath: [], patrolIndex: 0, targetItem: null,
    weaponRange: 25, weaponDamage: 14,
    damageFlash: 0, deathTime: 0,
  };
  updateEnemyHPBar(enemy);
  enemies.push(enemy);
  return enemy;
}

export function updateEnemyHPBar(enemy) {
  const ctx = enemy.barCtx;
  const w = 64;
  ctx.clearRect(0, 0, w, 8);
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, w, 8);
  const ratio = enemy.hp / enemy.maxHp;
  ctx.fillStyle = ratio > 0.6 ? "#44ff44" : ratio > 0.3 ? "#ffcc00" : "#ff4444";
  ctx.fillRect(0, 0, w * ratio, 8);
  enemy.barTex.needsUpdate = true;
}

export function getEnemies() { return enemies; }

export function hurtEnemy(enemy, damage, scene) {
  if (!enemy.alive) return false;
  enemy.hp -= damage;
  enemy.damageFlash = 0.15;
  updateEnemyHPBar(enemy);

  gsap.to(enemy.torso.material.color, { r: 1, g: 0.2, b: 0.2, duration: 0.06 });
  setTimeout(() => {
    const c = new THREE.Color(enemy.profile.shirtR || 0.4, enemy.profile.shirtG || 0.5, enemy.profile.shirtB || 0.7);
    enemy.torso.material.color.copy(c);
  }, 80);

  if (enemy.hp <= 0) { killEnemy(enemy, scene); return true; }
  return false;
}

export function killEnemy(enemy, scene) {
  enemy.alive = false;
  enemy.deathTime = 0;

  gsap.to(enemy.mesh.rotation, { x: -Math.PI / 2, z: 0.3, duration: 0.4, ease: "power2.in" });
  gsap.to(enemy.mesh.position, { y: enemy.mesh.position.y - 0.5, duration: 0.4, ease: "power2.in" });

  spawnDeathLoot(scene, enemy.mesh.position.clone());
}

function spawnDeathLoot(scene, pos) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.4, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xdd8844, roughness: 0.5, emissive: 0x331100, emissiveIntensity: 0.4 })
  );
  box.position.copy(pos);
  box.position.y = 0.2;
  box.name = "deathLoot";
  scene.add(box);
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.05, 8, 16),
    new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.5, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(pos.x, 0.15, pos.z);
  glow.name = "deathLootGlow";
  scene.add(glow);
}

export function removeDeadEnemies(scene) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.alive) {
      e.deathTime += 0.016;
      if (e.deathTime > 8) {
        e.mesh.traverse((c) => { if (c.geometry && c.geometry !== e.barCanvas) c.geometry.dispose(); if (c.material && !Array.isArray(c.material)) c.material.dispose(); });
        scene.remove(e.mesh);
        e.barTex.dispose();
        enemies.splice(i, 1);
      }
    }
  }
}
