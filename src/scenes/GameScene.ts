import { Container, Text } from "pixi.js";
import { columnPan } from "../audio/effects";
import type { GameAudio } from "../audio/GameAudio";
import { boardHas, cellPositions } from "../game/board";
import { FIXED_MIRRORS, GATE_CELLS, GLASS_MIRRORS } from "../game/cells";
import { firstShotHint } from "../game/hints";
import { LevelSession } from "../game/LevelSession";
import { MirrorPlacement } from "../game/MirrorPlacement";
import type { PlacementKey, PlacementResult } from "../game/MirrorPlacement";
import type { ShotOutcome, ShotResult } from "../game/simulate";
import type { BonusReport, CompletionReport } from "../save/GameProgress";
import { earnsStar } from "../save/progress";
import type { Board, MirrorType } from "../game/types";
import type { GameAction } from "../input/keyboard";
import { BoardSurround } from "../render/BoardSurround";
import { BoardView } from "../render/BoardView";
import { Celebration } from "../render/Celebration";
import { fitToScreen } from "../render/fitToScreen";
import { pathPoints } from "../render/pathPoints";
import { COLORS, textStyle } from "../render/theme";
import { AudioControls, Button } from "../render/ui";
import type { LevelTestState } from "../testState";
import type { Scene } from "./Scene";
import {
  STAR,
  completionMessage,
  firstShotHintMessage,
  hintLabel,
  introMessage,
} from "./scoreText";

const CELL_SIZE = 64;
/** Height of a row of buttons. */
const ROW_HEIGHT = 44;
const ROW_GAP = 8;
const HEADER_HEIGHT = 2 * ROW_HEIGHT + ROW_GAP + 20;
const MESSAGE_HEIGHT = 64;
/** Narrowest the screen's content gets, whatever the board size. */
const MIN_SCENE_WIDTH = 600;

/** Wide enough for the hint button's longest label, so it doesn't jump. */
const HINT_BUTTON_WIDTH = 168;
/** How long the Skip button waits for its confirming second press. */
const SKIP_CONFIRM_MS = 3000;
const PLACED_MESSAGE = "Mirror placed. It flips when hit, like the others.";
const TAP_AGAIN_MESSAGE = "Tap the cell again to place your mirror there.";
const KEYBOARD_PLACE_MESSAGE =
  "Choose a cell with the arrow keys, then press P or Enter to place your mirror. Esc cancels.";

/** Game actions while choosing the mirror's cell with the keyboard. */
const PLACEMENT_KEYS: Partial<Record<GameAction, PlacementKey>> = {
  selectUp: "up",
  selectDown: "down",
  selectLeft: "left",
  selectRight: "right",
  place: "place",
  fire: "place",
  back: "cancel",
};

const OUTCOME_MESSAGES: Record<
  Exclude<ShotOutcome, "goal" | "bonus">,
  string
