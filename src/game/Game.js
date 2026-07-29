import * as THREE from "three";
import gsap from "gsap";
import { createSky, createClouds, createTrees, createBuildings, createTerrain, getMapHalf, setAllWalls, checkWallCollision } from "./Scene.js";
import { spawnLoot, getPickups, updatePickups } from "./Pickups.js";
import { Inventory } from "./Inventory.js";
import { createEnemyModel, getEnemies, hurtEnemy, removeDeadEnemies } from "./Enemy.js";
import { generateAIProfile, updateAI } from "./AI.js";
import { ZoneManager } from "./Zone.js";
import { createMuzzleFlash, triggerMuzzleFlash, showTrail, spawnBulletImpact, spawnExplosion, updateParticles, cleanupEffects } from "./Effects.js";
import { HUD } from "./HUD.js";
import { sfxShoot, sfxRifle, sfxShotgun, sfxSniper, sfxHit, sfxExplosion, sfxPickup, sfxDamage, sfxReload } from "./Audio.js";

const scene = new THREE.Scene();

class Game {
  constructor() {
    this.renderer = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    this.state = "menu";
    this.keys = {};
    this.playerPos = new THREE.Vector3(0, 1.6, 0);
    this.playerVelocity = new THREE.Vector3();
    this.playerOnGround = true;
    this.playerHP = 100;
    this.playerMaxHP = 100;
    this.score = 0;
    this.kills = 0;
    this.isShooting = false;
    this.weaponCooldown = 0;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");
    this.isPointerLocked = false;
    this.invulnTimer = 0;
    this.walls = [];
    this.totalNPCs = 12;
    this.aliveNPCs = 0;
    this.healCooldown = 0;

    this.hud = new HUD();
    this.inventory = null;
    this.zone = null;
    this.muzzleFlash = null;
    this.clouds = null;
  }

