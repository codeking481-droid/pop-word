// Client-side export helpers: video (MediaRecorder), GIF (gif.js via CDN), clipboard.

export function pickVideoMime() {
  const types = [
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'video/webm';
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function recordVideo(renderer, { duration, onProgress, audioUrl, musicUrl, musicVolume = 0.6, duck = true }) {
  const fps = 30;
  const canvasStream = renderer.canvas.captureStream(fps);
  let stream = canvasStream;
  let audioCtx = null;
  let voiceEl = null;
  let musicEl = null;

  if (audioUrl || musicUrl) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      if (audioUrl) {
        voiceEl = new Audio(audioUrl);
        voiceEl.crossOrigin = 'anonymous';
        const vSrc = audioCtx.createMediaElementSource(voiceEl);
        vSrc.connect(dest);
      }
      if (musicUrl) {
        musicEl = new Audio(musicUrl);
        musicEl.crossOrigin = 'anonymous';
        musicEl.loop = true;
        const mSrc = audioCtx.createMediaElementSource(musicEl);
        const mGain = audioCtx.createGain();
        mGain.gain.value = audioUrl && duck ? musicVolume * 0.2 : musicVolume;
        mSrc.connect(mGain);
        mGain.connect(dest);
      }
      stream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    } catch (e) {
      stream = canvasStream;
      if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
      voiceEl = null;
      musicEl = null;
    }
  }

  const mimeType = pickVideoMime();
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  const prevSpeed = renderer.speed;
  renderer.setSpeed(1);
  renderer.seek(0);
  renderer.play();
  if (voiceEl) { voiceEl.currentTime = 0; voiceEl.play().catch(() => {}); }
  if (musicEl) { musicEl.currentTime = 0; musicEl.play().catch(() => {}); }
  rec.start(100);

  return new Promise((resolve, reject) => {
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      if (onProgress) onProgress(Math.min(1, elapsed / duration));
      if (elapsed < duration) requestAnimationFrame(tick);
      else if (rec.state !== 'inactive') rec.stop();
    };
    requestAnimationFrame(tick);

    const cleanup = () => {
      renderer.pause();
      renderer.setSpeed(prevSpeed);
      if (voiceEl) voiceEl.pause();
      if (musicEl) musicEl.pause();
      if (audioCtx) audioCtx.close().catch(() => {});
    };
    rec.onstop = () => { cleanup(); resolve(new Blob(chunks, { type: mimeType.split(';')[0] })); };
    rec.onerror = (e) => { cleanup(); reject(e); };
  });
}

function loadGifJs() {
  return new Promise((resolve, reject) => {
    if (window.GIF) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load GIF encoder'));
    document.head.appendChild(s);
  });
}

export async function exportGif(renderer, { duration, onProgress }) {
  await loadGifJs();
  const fps = 15;
  const scaleW = 480;
  const scaleH = Math.round((renderer.H / renderer.W) * scaleW);
  const off = document.createElement('canvas');
  off.width = scaleW;
  off.height = scaleH;
  const octx = off.getContext('2d');

  const gif = new window.GIF({
    workers: 1,
    quality: 10,
    width: scaleW,
    height: scaleH,
    workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
  });

  const frames = Math.max(1, Math.ceil(duration * fps));
  const wasPlaying = renderer.playing;
  if (wasPlaying) renderer.pause();

  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    renderer.renderFrameAt(t);
    octx.drawImage(renderer.canvas, 0, 0, scaleW, scaleH);
    gif.addFrame(off, { copy: true, delay: Math.round(1000 / fps) });
    if (onProgress) onProgress((i / frames) * 0.6);
  }

  if (wasPlaying) renderer.play();

  return new Promise((resolve, reject) => {
    gif.on('progress', (p) => onProgress && onProgress(0.6 + p * 0.4));
    gif.on('finished', (blob) => resolve(blob));
    gif.on('abort', reject);
    gif.render();
  });
}

export async function copyVideoToClipboard(renderer, { duration, onProgress, audioUrl, musicUrl, musicVolume, duck }) {
  const blob = await recordVideo(renderer, { duration, onProgress, audioUrl, musicUrl, musicVolume, duck });
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      return true;
    }
  } catch (e) {
    // fall through to download fallback
  }
  downloadBlob(blob, 'popup-video.' + (blob.type.includes('mp4') ? 'mp4' : 'webm'));
  return false;
}