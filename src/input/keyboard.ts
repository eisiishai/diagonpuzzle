export type GameAction =
  "selectUp" | "selectDown" | "fire" | "back" | "toggleMute";

const KEY_ACTIONS: Partial<Record<string, GameAction>> = {
  ArrowUp: "selectUp",
  w: "selectUp",
  ArrowDown: "selectDown",
  s: "selectDown",
  Enter: "fire",
  " ": "fire",
  Escape: "back",
  m: "toggleMute",
};

/** Actions that should not repeat while the key is held down. */
const NO_REPEAT: ReadonlySet<GameAction> = new Set([
  "fire",
  "back",
  "toggleMute",
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
    const action = KEY_ACTIONS[key];
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
