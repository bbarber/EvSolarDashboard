/**
 * Minimal declarations for `wordpos` (no published types). Only the surface
 * used by scripts/generate-puzzles-seed.ts is declared.
 */
declare module 'wordpos' {
  interface NounSense {
    /** WordNet lexicographer file number (18 = noun.person, 15 = noun.location, …). */
    lexFilenum: number;
    /** Synset lemmas, capitalization preserved ("Berlin", "coward"). */
    synonyms: string[];
    gloss: string;
  }
  class WordPOS {
    isNoun(word: string): Promise<boolean>;
    isVerb(word: string): Promise<boolean>;
    isAdjective(word: string): Promise<boolean>;
    isAdverb(word: string): Promise<boolean>;
    lookupNoun(word: string): Promise<NounSense[]>;
  }
  export default WordPOS;
}
