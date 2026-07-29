import { Engine } from "@babylonjs/core";
import { Vector3, Ray, Color3, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import { UniversalCamera } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, Rectangle, Control } from "@babylonjs/gui";
import gsap from "gsap";

import { createSceneBase, buildWorld, checkWallCollision, HALF, getBuildings, initPhysics } from "./Scene.js";
import { WEAPON_DEFS, WEAPON_LIST, Inventory } from "./Weapons.js";
import { createEnemy, getEnemies, hurtEnemy, updateAI, removeDead } from "./Enemies.js";
import { ZoneManager } from "./Zone.js";
import { createMuzzleFlash, triggerFlash, showTrail, spawnImpact, spawnExplosion } from "./Effects.js";

let engine, scene, camera, inventory, zone, muzzleFlash, shadowGen, walls;
let playerHP = 100, playerMaxHP = 100, score = 0, kills = 0, aliveNPCs = 0;
let isShooting = false, weaponCd = 0, reloadTimer = 0, isReloading = false, invulnCd = 0, healCd = 0;
let keys = {};
let gameState = "menu";
let activeGrenade = null;
let screenShake = 0;

// GUI
let guiTexture, hpBar, hpText, killsText, scoreText, weaponText, ammoText;
let zonePhaseText, zoneTimerText, aliveText, reloadText, hitMarker, dmgFlash, overlay, startBtn;
let slot1Text, slot2Text;

