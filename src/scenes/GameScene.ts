import { Container, Text } from "pixi.js";
import { fire } from "../game/simulate";
import type { ShotOutcome } from "../game/simulate";
import type { Board } from "../game/types";
import { BoardView } from "../render/BoardView";

const CELL_SIZE = 64;
const TEXT_HEIGHT = 40;

const OUTCOME_MESSAGES: Record<Exclude<ShotOutcome, "goal">, string> = {
  exit: "The pellet left the grid.",
  blocked: "The pellet hit a wall.",
  loop: "The pellet got stuck in a loop.",
};

/** One level: the board, the shot counter and a status message. */
export class GameScene extends Container {
  private readonly board: Board;
  private readonly boardView: BoardView;
  private readonly shotText: Text;
  private readonly messageText: Text;
  private shots = 0;
  private completed = false;

  constructor(board: Board) {
    super();
    this.board = board;

    const textStyle = {
      fill: 0xe8ecf4,
      fontSize: 22,
      fontFamily: "sans-serif",
    };
    this.shotText = new Text({ text: "", style: textStyle });
    this.messageText = new Text({
      text: "Click an arrow to fire.",
      style: textStyle,
    });
    this.boardView = new BoardView(board, CELL_SIZE, (row) =>
      this.fireFrom(row),
    );

    this.boardView.y = TEXT_HEIGHT;
    this.messageText.y = TEXT_HEIGHT + this.boardView.contentHeight + 16;
    this.addChild(this.shotText, this.boardView, this.messageText);
    this.updateShotText();
  }

  /** Centres the scene in a screen of the given size. */
  layout(screenWidth: number, screenHeight: number): void {
    const width = this.boardView.contentWidth;
    const height = this.messageText.y + TEXT_HEIGHT;
    this.position.set(
      Math.round((screenWidth - width) / 2),
      Math.round((screenHeight - height) / 2),
    );
  }

  private fireFrom(row: number): void {
    if (this.completed) {
      return;
    }

    const result = fire(this.board, row);
    this.shots++;
    this.updateShotText();
    this.boardView.showPath(result);

    if (result.outcome === "goal") {
      this.completed = true;
      this.messageText.text = `Level complete in ${this.shotCountText()}!`;
    } else {
      this.messageText.text = OUTCOME_MESSAGES[result.outcome];
    }
  }

  private updateShotText(): void {
    this.shotText.text = `Shots: ${this.shots}`;
  }

  private shotCountText(): string {
    return this.shots === 1 ? "1 shot" : `${this.shots} shots`;
  }
}
