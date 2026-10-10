import { Container, Text } from "pixi.js";
import type { GameAudio } from "../audio/GameAudio";
import { fire } from "../game/simulate";
import type { ShotOutcome } from "../game/simulate";
import type { Board } from "../game/types";
import type { GameAction } from "../input/keyboard";
import { BoardView } from "../render/BoardView";
import {
  SoundToggle,
  TEXT_STYLE,
  UI_COLORS,
  makeClickable,
} from "../render/ui";
import type { Scene } from "./Scene";

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
  audio: GameAudio;
  /** Records a completion; returns the level's best shot count before it, if any. */
  onComplete: (shots: number) => { previousBest?: number };
  /** Called when the player continues after completing the level. */
  onNext: () => void;
  /** Called when the player leaves for the title screen. */
  onMenu: () => void;
}

/** Aiming: waiting for a shot. Firing: pellet in flight. Complete: goal reached. */
type Phase = "aiming" | "firing" | "complete";

/** One level: the board, the shot counter, status messages and sound. */
export class GameScene extends Container implements Scene {
  private readonly options: GameSceneOptions;
  private readonly boardView: BoardView;
  private readonly shotsText: Text;
  private readonly soundToggle: SoundToggle;
  private readonly messageText: Text;
  private readonly nextButton: Text;
  private phase: Phase = "aiming";
  private shots = 0;
  private selectedRow: number;
  /** The board as changed by the shots so far. */
  private board: Board;

  constructor(options: GameSceneOptions) {
    super();
    this.options = options;
    const { board, levelNumber, levelCount, levelName } = options;
    this.board = board;
    this.selectedRow = Math.floor(board.height / 2);

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
    this.soundToggle = new SoundToggle(options.audio);
    this.soundToggle.anchor.set(1, 0);
    this.soundToggle.position.set(width, this.nextButton.y);

    this.addChild(
      levelText,
      menuButton,
      this.shotsText,
      restartButton,
      this.soundToggle,
      this.boardView,
      this.messageText,
      this.nextButton,
    );
    this.updateShots();
    this.boardView.setSelectedRow(this.selectedRow);
  }

  /** Centres the scene in a screen of the given size. */
  layout(screenWidth: number, screenHeight: number): void {
    const width = this.boardView.contentWidth;
    const height = this.nextButton.y + TEXT_HEIGHT;
    this.position.set(
      Math.round((screenWidth - width) / 2),
      Math.round((screenHeight - height) / 2),
    );
  }

  handleAction(action: GameAction): void {
    switch (action) {
      case "selectUp":
        this.select(this.selectedRow - 1);
        break;
      case "selectDown":
        this.select(this.selectedRow + 1);
        break;
      case "fire":
        if (this.phase === "complete") {
          this.options.onNext();
        } else {
          this.fireFrom(this.selectedRow);
        }
        break;
      case "back":
        this.options.onMenu();
        break;
      case "restart":
        this.restart();
        break;
      case "toggleMute":
        this.soundToggle.toggle();
        break;
    }
  }

  update(deltaMs: number): void {
    this.boardView.update(deltaMs);
  }

  private select(row: number): void {
    if (this.phase === "complete") {
      return;
    }
    const lastRow = this.options.board.height - 1;
    this.selectedRow = Math.max(0, Math.min(lastRow, row));
    this.boardView.setSelectedRow(this.selectedRow);
  }

  private fireFrom(row: number): void {
    if (this.phase !== "aiming") {
      return;
    }

    this.select(row);
    this.phase = "firing";
    this.shots++;
    this.updateShots();
    this.messageText.text = "";
    this.options.audio.play("fire");

    const result = fire(this.board, row);
    this.board = result.board;
    this.boardView.playShot(result, {
      onBounce: (bounceNumber) => this.options.audio.playBounce(bounceNumber),
      onFinish: () => this.finishShot(result.outcome),
    });
  }

  private finishShot(outcome: ShotOutcome): void {
    const { audio } = this.options;
    if (outcome === "goal") {
      this.phase = "complete";
      audio.play("goal");
      this.boardView.setSelectedRow(null);
      const { previousBest } = this.options.onComplete(this.shots);
      this.messageText.text = `Level complete in ${shotCount(this.shots)}!${bestText(this.shots, previousBest)} Press Enter to continue.`;
      this.nextButton.visible = true;
      return;
    }

    this.phase = "aiming";
    audio.play(outcome === "blocked" ? "wall" : outcome);
    this.messageText.text = OUTCOME_MESSAGES[outcome];
  }

  /** Puts the level back to its starting board, with no shots fired. */
  private restart(): void {
    this.board = this.options.board;
    this.boardView.showBoard(this.board);
    this.phase = "aiming";
    this.shots = 0;
    this.updateShots();
    this.messageText.text = INTRO_MESSAGE;
    this.nextButton.visible = false;
    this.boardView.setSelectedRow(this.selectedRow);
  }

  private updateShots(): void {
    this.shotsText.text = `Shots: ${this.shots}`;
  }
}

function shotCount(shots: number): string {
  return shots === 1 ? "1 shot" : `${shots} shots`;
}

function bestText(shots: number, previousBest: number | undefined): string {
  if (previousBest === undefined) {
    return "";
  }
  if (shots < previousBest) {
    return ` New best! (was ${previousBest})`;
  }
  return ` Best: ${shotCount(previousBest)}.`;
}
