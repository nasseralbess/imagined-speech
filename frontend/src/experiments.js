// experiments.js
//
// Stimulus sets + trial construction for every experiment the recording UI can
// run. App.js owns presentation and logging; this file owns *what* is shown and
// in what order.
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
// Every stimulus must also be a single \w+ token for that regex to match it.

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
// Crossover sets
// ---------------------------------------------------------------------------
// Each set is a word that has BOTH a direct homophone and a direct synonym —
// the phonetic/semantic crossover structure the second experiment is built on.

export const CROSSOVER_SETS = [
  { target: 'Plain', homophone: 'Plane', synonym: 'Simple' },
  { target: 'Steal', homophone: 'Steel', synonym: 'Rob' },
  { target: 'Pair', homophone: 'Pear', synonym: 'Couple' },
  { target: 'Fair', homophone: 'Fare', synonym: 'Just' },
];

export const DIRECTIONAL_WORDS = ['Up', 'Down', 'Left', 'Right'];

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
  Array.from({ length: numTrials }, () => {
    const items = [
      ...legacyBlockItems(shuffleArray(LEGACY_BLOCK_A)),
      { kind: 'cross', note: '(before first word)' },
      ...legacyBlockItems(shuffleArray(LEGACY_BLOCK_B)),
      { kind: 'cross', note: '(before first word)' },
    ];
    return { items, words: items.filter((it) => it.kind === 'word').map((it) => it.word) };
  });

// ---------------------------------------------------------------------------
// Experiment 1 — directional words with interleaved crossover distractors
// ---------------------------------------------------------------------------
// Each trial alternates direction / intermediate:
//
//   Up (overt, covert) -> Plane (overt, covert) -> Down (overt, covert) -> ...
//
// The four intermediates come from ONE crossover set per trial. A set holds
// three words but there are four slots, so the target word (the one carrying
// both relations — Plain, Steal) is drawn twice: {Plain, Plain, Plane, Simple}.
// Directions and intermediates are each shuffled before being interleaved, so
// the pairing of a given direction with a given intermediate varies trial to
// trial while every direction still appears exactly once.

const EXP1_SET_TARGETS = ['Plain', 'Steal'];

export const EXP1_INTERMEDIATE_SETS = CROSSOVER_SETS.filter(
  (s) => EXP1_SET_TARGETS.includes(s.target),
);

const intermediatePool = (set) => [set.target, set.target, set.homophone, set.synonym];

const buildDirectionalTrials = ({ numTrials }) => {
  // Strict alternation with a random starting set, so the two sets get equal
  // trial counts (±1 at odd numTrials) instead of drifting apart by chance.
  const offset = randInt(0, EXP1_INTERMEDIATE_SETS.length - 1);

  return Array.from({ length: numTrials }, (_, trialIndex) => {
    const set = EXP1_INTERMEDIATE_SETS[(offset + trialIndex) % EXP1_INTERMEDIATE_SETS.length];
    const directions = shuffleArray(DIRECTIONAL_WORDS);
    const intermediates = shuffleArray(intermediatePool(set));

    const items = [];
    directions.forEach((direction, i) => {
      const intermediate = intermediates[i];
      items.push(wordItem(direction, {
        preLog: `Starting pair ${i + 1}: [${direction}, ${intermediate}]`,
        label: 'direction word',
        first: '(before direction word)',
        repeat: '(repeating direction word)',
      }));
      items.push(wordItem(intermediate, {
        label: 'intermediate word',
        first: '(transitioning to intermediate word)',
        repeat: '(repeating intermediate word)',
      }));
    });

    return {
      items,
      words: items.map((it) => it.word),
      set: set.target,
      directions,
      intermediates,
    };
  });
};

// ---------------------------------------------------------------------------
// Experiment 2 — semantic vs phonetic processing
// ---------------------------------------------------------------------------
// Every crossover set yields two two-word pairs — one semantic, one phonetic:
//
//   Pair/Couple (semantic)   Pair/Pear (phonetic)
//
// A trial runs through all eight pairs in random order, and the order within
// each pair is randomised too, so the target word isn't always the first of the
// two. Consequence: per trial each target appears twice (once in its semantic
// pair, once in its phonetic pair) and each counterpart once.

const crossoverPairs = () =>
  CROSSOVER_SETS.flatMap((set) => [
    { relation: 'semantic', words: [set.target, set.synonym] },
    { relation: 'phonetic', words: [set.target, set.homophone] },
  ]);

const buildCrossoverTrials = ({ numTrials }) =>
  Array.from({ length: numTrials }, () => {
    const pairs = shuffleArray(crossoverPairs()).map((pair) => ({
      ...pair,
      words: shuffleArray(pair.words),
    }));

    const items = [];
    pairs.forEach((pair, i) => {
      const [first, second] = pair.words;
      items.push(wordItem(first, {
        preLog: `Starting pair ${i + 1}: [${first}, ${second}] (${pair.relation})`,
        label: 'first word',
        first: '(before first word)',
        repeat: '(repeating first word)',
      }));
      items.push(wordItem(second, {
        label: 'second word',
        first: '(transitioning to second word)',
        repeat: '(repeating second word)',
      }));
    });

    return { items, words: items.map((it) => it.word), pairs };
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
  },
  directional: {
    id: 'directional',
    label: 'Exp 1 — directions interleaved with crossover words',
    description:
      'Up/Down/Left/Right alternating with 4 intermediates from one set per trial (Plain/Plane/Simple or Steal/Steel/Rob, target drawn twice). Sets alternate across trials.',
    buildTrials: buildDirectionalTrials,
  },
  crossover: {
    id: 'crossover',
    label: 'Exp 2 — semantic vs phonetic crossover pairs',
    description:
      'All 8 pairs from Plain/Plane/Simple, Steal/Steel/Rob, Pair/Pear/Couple, Fair/Fare/Just — one semantic and one phonetic pair per set, shuffled.',
    buildTrials: buildCrossoverTrials,
  },
};

export const EXPERIMENT_IDS = Object.keys(EXPERIMENTS);

export const DEFAULT_EXPERIMENT = 'legacy';
