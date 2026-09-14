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
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.options = options;
    this.speed = 1;
    this.playing = false;
    this.raf = null;
    this.startTime = 0;
    this.pausedAt = 0;
    this.customMedia = null;
    this.bgImage = null;
    this.brandLogoImg = null;
    this._lastIdx = -1;
    this._wordsKey = null;
    this._wordsCache = [];

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
    const aspectChanged = opts.aspect && opts.aspect !== this.aspect;
    this.options = { ...this.options, ...opts };
    if (opts.onTimeUpdate) this.onTimeUpdate = opts.onTimeUpdate;
    if (aspectChanged) {
      this._applyAspect(opts.aspect);
      if (!this.playing) this._draw(this.currentTime);
    }
  }

  setCustomMedia(media) {
    this.customMedia = media;
    if (!this.playing) this._draw(this.currentTime);
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
    const dur = this.options.wordDuration || 0.4;
    let d = this.getWords().length * dur;
    if (this.options.ctaEnabled && this.options.ctaText) d += 2;
    return d;
  }

  get currentTime() {
    return this.playing ? ((performance.now() - this.startTime) / 1000) * this.speed : this.pausedAt;
  }

  play() {
    if (this.playing) return;
    if (this.customMedia && this.customMedia.tagName === 'VIDEO') this.customMedia.play().catch(() => {});
    this.playing = true;
    this.startTime = performance.now() - (this.pausedAt * 1000) / this.speed;
    this._loop();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.pausedAt = this.currentTime;
    if (this.customMedia && this.customMedia.tagName === 'VIDEO') this.customMedia.pause();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  seek(t) {
    const dur = this.getDuration();
    if (dur > 0 && t >= dur) t = 0;
    this.pausedAt = t;
    if (this.playing) this.startTime = performance.now() - (t * 1000) / this.speed;
    this._draw(t);
    if (this.onTimeUpdate) this.onTimeUpdate(t, dur);
  }

  setSpeed(s) {
    const cur = this.currentTime;
    this.speed = s;
    if (this.playing) this.startTime = performance.now() - (cur * 1000) / s;
  }

  renderFrameAt(t) { this._draw(t); }

  destroy() { cancelAnimationFrame(this.raf); }

  _isKey(word) {
    const w = (word || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!w) return false;
    if (KEYWORDS.has(w)) return true;
    if (this.options.autoHighlight && w.length >= 6) return true;
    return false;
  }

  _loop = () => {
    if (!this.playing) return;
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
    if (zoom !== 1) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
    }
    this._drawBackground(t);
    if (this.options.mode === 'caption') this._renderCaptionMode(t);
    else this._drawWord(t);
    if (this.options.showProgressbar) this._drawProgressBar(t);
    if (zoom !== 1) ctx.restore();
    if (this.options.brandEnabled) this._drawLogo();
    if (this.options.watermark) this._drawWatermark();
  }

  _drawLogo() {
    if (!this.options.brandLogo) return;
    if (!this.brandLogoImg || this.brandLogoImg.src !== this.options.brandLogo) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
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
      if (!this.bgImage || this.bgImage.src !== (options.bgImage || '')) {
        const img = new Image(); img.crossOrigin = 'anonymous'; img.src = options.bgImage || '';
        this.bgImage = img;
      }
      if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth) this._drawMediaCover(this.bgImage);
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
      s.y -= s.speed * 0.01;
      if (s.y < -0.02) s.y = 1.02;
      const x = s.x * W; const y = s.y * H;
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
    this._drawEmoji(word, fontSize, null);
    this._roundRect(-bw / 2, -bh / 2, bw, bh, radius);
    ctx.fillStyle = bg; ctx.fill();
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