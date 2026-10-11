import { Container, Graphics, Text } from "pixi.js";
import type { GlowFilter } from "pixi-filters";
import type { GameAudio } from "../audio/GameAudio";
import type { GameAction } from "../input/keyboard";
import type { LevelDefinition } from "../levels/levels";
import { prefersReducedMotion, pulse } from "../render/ambient";
import { easeInOutCubic, easeOutCubic } from "../render/easing";
import { drawCell } from "../render/cellGraphics";
import { arcPoints } from "../render/polyline";
import { SpectrumText } from "../render/spectrumText";
import { fitToScreen } from "../render/fitToScreen";
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

const GAME_TITLE = "DIAGON PUZZLE";
const LIST_WIDTH = 440;
const LEVEL_ROW_HEIGHT = 50;
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
}

/** Title screen: play/continue, level select with best scores, settings. */
export class TitleScene extends Container implements Scene {
  private readonly items: MenuItem[] = [];
  private readonly resetItem: MenuItem;
  private readonly audioControls: AudioControls;
  private readonly contentHeight: number;
  private readonly titleBeam: TitleBeam;
  private readonly titleGlow: GlowFilter;
  private readonly audio: GameAudio;
  private readonly header: Container;
  private readonly levelRows: { state: LevelRowState; detail: string }[] = [];
  private ambientMs = 0;
  private selected = 0;
  private resetArmed = false;

  constructor(options: TitleSceneOptions) {
    super();
    const { levels, summaries, progress, audio } = options;
    const levelIds = levels.map((level) => level.id);
    let y = 0;

    this.audio = audio;
    const title = new Text({ text: GAME_TITLE, style: textStyle("title") });
    title.anchor.set(0.5, 0);
    this.titleGlow = createGlow(COLORS.beam, TITLE_GLOW);
    title.filters = [this.titleGlow];
    this.addChild(title);
    y += title.height + 10;
    this.titleBeam = new TitleBeam(
      title.width,
      y,
      hasFoundAllBonuses(progress, summaries),
    );
    this.titleBeam.draw(prefersReducedMotion() ? 1 : 0);
    this.addChild(this.titleBeam);
    y += 40;

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
    const play = this.addItem(
      new Button({
        label: playLabel,
        variant: "primary",
        large: true,
        width: LIST_WIDTH,
        onTap: () => options.onStartLevel(next),
        onHover: () => this.select(0),
      }),
      y,
      () => options.onStartLevel(next),
    );
    y += play.button.height + 30;

    const header = levelListHeader(progress, summaries);
    header.y = y;
    this.addChild(header);
    this.header = header;
    y += header.height + 12;

    levels.forEach((level, index) => {
      const row = levelListRow(
        index + 1,
        level.name,
        level.minShots,
        isUnlocked(progress, levelIds, index),
        progress.levels[level.id]?.bestShots,
        isSkipped(progress, level.id),
        hasAllBonuses(progress, summaries[index]),
      );
      this.levelRows.push({ state: row.state, detail: row.detail });
      const itemIndex = this.items.length;
      const item = this.addItem(
        new Button({
          label: row.title,
          row: { leading: levelStateIcon(row.state), detail: row.detail },
          width: LIST_WIDTH,
          onTap: () => options.onStartLevel(index),
          onHover: () => this.select(itemIndex),
        }),
        y,
        () => options.onStartLevel(index),
      );
      item.button.disabled = !isUnlocked(progress, levelIds, index);
      y += LEVEL_ROW_HEIGHT;
    });
    y += 16;

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
      y,
      resetActivate,
    );
    this.resetItem.button.disabled = completedCount === 0;
    this.resetItem.button.visible = completedCount > 0;
    y += this.resetItem.button.height + 24;

    this.audioControls = new AudioControls(audio, "center");
    this.audioControls.y = y;
    this.addChild(this.audioControls);
    y += this.audioControls.height + 24;

    const version = new Text({
      text: GAME_VERSION,
      style: textStyle("value", { fontSize: 13 }),
    });
    version.anchor.set(0.5, 0);
    version.y = y;
    this.addChild(version);
    this.contentHeight = y + version.height;

    this.refresh();
  }

  /** What the smoke tests' test hook reports (src/testHook.ts). */
  testState(): TitleTestState {
    return {
      header: allText(this.header),
      levels: this.levelRows,
    };
  }

  /** Centres the scene in a screen of the given size, shrinking it to fit. */
  layout(screenWidth: number, screenHeight: number): void {
    // Items are centred on x = 0, so the bounds start at a negative x.
    const bounds = this.getLocalBounds();
    const { scale, x, y } = fitToScreen(
      { x: bounds.x, y: 0, width: bounds.width, height: this.contentHeight },
      screenWidth,
      screenHeight,
    );
    this.scale.set(scale);
    this.position.set(x, y);
  }

  handleAction(action: GameAction): void {
    switch (action) {
      case "selectUp":
        this.moveSelection(-1);
        break;
      case "selectDown":
        this.moveSelection(1);
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
      case "back":
      case "skipLevel":
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

  /** Adds a centred menu button at `y`; keyboard selection follows the list. */
  private addItem(button: Button, y: number, activate: () => void): MenuItem {
    button.position.set(-button.width / 2, y);
    this.addChild(button);
    const item = { button, activate };
    this.items.push(item);
    return item;
  }

  /**
   * Moves to the next enabled item in `step` direction, if there is one,
   * with a soft tick.
   */
  private moveSelection(step: number): void {
    for (
      let index = this.selected + step;
      index >= 0 && index < this.items.length;
      index += step
    ) {
      if (!this.items[index].button.disabled) {
        this.select(index);
        this.audio.play("tick");
        return;
      }
    }
  }

  private select(index: number): void {
    if (index === this.selected) {
      return;
    }
    this.selected = index;
    this.resetArmed = false;
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
