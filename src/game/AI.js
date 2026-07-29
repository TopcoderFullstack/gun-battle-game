import * as THREE from "three";
import { checkWallCollision } from "./Scene.js";
import { getBuildings } from "./Scene.js";

const AI_NAMES = [
  "Shadow", "Reaper", "Viper", "Ghost", "Knight",
  "Raven", "Blaze", "Storm", "Hunter", "Phoenix",
  "Wolf", "Tiger", "Cobra", "Falcon", "Hawk",
];

export function generateAIProfile(skill) {
  return {
    name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)],
    skill: skill || ["easy", "medium", "hard"][Math.floor(Math.random() * 3)],
    aggression: 0.3 + Math.random() * 0.7, // How likely to engage
    accuracy: 0.3 + Math.random() * 0.7, // Shot accuracy
    reactionTime: 0.2 + Math.random() * 0.8, // Delay before reacting
    cowardice: Math.random() * 0.6, // How likely to flee when low HP
    looting: 0.3 + Math.random() * 0.7, // How likely to search for items
    hp: 60 + Math.random() * 40,
    shirtR: 0.2 + Math.random() * 0.5,
    shirtG: 0.2 + Math.random() * 0.5,
    shirtB: 0.2 + Math.random() * 0.5,
  };
}

export function updateAI(enemy, dt, playerPos, playerAlive, walls, mapHalf) {
  if (!enemy.alive) return null;

  const ex = enemy.mesh.position.x;
  const ez = enemy.mesh.position.z;
  const dx = playerPos.x - ex;
  const dz = playerPos.z - ez;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // AI decision making
  enemy.stateTimer -= dt;
  enemy.shootCooldown -= dt;

  // Can see player? (line of sight check)
  const canSeePlayer = hasLineOfSight(
    new THREE.Vector3(ex, 1.2, ez),
    new THREE.Vector3(playerPos.x, 1.6, playerPos.z),
    walls
  );

  if (canSeePlayer && dist < 60) {
    if (enemy.lastKnownPlayerPos) {
      enemy.lastKnownPlayerPos.copy(playerPos);
    } else {
      enemy.lastKnownPlayerPos = playerPos.clone();
    }
  }

  // Decide state
  if (!canSeePlayer && dist > 30) {
    // Patrol or search
    if (enemy.stateTimer <= 0) {
      if (enemy.lastKnownPlayerPos && Math.random() < enemy.profile.aggression * 0.5) {
        enemy.state = "search";
      } else if (Math.random() < enemy.profile.looting) {
        enemy.state = "loot";
      } else {
        enemy.state = "patrol";
      }
      enemy.stateTimer = 2 + Math.random() * 4;
    }
  } else if (canSeePlayer) {
    if (dist < 8) {
      enemy.state = Math.random() < 0.3 ? "combat" : "flank";
      enemy.stateTimer = 1 + Math.random() * 1.5;
    } else if (dist < 30) {
      enemy.state = Math.random() < enemy.profile.aggression ? "combat" : "cover";
      enemy.stateTimer = 1.5 + Math.random() * 2;
    } else {
      enemy.state = Math.random() < 0.5 ? "chase" : "snipe";
      enemy.stateTimer = 2 + Math.random() * 3;
    }
  }

  // Face direction
  if (canSeePlayer || (enemy.lastKnownPlayerPos && enemy.state !== "patrol" && enemy.state !== "loot")) {
    const target = enemy.lastKnownPlayerPos || playerPos;
    enemy.mesh.rotation.y = Math.atan2(
      target.x - ex,
      target.z - ez
    );
  }

  // Execute state
  let moveX = 0;
  let moveZ = 0;
  const speed = enemy.profile.skill === "hard" ? 5 : enemy.profile.skill === "medium" ? 4 : 3.5;

  switch (enemy.state) {
    case "patrol":
      if (enemy.patrolPath.length === 0) {
        generatePatrolPath(enemy, mapHalf);
      }
      if (enemy.patrolPath.length > 0) {
        const target = enemy.patrolPath[enemy.patrolIndex];
        const tdx = target.x - ex;
        const tdz = target.z - ez;
        const tdist = Math.sqrt(tdx * tdx + tdz * tdz);
        if (tdist < 1.5) {
          enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
        } else {
          moveX = (tdx / tdist) * speed * 0.5;
          moveZ = (tdz / tdist) * speed * 0.5;
          enemy.mesh.rotation.y = Math.atan2(tdx, tdz);
        }
      }
      break;

    case "search":
      if (enemy.lastKnownPlayerPos) {
        const sdx = enemy.lastKnownPlayerPos.x - ex;
        const sdz = enemy.lastKnownPlayerPos.z - ez;
        const sdist = Math.sqrt(sdx * sdx + sdz * sdz);
        if (sdist > 2) {
          moveX = (sdx / sdist) * speed * 0.7;
          moveZ = (sdz / sdist) * speed * 0.7;
        } else {
          enemy.lastKnownPlayerPos = null;
        }
      }
      break;

    case "loot":
      if (!enemy.targetItem) {
        const buildings = getBuildings();
        const b = buildings[Math.floor(Math.random() * buildings.length)];
        enemy.targetItem = new THREE.Vector3(
          b.x + (Math.random() - 0.5) * b.w * 0.7,
          b.z + (Math.random() - 0.5) * b.d * 0.7
        );
      }
      if (enemy.targetItem) {
        const ldx = enemy.targetItem.x - ex;
        const ldz = enemy.targetItem.z - ez;
        const ldist = Math.sqrt(ldx * ldx + ldz * ldz);
        if (ldist < 1.5) {
          enemy.targetItem = null;
        } else {
          moveX = (ldx / ldist) * speed * 0.6;
          moveZ = (ldz / ldist) * speed * 0.6;
          enemy.mesh.rotation.y = Math.atan2(ldx, ldz);
        }
      }
      break;

    case "combat":
      if (dist > 5) {
        moveX = (dx / dist) * speed;
        moveZ = (dz / dist) * speed;
      } else if (dist < 3) {
        moveX = -(dx / dist) * speed * 0.5;
        moveZ = -(dz / dist) * speed * 0.5;
      }
      // Strafing
      if (Math.random() < 0.3) {
        const strafeX = -dz / (dist || 1);
        const strafeZ = dx / (dist || 1);
        moveX += strafeX * speed * 0.4 * (Math.random() < 0.5 ? 1 : -1);
        moveZ += strafeZ * speed * 0.4 * (Math.random() < 0.5 ? 1 : -1);
      }
      break;

    case "flank":
      const flankAngle = Math.atan2(dx, dz) + (Math.PI / 3) * (Math.random() < 0.5 ? 1 : -1);
      moveX = Math.sin(flankAngle) * speed * 0.8;
      moveZ = Math.cos(flankAngle) * speed * 0.8;
      break;

    case "cover":
      // Move to nearest cover
      const bestCover = findCover(
        new THREE.Vector3(ex, 1, ez),
        playerPos,
        walls
      );
      if (bestCover) {
        const cdx = bestCover.x - ex;
        const cdz = bestCover.z - ez;
        const cdist = Math.sqrt(cdx * cdx + cdz * cdz);
        if (cdist > 1) {
          moveX = (cdx / cdist) * speed * 0.8;
          moveZ = (cdz / cdist) * speed * 0.8;
        }
      }
      break;

    case "chase":
      moveX = (dx / dist) * speed;
      moveZ = (dz / dist) * speed;
      break;

    case "snipe":
      // Stand still or strafe slightly
      if (Math.random() < 0.2) {
        const snipeX = (dx / dist) * speed * 0.2;
        const snipeZ = (dz / dist) * speed * 0.2;
        moveX = snipeX;
        moveZ = snipeZ;
      }
      break;
  }

  // Flee if low HP
  if (
    enemy.hp < enemy.maxHp * 0.25 &&
    enemy.profile.cowardice > 0.4 &&
    canSeePlayer
  ) {
    if (dist < 20) {
      moveX = -(dx / (dist || 1)) * speed * 1.2;
      moveZ = -(dz / (dist || 1)) * speed * 1.2;
      enemy.state = "flee";
    }
  }

  // Apply movement with collision
  const newX = ex + moveX * dt;
  const newZ = ez + moveZ * dt;
  const halfMap = mapHalf;

  if (Math.abs(newX) < halfMap && !checkWallCollision(newX, ez, 0.4, walls)) {
    enemy.mesh.position.x = newX;
  }
  if (Math.abs(newZ) < halfMap && !checkWallCollision(enemy.mesh.position.x, newZ, 0.4, walls)) {
    enemy.mesh.position.z = newZ;
  }

  // Shooting logic
  let shootData = null;
  if (
    canSeePlayer &&
    dist < enemy.weaponRange &&
    enemy.shootCooldown <= 0 &&
    playerAlive &&
    (enemy.state === "combat" || enemy.state === "snipe" || enemy.state === "flank" || dist < 10)
  ) {
    enemy.shootCooldown = enemy.shootInterval;

    // Accuracy affects spread
    const accuracySpread = (1 - enemy.accuracy) * 0.3;
    const aimX = dx + (Math.random() - 0.5) * accuracySpread * 10;
    const aimZ = dz + (Math.random() - 0.5) * accuracySpread * 10;
    const aimDir = new THREE.Vector3(aimX, 0, aimZ).normalize();

    shootData = {
      origin: new THREE.Vector3(ex, 1.1, ez),
      direction: aimDir,
      damage: enemy.weaponDamage,
      enemy: enemy,
    };
  }

  return shootData;
}

