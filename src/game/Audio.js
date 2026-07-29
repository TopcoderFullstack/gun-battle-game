let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, type, duration, vol = 0.06) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

export function sfxShoot() {
  playTone(100, "square", 0.1, 0.04);
}
export function sfxRifle() {
  playTone(150, "square", 0.07, 0.03);
}
export function sfxShotgun() {
  playTone(50, "sawtooth", 0.2, 0.07);
}
export function sfxSniper() {
  playTone(200, "sawtooth", 0.15, 0.05);
}
export function sfxHit() {
  playTone(80, "triangle", 0.1, 0.05);
}
export function sfxExplosion() {
  playTone(30, "sawtooth", 0.3, 0.1);
}
export function sfxPickup() {
  playTone(400, "sine", 0.08, 0.04);
}
export function sfxDamage() {
  playTone(60, "sawtooth", 0.2, 0.06);
}
export function sfxReload() {
  playTone(300, "square", 0.05, 0.03);
  setTimeout(() => playTone(400, "square", 0.05, 0.03), 100);
}
