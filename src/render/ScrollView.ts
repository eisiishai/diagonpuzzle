import { Container, Graphics, Rectangle } from "pixi.js";
import type { FederatedPointerEvent, FederatedWheelEvent } from "pixi.js";
import { prefersReducedMotion } from "./ambient";
import {
  clampScroll,
  dragVelocity,
  edgeFade,
  maxScroll,
  scrollPerThumb,
  scrollToShow,
  thumbPlace,
  wheelPixels,
} from "./scroll";
import { COLORS } from "./theme";
import type { DragSample } from "./scroll";

/** A press moving further than this (screen pixels) drags the list. */
const DRAG_THRESHOLD = 8;
/** Gliding to a new position closes the gap at this time constant. */
const GLIDE_MS = 70;
/** A fling after a drag slows at this time constant. */
const FLING_DECAY_MS = 325;
/** A fling stops below this speed (units per millisecond). */
const FLING_STOP = 0.02;
/** Room kept around a range scrolled into view. */
const SHOW_MARGIN = 8;
/**
 * The scroll bar: its width, where it starts from the view's right edge
 * (just inside, over the view's padding), and the extra width around it
 * that takes the pointer.
 */
const BAR_WIDTH = 5;
const BAR_OFFSET = -2;
const BAR_REACH = 6;
/** Clicking the bar's track scrolls this much of the view. */
const PAGE = 0.9;

/**
 * A vertically scrolling list: `content` (laid out from y = 0 down) shows
 * through a view of a set height, and scrolls with the mouse wheel, by
 * dragging (with a fling on release) and by show() for keyboard focus.
 * While there is more than fits, a scroll bar right of the view shows how
 * much and where; its thumb drags and its track pages. Items near an edge
 * with more beyond it fade. Call update() every frame. Gliding and flings
 * are left out when the player prefers reduced motion.
 */
export class ScrollView extends Container {
  readonly content = new Container();
  private readonly viewMask = new Graphics();
  private readonly bar = new Graphics();
  private barX = 0;
  private barHovered = false;
  private thumbDrag: {
    pointerId: number;
    startY: number;
    startScroll: number;
  } | null = null;
  private viewHeight = 0;
  private contentHeight = 0;
  private scroll = 0;
  private target = 0;
  private velocity = 0;
  private press: {
    pointerId: number;
    startY: number;
    startScroll: number;
    samples: DragSample[];
  } | null = null;
  private dragging = false;
  private _dragged = false;

  constructor() {
    super();
    this.addChild(this.content, this.bar, this.viewMask);
    this.mask = this.viewMask;
    this.hitArea = new Rectangle();
    this.eventMode = "static";
    // Measured by its content, not its view or scroll bar (a parent's
    // bounds would otherwise take in the bar and lose what is scrolled out).
    this.boundsArea = new Rectangle();
    this.bar.eventMode = "static";
    this.bar.cursor = "pointer";
    this.bar.on("pointerdown", (event) => this.pressBar(event));
    this.bar.on("globalpointermove", (event) => this.dragThumb(event));
    this.bar.on("pointerup", (event) => this.releaseThumb(event));
    this.bar.on("pointerupoutside", (event) => this.releaseThumb(event));
    this.bar.on("pointerover", () => this.setBarHovered(true));
    this.bar.on("pointerout", () => this.setBarHovered(false));
    this.on("pointerdown", (event) => this.startPress(event));
    this.on("globalpointermove", (event) => this.movePress(event));
    this.on("pointerup", (event) => this.endPress(event));
    this.on("pointerupoutside", (event) => this.endPress(event));
    this.on("wheel", (event) => this.wheel(event));
  }

  /**
   * Whether the last press dragged the list: the tap that ends it then
   * doesn't count (buttons in the list ask, see ButtonOptions.allowTap).
   */
  get dragged(): boolean {
    return this._dragged;
  }

  /** How far the content scrolls: how much of it is out of view. */
  get scrollRange(): number {
    return maxScroll(this.contentHeight, this.viewHeight);
  }

