// The screenshot scenes behind ?shot=start|play|kitchen|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot (look
// ahead at the next obstacle, jump the jumpable ones, slide under the branches, sprint when the
// farmer is close and the way is clear), so the frame is what a short game really looks like
// and the same seed always gives the same frame.
import { OB, STEP } from './config.js';
import { EVENT_ESCAPED, EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 22;
const KITCHEN_METRES = 760;
const END_LIMIT_SECONDS = 600;
/**
 * How far ahead, in seconds, the autopilot looks: the play and kitchen scenes look well ahead
 * and keep all their lives; the end scene looks only a moment ahead, so it is caught out once
 * the obstacles speed up, as a hurried player is.
 */
const HORIZON_PLAY = 0.8;
const HORIZON_END = 0.22;

/** The controls for one step: what the autopilot would do in this state. */
function autopilot(state, horizon) {
  const turkey = state.turkey;
  const controls = {
    jump: false,
    jumpHeld: false,
    slide: false,
    sprint: false,
    slow: false,
    pointerX: null,
  };
  // The nearest obstacle that has not fully passed the turkey yet.
  let threat = null;
  let threatTime = Infinity;
  for (let index = 0; index < state.obstacles.length; index += 1) {
    const item = state.obstacles[index];
    if (!item.active) continue;
    if (item.x + item.width < turkey.x) continue;
    const gap = item.x - (turkey.x + turkey.width);
    const time = gap / state.speed;
    if (time < threatTime) {
      threatTime = time;
      threat = item;
    }
  }
  if (threat !== null && threatTime <= horizon) {
    if (threat.kind === OB.BRANCH) {
      if (threatTime < 0.45) controls.slide = true;
    } else if (threat.kind === OB.MUD) {
      if (threatTime < 0.3 && turkey.onGround) {
        controls.jump = true;
        controls.jumpHeld = true;
      }
    } else {
      // A jumpable obstacle: the oven wants an earlier jump than the rest.
      const lead = threat.kind === OB.OVEN ? 0.5 : 0.38;
      if (threatTime < lead && turkey.onGround) {
        controls.jump = true;
        controls.jumpHeld = true;
      }
    }
  }
  // Hold the jump while rising, for a full jump over the tall obstacles.
  if (!turkey.onGround && turkey.vy < 0) controls.jumpHeld = true;
  // Sprint when the farmer is close and the way ahead is clear.
  if (state.farmerBehind < 25 && threatTime > 0.8) controls.sprint = true;
  return controls;
}

/**
 * Set `world` to the named scene (start, play, kitchen or end; any other name is start) and
 * return the screen to draw over it, the best score to show and whether the run escaped.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'kitchen' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world.state, HORIZON_PLAY), true);
    }
    return { screen: SCREEN_TITLE, best: 0, escaped: false };
  }
  if (name === 'kitchen') {
    // Run until the kitchen, then a little further, so the oven is in the frame.
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world.state, HORIZON_PLAY), false);
      if (events & EVENT_OVER || events & EVENT_ESCAPED) break;
      if (world.state.distance >= KITCHEN_METRES) {
        // A few more seconds, so an oven has had time to spawn and roll in.
        for (let extra = 0; extra < 4 / STEP; extra += 1) {
          world.step(STEP, autopilot(world.state, HORIZON_PLAY), false);
        }
        break;
      }
    }
    return { screen: SCREEN_PLAY, best: Math.floor(world.state.score), escaped: false };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  let escaped = false;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state, horizon), false);
    if (events & EVENT_ESCAPED) {
      escaped = true;
      break;
    }
    if (events & EVENT_OVER) break;
  }
  const over = world.state.lives === 0 || world.state.caught;
  return {
    screen: over || escaped ? SCREEN_OVER : SCREEN_PLAY,
    best: Math.floor(world.state.score),
    escaped,
  };
}
