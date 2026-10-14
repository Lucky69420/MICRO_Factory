export function randomSeed() {
  const bytes = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return bytes[0].toString(36);
  }
  return Date.now().toString(36);
}