function setupGUI() {
  guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

  // HP bar
  const hpBg = new Rectangle("hpBg");
  hpBg.width = "200px"; hpBg.height = "20px";
  hpBg.background = "#00000066"; hpBg.alpha = 0.8;
  hpBg.top = "15px"; hpBg.left = "20px";
  hpBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  hpBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  guiTexture.addControl(hpBg);

  hpBar = new Rectangle("hpBar");
  hpBar.width = "196px"; hpBar.height = "16px";
  hpBar.background = "#44ff44"; hpBar.alpha = 1;
  hpBar.top = "17px"; hpBar.left = "22px";
  hpBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  hpBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  guiTexture.addControl(hpBar);

  hpText = new TextBlock("hpText", "100");
  hpText.top = "15px"; hpText.left = "230px";
  hpText.color = "white"; hpText.fontSize = 14;
  hpText.fontFamily = "monospace";
  hpText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  hpText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  guiTexture.addControl(hpText);

  killsText = new TextBlock("kills", "Kills: 0");
  killsText.top = "45px"; killsText.left = "20px";
  killsText.color = "#ccc"; killsText.fontSize = 13;
  killsText.fontFamily = "monospace";
  killsText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  killsText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  guiTexture.addControl(killsText);

  scoreText = new TextBlock("score", "Score: 0");
  scoreText.top = "65px"; scoreText.left = "20px";
  scoreText.color = "#ccc"; scoreText.fontSize = 13;
  scoreText.fontFamily = "monospace";
  scoreText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  scoreText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  guiTexture.addControl(scoreText);

  weaponText = new TextBlock("weapon", "FIST");
  weaponText.top = "-60px"; weaponText.left = "-100px";
  weaponText.color = "white"; weaponText.fontSize = 32;
  weaponText.fontFamily = "monospace";
  weaponText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  weaponText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  guiTexture.addControl(weaponText);

  ammoText = new TextBlock("ammo", "∞");
  ammoText.top = "-30px"; ammoText.left = "-100px";
  ammoText.color = "#ffcc00"; ammoText.fontSize = 20;
  ammoText.fontFamily = "monospace";
  ammoText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  ammoText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  guiTexture.addControl(ammoText);

  slot1Text = new TextBlock("slot1", "1: --");
  slot1Text.top = "-100px"; slot1Text.left = "20px";
  slot1Text.color = "#888"; slot1Text.fontSize = 12;
  slot1Text.fontFamily = "monospace";
  slot1Text.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  slot1Text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  guiTexture.addControl(slot1Text);

  slot2Text = new TextBlock("slot2", "2: --");
  slot2Text.top = "-115px"; slot2Text.left = "20px";
  slot2Text.color = "#888"; slot2Text.fontSize = 12;
  slot2Text.fontFamily = "monospace";
  slot2Text.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  slot2Text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  guiTexture.addControl(slot2Text);

  zonePhaseText = new TextBlock("zp", "Phase 1/7");
  zonePhaseText.top = "15px"; zonePhaseText.left = "0px";
  zonePhaseText.color = "#8899ff"; zonePhaseText.fontSize = 11;
  zonePhaseText.fontFamily = "monospace";
  zonePhaseText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  zonePhaseText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  guiTexture.addControl(zonePhaseText);

  zoneTimerText = new TextBlock("zt", "30s");
  zoneTimerText.top = "30px"; zoneTimerText.left = "0px";
  zoneTimerText.color = "#ffcc00"; zoneTimerText.fontSize = 18;
  zoneTimerText.fontFamily = "monospace";
  zoneTimerText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  zoneTimerText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  guiTexture.addControl(zoneTimerText);

  aliveText = new TextBlock("alive", "Alive: 13");
  aliveText.top = "15px"; aliveText.left = "-100px";
  aliveText.color = "#ff8844"; aliveText.fontSize = 13;
  aliveText.fontFamily = "monospace";
  aliveText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  aliveText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  guiTexture.addControl(aliveText);

  reloadText = new TextBlock("reload", "RELOADING...");
  reloadText.top = "100px"; reloadText.left = "0px";
  reloadText.color = "#ffcc00"; reloadText.fontSize = 18;
  reloadText.fontFamily = "monospace";
  reloadText.alpha = 0;
  reloadText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  reloadText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  guiTexture.addControl(reloadText);

  hitMarker = new TextBlock("hit", "✕");
  hitMarker.color = "#ff4444"; hitMarker.fontSize = 40;
  hitMarker.fontFamily = "monospace";
  hitMarker.alpha = 0;
  hitMarker.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  hitMarker.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  guiTexture.addControl(hitMarker);

  dmgFlash = new Rectangle("dmgFlash");
  dmgFlash.width = "100%"; dmgFlash.height = "100%";
  dmgFlash.background = "#ff0000"; dmgFlash.alpha = 0;
  dmgFlash.isPointerBlocker = false;
  dmgFlash.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  dmgFlash.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  guiTexture.addControl(dmgFlash);

  // HTML button handler
  const htmlStartBtn = document.getElementById("start-btn");
  if (htmlStartBtn) {
    htmlStartBtn.addEventListener("click", () => {
      if (gameState === "menu" || gameState === "gameover") startGame();
    });
  }

  overlay = document.getElementById("overlay");
}

function updateHUD() {
  const ratio = playerHP / playerMaxHP;
  hpBar.width = (196 * Math.max(0, ratio)).toFixed(0) + "px";
  hpBar.background = ratio > 0.5 ? "#44ff44" : ratio > 0.25 ? "#ffcc00" : "#ff4444";
  hpText.text = Math.ceil(playerHP).toString();
  killsText.text = "Kills: " + kills;
  scoreText.text = "Score: " + score;

  const info = inventory.getInfo();
  weaponText.text = info.currentWeapon;
  ammoText.text = info.isInfAmmo ? "∞" : `${info.ammo} | ${info.reserve}`;
  slot1Text.text = "1: " + (info.slot1 || "--");
  slot2Text.text = "2: " + (info.slot2 || "--");
  slot1Text.color = info.currentSlot === 0 ? "#ffcc00" : "#888";
  slot2Text.color = info.currentSlot === 1 ? "#ffcc00" : "#888";

  const pi = zone.getPhaseInfo();
  zonePhaseText.text = `Phase ${pi.phase}/${pi.totalPhases}`;
  zoneTimerText.text = pi.timer > 0 ? Math.ceil(pi.timer) + "s" : "--";
  aliveText.text = `Alive: ${aliveNPCs + 1}`;
}

