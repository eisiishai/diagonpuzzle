import { Container, Graphics, Text } from "pixi.js";
import type { GlowFilter } from "pixi-filters";
import type { GameAudio } from "../audio/GameAudio";
import type { GameAction } from "../input/keyboard";
import type { ChapterRange, LevelDefinition } from "../levels/levels";
import { prefersReducedMotion, pulse } from "../render/ambient";
import { easeInOutCubic, easeOutCubic } from "../render/easing";
import { drawCell } from "../render/cellGraphics";
import { arcPoints } from "../render/polyline";
import { SpectrumText } from "../render/spectrumText";
import { SCREEN_MARGIN, fitToScreen } from "../render/fitToScreen";
import { ScrollView } from "../render/ScrollView";
import {
  BONUS_COLORS,
  COLORS,
  createBloom,
  createGlow,
  textStyle,
} from "../render/theme";
import { AudioControls, Button } from "../render/ui";
import type { IconDrawer } from "../render/ui";
import {
  bonusLevelCount,
  goldenStarCount,
  hasAllBonuses,
  hasFoundAllBonuses,
  isCompleted,
  isSkipped,
  isUnlocked,
  nextLevelIndex,
  starCount,
} from "../save/progress";
import type { LevelSummary, Progress } from "../save/progress";
import { GAME_VERSION } from "../version";
import type { TitleTestState } from "../testState";
import type { Scene } from "./Scene";
import { STAR, levelListRow } from "./scoreText";
import type { LevelRowState } from "./scoreText";
import { nextMenuItem } from "./menuNavigation";
import type { MenuDirection } from "./menuNavigation";

const GAME_TITLE = "DIAGON PUZZLE";
const PLAY_WIDTH = 440;
/** Level tiles: size, and the gap between them. */
const TILE_SIZE = 54;
const TILE_GAP = 8;
/** The most tiles in a chapter's row (src/levels/levels.test.ts checks it). */
const MAX_TILES = 6;
const TILES_WIDTH = MAX_TILES * TILE_SIZE + (MAX_TILES - 1) * TILE_GAP;
/** On wide screens, chapter labels sit in a column left of the tiles. */
const LABEL_COLUMN = 200;
const LABEL_GAP = 20;
const WIDE_WIDTH = LABEL_COLUMN + LABEL_GAP + TILES_WIDTH;
const CHAPTER_GAP = 14;
/**
 * Room above and below the chapters inside the scrolling list, where a
 * selected tile's glow shows; it overlaps the gaps around the list.
 */
const LIST_PAD = 12;
/** The gap between the list's view and the line under it. */
const FOOTER_GAP = 14 - LIST_PAD;
/**
 * The screen shrinks to show at least this much of the list (about two
 * chapters on a phone); the list scrolls for the rest.
 */
const MIN_LIST_HEIGHT = 200;
/** Height kept for the selected level's name and score. */
const DETAIL_HEIGHT = 56;
/** The title beam fires once, a moment after the title screen appears. */
const BEAM_FIRE_MS = 400;
/** Time for the beam to cross, and for the crystal's flash on arrival. */
const BEAM_TRAVEL_MS = 420;
const CRYSTAL_FLASH_MS = 500;
/** The title's glow brightens for this long as the beam passes under it. */
const TITLE_FLARE_MS = 700;
const TITLE_GLOW = 1.5;

export interface TitleSceneOptions {
  levels: readonly LevelDefinition[];
  /** Where each chapter's levels are in `levels`. */
  chapters: readonly ChapterRange[];
  /** The same levels as `levels`, with what progress needs to know. */
  summaries: readonly LevelSummary[];
  progress: Progress;
  audio: GameAudio;
  onStartLevel: (index: number) => void;
  onResetProgress: () => void;
}

interface MenuItem {
  button: Button;
  activate: () => void;
  /** The level a tile starts, shown in the detail line when selected. */
  level?: number;
  /** A tile's chapter, scrolled into view when the tile is selected. */
  chapter?: ChapterView;
}

