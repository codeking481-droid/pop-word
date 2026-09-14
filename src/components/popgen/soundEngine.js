// Offline sound engine — Web Audio API synthesis. No files, no API.
let ctx = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function popSound(volume = 0.5, freq = 620) {
  const ac = ensure();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.35), now + 0.09);
    const v = Math.min(1, Math.max(0, volume)) * 0.28;
    gain.gain.setValueAtTime(v, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.13);
  } catch (e) {}
}

// Bright double-pop for money keywords.
export function cashSound(volume = 0.5) {
  const ac = ensure();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    [1320, 1760].forEach((f, i) => {
      const t = now + i * 0.07;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.12);
      const v = Math.min(1, Math.max(0, volume)) * 0.3;
      gain.gain.setValueAtTime(v, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(t); osc.stop(t + 0.15);
    });
  } catch (e) {}
}

// Downward sweep for hook whoosh.
export function whooshSound(volume = 0.5) {
  const ac = ensure();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.3);
    const v = Math.min(1, Math.max(0, volume)) * 0.22;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(v, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.34);
  } catch (e) {}
}

// Low buzz for negative keywords.
export function negSound(volume = 0.5) {
  const ac = ensure();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.18);
    const v = Math.min(1, Math.max(0, volume)) * 0.18;
    gain.gain.setValueAtTime(v, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.22);
  } catch (e) {}
}

export function popSoundKey(volume = 0.5) { popSound(volume, 880); }