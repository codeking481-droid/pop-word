// Offline viral title + hashtag generator — no API. Uses script keywords.
import { HIGH_MONEY } from './keywordStyles';

const TITLE_TEMPLATES = [
  (k) => `This ${k} Hack Will Shock You`,
  (k) => `How ${k} Changed Everything in 30 Days`,
  (k) => `The ${k} Secret Nobody Tells You`,
  (k) => `${k[0].toUpperCase() + k.slice(1)} — What They Don't Want You to Know`,
  (k) => `I Tried ${k} and This Happened`,
  (k) => `Why ${k} Is the Key to Winning`,
  (k) => `${k} Made Me Rich (Here's How)`,
  (k) => `Stop Doing This With ${k}`,
];

const BASE_HASHTAGS = ['#fyp', '#viral', '#foryou', '#trending', '#shorts', '#reels', '#tiktok', '#youtube', '#contentcreator', '#growyouraccount'];

const RELATED = {
  money: ['#money', '#sidehustle', '#financetips', '#cashflow'],
  cash: ['#money', '#cash', '#hustle'],
  rich: ['#wealth', '#rich', '#mindset'],
  profit: ['#profit', '#business', '#investing'],
  secret: ['#secret', '#hidden', '#truth'],
  free: ['#free', '#bonus', '#gift'],
  viral: ['#viral', '#trending', '#fyp'],
  hack: ['#lifehacks', '#hacks', '#tips'],
  crypto: ['#crypto', '#bitcoin', '#investing'],
  motivation: ['#motivation', '#mindset', '#success'],
  success: ['#success', '#mindset', '#growth'],
};

export function generateTitlesAndHashtags(script) {
  const words = (script || '').toLowerCase().match(/[a-z]+/g) || [];
  let keyword = null;
  for (const w of words) {
    if (HIGH_MONEY.has(w)) { keyword = w; break; }
  }
  if (!keyword && words.length) keyword = words[0];
  if (!keyword) keyword = 'this';

  const titles = [];
  const used = new Set();
  for (let i = 0; i < TITLE_TEMPLATES.length && titles.length < 3; i++) {
    const t = TITLE_TEMPLATES[i](keyword);
    if (!used.has(t)) { used.add(t); titles.push(t); }
  }

  const related = RELATED[keyword] || [`#${keyword}`, '#viral', '#trending'];
  const hashtags = [...BASE_HASHTAGS.slice(0, 6), ...related].slice(0, 10);
  return { titles, hashtags, keyword };
}