function generatePatrolPath(enemy, mapHalf) {
  const path = [];
  const count = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    path.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * mapHalf * 1.6,
        (Math.random() - 0.5) * mapHalf * 1.6
      )
    );
  }
  enemy.patrolPath = path;
  enemy.patrolIndex = 0;
}

function hasLineOfSight(from, to, walls) {
  const dir = to.clone().sub(from).normalize();
  const dist = from.distanceTo(to);

  for (const wall of walls) {
    const t = rayAABB(from, dir, wall);
    if (t !== null && t < dist) return false;
  }
  return true;
}

function rayAABB(origin, dir, box) {
  let tmin = -Infinity;
  let tmax = Infinity;
  const invX = 1 / (dir.x || 0.0001);
  const invY = 1 / (dir.y || 0.0001);
  const invZ = 1 / (dir.z || 0.0001);

  const tx1 = (box.minX - origin.x) * invX;
  const tx2 = (box.maxX - origin.x) * invX;
  tmin = Math.max(tmin, Math.min(tx1, tx2));
  tmax = Math.min(tmax, Math.max(tx1, tx2));

  const ty1 = (box.minY - origin.y) * invY;
  const ty2 = (box.maxY - origin.y) * invY;
  tmin = Math.max(tmin, Math.min(ty1, ty2));
  tmax = Math.min(tmax, Math.max(ty1, ty2));

  const tz1 = (box.minZ - origin.z) * invZ;
  const tz2 = (box.maxZ - origin.z) * invZ;
  tmin = Math.max(tmin, Math.min(tz1, tz2));
  tmax = Math.min(tmax, Math.max(tz1, tz2));

  return tmax >= Math.max(tmin, 0) ? Math.max(tmin, 0) : null;
}

function findCover(pos, threatPos, walls) {
  let best = null;
  let bestScore = -Infinity;

  for (const wall of walls) {
    // Use corner points
    const corners = [
      { x: wall.minX, z: wall.minZ },
      { x: wall.minX, z: wall.maxZ },
      { x: wall.maxX, z: wall.minZ },
      { x: wall.maxX, z: wall.maxZ },
    ];

    for (const c of corners) {
      const coverPos = new THREE.Vector3(c.x, 0, c.z);
      // Offset from wall
      const toThreat = threatPos.clone().sub(coverPos).normalize();
      coverPos.addScaledVector(toThreat, -1.5);

      const dist = pos.distanceTo(coverPos);
      const blocksView = !hasLineOfSight(
        new THREE.Vector3(coverPos.x, 1, coverPos.z),
        threatPos,
        walls
      );

      if (blocksView && dist < 30) {
        const score = -dist;
        if (score > bestScore) {
          bestScore = score;
          best = coverPos;
        }
      }
    }
  }
  return best;
}
