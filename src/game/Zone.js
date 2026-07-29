import { Vector3 } from "@babylonjs/core";

export class ZoneManager {
  constructor(scene) {
    this.scene = scene;
    this.phase = 0;
    this.phases = [
      { delay: 30, radius: 190 },
      { delay: 60, radius: 190, shrink: 60 },
      { delay: 0, radius: 120, shrink: 50 },
      { delay: 0, radius: 70, shrink: 40 },
      { delay: 0, radius: 35, shrink: 30 },
      { delay: 0, radius: 15, shrink: 25 },
      { delay: 0, radius: 5, shrink: 20 },
    ];
    this.currentRadius = 190;
    this.targetRadius = 190;
    this.shrinking = false;
    this.phaseTimer = this.phases[0].delay;
    this.shrinkTimer = 0;
    this.center = new Vector3(0, 0, 0);
    this.outsideDmg = 3;
  }

  update(dt) {
    if (this.phase >= this.phases.length) return;
    const p = this.phases[this.phase];

    if (!this.shrinking && this.phaseTimer > 0) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0 && p.shrink) {
        this.shrinking = true;
        this.targetRadius = p.radius;
        this.shrinkTimer = p.shrink;
      } else if (this.phaseTimer <= 0) {
        this.phase++;
        if (this.phase < this.phases.length) {
          this.phaseTimer = this.phases[this.phase].delay;
          this.targetRadius = this.phases[this.phase].radius;
        }
      }
    }

    if (this.shrinking) {
      this.shrinkTimer -= dt;
      const t = 1 - this.shrinkTimer / (this.phases[this.phase].shrink || 1);
      const startR = this.phase > 0 ? this.phases[this.phase - 1].radius : 190;
      this.currentRadius = startR + (this.targetRadius - startR) * Math.min(t, 1);
      if (t >= 1) {
        this.shrinking = false;
        this.phase++;
        if (this.phase < this.phases.length) {
          this.phaseTimer = this.phases[this.phase].delay;
          this.targetRadius = this.phases[this.phase].radius;
        }
      }
    }
  }

  isOutside(pos) {
    return Math.sqrt(pos.x * pos.x + pos.z * pos.z) > this.currentRadius;
  }

  getDamage() { return this.outsideDmg; }
  getRadius() { return this.currentRadius; }

  getPhaseInfo() {
    return {
      phase: this.phase + 1,
      totalPhases: this.phases.length,
      radius: this.currentRadius,
      shrinking: this.shrinking,
      timer: this.shrinking ? this.shrinkTimer : this.phaseTimer,
      outsideDamge: this.outsideDmg,
    };
  }
}
