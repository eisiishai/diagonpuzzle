/**
 * Limits how many sound effects play at once, so rapid bounces don't pile up
 * into a loud mess. Times are in seconds on any steadily increasing clock.
 */
export class VoiceLimiter {
  private readonly maxVoices: number;
  private endTimes: number[] = [];

  constructor(maxVoices: number) {
    this.maxVoices = maxVoices;
  }

  /**
   * Returns whether a sound starting at `now` and lasting `seconds` may play,
   * and if so counts it. Important sounds always play, but still count.
   */
  tryStart(now: number, seconds: number, important = false): boolean {
    this.endTimes = this.endTimes.filter((end) => end > now);
    if (!important && this.endTimes.length >= this.maxVoices) {
      return false;
    }
    this.endTimes.push(now + seconds);
    return true;
  }
}
