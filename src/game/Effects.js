import * as THREE from "three";
import gsap from "gsap";

const trails = [];
const particles = [];

export function createMuzzleFlash(scene) {
  const geo = new THREE.PlaneGeometry(0.4, 0.4);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(geo, mat);
  flash.visible = false;
  scene.add(flash);
  return flash;
}

export function triggerMuzzleFlash(flash, pos, color = 0xffaa00) {
  flash.position.copy(pos);
  flash.material.color.setHex(color);
  flash.material.opacity = 1;
  flash.visible = true;
  flash.scale.set(1.5 + Math.random(), 1.5 + Math.random(), 1);

  gsap.to(flash.material, {
    opacity: 0,
    duration: 0.05,
    onComplete: () => {
      flash.visible = false;
    },
  });
}

export function showTrail(scene, start, end, color = 0xffcc00) {
  const pts = [start.clone(), end.clone()];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  trails.push({ line, age: 0, maxAge: 0.15 });

  gsap.to(mat, {
    opacity: 0,
    duration: 0.15,
    onComplete: () => {
      scene.remove(line);
      geo.dispose();
      mat.dispose();
    },
  });
}

export function spawnBulletImpact(scene, point, normal) {
  const count = 5 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.04, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      depthWrite: false,
    });
    const spark = new THREE.Mesh(geo, mat);
    spark.position.copy(point);
    spark.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 8 + normal.x * 4,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 8 + normal.z * 4
      ),
      life: 0.4 + Math.random() * 0.3,
      age: 0,
    };
    scene.add(spark);
    particles.push(spark);
  }
}

export function spawnExplosion(scene, pos, radius) {
  const count = 15;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: i < 8 ? 0xff6600 : 0xffcc00,
      transparent: true,
      depthWrite: false,
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    const v = new THREE.Vector3(
      (Math.random() - 0.5) * radius * 2,
      Math.random() * radius,
      (Math.random() - 0.5) * radius * 2
    );
    p.userData = {
      velocity: v,
      life: 0.5 + Math.random() * 0.5,
      age: 0,
    };
    scene.add(p);
    particles.push(p);
  }

  // Flash sphere
  const flashGeo = new THREE.SphereGeometry(radius * 0.5, 16, 16);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const flashSphere = new THREE.Mesh(flashGeo, flashMat);
  flashSphere.position.copy(pos);
  scene.add(flashSphere);

  gsap.to(flashSphere.scale, {
    x: 3,
    y: 3,
    z: 3,
    duration: 0.3,
  });
  gsap.to(flashMat, {
    opacity: 0,
    duration: 0.3,
    onComplete: () => {
      scene.remove(flashSphere);
      flashGeo.dispose();
      flashMat.dispose();
    },
  });
}

export function updateParticles(dt, scene) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.age += dt;
    if (p.userData.age >= p.userData.life) {
      p.geometry?.dispose();
      p.material?.dispose();
      scene.remove(p);
      particles.splice(i, 1);
      continue;
    }
    const t = p.userData.age / p.userData.life;
    p.material.opacity = 1 - t;
    p.scale.setScalar(1 - t * 0.7);
    if (p.userData.velocity) {
      p.position.x += p.userData.velocity.x * dt;
      p.position.y += p.userData.velocity.y * dt;
      p.position.z += p.userData.velocity.z * dt;
      p.userData.velocity.y -= 9.8 * dt;
    }
  }
}

export function cleanupEffects(scene) {
  for (const p of particles) {
    p.geometry?.dispose();
    p.material?.dispose();
    scene.remove(p);
  }
  particles.length = 0;

  for (const t of trails) {
    t.line.geometry?.dispose();
    t.line.material?.dispose();
    scene.remove(t.line);
  }
  trails.length = 0;
}
