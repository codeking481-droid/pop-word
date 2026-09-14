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
  return 'video/webm';
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

export async function recordVideo(renderer, { duration, onProgress }) {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video recording is not supported by this browser');
  }

  const stream = renderer.canvas.captureStream(30);
  const mimeType = pickVideoMime();
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };

  const previousSpeed = renderer.speed;
  renderer.setSpeed(1);
  renderer.seek(0);
  renderer.play();
  recorder.start(100);

  return new Promise((resolve, reject) => {
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      onProgress?.(Math.min(1, elapsed / duration));
      if (elapsed < duration) requestAnimationFrame(tick);
      else if (recorder.state !== 'inactive') recorder.stop();
    };
    requestAnimationFrame(tick);

    const cleanup = () => {
      renderer.pause();
      renderer.setSpeed(previousSpeed);
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.onstop = () => {
      cleanup();
      resolve(new Blob(chunks, { type: mimeType.split(';')[0] }));
    };
    recorder.onerror = (event) => {
      cleanup();
      reject(event.error || new Error('Video recording failed'));
    };
  });
}
