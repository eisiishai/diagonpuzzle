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

/**
 * Translates key presses into game actions. Returns a function that removes
 * the listener.
 */
export function bindKeyboard(
  onAction: (action: GameAction) => void,
): () => void {
  const listener = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const action =
      (event.shiftKey ? SHIFT_KEY_ACTIONS[key] : undefined) ?? KEY_ACTIONS[key];
    if (action === undefined) {
      return;
    }
    // Stop arrows and space from scrolling the page.
    event.preventDefault();
    if (event.repeat && NO_REPEAT.has(action)) {
      return;
    }
    onAction(action);
  };

  window.addEventListener("keydown", listener);
  return () => window.removeEventListener("keydown", listener);
}
