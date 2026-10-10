import { Container, Text } from "pixi.js";
import type { GameAudio } from "../audio/GameAudio";
import { LevelSession } from "../game/LevelSession";
import type { ShotOutcome, ShotResult } from "../game/simulate";
import { earnsStar } from "../save/progress";
import type { Board } from "../game/types";
import type { GameAction } from "../input/keyboard";
import { BoardView } from "../render/BoardView";
import { Celebration } from "../render/Celebration";
import { fitToScreen } from "../render/fitToScreen";
import { COLORS, textStyle } from "../render/theme";
import { AudioControls, Button } from "../render/ui";
import type { Scene } from "./Scene";
import { STAR, completionMessage } from "./scoreText";

const CELL_SIZE = 64;
/** Height of a row of buttons. */
const ROW_HEIGHT = 44;
const ROW_GAP = 8;
const HEADER_HEIGHT = 2 * ROW_HEIGHT + ROW_GAP + 20;
const MESSAGE_HEIGHT = 64;
/** Narrowest the screen's content gets, whatever the board size. */
const MIN_SCENE_WIDTH = 600;
const INTRO_MESSAGE =
  "Aim with ↑/↓ and fire with Enter, or click an emitter. Mirrors turn when hit.";

/** How long the Skip button waits for its confirming second press. */
const SKIP_CONFIRM_MS = 3000;
const BREAKABLE_INTRO_MESSAGE =
  "Cracked walls stop the pellet and break: the next shot passes through.";
const BONUS_INTRO_MESSAGE =
  "A bonus target has appeared! Hitting it is optional and turns this level's star golden.";

const OUTCOME_MESSAGES: Record<
  Exclude<ShotOutcome, "goal" | "bonus">,
  string
> = {
  exit: "The pellet left the grid.",
  blocked: "The pellet hit a wall.",
  loop: "The pellet got stuck in a loop.",
};

export interface CompletionResult {
  /** The level's best shot count before this completion, if any. */
  previousBest?: number;
  /** True if this completion earned the last star: every level is at par. */
  allLevelsAtPar: boolean;
  /** Skips left after one was given back for this, if one was. */
  skipReturned?: number;
}

export interface BonusResult {
  /** True if this hit collected the level's last bonus target for the first time. */
  newlyGolden: boolean;
  /** The level's bonus targets collected so far, including this one. */
  collected: number;
  /** True if this was the last bonus target of the whole game. */
  allBonuses: boolean;
  /** Skips left after one was given back for this, if one was. */
  skipReturned?: number;
}

export interface GameSceneOptions {
  /** The level's starting board. */
  board: Board;
  levelNumber: number;
  levelCount: number;
  levelName: string;
  /** Shots needed for a star: the level's minimum shot count. */
  par: number;
  /** Goal hits needed to complete the level, each from a separate shot. */
  goalHits: number;
  /**
   * True if the level was completed or skipped before this visit: the next
   * level is then offered from the start, instead of the Skip button.
   */
  passedBefore: boolean;
  /** Visible skips left at the start, out of `maxSkips`; see setSkipsLeft(). */
  skipsLeft: number;
  maxSkips: number;
  /**
   * The level's bonus targets: whether they are shown (the level was
   * completed at par before this visit; collected ones too, so they can be
   * hit again), how many there are and how many were collected before.
   */
  bonus: { shown: boolean; total: number; collected: number };
  audio: GameAudio;
  /** Records a completion; returns the level's best shot count before it, if any. */
  onComplete: (shots: number) => CompletionResult;
  /** Records a bonus target hit at board cell (x, y). */
  onBonus: (x: number, y: number) => BonusResult;
  /** Called when the player continues after completing the level. */
  onNext: () => void;
  /** Called when the player leaves for the title screen. */
  onMenu: () => void;
  /** Called when the player skips the level with the Skip button. */
  onUseSkip: () => void;
  /**
   * Called when the player uses the hidden skip (Shift+N, or pressing and
   * holding the level name) to move on without completing the level. It
   * uses none of the visible skips.
   */
  onSkip: () => void;
}

/**
 * One level on screen: draws the LevelSession's state and plays its shots
 * with animation and sound. The rules of play live in LevelSession.
 */