async function init() {
  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;outline:none;";
  document.body.prepend(canvas);
  
  // Create engine
  engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

  // Create scene base (no physics yet)
  const result = createSceneBase(engine);
  scene = result.scene;
  shadowGen = result.shadowGen;

  // Init physics FIRST
  await initPhysics(scene);

  // Now build physics-dependent world
  const world = buildWorld(scene, shadowGen);
  walls = world.walls;

  // Camera
  camera = new UniversalCamera("fpsCam", new Vector3(0, 1.6, 5), scene);
  camera.minZ = 0.1;
  camera.maxZ = 500;
  camera.fov = 1.3;
  camera.attachControl(true);
  camera.speed = 0.4;
  camera.angularSensibility = 3000;
  camera.applyGravity = true;
  camera.ellipsoid = new Vector3(0.5, 1.5, 0.5);
  camera.checkCollisions = true;
  camera.keysUp = [87]; camera.keysDown = [83];
  camera.keysLeft = [65]; camera.keysRight = [68];
  camera.keysUpward = [32];

  setupGUI();
  inventory = new Inventory(scene, camera);
  zone = new ZoneManager(scene);
  muzzleFlash = createMuzzleFlash(scene);

  // Input
  window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (e.code === "Digit1") switchWeapon(0);
    if (e.code === "Digit2") switchWeapon(1);
    if (e.code === "KeyR") startReload();
    if (e.code === "KeyE") pickup();
    if (e.code === "KeyF") useBandage();
    if (e.code === "KeyG") throwGren();
  });

  window.addEventListener("keyup", e => { keys[e.code] = false; });
  window.addEventListener("mousedown", e => { if (e.button === 0) isShooting = true; });
  window.addEventListener("mouseup", e => { if (e.button === 0) isShooting = false; });

  engine.runRenderLoop(loop);
  window.addEventListener("resize", () => engine.resize());
}

async function startGame() {
  // Cleanup
  for (const e of getEnemies()) { scene.removeMesh(e.group); }
  getEnemies().length = 0;

  playerHP = playerMaxHP; score = 0; kills = 0;
  weaponCd = 0; reloadTimer = 0; isReloading = false; invulnCd = 0; healCd = 0;
  inventory = new Inventory(scene, camera);
  zone = new ZoneManager(scene);
  camera.position.set(0, 1.6, 5);
  camera.rotation.set(0, 0, 0);
  gameState = "playing";
  isShooting = false;
  aliveNPCs = 0;

  if (overlay) overlay.classList.add("hidden");

  // Spawn NPCs
  const count = 12;
  for (let i = 0; i < count; i++) {
    const skill = i < 3 ? "hard" : i < 7 ? "medium" : "easy";
    const sp = findSpawnPoint();
    createEnemy(scene, sp, skill);
  }
  aliveNPCs = count;

  // Spawn pickups
  spawnWeaponPickups();

  updateHUD();
  engine.enterPointerlock();
}

function findSpawnPoint() {
  for (let i = 0; i < 50; i++) {
    const x = (Math.random() - 0.5) * (HALF * 1.8);
    const z = (Math.random() - 0.5) * (HALF * 1.8);
    if (!checkWallCollision(x, z, 0.5, walls) && new Vector3(x, 0, z).subtract(camera.position).length() > 25) {
      return new Vector3(x, 0, z);
    }
  }
  return new Vector3(HALF * 0.7, 0, HALF * 0.7);
}

