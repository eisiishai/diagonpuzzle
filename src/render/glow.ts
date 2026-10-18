import { Texture } from "pixi.js";

const SIZE = 256;
const cache = new Map<string, Texture>();

/**
 * A soft radial gradient as a texture, to stretch over any rectangle:
 * `stops` are [offset from the centre (0) to the edge (1), CSS colour].
 * Textures are made once per name and shared.
 */
function radialTexture(name: string, stops: [number, string][]): Texture {
  const cached = cache.get(name);
  if (cached) {
    return cached;
  }
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const half = SIZE / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [offset, color] of stops) {
    gradient.addColorStop(offset, color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const texture = Texture.from(canvas);
  cache.set(name, texture);
  return texture;
}

/** Darkens towards the corners: clear in the middle, dim at the edges. */
export function vignetteTexture(): Texture {
  return radialTexture("vignette", [
    [0, "rgba(0, 0, 0, 0)"],
    [0.5, "rgba(0, 0, 0, 0)"],
    [1, "rgba(0, 0, 0, 0.38)"],
  ]);
}

/**
 * A faint light, as if the board were lit from behind: white, for a
 * sprite to tint in the chapter's light.
 */
export function backLightTexture(): Texture {
  return radialTexture("backLight", [
    [0, "rgba(255, 255, 255, 0.45)"],
    [1, "rgba(255, 255, 255, 0)"],
  ]);
}
