import { MeshBuilder, StandardMaterial, Color3, Vector3, ParticleSystem, Texture, Mesh } from "@babylonjs/core";
import gsap from "gsap";

export function createMuzzleFlash(scene) {
  const flash = MeshBuilder.CreatePlane("mFlash", { width: 0.5, height: 0.5 }, scene);
  flash.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const mat = new StandardMaterial("flashMat", scene);
  mat.diffuseColor = new Color3(1, 0.8, 0);
  mat.emissiveColor = new Color3(1, 0.6, 0);
  mat.disableLighting = true;
  mat.alpha = 0;
  flash.material = mat;
  flash.isVisible = false;
  return { mesh: flash, material: mat };
}

export function triggerFlash(flash, pos, color = [1, 0.67, 0]) {
  flash.mesh.position.copyFrom(pos);
  flash.material.diffuseColor = new Color3(...color);
  flash.material.emissiveColor = new Color3(...color);
  flash.mesh.isVisible = true;
  flash.material.alpha = 1;
  gsap.to(flash.material, { alpha: 0, duration: 0.06, onComplete: () => { flash.mesh.isVisible = false; } });
}

export function createBulletTrail(scene) {
  const trailMat = new StandardMaterial("trail", scene);
  trailMat.diffuseColor = new Color3(1, 0.8, 0);
  trailMat.emissiveColor = new Color3(1, 0.6, 0);
  trailMat.disableLighting = true;
  trailMat.alpha = 0.7;
  return trailMat;
}

export function showTrail(scene, start, end, color = [1, 0.8, 0], mat) {
  const m = mat || createBulletTrail(scene);
  m.alpha = 0.8;
  const points = [start.clone(), end.clone()];
  const line = MeshBuilder.CreateLines("trailLine", { points, updatable: true }, scene);
  line.color = new Color3(...color);
  line.alpha = 0.8;

  gsap.to({ v: 0.8 }, {
    v: 0, duration: 0.15, onUpdate: function () {
      line.alpha = this.targets()[0].v;
    }, onComplete: () => {
      line.dispose();
    }
  });
  return line;
}

export function spawnImpact(scene, point, normal = Vector3.Up()) {
  for (let i = 0; i < 5; i++) {
    const s = MeshBuilder.CreateSphere("spark", { diameter: 0.06 }, scene);
    s.position.copyFrom(point);
    const mat = new StandardMaterial("sparkM", scene);
    mat.diffuseColor = new Color3(1, 0.5, 0);
    mat.emissiveColor = new Color3(1, 0.4, 0);
    mat.disableLighting = true;
    s.material = mat;

    const vel = new Vector3(
      (Math.random() - 0.5) * 4 + normal.x * 2,
      Math.random() * 3 + 1,
      (Math.random() - 0.5) * 4 + normal.z * 2
    );
    const life = 0.35 + Math.random() * 0.2;
    let age = 0;

    const obs = scene.onBeforeRenderObservable.add(() => {
      age += 0.016;
      if (age >= life) {
        scene.removeMesh(s);
        scene.onBeforeRenderObservable.remove(obs);
        s.dispose();
        mat.dispose();
        return;
      }
      s.position.addInPlace(vel.scale(0.016));
      vel.y -= 9.8 * 0.016;
      mat.alpha = 1 - age / life;
    });
  }
}

export function spawnExplosion(scene, pos, radius = 5) {
  for (let i = 0; i < 15; i++) {
    const s = MeshBuilder.CreateSphere("exp", { diameter: 0.1 }, scene);
    s.position.copyFrom(pos);
    const mat = new StandardMaterial("expM", scene);
    mat.diffuseColor = i < 8 ? new Color3(1, 0.4, 0) : new Color3(1, 0.8, 0);
    mat.emissiveColor = mat.diffuseColor;
    mat.disableLighting = true;
    s.material = mat;

    const vel = new Vector3(
      (Math.random() - 0.5) * radius * 2,
      Math.random() * radius,
      (Math.random() - 0.5) * radius * 2
    );
    const life = 0.4 + Math.random() * 0.3;
    let age = 0;
    const obs = scene.onBeforeRenderObservable.add(() => {
      age += 0.016;
      if (age >= life) {
        scene.removeMesh(s);
        scene.onBeforeRenderObservable.remove(obs);
        s.dispose();
        mat.dispose();
        return;
      }
      s.position.addInPlace(vel.scale(0.016));
      vel.y -= 9.8 * 0.016;
      mat.alpha = 1 - age / life;
      s.scaling.scaleInPlace(0.99);
    });
  }

  // Flash sphere
  const flashSphere = MeshBuilder.CreateSphere("flashS", { diameter: radius }, scene);
  flashSphere.position.copyFrom(pos);
  const fm = new StandardMaterial("fsMat", scene);
  fm.diffuseColor = new Color3(1, 0.7, 0);
  fm.emissiveColor = new Color3(1, 0.5, 0);
  fm.disableLighting = true;
  fm.alpha = 0.6;
  flashSphere.material = fm;
  gsap.to(fm, { alpha: 0, duration: 0.3 });
  gsap.to(flashSphere.scaling, { x: 3, y: 3, z: 3, duration: 0.3, onComplete: () => { flashSphere.dispose(); fm.dispose(); } });
}
