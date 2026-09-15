// PopRenderer — canvas engine: backgrounds + word-by-word captions.
// POP + CAPTION modes, hook/CTA engine, auto money/negative keyword styles,
// emoji pop, auto-zoom, brand logo, watermark. Offline, no API.
import { EMOJI_MAP } from './data/emojiMap';
import { wordCategory } from './data/keywordStyles';

const ASPECTS = {
  '9:16': { W: 1080, H: 1920 },
  '16:9': { W: 1920, H: 1080 },
  '1:1': { W: 1080, H: 1080 },
  '4:5': { W: 1080, H: 1350 },
};

const KEYWORDS = new Set([
  'money', 'cash', 'rich', 'wealth', 'million', 'free', 'secret', 'now', 'today', 'you', 'your',
  'win', 'success', 'fire', 'viral', 'views', 'traffic', 'sales', 'growth', 'scale', 'build',
  'make', 'earn', 'invest', 'crypto', 'hustle', 'boss', 'freedom', 'luxury', 'dream', 'goal',
  'action', 'start', 'stop', 'never', 'always', 'best', 'top', 'first', 'new', 'pro', 'hack',
]);

export default class PopRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.options = options;
    this.speed = 1;
    this.playing = false;
    this.raf = null;
    this.lastFrameTime = 0;
    this.startTime = 0;
    this.pausedAt = 0;
    this.customMedia = null;
    this._mediaLoadHandler = null;
    this.bgImage = null;
    this.brandLogoImg = null;
    this._lastIdx = -1;
    this._wordsKey = null;
    this._wordsCache = [];
    this._flowLayoutKey = null;
    this._flowLayout = null;
    this._watchedImages = new WeakSet();
    this.flowParticles = this._initStars(90);

    this._applyAspect(options.aspect || '9:16');
    this.stars = this._initStars(200);
    this.onTimeUpdate = options.onTimeUpdate || null;
  }

  _applyAspect(aspect) {
    const dim = ASPECTS[aspect] || ASPECTS['9:16'];
    this.aspect = aspect;
    this.W = dim.W;
    this.H = dim.H;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
  }

  _initStars(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        x: Math.random(), y: Math.random(),
        size: Math.random() * 2.4 + 0.4, speed: Math.random() * 0.06 + 0.015,
        alpha: Math.random() * 0.5 + 0.5, phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }

  setOptions(opts) {
    const previous = this.options;
    const aspectChanged = opts.aspect && opts.aspect !== this.aspect;
    const contentChanged = opts.script !== previous.script
      || opts.uppercase !== previous.uppercase
      || opts.template !== previous.template
      || opts.mode !== previous.mode
      || opts.flowSentence !== previous.flowSentence
      || opts.minimalCards !== previous.minimalCards;
    this.options = { ...this.options, ...opts };
    if (opts.onTimeUpdate) this.onTimeUpdate = opts.onTimeUpdate;
    if (contentChanged) {
      this._wordsKey = null;
      this._wordsCache = [];
      this._lastIdx = -1;
    }
    if (opts.flowSentence !== previous.flowSentence || aspectChanged) {
      this._flowLayoutKey = null;
      this._flowLayout = null;
    }
    if (aspectChanged) {
      this._applyAspect(ASPECTS[opts.aspect] ? opts.aspect : '9:16');
    }
    if (!this.playing) {
      this._draw(this.pausedAt);
      if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime, this.getDuration());
    }
  }

  setCustomMedia(media) {
    if (media !== this.customMedia && this.customMedia?.tagName === 'VIDEO') {
      this.customMedia.pause();
    }
    if (this.customMedia && this._mediaLoadHandler) {
      this.customMedia.removeEventListener('loadeddata', this._mediaLoadHandler);
      this.customMedia.removeEventListener('load', this._mediaLoadHandler);
    }
    this.customMedia = media;
    if (media && typeof media.addEventListener === 'function') {
      this._mediaLoadHandler = () => { if (!this.playing) this._draw(this.currentTime); };
      media.addEventListener('loadeddata', this._mediaLoadHandler, { once: true });
      media.addEventListener('load', this._mediaLoadHandler, { once: true });
    }
    if (!this.playing) {
      this._draw(this.currentTime);
      if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime, this.getDuration());
    }
  }

  getWords() {
    const text = (this.options.script || '').trim();
    const key = (this.options.uppercase ? 'U' : 'u') + '|' + text;
    if (this._wordsKey === key) return this._wordsCache;
    let words = text ? text.split(/\s+/).filter(Boolean) : [];
    if (this.options.uppercase) words = words.map((w) => w.toUpperCase());
    this._wordsKey = key;
    this._wordsCache = words;
    return words;
  }

  getDuration() {
    const template = this.options.template || this.options.mode;
    if (template === 'minimal') return Math.max(4, Math.min(60, (this.options.minimalCards || []).length * 0.8 + 2));
    if (template === 'flow') {
      const sentence = (this.options.flowSentence || this.options.script || '').trim();
      return Math.max(4, Math.min(60, sentence.length * 0.075 + 2));
    }
    const dur = Number.isFinite(Number(this.options.wordDuration)) ? Math.max(0.05, Number(this.options.wordDuration)) : 0.4;
    let d = this.getWords().length * dur;
    if (this.options.ctaEnabled && this.options.ctaText) d += 2;
    return Math.min(600, d);
  }

  hasContent() {
    const template = this.options.template || this.options.mode;
    if (template === 'minimal') return (this.options.minimalCards || []).length > 0;
    if (template === 'flow') return Boolean(String(this.options.flowSentence || this.options.script || '').trim());
    return this.getWords().length > 0;
  }

  get currentTime() {
    return this.playing ? ((performance.now() - this.startTime) / 1000) * this.speed : this.pausedAt;
  }

  play() {
    if (this.playing) return;
    if (this.customMedia && this.customMedia.tagName === 'VIDEO') this.customMedia.play().catch(() => {});
    this.playing = true;
    this.lastFrameTime = 0;
    this.startTime = performance.now() - (this.pausedAt * 1000) / this.speed;
    this._loop();
  }

  pause() {
    if (!this.playing) return;
    const current = this.currentTime;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.pausedAt = current;
    if (this.customMedia && this.customMedia.tagName === 'VIDEO') this.customMedia.pause();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  seek(t) {
    const dur = this.getDuration();
    const next = Number.isFinite(Number(t)) ? Math.max(0, Number(t)) : 0;
    const position = dur > 0 && next >= dur ? 0 : next;
    this.pausedAt = position;
    if (this.playing) this.startTime = performance.now() - (position * 1000) / this.speed;
    this._draw(position);
    if (this.onTimeUpdate) this.onTimeUpdate(position, dur);
  }

  setSpeed(s) {
    const cur = this.currentTime;
    this.speed = s;
    if (this.playing) this.startTime = performance.now() - (cur * 1000) / s;
  }

  renderFrameAt(t) { this._draw(t); }

  destroy() {
    this.pause();
    this.raf = null;
    this.onTimeUpdate = null;
    if (this.customMedia && this._mediaLoadHandler) {
      this.customMedia.removeEventListener('loadeddata', this._mediaLoadHandler);
      this.customMedia.removeEventListener('load', this._mediaLoadHandler);
    }
    this.customMedia = null;
    this._mediaLoadHandler = null;
    this.bgImage = null;
    this.brandLogoImg = null;
  }

  _isKey(word) {
    const w = (word || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!w) return false;
    if (KEYWORDS.has(w)) return true;
    if (this.options.autoHighlight && w.length >= 6) return true;
    return false;
  }

  _loop = () => {
    if (!this.playing) return;
    const now = performance.now();
    if (this.lastFrameTime && now - this.lastFrameTime < 33) {
      this.raf = requestAnimationFrame(this._loop);
      return;
    }
    this.lastFrameTime = now;
    let t = this.currentTime;
    const dur = this.getDuration();
    if (dur > 0 && t >= dur) { t = 0; this.startTime = performance.now(); this.pausedAt = 0; }
    this._draw(t);
    if (this.onTimeUpdate) this.onTimeUpdate(t, dur);
    this.raf = requestAnimationFrame(this._loop);
  };

  _zoomFactor(t) {
    if (!this.options.autoZoom) return 1;
    const words = this.getWords();
    if (!words.length) return 1;
    const dur = this.options.wordDuration || 0.4;
    const total = words.length * dur;
    if (t >= total) return 1;
    const tt = total > 0 ? t % total : 0;
    const idx = Math.min(words.length - 1, Math.floor(tt / dur));
    const localT = tt - idx * dur;
    const p = dur > 0 ? localT / dur : 1;
    if (!this._isKey(words[idx]) && !wordCategory(words[idx])) return 1;
    return 1 + Math.sin(p * Math.PI) * 0.15;
  }

  _draw(t) {
    const zoom = this._zoomFactor(t);
    const { ctx, W, H } = this;
    const template = this.options.template || this.options.mode;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    if (this.options.transparentBg) ctx.clearRect(0, 0, W, H);
    if (zoom !== 1) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
    }
    if (template === 'minimal') {
      this._renderMinimal(t);
    } else if (template === 'flow') {
      this._renderFlow(t);
    } else {
      this._drawBackground(t);
      if (this.options.mode === 'caption') this._renderCaptionMode(t);
      else this._drawWord(t);
    }
    if (this.options.showProgressbar) this._drawProgressBar(t);
    if (zoom !== 1) ctx.restore();
    if (this.options.brandEnabled) this._drawLogo();
    if (this.options.watermark) this._drawWatermark();
  }

  _drawMinimalBackground() {
    const { ctx, W, H } = this;
    if (this.options.transparentBg) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f2f4f7';
    ctx.beginPath();
    ctx.moveTo(W * 0.51, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.43, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(17,24,39,0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W * 0.51, 0);
    ctx.lineTo(W * 0.43, H);
    ctx.stroke();
  }

  _drawCardText(text, x, y, maxW, fontSize, color = '#111827') {
    const { ctx } = this;
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxW && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineH = fontSize * 1.18;
    lines.slice(0, 5).forEach((value, index) => ctx.fillText(value, x, y + (index - (Math.min(lines.length, 5) - 1) / 2) * lineH));
  }

  _renderMinimal(t) {
    const { ctx, W, H, options } = this;
    this._drawMinimalBackground();
    const cards = (options.minimalCards || []).slice(0, 12);
    const layout = options.minimalLayout || 'scatter';
    const style = options.minimalStyle || 'liquid';
    const cols = layout === 'grid' ? Math.min(3, Math.max(1, Math.ceil(Math.sqrt(Math.max(cards.length, 1))))) : 1;
    const rows = layout === 'grid' ? Math.ceil(Math.max(cards.length, 1) / cols) : 1;
    cards.forEach((card, index) => {
      const col = layout === 'grid' ? index % cols : 0;
      const row = layout === 'grid' ? Math.floor(index / cols) : 0;
      const baseX = layout === 'grid' ? W * (0.16 + (col / Math.max(cols - 1, 1)) * 0.68) : W * (0.22 + ((index * 0.37) % 0.56));
      const baseY = layout === 'grid' ? H * (0.27 + (row / Math.max(rows - 1, 1)) * 0.48) : H * (0.2 + ((index * 0.29) % 0.6));
      const float = layout === 'floating' ? Math.sin(t * 1.5 + index) * H * 0.018 : Math.sin(t * 1.1 + index) * H * 0.008;
      const driftX = layout === 'scatter' ? Math.sin(t * 0.7 + index * 1.7) * W * 0.025 : 0;
      const rotation = layout === 'grid' ? 0 : (Math.sin(index * 4.2) * 0.055 + Math.sin(t * 0.8 + index) * 0.012);
      const cw = Math.min(W * 0.62, layout === 'grid' ? W * 0.27 : W * 0.48);
      const ch = card.type === 'image' ? cw * 0.82 : Math.min(H * 0.2, cw * 0.58);
      const x = Math.max(cw / 2 + 18, Math.min(W - cw / 2 - 18, baseX + driftX));
      const y = Math.max(ch / 2 + 24, Math.min(H - ch / 2 - 24, baseY + float));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      if (style === 'liquid') {
        ctx.shadowColor = 'rgba(15,23,42,0.18)';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 12;
      } else {
        ctx.shadowColor = 'rgba(15,23,42,0.22)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 6;
      }
      this._roundRect(-cw / 2, -ch / 2, cw, ch, style === 'liquid' ? 30 : 18);
      ctx.fillStyle = style === 'liquid' ? 'rgba(255,255,255,0.78)' : '#ffffff';
      ctx.fill();
      ctx.shadowBlur = 0;
      if (card.type === 'image' && card.image) {
        if (!card.image.complete && typeof card.image.addEventListener === 'function' && !this._watchedImages.has(card.image)) {
          this._watchedImages.add(card.image);
          card.image.addEventListener('loadeddata', () => { if (!this.playing) this._draw(this.currentTime); }, { once: true });
          card.image.addEventListener('load', () => { if (!this.playing) this._draw(this.currentTime); }, { once: true });
        }
        const iw = card.image.videoWidth || card.image.naturalWidth || card.image.width;
        const ih = card.image.videoHeight || card.image.naturalHeight || card.image.height;
        if (iw && ih) {
          const scale = Math.max(cw / iw, ch / ih);
          const dw = iw * scale;
          const dh = ih * scale;
          ctx.save();
          this._roundRect(-cw / 2 + 7, -ch / 2 + 7, cw - 14, ch - 14, style === 'liquid' ? 24 : 12);
          ctx.clip();
          ctx.drawImage(card.image, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        }
      } else {
        this._drawCardText(card.text || 'Add a card', 0, 0, cw * 0.82, Math.min(42, cw * 0.12));
      }
      ctx.restore();
    });

    const number = options.minimalNumber ?? 12;
    if (options.minimalShowNumber !== false) {
      const pulse = options.minimalAnimateNumber === false ? 1 : 1 + Math.sin(t * 3) * 0.06;
      ctx.save();
      ctx.translate(W * 0.14, H * 0.12);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#111827';
      ctx.font = `900 ${Math.min(W, H) * 0.12}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(number), 0, 0);
      ctx.font = `700 ${Math.min(W, H) * 0.026}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(17,24,39,0.55)';
      ctx.fillText('IDEAS', 0, Math.min(W, H) * 0.085);
      ctx.restore();
    }
    const bullets = String(options.minimalBullets || '').split(/\n/).map((item) => item.trim()).filter(Boolean).slice(0, 5);
    if (bullets.length) {
      ctx.save();
      ctx.fillStyle = '#111827';
      ctx.font = `700 ${Math.min(W, H) * 0.033}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      bullets.forEach((bullet, index) => {
        const yy = H * 0.78 + index * Math.min(W, H) * 0.052;
        ctx.fillStyle = '#00a94f';
        ctx.beginPath(); ctx.arc(W * 0.1, yy, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.fillText(bullet, W * 0.13, yy);
      });
      ctx.restore();
    }
  }

  _renderFlow(t) {
    const { ctx, W, H, options } = this;
    if (!options.transparentBg) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#090b25'); grad.addColorStop(0.52, '#172554'); grad.addColorStop(1, '#111827');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }
    const height = Math.max(20, Math.min(H * 0.18, Number(options.flowWaveHeight) || H * 0.09));
    const speed = Math.max(0.05, Math.min(6, Number(options.flowWaveSpeed) || 1));
    const frequency = Math.max(0.2, Math.min(8, Number(options.flowWaveFrequency) || 2.2));
    const centerY = H * 0.57;
    const waveY = (x) => centerY + Math.sin(x / W * Math.PI * frequency + t * speed) * height;
    for (const particle of this.flowParticles) {
      const x = ((particle.x + t * particle.speed * 0.04) % 1) * W;
      const y = waveY(x) + (particle.y - 0.5) * H * 0.45;
      ctx.fillStyle = `rgba(255,255,255,${0.18 + particle.alpha * 0.42})`;
      ctx.beginPath(); ctx.arc(x, y, particle.size * 1.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.lineWidth = Math.max(5, H * 0.006);
    ctx.strokeStyle = 'rgba(125,211,252,0.42)';
    ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 30;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) {
      const y = waveY(x);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();

    const sentence = String(options.flowSentence || options.script || 'Ride the wave').trim() || 'Ride the wave';
    const chars = [...sentence];
    const layoutKey = `${sentence}|${W}|${H}`;
    if (this._flowLayoutKey !== layoutKey) {
      const requestedFontSize = Math.min(W, H) * 0.105;
      ctx.font = `900 ${requestedFontSize}px ui-sans-serif, system-ui, sans-serif`;
      const requestedWidths = chars.map((char) => ctx.measureText(char).width);
      const requestedTotal = requestedWidths.reduce((sum, value) => sum + value, 0);
      const fontSize = requestedTotal > W * 0.88
        ? requestedFontSize * (W * 0.88 / requestedTotal)
        : requestedFontSize;
      ctx.font = `900 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      this._flowLayout = { fontSize, widths: chars.map((char) => ctx.measureText(char).width) };
      this._flowLayoutKey = layoutKey;
    }
    const { fontSize, widths: fittedWidths } = this._flowLayout;
    ctx.font = `900 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    const total = fittedWidths.reduce((sum, value) => sum + value, 0);
    let x = (W - total) / 2;
    chars.forEach((char, index) => {
      const cx = x + fittedWidths[index] / 2;
      const y = waveY(cx) - fontSize * 0.22;
      ctx.save();
      ctx.translate(cx, y);
      ctx.rotate(Math.cos(cx / W * Math.PI * frequency + t * speed) * 0.12);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `hsl(${(index * 28 + t * 70) % 360} 95% 68%)`;
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 18;
      ctx.fillText(char, 0, 0);
      ctx.restore();
      x += fittedWidths[index];
    });
    const message = String(options.flowMessage || '').trim();
    if (message && options.flowArrows !== false) {
      ctx.save();
      ctx.font = `800 ${Math.min(W, H) * 0.035}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const pulse = 0.75 + Math.sin(t * 4) * 0.25;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(message, W / 2, H * 0.2);
      ctx.strokeStyle = '#facc15'; ctx.fillStyle = '#facc15'; ctx.lineWidth = 8;
      const arrowY = H * 0.26;
      ctx.beginPath(); ctx.moveTo(W * 0.24, arrowY); ctx.lineTo(W * 0.76, arrowY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W * 0.76, arrowY); ctx.lineTo(W * 0.7, arrowY - 24); ctx.lineTo(W * 0.7, arrowY + 24); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  _drawLogo() {
    if (!this.options.brandLogo) return;
    if (!this._isLocalAsset(this.options.brandLogo)) return;
    if (!this.brandLogoImg || this.brandLogoImg.src !== this.options.brandLogo) {
      const img = new Image();
      img.onload = () => { if (!this.playing) this._draw(this.currentTime); };
      img.src = this.options.brandLogo;
      this.brandLogoImg = img;
    }
    if (this.brandLogoImg.complete && this.brandLogoImg.naturalWidth) {
      const { ctx, W, H } = this;
      const lw = W * 0.14;
      const scale = lw / this.brandLogoImg.naturalWidth;
      const lh = this.brandLogoImg.naturalHeight * scale;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(this.brandLogoImg, W - lw - W * 0.04, H - lh - H * 0.05, lw, lh);
      ctx.globalAlpha = 1;
    }
  }

  _drawWatermark() {
    const { ctx, W, H } = this;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 28px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('PopWord · $1 Suite', W - 34, H - 34);
    ctx.restore();
  }

  _drawProgressBar(t) {
    const { ctx, W, H, options } = this;
    const dur = this.getDuration();
    const frac = dur > 0 ? (t % dur) / dur : 0;
    const barH = Math.max(8, H * 0.012);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, 0, W, barH);
    ctx.fillStyle = options.textColor || '#00FF62';
    ctx.shadowColor = options.textColor || '#00FF62';
    ctx.shadowBlur = 12;
    ctx.fillRect(0, 0, W * frac, barH);
    ctx.shadowBlur = 0;
  }

  _drawBackground(t) {
    const { ctx, W, H, options } = this;
    if (options.transparentBg) return;
    const type = options.background || 'stars';

    if (type === 'custom' && this.customMedia) {
      this._drawMediaCover(this.customMedia);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, H);
      return;
    }
    if (type === 'black') { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); return; }
    if (type === 'solid') { ctx.fillStyle = options.bgColor || '#000000'; ctx.fillRect(0, 0, W, H); return; }
    if (type === 'gradient') {
      const cols = options.gradientColors || ['#1a0b3e', '#0a0118'];
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1] || cols[0]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      return;
    }
    if (type === 'image') {
      if (this._isLocalAsset(options.bgImage) && (!this.bgImage || this.bgImage.src !== options.bgImage)) {
        const img = new Image();
        img.onload = () => { if (!this.playing) this._draw(this.currentTime); };
        img.src = options.bgImage;
        this.bgImage = img;
      }
      if (this._isLocalAsset(options.bgImage) && this.bgImage?.complete && this.bgImage.naturalWidth) this._drawMediaCover(this.bgImage);
      else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
      return;
    }
    if (type === 'galaxy') {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#1a0b3e'); g.addColorStop(0.5, '#3d0b5e'); g.addColorStop(1, '#0a0118');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const rg = ctx.createRadialGradient(W * 0.3, H * 0.35, 0, W * 0.3, H * 0.35, Math.max(W, H) * 0.7);
      rg.addColorStop(0, 'rgba(180,80,255,0.25)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      this._drawStars(t, 0.85);
      return;
    }
    if (type === 'grid') {
      ctx.fillStyle = '#070707'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(0,255,98,0.18)'; ctx.lineWidth = 2;
      const step = 90; const off = (t * 40) % step;
      ctx.beginPath();
      for (let x = -step + off; x < W + step; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = -step + off; y < H + step; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
      rg.addColorStop(0, 'rgba(0,255,98,0.10)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      return;
    }
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
    this._drawStars(t, 1);
  }

  _drawStars(t, alphaMul) {
    const { ctx, W, H } = this;
    for (const s of this.stars) {
      const yPosition = (s.y - t * s.speed * 0.01) % 1;
      const x = s.x * W; const y = (yPosition < 0 ? yPosition + 1 : yPosition) * H;
      const twinkle = 0.55 + Math.sin(t * 2 + s.phase) * 0.45;
      ctx.fillStyle = `rgba(255,255,255,${s.alpha * twinkle * alphaMul})`;
      ctx.beginPath(); ctx.arc(x, y, s.size, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawMediaCover(media) {
    const { ctx, W, H } = this;
    const mw = media.videoWidth || media.naturalWidth || media.width;
    const mh = media.videoHeight || media.naturalHeight || media.height;
    if (!mw || !mh) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
    const scale = Math.max(W / mw, H / mh);
    const dw = mw * scale; const dh = mh * scale;
    ctx.drawImage(media, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  _isLocalAsset(src) {
    return typeof src === 'string' && (src.startsWith('blob:') || src.startsWith('data:'));
  }

  _drawWord(t) {
    const words = this.getWords();
    const dur = this.options.wordDuration || 0.4;
    const wordsDur = words.length * dur;

    if (this.options.ctaEnabled && this.options.ctaText && t >= wordsDur) {
      this._renderCTA(t - wordsDur);
      return;
    }
    if (!words.length) { this._drawHint(); return; }

    let tt = wordsDur > 0 ? t % wordsDur : 0;
    const idx = Math.min(words.length - 1, Math.floor(tt / dur));
    const localT = tt - idx * dur;
    const progress = dur > 0 ? localT / dur : 1;

    const cat = this.options.autoKeywordStyles ? wordCategory(words[idx]) : null;
    const isHook = this.options.hookBoost && idx < 3;
    if (this.playing && idx !== this._lastIdx) {
      this._lastIdx = idx;
      if (this.options.onPop) this.options.onPop(words[idx], { hook: isHook && idx === 0, money: cat === 'money', negative: cat === 'negative' });
    }

    this._renderWord(words[idx], progress, idx, words.length, cat, isHook);
  }

  _transform(anim, progress) {
    const popMax = this.options.popScale || 1.2;
    const popScale = (p) => {
      if (p < 0.22) return 0.5 + (popMax - 0.5) * (p / 0.22);
      if (p < 0.4) return popMax - (popMax - 1.0) * ((p - 0.22) / 0.18);
      return 1.0;
    };
    let scale = 1, x = 0, y = 0, rot = 0, glow = 26, alpha = 1;
    switch (anim) {
      case 'Pop': scale = popScale(progress); break;
      case 'Glow Pop': scale = popScale(progress); glow = 20 + (Math.sin(progress * Math.PI * 3) + 1) * 18; break;
      case 'Bounce': y = -Math.sin(progress * Math.PI) * 80; break;
      case 'Slide Up':
        if (progress < 0.3) { y = (1 - progress / 0.3) * 150; alpha = progress / 0.3; }
        break;
      case 'Fade Up':
        if (progress < 0.35) { y = (1 - progress / 0.35) * 90; alpha = progress / 0.35; }
        break;
      case 'Shake':
        scale = popScale(progress);
        x = Math.sin(progress * Math.PI * 18) * 12 * (1 - progress);
        rot = Math.sin(progress * Math.PI * 22) * 0.04 * (1 - progress);
        break;
      case 'Neon Flicker':
        scale = popScale(progress);
        glow = 28 + Math.sin(progress * Math.PI * 5) * 14;
        if (progress < 0.18) alpha = Math.floor(progress * 120) % 2 ? 0.35 : 1;
        else alpha = 0.82 + Math.sin(progress * 40) * 0.18;
        break;
      case 'Sticker Pop': scale = popScale(progress); rot = Math.sin(progress * Math.PI * 2) * 0.08 * (1 - progress); break;
      case 'Scale Shadow': scale = popScale(progress); glow = 40; break;
      default: scale = popScale(progress);
    }
    glow *= (this.options.shadowIntensity ?? 1);
    return { scale, x, y, rot, glow, alpha };
  }

  _fontString(weight, size, family) { return `${weight} ${size}px ${family}`; }

  _roundRect(x, y, w, h, r) {
    const { ctx } = this;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  _drawEmoji(word, fontSize, force) {
    const e = force || (this.options.emojiPop ? EMOJI_MAP[(word || '').toLowerCase().replace(/[^a-z0-9]/g, '')] : null);
    if (!e) return;
    const { ctx } = this;
    ctx.shadowBlur = 0;
    ctx.font = `${Math.round(fontSize * 0.95)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e, 0, -fontSize * 1.05);
  }

  _renderWord(word, progress, idx, total, cat, isHook) {
    const { ctx, W, H, options } = this;
    const baseColor = options.textColor || '#00FF62';
    const font = options.font || 'Bold';
    let anim = options.animation || 'Pop';
    let color = (options.autoHighlight && this._isKey(word)) ? options.highlightColor || '#FFD700' : baseColor;
    let scaleMul = 1;
    let forceEmoji = null;

    if (cat === 'money') { color = '#FFD700'; scaleMul = 1.4; forceEmoji = '💰'; }
    if (cat === 'negative') { color = '#FF3B3B'; anim = 'Shake'; }
    if (isHook) { color = '#FFD700'; scaleMul *= 1.25; }

    const family = font === 'Anton' ? "'Anton', sans-serif" : 'ui-sans-serif, system-ui, sans-serif';
    const weight = font === 'Extra Bold' ? '900' : font === 'Anton' ? '400' : '700';
    const base = Math.min(W, H) * (font === 'Anton' ? 0.15 : 0.135);
    let fontSize = base;
    const maxW = W * 0.86;
    ctx.font = this._fontString(weight, fontSize, family);
    if (ctx.measureText(word).width > maxW) {
      fontSize = (fontSize * maxW) / ctx.measureText(word).width;
      ctx.font = this._fontString(weight, fontSize, family);
    }

    const tr = this._transform(anim, progress);
    tr.scale *= scaleMul;

    if (['Green Box', 'Word Highlight', 'Caption Style'].includes(anim)) {
      this._renderBox(word, fontSize, color, tr, anim);
      this._drawCounter(idx, total);
      return;
    }
    if (anim === 'Yellow Stroke') { this._renderStroke(word, fontSize, color, tr, forceEmoji); this._drawCounter(idx, total); return; }
    if (anim === 'Scale Shadow') { this._renderScaleShadow(word, fontSize, color, tr, forceEmoji); this._drawCounter(idx, total); return; }

    ctx.save();
    ctx.translate(W / 2 + tr.x, H / 2 + tr.y);
    ctx.scale(tr.scale, tr.scale);
    ctx.rotate(tr.rot);
    ctx.globalAlpha = tr.alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = color;

    this._drawEmoji(word, fontSize, forceEmoji);

    if (anim === 'Typewriter') this._renderTypewriter(word, fontSize, color, tr.glow, progress);
    else if (anim === 'Wave') this._renderWave(word, fontSize, weight, family, color, tr.glow, progress);
    else if (anim === 'Glitch') this._renderGlitch(word, fontSize, color, progress);
    else if (anim === 'Karaoke') this._renderKaraoke(word, fontSize, color, tr.glow, progress);
    else if (anim === 'Shimmer') this._renderShimmer(word, fontSize, color, tr.glow, progress);
    else if (anim === 'Sticker Pop') this._renderSticker(word, fontSize, color, tr.glow);
    else {
      ctx.shadowBlur = tr.glow;
      ctx.fillText(word, 0, 0);
      ctx.shadowBlur = tr.glow * 1.8;
      ctx.fillText(word, 0, 0);
    }
    ctx.restore();
    this._drawCounter(idx, total);
  }

  _boxBg(anim) {
    const { options } = this;
    const brand = options.brandEnabled ? options.brandColor : null;
    if (anim === 'Caption Style') return 'rgba(0,0,0,0.8)';
    if (anim === 'Word Highlight') return brand || options.bgColor || '#00FF62';
    if (anim === 'Green Box') return brand || options.bgColor || '#00C853';
    return options.bgColor || '#00C853';
  }

  _renderBox(word, fontSize, color, tr, anim) {
    const { ctx, W, H, options } = this;
    ctx.font = this._fontString('900', fontSize, 'ui-sans-serif, system-ui, sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const padX = fontSize * 0.4, padY = fontSize * 0.24;
    const tw = ctx.measureText(word).width;
    const bw = tw + padX * 2, bh = fontSize + padY * 2;
    const radius = options.radius ?? 16;
    const bg = this._boxBg(anim);
    let textColor = color;
    let cx = W / 2, cy = H / 2;
    if (anim === 'Caption Style') { cy = H * 0.82; textColor = options.textColor || '#FFFFFF'; }
    if (anim === 'Word Highlight') textColor = '#0A0A0A';
    if (anim === 'Green Box') textColor = '#FFFFFF';

    ctx.save();
    ctx.translate(cx + tr.x, cy + tr.y);
    ctx.scale(tr.scale, tr.scale);
    ctx.rotate(tr.rot);
    ctx.globalAlpha = tr.alpha;
    this._roundRect(-bw / 2, -bh / 2, bw, bh, radius);
    ctx.fillStyle = bg; ctx.fill();
    this._drawEmoji(word, fontSize, null);
    ctx.fillStyle = textColor; ctx.shadowBlur = 0;
    ctx.fillText(word, 0, 0);
    ctx.restore();
  }

  _renderStroke(word, fontSize, color, tr, forceEmoji) {
    const { ctx, W, H } = this;
    ctx.save();
    ctx.translate(W / 2 + tr.x, H / 2 + tr.y);
    ctx.scale(tr.scale, tr.scale);
    ctx.rotate(tr.rot);
    ctx.globalAlpha = tr.alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = this._fontString('900', fontSize, 'ui-sans-serif, system-ui, sans-serif');
    this._drawEmoji(word, fontSize, forceEmoji);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(8, fontSize * 0.12);
    ctx.strokeStyle = '#0A0A0A';
    ctx.shadowBlur = 0;
    ctx.strokeText(word, 0, 0);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = tr.glow;
    ctx.fillText(word, 0, 0);
    ctx.restore();
  }

  _renderScaleShadow(word, fontSize, color, tr, forceEmoji) {
    const { ctx, W, H } = this;
    ctx.save();
    ctx.translate(W / 2 + tr.x, H / 2 + tr.y);
    ctx.scale(tr.scale, tr.scale);
    ctx.rotate(tr.rot);
    ctx.globalAlpha = tr.alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = this._fontString('900', fontSize, 'ui-sans-serif, system-ui, sans-serif');
    this._drawEmoji(word, fontSize, forceEmoji);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = fontSize * 0.06;
    ctx.shadowOffsetY = fontSize * 0.12;
    ctx.fillStyle = color;
    ctx.fillText(word, 0, 0);
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.restore();
  }

  _renderCTA(localT) {
    const { ctx, W, H, options } = this;
    const text = options.ctaText || 'Follow for Part 2';
    const p = Math.min(1, localT / 2);
    const bounce = -Math.abs(Math.sin(p * Math.PI * 3)) * 30;
    const fontSize = Math.min(W, H) * 0.11;
    ctx.save();
    ctx.translate(W / 2, H / 2 + bounce);
    ctx.font = this._fontString('900', fontSize, 'ui-sans-serif, system-ui, sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    const padX = fontSize * 0.4, padY = fontSize * 0.24;
    const bg = options.brandEnabled ? options.brandColor || '#00FF62' : '#00FF62';
    this._roundRect(-tw / 2 - padX, -fontSize / 2 - padY, tw + padX * 2, fontSize + padY * 2, options.radius ?? 16);
    ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = '#0A0A0A'; ctx.shadowBlur = 0;
    ctx.fillText(text, 0, 0);
    ctx.restore();
    this._drawCounter(this.getWords().length, this.getWords().length);
  }

  _wrapLines(words, maxW, fontSize, family) {
    const { ctx } = this;
    ctx.font = `700 ${fontSize}px ${family}`;
    const gap = fontSize * 0.3;
    const lines = [];
    let line = [], lineW = 0, start = 0;
    for (let i = 0; i < words.length; i++) {
      const ww = ctx.measureText(words[i]).width;
      const add = (line.length ? gap : 0) + ww;
      if (lineW + add > maxW && line.length) {
        lines.push({ words: line, start, end: start + line.length });
        start += line.length;
        line = [words[i]]; lineW = ww;
      } else {
        line.push(words[i]); lineW += add;
      }
    }
    if (line.length) lines.push({ words: line, start, end: start + line.length });
    return lines;
  }

  _renderCaptionMode(t) {
    const { ctx, W, H, options } = this;
    const words = this.getWords();
    if (!words.length) { this._drawHint(); return; }
    const dur = this.options.wordDuration || 0.4;
    const idx = Math.min(words.length - 1, Math.floor(t / dur));

    const fontSize = Math.min(W, H) * 0.065;
    const family = 'ui-sans-serif, system-ui, sans-serif';
    const maxW = W * 0.9;
    const lines = this._wrapLines(words, maxW, fontSize, family);

    let curLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (idx >= lines[i].start && idx < lines[i].end) { curLine = i; break; }
      if (idx >= lines[i].end) curLine = i;
    }
    const shown = [lines[curLine], lines[curLine + 1]].filter(Boolean);

    const lineH = fontSize * 1.5;
    const boxH = shown.length * lineH + fontSize * 0.6;
    const boxY = H - boxH - H * 0.05;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, boxY, W, boxH);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let lineY = boxY + fontSize * 0.9;
    for (const line of shown) {
      const widths = line.words.map((w) => {
        ctx.font = `700 ${fontSize}px ${family}`;
        return ctx.measureText(w).width;
      });
      const gap = fontSize * 0.3;
      const totalW = widths.reduce((a, b) => a + b, 0) + (line.words.length - 1) * gap;
      let x = (W - totalW) / 2;
      for (let i = 0; i < line.words.length; i++) {
        const globalIdx = line.start + i;
        const isCurrent = globalIdx === idx;
        if (isCurrent) {
          ctx.font = `900 ${fontSize * 1.15}px ${family}`;
          ctx.fillStyle = options.highlightColor || '#00FF62';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 18;
        } else {
          ctx.font = `700 ${fontSize}px ${family}`;
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowBlur = 0;
        }
        ctx.fillText(line.words[i], x, lineY);
        x += widths[i] + gap;
      }
      lineY += lineH;
    }
  }

  _renderTypewriter(word, fontSize, color, glow, progress) {
    const { ctx } = this;
    const reveal = Math.min(1, progress * 1.4);
    const chars = Math.max(1, Math.ceil(word.length * reveal));
    const shown = word.slice(0, chars);
    ctx.shadowBlur = glow;
    ctx.fillText(shown, 0, 0);
    if (progress < 0.95 && Math.floor(progress * 22) % 2 === 0) {
      const w = ctx.measureText(shown).width;
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.fillRect(w / 2 + 12, -fontSize * 0.42, 10, fontSize * 0.84);
    }
  }

  _renderWave(word, fontSize, weight, family, color, glow, progress) {
    const { ctx } = this;
    ctx.font = this._fontString(weight, fontSize, family);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const chars = [...word];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const totalW = widths.reduce((a, b) => a + b, 0);
    const amp = fontSize * 0.14;
    const intro = progress < 0.2 ? progress / 0.2 : 1;
    let x = -totalW / 2;
    for (let i = 0; i < chars.length; i++) {
      const yOff = -Math.sin(progress * Math.PI * 2 + i * 0.6) * amp * intro;
      ctx.fillText(chars[i], x, yOff);
      x += widths[i];
    }
  }

  _renderGlitch(word, fontSize, color, progress) {
    const { ctx } = this;
    const off = Math.sin(progress * Math.PI * 12) * fontSize * 0.06 * (1 - progress * 0.6);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,0,80,0.85)'; ctx.fillText(word, -off, 0);
    ctx.fillStyle = 'rgba(0,200,255,0.85)'; ctx.fillText(word, off, 0);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 22; ctx.fillText(word, 0, 0);
  }

  _renderKaraoke(word, fontSize, color, glow, progress) {
    const { ctx } = this;
    ctx.shadowBlur = glow; ctx.fillText(word, 0, 0);
    const w = ctx.measureText(word).width;
    const barW = w * Math.min(1, progress * 1.3);
    ctx.shadowBlur = 0; ctx.fillStyle = color;
    ctx.fillRect(-w / 2, fontSize * 0.55, barW, Math.max(6, fontSize * 0.07));
  }

  _renderShimmer(word, fontSize, color, glow, progress) {
    const { ctx } = this;
    ctx.shadowBlur = glow; ctx.fillText(word, 0, 0);
    const w = ctx.measureText(word).width;
    const sweep = -w / 2 + w * Math.min(1, progress * 1.3);
    const grad = ctx.createLinearGradient(sweep - fontSize * 0.5, 0, sweep + fontSize * 0.5, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.75)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2 - 10, -fontSize, w + 20, fontSize * 2);
    ctx.clip();
    ctx.shadowBlur = 0; ctx.fillStyle = grad;
    ctx.fillRect(-w / 2 - fontSize, -fontSize, w + fontSize * 2, fontSize * 2);
    ctx.restore();
  }

  _renderSticker(word, fontSize, color, glow) {
    const { ctx } = this;
    ctx.shadowBlur = 0;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(6, fontSize * 0.09);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeText(word, 0, 0);
    ctx.shadowColor = color; ctx.shadowBlur = glow; ctx.fillStyle = color;
    ctx.fillText(word, 0, 0);
  }

  _drawCounter(idx, total) {
    const { ctx, W, H } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '600 30px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${idx + 1} / ${total}`, W / 2, H - 90);
    ctx.restore();
  }

  _drawHint() {
    const { ctx, W, H } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 44px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('Paste your script to begin', W / 2, H / 2);
    ctx.restore();
  }
}