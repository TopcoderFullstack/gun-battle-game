(function () {
  "use strict";

  // ==================== DOM Elements ====================
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const minimap = document.getElementById("minimap");
  const minimapCtx = minimap.getContext("2d");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("start-btn");
  const overlayTitle = document.getElementById("overlay-title");

  // ==================== Canvas Setup ====================
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    minimap.width = 160;
    minimap.height = 160;
  }
  resize();
  window.addEventListener("resize", resize);

  // ==================== Constants ====================
  const MAP_W = 3000;
  const MAP_H = 3000;
  const PLAYER_RADIUS = 18;
  const PLAYER_SPEED = 280;
  const PLAYER_MAX_HP = 100;
  const BULLET_SPEED = 700;
  const ENEMY_SPEED = 130;
  const ENEMY_RADIUS = 16;
  const WALL_COLOR = "#3a3a4a";
  const FLOOR_COLOR = "#1a1a2e";
  const GRID_COLOR = "rgba(255,255,255,0.03)";

  // ==================== Weapons ====================
  const WEAPONS = [
    { name: "手枪", icon: "🔫", key: "1", cooldown: 0.3, damage: 25, spread: 0.02, bullets: 1, ammo: Infinity, reloadTime: 0, bulletSpeed: 800, color: "#ffcc00", trailColor: "#ffaa00" },
    { name: "霰弹", icon: "💥", key: "2", cooldown: 0.8, damage: 18, spread: 0.25, bullets: 8, ammo: 30, reloadTime: 1.5, bulletSpeed: 600, color: "#ff6600", trailColor: "#ff4400" },
    { name: "步枪", icon: "🎖️", key: "3", cooldown: 0.1, damage: 15, spread: 0.08, bullets: 1, ammo: 120, reloadTime: 1.2, bulletSpeed: 900, color: "#00ccff", trailColor: "#0088ff" },
  ];

  // ==================== Game State ====================
  let gameState = "menu"; // menu | playing | gameover
  let player, enemies, bullets, particles, pickups;
  let keys = {};
  let mouse = { x: 0, y: 0, down: false, worldX: 0, worldY: 0 };
  let camera = { x: 0, y: 0 };
  let score = 0, kills = 0, wave = 1, waveTimer = 0, enemiesToSpawn = 5;
  let currentWeapon = 0;
  let dodgeCooldown = 0, dashActive = false, dashDir = { x: 0, y: 0 }, dashTimer = 0;
  let walls = [];
  let screenShake = 0;
  let gameTime = 0;
  let lastTime = 0;

  // ==================== Audio (simple oscillator) ====================
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playSound(freq, type, duration, vol = 0.08) {
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) { /* ignore */ }
  }
  function sfxShoot() { playSound(100, "square", 0.08, 0.04); }
  function sfxShotgun() { playSound(60, "sawtooth", 0.15, 0.06); }
  function sfxRifle() { playSound(200, "square", 0.05, 0.03); }
  function sfxHit() { playSound(80, "triangle", 0.1, 0.05); }
  function sfxExplosion() { playSound(40, "sawtooth", 0.25, 0.1); }
  function sfxDamage() { playSound(50, "sawtooth", 0.2, 0.08); }

  // ==================== Map Generation ====================
  function generateMap() {
    walls = [];
    // Border walls
    walls.push({ x: 0, y: 0, w: MAP_W, h: 30 });
    walls.push({ x: 0, y: MAP_H - 30, w: MAP_W, h: 30 });
    walls.push({ x: 0, y: 0, w: 30, h: MAP_H });
    walls.push({ x: MAP_W - 30, y: 0, w: 30, h: MAP_H });

    // Interior walls/obstacles
    const segments = [
      { x: 300, y: 300, w: 200, h: 40 },
      { x: 600, y: 500, w: 40, h: 300 },
      { x: 900, y: 200, w: 300, h: 40 },
      { x: 1200, y: 400, w: 40, h: 250 },
      { x: 1500, y: 300, w: 200, h: 40 },
      { x: 1800, y: 600, w: 40, h: 300 },
      { x: 2000, y: 200, w: 250, h: 40 },
      { x: 2300, y: 500, w: 40, h: 250 },
      { x: 400, y: 800, w: 300, h: 40 },
      { x: 800, y: 1000, w: 40, h: 200 },
      { x: 1100, y: 900, w: 200, h: 40 },
      { x: 1500, y: 1000, w: 40, h: 200 },
      { x: 1900, y: 800, w: 250, h: 40 },
      { x: 2200, y: 1100, w: 40, h: 200 },
      { x: 500, y: 1300, w: 200, h: 40 },
      { x: 1000, y: 1500, w: 40, h: 250 },
      { x: 1400, y: 1400, w: 250, h: 40 },
      { x: 1800, y: 1500, w: 40, h: 200 },
      { x: 500, y: 1700, w: 300, h: 40 },
      { x: 900, y: 1900, w: 40, h: 200 },
      { x: 1300, y: 1800, w: 200, h: 40 },
      { x: 1700, y: 2000, w: 40, h: 250 },
      { x: 2100, y: 1800, w: 200, h: 40 },
      { x: 400, y: 2100, w: 250, h: 40 },
      { x: 800, y: 2300, w: 40, h: 200 },
      { x: 1200, y: 2200, w: 300, h: 40 },
      { x: 1600, y: 2400, w: 40, h: 200 },
      { x: 2000, y: 2200, w: 200, h: 40 },
      { x: 2400, y: 2500, w: 40, h: 200 },
      // Crate clusters (cover)
      { x: 350, y: 550, w: 50, h: 50 },
      { x: 700, y: 350, w: 55, h: 55 },
      { x: 1050, y: 650, w: 45, h: 45 },
      { x: 1350, y: 750, w: 50, h: 50 },
      { x: 1650, y: 450, w: 55, h: 55 },
      { x: 1950, y: 700, w: 45, h: 45 },
      { x: 550, y: 1100, w: 50, h: 50 },
      { x: 850, y: 1200, w: 55, h: 55 },
      { x: 1250, y: 1050, w: 45, h: 45 },
      { x: 1550, y: 1250, w: 50, h: 50 },
      { x: 2050, y: 1050, w: 55, h: 55 },
      { x: 650, y: 1500, w: 50, h: 50 },
      { x: 1150, y: 1650, w: 45, h: 45 },
      { x: 1450, y: 1550, w: 50, h: 50 },
      { x: 1850, y: 1700, w: 55, h: 55 },
      { x: 550, y: 1900, w: 50, h: 50 },
      { x: 1050, y: 2050, w: 45, h: 45 },
      { x: 1350, y: 1950, w: 50, h: 50 },
      { x: 1750, y: 2150, w: 55, h: 55 },
      { x: 2350, y: 1950, w: 45, h: 45 },
    ];
    for (const s of segments) walls.push(s);
  }

  // ==================== Player ====================
  function createPlayer() {
    return {
      x: MAP_W / 2,
      y: MAP_H / 2,
      radius: PLAYER_RADIUS,
      speed: PLAYER_SPEED,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      angle: 0,
      weaponCooldown: 0,
      weaponReloading: 0,
      ammo: WEAPONS.map(w => w.ammo),
      invulnTimer: 0,
      color: "#44bbff",
    };
  }

  // ==================== Enemies ====================
  function spawnEnemy() {
    let x, y;
    // Spawn near edges, away from player
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: x = 100 + Math.random() * 400; y = 100 + Math.random() * (MAP_H - 200); break;
      case 1: x = MAP_W - 500 + Math.random() * 400; y = 100 + Math.random() * (MAP_H - 200); break;
      case 2: x = 100 + Math.random() * (MAP_W - 200); y = 100 + Math.random() * 400; break;
      case 3: x = 100 + Math.random() * (MAP_W - 200); y = MAP_H - 500 + Math.random() * 400; break;
    }
    const type = Math.random() < 0.2 + wave * 0.05 ? "heavy" : "normal";
    const hp = type === "heavy" ? 80 + wave * 20 : 40 + wave * 10;
    const speed = type === "heavy" ? ENEMY_SPEED * 0.65 : ENEMY_SPEED + wave * 8;
    const damage = type === "heavy" ? 20 : 12;

    return {
      x, y,
      radius: type === "heavy" ? 22 : ENEMY_RADIUS,
      hp,
      maxHp: hp,
      speed,
      angle: 0,
      cooldown: 0,
      shootInterval: type === "heavy" ? 1.8 : 2.5 - wave * 0.1,
      damage,
      color: type === "heavy" ? "#ff4444" : "#ff8844",
      type,
      state: "chase",
      stateTimer: 0,
      strafeDir: Math.random() < 0.5 ? -1 : 1,
    };
  }

  // ==================== Particles ====================
  function spawnParticles(x, y, count, color, speed = 200, life = 0.4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random());
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life, maxLife: life,
        radius: 1.5 + Math.random() * 3,
        color,
      });
    }
  }

  // ==================== Pickups ====================
  function spawnPickup(x, y) {
    const r = Math.random();
    let type, color, label;
    if (r < 0.5) {
      type = "ammo"; color = "#ffcc00"; label = "弹";
    } else if (r < 0.8) {
      type = "health"; color = "#44ff44"; label = "+";
    } else {
      type = "speed"; color = "#44ccff"; label = "速";
    }
    pickups.push({ x, y, type, color, label, radius: 12 });
  }

  // ==================== Collision ====================
  function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  function resolveWallCollision(obj) {
    for (const w of walls) {
      if (circleRectCollision(obj.x, obj.y, obj.radius, w.x, w.y, w.w, w.h)) {
        const cx = Math.max(w.x, Math.min(obj.x, w.x + w.w));
        const cy = Math.max(w.y, Math.min(obj.y, w.y + w.h));
        const dx = obj.x - cx;
        const dy = obj.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < obj.radius && dist > 0) {
          const overlap = obj.radius - dist;
          obj.x += (dx / dist) * overlap;
          obj.y += (dy / dist) * overlap;
        }
      }
    }
  }

  function lineIntersectLine(ax, ay, bx, by, cx, cy, dx, dy) {
    const denom = (dx - cx) * (by - ay) - (bx - ax) * (dy - cy);
    if (Math.abs(denom) < 0.0001) return false;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
    const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function lineRectIntersect(x1, y1, x2, y2, rx, ry, rw, rh) {
    return (
      lineIntersectLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
      lineIntersectLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
      lineIntersectLine(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) ||
      lineIntersectLine(x1, y1, x2, y2, rx, ry + rh, rx, ry)
    );
  }

  function bulletHitsWall(bx, by, angle, dist = 20) {
    const ex = bx + Math.cos(angle) * dist;
    const ey = by + Math.sin(angle) * dist;
    for (const w of walls) {
      if (lineRectIntersect(bx, by, ex, ey, w.x, w.y, w.w, w.h)) return true;
    }
    return false;
  }

  // ==================== Reset Game ====================
  function resetGame() {
    player = createPlayer();
    enemies = [];
    bullets = [];
    particles = [];
    pickups = [];
    score = 0;
    kills = 0;
    wave = 1;
    waveTimer = 0;
    enemiesToSpawn = 5;
    currentWeapon = 0;
    dodgeCooldown = 0;
    dashActive = false;
    dashTimer = 0;
    screenShake = 0;
    gameTime = 0;
    lastTime = performance.now();
    generateMap();
    updateHUD();
  }

  // ==================== Shoot ====================
  function shoot() {
    if (player.weaponCooldown > 0 || player.weaponReloading > 0) return;
    const w = WEAPONS[currentWeapon];
    if (player.ammo[currentWeapon] <= 0 && w.ammo !== Infinity) {
      // auto reload
      startReload();
      return;
    }

    for (let i = 0; i < w.bullets; i++) {
      const spreadAngle = (Math.random() - 0.5) * w.spread * 2;
      const angle = player.angle + spreadAngle;
      bullets.push({
        x: player.x + Math.cos(player.angle) * player.radius,
        y: player.y + Math.sin(player.angle) * player.radius,
        vx: Math.cos(angle) * w.bulletSpeed,
        vy: Math.sin(angle) * w.bulletSpeed,
        damage: w.damage,
        life: 1.5,
        color: w.color,
        trailColor: w.trailColor,
        radius: currentWeapon === 1 ? 2.5 : 3,
        isEnemy: false,
      });
    }

    if (w.ammo !== Infinity) {
      player.ammo[currentWeapon]--;
    }

    player.weaponCooldown = w.cooldown;
    updateHUD();

    if (currentWeapon === 0) sfxShoot();
    else if (currentWeapon === 1) sfxShotgun();
    else sfxRifle();
  }

  function enemyShoot(enemy) {
    const angle = enemy.angle;
    const w = { damage: enemy.damage || 12, bulletSpeed: 400, color: "#ff6666", trailColor: "#ff3333", spread: 0.08 };
    const spreadAngle = (Math.random() - 0.5) * w.spread * 2;
    const a = angle + spreadAngle;
    bullets.push({
      x: enemy.x + Math.cos(angle) * enemy.radius,
      y: enemy.y + Math.sin(angle) * enemy.radius,
      vx: Math.cos(a) * w.bulletSpeed,
      vy: Math.sin(a) * w.bulletSpeed,
      damage: w.damage,
      life: 1.2,
      color: w.color,
      trailColor: w.trailColor,
      radius: 3,
      isEnemy: true,
    });
  }

  // ==================== Reload ====================
  function startReload() {
    if (player.weaponReloading > 0) return;
    const w = WEAPONS[currentWeapon];
    if (w.ammo === Infinity) return;
    if (player.ammo[currentWeapon] >= w.ammo) return;
    player.weaponReloading = w.reloadTime;
  }

  // ==================== Dodge ====================
  function tryDodge() {
    if (dodgeCooldown > 0 || dashActive) return;
    let dx = 0, dy = 0;
    if (keys["w"] || keys["arrowup"]) dy = -1;
    if (keys["s"] || keys["arrowdown"]) dy = 1;
    if (keys["a"] || keys["arrowleft"]) dx = -1;
    if (keys["d"] || keys["arrowright"]) dx = 1;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(player.angle);
      dy = Math.sin(player.angle);
    }
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dashDir = { x: dx / len, y: dy / len };
    } else {
      dashDir = { x: 1, y: 0 };
    }
    dashActive = true;
    dashTimer = 0.15;
    dodgeCooldown = 1.5;
    player.invulnTimer = 0.2;
  }

  // ==================== Game Update ====================
  function update(dt) {
    if (gameState !== "playing") return;

    // Clamp dt
    if (dt > 0.1) dt = 0.1;

    gameTime += dt;

    // Update cooldowns
    if (player.weaponCooldown > 0) player.weaponCooldown -= dt;
    if (player.weaponReloading > 0) {
      player.weaponReloading -= dt;
      if (player.weaponReloading <= 0) {
        const w = WEAPONS[currentWeapon];
        player.ammo[currentWeapon] = w.ammo;
        updateHUD();
      }
    }
    if (dodgeCooldown > 0) dodgeCooldown -= dt;
    if (player.invulnTimer > 0) player.invulnTimer -= dt;

    // Dodge
    if (dashActive) {
      dashTimer -= dt;
      const spd = 800;
      const nx = player.x + dashDir.x * spd * dt;
      const ny = player.y + dashDir.y * spd * dt;
      player.x = nx;
      player.y = ny;
      resolveWallCollision(player);
      spawnParticles(player.x, player.y, 2, "#44bbff", 100, 0.2);
      if (dashTimer <= 0) dashActive = false;
    }

    // Player movement
    if (!dashActive) {
      let mx = 0, my = 0;
      if (keys["w"] || keys["arrowup"]) my = -1;
      if (keys["s"] || keys["arrowdown"]) my = 1;
      if (keys["a"] || keys["arrowleft"]) mx = -1;
      if (keys["d"] || keys["arrowright"]) mx = 1;
      if (mx !== 0 || my !== 0) {
        const len = Math.sqrt(mx * mx + my * my);
        mx /= len;
        my /= len;
        player.x += mx * player.speed * dt;
        player.y += my * player.speed * dt;
        resolveWallCollision(player);
      }

      // Player angle towards mouse
      player.angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
    }

    // Shooting
    if (mouse.down) shoot();

    // Clamp player to map
    player.x = Math.max(player.radius, Math.min(MAP_W - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(MAP_H - player.radius, player.y));

    // ---- Enemies ----
    waveTimer += dt;

    // Spawn enemies
    if (enemies.length === 0 && enemiesToSpawn <= 0) {
      // Next wave
      wave++;
      enemiesToSpawn = 5 + wave * 3;
      waveTimer = 0;
      // Heal player a bit each wave
      player.hp = Math.min(player.maxHp, player.hp + 30);
      updateHUD();
    }

    while (enemies.length < 5 && enemiesToSpawn > 0 && waveTimer > 0.5) {
      enemies.push(spawnEnemy());
      enemiesToSpawn--;
      waveTimer -= 0.5;
    }

    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const enemy = enemies[ei];
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      enemy.angle = Math.atan2(dy, dx);

      // AI state machine
      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) {
        // Switch state
        if (dist < 300) {
          enemy.state = Math.random() < 0.6 ? "chase" : "strafe";
        } else {
          enemy.state = "chase";
        }
        enemy.stateTimer = 0.5 + Math.random() * 1.5;
      }

      if (enemy.state === "chase") {
        // Move towards player
        if (dist > (enemy.type === "heavy" ? 200 : 250)) {
          const vx = (dx / dist) * enemy.speed * dt;
          const vy = (dy / dist) * enemy.speed * dt;
          enemy.x += vx;
          enemy.y += vy;
        }
      } else if (enemy.state === "strafe") {
        // Strafe around player
        const perpX = -dy / dist;
        const perpY = dx / dist;
        enemy.x += perpX * enemy.speed * enemy.strafeDir * 0.6 * dt;
        enemy.y += perpY * enemy.speed * enemy.strafeDir * 0.6 * dt;
        if (dist > 300) {
          enemy.x += (dx / dist) * enemy.speed * 0.4 * dt;
          enemy.y += (dy / dist) * enemy.speed * 0.4 * dt;
        }
      }

      resolveWallCollision(enemy);

      // Enemy shoots
      enemy.cooldown -= dt;
      if (enemy.cooldown <= 0 && dist < 600) {
        enemyShoot(enemy);
        enemy.cooldown = enemy.shootInterval;
      }

      // Avoid other enemies
      for (let ej = enemies.length - 1; ej >= 0; ej--) {
        if (ei === ej) continue;
        const other = enemies[ej];
        const edx = enemy.x - other.x;
        const edy = enemy.y - other.y;
        const edist = Math.sqrt(edx * edx + edy * edy);
        const minDist = enemy.radius + other.radius + 4;
        if (edist < minDist && edist > 0) {
          const overlap = (minDist - edist) / 2;
          enemy.x += (edx / edist) * overlap;
          enemy.y += (edy / edist) * overlap;
        }
      }
    }

    // ---- Bullets ----
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Out of map or expired
      if (b.x < -50 || b.x > MAP_W + 50 || b.y < -50 || b.y > MAP_H + 50 || b.life <= 0) {
        bullets.splice(i, 1);
        continue;
      }

      // Hit wall
      if (bulletHitsWall(b.x, b.y, Math.atan2(b.vy, b.vx), 12)) {
        spawnParticles(b.x, b.y, 4, "#ffffff", 80, 0.15);
        bullets.splice(i, 1);
        continue;
      }

      // Bullet vs Player (enemy bullets)
      if (b.isEnemy) {
        if (player.invulnTimer <= 0) {
          const pdx = b.x - player.x;
          const pdy = b.y - player.y;
          if (Math.sqrt(pdx * pdx + pdy * pdy) < player.radius + b.radius) {
            player.hp -= b.damage;
            sfxDamage();
            screenShake = 0.2;
            spawnParticles(b.x, b.y, 6, "#ff4444", 150, 0.3);
            player.invulnTimer = 0.3;
            bullets.splice(i, 1);
            if (player.hp <= 0) {
              player.hp = 0;
              endGame();
              return;
            }
            updateHUD();
            continue;
          }
        }
      }

      // Bullet vs Enemies (player bullets)
      if (!b.isEnemy) {
        let hit = false;
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
          const enemy = enemies[ei];
          const edx = b.x - enemy.x;
          const edy = b.y - enemy.y;
          if (Math.sqrt(edx * edx + edy * edy) < enemy.radius + b.radius) {
            enemy.hp -= b.damage;
            sfxHit();
            spawnParticles(b.x, b.y, 3, enemy.color, 100, 0.2);
            if (enemy.hp <= 0) {
              // Kill enemy
              sfxExplosion();
              spawnParticles(enemy.x, enemy.y, 20, enemy.color, 250, 0.6);
              score += enemy.type === "heavy" ? 200 : 100;
              kills++;
              if (Math.random() < 0.3) spawnPickup(enemy.x, enemy.y);
              enemies.splice(ei, 1);
              updateHUD();
            }
            bullets.splice(i, 1);
            hit = true;
            break;
          }
        }
        if (hit) continue;
      }
    }

    // ---- Pickups ----
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i];
      const dx = player.x - pk.x;
      const dy = player.y - pk.y;
      if (Math.sqrt(dx * dx + dy * dy) < player.radius + pk.radius + 10) {
        if (pk.type === "ammo") {
          player.ammo[currentWeapon] = WEAPONS[currentWeapon].ammo;
        } else if (pk.type === "health") {
          player.hp = Math.min(player.maxHp, player.hp + 25);
        } else if (pk.type === "speed") {
          // Brief speed boost
        }
        spawnParticles(pk.x, pk.y, 6, pk.color, 100, 0.3);
        pickups.splice(i, 1);
        updateHUD();
      }
    }

    // ---- Particles ----
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Screen shake
    if (screenShake > 0) screenShake -= dt;

    // Update camera
    const targetCamX = player.x - canvas.width / 2;
    const targetCamY = player.y - canvas.height / 2;
    camera.x += (targetCamX - camera.x) * 12 * dt;
    camera.y += (targetCamY - camera.y) * 12 * dt;
  }

  function endGame() {
    gameState = "gameover";
    overlay.classList.remove("hidden");
    overlayTitle.textContent = "💀 游戏结束";
    document.getElementById("overlay-sub").textContent =
      `最终得分 Final Score: ${score} | 击杀 Kills: ${kills} | 波次 Wave: ${wave}`;
    startBtn.textContent = "重新开始 RESTART";
    updateHUD();
  }

  // ==================== Render ====================
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Screen shake offset
    let shakeX = 0, shakeY = 0;
    if (screenShake > 0) {
      shakeX = (Math.random() - 0.5) * screenShake * 30;
      shakeY = (Math.random() - 0.5) * screenShake * 30;
    }

    ctx.save();
    const camX = camera.x + shakeX;
    const camY = camera.y + shakeY;
    ctx.translate(-camX, -camY);

    // Floor
    ctx.fillStyle = FLOOR_COLOR;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const gridSize = 80;
    const startGridX = Math.floor(camX / gridSize) * gridSize;
    const startGridY = Math.floor(camY / gridSize) * gridSize;
    for (let x = startGridX; x < camX + canvas.width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, camY);
      ctx.lineTo(x, camY + canvas.height + gridSize);
      ctx.stroke();
    }
    for (let y = startGridY; y < camY + canvas.height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(camX, y);
      ctx.lineTo(camX + canvas.width + gridSize, y);
      ctx.stroke();
    }

    // Walls
    ctx.fillStyle = WALL_COLOR;
    ctx.strokeStyle = "#555577";
    ctx.lineWidth = 2;
    for (const w of walls) {
      // Only draw walls near view
      if (w.x + w.w < camX - 50 || w.x > camX + canvas.width + 50 ||
          w.y + w.h < camY - 50 || w.y > camY + canvas.height + 50) continue;

      // Wall body
      ctx.fillRect(w.x, w.y, w.w, w.h);
      // Wall border highlight
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      // Top highlight
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(w.x, w.y, w.w, 2);
      ctx.fillStyle = WALL_COLOR;
    }

    // Pickups
    for (const pk of pickups) {
      if (pk.x < camX - 50 || pk.x > camX + canvas.width + 50 ||
          pk.y < camY - 50 || pk.y > camY + canvas.height + 50) continue;
      ctx.fillStyle = pk.color;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, pk.radius + Math.sin(gameTime * 5) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pk.label, pk.x, pk.y - 1);
    }

    // Player
    if (player.invulnTimer <= 0 || Math.floor(gameTime * 20) % 2 === 0) {
      // Player body
      const glowGrad = ctx.createRadialGradient(player.x, player.y, player.radius * 0.5, player.x, player.y, player.radius * 1.8);
      glowGrad.addColorStop(0, "rgba(68, 187, 255, 0.4)");
      glowGrad.addColorStop(1, "rgba(68, 187, 255, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#88ddff";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Arm/gun line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(
        player.x + Math.cos(player.angle) * (player.radius + 14),
        player.y + Math.sin(player.angle) * (player.radius + 14)
      );
      ctx.stroke();
      // Gun tip
      const gunTipX = player.x + Math.cos(player.angle) * (player.radius + 16);
      const gunTipY = player.y + Math.sin(player.angle) * (player.radius + 16);
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.arc(gunTipX, gunTipY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (const enemy of enemies) {
      // Only draw enemies near view
      if (enemy.x < camX - 100 || enemy.x > camX + canvas.width + 100 ||
          enemy.y < camY - 100 || enemy.y > camY + canvas.height + 100) continue;

      // Glow
      const eglowGrad = ctx.createRadialGradient(enemy.x, enemy.y, enemy.radius * 0.4, enemy.x, enemy.y, enemy.radius * 1.6);
      const glowAlpha = enemy.type === "heavy" ? 0.5 : 0.3;
      const glowR = parseInt(enemy.color.slice(1, 3), 16);
      const glowG = parseInt(enemy.color.slice(3, 5), 16);
      const glowB = parseInt(enemy.color.slice(5, 7), 16);
      eglowGrad.addColorStop(0, `rgba(${glowR}, ${glowG}, ${glowB}, ${glowAlpha})`);
      eglowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = eglowGrad;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eyes/direction indicator
      ctx.fillStyle = "#ffffff";
      const ex = enemy.x + Math.cos(enemy.angle) * enemy.radius * 0.5;
      const ey = enemy.y + Math.sin(enemy.angle) * enemy.radius * 0.5;
      ctx.beginPath();
      ctx.arc(ex, ey, enemy.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Gun line
      ctx.strokeStyle = "#ff6666";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x + Math.cos(enemy.angle) * enemy.radius * 0.4, enemy.y + Math.sin(enemy.angle) * enemy.radius * 0.4);
      ctx.lineTo(
        enemy.x + Math.cos(enemy.angle) * (enemy.radius + 8),
        enemy.y + Math.sin(enemy.angle) * (enemy.radius + 8)
      );
      ctx.stroke();

      // HP bar
      if (enemy.hp < enemy.maxHp) {
        const barW = enemy.radius * 2;
        const barH = 4;
        const barY = enemy.y - enemy.radius - 10;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(enemy.x - barW / 2, barY, barW, barH);
        ctx.fillStyle = enemy.hp / enemy.maxHp > 0.5 ? "#44ff44" : enemy.hp / enemy.maxHp > 0.25 ? "#ffcc00" : "#ff4444";
        ctx.fillRect(enemy.x - barW / 2, barY, barW * (enemy.hp / enemy.maxHp), barH);
      }
    }

    // Bullets
    for (const b of bullets) {
      // Trail
      const trailLen = 12;
      ctx.strokeStyle = b.trailColor;
      ctx.lineWidth = b.radius * 1.5;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.015, b.y - b.vy * 0.015);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Bullet body
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Muzzle flash effect hint - draw crosshair at mouse position
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(mouse.worldX, mouse.worldY, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Crosshair lines
    const chSize = 10;
    ctx.beginPath();
    ctx.moveTo(mouse.worldX - chSize, mouse.worldY);
    ctx.lineTo(mouse.worldX - 4, mouse.worldY);
    ctx.moveTo(mouse.worldX + 4, mouse.worldY);
    ctx.lineTo(mouse.worldX + chSize, mouse.worldY);
    ctx.moveTo(mouse.worldX, mouse.worldY - chSize);
    ctx.lineTo(mouse.worldX, mouse.worldY - 4);
    ctx.moveTo(mouse.worldX, mouse.worldY + 4);
    ctx.lineTo(mouse.worldX, mouse.worldY + chSize);
    ctx.stroke();

    ctx.restore();

    // ---- Mini-map ----
    renderMinimap();
  }

  function renderMinimap() {
    minimapCtx.clearRect(0, 0, minimap.width, minimap.height);
    const scale = minimap.width / MAP_W;
    minimapCtx.fillStyle = "rgba(0,0,0,0.6)";
    minimapCtx.fillRect(0, 0, minimap.width, minimap.height);

    // Walls
    minimapCtx.fillStyle = "rgba(100,100,130,0.6)";
    for (const w of walls) {
      minimapCtx.fillRect(w.x * scale, w.y * scale, w.w * scale, w.h * scale);
    }

    // Enemies
    for (const enemy of enemies) {
      minimapCtx.fillStyle = enemy.color;
      minimapCtx.fillRect(
        (enemy.x - enemy.radius / 2) * scale,
        (enemy.y - enemy.radius / 2) * scale,
        enemy.radius * scale,
        enemy.radius * scale
      );
    }

    // Player
    minimapCtx.fillStyle = "#44bbff";
    minimapCtx.beginPath();
    minimapCtx.arc(player.x * scale, player.y * scale, 3, 0, Math.PI * 2);
    minimapCtx.fill();
    minimapCtx.strokeStyle = "#fff";
    minimapCtx.lineWidth = 1;
    minimapCtx.stroke();

    // Viewport rectangle
    minimapCtx.strokeStyle = "rgba(255,255,255,0.6)";
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(
      camera.x * scale,
      camera.y * scale,
      canvas.width * scale,
      canvas.height * scale
    );
  }

  // ==================== HUD ====================
  function updateHUD() {
    if (!player) return;
    document.getElementById("hp-bar").style.width = (player.hp / player.maxHp * 100).toFixed(0) + "%";
    document.getElementById("hp-text").textContent = Math.ceil(player.hp);
    document.getElementById("kills-text").textContent = kills;
    document.getElementById("wave-text").textContent = wave;
    document.getElementById("score-text").textContent = score;

    document.getElementById("ammo-0").textContent = WEAPONS[0].ammo === Infinity ? "∞" : player.ammo[0];
    document.getElementById("ammo-1").textContent = player.ammo[1];
    document.getElementById("ammo-2").textContent = player.ammo[2];

    // Highlight active weapon
    document.querySelectorAll(".weapon-slot").forEach((el, i) => {
      el.classList.toggle("active", i === currentWeapon);
    });
  }

  // ==================== Input ====================
  window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (e.key === "1") { currentWeapon = 0; updateHUD(); }
    if (e.key === "2") { currentWeapon = 1; updateHUD(); }
    if (e.key === "3") { currentWeapon = 2; updateHUD(); }
    if (e.key.toLowerCase() === "r") startReload();
    if (e.key === " ") { e.preventDefault(); tryDodge(); }

    if (e.key === "Escape" && gameState === "playing") {
      endGame();
    }
  });

  window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.worldX = e.clientX + camera.x;
    mouse.worldY = e.clientY + camera.y;
  });

  canvas.addEventListener("mousedown", e => {
    if (e.button === 0) {
      mouse.down = true;
      // Resume audio context on user gesture
      if (audioCtx.state === "suspended") audioCtx.resume();
    }
  });

  canvas.addEventListener("mouseup", e => {
    if (e.button === 0) mouse.down = false;
  });

  canvas.addEventListener("contextmenu", e => e.preventDefault());

  // Touch support
  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    mouse.down = true;
    const t = e.touches[0];
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.worldX = t.clientX + camera.x;
    mouse.worldY = t.clientY + camera.y;
    if (audioCtx.state === "suspended") audioCtx.resume();
  });

  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const t = e.touches[0];
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.worldX = t.clientX + camera.x;
    mouse.worldY = t.clientY + camera.y;
  });

  canvas.addEventListener("touchend", e => {
    e.preventDefault();
    mouse.down = false;
  });

  // ==================== Start Button ====================
  startBtn.addEventListener("click", () => {
    resetGame();
    gameState = "playing";
    overlay.classList.add("hidden");
    if (audioCtx.state === "suspended") audioCtx.resume();
  });

  // ==================== Game Loop ====================
  function gameLoop(now) {
    const dt = lastTime ? (now - lastTime) / 1000 : 0.016;
    lastTime = now;

    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  // ==================== Init ====================
  function init() {
    resetGame();
    gameState = "menu";
    overlay.classList.remove("hidden");
    overlayTitle.textContent = "🔫 枪战之王";
    document.getElementById("overlay-sub").textContent = "俯视角射击 · Top-Down Shooter";
    startBtn.textContent = "开始游戏 START";
    // Hide ammo display for menu
    updateHUD();
    requestAnimationFrame(gameLoop);
  }

  init();
})();
