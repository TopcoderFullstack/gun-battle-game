import * as THREE from "three";
import gsap from "gsap";

const enemies = [];
const ENEMY_SPEED = 4.5;
const ENEMY_RADIUS = 0.6;
const ENEMY_HP = 60;

export function createEnemy(scene, position, type = "grunt") {
  const group = new THREE.Group();
  group.position.copy(position);

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.6, 8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: type === "heavy" ? 0xcc3333 : 0xdd6633,
    roughness: 0.5,
    metalness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.8;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffccaa,
    roughness: 0.6,
    metalness: 0,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.8;
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.1, 1.82, -0.26);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.1, 1.82, -0.26);
  group.add(rightEye);

  // Weapon (simple cylinder on right side)
  const gunGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6);
  const gunMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.8,
  });
  const gun = new THREE.Mesh(gunGeo, gunMat);
  gun.rotation.z = Math.PI / 2;
  gun.position.set(0.45, 0.9, 0);
  group.add(gun);

  // HP bar (billboard)
  const barCanvas = document.createElement("canvas");
  barCanvas.width = 64;
  barCanvas.height = 8;
  const barCtx = barCanvas.getContext("2d");
  const barTex = new THREE.CanvasTexture(barCanvas);
  const barMat = new THREE.SpriteMaterial({
    map: barTex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const hpBar = new THREE.Sprite(barMat);
  hpBar.scale.set(1.5, 0.2, 1);
  hpBar.position.y = 2.2;

  function updateBar(hp, maxHp) {
    barCtx.clearRect(0, 0, 64, 8);
    barCtx.fillStyle = "rgba(0,0,0,0.6)";
    barCtx.fillRect(0, 0, 64, 8);
    const ratio = hp / maxHp;
    barCtx.fillStyle =
      ratio > 0.5 ? "#44ff44" : ratio > 0.25 ? "#ffcc00" : "#ff4444";
    barCtx.fillRect(0, 0, 64 * ratio, 8);
    barTex.needsUpdate = true;
  }

  updateBar(ENEMY_HP, ENEMY_HP);
  group.add(hpBar);

  scene.add(group);

  const enemyData = {
    mesh: group,
    body,
    head,
    hpBar,
    updateBar,
    hp: ENEMY_HP,
    maxHp: ENEMY_HP,
    speed: ENEMY_SPEED,
    radius: ENEMY_RADIUS * 0.6,
    cooldown: 0,
    shootInterval: type === "heavy" ? 1.5 : 2.0,
    damage: type === "heavy" ? 18 : 10,
    type,
    alive: true,
    state: "idle",
    stateTimer: 0,
    patrolTarget: null,
    deathAnim: null,
  };

  enemies.push(enemyData);
  return enemyData;
}

export function updateEnemies(dt, playerPos, playerAlive, walls, scene) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const dx = playerPos.x - enemy.mesh.position.x;
    const dz = playerPos.z - enemy.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Face player
    const targetAngle = Math.atan2(dx, dz);
    enemy.mesh.rotation.y = targetAngle;

    // State machine
    enemy.stateTimer -= dt;
    enemy.cooldown -= dt;

    if (dist < 25) {
      if (enemy.stateTimer <= 0) {
        if (dist < 8) {
          enemy.state = Math.random() < 0.4 ? "strafe" : "chase";
        } else if (dist < 15) {
          enemy.state =
            Math.random() < 0.6
              ? "chase"
              : Math.random() < 0.5
              ? "shoot"
              : "strafe";
        } else {
          enemy.state = "chase";
        }
        enemy.stateTimer = 1 + Math.random() * 2;
      }
    } else {
      enemy.state = "idle";
    }

    let moveX = 0;
    let moveZ = 0;

    switch (enemy.state) {
      case "chase":
        if (dist > 5) {
          moveX = (dx / dist) * enemy.speed * dt;
          moveZ = (dz / dist) * enemy.speed * dt;
        }
        break;
      case "strafe": {
        const perpX = -dz / (dist || 1);
        const perpZ = dx / (dist || 1);
        const dir = Math.sin(enemy.stateTimer * 3) > 0 ? 1 : -1;
        moveX = perpX * enemy.speed * 0.6 * dir * dt;
        moveZ = perpZ * enemy.speed * 0.6 * dir * dt;
        if (dist > 6) {
          moveX += (dx / dist) * enemy.speed * 0.3 * dt;
          moveZ += (dz / dist) * enemy.speed * 0.3 * dt;
        }
        break;
      }
      case "shoot":
        // Stand and shoot
        break;
      case "idle":
      default:
        break;
    }

    // Apply movement with collision
    const newX = enemy.mesh.position.x + moveX;
    const newZ = enemy.mesh.position.z + moveZ;
    if (!checkWallCollision(newX, enemy.mesh.position.z, enemy.radius, walls)) {
      enemy.mesh.position.x = newX;
    }
    if (!checkWallCollision(enemy.mesh.position.x, newZ, enemy.radius, walls)) {
      enemy.mesh.position.z = newZ;
    }

    // Avoid other enemies
    for (const other of enemies) {
      if (other === enemy || !other.alive) continue;
      const edx = enemy.mesh.position.x - other.mesh.position.x;
      const edz = enemy.mesh.position.z - other.mesh.position.z;
      const edist = Math.sqrt(edx * edx + edz * edz);
      if (edist < enemy.radius * 3 && edist > 0) {
        const push = (enemy.radius * 3 - edist) * 0.3;
        enemy.mesh.position.x += (edx / edist) * push;
        enemy.mesh.position.z += (edz / edist) * push;
      }
    }

    // Enemy shooting
    if (enemy.cooldown <= 0 && dist < 20 && playerAlive) {
      enemy.cooldown = enemy.shootInterval;
      const muzzlePos = enemy.mesh.position.clone();
      muzzlePos.y = 0.9;
      muzzlePos.x += Math.sin(targetAngle) * 0.5;
      muzzlePos.z += Math.cos(targetAngle) * 0.5;
      return { muzzlePos, direction: new THREE.Vector3(dx, 0, dz).normalize() };
    }
  }
  return null;
}