  /**
   * Sets the view: `width` wide from `x`, `height` tall, onto content
   * `contentHeight` tall, with the scroll bar at its right edge; keeps the
   * scroll position where it can.
   */
  setView(x: number, width: number, height: number, contentHeight: number) {
    this.viewHeight = height;
    this.contentHeight = contentHeight;
    this.barX = x + width + BAR_OFFSET;
    const right = this.barX + BAR_WIDTH + BAR_REACH;
    this.viewMask
      .clear()
      .rect(x, 0, right - x, height)
      .fill(0xffffff);
    this.hitArea = new Rectangle(x, 0, right - x, height);
    this.bar.hitArea = new Rectangle(
      this.barX - BAR_REACH,
      0,
      BAR_WIDTH + 2 * BAR_REACH,
      height,
    );
    this.scrollTo(this.target, false);
  }

  /**
   * The scroll bar's track and thumb on the screen, or null while
   * everything fits.
   */
  barBounds(): { track: Rectangle; thumb: Rectangle } | null {
    if (!this.bar.visible) {
      return null;
    }
    const thumb = this.thumb();
    return {
      track: this.screenRect(
        new Rectangle(this.barX, 0, BAR_WIDTH, this.viewHeight),
      ),
      thumb: this.screenRect(
        new Rectangle(this.barX, thumb.top, BAR_WIDTH, thumb.height),
      ),
    };
  }

  /** The view's area on the screen. */
  viewBounds(): Rectangle {
    // Not the mask's bounds: PixiJS doesn't measure a mask.
    return this.screenRect(this.hitArea as Rectangle);
  }

  /** A rectangle in the view's coordinates, on the screen. */
  private screenRect({ x, y, width, height }: Rectangle): Rectangle {
    const topLeft = this.toGlobal({ x, y });
    const bottomRight = this.toGlobal({ x: x + width, y: y + height });
    return new Rectangle(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y,
    );
  }

  /** Scrolls to `scroll`, gliding there if `animate`. */
  scrollTo(scroll: number, animate: boolean): void {
    this.velocity = 0;
    this.target = clampScroll(scroll, this.contentHeight, this.viewHeight);
    if (!animate || prefersReducedMotion()) {
      this.scroll = this.target;
      this.apply();
    }
  }

  /** Scrolls the least that shows content from `top` to `bottom`. */
  show(top: number, bottom: number, animate: boolean): void {
    this.scrollTo(
      scrollToShow(
        this.target,
        this.viewHeight,
        top - SHOW_MARGIN,
        bottom + SHOW_MARGIN,
      ),
      animate,
    );
  }

  /** Scrolls content from `top` to `bottom` to the middle of the view. */
  centre(top: number, bottom: number): void {
    this.scrollTo((top + bottom) / 2 - this.viewHeight / 2, false);
  }

  update(deltaMs: number): void {
    if (!this.dragging && this.velocity !== 0) {
      const fling = clampScroll(
        this.target + this.velocity * deltaMs,
        this.contentHeight,
        this.viewHeight,
      );
      this.velocity *= Math.exp(-deltaMs / FLING_DECAY_MS);
      if (Math.abs(this.velocity) < FLING_STOP || fling === this.target) {
        this.velocity = 0;
      }
      this.target = this.scroll = fling;
    }
    const gap = this.target - this.scroll;
    if (gap !== 0) {
      this.scroll =
        Math.abs(gap) < 0.5 || prefersReducedMotion()
          ? this.target
          : this.scroll + gap * (1 - Math.exp(-deltaMs / GLIDE_MS));
    }
    this.apply();
  }

  /** Content units per screen pixel's worth of pointer movement. */
  private get screenScale(): number {
    return this.worldTransform.d || 1;
  }

