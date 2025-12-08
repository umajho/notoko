import * as z from "zod/v4";

/**
 * ISO 639-3.
 */
export const Language = z.string()
  .regex(/^[a-z]{3}$/)
  .brand("Language");
export type Language = z.infer<typeof Language>;

/**
 * `<ISO 639-3>-<ISO 15924>`.
 */
export const LanguageWithScript = z.string()
  .regex(/^[a-z]{3}-[A-Z][a-z]{3}$/)
  .brand("LanguageWithScript");
export type LanguageWithScript = z.infer<typeof LanguageWithScript>;

export const PhonemeLexicon = z.string().brand("PhonemeLexicon");
export type PhonemeLexicon = z.infer<typeof PhonemeLexicon>;

export type PhonemeSegment = { text: string; phonemes: string[] };
export const Duration2d = z.array(z.array(z.number().int().nonnegative()));
export type Duration2d = z.infer<typeof Duration2d>;
