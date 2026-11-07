// UUIDv7 (RFC 9562): 48-bit Unix milliseconds, then random bits. Time-ordered, so primary-key inserts stay
// at the right edge of the B-tree index and `ORDER BY id` is creation order. Postgres 17 has no built-in
// uuidv7(), so ids are generated in the app (Workers and Node both have Web Crypto).
export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // 48-bit big-endian timestamp. Split into high 16 and low 32 bits (bitwise ops are 32-bit in JS).
  const high = Math.floor(now / 2 ** 32);
  const low = now >>> 0;
  bytes[0] = (high >>> 8) & 0xff;
  bytes[1] = high & 0xff;
  bytes[2] = (low >>> 24) & 0xff;
  bytes[3] = (low >>> 16) & 0xff;
  bytes[4] = (low >>> 8) & 0xff;
  bytes[5] = low & 0xff;
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
