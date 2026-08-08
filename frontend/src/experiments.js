// experiments.js
//
// Stimulus battery + trial construction for every experiment the recording UI
// can run. App.js owns presentation and logging; this file owns *what* is shown
// and in what order.
//
// A builder returns a list of trials. A trial is a flat list of presentation
// items, executed in order:
//
//   { kind: 'word', word, label, preLog, crossNotes: { first, repeat } }
//       -> cross, word in lightblue (overt), cross, word in blue (covert)
//   { kind: 'cross', note }
//       -> a bare fixation cross (used by the legacy block separators)
//
// `label`, `crossNotes` and `note` end up verbatim inside the log lines.
// preprocessing/produce_dataset.py only looks for the substring "cross" in the
// cross line and pulls the word out of "display to '<word>'", so this wording is
// free — but the surrounding log format is load-bearing and must not change.

// Fisher-Yates shuffle, returns a new array.
export const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// ---------------------------------------------------------------------------
// Word battery
// ---------------------------------------------------------------------------
// Every relation is declared once, here. Filler selection derives its exclusion
// rules from these pairs rather than from hand-maintained blocklists, so adding
// a word to a pair automatically keeps it away from the targets it relates to.

export const HOMOPHONE_PAIRS = [
  ['Flower', 'Flour'],
  ['Knight', 'Night'],
  ['Sun', 'Son'],
  ['Right', 'Write'],
  ['Pair', 'Pear'],
  ['Sea', 'See'],
];

export const SYNONYM_PAIRS = [
  ['Quick', 'Fast'],
  ['Smart', 'Clever'],
  ['Big', 'Large'],
  ['Pair', 'Couple'],
  ['Right', 'Correct'],
  ['Sea', 'Ocean'],
  ['Night', 'Evening'],
  ['Flower', 'Blossom'],
];

export const DIRECTIONAL_WORDS = ['Up', 'Down', 'Left', 'Right'];

// Concrete nouns with no homophone and no synonym anywhere else in the battery,
// and no semantic link to the directional or crossover targets. These exist so
// that filler slots can be filled without dragging paired words into a trial.
export const NEUTRAL_FILLERS = [
  'Table', 'Window', 'Pencil', 'Bottle',
  'Carpet', 'Basket', 'Camera', 'Candle',
  'Pillow', 'Wallet', 'Jacket', 'Kitchen',
  'Bridge', 'Guitar', 'Engine', 'Napkin',
];

const ALL_PAIRS = [...HOMOPHONE_PAIRS, ...SYNONYM_PAIRS];

// word (lowercased) -> Set of words it is phonetically or semantically tied to.
const RELATIONS = (() => {
  const map = new Map();
  const link = (a, b) => {
    const key = a.toLowerCase();
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(b.toLowerCase());
  };
  for (const [a, b] of ALL_PAIRS) {
    link(a, b);
    link(b, a);
  }
  return map;
})();

const relativesOf = (word) => RELATIONS.get(word.toLowerCase()) || new Set();

