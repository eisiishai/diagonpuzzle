import { Container, Graphics, Rectangle } from "pixi.js";
import type { FederatedPointerEvent, FederatedWheelEvent } from "pixi.js";
import { prefersReducedMotion } from "./ambient";
import {
  clampScroll,
  dragVelocity,
  edgeFade,
  maxScroll,
  scrollToShow,
  wheelPixels,
} from "./scroll";
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
 * A vertically scrolling list: `content` (laid out from y = 0 down) shows
 * through a view of a set height, and scrolls with the mouse wheel, by
 * dragging (with a fling on release) and by show() for keyboard focus.
 * Items near an edge with more beyond it fade. Call update() every frame.
 * Gliding and flings are left out when the player prefers reduced motion.
 */
export class ScrollView extends Container {
  readonly content = new Container();
  private readonly viewMask = new Graphics();
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
    this.addChild(this.content, this.viewMask);
    this.mask = this.viewMask;
    this.hitArea = new Rectangle();
    this.eventMode = "static";
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
   * `contentHeight` tall; keeps the scroll position where it can.
   */
  setView(x: number, width: number, height: number, contentHeight: number) {
    this.viewHeight = height;
    this.contentHeight = contentHeight;
    this.viewMask.clear().rect(x, 0, width, height).fill(0xffffff);
    this.hitArea = new Rectangle(x, 0, width, height);
    this.scrollTo(this.target, false);
  }

  /** The view's area on the screen. */
  viewBounds(): Rectangle {
    // Not the mask's bounds: PixiJS doesn't measure a mask.
    const { x, y, width, height } = this.hitArea as Rectangle;
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

  /** Moves the content to the scroll position and fades its edges. */
  private apply(): void {
    this.content.y = -Math.round(this.scroll);
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
}
