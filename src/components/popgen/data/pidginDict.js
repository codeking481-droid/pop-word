// Offline Pidgin / Naija translator — no API. Phrase replacements first, then word swaps.
const PHRASES = [
  [/\bhow to make money\b/gi, 'how to hammer money'],
  [/\bmake money\b/gi, 'hammer money'],
  [/\bhow are you\b/gi, 'how you dey'],
  [/\bi am fine\b/gi, 'i dey kampe'],
  [/\bwhat is up\b/gi, 'wetin dey happen'],
  [/\bwhat's up\b/gi, 'wetin dey happen'],
  [/\bdo not worry\b/gi, 'no worry'],
  [/\bdon't worry\b/gi, 'no worry'],
  [/\bi do not know\b/gi, 'i no know'],
  [/\bi don't know\b/gi, 'i no know'],
  [/\bit is okay\b/gi, 'e dey okay'],
  [/\bthat is true\b/gi, 'na so e be'],
  [/\bthat's true\b/gi, 'na so e be'],
  [/\bvery good\b/gi, 'correct well'],
  [/\bmy friend\b/gi, 'my padi'],
  [/\bmy friends\b/gi, 'my padi them'],
  [/\bno problem\b/gi, 'no wahala'],
  [/\bthere is no problem\b/gi, 'no wahala'],
  [/\bi want\b/gi, 'i wan'],
  [/\bi need\b/gi, 'i need am bad'],
  [/\blet us go\b/gi, 'make we waka'],
  [/\blet's go\b/gi, 'make we waka'],
  [/\bcome here\b/gi, 'come here sharp sharp'],
  [/\bhurry up\b/gi, 'sharp sharp'],
  [/\bdo it fast\b/gi, 'do am sharp sharp'],
  [/\bi will\b/gi, 'i go'],
  [/\byou will\b/gi, 'you go'],
  [/\bwe will\b/gi, 'we go'],
  [/\bthey will\b/gi, 'dem go'],
  [/\bhe will\b/gi, 'e go'],
  [/\bshe will\b/gi, 'she go'],
  [/\bis not\b/gi, 'no be'],
  [/\bare not\b/gi, 'no be'],
  [/\bdo not\b/gi, 'no'],
  [/\bdon't\b/gi, 'no'],
  [/\bcan not\b/gi, 'no fit'],
  [/\bcan't\b/gi, 'no fit'],
  [/\bi cannot\b/gi, 'i no fit'],
  [/\bgoing to\b/gi, 'go dey go'],
  [/\bwant to\b/gi, 'wan'],
  [/\bgoing\b/gi, 'dey go'],
  [/\ba lot of\b/gi, 'plenty'],
  [/\ba lot\b/gi, 'plenty'],
  [/\bbig money\b/gi, 'big moni'],
];

const WORDS = {
  money: 'moni', work: 'wuk', job: 'wuk', eat: 'chop', food: 'chop',
  fine: 'correct', good: 'correct', bad: 'yeye', fake: 'yeye',
  friend: 'padi', friends: 'padi', girl: 'sisi', boy: 'boi',
  now: 'now now', today: 'today', tomorrow: 'tomorrow', yesterday: 'yesterday',
  very: 'well well', really: 'truly', big: 'big well', small: 'small small',
  fast: 'sharp sharp', quick: 'sharp sharp', slowly: 'small small',
  go: 'waka', come: 'come', run: 'run', walk: 'waka',
  see: 'see', look: 'look', know: 'sabi', understand: 'sabi',
  think: 'reason', say: 'talk', talk: 'yarn', speak: 'yarn',
  want: 'wan', need: 'need am', like: 'like', love: 'love well',
  buy: 'buy', sell: 'sell', give: 'give am', take: 'carry',
  start: 'start', stop: 'stop', begin: 'start', end: 'finish',
  happy: 'glad', sad: 'sad', angry: 'vex', vex: 'vex',
  tired: 'tire', hungry: 'hungry', full: 'belly full',
  child: 'pikin', children: 'pikin', baby: 'pikin',
  father: 'papa', mother: 'mama', brother: 'broda', sister: 'sista',
  man: 'man', woman: 'sisi', people: 'pipu', person: 'person',
  thing: 'tin', things: 'tin', nothing: 'notin', something: 'somtin',
  because: 'because', why: 'why', how: 'how', what: 'wetin',
  this: 'dis', that: 'dat', these: 'dis', those: 'dat',
  here: 'here', there: 'dere', where: 'where',
  yes: 'yes', no: 'no', okay: 'okay', alright: 'okay',
  beautiful: 'fine well', ugly: 'ugly', fine2: 'fine',
  rich: 'rich', poor: 'poor', expensive: 'cost well', cheap: 'cheap',
  please: 'abeg', sorry: 'sori', thanks: 'thank you', thank: 'thank',
  hello: 'how far', hi: 'how far', hey: 'how far',
  crazy: 'mad', amazing: 'well done', awesome: 'correct',
  problem: 'wahala', trouble: 'wahala', issue: 'wahala',
  smart: 'sharp', clever: 'sharp', stupid: 'mumu', foolish: 'mumu',
  drink: 'drink', water: 'water', food2: 'chop',
  car: 'motor', house: 'house', room: 'room',
  clothes: 'cloth', dress: 'dress', shoe: 'shoe',
  phone: 'phone', computer: 'system', laptop: 'system',
  internet: 'net', online: 'online', offline: 'offline',
  business: 'bizness', company: 'company', market: 'market',
  price: 'price', cost: 'cost', free: 'free', paid: 'paid',
  success: 'success', fail: 'fail', win: 'win', lose: 'lose',
  begin2: 'start', start2: 'start',
};

export function translateToPidgin(text) {
  if (!text) return '';
  let out = text;
  for (const [re, rep] of PHRASES) out = out.replace(re, rep);
  out = out.replace(/\b([A-Za-z]+)\b/g, (m) => {
    const key = m.toLowerCase();
    if (WORDS[key]) {
      // preserve simple capitalization
      const rep = WORDS[key];
      return m[0] === m[0].toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
    }
    return m;
  });
  return out;
}