export class GameScene extends Container implements Scene {
  private readonly options: GameSceneOptions;
  private readonly boardView: BoardView;
  private readonly shotsText: Text;
  private readonly audioControls: AudioControls;
  private readonly messageText: Text;
  private readonly nextButton: Button;
  private readonly skipButton: Button;
  /** Time left for the Skip button's confirming press; 0 when not armed. */
  private skipConfirmMs = 0;
  private skipsLeft: number;
  /** The level is completed or skipped, so the next level is offered. */
  private passed: boolean;
  /** Bottom edge of the scene's content. */
  private readonly contentHeight: number;
  /** Width of the scene's content: the board's, or the minimum. */
  private readonly sceneWidth: number;
  private readonly session: LevelSession;
  private readonly celebration = new Celebration();
  /** The level's bonus targets collected, in this visit or before. */
  private bonusesCollected: number;

  constructor(options: GameSceneOptions) {
    super();
    this.options = options;
    this.bonusesCollected = options.bonus.collected;
    this.passed = options.passedBefore;
    this.skipsLeft = options.skipsLeft;
    const { board, levelNumber, levelCount, levelName } = options;
    this.session = new LevelSession(board, options.goalHits);

    this.boardView = new BoardView(board, CELL_SIZE, {
      onLaunch: (row) => this.fireFrom(row),
      onHover: (row) => this.select(row),
    });
    this.boardView.y = HEADER_HEIGHT;
    // Narrow boards are centred in a minimum width, so the header and the
    // bottom row of buttons always fit.
    const width = Math.max(this.boardView.contentWidth, MIN_SCENE_WIDTH);
    this.sceneWidth = width;
    this.boardView.x = Math.round((width - this.boardView.contentWidth) / 2);

    // Header: level name and menu on the first row, shots and restart on the
    // second, so the rows fit even on narrow boards.
    const levelText = new Text({
      text: `LEVEL ${levelNumber}/${levelCount} · ${levelName.toUpperCase()}`,
      style: textStyle("heading"),
    });
    levelText.y = Math.round((ROW_HEIGHT - levelText.height) / 2);
    this.addHiddenSkip(levelText);
    const menuButton = new Button({
      label: "MENU · ESC",
      onTap: () => options.onMenu(),
    });
    menuButton.x = width - menuButton.width;

    const secondRow = ROW_HEIGHT + ROW_GAP;
    this.shotsText = new Text({ style: textStyle("value") });
    const restartButton = new Button({
      label: "RESTART · R",
      onTap: () => this.restart(),
    });
    restartButton.position.set(width - restartButton.width, secondRow);

    this.messageText = new Text({
      text: this.introMessage(),
      style: textStyle("body", { wordWrap: true, wordWrapWidth: width }),
    });
    this.messageText.y = HEADER_HEIGHT + this.boardView.contentHeight + 18;

    // Bottom row, below room for a two-line message: next or skip button on
    // the left, sound buttons on the right.
    const bottomRow = this.messageText.y + MESSAGE_HEIGHT;
    const isLastLevel = options.levelNumber === options.levelCount;
    this.nextButton = new Button({
      label: isLastLevel ? "BACK TO TITLE ▶" : "NEXT LEVEL ▶",
      variant: "primary",
      onTap: () => options.onNext(),
    });
    this.nextButton.y = bottomRow;
    this.skipButton = new Button({
      label: this.skipLabel(),
      onTap: () => this.pressSkip(),
    });
    this.skipButton.y = bottomRow;
    this.showNextButton(false);
    this.audioControls = new AudioControls(options.audio, "right");
    this.audioControls.position.set(width, bottomRow);
    this.contentHeight = bottomRow + ROW_HEIGHT;

    this.addChild(
      levelText,
      menuButton,
      this.shotsText,
      restartButton,
      this.audioControls,
      this.boardView,
      this.messageText,
      this.nextButton,
      this.skipButton,
      this.celebration,
    );
    this.updateShots();
    this.shotsText.y = secondRow + (ROW_HEIGHT - this.shotsText.height) / 2;
    this.boardView.setSelectedRow(this.session.selectedRow);
    this.boardView.setGoalHits(0, this.session.goalHits);
  }

  /** Centres the scene in a screen of the given size, shrinking it to fit. */
  layout(screenWidth: number, screenHeight: number): void {
    const { scale, x, y } = fitToScreen(
      {
        x: 0,
        y: 0,
        width: this.sceneWidth,
        height: this.contentHeight,
      },
      screenWidth,
      screenHeight,
    );
    this.scale.set(scale);
    this.position.set(x, y);
  }

  handleAction(action: GameAction): void {
    switch (action) {
      case "selectUp":
        this.select(this.session.selectedRow - 1);
        break;
      case "selectDown":
        this.select(this.session.selectedRow + 1);
        break;
      case "fire":
        if (this.session.phase === "complete") {
          this.options.onNext();
        } else {
          this.fireFrom(this.session.selectedRow);
        }
        break;
      case "back":
        this.options.onMenu();
        break;
      case "restart":
        this.restart();
        break;
      case "skipLevel":
        this.options.onSkip();
        break;
      case "toggleMusic":
        this.audioControls.toggle("music");
        break;
      case "toggleEffects":
        this.audioControls.toggle("effects");
        break;
    }
  }

