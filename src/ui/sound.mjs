/**
 * Chat Sound Effects
 *
 * Plays system notification sounds using the ASCII bell character.
 * Enabled by default, disable with ROO_SOUND=0 in .env
 */

const BELL = "\x07";
const ENABLED = process.env.ROO_SOUND !== "0";

/**
 * Play a number of short beeps in sequence.
 */
function beep(count = 1) {
  if (!ENABLED) return;
  for (let i = 0; i < count; i++) {
    setTimeout(() => process.stdout.write(BELL), i * 150);
  }
}

/**
 * Short single beep — response starting or tool done.
 */
export function beepResponse() {
  beep(1);
}

/**
 * Double beep — error occurred.
 */
export function beepError() {
  beep(2);
}

/**
 * Triple beep — task fully complete.
 */
export function beepComplete() {
  beep(3);
}
