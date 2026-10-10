import { Container, Text } from "pixi.js";
import type { GameAudio } from "../audio/GameAudio";
import type { GameAction } from "../input/keyboard";
import type { LevelDefinition } from "../levels/levels";
import { fitToScreen } from "../render/fitToScreen";
import {
  AudioControls,
  TEXT_STYLE,
  UI_COLORS,
  makeClickable,
} from "../render/ui";
import { isCompleted, isUnlocked, nextLevelIndex } from "../save/progress";
import type { Progress } from "../save/progress";
import { GAME_VERSION } from "../version";
import type { Scene } from "./Scene";
import { STAR, earnsStar, levelListLabel } from "./scoreText";

const GAME_TITLE = "Diagon Puzzle";
const LEVEL_ROW_HEIGHT = 36;

export interface TitleSceneOptions {
  levels: readonly LevelDefinition[];
  progress: Progress;
  audio: GameAudio;
  onStartLevel: (index: number) => void;
  onResetProgress: () => void;
}

interface MenuItem {
  text: Text;
  enabled: boolean;
  activate: () => void;
}

/** Title screen: play/continue, level select with best scores, settings. */
export class TitleScene extends Container implements Scene {
  private readonly items: MenuItem[] = [];
  private readonly resetItem: MenuItem;
  private readonly audioControls: AudioControls;
  private readonly contentHeight: number;
  private selected = 0;
  private resetArmed = false;

  constructor(options: TitleSceneOptions) {
    super();
    const { levels, progress, audio } = options;
    const levelIds = levels.map((level) => level.id);
    let y = 0;

    const title = this.addCentered(
      new Text({
        text: GAME_TITLE,
        style: { ...TEXT_STYLE, fontSize: 56, fontWeight: "bold" },
      }),
      y,
    );
    y += title.height + 32;

    const next = nextLevelIndex(progress, levelIds);
    const completedCount = levelIds.filter((id) =>
      isCompleted(progress, id),
    ).length;
    const playLabel =
      completedCount === 0
        ? "Play"
        : completedCount === levels.length
          ? "Play again from level 1"
          : `Continue: level ${next + 1}`;
    const play = this.addCentered(
      new Text({
        text: playLabel,
        style: { ...TEXT_STYLE, fontSize: 28, fontWeight: "bold" },
      }),
      y,
    );
    this.addItem(play, true, () => options.onStartLevel(next));
    y += play.height + 36;

    const stars = levels.filter((level) => {
      const best = progress.levels[level.id]?.bestShots;
      return best !== undefined && earnsStar(best, level.minShots);
    }).length;
    const header = this.addCentered(
      new Text({
        text: `LEVELS  ·  ${STAR} ${stars}/${levels.length}`,
        style: { ...TEXT_STYLE, fontSize: 16, fill: UI_COLORS.dim },
      }),
      y,
    );
    y += header.height + 12;

    levels.forEach((level, index) => {
      const unlocked = isUnlocked(progress, levelIds, index);
      const best = progress.levels[level.id]?.bestShots;
      const label = levelListLabel(
        index + 1,
        level.name,
        level.minShots,
        unlocked,
        best,
      );
      const text = this.addCentered(
        new Text({ text: label, style: TEXT_STYLE }),
        y,
      );
      this.addItem(text, unlocked, () => options.onStartLevel(index));
      y += LEVEL_ROW_HEIGHT;
    });
    y += 20;

    const reset = this.addCentered(
      new Text({ style: { ...TEXT_STYLE, fontSize: 16 } }),
      y,
    );
    this.resetItem = this.addItem(reset, completedCount > 0, () => {
      if (this.resetArmed) {
        options.onResetProgress();
      } else {
        this.resetArmed = true;
        this.refresh();
      }
    });
    y += reset.height + 28;

    this.audioControls = new AudioControls(audio, "center");
    this.audioControls.y = y;
    this.addChild(this.audioControls);
    y += this.audioControls.height + 24;

    const version = this.addCentered(
      new Text({
        text: GAME_VERSION,
        style: { ...TEXT_STYLE, fontSize: 14, fill: UI_COLORS.dim },
      }),
      y,
    );
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
        this.items[this.selected].activate();
        break;
      case "toggleMusic":
        this.audioControls.toggle("music");
        break;
      case "toggleEffects":
        this.audioControls.toggle("effects");
        break;
      case "back":
        break;
    }
  }

  update(): void {}

  private addCentered<T extends Text>(text: T, y: number): T {
    text.anchor.set(0.5, 0);
    text.y = y;
    this.addChild(text);
    return text;
  }

  private addItem(
    text: Text,
    enabled: boolean,
    activate: () => void,
  ): MenuItem {
    const item = { text, enabled, activate };
    const index = this.items.length;
    this.items.push(item);
    if (enabled) {
      makeClickable(text, activate, () => this.select(index));
    }
    return item;
  }

  /** Moves to the next enabled item in `step` direction, if there is one. */
  private moveSelection(step: number): void {
    for (
      let index = this.selected + step;
      index >= 0 && index < this.items.length;
      index += step
    ) {
      if (this.items[index].enabled) {
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
    this.resetItem.text.text = this.resetArmed
      ? "Press Enter or click again to erase all progress"
      : "Reset progress";
    this.items.forEach((item, index) => {
      item.text.style.fill = !item.enabled
        ? UI_COLORS.dim
        : index === this.selected
          ? UI_COLORS.highlight
          : UI_COLORS.text;
    });
    this.resetItem.text.visible = this.resetItem.enabled;
  }
}
