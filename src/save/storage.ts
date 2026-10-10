// localStorage can be unavailable or throw (private windows, blocked site
// data). The game must work without it; values are then just not remembered.

const KEY_PREFIX = "diagonpuzzle.";

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(KEY_PREFIX + key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + key, value);
  } catch {
    // Not remembered between visits; nothing else to do.
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + key);
  } catch {
    // As above.
  }
}
