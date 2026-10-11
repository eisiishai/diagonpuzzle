import { Container, Text } from "pixi.js";
import type { TextStyleOptions } from "pixi.js";
import { BONUS_COLORS, COLORS } from "./theme";

/** One letter of a SpectrumText and the bonus colour it lights up in. */
export interface SpectrumLetter {
  view: Text;
  color: number;
}

/** Characters that keep the text colour instead of a bonus colour. */
const PLAIN = " ·";

/**
 * Text drawn letter by letter, each letter in the next of the bonus colours
 * (spaces and `·` stay in the text colour), for the game's ending. Letters
 * are drawn white and tinted, so a letter can light up later (light(),
 * unlit()). Lines wrap at spaces to fit `maxWidth`; each line is centred
 * on x = 0, the first line's top at y = 0.
 */
export class SpectrumText extends Container {
  readonly letters: SpectrumLetter[] = [];
  private readonly lineHeight: number;

  constructor(text: string, style: TextStyleOptions, maxWidth = Infinity) {
    super();
    const white = { ...style, fill: 0xffffff };
    let colorIndex = 0;
    for (const char of text) {
      const plain = PLAIN.includes(char);
      const color = plain
        ? COLORS.text
        : BONUS_COLORS[colorIndex++ % BONUS_COLORS.length];
      const view = new Text({ text: char, style: white });
      view.tint = color;
      this.letters.push({ view, color });
      this.addChild(view);
    }
    this.lineHeight = Math.max(...this.letters.map(({ view }) => view.height));
    this.layout(maxWidth);
  }

  /** Lights every letter up in its colour. */
  light(): void {
    for (const letter of this.letters) {
      letter.view.tint = letter.color;
    }
  }

  /** Shows every letter in the text colour, until lit. */
  unlit(): void {
    for (const letter of this.letters) {
      letter.view.tint = COLORS.text;
    }
  }

  /** Lights the letters whose centre is left of `x`. */
  lightUpTo(x: number): void {
    for (const letter of this.letters) {
      if (letter.view.x + letter.view.width / 2 < x) {
        letter.view.tint = letter.color;
      }
    }
  }

  /** Places the letters in lines no wider than `maxWidth`, broken at spaces. */
  private layout(maxWidth: number): void {
    const words: Text[][] = [[]];
    for (const { view } of this.letters) {
      if (view.text === " ") {
        words.push([view], []);
      } else {
        words[words.length - 1].push(view);
      }
    }
    const width = (views: Text[]) =>
      views.reduce((sum, view) => sum + view.width, 0);
    const lines: Text[][] = [[]];
    for (const word of words) {
      const line = lines[lines.length - 1];
      const isSpace = word.length === 1 && word[0].text === " ";
      if (!isSpace && line.length > 0 && width(line) + width(word) > maxWidth) {
        // A space at the end of a line takes no room.
        while (line.length && line[line.length - 1].text === " ") {
          line.pop()!.visible = false;
        }
        lines.push([...word]);
      } else {
        line.push(...word);
      }
    }
    lines.forEach((line, row) => {
      let x = -width(line) / 2;
      for (const view of line) {
        view.position.set(x, row * this.lineHeight);
        x += view.width;
      }
    });
  }
}
