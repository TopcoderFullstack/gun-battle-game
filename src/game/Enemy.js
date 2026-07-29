import * as THREE from "three";
import gsap from "gsap";

const enemies = [];
const MODEL_CACHE = {};

function getSkinColor() {
  const colors = [0xffccaa, 0xddbb99, 0xccaa88, 0xffddaa, 0xeeddcc];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getShirtColor() {
  const colors = [0x3366aa, 0x44aa44, 0xaa4444, 0xaa8833, 0x666688, 0x445566];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function createEnemyModel(scene, position, aiProfile) {
  const group = new THREE.Group();
  group.position.copy(position);

  const skinColor = getSkinColor();
  const shirtColor = getShirtColor();

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.15, 0.18, 1.0, 8);
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x334455,
    roughness: 0.7,
  });

  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.18, 0.5, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.18, 0.5, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
  const torsoMat = new THREE.MeshStandardMaterial({
    color: shirtColor,
    roughness: 0.6,
  });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  group.add(torso);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8);
  const armMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.8,
  });

  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.35, 1.2, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.35, 1.2, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // Head
  const headGeo = new THREE.SphereGeometry(0.2, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.7,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);

  // Hair/hat
  const hatColor = Math.random() < 0.5 ? 0x222222 : 0x553322;
  const hairGeo = new THREE.SphereGeometry(0.21, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const hairMat = new THREE.MeshStandardMaterial({
    color: hatColor,
    roughness: 0.8,
  });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.y = 1.75;
  group.add(hair);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.03, 4, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.07, 1.72, -0.18);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.07, 1.72, -0.18);
  group.add(rightEye);

  // Weapon in right hand
  const gunGroup = new THREE.Group();
  const gunGeo = new THREE.BoxGeometry(0.06, 0.08, 0.4);
  const gunMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.2,
    metalness: 0.9,
  });
  const gun = new THREE.Mesh(gunGeo, gunMat);
  gun.position.y = 0.1;
  gunGroup.add(gun);

  const gunBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 0.3, 6),
    gunMat
  );
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.1, -0.3);
  gunGroup.add(gunBarrel);

  gunGroup.position.set(0.4, 1.1, 0);
  group.add(gunGroup);

  // Nametag
  const nametagCanvas = document.createElement("canvas");
  nametagCanvas.width = 128;
  nametagCanvas.height = 32;
  const ntCtx = nametagCanvas.getContext("2d");
  ntCtx.fillStyle = "white";
  ntCtx.font = "bold 16px Arial";
  ntCtx.textAlign = "center";
  ntCtx.fillText(aiProfile.name || "Enemy", 64, 20);
  const ntTex = new THREE.CanvasTexture(nametagCanvas);
  const ntMat = new THREE.SpriteMaterial({
    map: ntTex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const nameSprite = new THREE.Sprite(ntMat);
  nameSprite.scale.set(1.5, 0.38, 1);
  nameSprite.position.y = 2.1;
  group.add(nameSprite);

  // HP bar
  const barCanvas = document.createElement("canvas");
  barCanvas.width = 64;
  barCanvas.height = 8;
  const barCtx = barCanvas.getContext("2d");
  const barTex = new THREE.CanvasTexture(barCanvas);
  const barSprMat = new THREE.SpriteMaterial({
    map: barTex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const hpBar = new THREE.Sprite(barSprMat);
  hpBar.scale.set(1.2, 0.15, 1);
  hpBar.position.y = 2.35;
  group.add(hpBar);

  scene.add(group);

  const enemyData = {
    mesh: group,
    head,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    gunGroup,
    nameSprite,
    hpBar,
    barCanvas,
    barCtx,
    barTex,
    hp: aiProfile.hp || 100,
    maxHp: aiProfile.hp || 100,
    alive: true,
    profile: aiProfile,
    state: "idle",
    stateTimer: 0,
    shootCooldown: 0,
    shootInterval: 0.6 + Math.random() * 1.0,
    accuracy: aiProfile.accuracy || 0.7,
    lastKnownPlayerPos: null,
    patrolPath: [],
    patrolIndex: 0,
    targetItem: null,
    weaponRange: 20,
    weaponDamage: 12,
    damageFlash: 0,
    deathTime: 0,
  };

  updateEnemyHPBar(enemyData);
  enemies.push(enemyData);
  return enemyData;
}

export function updateEnemyHPBar(enemy) {
  const ctx = enemy.barCtx;
  const w = 64;
  ctx.clearRect(0, 0, w, 8);
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, w, 8);

  const ratio = enemy.hp / enemy.maxHp;
  const color =
    ratio > 0.6 ? "#44ff44" : ratio > 0.3 ? "#ffcc00" : "#ff4444";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w * ratio, 8);
  enemy.barTex.needsUpdate = true;
}

export function getEnemies() {
  return enemies;
}

export function hurtEnemy(enemy, damage, scene) {
  if (!enemy.alive) return false;

  enemy.hp -= damage;
  enemy.damageFlash = 0.15;
  updateEnemyHPBar(enemy);

  gsap.to(enemy.torso.material.color, {
    r: 1,
    g: 0.3,
    b: 0.3,
    duration: 0.06,
    onComplete: () => {
      gsap.to(enemy.torso.material.color, {
        r: enemy.profile.shirtR || 0.4,
        g: enemy.profile.shirtG || 0.5,
        b: enemy.profile.shirtB || 0.7,
        duration: 0.15,
      });
    },
  });

  if (enemy.hp <= 0) {
    killEnemy(enemy, scene);
    return true;
  }
  return false;
}

export function killEnemy(enemy, scene) {
  enemy.alive = false;
  enemy.deathTime = 0;

  gsap.to(enemy.mesh.rotation, {
    x: -Math.PI / 2,
    z: 0.3,
    duration: 0.4,
    ease: "power2.in",
  });
  gsap.to(enemy.mesh.position, {
    y: enemy.mesh.position.y - 0.8,
    duration: 0.4,
    ease: "power2.in",
  });

  // Spawn loot box
  spawnDeathLoot(scene, enemy.mesh.position.clone());
}

function spawnDeathLoot(scene, pos) {
  const geo = new THREE.BoxGeometry(0.8, 0.4, 0.6);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xdd8844,
    roughness: 0.5,
    emissive: 0x331100,
    emissiveIntensity: 0.3,
  });
  const box = new THREE.Mesh(geo, mat);
  box.position.copy(pos);
  box.position.y = 0.2;
  box.name = "deathLoot";
  scene.add(box);

  const glowGeo = new THREE.TorusGeometry(0.5, 0.05, 8, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
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
        disposeEnemy(e, scene);
        enemies.splice(i, 1);
      }
    }
  }
}

function disposeEnemy(enemy, scene) {
  enemy.mesh.traverse((c) => {
    if (c.geometry && c.geometry !== enemy.barCanvas) c.geometry.dispose();
    if (c.material) {
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
      else c.material.dispose();
    }
  });
  scene.remove(enemy.mesh);
  enemy.barTex.dispose();
}
