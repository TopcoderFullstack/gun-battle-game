import * as THREE from "three";
import gsap from "gsap";

const chests = [];

export function createChestModel(scene, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Base box
  const boxGeo = new THREE.BoxGeometry(1.2, 0.7, 0.9);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x8B5E3C,
    roughness: 0.5,
    metalness: 0.2,
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.y = 0.35;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  // Metal bands
  const bandGeo = new THREE.BoxGeometry(1.25, 0.08, 0.12);
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.3,
    metalness: 0.9,
  });
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.set(0, 0.25 + i * 0.2, -0.45);
    band.castShadow = true;
    group.add(band);
    const band2 = new THREE.Mesh(bandGeo, bandMat);
    band2.position.set(0, 0.25 + i * 0.2, 0.45);
    band2.castShadow = true;
    group.add(band2);
  }

  // Lid
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.7, 0);

  const lidGeo = new THREE.BoxGeometry(1.2, 0.2, 0.95);
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0x9B6E4C,
    roughness: 0.5,
    metalness: 0.2,
  });
  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.y = 0.1;
  lid.castShadow = true;
  lidGroup.add(lid);

  // Lid handle
  const handleGeo = new THREE.TorusGeometry(0.15, 0.04, 8, 8);
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0xcccc44,
    roughness: 0.2,
    metalness: 0.9,
  });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.25, 0.3);
  lidGroup.add(handle);

  // Hinge
  const hingeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
  const hinge = new THREE.Mesh(hingeGeo, bandMat);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, 0, -0.45);
  lidGroup.add(hinge);

  group.add(lidGroup);

  // Glow ring
  const glowGeo = new THREE.TorusGeometry(0.8, 0.06, 8, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.05;
  glow.name = "chestGlow";
  group.add(glow);

  scene.add(group);

  const chest = {
    group,
    lidGroup,
    box,
    glow,
    position: new THREE.Vector3(x, 0.7, z),
    opened: false,
    lootSpawned: false,
  };

  // Bob animation
  chest.bobAnim = gsap.to(group.position, {
    y: 0.08,
    duration: 1.2,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  });

  chests.push(chest);
  return chest;
}

export function openChest(chest) {
  if (chest.opened) return false;
  chest.opened = true;

  // Stop bob
  if (chest.bobAnim) chest.bobAnim.kill();

  // Open lid animation
  gsap.to(chest.lidGroup.rotation, {
    x: -Math.PI * 0.6,
    duration: 0.5,
    ease: "power2.out",
  });

  // Glow fade
  gsap.to(chest.glow.material, {
    opacity: 0,
    duration: 0.5,
  });

  // Box bounce
  gsap.to(chest.group.position, {
    y: 0.05,
    duration: 0.15,
    yoyo: true,
    repeat: 1,
  });

  return true;
}

export function getChests() {
  return chests;
}

export function findNearestChest(pos, maxDist = 4) {
  let closest = null;
  let closestDist = maxDist;
  for (const c of chests) {
    if (c.opened) continue;
    const d = pos.distanceTo(c.position);
    if (d < closestDist) {
      closestDist = d;
      closest = c;
    }
  }
  return closest;
}