/** A chapter in the level list: its label and its levels' tiles. */
interface ChapterView {
  number: Text;
  name: Text;
  stars: Text;
  tiles: Button[];
  /** Where its label and tiles start and end in the scrolling list. */
  top: number;
  bottom: number;
}

/**
 * Title screen: play/continue, the levels in chapters of numbered tiles
 * (a list that scrolls when the screen is too short for it) with the
 * selected level's name and score, and settings.
 */
export class TitleScene extends Container implements Scene {
  private readonly items: MenuItem[] = [];
  private readonly resetItem: MenuItem;
  private readonly audioControls: AudioControls;
  private readonly titleBeam: TitleBeam;
  private readonly titleGlow: GlowFilter;
  private readonly audio: GameAudio;
  private readonly header: Container;
  private readonly levelRows: {
    state: LevelRowState;
    title: string;
    detail: string;
  }[] = [];
  private readonly chapterViews: ChapterView[] = [];
  /** The chapters, scrolling between the header and the footer. */
  private readonly levelList = new ScrollView();
  /** Everything under the level list: the detail line and settings. */
  private readonly footer = new Container();
  /** The chapter of the level Play starts, shown when the screen opens. */
  private readonly nextChapter: ChapterView | undefined;
  private readonly detailName: Text;
  private readonly detailScore: Text;
  private readonly version: Text;
  private readonly play: MenuItem;
  private readonly title: Text;
  /** The full height of the level list's content, and of the footer. */
  private listHeight = 0;
  private footerHeight = 0;
  private laidOut = false;
  /** Whether the chapters are laid out for a narrow screen; null before the first layout. */
  private narrow: boolean | null = null;
  private ambientMs = 0;
  private selected = 0;
  private resetArmed = false;