// Full battery: everything that participates in a pair, the directions, and the
// neutral fillers. Order-stable and de-duplicated case-insensitively.
export const WORD_BATTERY = (() => {
  const seen = new Set();
  const out = [];
  for (const word of [...ALL_PAIRS.flat(), ...DIRECTIONAL_WORDS, ...NEUTRAL_FILLERS]) {
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
})();

/**
 * Draw `count` filler words at random.
 *
 * Guarantees, in order of importance:
 *   1. No filler is a target, or phonetically/semantically related to a target.
 *   2. No two fillers in the same trial are related to each other — a trial
 *      never contains both halves of a pair, which would smuggle the very
 *      phonetic/semantic structure the experiments are trying to isolate back
 *      in through the distractors.
 *
 * Returns fewer than `count` words only if the pool genuinely runs dry.
 */
export const drawFillers = (pool, count, targets = []) => {
  const banned = new Set();
  for (const t of targets) {
    banned.add(t.toLowerCase());
    relativesOf(t).forEach((r) => banned.add(r));
  }

  const picked = [];
  for (const word of shuffleArray(pool)) {
    if (picked.length >= count) break;
    if (banned.has(word.toLowerCase())) continue;
    picked.push(word);
    banned.add(word.toLowerCase());
    relativesOf(word).forEach((r) => banned.add(r));
  }
  return picked;
};

const wordItem = (
  word,
  { preLog = null, label = 'word', first = '(before word)', repeat = '(repeating word)' } = {},
) => ({
  kind: 'word',
  word,
  label,
  preLog,
  crossNotes: { first, repeat },
});

// ---------------------------------------------------------------------------
// Legacy experiment — the design that produced every recording in data/raw/
// ---------------------------------------------------------------------------
// Reproduced exactly as it ran before: two blocks per trial, each shuffled as a
// *flat* list (so the "pairs" it walks in twos are adjacent random words, not
// the declared pairs), with a bare fixation cross between the blocks and after
// the second one.

const LEGACY_BLOCK_A = [
  'Flower', 'Flour',
  'Knight', 'Night',
  'Sun', 'Son',
  'Right', 'Write',
  'Pair', 'Pear',
  'Sea', 'See',
];

const LEGACY_BLOCK_B = [
  'Quick', 'Fast',
  'Smart', 'Clever',
  'Big', 'Large',
  'Pair', 'Couple',
  'Sea', 'See',
  'Up', 'Down',
  'Left', 'Right',
];

// Walk a flat list two at a time, tagging each pair with the same
// "Starting pair N: [a, b]" line the original code emitted.
const legacyBlockItems = (words) => {
  const items = [];
  for (let i = 0; i < words.length; i += 2) {
    const first = words[i];
    const second = words[i + 1];
    items.push(wordItem(first, {
      preLog: `Starting pair ${i / 2 + 1}: [${first}, ${second}]`,
      label: 'first word',
      first: '(before first word)',
      repeat: '(repeating first word)',
    }));
    if (second === undefined) continue;
    items.push(wordItem(second, {
      label: 'second word',
      first: '(transitioning to second word)',
      repeat: '(repeating second word)',
    }));
  }
  return items;
};

const buildLegacyTrials = ({ numTrials }) =>
  Array.from({ length: numTrials }, () => ({
    words: [],
    items: [
      ...legacyBlockItems(shuffleArray(LEGACY_BLOCK_A)),
      { kind: 'cross', note: '(before first word)' },
      ...legacyBlockItems(shuffleArray(LEGACY_BLOCK_B)),
      { kind: 'cross', note: '(before first word)' },
    ],
  })).map((trial) => ({
    ...trial,
    words: trial.items.filter((it) => it.kind === 'word').map((it) => it.word),
  }));

// ---------------------------------------------------------------------------
// Experiment 1 — directional words with variable distractors
// ---------------------------------------------------------------------------
// The four directions recur in every trial; 3-4 fillers drawn fresh each time
// keep the sequence from becoming predictable. "Write" is excluded automatically
// as the homophone of "Right", "Correct" as its synonym.

const DIRECTIONAL_TARGETS = ['Up', 'Down', 'Left', 'Right'];

const DIRECTIONAL_FILLER_POOL = WORD_BATTERY.filter(
  (w) => !DIRECTIONAL_WORDS.some((d) => d.toLowerCase() === w.toLowerCase()),
);

const buildDirectionalTrials = ({ numTrials, minFillers = 3, maxFillers = 4 }) =>
  Array.from({ length: numTrials }, () => {
    const fillers = drawFillers(
      DIRECTIONAL_FILLER_POOL,
      randInt(minFillers, maxFillers),
      DIRECTIONAL_TARGETS,
    );
    const words = shuffleArray([...DIRECTIONAL_TARGETS, ...fillers]);
    return {
      words,
      fillers,
      items: words.map((w) => wordItem(w)),
    };
  });

// ---------------------------------------------------------------------------
// Experiment 2 — semantic vs phonetic processing
// ---------------------------------------------------------------------------
// Targets are crossover sets: a word that has BOTH a direct homophone and a
// direct synonym, presented together with both counterparts. Strictly
// directional words are gone; "Right" stays because it crosses over
// (Write / Correct). Fillers work exactly as in experiment 1.

export const CROSSOVER_SETS = [
  { target: 'Pair', homophone: 'Pear', synonym: 'Couple' },
  { target: 'Right', homophone: 'Write', synonym: 'Correct' },
  { target: 'Sea', homophone: 'See', synonym: 'Ocean' },
  { target: 'Night', homophone: 'Knight', synonym: 'Evening' },
  { target: 'Flower', homophone: 'Flour', synonym: 'Blossom' },
];

const CROSSOVER_TARGETS = CROSSOVER_SETS.flatMap((s) => [s.target, s.homophone, s.synonym]);

// Directional words are removed from the pool entirely; "Right" survives only
// as a crossover target, never as a filler.
const CROSSOVER_FILLER_POOL = WORD_BATTERY.filter(
  (w) => !DIRECTIONAL_WORDS.some((d) => d.toLowerCase() === w.toLowerCase()),
);

const buildCrossoverTrials = ({ numTrials, minFillers = 3, maxFillers = 4 }) =>
  Array.from({ length: numTrials }, () => {
    const fillers = drawFillers(
      CROSSOVER_FILLER_POOL,
      randInt(minFillers, maxFillers),
      CROSSOVER_TARGETS,
    );
    const words = shuffleArray([...CROSSOVER_TARGETS, ...fillers]);
    return {
      words,
      fillers,
      items: words.map((w) => wordItem(w)),
    };
  });

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const EXPERIMENTS = {
  legacy: {
    id: 'legacy',
    label: 'Legacy — homophone + synonym blocks (original)',
    description:
      'The original design: 12 homophone-pair words then 14 synonym/direction words, each block shuffled flat, per trial.',
    buildTrials: buildLegacyTrials,
    targets: [],
  },
  directional: {
    id: 'directional',
    label: 'Exp 1 — directional words + variable distractors',
    description:
      'Up / Down / Left / Right every trial, plus 3-4 fillers drawn fresh from the battery (never related to a direction).',
    buildTrials: buildDirectionalTrials,
    targets: DIRECTIONAL_TARGETS,
  },
  crossover: {
    id: 'crossover',
    label: 'Exp 2 — semantic vs phonetic crossover sets',
    description:
      'Five target/homophone/synonym sets (Pair, Right, Sea, Night, Flower) plus 3-4 unrelated fillers. No directional words.',
    buildTrials: buildCrossoverTrials,
    targets: CROSSOVER_TARGETS,
  },
};

export const EXPERIMENT_IDS = Object.keys(EXPERIMENTS);

export const DEFAULT_EXPERIMENT = 'legacy';