// Ground weapon pickups (simplified - just floating colored boxes)
const groundPickups = [];
function spawnWeaponPickups() {
  groundPickups.length = 0;
  const buildings = getBuildings();
  for (const b of buildings) {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const px = b.x + (Math.random() - 0.5) * (b.w * 0.7);
      const pz = b.z + (Math.random() - 0.5) * (b.d * 0.7);
      const def = WEAPON_LIST[Math.floor(Math.random() * 5)];

      const box = MeshBuilder.CreateBox("pickup", { width: 0.3, height: 0.3, depth: 0.3 }, scene);
      box.position.set(px, 0.4, pz);
      const mat = new StandardMaterial("pkMat", scene);
      mat.diffuseColor = new Color3(...def.color);
      mat.emissiveColor = new Color3(...def.color);
      mat.emissiveIntensity = 0.4;
      mat.disableLighting = true;
      box.material = mat;

      groundPickups.push({ mesh: box, def, type: "weapon", position: new Vector3(px, 0.4, pz) });
    }
  }
  // Also scattered outdoor
  for (let i = 0; i < 10; i++) {
    const px = (Math.random() - 0.5) * HALF * 1.8;
    const pz = (Math.random() - 0.5) * HALF * 1.8;
    const def = WEAPON_LIST[Math.floor(Math.random() * 5)];
    const box = MeshBuilder.CreateBox("pickupO", { width: 0.3, height: 0.3, depth: 0.3 }, scene);
    box.position.set(px, 0.4, pz);
    groundPickups.push({ mesh: box, def, type: "weapon", position: new Vector3(px, 0.4, pz) });
  }
}

function switchWeapon(slot) {
  if (isReloading) return;
  const w = inventory.switchWeapon(slot);
  if (w) { weaponCd = 0; updateHUD(); }
}

function startReload() {
  if (isReloading) return;
  if (inventory.reload()) {
    const w = inventory.getCurrentWeapon();
    isReloading = true;
    reloadTimer = w.def.reloadTime;
    reloadText.alpha = 1;
  }
}

function pickup() {
  const pos = camera.position.clone();
  for (let i = groundPickups.length - 1; i >= 0; i--) {
    const pk = groundPickups[i];
    if (pos.subtract(pk.position).length() < 3) {
      inventory.pickup(pk.def);
      pk.mesh.dispose();
      groundPickups.splice(i, 1);
      updateHUD();
      return;
    }
  }
}

function useBandage() {
  if (healCd > 0 || playerHP >= playerMaxHP) return;
  const heal = inventory.useBandage();
  if (heal > 0) { playerHP = Math.min(playerMaxHP, playerHP + heal); healCd = 2; updateHUD(); }
}

function throwGren() {
  if (weaponCd > 0) return;
  weaponCd = 2;
  spawnExplosion(scene, camera.position.clone().add(new Vector3(0, 0, 5)), 6);
}

function shoot() {
  if (isReloading || weaponCd > 0) return;
  const w = inventory.getCurrentWeapon();
  if (!inventory.consumeAmmo(w.def.bullets) && w.def.ammo !== Infinity) {
    startReload(); return;
  }

  const def = w.def;
  const origin = camera.position.clone();
  const forward = camera.getDirection(Vector3.Forward());

  for (let i = 0; i < def.bullets; i++) {
    const spreadX = (Math.random() - 0.5) * def.spread * 2;
    const spreadY = (Math.random() - 0.5) * def.spread * 2;
    const dir = forward.add(new Vector3(spreadX, spreadY, 0)).normalize();

    const ray = new Ray(origin, dir, def.range);
    const hit = scene.pickWithRay(ray, (mesh) => {
      for (const e of getEnemies()) {
        if (e.group === mesh || e.group.getChildMeshes().includes(mesh)) return true;
      }
      return false;
    });

    if (hit && hit.pickedPoint) {
      for (const enemy of getEnemies()) {
        if (!enemy.alive) continue;
        const enemyRoot = enemy.group;
        const allMeshes = enemyRoot.getChildMeshes();
        allMeshes.push(enemyRoot);
        if (allMeshes.includes(hit.pickedMesh)) {
          const killed = hurtEnemy(enemy, def.damage);
          spawnImpact(scene, hit.pickedPoint);
          hitMarker.alpha = 1;
          gsap.to(hitMarker, { alpha: 0, duration: 0.1 });
          score += 10;
          if (killed) { kills++; aliveNPCs--; score += 200; }
          break;
        }
      }
    } else {
      showTrail(scene, origin, origin.add(dir.scale(def.range)), def.color);
    }
  }

  weaponCd = def.cooldown;
  const muzzlePos = inventory.getMuzzleWorldPos();
  if (muzzlePos) triggerFlash(muzzleFlash, muzzlePos, def.color);
  updateHUD();
}