  constructor(options: TitleSceneOptions) {
    super();
    const { levels, chapters, summaries, progress, audio } = options;
    const levelIds = levels.map((level) => level.id);

    this.audio = audio;
    const title = new Text({ text: GAME_TITLE, style: textStyle("title") });
    title.anchor.set(0.5, 0);
    this.titleGlow = createGlow(COLORS.beam, TITLE_GLOW);
    title.filters = [this.titleGlow];
    this.addChild(title);
    this.title = title;
    this.titleBeam = new TitleBeam(
      title.width,
      title.height + 10,
      hasFoundAllBonuses(progress, summaries),
    );
    this.titleBeam.draw(prefersReducedMotion() ? 1 : 0);
    this.addChild(this.titleBeam);

    const next = nextLevelIndex(progress, levelIds);
    const completedCount = levelIds.filter((id) =>
      isCompleted(progress, id),
    ).length;
    const playLabel =
      completedCount === 0
        ? "PLAY ▶"
        : completedCount === levels.length
          ? "PLAY AGAIN FROM LEVEL 1 ▶"
          : `CONTINUE: LEVEL ${next + 1} ▶`;
    this.play = this.addItem(
      new Button({
        label: playLabel,
        variant: "primary",
        large: true,
        width: PLAY_WIDTH,
        onTap: () => options.onStartLevel(next),
        onHover: () => this.select(0),
      }),
      () => options.onStartLevel(next),
    );

    this.header = levelListHeader(progress, summaries);
    this.addChild(this.header, this.levelList, this.footer);
    const list = this.levelList.content;

    levels.forEach((level, index) => {
      this.levelRows.push(
        levelListRow(
          index + 1,
          level.name,
          level.minShots,
          isUnlocked(progress, levelIds, index),
          progress.levels[level.id]?.bestShots,
          isSkipped(progress, level.id),
          hasAllBonuses(progress, summaries[index]),
        ),
      );
    });
    chapters.forEach((chapter, c) => {
      const rows = this.levelRows.slice(chapter.start, chapter.end);
      const locked = rows.every((row) => row.state === "locked");
      const stars = rows.filter(
        (row) => row.state === "star" || row.state === "golden",
      ).length;
      const view: ChapterView = {
        number: new Text({
          text: String(c + 1).padStart(2, "0"),
          style: textStyle("value", {
            fontSize: 13,
            fill: COLORS.markingText,
          }),
        }),
        name: new Text({
          text: chapter.name.toUpperCase(),
          style: textStyle("label", {
            fontSize: 16,
            fontWeight: "700",
            letterSpacing: 1.6,
            fill: locked ? COLORS.markingText : COLORS.text,
          }),
        }),
        stars: new Text({
          text: locked ? "locked" : `${STAR} ${stars}/${rows.length}`,
          style: textStyle("value", { fontSize: 14 }),
        }),
        tiles: [],
        top: 0,
        bottom: 0,
      };
      list.addChild(view.number, view.name, view.stars);
      for (let index = chapter.start; index < chapter.end; index++) {
        const row = this.levelRows[index];
        const itemIndex = this.items.length;
        const tile = this.addItem(
          new Button({
            label: String(index + 1),
            tile: { icon: levelStateIcon(row.state), name: row.title },
            width: TILE_SIZE,
            height: TILE_SIZE,
            onTap: () => options.onStartLevel(index),
            onHover: () => this.select(itemIndex),
            allowTap: () => !this.levelList.dragged,
          }),
          () => options.onStartLevel(index),
          { level: index, chapter: view, parent: list },
        );
        tile.button.disabled = row.state === "locked";
        view.tiles.push(tile.button);
      }
      this.chapterViews.push(view);
    });
    this.nextChapter =
      this.chapterViews[
        chapters.findIndex(({ start, end }) => next >= start && next < end)
      ];

    this.detailName = new Text({ text: "", style: textStyle("body") });
    this.detailName.anchor.set(0.5, 0);
    this.detailScore = new Text({
      text: "",
      style: textStyle("value", { fontSize: 15 }),
    });
    this.detailScore.anchor.set(0.5, 0);
    this.footer.addChild(this.detailName, this.detailScore);
    this.showLevel(next);

    const resetIndex = this.items.length;
    const resetActivate = () => {
      if (this.resetArmed) {
        options.onResetProgress();
      } else {
        this.resetArmed = true;
        this.refresh();
      }
    };
    this.resetItem = this.addItem(
      new Button({
        label: "RESET PROGRESS",
        onTap: resetActivate,
        onHover: () => this.select(resetIndex),
      }),
      resetActivate,
      { parent: this.footer },
    );
    this.resetItem.button.disabled = completedCount === 0;
    this.resetItem.button.visible = completedCount > 0;

    this.audioControls = new AudioControls(audio, "center");
    this.footer.addChild(this.audioControls);

    this.version = new Text({
      text: GAME_VERSION,
      style: textStyle("value", { fontSize: 13 }),
    });
    this.version.anchor.set(0.5, 0);
    this.footer.addChild(this.version);

    this.arrange(false);
    this.refresh();
  }

  /** What the smoke tests' test hook reports (src/testHook.ts). */
  testState(): TitleTestState {
    return {
      header: allText(this.header),
      levels: this.levelRows.map(({ state, detail }) => ({ state, detail })),
      chapters: this.chapterViews.map(
        (view) => `${view.number.text} ${view.name.text} ${view.stars.text}`,
      ),
      detail: `${this.detailName.text} · ${this.detailScore.text}`,
      listView: this.levelList.viewBounds(),
    };
  }

