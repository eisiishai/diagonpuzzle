import type { MusicTrackId } from "../audio/music";
import type { MirrorType } from "../game/types";

export interface LevelDefinition {
  /** Stable identifier used for saved progress; never change it once released. */
  id: string;
  name: string;
  /**
   * The level's text hint (see docs/DESIGN.md, Hints): the idea or the key
   * piece, never rows or a whole route. At most two lines on the level
   * screen; a test checks its length.
   */
  hint: string;
  /**
   * Fewest shots that solve the level, as designed. Tests check it with the
   * solver, so a level that is accidentally easier or harder fails.
   */
  minShots: number;
  /**
   * How many times the goal must be hit to complete the level, each by a
   * separate shot (the goal stops the beam). Default 1.
   */
  goalHits?: number;
  /**
   * Fewest shots that hit the level's bonus target (`*` in the grid), from
   * the starting board, without completing the level first. Required when
   * the level has a bonus target; tests check it with the solver.
   */
  bonusShots?: number;
  /**
   * A mirror the player may place once, on any empty cell, between shots
   * (see docs/DESIGN.md, Player-placed mirror). Tests check that par needs it.
   */
  playerMirror?: MirrorType;
  /** Background music while playing the level. */
  music: MusicTrackId;
  /** Text grid, format in docs/DESIGN.md. */
  grid: string;
}

