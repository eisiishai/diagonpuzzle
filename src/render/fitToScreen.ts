/** A rectangle in a scene's local coordinates. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Placement {
  scale: number;
  x: number;
  y: number;
}

/** Space kept free around the content, in screen pixels. */
export const SCREEN_MARGIN = 16;

/**
 * Scale and position that centre `content` on a screen of the given size,
 * shrinking it to fit inside the margin if needed. Content is never enlarged,
 * since text would get blurry.
 */
export function fitToScreen(
  content: Bounds,
  screenWidth: number,
  screenHeight: number,
): Placement {
  const availableWidth = Math.max(1, screenWidth - 2 * SCREEN_MARGIN);
  const availableHeight = Math.max(1, screenHeight - 2 * SCREEN_MARGIN);
  const scale = Math.min(
    1,
    availableWidth / content.width,
    availableHeight / content.height,
  );
  return {
    scale,
    x: Math.round(
      (screenWidth - content.width * scale) / 2 - content.x * scale,
    ),
    y: Math.round(
      (screenHeight - content.height * scale) / 2 - content.y * scale,
    ),
  };
}
