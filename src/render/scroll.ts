// The arithmetic of a scrolling list (ScrollView.ts): where it may scroll,
// what to scroll to so something shows, the fade at its edges and the
// speed a drag leaves it with. Positions are in the list's own units, 0 at
// the top of its content.

/** Pixels a wheel "line" scrolls, for wheels that count in lines. */
const WHEEL_LINE = 16;
/** Items fade out over this distance from an edge with more beyond it. */
const FADE_DISTANCE = 40;
/** The faintest an item at an edge gets, so it still shows. */
const MIN_FADE = 0.15;
/** A drag's speed is measured over its last this many milliseconds. */
const VELOCITY_WINDOW_MS = 100;

/** The furthest content `contentHeight` tall scrolls in a view `viewHeight` tall. */
export function maxScroll(contentHeight: number, viewHeight: number): number {
  return Math.max(0, contentHeight - viewHeight);
}

/** `scroll` kept between the top and the furthest the content scrolls. */
export function clampScroll(
  scroll: number,
  contentHeight: number,
  viewHeight: number,
): number {
  return Math.min(Math.max(scroll, 0), maxScroll(contentHeight, viewHeight));
}

/**
 * The scroll position nearest `scroll` that shows content from `top` to
 * `bottom` in a view `viewHeight` tall; its top if it doesn't all fit.
 */
export function scrollToShow(
  scroll: number,
  viewHeight: number,
  top: number,
  bottom: number,
): number {
  if (top < scroll || bottom - top > viewHeight) {
    return top;
  }
  if (bottom > scroll + viewHeight) {
    return bottom - viewHeight;
  }
  return scroll;
}

/** A wheel event's distance in pixels: its delta can count lines or pages. */
export function wheelPixels(
  deltaY: number,
  deltaMode: number,
  pageHeight: number,
): number {
  if (deltaMode === 1) {
    return deltaY * WHEEL_LINE;
  }
  if (deltaMode === 2) {
    return deltaY * pageHeight;
  }
  return deltaY;
}

/**
 * The opacity of an item from `top` to `bottom` (in the view: 0 at its top
 * edge): it fades towards an edge that has more content beyond it, so the
 * list shows that it goes on.
 */
export function edgeFade(
  top: number,
  bottom: number,
  viewHeight: number,
  moreAbove: boolean,
  moreBelow: boolean,
): number {
  const centre = (top + bottom) / 2;
  let alpha = 1;
  if (moreAbove) {
    alpha = Math.min(alpha, centre / FADE_DISTANCE);
  }
  if (moreBelow) {
    alpha = Math.min(alpha, (viewHeight - centre) / FADE_DISTANCE);
  }
  return Math.min(1, Math.max(MIN_FADE, alpha));
}

/** Where a drag had scrolled the list, and when (milliseconds). */
export interface DragSample {
  time: number;
  scroll: number;
}

/**
 * The scrolling speed (units per millisecond) a drag released at `now`
 * leaves, from its last moments: 0 if it was held still before release.
 */
export function dragVelocity(
  samples: readonly DragSample[],
  now: number,
): number {
  const recent = samples.filter(
    (sample) => sample.time >= now - VELOCITY_WINDOW_MS,
  );
  if (recent.length < 2) {
    return 0;
  }
  const first = recent[0];
  const last = recent[recent.length - 1];
  const time = last.time - first.time;
  return time > 0 ? (last.scroll - first.scroll) / time : 0;
}

/** The shortest a scroll bar's thumb gets, so it stays easy to grab. */
const MIN_THUMB = 28;

/**
 * A scroll bar's thumb on a track `trackHeight` tall: its length shows how
 * much of the content is in view, its place where the view is.
 */
export function thumbPlace(
  scroll: number,
  viewHeight: number,
  contentHeight: number,
  trackHeight: number,
): { top: number; height: number } {
  const range = maxScroll(contentHeight, viewHeight);
  const height = Math.min(
    trackHeight,
    Math.max(MIN_THUMB, (trackHeight * viewHeight) / contentHeight),
  );
  const travel = trackHeight - height;
  return { top: range > 0 ? (travel * scroll) / range : 0, height };
}

/** How far the content scrolls for the thumb moving `distance` along its track. */
export function scrollPerThumb(
  distance: number,
  viewHeight: number,
  contentHeight: number,
  trackHeight: number,
): number {
  const travel =
    trackHeight - thumbPlace(0, viewHeight, contentHeight, trackHeight).height;
  return travel > 0
    ? (distance * maxScroll(contentHeight, viewHeight)) / travel
    : 0;
}
