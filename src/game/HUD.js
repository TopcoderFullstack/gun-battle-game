import gsap from "gsap";

export class HUD {
  constructor() {
    this.elements = {
      hpBar: document.getElementById("hp-bar"),
      hpText: document.getElementById("hp-text"),
      killsText: document.getElementById("kills-text"),
      scoreText: document.getElementById("score-text"),
      weaponName: document.getElementById("weapon-name"),
      ammoText: document.getElementById("ammo-text"),
      damageFlash: document.getElementById("damage-flash"),
      hitMarker: document.getElementById("hit-marker"),
      reloadIndicator: document.getElementById("reload-indicator"),
      crosshair: document.getElementById("crosshair"),
      overlay: document.getElementById("overlay"),
      startBtn: document.getElementById("start-btn"),
      overlayTitle: document.getElementById("overlay-title"),
      overlaySub: document.getElementById("overlay-sub"),
      backpack: document.getElementById("backpack-panel"),
      slot1: document.getElementById("slot-1"),
      slot2: document.getElementById("slot-2"),
      zoneTimer: document.getElementById("zone-timer"),
      zonePhase: document.getElementById("zone-phase"),
      itemBandage: document.getElementById("item-bandage"),
      itemMedkit: document.getElementById("item-medkit"),
      itemArmor: document.getElementById("item-armor"),
      aliveCount: document.getElementById("alive-count"),
    };
  }

  update(playerHP, maxHP, kills, score) {
    const hpPct = (playerHP / maxHP) * 100;
    this.elements.hpBar.style.width = hpPct + "%";
    this.elements.hpText.textContent = Math.ceil(playerHP);

    if (hpPct < 25) {
      this.elements.hpBar.style.background =
        "linear-gradient(90deg, #ff0000, #ff4444)";
    } else if (hpPct < 50) {
      this.elements.hpBar.style.background =
        "linear-gradient(90deg, #ff8800, #ffaa44)";
    } else {
      this.elements.hpBar.style.background =
        "linear-gradient(90deg, #44ff44, #66ff66)";
    }

    this.elements.killsText.textContent = kills;
    this.elements.scoreText.textContent = score;
  }

  updateWeapon(name, ammo, reserve, isInfAmmo) {
    this.elements.weaponName.textContent = name;
    const ammoText = isInfAmmo ? "∞" : `${ammo}`;
    this.elements.ammoText.textContent = isInfAmmo ? "∞" : `${ammo} | ${reserve}`;
    this.elements.ammoText.classList.toggle("low", !isInfAmmo && ammo <= 5);
  }

  updateBackpack(inventory) {
    const info = inventory.getInfo();
    if (info.slot1) {
      this.elements.slot1.textContent = `1: ${info.slot1}`;
      this.elements.slot1.style.color =
        info.currentSlot === 0 ? "#ffcc00" : "#aaa";
    } else {
      this.elements.slot1.textContent = "1: --";
      this.elements.slot1.style.color = "#666";
    }

    if (info.slot2) {
      this.elements.slot2.textContent = `2: ${info.slot2}`;
      this.elements.slot2.style.color =
        info.currentSlot === 1 ? "#ffcc00" : "#aaa";
    } else {
      this.elements.slot2.textContent = "2: --";
      this.elements.slot2.style.color = "#666";
    }

    const items = info.items;
    this.elements.itemBandage.textContent =
      items.bandage > 0 ? `Bandage x${items.bandage}` : "";
    this.elements.itemMedkit.textContent =
      items.medkit > 0 ? `MedKit x${items.medkit}` : "";
    this.elements.itemArmor.textContent = items.armor
      ? `Armor ${Math.ceil(items.armor.durability)}%`
      : "";
  }

  updateZone(phaseInfo) {
    if (!this.elements.zoneTimer || !this.elements.zonePhase) return;
    this.elements.zonePhase.textContent = `Phase ${phaseInfo.phase}/${phaseInfo.totalPhases}`;
    const t = phaseInfo.timer;
    this.elements.zoneTimer.textContent =
      t > 0 ? `${Math.ceil(t)}s` : "";
  }

  updateAliveCount(count) {
    if (!this.elements.aliveCount) return;
    this.elements.aliveCount.textContent = `Alive: ${count}`;
  }

  flashDamage() {
    gsap.to(this.elements.damageFlash, {
      opacity: 0.5,
      duration: 0.05,
      onComplete: () => {
        gsap.to(this.elements.damageFlash, { opacity: 0, duration: 0.4 });
      },
    });
  }

  showHitMarker() {
    gsap.to(this.elements.hitMarker, {
      opacity: 1,
      duration: 0.04,
      onComplete: () => {
        gsap.to(this.elements.hitMarker, { opacity: 0, duration: 0.08 });
      },
    });
  }

  showReloading() {
    gsap.to(this.elements.reloadIndicator, {
      opacity: 1,
      duration: 0.1,
    });
  }

  hideReloading() {
    gsap.to(this.elements.reloadIndicator, {
      opacity: 0,
      duration: 0.15,
    });
  }

  showStartScreen() {
    this.elements.overlay.classList.remove("hidden");
    this.elements.overlayTitle.textContent = "BATTLE ROYALE";
    this.elements.overlaySub.textContent = "大型缩圈吃鸡 · 3D FPS";
    this.elements.startBtn.textContent = "START GAME";
  }

  hideStartScreen() {
    this.elements.overlay.classList.add("hidden");
  }

  showGameOver(score, kills, wave) {
    this.elements.overlay.classList.remove("hidden");
    this.elements.overlayTitle.textContent = "WASTED";
    this.elements.overlaySub.textContent = `Score: ${score} | Kills: ${kills} | Phase: ${wave}`;
    this.elements.startBtn.textContent = "RESTART";
  }

  setCrosshairVisible(visible) {
    this.elements.crosshair.style.display = visible ? "block" : "none";
  }
}