  /**
   * Centres the scene in a screen of the given size, shrinking it to fit
   * its width and as much of the level list as MIN_LIST_HEIGHT; the list
   * scrolls for the rest. Chapter labels go left of their tiles where the
   * screen is wide enough, else above them.
   */
  layout(screenWidth: number, screenHeight: number): void {
    this.arrange(screenWidth - 2 * SCREEN_MARGIN < WIDE_WIDTH);
    // Items are centred on x = 0, so the bounds start at a negative x. The
    // list's own bounds are cut to its view, so its content is measured.
    const scene = this.getLocalBounds();
    const list = this.levelList.content.getLocalBounds();
    const x = Math.min(scene.x, list.x);
    const width = Math.max(scene.x + scene.width, list.x + list.width) - x;
    const fixedHeight = this.levelList.y + FOOTER_GAP + this.footerHeight;
    const area = (listHeight: number) => ({
      x,
      y: 0,
      width,
      height: fixedHeight + listHeight,
    });
    const { scale } = fitToScreen(
      area(Math.min(this.listHeight, MIN_LIST_HEIGHT)),
      screenWidth,
      screenHeight,
    );
    const viewHeight = Math.min(
      this.listHeight,
      Math.floor((screenHeight - 2 * SCREEN_MARGIN) / scale - fixedHeight),
    );
    this.levelList.setView(
      list.x - LIST_PAD,
      list.width + 2 * LIST_PAD,
      viewHeight,
      this.listHeight,
    );
    this.footer.y = this.levelList.y + viewHeight + FOOTER_GAP;
    const placement = fitToScreen(area(viewHeight), screenWidth, screenHeight);
    this.scale.set(placement.scale);
    this.position.set(placement.x, placement.y);

    // The screen opens on the chapter Play starts; after that, a resize
    // keeps the selected tile's chapter in view.
    const chapter = this.laidOut
      ? this.items[this.selected].chapter
      : this.nextChapter;
    if (chapter && !this.laidOut) {
      this.levelList.centre(chapter.top, chapter.bottom);
    } else if (chapter) {
      this.levelList.show(chapter.top, chapter.bottom, false);
    }
    this.laidOut = true;
  }

  handleAction(action: GameAction): void {
    switch (action) {
      case "selectUp":
        this.moveSelection("up");
        break;
      case "selectDown":
        this.moveSelection("down");
        break;
      case "selectLeft":
        this.moveSelection("left");
        break;
      case "selectRight":
        this.moveSelection("right");
        break;
      case "fire":
        if (!this.items[this.selected].button.disabled) {
          this.audio.play("click");
          this.items[this.selected].activate();
        }
        break;
      case "toggleMusic":
        this.audioControls.toggle("music");
        break;
      case "toggleEffects":
        this.audioControls.toggle("effects");
        break;
      default:
        break;
    }
  }

  /**
   * The title crystal pulses like the goal in the game. As the screen
   * appears, the title beam fires once: it shoots across from the left,
   * the title flares as it passes and the crystal flashes when it arrives;
   * then it stays still. Still from the start (the beam drawn in full) when
   * the player prefers reduced motion.
   */
  update(deltaMs: number): void {
    this.levelList.update(deltaMs);
    if (prefersReducedMotion()) {
      return;
    }
    this.ambientMs += deltaMs;
    const breath = pulse(this.ambientMs);
    let flash = 0;
    const cycle = this.ambientMs - BEAM_FIRE_MS;
    // The shot is over once the crystal's flash and the title's flare are.
    const shotMs = Math.max(TITLE_FLARE_MS, BEAM_TRAVEL_MS + CRYSTAL_FLASH_MS);
    if (cycle >= 0 && cycle < shotMs + deltaMs) {
      const arrived = cycle - BEAM_TRAVEL_MS;
      this.titleBeam.draw(
        easeInOutCubic(cycle / BEAM_TRAVEL_MS),
        arrived < 0 ? 0 : easeOutCubic(Math.min(1, arrived / CRYSTAL_FLASH_MS)),
      );
      if (arrived >= 0 && arrived < CRYSTAL_FLASH_MS) {
        flash = 1 - arrived / CRYSTAL_FLASH_MS;
      }
      const flare =
        cycle < TITLE_FLARE_MS
          ? Math.sin((Math.PI * cycle) / TITLE_FLARE_MS)
          : 0;
      this.titleGlow.outerStrength = TITLE_GLOW * (1 + 1.2 * flare);
    }
    this.titleBeam.crystal.scale.set(1 + 0.1 * breath + 0.35 * flash);
    this.titleBeam.crystal.alpha = Math.min(1, 0.8 + 0.2 * breath + flash);
  }

