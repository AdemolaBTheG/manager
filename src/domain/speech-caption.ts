export type SpeechWordTiming = {
  readonly word: string;
  readonly start: number;
  readonly end: number;
};

export type SpeechCaptionPhrase = {
  readonly start: number;
  readonly end: number;
  readonly words: readonly SpeechWordTiming[];
};

export type SpeechCaptionSnapshot = {
  readonly phraseIndex: number;
  readonly wordOffset: number;
  readonly words: readonly string[];
  readonly activeWordIndex: number | null;
};

const MAX_PHRASE_CHARACTERS = 34;
const MAX_PHRASE_WORDS = 6;
const PHRASE_PAUSE_SECONDS = 0.42;

export function groupSpeechCaptionPhrases(
  timings: readonly SpeechWordTiming[],
): readonly SpeechCaptionPhrase[] {
  const phrases: SpeechCaptionPhrase[] = [];
  let words: SpeechWordTiming[] = [];
  let characterCount = 0;

  const finishPhrase = () => {
    const firstWord = words[0];
    const lastWord = words.at(-1);
    if (!firstWord || !lastWord) {
      return;
    }

    phrases.push({
      start: firstWord.start,
      end: lastWord.end,
      words,
    });
    words = [];
    characterCount = 0;
  };

  for (const [index, timing] of timings.entries()) {
    const word = timing.word.replace(/\s+/g, " ").trim();
    if (!word || !isValidTiming(timing)) {
      continue;
    }

    const normalizedTiming = { ...timing, word };
    const nextCharacterCount = characterCount + (words.length > 0 ? 1 : 0) + word.length;
    if (
      words.length > 0 &&
      (words.length >= MAX_PHRASE_WORDS ||
        nextCharacterCount > MAX_PHRASE_CHARACTERS)
    ) {
      finishPhrase();
    }

    words.push(normalizedTiming);
    characterCount += (words.length > 1 ? 1 : 0) + word.length;

    const nextTiming = timings[index + 1];
    const pauseToNextWord = nextTiming
      ? Math.max(0, nextTiming.start - timing.end)
      : 0;
    const endsSentence = /[.!?]$/.test(word);
    const endsClause = /[,;:]$/.test(word) && words.length >= 3;

    if (
      endsSentence ||
      endsClause ||
      pauseToNextWord >= PHRASE_PAUSE_SECONDS
    ) {
      finishPhrase();
    }
  }

  finishPhrase();
  return phrases;
}

export function getSpeechCaptionSnapshot(
  phrases: readonly SpeechCaptionPhrase[],
  currentTime: number,
  highlightActiveWord = true,
): SpeechCaptionSnapshot | null {
  if (phrases.length === 0) {
    return null;
  }

  const safeCurrentTime = Number.isFinite(currentTime)
    ? Math.max(0, currentTime)
    : 0;
  let phraseIndex = 0;
  let wordOffset = 0;
  let precedingWordCount = 0;

  for (const [index, phrase] of phrases.entries()) {
    if (phrase.start <= safeCurrentTime) {
      phraseIndex = index;
      wordOffset = precedingWordCount;
      precedingWordCount += phrase.words.length;
      continue;
    }

    break;
  }

  const phrase = phrases[phraseIndex];
  let activeWordIndex: number | null = highlightActiveWord ? 0 : null;

  if (highlightActiveWord) {
    for (const [index, word] of phrase.words.entries()) {
      if (word.start <= safeCurrentTime) {
        activeWordIndex = index;
        continue;
      }

      break;
    }
  }

  return {
    phraseIndex,
    wordOffset,
    words: phrase.words.map((word) => word.word),
    activeWordIndex,
  };
}

function isValidTiming(timing: SpeechWordTiming) {
  return (
    Number.isFinite(timing.start) &&
    Number.isFinite(timing.end) &&
    timing.start >= 0 &&
    timing.end >= timing.start
  );
}
