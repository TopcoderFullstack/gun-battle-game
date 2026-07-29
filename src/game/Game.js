import * as THREE from "three";
import gsap from "gsap";
import { scene, buildScene } from "./Scene.js";
import {
  weaponDefs,
  createWeaponModel,
} from "./Weapon.js";
import {
  createMuzzleFlash,
  triggerMuzzleFlash,
  spawnImpact,
  showTrail,
  updateParticles,
  clearAllEffects,
} from "./Effects.js";
import {
  createEnemy,
  updateEnemies,
  hurtEnemy,
  getEnemies,
  checkWallCollision,
  findSpawnPoint,
} from "./Enemy.js";

class Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.renderer = null;
    this.camera = null;
    this.lockControls = null;
    this.clock = new THREE.Clock();
    this.state = "menu"; // menu | playing | gameover
    this.keys = {};
    this.playerPos = new THREE.Vector3(0, 1.6, 0);
    this.playerVelocity = new THREE.Vector3();
    this.playerOnGround = true;
    this.playerHP = 100;
    this.playerMaxHP = 100;
    this.score = 0;
    this.kills = 0;
    this.wave = 1;
    this.waveTimer = 0;
    this.enemiesToSpawn = 4;
    this.isShooting = false;
    this.currentWeapon = 0;
    this.weaponCooldown = 0;
    this.weaponReloading = 0;
    this.ammo = weaponDefs.map((w) => w.maxAmmo);
    this.invulnTimer = 0;
    this.muzzleFlash = null;
    this.weaponModel = null;
    this.weaponGroup = null;
    this.walls = [];
    this.enemyShootQueue = [];
    this.playerDir = new THREE.Vector3(0, 0, -1);
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");
    this.isPointerLocked = false;

    // DOM elements
    this.overlay = document.getElementById("overlay");
    this.startBtn = document.getElementById("start-btn");
    this.hpBar = document.getElementById("hp-bar");
    this.hpText = document.getElementById("hp-text");
    this.killsText = document.getElementById("kills-text");
    this.scoreText = document.getElementById("score-text");
    this.weaponName = document.getElementById("weapon-name");
    this.ammoText = document.getElementById("ammo-text");
    this.damageFlash = document.getElementById("damage-flash");
    this.hitMarker = document.getElementById("hit-marker");
    this.reloadIndicator = document.getElementById("reload-indicator");
    this.crosshair = document.getElementById("crosshair");
  }

  init() {
    this.setupRenderer();
    this.walls = buildScene(scene);
    this.setupCamera();
    this.setupWeapons();
    this.setupMuzzleFlash();
    this.setupInput();
    this.setupStartButton();

    this.renderer.setAnimationLoop((time) => this.gameLoop(time));
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      80,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.copy(this.playerPos);
    scene.add(this.camera);
  }

  setupWeapons() {
    const { group, muzzle } = createWeaponModel(scene, this.camera);
    this.weaponGroup = group;
    this.weaponMuzzlePoint = muzzle;
  }

  setupMuzzleFlash() {
    this.muzzleFlash = createMuzzleFlash(scene);
  }

  setupInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;

      if (e.code === "Digit1") this.switchWeapon(0);
      if (e.code === "Digit2") this.switchWeapon(1);
      if (e.code === "KeyR") this.startReload();
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0 && this.state === "playing") {
        this.isShooting = true;
        // Request pointer lock on click
        if (!this.isPointerLocked) {
          this.canvas.requestPointerLock();
        }
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.isShooting = false;
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
      if (this.isPointerLocked) {
        this.crosshair.style.display = "block";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isPointerLocked || this.state !== "playing") return;
      const sensitivity = 0.002;
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= e.movementX * sensitivity;
      this.euler.x -= e.movementY * sensitivity;
      this.euler.x = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, this.euler.x)
      );
      this.camera.quaternion.setFromEuler(this.euler);
    });
  }

  setupStartButton() {
    this.startBtn.addEventListener("click", () => {
      this.startGame();
    });
  }

  startGame() {
    // Reset
    this.playerHP = this.playerMaxHP;
    this.score = 0;
    this.kills = 0;
    this.wave = 1;
    this.waveTimer = 0;
    this.enemiesToSpawn = 4;
    this.isShooting = false;
    this.currentWeapon = 0;
    this.weaponCooldown = 0;
    this.weaponReloading = 0;
    this.ammo = weaponDefs.map((w) => w.maxAmmo);
    this.invulnTimer = 0;
    this.isShooting = false;
    this.playerPos.set(0, 1.6, 0);
    this.playerVelocity.set(0, 0, 0);
    this.playerOnGround = true;
    this.euler.set(0, 0, 0, "YXZ");
    this.camera.position.copy(this.playerPos);
    this.camera.quaternion.setFromEuler(this.euler);

    // Clear old enemies
    const oldEnemies = getEnemies();
    for (const e of oldEnemies) {
      scene.remove(e.mesh);
    }
    oldEnemies.length = 0;
    clearAllEffects(scene);

    this.state = "playing";
    this.overlay.classList.add("hidden");
    this.weaponGroup.visible = true;
    this.crosshair.style.display = "block";
    this.updateHUD();

    // Request pointer lock
    this.canvas.requestPointerLock();
  }

  gameOver() {
    this.state = "gameover";
    this.overlay.classList.remove("hidden");
    document.getElementById("overlay-box").querySelector("h1").textContent =
      "GAME OVER";
    document.getElementById("overlay-box").querySelector(".sub").textContent =
      `Score: ${this.score} | Kills: ${this.kills} | Wave: ${this.wave}`;
    this.startBtn.textContent = "RESTART";
    this.weaponGroup.visible = false;
    this.crosshair.style.display = "none";
    document.exitPointerLock();
  }

  switchWeapon(index) {
    if (index === this.currentWeapon) return;
    if (index >= weaponDefs.length) return;
    this.currentWeapon = index;
    this.weaponCooldown = 0;
    this.weaponReloading = 0;
    this.updateHUD();
  }

  startReload() {
    const w = weaponDefs[this.currentWeapon];
    if (w.ammo === Infinity || this.weaponReloading > 0) return;
    if (this.ammo[this.currentWeapon] >= w.maxAmmo) return;
    this.weaponReloading = w.reloadTime;
    gsap.to(this.reloadIndicator, {
      opacity: 1,
      duration: 0.1,
    });
  }

  shoot() {
    if (this.weaponCooldown > 0 || this.weaponReloading > 0) return;
    const w = weaponDefs[this.currentWeapon];

    if (this.ammo[this.currentWeapon] <= 0 && w.ammo !== Infinity) {
      this.startReload();
      return;
    }

    for (let i = 0; i < w.bulletsPerShot; i++) {
      const spreadX = (Math.random() - 0.5) * w.spread * 2;
      const spreadY = (Math.random() - 0.5) * w.spread * 2;
      const dir = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(this.camera.quaternion)
        .add(new THREE.Vector3(spreadX, spreadY, 0))
        .normalize();

      const origin = this.camera.position.clone();

      // Raycast for hit detection
      const raycaster = new THREE.Raycaster(origin, dir, 0, w.range);
      let hitPoint = null;
      let hitNormal = null;
      let hitEnemy = null;

      // Check wall hits
      for (const wall of this.walls) {
        // Quick AABB ray test
        const t = this.rayAABB(origin, dir, wall);
        if (t !== null && t < w.range) {
          const pt = origin.clone().addScaledVector(dir, t);
          if (!hitPoint || origin.distanceTo(pt) < origin.distanceTo(hitPoint)) {
            hitPoint = pt;
            hitNormal = this.getAABBNormal(pt, wall);
          }
        }
      }

      // Check enemy hits
      const enemies = getEnemies();
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const sphereCenter = enemy.mesh.position.clone();
        sphereCenter.y += 1.2;
        const t = this.raySphere(origin, dir, sphereCenter, 0.7);
        if (
          t !== null &&
          t < w.range &&
          (!hitPoint || t < origin.distanceTo(hitPoint))
        ) {
          hitPoint = origin.clone().addScaledVector(dir, t);
          hitEnemy = enemy;
        }
      }

      if (hitEnemy) {
        const killed = hurtEnemy(hitEnemy, w.damage, scene);
        spawnImpact(scene, hitPoint, new THREE.Vector3(0, 1, 0));

        if (killed) {
          this.kills++;
          this.score += 150;
        } else {
          this.score += 10;
        }

        // Hit marker
        gsap.to(this.hitMarker, {
          opacity: 1,
          duration: 0.05,
          onComplete: () => {
            gsap.to(this.hitMarker, { opacity: 0, duration: 0.1 });
          },
        });
      } else if (hitPoint) {
        spawnImpact(scene, hitPoint, hitNormal || new THREE.Vector3(0, 1, 0));
        showTrail(scene, origin, hitPoint, w.color);
      } else {
        // Miss - trail into distance
        const farPoint = origin.clone().addScaledVector(dir, w.range);
        showTrail(scene, origin, farPoint, w.color);
      }
    }

    // Muzzle flash
    const flashWorldPos = new THREE.Vector3();
    this.weaponMuzzlePoint.getWorldPosition(flashWorldPos);
    triggerMuzzleFlash(
      this.muzzleFlash,
      flashWorldPos,
      this.camera.quaternion
    );

    // Weapon recoil animation
    gsap.to(this.weaponGroup.position, {
      z: 0.08,
      y: -0.02,
      duration: 0.04,
      yoyo: true,
      repeat: 1,
      ease: "power2.out",
    });

    if (w.ammo !== Infinity) {
      this.ammo[this.currentWeapon]--;
    }

    this.weaponCooldown = w.cooldown;
    this.updateHUD();
  }

  rayAABB(origin, dir, box) {
    let tmin = -Infinity;
    let tmax = Infinity;

    const invDirX = 1 / (dir.x || 0.0001);
    const invDirY = 1 / (dir.y || 0.0001);
    const invDirZ = 1 / (dir.z || 0.0001);

    const tx1 = (box.minX - origin.x) * invDirX;
    const tx2 = (box.maxX - origin.x) * invDirX;
    tmin = Math.max(tmin, Math.min(tx1, tx2));
    tmax = Math.min(tmax, Math.max(tx1, tx2));

    const ty1 = (box.minY - origin.y) * invDirY;
    const ty2 = (box.maxY - origin.y) * invDirY;
    tmin = Math.max(tmin, Math.min(ty1, ty2));
    tmax = Math.min(tmax, Math.max(ty1, ty2));

    const tz1 = (box.minZ - origin.z) * invDirZ;
    const tz2 = (box.maxZ - origin.z) * invDirZ;
    tmin = Math.max(tmin, Math.min(tz1, tz2));
    tmax = Math.min(tmax, Math.max(tz1, tz2));

    if (tmax >= Math.max(tmin, 0)) return tmin > 0 ? tmin : tmax;
    return null;
  }

  getAABBNormal(point, box) {
    const d = [
      { v: box.minX - point.x, n: new THREE.Vector3(-1, 0, 0) },
      { v: point.x - box.maxX, n: new THREE.Vector3(1, 0, 0) },
      { v: box.minY - point.y, n: new THREE.Vector3(0, -1, 0) },
      { v: point.y - box.maxY, n: new THREE.Vector3(0, 1, 0) },
      { v: box.minZ - point.z, n: new THREE.Vector3(0, 0, -1) },
      { v: point.z - box.maxZ, n: new THREE.Vector3(0, 0, 1) },
    ];
    d.sort((a, b) => b.v - a.v);
    return d[0].n;
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

    // Movement
    const moveSpeed = 8;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.camera.quaternion
    );
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      this.camera.quaternion
    );
    right.y = 0;
    right.normalize();

    let moveX = 0;
    let moveZ = 0;

    if (this.keys["KeyW"]) {
      moveX += forward.x;
      moveZ += forward.z;
    }
    if (this.keys["KeyS"]) {
      moveX -= forward.x;
      moveZ -= forward.z;
    }
    if (this.keys["KeyA"]) {
      moveX -= right.x;
      moveZ -= right.z;
    }
    if (this.keys["KeyD"]) {
      moveX += right.x;
      moveZ += right.z;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX = (moveX / len) * moveSpeed;
      moveZ = (moveZ / len) * moveSpeed;
    }

    // Jump
    if (this.keys["Space"] && this.playerOnGround) {
      this.playerVelocity.y = 6;
      this.playerOnGround = false;
    }

    // Gravity
    this.playerVelocity.y -= 15 * dt;

    // Apply movement
    const newX = this.playerPos.x + moveX * dt;
    const newZ = this.playerPos.z + moveZ * dt;
    const newY = this.playerPos.y + this.playerVelocity.y * dt;

    // Collision
    const halfW = 0.3;
    if (!checkWallCollision(newX, this.playerPos.z, halfW, this.walls)) {
      this.playerPos.x = newX;
    }
    if (!checkWallCollision(this.playerPos.x, newZ, halfW, this.walls)) {
      this.playerPos.z = newZ;
    }

    // Ground check
    if (newY <= 1.6) {
      this.playerPos.y = 1.6;
      this.playerVelocity.y = 0;
      this.playerOnGround = true;
    } else {
      this.playerPos.y = newY;
    }

    // Clamp to map
    const mapHalf = 38;
    this.playerPos.x = Math.max(
      -mapHalf,
      Math.min(mapHalf, this.playerPos.x)
    );
    this.playerPos.z = Math.max(
      -mapHalf,
      Math.min(mapHalf, this.playerPos.z)
    );

    this.camera.position.copy(this.playerPos);
  }

  update(dt) {
    if (this.state !== "playing") return;

    if (dt > 0.1) dt = 0.1;

    this.updatePlayer(dt);

    // Cooldowns
    if (this.weaponCooldown > 0) this.weaponCooldown -= dt;
    if (this.weaponReloading > 0) {
      this.weaponReloading -= dt;
      if (this.weaponReloading <= 0) {
        this.ammo[this.currentWeapon] = weaponDefs[this.currentWeapon].maxAmmo;
        this.updateHUD();
        gsap.to(this.reloadIndicator, { opacity: 0, duration: 0.15 });
      }
    }
    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // Auto-shoot for automatic weapons
    if (
      this.isShooting &&
      this.weaponCooldown <= 0 &&
      weaponDefs[this.currentWeapon].fireRate === "auto"
    ) {
      this.shoot();
    }

    // Semi-auto shoot
    if (
      this.isShooting &&
      this.weaponCooldown <= 0 &&
      weaponDefs[this.currentWeapon].fireRate !== "auto"
    ) {
      this.shoot();
      // For semi-auto, prevent continuous fire by requiring re-click
      // Handled by mousedown event
    }

    // Update enemies
    this.waveTimer += dt;
    const enemies = getEnemies();

    // Spawn enemies
    if (enemies.length === 0 && this.enemiesToSpawn <= 0) {
      this.wave++;
      this.enemiesToSpawn = 3 + this.wave * 2;
      this.waveTimer = 0;
      this.playerHP = Math.min(this.playerMaxHP, this.playerHP + 25);
      this.updateHUD();
    }

    const maxEnemies = 6;
    while (enemies.length < maxEnemies && this.enemiesToSpawn > 0) {
      const spawn = findSpawnPoint(this.walls);
      const type = Math.random() < 0.2 + this.wave * 0.05 ? "heavy" : "grunt";
      createEnemy(scene, spawn, type);
      this.enemiesToSpawn--;
    }

    const enemyShot = updateEnemies(
      dt,
      this.playerPos,
      true,
      this.walls,
      scene
    );

    // Process enemy shots
    if (enemyShot) {
      const dirToPlayer = this.playerPos
        .clone()
        .sub(enemyShot.muzzlePos)
        .normalize();
      const dist = enemyShot.muzzlePos.distanceTo(this.playerPos);

      // Simple hit check - raycast from enemy to player
      let blocked = false;
      for (const wall of this.walls) {
        const t = this.rayAABB(enemyShot.muzzlePos, dirToPlayer, wall);
        if (t !== null && t < dist) {
          blocked = true;
          break;
        }
      }

      if (!blocked && this.invulnTimer <= 0) {
        // Show enemy bullet trail
        const shotColor = 0xff4444;
        const trailEnd = enemyShot.muzzlePos
          .clone()
          .addScaledVector(dirToPlayer, 3);
        showTrail(scene, enemyShot.muzzlePos, trailEnd, shotColor);

        this.playerHP -= 10;
        this.invulnTimer = 0.3;

        // Damage flash
        gsap.to(this.damageFlash, {
          opacity: 0.6,
          duration: 0.05,
          onComplete: () => {
            gsap.to(this.damageFlash, { opacity: 0, duration: 0.3 });
          },
        });

        if (this.playerHP <= 0) {
          this.playerHP = 0;
          this.gameOver();
          return;
        }
        this.updateHUD();
      }
    }

    // Update particles
    updateParticles(dt);

    // Weapon sway
    if (this.weaponGroup) {
      const swayX = Math.sin(Date.now() * 0.003) * 0.003;
      const swayY = Math.cos(Date.now() * 0.005) * 0.004;
      this.weaponGroup.position.x +=
        (swayX - this.weaponGroup.position.x) * 5 * dt;
      if (!this.isShooting) {
        this.weaponGroup.position.y +=
          (-0.2 + swayY - this.weaponGroup.position.y) * 8 * dt;
      }
    }

    this.updateHUD();
  }

  updateHUD() {
    const w = weaponDefs[this.currentWeapon];
    this.hpBar.style.width = (this.playerHP / this.playerMaxHp) * 100 + "%";
    this.hpText.textContent = Math.ceil(this.playerHP);
    this.killsText.textContent = this.kills;
    this.scoreText.textContent = this.score;
    this.weaponName.textContent = w.name;

    const ammo = this.ammo[this.currentWeapon];
    this.ammoText.textContent = ammo === Infinity ? "∞" : ammo;
    this.ammoText.classList.toggle("low", ammo !== Infinity && ammo <= 5);
  }

  gameLoop() {
    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (this.state === "playing") {
      this.update(dt);
    }

    this.renderer.render(scene, this.camera);
  }
}

export { Game };