  /**
   * Moves the content to the scroll position, fades its edges and draws
   * the scroll bar.
   */
  private apply(): void {
    this.content.y = -Math.round(this.scroll);
    this.drawBar();
    const moreAbove = this.scroll > 0.5;
    const moreBelow = this.scroll < this.scrollRange - 0.5;
    for (const item of this.content.children) {
      const top = item.y - this.scroll;
      item.alpha = edgeFade(
        top,
        top + item.height,
        this.viewHeight,
        moreAbove,
        moreBelow,
      );
    }
  }

  private startPress(event: FederatedPointerEvent): void {
    this._dragged = false;
    this.dragging = false;
    // A press stops a fling or glide where it is.
    this.velocity = 0;
    this.target = this.scroll;
    this.press = {
      pointerId: event.pointerId,
      startY: event.global.y,
      startScroll: this.scroll,
      samples: [],
    };
  }

  private movePress(event: FederatedPointerEvent): void {
    const press = this.press;
    if (press === null || event.pointerId !== press.pointerId) {
      return;
    }
    const moved = event.global.y - press.startY;
    if (!this.dragging && Math.abs(moved) > DRAG_THRESHOLD) {
      this.dragging = true;
      this._dragged = true;
    }
    if (this.dragging) {
      this.scrollTo(press.startScroll - moved / this.screenScale, false);
      press.samples.push({ time: performance.now(), scroll: this.scroll });
    }
  }

  private endPress(event: FederatedPointerEvent): void {
    const press = this.press;
    if (press === null || event.pointerId !== press.pointerId) {
      return;
    }
    if (this.dragging && !prefersReducedMotion()) {
      this.velocity = dragVelocity(press.samples, performance.now());
    }
    this.press = null;
    this.dragging = false;
  }

  private wheel(event: FederatedWheelEvent): void {
    const pixels = wheelPixels(
      event.deltaY,
      event.deltaMode,
      this.viewHeight * this.screenScale,
    );
    this.scrollTo(this.target + pixels / this.screenScale, true);
  }

  /** The thumb's place on the track. */
  private thumb(): { top: number; height: number } {
    return thumbPlace(
      this.scroll,
      this.viewHeight,
      this.contentHeight,
      this.viewHeight,
    );
  }

  private drawBar(): void {
    const g = this.bar.clear();
    g.visible = this.scrollRange > 0;
    if (!g.visible) {
      return;
    }
    const radius = BAR_WIDTH / 2;
    const { top, height } = this.thumb();
    g.roundRect(this.barX, 0, BAR_WIDTH, this.viewHeight, radius)
      .fill({ color: COLORS.panelBorder, alpha: 0.6 })
      .roundRect(this.barX, top, BAR_WIDTH, height, radius)
      .fill(
        this.barHovered || this.thumbDrag !== null ? COLORS.beam : COLORS.dim,
      );
  }

  private setBarHovered(hovered: boolean): void {
    this.barHovered = hovered;
    this.drawBar();
  }

  /** A press on the thumb grabs it; one on the track pages towards it. */
  private pressBar(event: FederatedPointerEvent): void {
    // Not a press on the list: it mustn't drag the content too.
    event.stopPropagation();
    const y = this.toLocal(event.global).y;
    const { top, height } = this.thumb();
    if (y < top) {
      this.scrollTo(this.target - this.viewHeight * PAGE, true);
    } else if (y > top + height) {
      this.scrollTo(this.target + this.viewHeight * PAGE, true);
    } else {
      this.velocity = 0;
      this.thumbDrag = {
        pointerId: event.pointerId,
        startY: event.global.y,
        startScroll: this.scroll,
      };
      this.drawBar();
    }
  }

  private dragThumb(event: FederatedPointerEvent): void {
    const drag = this.thumbDrag;
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }
    const moved = (event.global.y - drag.startY) / this.screenScale;
    this.scrollTo(
      drag.startScroll +
        scrollPerThumb(
          moved,
          this.viewHeight,
          this.contentHeight,
          this.viewHeight,
        ),
      false,
    );
  }

  private releaseThumb(event: FederatedPointerEvent): void {
    if (this.thumbDrag?.pointerId === event.pointerId) {
      this.thumbDrag = null;
      this.drawBar();
    }
  }
}