  update(deltaMs: number): void {
    if (this.skipConfirmMs > 0) {
      this.skipConfirmMs -= deltaMs;
      if (this.skipConfirmMs <= 0) {
        this.disarmSkip();
      }
    }
    this.boardView.update(deltaMs);
    this.celebration.update(deltaMs);
  }

  private select(row: number): void {
    this.session.select(row);
    if (this.session.phase !== "complete") {
      this.boardView.setSelectedRow(this.session.selectedRow);
    }
  }

  private fireFrom(row: number): void {
    const result = this.session.fire(row);
    if (!result) {
      return;
    }

    this.boardView.setSelectedRow(this.session.selectedRow);
    this.updateShots();
    this.showMessage("");
    this.options.audio.play("fire");
    this.boardView.playShot(result, {
      onBounce: (bounceNumber) => this.options.audio.playBounce(bounceNumber),
      onFinish: () => this.finishShot(result),
    });
  }

  private finishShot(result: ShotResult): void {
    const { audio } = this.options;
    const outcome = this.session.finishShot();
    if (outcome === "bonus") {
      this.collectBonus(result);
      return;
    }
    if (outcome === "goal") {
      this.boardView.setGoalHits(this.session.hits, this.session.goalHits);
      this.updateShots();
      if (this.session.phase !== "complete") {
        // A goal hit that is not yet the last one: the board keeps its flips.
        audio.play("goal");
        const left = this.session.goalHits - this.session.hits;
        this.showMessage(
          `Goal hit! Hit it ${left === 1 ? "once more" : `${left} more times`} to finish.`,
          COLORS.success,
        );
        return;
      }
      const { shots } = this.session;
      this.boardView.setSelectedRow(null);
      const { previousBest, allLevelsAtPar, skipReturned } =
        this.options.onComplete(shots);
      this.celebrate(result, shots, allLevelsAtPar);
      this.showMessage(
        completionMessage(shots, this.options.par, previousBest) +
          this.skipReturnedText(skipReturned),
        COLORS.success,
      );
      this.passed = true;
      this.showNextButton(true);
      return;
    }

    if (outcome === "blocked" && result.path[result.path.length - 1].becomes) {
      audio.play("break");
      this.showMessage("The pellet broke a cracked wall.");
      return;
    }
    audio.play(outcome === "blocked" ? "wall" : outcome);
    this.showMessage(OUTCOME_MESSAGES[outcome]);
  }

  /**
   * Sound and effects for reaching the goal: a celebration at par, and a
   * bigger one when that earned the last star of the game.
   */
  private celebrate(
    result: ShotResult,
    shots: number,
    allLevelsAtPar: boolean,
  ): void {
    const { audio } = this.options;
    if (!allLevelsAtPar && !earnsStar(shots, this.options.par)) {
      audio.play("goal");
      return;
    }

    const { x, y } = this.shotEnd(result);
    if (allLevelsAtPar) {
      audio.play("allPar");
      this.celebration.allParCelebration(
        x,
        y,
        CELL_SIZE,
        this.sceneWidth,
        this.contentHeight,
        `${STAR} ALL LEVELS AT PAR! ${STAR}`,
      );
    } else {
      audio.play("par");
      this.celebration.parBurst(x, y, CELL_SIZE);
    }
  }

  /**
   * A bonus target hit: saved at once, with a burst in the bonus colours,
   * or a bigger celebration when it was the last one of the game.
   */
  private collectBonus(result: ShotResult): void {
    const { audio } = this.options;
    const end = result.path[result.path.length - 1];
    const { newlyGolden, allBonuses, collected, skipReturned } =
      this.options.onBonus(end.x, end.y);
    this.bonusesCollected = collected;
    this.updateShots();
    const { x, y } = this.shotEnd(result);
    if (allBonuses) {
      audio.play("allBonus");
      this.celebration.allBonusCelebration(
        x,
        y,
        CELL_SIZE,
        this.sceneWidth,
        this.contentHeight,
        `${STAR} ALL BONUS TARGETS FOUND! ${STAR}`,
      );
    } else {
      audio.play("bonus");
      this.celebration.bonusBurst(x, y, CELL_SIZE);
    }
    this.showMessage(
      (newlyGolden
        ? `Bonus target hit! This level's ${STAR} is now golden.`
        : "Bonus target hit!") + this.skipReturnedText(skipReturned),
      COLORS.star,
    );
  }

