import * as THREE from "three";
import gsap from "gsap";

const particles = [];
const trailPool = [];

export function createMuzzleFlash(scene) {
  const geo = new THREE.PlaneGeometry(0.3, 0.3);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(geo, mat);
  scene.add(flash);
  flash.visible = false;
  return flash;
}

export function triggerMuzzleFlash(flash, position, quaternion) {
  flash.position.copy(position);
  flash.quaternion.copy(quaternion);
  flash.visible = true;
  flash.material.opacity = 1;
  flash.scale.set(1 + Math.random(), 1 + Math.random(), 1);

  gsap.to(flash.material, {
    opacity: 0,
    duration: 0.06,
    onComplete: () => {
      flash.visible = false;
    },
  });
}

export function spawnImpact(scene, point, normal) {
  const sparkCount = 6;
  for (let i = 0; i < sparkCount; i++) {
    const geo = new THREE.SphereGeometry(0.03, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      depthWrite: false,
    });
    const spark = new THREE.Mesh(geo, mat);
    spark.position.copy(point);
    spark.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 6 + normal.x * 3,
      Math.random() * 4 + 1,
      (Math.random() - 0.5) * 6 + normal.z * 3
    );
    spark.userData.life = 0.3 + Math.random() * 0.3;
    spark.userData.age = 0;
    scene.add(spark);
    particles.push(spark);
  }

  // Impact marker (small decal-like quad)
  const markerGeo = new THREE.CircleGeometry(0.15, 8);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0x333333,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.copy(point).addScaledVector(normal, 0.01);
  marker.lookAt(point.clone().add(normal));
  marker.userData.life = 5;
  marker.userData.age = 0;
  scene.add(marker);
  particles.push(marker);
}

export function createBulletTrail(scene) {
  const points = [new THREE.Vector3(), new THREE.Vector3()];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  return { line: new THREE.Line(geo, mat), points, pool: true };
}

export function showTrail(scene, start, end, color = 0xffcc00) {
  let trailObj;
  if (trailPool.length > 0) {
    trailObj = trailPool.pop();
    trailObj.points[0].copy(start);
    trailObj.points[1].copy(end);
    trailObj.line.geometry.setFromPoints(trailObj.points);
    trailObj.line.material.color.setHex(color);
    trailObj.line.material.opacity = 0.7;
    trailObj.line.visible = true;
  } else {
    const pts = [start.clone(), end.clone()];
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    trailObj = { line: new THREE.Line(g, m), points: pts };
    scene.add(trailObj.line);
  }

  gsap.to(trailObj.line.material, {
    opacity: 0,
    duration: 0.2,
    delay: 0.02,
    onComplete: () => {
      trailObj.line.visible = false;
      trailPool.push(trailObj);
    },
  });
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.age += dt;
    if (p.userData.age >= p.userData.life) {
      p.geometry?.dispose();
      p.material?.dispose();
      p.parent?.remove(p);
      particles.splice(i, 1);
      continue;
    }
    const t = p.userData.age / p.userData.life;
    p.material.opacity = 1 - t;
    if (p.userData.velocity) {
      p.position.x += p.userData.velocity.x * dt;
      p.position.y += p.userData.velocity.y * dt;
      p.position.z += p.userData.velocity.z * dt;
      p.userData.velocity.y -= 9.8 * dt;
    }
  }
}

export function clearAllEffects(scene) {
  for (const p of particles) {
    p.geometry?.dispose();
    p.material?.dispose();
    p.parent?.remove(p);
  }
  particles.length = 0;

  scene.traverse((obj) => {
    if (
      obj.userData &&
      obj.userData.pool &&
      obj.userData.line &&
      obj.userData.line.parent
    ) {
      obj.userData.line.parent.remove(obj.userData.line);
      obj.userData.line.geometry?.dispose();
      obj.userData.line.material?.dispose();
    }
  });
  trailPool.length = 0;
}
