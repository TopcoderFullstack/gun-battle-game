import * as THREE from "three";
import gsap from "gsap";

const MAP_HALF = 190;

export class ZoneManager {
  constructor(scene) {
    this.scene = scene;
    this.phase = 0;
    this.phases = [
      { delay: 30, radius: MAP_HALF, shrinkTime: 0 }, // Wait
      { delay: 60, radius: MAP_HALF, shrinkTime: 60 }, // Phase 1 shrink
      { delay: 0, radius: 120, shrinkTime: 50 }, // Phase 2
      { delay: 0, radius: 70, shrinkTime: 40 }, // Phase 3
      { delay: 0, radius: 35, shrinkTime: 30 }, // Phase 4
      { delay: 0, radius: 15, shrinkTime: 25 }, // Phase 5
      { delay: 0, radius: 5, shrinkTime: 20 }, // Final
    ];
    this.currentRadius = MAP_HALF;
    this.targetRadius = MAP_HALF;
    this.shrinking = false;
    this.phaseTimer = this.phases[0].delay;
    this.center = new THREE.Vector3(0, 0, 0);
    this.outsideDamage = 3;
    this.visualRing = null;
    this.createVisuals();
  }

  createVisuals() {
    const geo = new THREE.TorusGeometry(this.currentRadius, 1.5, 16, 128);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.visualRing = new THREE.Mesh(geo, mat);
    this.visualRing.rotation.x = -Math.PI / 2;
    this.visualRing.position.y = 0.5;
    this.scene.add(this.visualRing);

    // Outer boundary wall (simple transparent ring)
    const domeGeo = new THREE.CylinderGeometry(
      MAP_HALF + 20,
      MAP_HALF + 20,
      60,
      64,
      1,
      true
    );
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.dome = new THREE.Mesh(domeGeo, domeMat);
    this.dome.position.y = 2;
    this.scene.add(this.dome);
  }

  update(dt) {
    if (this.phase >= this.phases.length) return;

    const phase = this.phases[this.phase];

    if (!this.shrinking && this.phaseTimer > 0) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.shrinking = true;
        this.targetRadius = phase.radius;
        this.shrinkTimeLeft = phase.shrinkTime;

        gsap.to(this.visualRing.material, {
          opacity: 0.8,
          duration: 0.5,
        });
      }
    }

    if (this.shrinking) {
      this.shrinkTimeLeft -= dt;
      const t = 1 - this.shrinkTimeLeft / phase.shrinkTime;
      this.currentRadius =
        MAP_HALF +
        (this.targetRadius - MAP_HALF) * (this.phases[this.phase - 1] ? 0 : 0);
      // Actually, track from previous radius to target
      const startRadius =
        this.phase === 0
          ? MAP_HALF
          : this.phases[this.phase - 1].radius;
      this.currentRadius =
        startRadius + (this.targetRadius - startRadius) * Math.min(t, 1);

      this.visualRing.scale.setScalar(
        this.currentRadius / MAP_HALF
      );

      if (t >= 1) {
        this.shrinking = false;
        this.phase++;
        if (this.phase < this.phases.length) {
          this.phaseTimer = this.phases[this.phase].delay;
        }
        gsap.to(this.visualRing.material, {
          opacity: 0.5,
          duration: 0.5,
        });
      }
    }
  }

  isOutside(pos) {
    const dx = pos.x - this.center.x;
    const dz = pos.z - this.center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist > this.currentRadius;
  }

  getDamage() {
    return this.outsideDamage;
  }

  getRadius() {
    return this.currentRadius;
  }

  getPhaseInfo() {
    const totalPhases = this.phases.length;
    return {
      phase: this.phase + 1,
      totalPhases,
      radius: this.currentRadius,
      shrinking: this.shrinking,
      timer: this.shrinking ? this.shrinkTimeLeft : this.phaseTimer,
      outsideDamage: this.outsideDamage,
    };
  }
}
