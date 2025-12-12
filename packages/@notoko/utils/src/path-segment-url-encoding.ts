import * as z from "zod/v4";

const SPECIAL_CHARACTER_REGEX = /[\x00-\x1f\x80-\x9f\/?<>\\:*|#]/;

const RESERVED_NAME_REGEX = /^(\.{1,2}|con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * reference: <https://www.npmjs.com/package/sanitize-filename>.
 */
export const UrlEncodedSafePathSegment = z.string()
  .min(1)
  .max(255)
  .refine((str) => !SPECIAL_CHARACTER_REGEX.test(str), {
    error: "cannot contain special characters!",
  })
  .refine((str) => !/[. ]$/.test(str), {
    error: "cannot end with periods or spaces!",
  })
  .refine((str) => !RESERVED_NAME_REGEX.test(str), {
    error: "cannot be reserved names!",
  })
  .brand<"UrlEncodedSafePathSegment">();
export type UrlEncodedSafePathSegment = z //
.infer<typeof UrlEncodedSafePathSegment>;

/**
 * URL-encode a string to the extent that it can be safely used as a segment in
 * a file/URI path.
 */
export function urlEncodeToSafePathSegment(
  input: string,
): UrlEncodedSafePathSegment {
  return UrlEncodedSafePathSegment.parse(
    urlEncodeToSafePathSegmentInner(input),
  );
}

function urlEncodeToSafePathSegmentInner(
  input: string,
): string {
  if (RESERVED_NAME_REGEX.test(input)) {
    let output = "%";
    output += input[0]!.charCodeAt(0).toString(16).padStart(2, "0");
    output += input.slice(1);
    return output;
  }

  let output = "";
  for (const ch of input) {
    if (
      SPECIAL_CHARACTER_REGEX.test(ch) || ch === "." || ch === " " ||
      // although not special to paths, the brackets are used to surround these
      // kind of encoded text in this project, therefore are also needed to be
      // encoded.
      ch === "[" || ch === "]"
    ) {
      output += `%${ch.charCodeAt(0).toString(16).padStart(2, "0")}`;
    } else {
      output += ch;
    }
  }

  return output;
}

/**
 * FIXME: it should reject inputs that won't be produced by
 * `urlEncodeToSafePathSegment`.
 */
export function urlDecodeFromSafePathSegment(
  input: UrlEncodedSafePathSegment,
): string {
  return decodeURIComponent(input);
}