  /**
   * Adds a menu button to the scene, or to `parent` (the level list or the
   * footer); arrange() places it.
   */
  private addItem(
    button: Button,
    activate: () => void,
    {
      level,
      chapter,
      parent = this,
    }: { level?: number; chapter?: ChapterView; parent?: Container } = {},
  ): MenuItem {
    parent.addChild(button);
    const item = { button, activate, level, chapter };
    this.items.push(item);
    return item;
  }

  /** Places everything from the top down, centred on x = 0. */
  private arrange(narrow: boolean): void {
    if (narrow === this.narrow) {
      return;
    }
    this.narrow = narrow;
    let y = this.title.height + 10 + 40;
    const centre = (button: Button) => {
      button.position.set(-button.width / 2, y);
      y += button.height;
    };
    centre(this.play.button);
    y += 30;
    this.header.y = y;
    y += this.header.height + 16;
    this.levelList.y = y - LIST_PAD;

    // The chapters, in the list's own coordinates.
    y = LIST_PAD;
    const left = -(narrow ? TILES_WIDTH : WIDE_WIDTH) / 2;
    this.chapterViews.forEach((view, c) => {
      if (c > 0) {
        y += CHAPTER_GAP;
      }
      const { number, name, stars } = view;
      view.top = y;
      let tilesX = left + LABEL_COLUMN + LABEL_GAP;
      if (narrow) {
        // One line above the tiles: number and name left, stars right.
        number.position.set(left, y + 2);
        name.position.set(left + number.width + 10, y);
        stars.position.set(left + TILES_WIDTH - stars.width, y + 1);
        y += name.height + 6;
        tilesX = left;
      } else {
        // Three lines, centred beside the tiles.
        const top =
          y + (TILE_SIZE - (number.height + name.height + stars.height)) / 2;
        number.position.set(left, Math.round(top));
        name.position.set(left, Math.round(top + number.height));
        stars.position.set(left, Math.round(top + number.height + name.height));
      }
      view.tiles.forEach((tile, i) => {
        tile.position.set(tilesX + i * (TILE_SIZE + TILE_GAP), y);
      });
      y += TILE_SIZE;
      view.bottom = y;
    });
    this.listHeight = y + LIST_PAD;

    // The footer, in its own coordinates; layout() places it under the
    // list's view.
    y = 0;
    this.detailName.y = y;
    this.detailScore.y = y + this.detailName.height + 4;
    y += DETAIL_HEIGHT + 8;

    centre(this.resetItem.button);
    y += 24;
    this.audioControls.y = y;
    y += this.audioControls.height + 24;
    this.version.y = y;
    this.footerHeight = y + this.version.height;
  }

  /** Shows level `index`'s name and score in the line under the chapters. */
  private showLevel(index: number): void {
    const row = this.levelRows[index];
    if (row === undefined) {
      return;
    }
    const locked = row.state === "locked";
    this.detailName.text = locked ? `Level ${index + 1}` : row.title;
    this.detailName.style.fill = locked ? COLORS.markingText : COLORS.text;
    this.detailScore.text = locked ? "locked" : row.detail;
  }

