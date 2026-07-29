import * as THREE from "three";
import gsap from "gsap";

export const weaponDefs = [
  {
    name: "PISTOL",
    key: "1",
    damage: 30,
    cooldown: 0.28,
    ammo: Infinity,
    maxAmmo: Infinity,
    reloadTime: 0,
    spread: 0.015,
    bulletsPerShot: 1,
    range: 200,
    color: 0xffcc00,
    fireRate: "semi",
  },
  {
    name: "RIFLE",
    key: "2",
    damage: 22,
    cooldown: 0.1,
    ammo: 30,
    maxAmmo: 30,
    reloadTime: 1.8,
    spread: 0.04,
    bulletsPerShot: 1,
    range: 250,
    color: 0x00ccff,
    fireRate: "auto",
  },
];

export function createWeaponModel(scene, camera) {
  const group = new THREE.Group();
  camera.add(group);

  const barrelGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8);
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.9,
  });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.25, -0.18, -0.55);
  group.add(barrel);

  const bodyGeo = new THREE.BoxGeometry(0.1, 0.15, 0.35);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.3,
    metalness: 0.8,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0.25, -0.2, -0.3);
  group.add(body);

  const gripGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08);
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x553322,
    roughness: 0.6,
    metalness: 0.1,
  });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.set(0.25, -0.35, -0.25);
  grip.rotation.x = 0.3;
  group.add(grip);

  // Muzzle flash point (empty for now)
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.25, -0.18, -0.85);
  group.add(muzzle);

  group.visible = false;
  return { group, muzzle };
}
