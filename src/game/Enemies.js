import {
  MeshBuilder, StandardMaterial, Color3, Vector3, Mesh,
  PhysicsAggregate, PhysicsShapeType,
} from "@babylonjs/core";
import { checkWallCollision, HALF } from "./Scene.js";
import gsap from "gsap";

const enemies = [];
const NAMES = ["Shadow", "Reaper", "Viper", "Ghost", "Knight", "Raven", "Blaze", "Storm", "Hunter", "Phoenix", "Wolf", "Tiger"];

export function createEnemy(scene, position, skill = "medium") {
  const group = new Mesh("enemy", scene);
  group.position.copyFrom(position);

  const skin = new StandardMaterial("skin", scene);
  skin.diffuseColor = new Color3(0.9, 0.75, 0.6);
  const shirt = new StandardMaterial("shirt", scene);
  const sc = [0.2 + Math.random() * 0.5, 0.2 + Math.random() * 0.5, 0.2 + Math.random() * 0.5];
  shirt.diffuseColor = new Color3(...sc);
  const pants = new StandardMaterial("pants", scene);
  pants.diffuseColor = new Color3(0.2, 0.22, 0.27);

  function addPart(name, geoFn, pos, mat, parent = group) {
    const m = geoFn(name, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    m.parent = parent;
    return m;
  }

  // Body parts
  addPart("torso", (n, s) => MeshBuilder.CreateCylinder(n, { height: 0.7, diameterTop: 0.35, diameterBottom: 0.4, tessellation: 8 }, s), new Vector3(0, 1.15, 0), shirt);
  addPart("head", (n, s) => MeshBuilder.CreateSphere(n, { diameter: 0.35 }, s), new Vector3(0, 1.7, 0), skin);
  addPart("lArm", (n, s) => MeshBuilder.CreateCylinder(n, { height: 0.7, diameter: 0.14, tessellation: 8 }, s), new Vector3(-0.28, 1.15, 0), shirt);
  addPart("rArm", (n, s) => MeshBuilder.CreateCylinder(n, { height: 0.7, diameter: 0.14, tessellation: 8 }, s), new Vector3(0.28, 1.15, 0), shirt);
  addPart("lLeg", (n, s) => MeshBuilder.CreateCylinder(n, { height: 0.8, diameterTop: 0.14, diameterBottom: 0.16, tessellation: 8 }, s), new Vector3(-0.15, 0.4, 0), pants);
  addPart("rLeg", (n, s) => MeshBuilder.CreateCylinder(n, { height: 0.8, diameterTop: 0.14, diameterBottom: 0.16, tessellation: 8 }, s), new Vector3(0.15, 0.4, 0), pants);

  // Weapon
  const gun = MeshBuilder.CreateBox("eGun", { width: 0.05, height: 0.06, depth: 0.4 }, scene);
  gun.position.set(0.35, 1.1, 0);
  gun.material = new StandardMaterial("gunMat", scene);
  gun.material.diffuseColor = new Color3(0.2, 0.2, 0.2);
  gun.parent = group;

  // Nametag
  const tagMat = new StandardMaterial("tag", scene);
  tagMat.diffuseColor = new Color3(1, 1, 1);
  tagMat.emissiveColor = new Color3(1, 1, 1);
  tagMat.disableLighting = true;
  const tag = MeshBuilder.CreatePlane("tag", { width: 1.2, height: 0.3 }, scene);
  tag.position.set(0, 2.1, 0);
  tag.billboardMode = Mesh.BILLBOARDMODE_ALL;
  tag.material = tagMat;
  tag.parent = group;

  // HP bar
  const hpBg = MeshBuilder.CreatePlane("hpBg", { width: 1.0, height: 0.1 }, scene);
  hpBg.position.set(0, 2.3, 0);
  hpBg.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const hpBgMat = new StandardMaterial("hpBgM", scene);
  hpBgMat.diffuseColor = new Color3(0, 0, 0);
  hpBgMat.alpha = 0.6;
  hpBgMat.disableLighting = true;
  hpBg.material = hpBgMat;
  hpBg.parent = group;

  const hpFill = MeshBuilder.CreatePlane("hpFill", { width: 0.96, height: 0.06 }, scene);
  hpFill.position.set(0, 2.3, -0.01);
  hpFill.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const hpMat = new StandardMaterial("hpMat", scene);
  hpMat.diffuseColor = new Color3(0.2, 1, 0.2);
  hpMat.emissiveColor = new Color3(0.2, 1, 0.2);
  hpMat.disableLighting = true;
  hpFill.material = hpMat;
  hpFill.parent = group;

  // Physics
  const agg = new PhysicsAggregate(group, PhysicsShapeType.CAPSULE, { mass: 80, friction: 0.5, restitution: 0 }, scene);
  agg.body.setCollisionCallbackEnabled(true);

  const enemy = {
    group, hpFill, tag, agg,
    hp: 70 + Math.random() * 30, maxHp: 100,
    alive: true,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    profile: { skill, aggression: 0.3 + Math.random() * 0.7, accuracy: 0.3 + Math.random() * 0.7 },
    state: "patrol", stateTimer: 0, shootCd: 0, shootInterval: 0.6 + Math.random(),
    lastKnownPlayerPos: null,
    speed: skill === "hard" ? 5 : skill === "medium" ? 3.8 : 3,
    weaponDamage: skill === "hard" ? 16 : 12,
  };
  enemies.push(enemy);
  return enemy;
}

export function getEnemies() { return enemies; }

export function hurtEnemy(enemy, damage) {
  if (!enemy.alive) return false;
  enemy.hp -= damage;
  const ratio = enemy.hp / enemy.maxHp;
  enemy.hpFill.scaling.x = Math.max(0, ratio);
  if (ratio > 0.5) enemy.hpFill.material.diffuseColor = new Color3(0.2, 1, 0.2);
  else if (ratio > 0.25) enemy.hpFill.material.diffuseColor = new Color3(1, 0.8, 0);
  else enemy.hpFill.material.diffuseColor = new Color3(1, 0.2, 0.2);

  if (enemy.hp <= 0) { enemy.alive = false; return true; }
  return false;
}

export function updateAI(enemy, dt, playerPos, playerAlive, walls) {
  if (!enemy.alive) return null;

  const ex = enemy.group.position.x, ez = enemy.group.position.z;
  const dx = playerPos.x - ex, dz = playerPos.z - ez;
  const dist = Math.sqrt(dx * dx + dz * dz);
  enemy.stateTimer -= dt;
  enemy.shootCd -= dt;

  const canSee = dist < 40 && hasLOS(new Vector3(ex, 1.2, ez), playerPos, walls);

  if (canSee) enemy.lastKnownPlayerPos = playerPos.clone();

  if (enemy.stateTimer <= 0) {
    if (canSee && dist < 15) enemy.state = Math.random() < enemy.profile.aggression ? "combat" : "cover";
    else if (canSee) enemy.state = "chase";
    else if (enemy.lastKnownPlayerPos) enemy.state = "search";
    else enemy.state = "patrol";
    enemy.stateTimer = 1 + Math.random() * 3;
  }

  let mx = 0, mz = 0;
  switch (enemy.state) {
    case "combat":
      if (dist > 4) { mx = (dx / dist) * enemy.speed; mz = (dz / dist) * enemy.speed; }
      else { mx = -(dx / dist) * enemy.speed * 0.3; mz = -(dz / dist) * enemy.speed * 0.3; }
      if (Math.random() < 0.3) { mx += (-dz / dist) * enemy.speed * 0.4; mz += (dx / dist) * enemy.speed * 0.4; }
      break;
    case "chase":
      mx = (dx / dist) * enemy.speed; mz = (dz / dist) * enemy.speed;
      break;
    case "search":
      if (enemy.lastKnownPlayerPos) {
        const sdx = enemy.lastKnownPlayerPos.x - ex, sdz = enemy.lastKnownPlayerPos.z - ez;
        const sd = Math.sqrt(sdx * sdx + sdz * sdz);
        if (sd > 2) { mx = (sdx / sd) * enemy.speed * 0.6; mz = (sdz / sd) * enemy.speed * 0.6; }
      }
      break;
    case "cover": {
      const best = findCover(new Vector3(ex, 1, ez), playerPos, walls);
      if (best) {
        const cdx = best.x - ex, cdz = best.z - ez, cd = Math.sqrt(cdx * cdx + cdz * cdz);
        if (cd > 1) { mx = (cdx / cd) * enemy.speed * 0.6; mz = (cdz / cd) * enemy.speed * 0.6; }
      }
      break;
    }
    case "flee":
      mx = -(dx / (dist || 1)) * enemy.speed * 1.1; mz = -(dz / (dist || 1)) * enemy.speed * 1.1;
      break;
  }

  if (enemy.hp < enemy.maxHp * 0.25 && canSee && dist < 15) {
    mx = -(dx / (dist || 1)) * enemy.speed; mz = -(dz / (dist || 1)) * enemy.speed;
    enemy.state = "flee";
  }

  const nx = ex + mx * dt, nz = ez + mz * dt;
  if (Math.abs(nx) < HALF - 2 && !checkWallCollision(nx, ez, 0.4, walls)) enemy.group.position.x = nx;
  if (Math.abs(nz) < HALF - 2 && !checkWallCollision(enemy.group.position.x, nz, 0.4, walls)) enemy.group.position.z = nz;

  if (dist < 2) enemy.group.rotation.y = Math.atan2(dx, dz);

  let shot = null;
  if (canSee && enemy.shootCd <= 0 && playerAlive && dist < 25 && (enemy.state === "combat" || enemy.state === "chase" || dist < 8)) {
    enemy.shootCd = enemy.shootInterval;
    const spread = (1 - enemy.profile.accuracy) * 0.3;
    const ax = dx + (Math.random() - 0.5) * spread * 10;
    const az = dz + (Math.random() - 0.5) * spread * 10;
    const aim = new Vector3(ax, 0, az).normalize();
    shot = { origin: new Vector3(ex, 1.1, ez), direction: aim, damage: enemy.weaponDamage };
  }
  return shot;
}

function hasLOS(from, to, walls) {
  const dir = to.subtract(from).normalize();
  const dist = Vector3.Distance(from, to);
  for (const w of walls) {
    const t = rayAABB(from, dir, w);
    if (t !== null && t < dist) return false;
  }
  return true;
}

function rayAABB(origin, dir, box) {
  let tmin = -Infinity, tmax = Infinity;
  const inv = [1 / (dir.x || 0.0001), 1 / (dir.y || 0.0001), 1 / (dir.z || 0.0001)];
  const t1 = (box.minX - origin.x) * inv[0], t2 = (box.maxX - origin.x) * inv[0];
  tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
  const t3 = (box.minY - origin.y) * inv[1], t4 = (box.maxY - origin.y) * inv[1];
  tmin = Math.max(tmin, Math.min(t3, t4)); tmax = Math.min(tmax, Math.max(t3, t4));
  const t5 = (box.minZ - origin.z) * inv[2], t6 = (box.maxZ - origin.z) * inv[2];
  tmin = Math.max(tmin, Math.min(t5, t6)); tmax = Math.min(tmax, Math.max(t5, t6));
  return tmax >= Math.max(tmin, 0) ? Math.max(tmin, 0) : null;
}

function findCover(pos, threat, walls) {
  let best = null, bestScore = -Infinity;
  for (const w of walls) {
    for (const c of [{ x: w.minX, z: w.minZ }, { x: w.minX, z: w.maxZ }, { x: w.maxX, z: w.minZ }, { x: w.maxX, z: w.maxZ }]) {
      const cp = new Vector3(c.x, 1, c.z);
      const toThreat = threat.subtract(cp).normalize();
      cp.addInPlace(toThreat.scale(-1.5));
      const d = Vector3.Distance(pos, cp);
      if (d < 25 && !hasLOS(cp, threat, walls)) {
        const score = -d;
        if (score > bestScore) { bestScore = score; best = cp; }
      }
    }
  }
  return best;
}

export function removeDead(scene) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive) {
      scene.removeMesh(enemies[i].group);
      enemies.splice(i, 1);
    }
  }
}
