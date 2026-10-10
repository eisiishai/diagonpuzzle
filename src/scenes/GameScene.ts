import { Container, Text } from "pixi.js";
import type { TextStyleOptions } from "pixi.js";
import type { GameAudio } from "../audio/GameAudio";
import { fire } from "../game/simulate";
import type { ShotOutcome } from "../game/simulate";
import type { Board } from "../game/types";
import type { GameAction } from "../input/keyboard";
import { BoardView } from "../render/BoardView";

const CELL_SIZE = 64;
const TEXT_HEIGHT = 40;
const MESSAGE_HEIGHT = 60;

const OUTCOME_MESSAGES: Record<Exclude<ShotOutcome, "goal">, string> = {
  exit: "The pellet left the grid.",
  blocked: "The pellet hit a wall.",
  loop: "The pellet got stuck in a loop.",
};

const TEXT_STYLE: TextStyleOptions = {
  fill: 0xe8ecf4,
  fontSize: 20,
  fontFamily: "sans-serif",
};

export interface GameSceneOptions {
  board: Board;
  levelNumber: number;
  levelCount: number;
  levelName: string;
  audio: GameAudio;
  /** Called when the player continues after completing the level. */
  onNext: () => void;
}

/** Aiming: waiting for a shot. Firing: pellet in flight. Complete: goal reached. */
type Phase = "aiming" | "firing" | "complete";

/** One level: the board, the shot counter, status messages and sound. */
export class GameScene extends Container {
  private readonly options: GameSceneOptions;
  private readonly boardView: BoardView;
  private readonly statusText: Text;
  private readonly soundText: Text;
  private readonly messageText: Text;
  private readonly nextButton: Text;
  private phase: Phase = "aiming";
  private shots = 0;
  private selectedRow: number;

  constructor(options: GameSceneOptions) {
    super();
    this.options = options;
    const { board } = options;
    this.selectedRow = Math.floor(board.height / 2);

    this.boardView = new BoardView(board, CELL_SIZE, {
      onLaunch: (row) => this.fireFrom(row),
      onHover: (row) => this.select(row),
    });
    this.boardView.y = TEXT_HEIGHT;
    const width = this.boardView.contentWidth;

    this.statusText = new Text({ style: TEXT_STYLE });
    this.soundText = new Text({ style: TEXT_STYLE });
    this.soundText.eventMode = "static";
    this.soundText.cursor = "pointer";
    this.soundText.on("pointertap", () => this.toggleMute());

    this.messageText = new Text({
      text: "Aim with ↑/↓ and fire with Enter, or click an arrow.",
      style: { ...TEXT_STYLE, wordWrap: true, wordWrapWidth: width },
    });
    this.messageText.y = TEXT_HEIGHT + this.boardView.contentHeight + 16;

    const isLastLevel = options.levelNumber === options.levelCount;
    this.nextButton = new Text({
      text: isLastLevel ? "Play again from level 1 ▶" : "Next level ▶",
      style: { ...TEXT_STYLE, fill: 0x4ade80, fontWeight: "bold" },
    });
    // Bottom row, below room for a two-line message: next button on the
    // left, sound toggle on the right.
    this.nextButton.y = this.messageText.y + MESSAGE_HEIGHT;
    this.soundText.y = this.nextButton.y;
    this.nextButton.eventMode = "static";
    this.nextButton.cursor = "pointer";
    this.nextButton.visible = false;
    this.nextButton.on("pointertap", () => this.options.onNext());

    this.addChild(
      this.statusText,
      this.soundText,
      this.boardView,
      this.messageText,
      this.nextButton,
    );
    this.updateStatus();
    this.updateSoundText();
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
      case "toggleMute":
        this.toggleMute();
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
    this.updateStatus();
    this.messageText.text = "";
    this.options.audio.play("fire");

    const result = fire(this.options.board, row);
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
      this.messageText.text = `Level complete in ${this.shotCountText()}! Press Enter to continue.`;
      this.nextButton.visible = true;
      return;
    }

    this.phase = "aiming";
    audio.play(outcome === "blocked" ? "wall" : outcome);
    this.messageText.text = OUTCOME_MESSAGES[outcome];
  }

  private toggleMute(): void {
    this.options.audio.toggleMuted();
    this.updateSoundText();
  }

  private updateStatus(): void {
    const { levelNumber, levelCount, levelName } = this.options;
    this.statusText.text = `Level ${levelNumber}/${levelCount}: ${levelName}   ·   Shots: ${this.shots}`;
  }

  private updateSoundText(): void {
    this.soundText.text = this.options.audio.muted
      ? "🔇 Sound off (M)"
      : "🔊 Sound on (M)";
    this.soundText.x = this.boardView.contentWidth - this.soundText.width;
  }

  private shotCountText(): string {
    return this.shots === 1 ? "1 shot" : `${this.shots} shots`;
  }
}
