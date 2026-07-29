import {
  MeshBuilder, StandardMaterial, Color3, Vector3, Ray, PhysicsAggregate,
  PhysicsShapeType, Mesh,
} from "@babylonjs/core";

export const WEAPON_DEFS = {
  pistol: { name: "Pistol", damage: 25, cooldown: 0.28, ammo: 15, maxAmmo: 15, reserve: 60, reloadTime: 1.2, spread: 0.02, bullets: 1, range: 150, color: [1, 0.8, 0], fireMode: "semi" },
  smg: { name: "SMG", damage: 18, cooldown: 0.07, ammo: 30, maxAmmo: 30, reserve: 120, reloadTime: 1.8, spread: 0.06, bullets: 1, range: 100, color: [0, 1, 0.53], fireMode: "auto" },
  shotgun: { name: "Shotgun", damage: 20, cooldown: 0.75, ammo: 5, maxAmmo: 5, reserve: 30, reloadTime: 2.5, spread: 0.18, bullets: 8, range: 60, color: [1, 0.4, 0], fireMode: "semi" },
  rifle: { name: "AR", damage: 28, cooldown: 0.12, ammo: 30, maxAmmo: 30, reserve: 120, reloadTime: 2.0, spread: 0.04, bullets: 1, range: 200, color: [0.27, 0.67, 1], fireMode: "auto" },
  sniper: { name: "Sniper", damage: 85, cooldown: 1.2, ammo: 5, maxAmmo: 5, reserve: 25, reloadTime: 2.8, spread: 0.005, bullets: 1, range: 350, color: [1, 0.27, 0.27], fireMode: "semi", scope: true },
};

export const WEAPON_LIST = Object.values(WEAPON_DEFS);

export const ITEMS = {
  bandage: { name: "Bandage", healAmount: 25, maxStack: 8 },
  medkit: { name: "Med Kit", healAmount: 75, maxStack: 3 },
  armor: { name: "Armor", dmgReduction: 0.35, durability: 100 },
  helmet: { name: "Helmet", dmgReduction: 0.25, durability: 80 },
};

export class Inventory {
  constructor(scene, camera) {
    this.weapons = [null, null];
    this.currentSlot = 0;
    this.items = { bandage: 0, medkit: 0, armor: null, helmet: null, grenade: 0 };
    this.weaponModels = [];
    this.scene = scene;
    this.camera = camera;
  }

  pickup(weaponDef) {
    const slot = this.currentSlot;
    this.weapons[slot] = {
      def: weaponDef, ammo: weaponDef.ammo, reserve: weaponDef.reserve,
    };
    this.createWeaponModel(slot, weaponDef);
    return this.weapons[slot];
  }

  pickupItem(itemId) {
    if (itemId === "bandage" || itemId === "medkit") {
      const max = ITEMS[itemId].maxStack;
      if (this.items[itemId] < max) this.items[itemId]++;
    } else if (itemId === "armor" || itemId === "helmet") {
      if (!this.items[itemId]) this.items[itemId] = { durability: ITEMS[itemId].durability };
    }
  }

  createWeaponModel(slot, def) {
    const group = new Mesh("weaponModel" + slot, this.scene);
    group.parent = this.camera;
    group.position.set(0.25, -0.2, 0.4);

    const metal = new StandardMaterial("gunMetal", this.scene);
    metal.diffuseColor = new Color3(0.18, 0.18, 0.18);
    metal.specularColor = new Color3(0.3, 0.3, 0.3);

    const acc = new StandardMaterial("gunAcc", this.scene);
    acc.diffuseColor = new Color3(...def.color);
    acc.emissiveColor = new Color3(...def.color);
    acc.emissiveIntensity = 0.15;

    // Barrel
    const barrel = MeshBuilder.CreateCylinder("barrel", { height: 0.7, diameter: 0.04 }, this.scene);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, -0.02, -0.5);
    barrel.material = metal;
    barrel.parent = group;

    // Body
    const body = MeshBuilder.CreateBox("body", { width: 0.08, height: 0.12, depth: 0.45 }, this.scene);
    body.position.set(0, 0, -0.15);
    body.material = metal;
    body.parent = group;

    // Grip
    const grip = MeshBuilder.CreateBox("grip", { width: 0.06, height: 0.18, depth: 0.06 }, this.scene);
    grip.position.set(0, -0.18, -0.05);
    grip.rotation.x = 0.3;
    grip.material = new StandardMaterial("gripMat", this.scene);
    grip.material.diffuseColor = new Color3(0.2, 0.13, 0.06);
    grip.parent = group;

    // Accent
    const accent = MeshBuilder.CreateBox("accent", { width: 0.07, height: 0.03, depth: 0.35 }, this.scene);
    accent.position.set(0, -0.05, -0.2);
    accent.material = acc;
    accent.parent = group;

    // Muzzle point
    const muzzle = new Mesh("muzzlePt", this.scene);
    muzzle.position.set(0, -0.02, -0.85);
    muzzle.parent = group;

    group.setEnabled(false);

    this.weaponModels[slot] = { group, muzzle, def };
  }

  getCurrentWeapon() {
    const w = this.weapons[this.currentSlot];
    if (!w) return { def: { name: "Fist", damage: 10, cooldown: 0.5, ammo: Infinity, range: 3, spread: 0, bullets: 1, color: [1, 1, 1], fireMode: "semi" }, ammo: Infinity, reserve: Infinity };
    return w;
  }

  switchWeapon(slot) {
    if (slot === this.currentSlot || !this.weapons[slot]) return null;
    const prev = this.weaponModels[this.currentSlot];
    if (prev) prev.group.setEnabled(false);
    this.currentSlot = slot;
    const next = this.weaponModels[slot];
    if (next) next.group.setEnabled(true);
    return this.weapons[slot];
  }

  getActiveModel() {
    return this.weaponModels[this.currentSlot] || null;
  }

  consumeAmmo(count) {
    const w = this.weapons[this.currentSlot];
    if (!w || w.def.ammo === Infinity) return true;
    if (w.ammo >= count) { w.ammo -= count; return true; }
    return false;
  }

  reload() {
    const w = this.weapons[this.currentSlot];
    if (!w || w.ammo >= w.def.maxAmmo || w.reserve <= 0) return false;
    const need = w.def.maxAmmo - w.ammo;
    const from = Math.min(need, w.reserve);
    w.ammo += from; w.reserve -= from;
    return true;
  }

  useBandage() {
    if (this.items.bandage > 0) { this.items.bandage--; return ITEMS.bandage.healAmount; }
    return 0;
  }

  getDamageReduction() {
    let r = 0;
    if (this.items.armor && this.items.armor.durability > 0) r += ITEMS.armor.dmgReduction;
    return Math.min(r, 0.6);
  }

  damageArmor(dmg) {
    if (this.items.armor && this.items.armor.durability > 0) {
      this.items.armor.durability -= dmg * 0.5;
      if (this.items.armor.durability <= 0) this.items.armor = null;
    }
  }

  getInfo() {
    const w = this.getCurrentWeapon();
    return {
      currentWeapon: w.def.name,
      ammo: w.ammo,
      reserve: w.reserve,
      isInfAmmo: w.def.ammo === Infinity,
      slot1: this.weapons[0]?.def?.name || null,
      slot2: this.weapons[1]?.def?.name || null,
      currentSlot: this.currentSlot,
      items: { ...this.items },
    };
  }

  getMuzzleWorldPos() {
    const model = this.getActiveModel();
    if (!model || !model.muzzle) return null;
    return model.muzzle.getAbsolutePosition();
  }
}
