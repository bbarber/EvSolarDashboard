/**
 * Minimal declarations for `wink-lemmatizer` (no published types). Only the
 * surface used by scripts/generate-words-seed.ts is declared.
 */
declare module 'wink-lemmatizer' {
  interface WinkLemmatizer {
    /** Lemmatize as a noun: "hotdogs" -> "hotdog". */
    noun(word: string): string;
    /** Lemmatize as a verb: "running" -> "run". */
    verb(word: string): string;
    /** Lemmatize as an adjective: "better" -> "good". */
    adjective(word: string): string;
  }
  const lemmatizer: WinkLemmatizer;
  export default lemmatizer;
}