export function hurtEnemy(enemy, damage, scene) {
  if (!enemy.alive) return false;
  enemy.hp -= damage;
  enemy.updateBar(enemy.hp, enemy.maxHp);

  // Flash red
  gsap.to(enemy.body.material.color, {
    r: 1,
    g: 0,
    b: 0,
    duration: 0.05,
    yoyo: true,
    repeat: 1,
  });

  if (enemy.hp <= 0) {
    killEnemy(enemy, scene);
    return true; // enemy killed
  }
  return false;
}

function killEnemy(enemy, scene) {
  enemy.alive = false;

  // Death animation - fall over
  gsap.to(enemy.mesh.rotation, {
    x: Math.PI / 2,
    duration: 0.5,
    ease: "power2.in",
  });
  gsap.to(enemy.mesh.position, {
    y: enemy.mesh.position.y - 0.8,
    duration: 0.5,
    ease: "power2.in",
    onComplete: () => {
      // Fade out and remove after a bit
      gsap.to(enemy.mesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        delay: 2,
        ease: "power2.in",
        onComplete: () => {
          scene.remove(enemy.mesh);
          disposeEnemy(enemy);
        },
      });
    },
  });
}

function disposeEnemy(enemy) {
  enemy.mesh.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }
  });
  const idx = enemies.indexOf(enemy);
  if (idx > -1) enemies.splice(idx, 1);
}

export function getEnemies() {
  return enemies;
}

export function checkWallCollision(px, pz, radius, walls) {
  for (const w of walls) {
    const closestX = Math.max(w.minX, Math.min(px, w.maxX));
    const closestZ = Math.max(w.minZ, Math.min(pz, w.maxZ));
    const dx = px - closestX;
    const dz = pz - closestZ;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

export function findSpawnPoint(walls) {
  const mapHalf = 36;
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = (Math.random() - 0.5) * mapHalf * 2;
    const z = (Math.random() - 0.5) * mapHalf * 2;
    if (!checkWallCollision(x, z, 1, walls)) {
      // Make sure spawn is at least 15 units from origin (player start)
      if (Math.sqrt(x * x + z * z) > 15) {
        return new THREE.Vector3(x, 0, z);
      }
    }
  }
  return new THREE.Vector3(20, 0, 20);
}