  /**
   * Moves to the nearest enabled item in `direction`, if there is one, with
   * a soft tick.
   */
  private moveSelection(direction: MenuDirection): void {
    const centers = this.items.map(({ button }) => ({
      x: button.x + button.width / 2,
      y: this.unscrolledY(button) + button.height / 2,
    }));
    const enabled = this.items.map(
      ({ button }) => button.visible && !button.disabled,
    );
    const index = nextMenuItem(centers, enabled, this.selected, direction);
    if (index !== this.selected) {
      this.select(index);
      this.audio.play("tick");
      const { chapter } = this.items[index];
      if (chapter) {
        this.levelList.show(chapter.top, chapter.bottom, true);
      }
    }
  }

  /**
   * A button's top in the scene as if the level list were shown whole, so
   * that moving the selection follows the list's order, not what is
   * scrolled into view.
   */
  private unscrolledY(button: Button): number {
    if (button.parent === this.levelList.content) {
      return this.levelList.y + button.y;
    }
    if (button.parent === this.footer) {
      return this.footer.y + this.levelList.scrollRange + button.y;
    }
    return button.y;
  }

  private select(index: number): void {
    if (index === this.selected) {
      return;
    }
    this.selected = index;
    this.resetArmed = false;
    const level = this.items[index].level;
    if (level !== undefined) {
      this.showLevel(level);
    }
    this.refresh();
  }

  private refresh(): void {
    const reset = this.resetItem.button;
    reset.setLabel(
      this.resetArmed
        ? "PRESS ENTER OR CLICK AGAIN TO ERASE ALL PROGRESS"
        : "RESET PROGRESS",
    );
    reset.x = -reset.width / 2;
    this.items.forEach((item, index) => {
      item.button.selected = index === this.selected;
    });
  }
}

/**
 * The level list's header, centred on x = 0: stars earned at par, gold once
 * all are earned, and golden stars (all bonus targets of a level collected)
 * once there is at least one, since bonus targets are a hidden extra.
 */
function levelListHeader(
  progress: Progress,
  summaries: readonly LevelSummary[],
): Container {
  const stars = starCount(progress, summaries);
  const allAtPar = stars === summaries.length;
  const header = new Container();
  const par = new Text({
    text: `LEVELS  ·  ${STAR} ${stars}/${summaries.length}${allAtPar ? "  ·  ALL AT PAR!" : ""}`,
    style: textStyle("label", {
      fill: allAtPar ? COLORS.star : COLORS.dim,
    }),
  });
  header.addChild(par);
  const golden = goldenStarCount(progress, summaries);
  if (golden > 0) {
    const goldenText = new Text({
      text: `  ·  GOLDEN ${STAR} ${golden}/${bonusLevelCount(summaries)}`,
      style: textStyle("label", { fill: COLORS.star }),
    });
    goldenText.x = par.width;
    header.addChild(goldenText);
    if (hasFoundAllBonuses(progress, summaries)) {
      const separator = new Text({
        text: "  ·  ",
        style: textStyle("label", { fill: COLORS.star }),
      });
      separator.x = goldenText.x + goldenText.width;
      const mark = new SpectrumText("ALL FOUND!", textStyle("label"));
      mark.x = separator.x + separator.width + mark.width / 2;
      header.addChild(separator, mark);
    }
  }
  header.pivot.x = Math.round(header.width / 2);
  return header;
}

/**
 * A short laser beam under the title, ending in a goal crystal: the game's
 * idea in one line. Centred on x = 0 at height `y`. The beam can be drawn
 * part of the way, so it can fire across; the crystal pulses and flashes.
 * Once every bonus target is found (`prism`), the beam ends in the bonus
 * gem instead, which splits it into a small, still fan of the bonus
 * colours.
 */
class TitleBeam extends Container {
  readonly crystal: Graphics;
  private readonly beam = new Graphics();
  private readonly fan: Graphics | null;
  private readonly start: number;
  private readonly end: number;
  private readonly y0: number;

