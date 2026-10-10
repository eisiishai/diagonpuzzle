import { Container, Text } from "pixi.js";
import type { GameAudio } from "../audio/GameAudio";
import { LevelSession } from "../game/LevelSession";
import type { ShotOutcome } from "../game/simulate";
import type { Board } from "../game/types";
import type { GameAction } from "../input/keyboard";
import { BoardView } from "../render/BoardView";
import { fitToScreen } from "../render/fitToScreen";
import {
  AudioControls,
  TEXT_STYLE,
  UI_COLORS,
  makeClickable,
} from "../render/ui";
import type { Scene } from "./Scene";
import { completionMessage } from "./scoreText";

const CELL_SIZE = 64;
const TEXT_HEIGHT = 40;
const HEADER_ROW_HEIGHT = 30;
const HEADER_HEIGHT = 2 * HEADER_ROW_HEIGHT + 10;
const MESSAGE_HEIGHT = 60;
const INTRO_MESSAGE =
  "Aim with ↑/↓ and fire with Enter, or click an arrow. Mirrors turn when hit.";

const OUTCOME_MESSAGES: Record<Exclude<ShotOutcome, "goal">, string> = {
  exit: "The pellet left the grid.",
  blocked: "The pellet hit a wall.",
  loop: "The pellet got stuck in a loop.",
};

export interface GameSceneOptions {
  /** The level's starting board. */
  board: Board;
  levelNumber: number;
  levelCount: number;
  levelName: string;
  /** Shots needed for a star: the level's minimum shot count. */
  par: number;
  audio: GameAudio;
  /** Records a completion; returns the level's best shot count before it, if any. */
  onComplete: (shots: number) => { previousBest?: number };
  /** Called when the player continues after completing the level. */
  onNext: () => void;
  /** Called when the player leaves for the title screen. */
  onMenu: () => void;
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
  private readonly nextButton: Text;
  private readonly session: LevelSession;

  constructor(options: GameSceneOptions) {
    super();
    this.options = options;
    const { board, levelNumber, levelCount, levelName } = options;
    this.session = new LevelSession(board);

    this.boardView = new BoardView(board, CELL_SIZE, {
      onLaunch: (row) => this.fireFrom(row),
      onHover: (row) => this.select(row),
    });
    this.boardView.y = HEADER_HEIGHT;
    const width = this.boardView.contentWidth;

    // Header: level name and menu on the first row, shots and restart on the
    // second, so the rows fit even on narrow boards.
    const levelText = new Text({
      text: `Level ${levelNumber}/${levelCount}: ${levelName}`,
      style: TEXT_STYLE,
    });
    const menuButton = makeClickable(
      new Text({ text: "Menu (Esc)", style: TEXT_STYLE }),
      () => options.onMenu(),
    );
    menuButton.anchor.set(1, 0);
    menuButton.x = width;
    this.shotsText = new Text({ style: TEXT_STYLE });
    this.shotsText.y = HEADER_ROW_HEIGHT;
    const restartButton = makeClickable(
      new Text({ text: "Restart (R)", style: TEXT_STYLE }),
      () => this.restart(),
    );
    restartButton.anchor.set(1, 0);
    restartButton.position.set(width, HEADER_ROW_HEIGHT);

    this.messageText = new Text({
      text: INTRO_MESSAGE,
      style: { ...TEXT_STYLE, wordWrap: true, wordWrapWidth: width },
    });
    this.messageText.y = HEADER_HEIGHT + this.boardView.contentHeight + 16;

    const isLastLevel = options.levelNumber === options.levelCount;
    this.nextButton = new Text({
      text: isLastLevel ? "Back to title ▶" : "Next level ▶",
      style: { ...TEXT_STYLE, fill: UI_COLORS.success, fontWeight: "bold" },
    });
    // Bottom row, below room for a two-line message: next button on the
    // left, sound toggle on the right.
    this.nextButton.y = this.messageText.y + MESSAGE_HEIGHT;
    makeClickable(this.nextButton, () => options.onNext());
    this.nextButton.visible = false;
    this.audioControls = new AudioControls(options.audio, "right");
    this.audioControls.position.set(width, this.nextButton.y);

    this.addChild(
      levelText,
      menuButton,
      this.shotsText,
      restartButton,
      this.audioControls,
      this.boardView,
      this.messageText,
      this.nextButton,
    );
    this.updateShots();
    this.boardView.setSelectedRow(this.session.selectedRow);
  }

  /** Centres the scene in a screen of the given size, shrinking it to fit. */
  layout(screenWidth: number, screenHeight: number): void {
    const { scale, x, y } = fitToScreen(
      {
        x: 0,
        y: 0,
        width: this.boardView.contentWidth,
        height: this.nextButton.y + TEXT_HEIGHT,
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
      case "toggleMusic":
        this.audioControls.toggle("music");
        break;
      case "toggleEffects":
        this.audioControls.toggle("effects");
        break;
    }
  }

  update(deltaMs: number): void {
    this.boardView.update(deltaMs);
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
    this.messageText.text = "";
    this.options.audio.play("fire");
    this.boardView.playShot(result, {
      onBounce: (bounceNumber) => this.options.audio.playBounce(bounceNumber),
      onFinish: () => this.finishShot(),
    });
  }

  private finishShot(): void {
    const { audio } = this.options;
    const outcome = this.session.finishShot();
    if (outcome === "goal") {
      const { shots } = this.session;
      audio.play("goal");
      this.boardView.setSelectedRow(null);
      const { previousBest } = this.options.onComplete(shots);
      this.messageText.text = completionMessage(
        shots,
        this.options.par,
        previousBest,
      );
      this.nextButton.visible = true;
      return;
    }

    audio.play(outcome === "blocked" ? "wall" : outcome);
    this.messageText.text = OUTCOME_MESSAGES[outcome];
  }

  /** Puts the level back to its starting board, with no shots fired. */
  private restart(): void {
    this.session.restart();
    this.boardView.showBoard(this.session.board);
    this.updateShots();
    this.messageText.text = INTRO_MESSAGE;
    this.nextButton.visible = false;
    this.boardView.setSelectedRow(this.session.selectedRow);
  }

  private updateShots(): void {
    this.shotsText.text = `Shots: ${this.session.shots}  ·  Par: ${this.options.par}`;
  }
}