function loop() {
  const dt = engine.getDeltaTime() / 1000;
  if (dt > 0.1) return;

  if (gameState !== "playing") {
    scene.render();
    return;
  }

  // Cooldowns
  if (weaponCd > 0) weaponCd -= dt;
  if (isReloading) { reloadTimer -= dt; if (reloadTimer <= 0) { isReloading = false; reloadText.alpha = 0; } }
  if (invulnCd > 0) invulnCd -= dt;
  if (healCd > 0) healCd -= dt;

  // Shooting
  if (isShooting && weaponCd <= 0 && !isReloading) shoot();

  // Zone
  zone.update(dt);
  if (zone.isOutside(camera.position) && invulnCd <= 0) {
    const dmg = zone.getDamage() * dt;
    const reduction = inventory.getDamageReduction();
    playerHP -= dmg * (1 - reduction);
    invulnCd = 0.5;
    dmgFlash.alpha = 0.4;
    gsap.to(dmgFlash, { alpha: 0, duration: 0.4 });
  }

  // NPC AI
  for (const enemy of getEnemies()) {
    if (!enemy.alive) continue;
    const shot = updateAI(enemy, dt, camera.position, true, walls);
    if (shot && invulnCd <= 0) {
      let blocked = false;
      for (const w of walls) {
        const t = rayAABB(shot.origin, shot.direction, w);
        if (t !== null && t < Vector3.Distance(shot.origin, camera.position)) { blocked = true; break; }
      }
      if (!blocked) {
        const dmg = shot.damage * (1 - inventory.getDamageReduction());
        playerHP -= dmg;
        inventory.damageArmor(dmg);
        invulnCd = 0.2;
        dmgFlash.alpha = 0.4;
        gsap.to(dmgFlash, { alpha: 0, duration: 0.3 });
        showTrail(scene, shot.origin, shot.origin.add(shot.direction.scale(3)), [1, 0.27, 0.27]);
      }
    }
  }

  // Animate pickups
  for (const pk of groundPickups) {
    pk.mesh.position.y = pk.position.y + Math.sin(Date.now() * 0.004) * 0.15;
    pk.mesh.rotation.y += 0.02;
  }

  // Death
  if (playerHP <= 0) { playerHP = 0; gameOver(); }
  removeDead(scene);
  updateHUD();
  scene.render();
}

function gameOver() {
  gameState = "gameover";
  engine.exitPointerlock();
  if (overlay) overlay.classList.remove("hidden");
  const titleEl = document.getElementById("overlay-title");
  if (titleEl) titleEl.textContent = "WASTED - GAME OVER";
  const startBtnEl = document.getElementById("start-btn");
  if (startBtnEl) startBtnEl.textContent = "RESTART";
}

function rayAABB(origin, dir, box) {
  let tmin = -Infinity, tmax = Infinity;
  const inv = [1 / (dir.x || 0.0001), 1 / (dir.y || 0.0001), 1 / (dir.z || 0.0001)];
  const t = [(box.minX - origin.x) * inv[0], (box.maxX - origin.x) * inv[0]];
  tmin = Math.max(tmin, Math.min(t[0], t[1])); tmax = Math.min(tmax, Math.max(t[0], t[1]));
  const t2 = [(box.minY - origin.y) * inv[1], (box.maxY - origin.y) * inv[1]];
  tmin = Math.max(tmin, Math.min(t2[0], t2[1])); tmax = Math.min(tmax, Math.max(t2[0], t2[1]));
  const t3 = [(box.minZ - origin.z) * inv[2], (box.maxZ - origin.z) * inv[2]];
  tmin = Math.max(tmin, Math.min(t3[0], t3[1])); tmax = Math.min(tmax, Math.max(t3[0], t3[1]));
  return tmax >= Math.max(tmin, 0) ? Math.max(tmin, 0) : null;
}

// Start
init();
