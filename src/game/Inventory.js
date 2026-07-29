import { WEAPONS, ITEMS, createWeaponModel } from "./WeaponDefs.js";

export class Inventory {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.weapons = [null, null]; // 2 weapon slots
    this.currentSlot = 0;
    this.items = {
      bandage: 0,
      medkit: 0,
      armor: null,
      helmet: null,
      grenade: 0,
    };
    this.weaponModels = [];
    this.activeModel = null;
  }

  pickup(def, type) {
    if (type === "weapon") {
      const slot = this.currentSlot;
      const oldWeapon = this.weapons[slot];
      if (oldWeapon) {
        this.removeWeaponModel(slot);
      }
      const instance = {
        def,
        ammo: def.ammo,
        reserve: def.reserve,
      };
      this.weapons[slot] = instance;
      this.createWeaponModel(slot, def);
      this.currentSlot = slot;
      return { action: "pickup", weapon: instance };
    }

    if (type === "item") {
      const id = def.id;
      if (id === "bandage" || id === "medkit") {
        const max = ITEMS[id].maxStack;
        if (this.items[id] < max) {
          this.items[id] = (this.items[id] || 0) + 1;
        }
        return { action: "pickup", item: { id, count: this.items[id] } };
      }
      if (id === "armor" || id === "helmet") {
        if (!this.items[id]) {
          this.items[id] = { durability: ITEMS[id].durability };
          return { action: "pickup", item: { id, equipped: true } };
        } else {
          return { action: "full", item: { id } };
        }
      }
    }
    return null;
  }

  createWeaponModel(slot, def) {
    const { group, muzzle } = createWeaponModel(def);
    this.camera.add(group);
    group.visible = slot === this.currentSlot;
    this.weaponModels[slot] = { group, muzzle, def };
    if (slot === this.currentSlot) this.activeModel = { group, muzzle, def };
  }

  removeWeaponModel(slot) {
    const model = this.weaponModels[slot];
    if (model) {
      model.group.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      this.camera.remove(model.group);
      this.weaponModels[slot] = null;
    }
  }

  switchWeapon(slot) {
    if (slot === this.currentSlot) return null;
    if (!this.weapons[slot]) return null;

    if (this.weaponModels[this.currentSlot]) {
      this.weaponModels[this.currentSlot].group.visible = false;
    }

    this.currentSlot = slot;
    if (this.weaponModels[slot]) {
      this.weaponModels[slot].group.visible = true;
      this.activeModel = this.weaponModels[slot];
    }
    return this.weapons[slot];
  }

  getCurrentWeapon() {
    if (!this.weapons[this.currentSlot]) {
      // Default fist
      return {
        def: { name: "Fist", damage: 10, cooldown: 0.5, ammo: Infinity, range: 3, spread: 0, bullets: 1, color: 0xffffff, fireMode: "semi", bulletSpeed: 200, reloadTime: 0 },
        ammo: Infinity,
        reserve: Infinity,
      };
    }
    return this.weapons[this.currentSlot];
  }

  getActiveModel() {
    return this.activeModel;
  }

  consumeAmmo(count) {
    const w = this.weapons[this.currentSlot];
    if (!w || w.def.ammo === Infinity) return true;
    if (w.ammo >= count) {
      w.ammo -= count;
      return true;
    }
    return false;
  }

  reload() {
    const w = this.weapons[this.currentSlot];
    if (!w) return false;
    if (w.ammo >= w.def.maxAmmo) return false;
    if (w.reserve <= 0) return false;

    const needed = w.def.maxAmmo - w.ammo;
    const fromReserve = Math.min(needed, w.reserve);
    w.ammo += fromReserve;
    w.reserve -= fromReserve;
    return true;
  }

  useItem(id) {
    if (id === "bandage" && this.items.bandage > 0) {
      this.items.bandage--;
      return { heal: ITEMS.bandage.healAmount };
    }
    if (id === "medkit" && this.items.medkit > 0) {
      this.items.medkit--;
      return { heal: ITEMS.medkit.healAmount };
    }
    return null;
  }

  getDamageReduction() {
    let reduction = 0;
    if (this.items.armor && this.items.armor.durability > 0) {
      reduction += ITEMS.armor.damageReduction;
    }
    if (this.items.helmet && this.items.helmet.durability > 0) {
      reduction += ITEMS.helmet.damageReduction * 0.5; // helmet only for head
    }
    return Math.min(reduction, 0.6);
  }

  damageArmor(damage) {
    const armorDamage = damage * 0.5;
    if (this.items.armor && this.items.armor.durability > 0) {
      this.items.armor.durability -= armorDamage;
      if (this.items.armor.durability <= 0) {
        this.items.armor = null;
      }
    }
  }

  hasGrenade() {
    return this.items.grenade > 0;
  }

  useGrenade() {
    if (this.items.grenade > 0) {
      this.items.grenade--;
      return true;
    }
    return false;
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
      reloading: this.reloading || false,
      reloadTime: this.reloadTime || 0,
    };
  }

  getMuzzlePoint() {
    return this.activeModel?.muzzle || null;
  }
}
