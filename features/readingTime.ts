export const WORDS_PER_MINUTE = 230;

export function readMinutes(wordCount: number): number {
  if (!wordCount || wordCount <= 0) return 1;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
