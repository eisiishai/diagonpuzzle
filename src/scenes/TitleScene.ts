import { Container, Graphics, Text } from "pixi.js";
import type { GameAudio } from "../audio/GameAudio";
import type { GameAction } from "../input/keyboard";
import type { LevelDefinition } from "../levels/levels";
import { prefersReducedMotion, pulse } from "../render/ambient";
import { fitToScreen } from "../render/fitToScreen";
import { COLORS, createBloom, createGlow, textStyle } from "../render/theme";
import { AudioControls, Button } from "../render/ui";
import {
  isCompleted,
  isSkipped,
  isUnlocked,
  nextLevelIndex,
  starCount,
} from "../save/progress";
import type { Progress } from "../save/progress";
import { GAME_VERSION } from "../version";
import type { Scene } from "./Scene";
import { STAR, levelListLabel } from "./scoreText";

const GAME_TITLE = "DIAGON PUZZLE";
const LIST_WIDTH = 440;
const LEVEL_ROW_HEIGHT = 50;

export interface TitleSceneOptions {
  levels: readonly LevelDefinition[];
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
  private readonly titleCrystal: Graphics;
  private ambientMs = 0;
  private selected = 0;
  private resetArmed = false;

  constructor(options: TitleSceneOptions) {
    super();
    const { levels, progress, audio } = options;
    const levelIds = levels.map((level) => level.id);
    let y = 0;

    const title = new Text({ text: GAME_TITLE, style: textStyle("title") });
    title.anchor.set(0.5, 0);
    title.filters = [createGlow(COLORS.beam, 1.5)];
    this.addChild(title);
    y += title.height + 10;
    const beam = titleBeam(title.width, y);
    this.titleCrystal = beam.crystal;
    this.addChild(beam.view);
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

    const stars = starCount(progress, levels);
    const allAtPar = stars === levels.length;
    const header = new Text({
      text: `LEVELS  ·  ${STAR} ${stars}/${levels.length}${allAtPar ? "  ·  ALL AT PAR!" : ""}`,
      style: textStyle("label", {
        fill: allAtPar ? COLORS.star : COLORS.dim,
      }),
    });
    header.anchor.set(0.5, 0);
    header.y = y;
    this.addChild(header);
    y += header.height + 12;

    levels.forEach((level, index) => {
      const label = levelListLabel(
        index + 1,
        level.name,
        level.minShots,
        isUnlocked(progress, levelIds, index),
        progress.levels[level.id]?.bestShots,
        isSkipped(progress, level.id),
      );
      const itemIndex = this.items.length;
      const item = this.addItem(
        new Button({
          label,
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

  /** The title crystal pulses like the goal in the game. */
  update(deltaMs: number): void {
    if (prefersReducedMotion()) {
      return;
    }
    this.ambientMs += deltaMs;
    const breath = pulse(this.ambientMs);
    this.titleCrystal.scale.set(1 + 0.1 * breath);
    this.titleCrystal.alpha = 0.8 + 0.2 * breath;
  }

  /** Adds a centred menu button at `y`; keyboard selection follows the list. */
  private addItem(button: Button, y: number, activate: () => void): MenuItem {
    button.position.set(-button.width / 2, y);
    this.addChild(button);
    const item = { button, activate };
    this.items.push(item);
    return item;
  }

  /** Moves to the next enabled item in `step` direction, if there is one. */
  private moveSelection(step: number): void {
    for (
      let index = this.selected + step;
      index >= 0 && index < this.items.length;
      index += step
    ) {
      if (!this.items[index].button.disabled) {
        this.select(index);
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
 * A short laser beam under the title, ending in a goal crystal: the game's
 * idea in one line. Centred on x = 0 at height `y`. The crystal is returned
 * separately so it can pulse like the goal in the game.
 */
function titleBeam(
  width: number,
  y: number,
): { view: Container; crystal: Graphics } {
  const half = width / 2;
  const size = 11;
  const end = half - size * 2;
  const beam = new Graphics()
    .moveTo(-half, y)
    .lineTo(end, y)
    .stroke({ width: 10, color: COLORS.beam, alpha: 0.4, cap: "round" })
    .moveTo(-half, y)
    .lineTo(end, y)
    .stroke({ width: 2, color: COLORS.beamCore, cap: "round" });
  const crystal = new Graphics()
    .poly([0, -size, size, 0, 0, size, -size, 0])
    .fill(COLORS.success);
  crystal.position.set(half - size, y);
  const view = new Container();
  view.addChild(beam, crystal);
  view.filters = [createBloom()];
  return { view, crystal };
}