> = {
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
  /** Goal hits needed to complete the level, each from a separate shot. */
  goalHits: number;
  /** A mirror the player may place once, on any empty cell, if the level gives one. */
  playerMirror?: MirrorType;
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
   * hit again), how many there are, how many were collected before, and
   * the starting board with them, which a restart brings in once the level
   * is completed at par in this visit.
   */
  bonus: { shown: boolean; total: number; collected: number; board: Board };
  /**
   * The level's hints (see docs/DESIGN.md, Hints): its text hint, how far
   * they are open at the start (see hintStage() in src/save/progress.ts),
   * and the time on the level's screen left before the second opens.
   */
  hint: { text: string; stage: 0 | 1 | 2; waitLeftMs: number };
  audio: GameAudio;
  /** Called when the player opens the level's text hint for the first time. */
  onOpenHint: () => void;
  /** Records a completion in `shots`; returns what it earned. */
  onComplete: (shots: number) => CompletionReport;
  /** Records a bonus target hit at board cell (x, y); returns what it earned. */
  onBonus: (x: number, y: number) => BonusReport;
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
  private readonly surround: BoardSurround;
  private readonly levelText: Text;
  private readonly shotsText: Text;
  private readonly audioControls: AudioControls;
  private readonly messageText: Text;
  private readonly nextButton: Button;
  private readonly skipButton: Button;
  private readonly hintButton: Button;
  /** How far the level's hints are open; see hintStage(). */
  private hintStage: 0 | 1 | 2;
  /** Time on the level's screen left before the second hint opens. */
  private hintWaitLeftMs: number;
  /** The hint the message shows now, if any; the next press shows the other. */
  private hintShown: 0 | 1 | 2 = 0;
  /** The hint button is lit: see updateHintButton(). */
  private hintLit = false;
  /** The second hint has been shown in this visit. */
  private secondHintSeen = false;
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
  /**
   * The level's bonus targets are on the board in play: shown from the
   * start of the visit, or brought in by a restart after par.
   */
  private bonusesInPlay: boolean;
  /** A restart brings in the bonus targets: the level is at par now. */
  private bonusesOnRestart = false;
  /** Choosing the cell for the player's mirror. */
  private readonly placement: MirrorPlacement;

  constructor(options: GameSceneOptions) {
    super();
    this.options = options;
    this.bonusesCollected = options.bonus.collected;
    this.bonusesInPlay = options.bonus.shown;
    this.passed = options.passedBefore;
    this.skipsLeft = options.skipsLeft;
    this.hintStage = options.hint.stage;
    this.hintWaitLeftMs = options.hint.waitLeftMs;
    const { board, levelNumber, levelCount, levelName } = options;
    this.session = new LevelSession(
      board,
      options.goalHits,
      options.playerMirror,
    );
    this.placement = new MirrorPlacement(this.session);

    this.boardView = new BoardView(board, CELL_SIZE, {
      onLaunch: (row) => this.fireFrom(row),
      onHover: (row) => this.select(row),
      onCellHover: (position, pointerType) => {
        this.placement.hover(position, pointerType);
        this.showPreview();
      },
      onCellTap: (position, pointerType) =>
        this.showPlacement(this.placement.tap(position, pointerType)),
    });
    this.boardView.y = HEADER_HEIGHT;
    // Narrow boards are centred in a minimum width, so the header and the
    // bottom row of buttons always fit.
    const width = Math.max(this.boardView.contentWidth, MIN_SCENE_WIDTH);
    this.sceneWidth = width;
    this.boardView.x = Math.round((width - this.boardView.contentWidth) / 2);
    this.surround = new BoardSurround(this.boardView.panelBounds, {
      topLeft: `${board.width} × ${board.height}`,
      topRight: `GOAL ×${options.goalHits}`,
      bottomLeft: `PAR ${options.par}`,
      bottomRight: `L${String(levelNumber).padStart(2, "0")}`,
    });
    this.surround.position.copyFrom(this.boardView.position);

    // Header: level name and menu on the first row, shots and restart on the
    // second, so the rows fit even on narrow boards.
    const levelText = new Text({
      text: `LEVEL ${levelNumber}/${levelCount} · ${levelName.toUpperCase()}`,
      style: textStyle("heading"),
    });
    this.levelText = levelText;
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

    // Bottom rows, below room for a two-line message: next or skip button
    // on the left and the hint button on the right, then the sound buttons
    // on the right of a row of their own.
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
    this.hintButton = new Button({
      label: hintLabel(this.hintStage, this.hintWaitLeftMs),
      width: HINT_BUTTON_WIDTH,
      onTap: () => this.showHint(),
    });
    this.updateHintButton();
    this.hintButton.position.set(width - HINT_BUTTON_WIDTH, bottomRow);
    this.showNextButton(false);
    this.audioControls = new AudioControls(options.audio, "right");
    const audioRow = bottomRow + ROW_HEIGHT + ROW_GAP;
    this.audioControls.position.set(width, audioRow);
    this.contentHeight = audioRow + ROW_HEIGHT;

    this.addChild(
      levelText,
      menuButton,
      this.shotsText,
      restartButton,
      this.audioControls,
      this.surround,
      this.boardView,
      this.messageText,
      this.nextButton,
      this.skipButton,
      this.hintButton,
      this.celebration,
    );
    this.updateShots();
    this.shotsText.y = secondRow + (ROW_HEIGHT - this.shotsText.height) / 2;
    this.boardView.setSelectedRow(this.session.selectedRow);
    this.boardView.setGoalHits(0, this.session.goalHits);
    this.boardView.setPlacing(this.session.mirrorInHand);
    this.boardView.playIntro();
    options.audio.play("levelStart");
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
    const placementKey = PLACEMENT_KEYS[action];
    if (this.placement.choosingByKeyboard && placementKey) {
      this.showPlacement(this.placement.key(placementKey));
      return;
    }
    switch (action) {
      case "selectUp":
        this.selectWithTick(this.session.selectedRow - 1);
        break;
      case "selectDown":
        this.selectWithTick(this.session.selectedRow + 1);
        break;
      case "fire":
        if (this.session.phase === "complete") {
          this.options.audio.play("click");
          this.options.onNext();
        } else {
          this.fireFrom(this.session.selectedRow);
        }
        break;
      case "place":
        if (this.placement.start()) {
          this.showPreview();
          this.showMessage(KEYBOARD_PLACE_MESSAGE);
        }
        break;
      case "back":
        this.options.onMenu();
        break;
      case "restart":
        this.restart();
        break;
      case "hint":
        this.options.audio.play("click");
        this.showHint();
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
    this.surround.alpha = this.boardView.panelAlpha;
    this.celebration.update(deltaMs);
  }

  /** The level's state for the browser smoke tests; see src/testHook.ts. */
  testState(): LevelTestState {
    const { session, boardView } = this;
    const center = (x: number, y: number) => {
      const { x: px, y: py } = boardView.toGlobal(boardView.cellCenter(x, y));
      return { x: px, y: py };
    };
    return {
      number: this.options.levelNumber,
      phase: session.phase,
      shots: session.shots,
      hits: session.hits,
      goalHits: session.goalHits,
      selectedRow: session.selectedRow,
      mirrorInHand: session.mirrorInHand,
      placementPreview: this.placement.preview?.position ?? null,
      message: this.messageText.text,
      levelName: centerOf(this.levelText),
      launchers: session.board.cells.map((_, y) => center(-1, y)),
      cells: session.board.cells.map((row, y) =>
        row.map((type, x) => ({ type, center: center(x, y) })),
      ),
      shown: boardView.shownCells(),
      banner: this.celebration.bannerText,
      hintStage: this.hintStage,
      hintRow: boardView.hintRow,
    };
  }

  /** Keyboard selection: a soft tick when the selected row changes. */
  private selectWithTick(row: number): void {
    const before = this.session.selectedRow;
    this.select(row);
    if (this.session.selectedRow !== before) {
      this.options.audio.play("tick");
    }
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

    this.placement.clear();
    this.showPreview();
    this.boardView.setSelectedRow(this.session.selectedRow);
    this.boardView.setHintRow(null);
    this.hintShown = 0;
    this.updateShots();
    this.showMessage("");
    this.options.audio.play("fire");
    const { width } = this.session.board;
    const portals = cellPositions(this.session.board, (c) => c === "portal");
    this.boardView.playShot(result, {
      onBounce: (bounceNumber, at) => {
        const pan = columnPan(at.x, width);
        // Through a portal, the sound ends where the pellet comes out.
        const exit = portals.find(({ x, y }) => x !== at.x || y !== at.y);
        this.options.audio.playBounce(
          bounceNumber,
          pan,
          at.bounceKind,
          at.bounceKind === "portal" && exit ? columnPan(exit.x, width) : pan,
        );
      },
      onGatePass: (at) =>
        this.options.audio.play("gatePass", columnPan(at.x, width)),
      onFinish: () => this.finishShot(result),
    });
  }

  /** Shows what a placement input did. */
  private showPlacement(result: PlacementResult): void {
    this.showPreview();
    switch (result) {
      case "placed": {
        const { x, y } = this.session.placedMirror!;
        this.boardView.setPlacing(false);
        this.boardView.placeMirror(x, y, this.session.board.cells[y][x]);
        this.options.audio.play("place");
        this.showMessage(PLACED_MESSAGE);
        this.updateShots();
        break;
      }
      case "previewed":
        this.showMessage(TAP_AGAIN_MESSAGE);
        break;
      case "cancelled":
        this.showMessage(this.introMessage());
        break;
    }
  }

  /** Marks where the player's mirror would go, or hides the mark. */
  private showPreview(): void {
    const { playerMirror } = this.session;
    if (playerMirror === undefined) {
      return;
    }
    const preview = this.placement.preview;
    this.boardView.showPlacePreview(
      preview?.position ?? null,
      playerMirror,
      preview?.placeable ?? false,
    );
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
      this.boardView.setPlacing(false);
      const {
        previousBest,
        allLevelsAtPar,
        secretAtPar,
        skipReturned,
        bonusesShown,
      } = this.options.onComplete(shots);
      if (bonusesShown && !this.bonusesInPlay) {
        this.bonusesOnRestart = true;
        this.session.setStartBoard(this.options.bonus.board);
      }
      this.celebrate(result, shots, allLevelsAtPar, secretAtPar);
      // The secret chapter's last star has its own ending; before it
      // opens, every level at par hints at the bonus targets.
      const hint = allLevelsAtPar && !secretAtPar;
      this.showMessage(
        completionMessage(shots, this.options.par, previousBest, hint) +
          this.skipReturnedText(skipReturned),
        COLORS.success,
      );
      this.passed = true;
      this.showNextButton(true);
      return;
    }

    // Wall hits and breaks sound from where they happen.
    const last = result.path[result.path.length - 1];
    const pan = columnPan(last.x, this.session.board.width);
    if (outcome === "blocked" && last.cell === "breakable") {
      audio.play("break", pan);
      this.showMessage("The pellet broke a cracked wall.");
      return;
    }
    if (outcome === "blocked" && GATE_CELLS.includes(last.cell)) {
      // In key with the shot: where its next bounce would have rung.
      const bounces = pathPoints(result).filter((p) => p.bounce).length;
      audio.playGateStop(bounces + 1, pan);
      this.showMessage(
        "A one-way gate stopped the pellet from the wrong side.",
      );
      return;
    }
    if (outcome === "blocked") {
      audio.play("wall", pan);
    } else {
      audio.play(outcome);
    }
    this.showMessage(OUTCOME_MESSAGES[outcome]);
  }

  /**
   * Sound and effects for reaching the goal: a celebration at par, a
   * bigger one when that earned the last star of the game, and the
   * rainbow one when it was the secret chapter's last (see docs/DESIGN.md,
   * Secret chapter).
   */
  private celebrate(
    result: ShotResult,
    shots: number,
    allLevelsAtPar: boolean,
    secretAtPar: boolean,
  ): void {
    const { audio } = this.options;
    if (!allLevelsAtPar && !earnsStar(shots, this.options.par)) {
      audio.play("goal");
      return;
    }

    const { x, y } = this.shotEnd(result);
    if (secretAtPar) {
      audio.play("prismPar");
      this.celebration.prismCelebration(
        x,
        y,
        CELL_SIZE,
        this.sceneWidth,
        this.contentHeight,
        `${STAR} PRISM AT PAR! ${STAR}`,
        "THANK YOU FOR PLAYING",
      );
    } else if (allLevelsAtPar) {
      audio.play("allPar");
      this.celebration.allParCelebration(
        x,
        y,
        CELL_SIZE,
        this.sceneWidth,
        this.contentHeight,
        `${STAR} ALL LEVELS AT PAR! ${STAR}`,
        "REPLAY A LEVEL: SOMETHING NEW AWAITS",
      );
    } else {
      audio.play("par");
      this.celebration.parBurst(x, y, CELL_SIZE);
    }
  }

  /**
   * A bonus target hit: saved at once, with a burst in the bonus colours,
   * or the game's ending when it was the last one (see docs/DESIGN.md,
   * Bonus targets).
   */
  private collectBonus(result: ShotResult): void {
    const { audio } = this.options;
    const end = result.path[result.path.length - 1];
    const { newlyGolden, allBonuses, secretOpened, collected, skipReturned } =
      this.options.onBonus(end.x, end.y);
    this.bonusesCollected = collected;
    this.updateShots();
    const { x, y } = this.shotEnd(result);
    if (allBonuses) {
      audio.play("allBonus");
      this.celebration.finale(
        x,
        y,
        CELL_SIZE,
        this.sceneWidth,
        this.contentHeight,
        `${STAR} ALL BONUS TARGETS FOUND! ${STAR}`,
        secretOpened ? "A HIDDEN CHAPTER HAS OPENED" : "THANK YOU FOR PLAYING",
      );
      this.boardView.playFinaleWave(end.x, end.y);
    } else {
      audio.play("bonus");
      this.celebration.bonusBurst(x, y, CELL_SIZE);
    }
    this.showMessage(
      (newlyGolden
        ? `Bonus target hit! This level's ${STAR} is now golden.`
        : "Bonus target hit!") +
        (secretOpened ? " A hidden chapter is now in the level list." : "") +
        this.skipReturnedText(skipReturned),
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
    this.bonusesInPlay ||= this.bonusesOnRestart;
    this.placement.clear();
    this.showPreview();
    this.boardView.showBoard(this.session.board);
    this.boardView.setPlacing(this.session.mirrorInHand);
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

  /**
   * The hint button: opens the text hint the first time; once the second
   * hint is open, shows it, and the text hint again on the next press.
   */
  private showHint(): void {
    if (this.hintStage === 0) {
      this.hintStage = 1;
      this.options.onOpenHint();
    }
    if (this.hintStage === 2 && this.hintShown !== 2) {
      // From the board the level starts with now: a restart after par
      // brings in the bonus target.
      const { goalHits, playerMirror, par } = this.options;
      const firstShot = firstShotHint(this.session.startBoard, par, {
        goalHits,
        playerMirror,
      });
      if (firstShot) {
        this.boardView.setHintRow(firstShot.row);
        this.showMessage(
          firstShotHintMessage(firstShot.placeFirst, this.session.shots),
          COLORS.hint,
        );
        this.hintShown = 2;
        this.secondHintSeen = true;
        this.updateHintButton();
        return;
      }
    }
    this.showMessage(`Hint: ${this.options.hint.text}`, COLORS.hint);
    this.hintShown = 1;
    this.updateHintButton();
  }

  /** Counts down the wait for the second hint on the hint button. */
  setHintWaitLeft(ms: number): void {
    this.hintWaitLeftMs = ms;
    this.updateHintButton();
  }

  /** The second hint has opened: the hint button offers it. */
  openSecondHint(): void {
    this.hintStage = 2;
    this.updateHintButton();
  }

  private updateHintButton(): void {
    const label = hintLabel(this.hintStage, this.hintWaitLeftMs);
    if (this.hintButton.label !== label) {
      this.hintButton.setLabel(label);
    }
    // Lit until the newly opened second hint has been seen.
    const lit = this.hintStage === 2 && !this.secondHintSeen;
    if (lit !== this.hintLit) {
      this.hintLit = lit;
      this.hintButton.setVariant(lit ? "primary" : "secondary");
    }
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
    const { total } = this.options.bonus;
    const bonus =
      this.bonusesInPlay && total > 0
        ? `  ·  BONUS ${this.bonusesCollected}/${total}`
        : "";
    const mirror =
      this.session.playerMirror === undefined
        ? ""
        : `  ·  MIRROR ×${this.session.mirrorInHand ? 1 : 0}`;
    this.shotsText.text = `SHOTS ${pad(shots)}  ·  PAR ${pad(this.options.par)}${goal}${mirror}${bonus}`;
  }

  /** The message shown when a level starts or restarts. */
  private introMessage(): string {
    const { goalHits, bonus, playerMirror, board } = this.options;
    return introMessage({
      bonusToFind: this.bonusesInPlay && this.bonusesCollected < bonus.total,
      playerMirror,
      goalHits,
      hasBreakable: boardHas(board, ["breakable"]),
      hasReflector: boardHas(board, ["reflector"]),
      hasGlass: boardHas(board, GLASS_MIRRORS),
      hasFixed: boardHas(board, FIXED_MIRRORS),
      hasPortal: boardHas(board, ["portal"]),
      hasGate: boardHas(board, GATE_CELLS),
    });
  }
}

/** The centre of `view` on the canvas, for the test hook. */
function centerOf(view: Container): { x: number; y: number } {
  const bounds = view.getBounds();
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}
