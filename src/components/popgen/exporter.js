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

export function pickMp4Mime() {
  const types = [
    'video/mp4;codecs=h264',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
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

export async function recordVideo(renderer, { duration, onProgress, transparentBg = false, greenScreen = false }) {
  if (typeof MediaRecorder === 'undefined' || !renderer?.canvas?.captureStream) {
    throw new Error('Video recording is not supported by this browser');
  }

  const transparentMime = 'video/webm;codecs=vp9';
  if (transparentBg && !MediaRecorder.isTypeSupported(transparentMime)) {
    throw new Error('Transparent export requires a browser with VP9 WebM alpha support. Please use the latest Chrome or Edge.');
  }
  const mimeType = transparentBg ? transparentMime : greenScreen ? pickMp4Mime() : pickVideoMime();
  if (greenScreen && !mimeType) {
    throw new Error('Green Screen requires H.264 MP4 recording. This browser does not support it; try Safari, Chrome, or Edge on a device with MP4 recording enabled.');
  }
  if (!mimeType) throw new Error('This browser cannot encode a supported video format');
  const requestedDuration = Number(duration);
  // Mobile editors can read a short alpha WebM as a sub-second file when the
  // encoder has little duration metadata. A five-second floor plus regular
  // chunks gives the container reliable timestamps.
  const safeDuration = transparentBg || greenScreen ? Math.max(5, requestedDuration) : requestedDuration;
  if (!Number.isFinite(safeDuration) || safeDuration <= 0) throw new Error('Nothing to export');

  const stream = renderer.canvas.captureStream(30);
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error('This browser cannot start video recording');
  }
  if (transparentBg && !recorder.mimeType.toLowerCase().includes('video/webm')) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error('Transparent export requires a VP9 WebM recorder. No file was downloaded because this browser returned a non-transparent format.');
  }
  if (greenScreen && !recorder.mimeType.toLowerCase().includes('video/mp4')) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error('Green Screen requires H.264 MP4 recording. This browser selected a different format, so no file was downloaded.');
  }
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };

  const previousSpeed = renderer.speed;
  const previousTime = renderer.currentTime;
  const wasPlaying = renderer.playing;
  const previousExportBackground = renderer.options?.exportBackground;
  const previousTransparentBg = renderer.options?.transparentBg;
  renderer.setOptions({
    exportBackground: greenScreen ? 'green' : null,
    transparentBg,
  });
  renderer.setSpeed(1);
  renderer.seek(0);
  renderer.play();
  try {
    recorder.start(250);
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
      renderer.setOptions({ exportBackground: previousExportBackground || null });
      renderer.setOptions({ transparentBg: previousTransparentBg });
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
      if (elapsed < safeDuration + 0.25 && !settled) frame = requestAnimationFrame(tick);
      else if (recorder.state !== 'inactive') {
        recorder.requestData?.();
        recorder.stop();
      }
    };
    frame = requestAnimationFrame(tick);
    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
    };
    recorder.onerror = (event) => fail(event.error || new Error('Video recording failed'));
  });
}
