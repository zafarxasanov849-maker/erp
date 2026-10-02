// O'qishda adashtiradigan belgilarsiz (0/O, 1/l/I) — xodimga og'zaki aytish oson bo'lsin.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const MIN_PASSWORD_LENGTH = 8;

/** Xodim uchun vaqtinchalik parol (kriptografik tasodifiy). */
export function generateTempPassword(length = 10): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  // kamida bitta raqam bo'lsin
  if (!/\d/.test(out)) out = out.slice(0, -1) + ALPHABET[ALPHABET.length - 1 - (bytes[0]! % 8)];
  return out;
}
