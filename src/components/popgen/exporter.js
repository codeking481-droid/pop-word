// Client-side video export. No network requests or external assets.

export function pickVideoMime() {
  const types = [
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function recordVideo(renderer, { duration, onProgress, transparentBg = false }) {
  if (typeof MediaRecorder === 'undefined' || !renderer?.canvas?.captureStream) {
    throw new Error('Video recording is not supported by this browser');
  }

  const transparentMime = 'video/webm;codecs=vp9';
  const mimeType = transparentBg && MediaRecorder.isTypeSupported(transparentMime)
    ? transparentMime
    : transparentBg && MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : pickVideoMime();
  if (!mimeType) throw new Error('This browser cannot encode a supported video format');
  const requestedDuration = Number(duration);
  const safeDuration = transparentBg ? Math.max(2, requestedDuration) : requestedDuration;
  if (!Number.isFinite(safeDuration) || safeDuration <= 0) throw new Error('Nothing to export');

  const stream = renderer.canvas.captureStream(30);
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error('This browser cannot start video recording');
  }
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };

  const previousSpeed = renderer.speed;
  const previousTime = renderer.currentTime;
  const wasPlaying = renderer.playing;
  renderer.setSpeed(1);
  renderer.seek(0);
  renderer.play();
  try {
    recorder.start(100);
  } catch {
    renderer.pause();
    renderer.setSpeed(previousSpeed);
    renderer.seek(previousTime);
    if (wasPlaying) renderer.play();
    stream.getTracks().forEach((track) => track.stop());
    throw new Error('This browser cannot start video recording');
  }

  return new Promise((resolve, reject) => {
    const start = performance.now();
    let settled = false;
    let frame = null;
    const cleanup = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      renderer.pause();
      renderer.setSpeed(previousSpeed);
      renderer.seek(previousTime);
      if (wasPlaying) renderer.play();
      stream.getTracks().forEach((track) => track.stop());
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error('Video recording failed'));
    };
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      onProgress?.(Math.min(1, elapsed / safeDuration));
      if (elapsed < safeDuration && !settled) frame = requestAnimationFrame(tick);
      else if (recorder.state !== 'inactive') recorder.stop();
    };
    frame = requestAnimationFrame(tick);
    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(new Blob(chunks, { type: mimeType.split(';')[0] }));
    };
    recorder.onerror = (event) => fail(event.error || new Error('Video recording failed'));
  });
}