// String.raw keeps "\" literal; in a plain template string "\ " is just a space.
export const LEVELS: readonly LevelDefinition[] = [
  {
    id: "first-light",
    name: "First light",
    hint: "Work backwards: from the goal, follow its row left until a mirror turns that line towards an emitter.",
    minShots: 1,
    bonusShots: 1,
    music: "afterglow",
    grid: String.raw`
      . . . \ . .
      # . / . . G
      . . . . # .
      . . / \ . *
      . . . / . .
    `,
  },
  {
    id: "up-and-over",
    name: "Up and over",
    hint: "The pellet can climb: a mirror low on the board can send it up to the goal's row.",
    minShots: 1,
    bonusShots: 2,
    music: "afterglow",
    grid: String.raw`
      . . \ . * . \
      . . . / . . G
      . . . . . # .
      . \ . . . . .
      . . . / . . .
      . . \ . \ . .
    `,
  },
  {
    id: "second-try",
    name: "Second try",
    hint: "The leftmost mirror on the goal's row sends shots the wrong way. A shot that bounces off it turns it around.",
    minShots: 2,
    bonusShots: 3,
    music: "afterglow",
    grid: String.raw`
      . . / . . \ .
      / . / . . . G
      . # . . . . .
      \ . / . . . .
      . . / . . . *
    `,
  },
  {
    id: "set-the-stage",
    name: "Set the stage",
    hint: "The mirror on the goal's row turns shots away. Flip it with one shot, then reach it from above.",
    minShots: 2,
    bonusShots: 3,
    music: "afterglow",
    grid: String.raw`
      / \ . . \ . . *
      . . . . \ . # .
      / \ . / . . . .
      . . . / . . . G
      . \ . . / . . .
      . . . # . . . .
    `,
  },
  {
    id: "down-and-around",
    name: "Down and around",
    hint: "The long way round: the route to the goal runs down the left edge and along the bottom. Set its corners first.",
    minShots: 2,
    bonusShots: 3,
    music: "afterglow",
    grid: String.raw`
      # . . . * . . .
      / # . . / . / G
      . . \ . . / . .
      . . . . / . . .
      . . \ . . . . \
      / . . . . . / .
    `,
  },
  {
    id: "double-take",
    name: "Double take",
    hint: "Each goal hit flips the mirrors it passes. Look for a second way in that the first hit opens up.",
    minShots: 2,
    goalHits: 2,
    bonusShots: 3,
    music: "glassGarden",
    grid: String.raw`
      . . \ . *
      . . / . G
      . . / # .
      . . . . .
    `,
  },
  {
    id: "encore",
    name: "Warm-up",
    hint: "Start with a shot that misses: it turns a mirror in the column beside the goal.",
    minShots: 3,
    goalHits: 2,
    bonusShots: 4,
    music: "glassGarden",
    grid: String.raw`
      . . . . \ *
      / . . . / G
      . . . . \ /
      \ . . . # .
    `,
  },
  {
    id: "third-time-lucky",
    name: "Third time lucky",
    hint: "The winning shot comes down the column beside the goal. Two shots through the mirror by the goal turn the one at its top.",
    minShots: 3,
    bonusShots: 4,
    music: "glassGarden",
    grid: String.raw`
      \ / . . . . / .
      \ . . # . . . .
      . . . . . . . .
      . . \ . . . . .
      . . . . . . \ G
      \ / . . . . . *
      \ . . . . / . .
    `,
  },
  {
    id: "back-and-forth",
    name: "Back and forth",
    hint: "Two setup shots turn the mirrors in the winning shot's way. Work back from the goal to find which ones.",
    minShots: 3,
    bonusShots: 4,
    music: "glassGarden",
    grid: String.raw`
      # . # . . . . . .
      . . . . . \ . . *
      \ # . / . / \ / .
      . . . \ . . . . .
      . . . . . \ . \ .
      . . . \ . . \ \ G
      . . . . . . . . .
    `,
  },
  {
    id: "two-step",
    name: "Two-step",
    hint: "Two emitters take turns: each shot sets up the other's next one.",
    minShots: 4,
    bonusShots: 6,
    music: "glassGarden",
    grid: String.raw`
      . \ . . \ . . . .
      . . . . . . . / G
      . . . \ . / . . .
      . . . . . \ / . .
      . . . \ . . \ / .
      . . . . # . / . .
      . . . . . \ . . .
      . # . . . . . * .
    `,
  },
  {
    id: "breakthrough",
    name: "Breakthrough",
    hint: "Break the cracked wall, then keep going: each shot through the gap turns more mirrors.",
    minShots: 3,
    bonusShots: 4,
    music: "prism",
    grid: String.raw`
      / . . / \ . . .
      . . % . \ . . .
      / . / . . . . .
      . # * . . . . .
      # . . \ / . . G
      . . . . % . / .
    `,
  },
  {
    id: "trapdoor",
    name: "Trapdoor",
    hint: "Two cracked walls: the one in the left column opens a way down, the one by the goal a way in.",
    minShots: 4,
    bonusShots: 5,
    music: "prism",
    grid: String.raw`
      . . . \ / . .
      \ / . . . . .
      % . . . \ \ .
      . . . / # * .
      \ . . . . % G
    `,
  },
  {
    id: "stone-by-stone",
    name: "Stone by stone",
    hint: "Only the cracked wall on the goal's row is in the way. Find the emitter that can reach that row, and set it up each time.",
    minShots: 4,
    bonusShots: 5,
    music: "prism",
    grid: String.raw`
      . / . . . \ . . .
      \ % # . . . . % .
      . . / / . . . . .
      . . . . / \ \ . .
      \ . / . . . / . .
      . \ . . . % . . G
      . \ . . . # * . .
    `,
  },
  {
    id: "crack-and-double",
    name: "Crack and double",
    hint: "Break the cracked wall in front of the goal first; then two different emitters can each reach it.",
    minShots: 3,
    goalHits: 2,
    bonusShots: 4,
    music: "prism",
    grid: String.raw`
      \ / . # . .
      . \ . \ . .
      . . . \ . .
      / / . % . G
      . / . . * .
    `,
  },
  {
    id: "rubble-run",
    name: "Rubble run",
    hint: "A goal hit and the shot that sets it up can be played twice. Find the pair, and the cracked wall that stops it at first.",
    minShots: 5,
    goalHits: 2,
    bonusShots: 6,
    music: "prism",
    grid: String.raw`
      / . . . # . .
      / . . \ . . G
      . . % \ . . .
      / . / . % . .
      . . . \ . . .
      / # / . . * .
    `,
  },
  {
    id: "your-move",
    name: "Your move",
    hint: "The goal can be reached from below. Your mirror can turn a shot upwards.",
    minShots: 1,
    bonusShots: 2,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      \ . * . G
      . . # / .
      / . . # .
      . . . . .
    `,
  },
  {
    id: "hairpin",
    name: "Hairpin",
    hint: "The name says it: the winning shot goes up, then comes back down to the goal's row.",
    minShots: 2,
    bonusShots: 3,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      . # * . . .
      . \ # . / .
      . / . . . .
      . . . / . .
      . . . . / G
    `,
  },
  {
    id: "double-duty",
    name: "Double duty",
    hint: "Your mirror has two jobs: it helps a setup shot turn the mirrors by the goal, then turns the winning shot.",
    minShots: 3,
    bonusShots: 4,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      . . . / . .
      . / . . \ \
      . . # \ . .
      . . . . # *
      . \ / . . G
    `,
  },
  {
    id: "clear-the-way",
    name: "Clear the way",
    hint: "The goal is easiest to reach from below. Cracked walls block two emitters; one of them is worth opening.",
    minShots: 3,
    goalHits: 2,
    bonusShots: 4,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      % . \ . G
      . . \ . .
      . . # . .
      . . / / *
      % . / \ .
    `,
  },
  {
    id: "rebuild",
    name: "Rebuild",
    hint: "A broken wall leaves an empty cell, and your mirror can go there.",
    minShots: 4,
    goalHits: 2,
    bonusShots: 5,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      # . % * / .
      \ . # / % \
      . . . \ . G
      \ . . . . .
      . . . % \ .
    `,
  },
  {
    id: "return-trip",
    name: "Return trip",
    hint: "A reflector sends the pellet back the way it came, but the mirror it just passed has flipped.",
    minShots: 1,
    bonusShots: 2,
    music: "return",
    grid: String.raw`
      . \ / . .
      . @ * # .
      . / . . G
      . \ . . .
    `,
  },
  {
    id: "there-and-back",
    name: "There and back",
    hint: "The mirror before the goal gets two chances: the pellet can bounce off a reflector and meet it flipped.",
    minShots: 2,
    bonusShots: 3,
    music: "return",
    grid: String.raw`
      \ . . . \ *
      . / . . . .
      \ . . @ . .
      . . # . @ .
      . / . / . G
    `,
  },
  {
    id: "ricochet",
    name: "Ricochet",
    hint: "Shots up the reflector's column come back down. A cracked wall stands between that column and the goal.",
    minShots: 3,
    bonusShots: 4,
    music: "return",
    grid: String.raw`
      . \ @ . . .
      / . . % * .
      \ # . . . .
      . . . % . .
      \ . / % . G
    `,
  },
  {
    id: "mirror-image",
    name: "Mirror image",
    hint: "Shots off the reflector come back through the mirror they just flipped and leave the other way. Your mirror can catch one.",
    minShots: 3,
    bonusShots: 4,
    playerMirror: "mirrorBackslash",
    music: "return",
    grid: String.raw`
      . . \ . . .
      . / . \ / *
      . . . @ . G
      . / . . . .
      . . # . . .
    `,
  },
  {
    id: "double-back",
    name: "Double back",
    hint: "Shots turned down the first column bounce off the reflector and meet the mirror that turned them again, now flipped.",
    minShots: 4,
    goalHits: 2,
    bonusShots: 5,
    music: "return",
    grid: String.raw`
      / . / . . .
      \ . . / / .
      . . . \ . G
      @ . / . . .
      . # * . . .
      . . . . . .
    `,
  },
  {
    id: "glass-house",
    name: "Glass house",
    hint: "The glass mirror is in the goal's way. A shot that bounces off it shatters it for good.",
    minShots: 2,
    bonusShots: 4,
    music: "glassHarp",
    grid: String.raw`
      \ . \ . .
      . . Z . G
      / \ * . .
      . . . # .
    `,
  },
  {
    id: "clean-break",
    name: "Clean break",
    hint: "One well-aimed shot can shatter both glass mirrors by the goal.",
    minShots: 3,
    bonusShots: 4,
    music: "glassHarp",
    grid: String.raw`
      . . . / . .
      . / . . N *
      . . / . Z G
      . \ . # . .
      . . / . . .
    `,
  },
  {
    id: "glass-echo",
    name: "Glass echo",
    hint: "A shot that shatters glass on its way to the reflector passes straight through on the way back.",
    minShots: 3,
    bonusShots: 4,
    music: "glassHarp",
    grid: String.raw`
      . # \ N . *
      / . . / . .
      / . . . . .
      / . \ . . .
      @ . . Z . G
    `,
  },
  {
    id: "double-glazing",
    name: "Double glazing",
    hint: "Between the two goal hits, one shot sets the mirrors by the goal up again.",
    minShots: 4,
    goalHits: 2,
    bonusShots: 5,
    music: "glassHarp",
    grid: String.raw`
      . . . \ . G
      . . Z \ . .
      . . / # . .
      \ . . . . .
      / Z . * . .
    `,
  },
  {
    id: "glass-and-stone",
    name: "Glass and stone",
    hint: "Break the cracked wall on the left edge first: the way to the one by the goal runs through it. Spend the glass wisely.",
    minShots: 4,
    bonusShots: 5,
    music: "glassHarp",
    grid: String.raw`
      \ . . . . .
      % . . / % G
      N . . / Z *
      . . . \ . .
      \ . . . . .
      . . . \ . .
    `,
  },
  {
    id: "bolted-down",
    name: "Bolted down",
    hint: "The steel mirror never flips, so shots through it always go the same way. Change the mirrors around it instead.",
    minShots: 2,
    bonusShots: 3,
    music: "anchor",
    grid: String.raw`
      . \ . \ G
      . . \ . *
      . . . J .
      . / \ # .
    `,
  },
  {
    id: "cold-steel",
    name: "Cold steel",
    hint: "The steel mirror beside the goal turns shots coming down into it. Find a way to reach the cell above it.",
    minShots: 3,
    bonusShots: 4,
    music: "anchor",
    grid: String.raw`
      \ . . . \ .
      . \ . J \ /
      . \ . . / .
      / . # / L G
      . . # . * .
    `,
  },
  {
    id: "strike-twice",
    name: "Strike twice",
    hint: "The same emitter can hit the goal twice, if a shot in between puts the mirrors back.",
    minShots: 4,
    goalHits: 2,
    bonusShots: 5,
    music: "anchor",
    grid: String.raw`
      . . / L . .
      . . . / \ *
      / . . . / .
      J . / . . G
      # . . . . .
    `,
  },
  {
    id: "steel-echo",
    name: "Steel echo",
    hint: "The reflector throws shots back into the left column. Break the cracked wall in front of the goal on the way.",
    minShots: 3,
    bonusShots: 5,
    music: "anchor",
    grid: String.raw`
      / . / . \ .
      . / / # . .
      / @ . . . .
      L . . . % G
      \ L / . * .
    `,
  },
  {
    id: "true-north",
    name: "True north",
    hint: "A steel mirror always turns shots along its row upwards. Clear the way along that row, then put your mirror to work.",
    minShots: 3,
    bonusShots: 4,
    playerMirror: "mirrorBackslash",
    music: "anchor",
    grid: String.raw`
      . . # . . G
      N . . J / .
      . . L . . .
      . / . . / *
      \ . . \ . .
    `,
  },
  {
    id: "other-side",
    name: "Other side",
    hint: "A portal sends the pellet out of the other portal, still moving the same way.",
    minShots: 1,
    bonusShots: 3,
    music: "wormhole",
    grid: String.raw`
      \ . . # . .
      . O . . . .
      / . . . \ \
      . / * # O G
      \ . . . . .
    `,
  },
  {
    id: "shortcut",
    name: "Shortcut",
    hint: "The portal in the bottom row leads to the top one, right on the goal's row. Find a way into it.",
    minShots: 2,
    bonusShots: 3,
    music: "wormhole",
    grid: String.raw`
      O . . . . G
      # . . . . .
      # . / . . .
      / . . / \ *
      \ . . O / .
    `,
  },
  {
    id: "knock-first",
    name: "Knock first",
    hint: "The cracked wall on the goal's row has to break before the goal can be reached. The way to that wall runs through a portal.",
    minShots: 3,
    bonusShots: 4,
    music: "wormhole",
    grid: String.raw`
      \ . O . / .
      . # . . . .
      . . . \ . *
      . O . / # .
      / . . % . G
    `,
  },
  {
    id: "boomerang",
    name: "Boomerang",
    hint: "A shot can go through a portal, bounce off the reflector and come back through the same portal.",
    minShots: 4,
    bonusShots: 5,
    music: "wormhole",
    grid: String.raw`
      . . \ \ / .
      / / . . . G
      \ O . * O .
      . / / # . .
      . . # . @ .
    `,
  },
  {
    id: "looking-glass",
    name: "Looking glass",
    hint: "The winning shot comes out of the bottom-left portal and climbs. Turn the mirrors on its way up.",
    minShots: 4,
    bonusShots: 5,
    music: "wormhole",
    grid: String.raw`
      # . . . . .
      / / . . . G
      \ . . . . .
      N . / * . .
      O J / . O .
    `,
  },
  {
    id: "one-way",
    name: "One way",
    hint: "Shots through the gate need the two mirrors after it turned. Another emitter can turn both.",
    minShots: 2,
    bonusShots: 3,
    music: "current",
    grid: String.raw`
      . . \ . *
      . > . / .
      . . . / G
      . . ^ / .
      . . \ . .
    `,
  },
  {
    id: "no-way-back",
    name: "No way back",
    hint: "The mirrors near the top need turning first. Shots from below can turn them, and the gates keep them from coming back.",
    minShots: 3,
    bonusShots: 4,
    music: "current",
    grid: String.raw`
      . \ . / . G
      . / . \ # .
      . ^ \ . . *
      . \ ^ / . .
      . . \ . . .
    `,
  },
  {
    id: "echo-chamber",
    name: "Echo chamber",
    hint: "The cracked wall in the left column blocks an emitter's way in. A shot off the reflector can break it from inside.",
    minShots: 3,
    bonusShots: 5,
    music: "current",
    grid: String.raw`
      \ . > . \ G
      @ . . / . .
      % . . . / .
      . . . v / *
      . . . . . .
    `,
  },
  {
    id: "double-crossing",
    name: "Double crossing",
    hint: "Both goal hits come out of the portal on the goal's row. Getting a shot into the other portal takes a setup shot each time.",
    minShots: 4,
    goalHits: 2,
    bonusShots: 6,
    music: "current",
    grid: String.raw`
      . \ . / . .
      . ^ . * . .
      O . > . . G
      . \ . . O .
      . \ \ . . .
    `,
  },
  {
    id: "last-light",
    name: "Last light",
    hint: "Your mirror belongs near the goal's row, but it starts the wrong way round: a shot has to flip it before it can help.",
    minShots: 5,
    bonusShots: 6,
    playerMirror: "mirrorBackslash",
    music: "current",
    grid: String.raw`
      \ / . / . *
      v . . . . G
      / . N . . .
      . . \ . / .
      . < . . . .
    `,
  },
  // The secret chapter, shown once every bonus target above is found (see
  // docs/DESIGN.md, Secret chapter). Harder levels combining earlier
  // pieces, with no bonus targets of their own.
  {
    id: "long-game",
    name: "Long game",
    hint: "The winning shot climbs the fifth column to the goal. Everything before it turns that column's mirrors.",
    minShots: 5,
    music: "wormhole",
    grid: String.raw`
      . . \ . \ G
      # . . . . .
      . . N / . .
      O . . / / .
      / . O . \ .
    `,
  },
  {
    id: "headwind",
    name: "Headwind",
    hint: "Both goal hits can come from the same emitter. The shot between them is the puzzle.",
    minShots: 5,
    goalHits: 2,
    music: "anchor",
    grid: String.raw`
      . / . < . .
      . / . > \ .
      . / \ . J .
      . . / . . G
      . . . . . .
    `,
  },
  {
    id: "aftershock",
    name: "Aftershock",
    hint: "Shots that bounce off the bottom reflector turn the middle mirrors. The winning shot needs them turned just right.",
    minShots: 5,
    music: "return",
    grid: String.raw`
      . \ . \ \ G
      . \ . % \ .
      . . # . % .
      . . \ / . .
      . . @ . . .
    `,
  },
  {
    id: "far-corner",
    name: "Far corner",
    hint: "The bottom portal's shots run along the bottom row. Your mirror can turn them towards the goal.",
    minShots: 5,
    playerMirror: "mirrorBackslash",
    music: "photon",
    grid: String.raw`
      / / \ . . .
      \ / O \ . G
      \ . . # . .
      . . / . . .
      . . . O . .
    `,
  },
  {
    id: "full-circle",
    name: "Full circle",
    hint: "Shatter the glass first. Both goal hits can take the same route, and shots through the portals set it up each time.",
    minShots: 5,
    goalHits: 2,
    music: "afterglow",
    grid: String.raw`
      Z . \ . . .
      . # . . . .
      O . J \ . G
      \ . \ . . .
      \ . . \ O .
    `,
  },
];

export interface ChapterDefinition {
  /** Shown in the title screen's level list, in capitals. */
  name: string;
  /** The id of the chapter's first level; it runs up to the next chapter's. */
  firstLevel: string;
  /**
   * Hidden from the level list until every bonus target of the chapters
   * before it is found. Secret chapters come last.
   */
  secret?: boolean;
}

/**
 * The level list's chapters, one per mechanic (they follow the music
 * groups, see docs/DESIGN.md, Sound). A new level joins the chapter it is
 * placed in; a new mechanic starts a new chapter.
 */
export const CHAPTERS: readonly ChapterDefinition[] = [
  { name: "Basics", firstLevel: "first-light" },
  { name: "Flip tricks", firstLevel: "double-take" },
  { name: "Breakable walls", firstLevel: "breakthrough" },
  { name: "Your mirror", firstLevel: "your-move" },
  { name: "Reflectors", firstLevel: "return-trip" },
  { name: "Glass mirrors", firstLevel: "glass-house" },
  { name: "Fixed mirrors", firstLevel: "bolted-down" },
  { name: "Portals", firstLevel: "other-side" },
  { name: "One-way gates", firstLevel: "one-way" },
  { name: "Prism", firstLevel: "long-game", secret: true },
];

/** A chapter's levels: indices `start` up to, not including, `end`. */
export interface ChapterRange {
  name: string;
  start: number;
  end: number;
  secret?: boolean;
}

/**
 * Where each chapter's levels are in `levels`. Throws if a chapter's first
 * level is missing, the first chapter doesn't start at the first level,
 * the chapters are out of order, or a secret chapter is followed by one
 * that isn't.
 */
export function chapterRanges(
  levels: readonly Pick<LevelDefinition, "id">[],
  chapters: readonly ChapterDefinition[],
): ChapterRange[] {
  const starts = chapters.map(({ firstLevel }) => {
    const index = levels.findIndex((level) => level.id === firstLevel);
    if (index < 0) {
      throw new Error(`No level "${firstLevel}" to start a chapter`);
    }
    return index;
  });
  if (starts[0] !== 0) {
    throw new Error("The first chapter must start at the first level");
  }
  starts.forEach((start, i) => {
    if (i > 0 && start <= starts[i - 1]) {
      throw new Error(`Chapter "${chapters[i].name}" is out of order`);
    }
  });
  chapters.forEach(({ name, secret }, i) => {
    if (i > 0 && chapters[i - 1].secret && !secret) {
      throw new Error(`Chapter "${name}" comes after a secret chapter`);
    }
  });
  return chapters.map(({ name, secret }, i) => ({
    name,
    start: starts[i],
    end: starts[i + 1] ?? levels.length,
    ...(secret ? { secret } : {}),
  }));
}

/** Whether each level, in order, is in a secret chapter. */
export function secretLevels(chapters: readonly ChapterRange[]): boolean[] {
  return chapters.flatMap(({ start, end, secret = false }) =>
    Array.from({ length: end - start }, () => secret),
  );
}
