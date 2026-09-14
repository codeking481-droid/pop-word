// Offline keyword style categories — no API.
export const HIGH_MONEY = new Set([
  'money', 'cash', 'rich', 'wealth', 'million', 'billion', 'profit', 'income',
  'dollar', 'dollars', 'free', 'secret', 'viral', 'hack', 'hacks', 'crypto',
  'bitcoin', 'passive', 'hustle', 'earn', 'invest', 'stock', 'stocks', 'revenue',
  'sales', 'traffic', 'views', 'followers', 'growth', 'scale', 'boost', 'gain',
  'build', 'make', 'never', 'stop', 'empire', 'fortune', 'salary', 'bonus',
]);

export const NEGATIVE = new Set([
  'mistake', 'mistakes', 'fail', 'failure', 'failed', 'broke', 'scam', 'fake',
  'lose', 'loss', 'lost', 'poor', 'debt', 'wrong', 'bad', 'waste', 'danger',
  'avoid', 'ruin', 'destroy', 'kill', 'dead', 'hate', 'ugly', 'stupid', 'dumb',
  'lazy', 'broke', 'struggle', 'pain', 'stress', 'fear', 'scared', 'worst',
]);

export function wordCategory(word) {
  const w = (word || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!w) return null;
  if (HIGH_MONEY.has(w)) return 'money';
  if (NEGATIVE.has(w)) return 'negative';
  return null;
}