  init() {
    this.setupRenderer();
    this.buildScene();
    this.setupCamera();
    this.inventory = new Inventory(scene, this.camera);
    this.muzzleFlash = createMuzzleFlash(scene);
    this.setupInput();
    this.setupStartButton();
    this.renderer.setAnimationLoop((time) => this.gameLoop(time));
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.getElementById("app").prepend(this.renderer.domElement);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  buildScene() {
    scene.background = new THREE.Color(0x8899cc);
    createSky(scene);
    this.clouds = createClouds(scene);
    const buildWalls = createBuildings(scene);
    const treeWalls = [];
    createTrees(scene, treeWalls);
    createTerrain(scene);
    this.walls = [...buildWalls, ...treeWalls];
    setAllWalls(this.walls);
    this.zone = new ZoneManager(scene);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.copy(this.playerPos);
    scene.add(this.camera);
  }

  setupInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;

      if (e.code === "Digit1") this.switchWeapon(0);
      if (e.code === "Digit2") this.switchWeapon(1);
      if (e.code === "KeyR") this.startReload();
      if (e.code === "KeyE") this.tryPickup();
      if (e.code === "KeyF") this.useBandage();
      if (e.code === "KeyG") this.throwGrenade();
    });

    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0 && this.state === "playing") {
        this.isShooting = true;
        if (!this.isPointerLocked) this.renderer.domElement.requestPointerLock();
      }
    });

    window.addEventListener("mouseup", (e) => { if (e.button === 0) this.isShooting = false; });

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isPointerLocked || this.state !== "playing") return;
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= e.movementX * 0.002;
      this.euler.x -= e.movementY * 0.002;
      this.euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });

    document.addEventListener("wheel", (e) => {
      if (this.state !== "playing") return;
      // Cycle weapons on scroll
      if (e.deltaY > 0) this.switchWeapon(1);
      else this.switchWeapon(0);
    });
  }

  setupStartButton() {
    this.hud.elements.startBtn.addEventListener("click", () => this.startGame());
  }

  startGame() {
    // Clean up previous game
    cleanupEffects(scene);
    removeAllNPCs();
    scene.children.forEach((c) => {
      if (c.name === "deathLoot" || c.name === "deathLootGlow") scene.remove(c);
    });

    // Reset player
    this.playerHP = this.playerMaxHP;
    this.score = 0;
    this.kills = 0;
    this.isShooting = false;
    this.weaponCooldown = 0;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.invulnTimer = 0;
    this.healCooldown = 0;
    this.playerPos.set(0, 1.6, 0);
    this.playerVelocity.set(0, 0, 0);
    this.playerOnGround = true;
    this.euler.set(0, 0, 0, "YXZ");
    this.camera.position.copy(this.playerPos);
    this.camera.quaternion.setFromEuler(this.euler);

    // Reset inventory
    this.inventory = new Inventory(scene, this.camera);
    this.muzzleFlash = createMuzzleFlash(scene);

    // Spawn loot
    spawnLoot(scene);

    // Spawn NPCs
    this.spawnNPCs(this.totalNPCs);

    // Reset zone
    this.zone = new ZoneManager(scene);

    this.state = "playing";
    this.hud.hideStartScreen();
    this.hud.setCrosshairVisible(true);
    this.renderer.domElement.requestPointerLock();
  }

  spawnNPCs(count) {
    const half = getMapHalf();
    for (let i = 0; i < count; i++) {
      const skill = i < 3 ? "hard" : i < 7 ? "medium" : "easy";
      const profile = generateAIProfile(skill);
      const spawn = this.findSpawnPoint();
      createEnemyModel(scene, spawn, profile);
    }
    this.aliveNPCs = count;
  }

  findSpawnPoint() {
    const half = getMapHalf();
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * half * 1.8;
      const z = (Math.random() - 0.5) * half * 1.8;
      if (!checkWallCollision(x, z, 0.5, this.walls) &&
          new THREE.Vector3(x, 0, z).distanceTo(this.playerPos) > 25) {
        return new THREE.Vector3(x, 0, z);
      }
    }
    return new THREE.Vector3(half * 0.8, 0, half * 0.8);
  }

  switchWeapon(slot) {
    if (this.isReloading) return;
    const result = this.inventory.switchWeapon(slot);
    if (result) {
      this.weaponCooldown = 0;
      this.hud.updateWeapon(result.def.name, result.ammo, result.reserve, result.def.ammo === Infinity);
    }
  }

  startReload() {
    if (this.isReloading) return;
    const info = this.inventory.getInfo();
    if (info.ammo >= info.currentWeapon.def?.maxAmmo) return;
    const success = this.inventory.reload();
    if (success) {
      const w = this.inventory.getCurrentWeapon();
      this.isReloading = true;
      this.reloadTimer = w.def.reloadTime;
      this.hud.showReloading();
      sfxReload();
    }
  }

  tryPickup() {
    const pickups = getPickups();
    const pos = this.playerPos.clone();
    let closestDist = 3;
    let closestPk = null;

    for (const pk of pickups) {
      if (pk.removed) continue;
      const d = pos.distanceTo(pk.position);
      if (d < closestDist) {
        closestDist = d;
        closestPk = pk;
      }
    }

    if (closestPk) {
      const result = this.inventory.pickup(closestPk.def, closestPk.type);
      if (result && result.action !== "full") {
        closestPk.removed = true;
        sfxPickup();
        this.hud.updateBackpack(this.inventory);
        const info = this.inventory.getInfo();
        this.hud.updateWeapon(info.currentWeapon, info.ammo, info.reserve, info.isInfAmmo);
      }
    }
  }

  useBandage() {
    if (this.healCooldown > 0 || this.playerHP >= this.playerMaxHP) return;
    const result = this.inventory.useItem("bandage");
    if (result) {
      this.playerHP = Math.min(this.playerMaxHP, this.playerHP + result.heal);
      this.healCooldown = 2;
      this.hud.updateBackpack(this.inventory);
    }
  }

  throwGrenade() {
    if (!this.inventory.hasGrenade()) return;
    if (this.weaponCooldown > 0) return;
    this.inventory.useGrenade();

    const dir = new THREE.Vector3(0, 0.3, -1).applyQuaternion(this.camera.quaternion).normalize();
    const origin = this.camera.position.clone();
    const grenade = {
      pos: origin.clone(),
      vel: dir.clone().multiplyScalar(20),
      life: 3,
      exploded: false,
      radius: 8,
    };

    this.activeGrenade = grenade;
    this.weaponCooldown = 2;
  }

  shoot() {
    if (this.isReloading) return;
    if (this.weaponCooldown > 0) return;

    const w = this.inventory.getCurrentWeapon();
    const model = this.inventory.getActiveModel();

    if (!this.inventory.consumeAmmo(w.def.bullets)) return;

    const def = w.def;
    if (def.isGrenade) {
      this.throwGrenade();
      return;
    }

    for (let i = 0; i < def.bullets; i++) {
      const spreadX = (Math.random() - 0.5) * def.spread * 2;
      const spreadY = (Math.random() - 0.5) * def.spread * 2;
      const dir = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(this.camera.quaternion)
        .add(new THREE.Vector3(spreadX, spreadY, 0))
        .normalize();

      const origin = this.camera.position.clone();
      const raycaster = new THREE.Raycaster(origin, dir, 0, def.range);
      let hitPoint = null;

      for (const wall of this.walls) {
        const t = this.rayAABB(origin, dir, wall);
        if (t !== null && t < def.range) {
          const pt = origin.clone().addScaledVector(dir, t);
          if (!hitPoint || origin.distanceTo(pt) < origin.distanceTo(hitPoint)) {
            hitPoint = pt;
          }
        }
      }

      const enemies = getEnemies();
      let hitEnemy = null;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const sphereCenter = enemy.mesh.position.clone();
        sphereCenter.y += 1.2;
        const t = this.raySphere(origin, dir, sphereCenter, 0.6);
        if (t !== null && t < def.range && (!hitPoint || t < origin.distanceTo(hitPoint))) {
          hitPoint = origin.clone().addScaledVector(dir, t);
          hitEnemy = enemy;
        }
      }

      if (hitEnemy) {
        const killed = hurtEnemy(hitEnemy, def.damage, scene);
        sfxHit();
        spawnBulletImpact(scene, hitPoint, new THREE.Vector3(0, 1, 0));
        this.hud.showHitMarker();
        this.score += 10;

        if (killed) {
          this.kills++;
          this.aliveNPCs--;
          this.score += 200;
          sfxExplosion();
        }
      } else if (hitPoint) {
        spawnBulletImpact(scene, hitPoint, new THREE.Vector3(0, 1, 0));
        showTrail(scene, origin, hitPoint, def.color);
      } else {
        showTrail(scene, origin, origin.clone().addScaledVector(dir, def.range), def.color);
      }
    }

    // Muzzle flash
    const muzzlePoint = this.inventory.getMuzzlePoint();
    if (muzzlePoint) {
      const worldPos = new THREE.Vector3();
      muzzlePoint.getWorldPosition(worldPos);
      triggerMuzzleFlash(this.muzzleFlash, worldPos, def.color);
    }

    // Recoil
    if (model) {
      gsap.to(model.group.position, { z: 0.08, y: -0.03, duration: 0.04, yoyo: true, repeat: 1 });
    }

    // Screen shake for sniper
    if (def.id === "sniper") {
      this.screenShake = 0.08;
    }

    this.weaponCooldown = def.cooldown;
    this.updateHUDAll();

    // Sound
    if (def.id === "shotgun") sfxShotgun();
    else if (def.id === "sniper") sfxSniper();
    else if (def.fireMode === "auto") sfxRifle();
    else sfxShoot();
  }

  rayAABB(origin, dir, box) {
    let tmin = -Infinity, tmax = Infinity;
    const invX = 1 / (dir.x || 0.0001);
    const invY = 1 / (dir.y || 0.0001);
    const invZ = 1 / (dir.z || 0.0001);
    const tx1 = (box.minX - origin.x) * invX, tx2 = (box.maxX - origin.x) * invX;
    tmin = Math.max(tmin, Math.min(tx1, tx2));
    tmax = Math.min(tmax, Math.max(tx1, tx2));
    const ty1 = (box.minY - origin.y) * invY, ty2 = (box.maxY - origin.y) * invY;
    tmin = Math.max(tmin, Math.min(ty1, ty2));
    tmax = Math.min(tmax, Math.max(ty1, ty2));
    const tz1 = (box.minZ - origin.z) * invZ, tz2 = (box.maxZ - origin.z) * invZ;
    tmin = Math.max(tmin, Math.min(tz1, tz2));
    tmax = Math.min(tmax, Math.max(tz1, tz2));
    return tmax >= Math.max(tmin, 0) ? Math.max(tmin, 0) : null;
  }

  raySphere(origin, dir, center, radius) {
    const oc = origin.clone().sub(center);
    const a = dir.dot(dir);
    const b = 2 * oc.dot(dir);
    const c = oc.dot(oc) - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t > 0 ? t : (-b + Math.sqrt(disc)) / (2 * a);
  }

  updatePlayer(dt) {
    if (this.state !== "playing") return;

    const speed = 10;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0; right.normalize();

    let mx = 0, mz = 0;
    if (this.keys["KeyW"]) { mx += forward.x; mz += forward.z; }
    if (this.keys["KeyS"]) { mx -= forward.x; mz -= forward.z; }
    if (this.keys["KeyA"]) { mx -= right.x; mz -= right.z; }
    if (this.keys["KeyD"]) { mx += right.x; mz += right.z; }

    if (mx !== 0 || mz !== 0) {
      const len = Math.sqrt(mx * mx + mz * mz);
      mx = (mx / len) * speed;
      mz = (mz / len) * speed;
    }

    if (this.keys["Space"] && this.playerOnGround) {
      this.playerVelocity.y = 7;
      this.playerOnGround = false;
    }

    this.playerVelocity.y -= 18 * dt;
    const nx = this.playerPos.x + mx * dt;
    const nz = this.playerPos.z + mz * dt;
    const ny = this.playerPos.y + this.playerVelocity.y * dt;

    if (!checkWallCollision(nx, this.playerPos.z, 0.35, this.walls)) this.playerPos.x = nx;
    if (!checkWallCollision(this.playerPos.x, nz, 0.35, this.walls)) this.playerPos.z = nz;

    if (ny <= 1.6) { this.playerPos.y = 1.6; this.playerVelocity.y = 0; this.playerOnGround = true; }
    else this.playerPos.y = ny;

    const half = getMapHalf();
    this.playerPos.x = Math.max(-half, Math.min(half, this.playerPos.x));
    this.playerPos.z = Math.max(-half, Math.min(half, this.playerPos.z));

    this.camera.position.copy(this.playerPos);
  }

  update(dt) {
    if (this.state !== "playing") return;
    if (dt > 0.1) dt = 0.1;

    this.updatePlayer(dt);

    // Cooldowns
    if (this.weaponCooldown > 0) this.weaponCooldown -= dt;
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.hud.hideReloading();
      }
    }
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.healCooldown > 0) this.healCooldown -= dt;

    // Shooting
    const w = this.inventory.getCurrentWeapon();
    if (this.isShooting && this.weaponCooldown <= 0 && !this.isReloading) {
      if (w.def.fireMode === "auto") this.shoot();
      else this.shoot();
    }

    // Zone
    this.zone.update(dt);
    if (this.zone.isOutside(this.playerPos)) {
      if (this.invulnTimer <= 0) {
        const dmg = this.zone.getDamage() * dt;
        const reduction = this.inventory.getDamageReduction();
        this.playerHP -= dmg * (1 - reduction);
        this.inventory.damageArmor(dmg * (1 - reduction));
        this.invulnTimer = 0.5;
        this.hud.flashDamage();
        sfxDamage();
      }
    }

    // Grenade physics
    if (this.activeGrenade && !this.activeGrenade.exploded) {
      const g = this.activeGrenade;
      g.vel.y -= 15 * dt;
      g.pos.x += g.vel.x * dt;
      g.pos.y += g.vel.y * dt;
      g.pos.z += g.vel.z * dt;

      // Ground hit
      if (g.pos.y <= 0.2) {
        g.pos.y = 0.2;
        g.life -= dt;
        if (g.life <= 0) {
          spawnExplosion(scene, g.pos, g.radius);
          for (const enemy of getEnemies()) {
            if (!enemy.alive) continue;
            const ed = enemy.mesh.position.distanceTo(g.pos);
            if (ed < g.radius) {
              const dmg = 100 * (1 - ed / g.radius);
              const killed = hurtEnemy(enemy, dmg, scene);
              if (killed) { this.kills++; this.aliveNPCs--; this.score += 300; }
            }
          }
          g.exploded = true;
          this.activeGrenade = null;
        }
      }
    }

    // NPC AI
    for (const enemy of getEnemies()) {
      if (!enemy.alive) continue;
      const shootData = updateAI(enemy, dt, this.playerPos, this.state === "playing", this.walls, getMapHalf());
      if (shootData && this.invulnTimer <= 0) {
        let blocked = false;
        for (const wall of this.walls) {
          if (this.rayAABB(shootData.origin, shootData.direction, wall) !== null) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          showTrail(scene, shootData.origin, shootData.origin.clone().addScaledVector(shootData.direction, 5), 0xff4444);
          const reduction = this.inventory.getDamageReduction();
          this.playerHP -= shootData.damage * (1 - reduction);
          this.inventory.damageArmor(shootData.damage * (1 - reduction));
          this.invulnTimer = 0.2;
          this.hud.flashDamage();
          sfxDamage();
        }
      }
    }

    // Update pickups
    updatePickups(this.clock.elapsedTime, scene);

    // Update particles
    updateParticles(dt, scene);

    // Clean up dead enemies
    removeDeadEnemies(scene);

    // Player death
    if (this.playerHP <= 0) {
      this.playerHP = 0;
      this.gameOver();
      return;
    }

    // Update HUD
    this.updateHUDAll();
  }

  updateHUDAll() {
    this.hud.update(this.playerHP, this.playerMaxHP, this.kills, this.score);
    const info = this.inventory.getInfo();
    this.hud.updateWeapon(info.currentWeapon, info.ammo, info.reserve, info.isInfAmmo);
    this.hud.updateBackpack(this.inventory);
    this.hud.updateZone(this.zone.getPhaseInfo());
    this.hud.updateAliveCount(this.aliveNPCs + 1); // +1 for player
  }

  gameOver() {
    this.state = "gameover";
    document.exitPointerLock();
    this.isPointerLocked = false;
    this.hud.setCrosshairVisible(false);
    this.hud.showGameOver(this.score, this.kills, this.zone.getPhaseInfo().phase);
  }

  gameLoop(time) {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (this.state === "playing") this.update(dt);

    // Cloud animation
    if (this.clouds) {
      this.clouds.children.forEach((c) => {
        c.position.x += Math.sin(time * 0.0005 + c.userData.offset) * 0.02;
      });
    }

    this.renderer.render(scene, this.camera);
  }

  removeAllNPCs() {
    const enemies = getEnemies();
    while (enemies.length > 0) {
      const e = enemies[0];
      e.mesh.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      scene.remove(e.mesh);
      enemies.splice(0, 1);
    }
  }
}

export { Game };