  constructor(width: number, y: number, prism: boolean) {
    super();
    const half = width / 2;
    const size = 11;
    this.start = -half;
    this.end = half - size * (prism ? 1.6 : 2);
    this.y0 = y;
    this.crystal = new Graphics();
    if (prism) {
      // The gem as on the board, about the crystal's size.
      drawCell(this.crystal, "bonus", size * 3.4, { hits: 0, required: 1 });
    } else {
      this.crystal
        .poly([0, -size, size, 0, 0, size, -size, 0])
        .fill(COLORS.success);
    }
    this.crystal.position.set(half - size, y);
    this.fan = prism ? new Graphics() : null;
    this.fan?.position.set(half - size, y);
    this.addChild(this.beam, ...(this.fan ? [this.fan] : []), this.crystal);
    this.filters = [createBloom()];
  }

  /**
   * Draws the beam from the left up to `fraction` (0–1) of its length, and
   * the prism's fan grown to `fan` (0–1) of its length.
   */
  draw(fraction: number, fan = fraction >= 1 ? 1 : 0): void {
    this.drawFan(fan);
    const g = this.beam.clear();
    const x = this.start + (this.end - this.start) * fraction;
    // Nothing until it has length: a line needs two distinct points.
    if (x - this.start < 0.5) {
      return;
    }
    g.moveTo(this.start, this.y0)
      .lineTo(x, this.y0)
      .stroke({ width: 10, color: COLORS.beam, alpha: 0.4, cap: "round" })
      .moveTo(this.start, this.y0)
      .lineTo(x, this.y0)
      .stroke({ width: 2, color: COLORS.beamCore, cap: "round" });
  }

  private drawFan(fraction: number): void {
    const g = this.fan?.clear();
    const length = 46 * fraction;
    if (!g || length < 0.5) {
      return;
    }
    BONUS_COLORS.forEach((color, i) => {
      const angle = (i - 2.5) * 0.085;
      g.moveTo(0, 0)
        .lineTo(Math.cos(angle) * length, Math.sin(angle) * length)
        .stroke({ width: 1.8, color, alpha: 0.75, cap: "round" });
    });
  }
}

/** All the text in `container` and its children, in drawing order. */
function allText(container: Container): string {
  return container.children
    .map((child) =>
      child instanceof Text
        ? child.visible
          ? child.text
          : ""
        : child instanceof Container
          ? allText(child)
          : "",
    )
    .join("");
}

/** The level list's icon for a level's state. */
function levelStateIcon(state: LevelRowState): IconDrawer {
  return (g, color) => {
    switch (state) {
      case "star":
      case "golden": {
        const points: number[] = [];
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + (i * Math.PI) / 5;
          const r = i % 2 ? 3.6 : 8.5;
          points.push(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        g.poly(points).fill(state === "golden" ? COLORS.star : COLORS.text);
        break;
      }
      case "done":
        g.moveTo(-6, 0).lineTo(-2, 4.5).lineTo(6.5, -5).stroke({
          width: 2.2,
          color: COLORS.success,
          cap: "round",
          join: "round",
        });
        break;
      case "open":
        g.poly([-4, -6, 6, 0, -4, 6]).fill(COLORS.beam);
        break;
      case "skipped":
        g.moveTo(-6, -5)
          .lineTo(-1, 0)
          .lineTo(-6, 5)
          .moveTo(1, -5)
          .lineTo(6, 0)
          .lineTo(1, 5)
          .stroke({ width: 2, color: COLORS.dim, cap: "round", join: "round" });
        break;
      case "locked": {
        g.roundRect(-6, -1, 12, 9, 2).fill(color);
        const [first, ...rest] = arcPoints(0, -2, 3.6, Math.PI, 2 * Math.PI, 6);
        g.moveTo(first.x, 1).lineTo(first.x, first.y);
        for (const p of rest) {
          g.lineTo(p.x, p.y);
        }
        g.lineTo(rest[rest.length - 1].x, 1).stroke({ width: 2, color });
        break;
      }
    }
  };
}