  /** Where a shot ended, in scene coordinates. */
  private shotEnd(result: ShotResult): { x: number; y: number } {
    const end = result.path[result.path.length - 1];
    const center = this.boardView.cellCenter(end.x, end.y);
    return { x: this.boardView.x + center.x, y: this.boardView.y + center.y };
  }

  /**
   * The hidden skip: pressing and holding the level name. Works the same
   * with a mouse and on touch screens. No cursor change or other hint, on
   * purpose.
   */
  private addHiddenSkip(levelText: Text): void {
    const HOLD_MS = 1200;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    levelText.eventMode = "static";
    levelText.on("pointerdown", () => {
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        this.options.onSkip();
      }, HOLD_MS);
    });
    levelText.on("pointerup", cancel);
    levelText.on("pointerupoutside", cancel);
    levelText.on("pointerleave", cancel);
    levelText.on("pointercancel", cancel);
    this.on("destroyed", cancel);
  }

  /** Puts the level back to its starting board, with no shots fired. */
  private restart(): void {
    this.session.restart();
    this.boardView.showBoard(this.session.board);
    this.boardView.setGoalHits(0, this.session.goalHits);
    this.updateShots();
    this.showMessage(this.introMessage());
    this.showNextButton(false);
    this.boardView.setSelectedRow(this.session.selectedRow);
  }

  /**
   * The next-level button: the main action once the level is complete in
   * this visit; before that an ordinary button, shown only if the level was
   * completed before (e.g. while going for its bonus target).
   */
  private showNextButton(complete: boolean): void {
    this.nextButton.visible = complete || this.passed;
    this.nextButton.setVariant(complete ? "primary" : "secondary");
    this.skipButton.visible = !this.nextButton.visible;
    this.disarmSkip();
  }

  /**
   * The Skip button skips the level on a second press within a few seconds,
   * so a stray tap doesn't use up a skip.
   */
  private pressSkip(): void {
    if (this.skipsLeft <= 0) {
      return;
    }
    if (this.skipConfirmMs > 0) {
      this.options.onUseSkip();
      return;
    }
    this.skipConfirmMs = SKIP_CONFIRM_MS;
    this.skipButton.setLabel(this.skipLabel());
  }

  /** Updates the Skip button when skips change while playing. */
  setSkipsLeft(skipsLeft: number): void {
    this.skipsLeft = skipsLeft;
    this.disarmSkip();
  }

  private disarmSkip(): void {
    this.skipConfirmMs = 0;
    this.skipButton.setLabel(this.skipLabel());
    this.skipButton.disabled = this.skipsLeft <= 0;
  }

  private skipLabel(): string {
    const { skipsLeft } = this;
    const { maxSkips } = this.options;
    if (skipsLeft <= 0) {
      return "NO SKIPS LEFT";
    }
    return this.skipConfirmMs > 0
      ? "PRESS AGAIN TO SKIP"
      : `SKIP LEVEL · ${skipsLeft}/${maxSkips}`;
  }

  /** A note for the message when a used skip was given back. */
  private skipReturnedText(skipsLeft: number | undefined): string {
    return skipsLeft === undefined
      ? ""
      : ` Skip returned (${skipsLeft}/${this.options.maxSkips}).`;
  }

  private showMessage(text: string, color: number = COLORS.text): void {
    this.messageText.text = text;
    this.messageText.style.fill = color;
  }

  private updateShots(): void {
    const pad = (n: number) => String(n).padStart(2, "0");
    const { shots, hits, goalHits } = this.session;
    const goal = goalHits > 1 ? `  ·  GOAL ${hits}/${goalHits}` : "";
    const { shown, total } = this.options.bonus;
    const bonus =
      shown && total > 0 ? `  ·  BONUS ${this.bonusesCollected}/${total}` : "";
    this.shotsText.text = `SHOTS ${pad(shots)}  ·  PAR ${pad(this.options.par)}${goal}${bonus}`;
  }

  /** The message shown when a level starts or restarts. */
  private introMessage(): string {
    const { goalHits, bonus } = this.options;
    if (bonus.shown && this.bonusesCollected < bonus.total) {
      return BONUS_INTRO_MESSAGE;
    }
    if (goalHits > 1) {
      return `This goal needs ${goalHits} hits, each from a separate shot. Mirrors stay flipped between shots.`;
    }
    const hasBreakable = this.options.board.cells.some((row) =>
      row.includes("breakable"),
    );
    return hasBreakable ? BREAKABLE_INTRO_MESSAGE : INTRO_MESSAGE;
  }
}
