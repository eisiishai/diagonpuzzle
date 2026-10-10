export type GameAction =
  | "selectUp"
  | "selectDown"
  | "selectLeft"
  | "selectRight"
  | "fire"
  | "place"
  | "back"
  | "restart"
  | "toggleMusic"
  | "toggleEffects"
  | "skipLevel";

const KEY_ACTIONS: Partial<Record<string, GameAction>> = {
  ArrowUp: "selectUp",
  w: "selectUp",
  ArrowDown: "selectDown",
  s: "selectDown",
  ArrowLeft: "selectLeft",
  a: "selectLeft",
  ArrowRight: "selectRight",
  d: "selectRight",
  Enter: "fire",
  " ": "fire",
  p: "place",
  Escape: "back",
  r: "restart",
  m: "toggleMusic",
  f: "toggleEffects",
};

/** Actions for Shift + key. Shift+N is the hidden level skip. */
const SHIFT_KEY_ACTIONS: Partial<Record<string, GameAction>> = {
  n: "skipLevel",
};

/** Actions that should not repeat while the key is held down. */
const NO_REPEAT: ReadonlySet<GameAction> = new Set([
  "fire",
  "place",
  "back",
  "restart",
  "toggleMusic",
  "toggleEffects",
  "skipLevel",
]);

/** The parts of a key press that decide its action. */
export type KeyPress = Pick<
  KeyboardEvent,
  "key" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "repeat"
>;

/**
 * The game action for a key press. Undefined for keys the game doesn't use,
 * for presses with Ctrl, Alt or Meta (left to the browser), and for a held
 * key repeating an action that shouldn't repeat. `used` is true when the
 * key belongs to the game even if it does nothing now (a held Enter), so
 * the browser shouldn't act on it either.
 */
export function keyAction(press: KeyPress): {
  action?: GameAction;
  used: boolean;
} {
  if (press.ctrlKey || press.altKey || press.metaKey) {
    return { used: false };
  }
  const key = press.key.length === 1 ? press.key.toLowerCase() : press.key;
  const action =
    (press.shiftKey ? SHIFT_KEY_ACTIONS[key] : undefined) ?? KEY_ACTIONS[key];
  if (action === undefined) {
    return { used: false };
  }
  if (press.repeat && NO_REPEAT.has(action)) {
    return { used: true };
  }
  return { action, used: true };
}

/**
 * Translates key presses into game actions. Returns a function that removes
 * the listener.
 */
export function bindKeyboard(
  onAction: (action: GameAction) => void,
): () => void {
  const listener = (event: KeyboardEvent) => {
    const { action, used } = keyAction(event);
    if (used) {
      // Stop arrows and space from scrolling the page.
      event.preventDefault();
    }
    if (action !== undefined) {
      onAction(action);
    }
  };

  window.addEventListener("keydown", listener);
  return () => window.removeEventListener("keydown", listener);
}
