/**
 * Words that stay lowercase in a title unless they are the first word or
 * follow a colon, hyphen, or comma.
 */
const LOWERCASE_WORDS = new Set([
  "a",
  "o",
  "de",
  "da",
  "das",
  "do",
  "dos",
  "é",
  "por",
  "um",
  "uma",
]);

const SEPARATORS = new Set([":", "-", ",", "–", "—"]);

/**
 * Capitalizes the first letter of every word, keeping the small connecting
 * words lowercase unless they open the title or follow punctuation.
 *
 * Existing casing inside a word is preserved (e.g. "iPhone", "NASA").
 */
export function toTitleCase(value: string): string {
  let isFirstWord = true;

  return value.replace(
    /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu,
    (word: string, offset: number) => {
      const previousChar = value.slice(0, offset).trimEnd().slice(-1);
      const shouldCapitalize = isFirstWord || SEPARATORS.has(previousChar);
      isFirstWord = false;

      const lower = word.toLocaleLowerCase("pt-BR");
      if (!shouldCapitalize && LOWERCASE_WORDS.has(lower)) return lower;

      return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
    },
  );
}
