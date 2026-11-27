// The game's rules and state, with no drawing and no browser in it: the turkey, the farmer
// chasing from behind, the pool of obstacles and pickups, spawning, collisions, score, lives,
// distance and stages. step() advances one fixed step and returns what happened as bit flags, so
// the caller can react without the world knowing about screens or sound. Nothing here allocates
// after createWorld returns.
import {
  CORN,
  ESCAPE_METRES,
  FARMER,
  FEATHER,
  FIELD,
  LIVES,
  OB,
  OB_DEFS,
  POOL_SIZE,
  PX_PER_METRE,
  SCORE,
  SPEED,
  SPAWN,
  STAGES,
  STAGE_OBS,
  TURKEY,
} from './config.js';

export const KIND_CORN = 0;
export const KIND_FEATHER = 1;

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_FEATHER = 4;
export const EVENT_OVER = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_STAGE = 32;
export const EVENT_MUD = 64;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const turkey = {
    x: TURKEY.x,
    y: FIELD.groundY - TURKEY.height,
    vy: 0,
    width: TURKEY.width,
    height: TURKEY.height,
    onGround: true,
    sliding: false,
    slideTimer: 0,
    invulnerable: 0,
    runPhase: 0,
    mudTimer: 0,
  };
  const obstacles = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    obstacles.push({ active: false, kind: OB.FENCE, x: 0, y: 0, width: 0, height: 0 });
  }
  const pickups = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    pickups.push({ active: false, kind: KIND_CORN, x: 0, y: 0, width: 0, height: 0 });
  }
  const state = {
    turkey,
    obstacles,
    pickups,
    score: 0,
    lives: LIVES,
    distance: 0,
    elapsed: 0,
    scrollX: 0,
    stage: 0,
    farmerBehind: FARMER.startBehind,
    speed: SPEED.base,
    spawnTimer: 1.2,
    cornTimer: 2.0,
    escaped: false,
    caught: false,
  };

  function reset() {
    turkey.x = TURKEY.x;
    turkey.y = FIELD.groundY - TURKEY.height;
    turkey.vy = 0;
    turkey.width = TURKEY.width;
    turkey.height = TURKEY.height;
    turkey.onGround = true;
    turkey.sliding = false;
    turkey.slideTimer = 0;
    turkey.invulnerable = 0;
    turkey.runPhase = 0;
    turkey.mudTimer = 0;
    for (const item of obstacles) item.active = false;
    for (const item of pickups) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.distance = 0;
    state.elapsed = 0;
    state.scrollX = 0;
    state.stage = 0;
    state.farmerBehind = FARMER.startBehind;
    state.speed = SPEED.base;
    state.spawnTimer = 1.2;
    state.cornTimer = 2.0;
    state.escaped = false;
    state.caught = false;
  }

  function freeObstacle() {
    for (let index = 0; index < obstacles.length; index += 1) {
      if (!obstacles[index].active) return obstacles[index];
    }
    return null;
  }

  function freePickup() {
    for (let index = 0; index < pickups.length; index += 1) {
      if (!pickups[index].active) return pickups[index];
    }
    return null;
  }

  /** Place an obstacle at the right edge, standing on the ground (or hanging, for a branch). */
  function spawnObstacle(kind, x) {
    const item = freeObstacle();
    if (item === null) return;
    const def = OB_DEFS[kind];
    item.active = true;
    item.kind = kind;
    item.width = def.width;
    item.height = def.height;
    item.x = x;
    // The branch hangs at head height so a slide passes under it; the rest stand on the ground.
    item.y = kind === OB.BRANCH ? FIELD.groundY - def.height - 40 : FIELD.groundY - def.height;
  }

  function spawnPickup(kind, x, y) {
    const item = freePickup();
    if (item === null) return;
    item.active = true;
    item.kind = kind;
    item.width = kind === KIND_CORN ? CORN.size : FEATHER.size;
    item.height = item.width;
    item.x = x;
    item.y = y;
  }

  /** One obstacle group: a single obstacle, sometimes a pair, sometimes with corn arcing over it. */
  function spawnGroup() {
    const kinds = STAGE_OBS[state.stage];
    const kind = kinds[Math.floor(random() * kinds.length)];
    const x = FIELD.width + 40;
    spawnObstacle(kind, x);
    const roll = random();
    if (roll < 0.3) {
      // A second obstacle a little behind the first, far enough that the turkey can land
      // from clearing the first and jump again: a jump covers about 340 px of ground.
      const kind2 = kinds[Math.floor(random() * kinds.length)];
      spawnObstacle(kind2, x + 420 + random() * 140);
    }
    if (roll < 0.55) {
      // Corn arcing over the obstacle, a reward for jumping it.
      const def = OB_DEFS[kind];
      const top = FIELD.groundY - def.height;
      spawnPickup(KIND_CORN, x + 10, top - 90);
      spawnPickup(KIND_CORN, x + 40, top - 130);
      spawnPickup(KIND_CORN, x + 70, top - 90);
    }
  }

  function spawnInterval() {
    return Math.max(SPAWN.minInterval, SPAWN.interval * SPAWN.intervalScale ** state.stage);
  }

  /**
   * One fixed step. `controls` carries the held inputs and one-shot presses for this step.
   * With `harmless` set (the title screen's backdrop) the world scrolls and the turkey runs but
   * nothing collides, nothing scores and the farmer never catches.
   */
  function step(dt, controls, harmless) {
    let events = 0;
    state.elapsed += dt;

    // The stage follows the distance: farmyard, cornfield, kitchen, then the forest.
    const stage = state.distance >= STAGES[2].from ? 2 : state.distance >= STAGES[1].from ? 1 : 0;
    if (stage !== state.stage) {
      state.stage = stage;
      events |= EVENT_STAGE;
    }

    // Scroll speed: the stage's pace, faster while sprinting, slower while dawdling or in mud.
    let speed = SPEED.base * SPEED.stageScale[state.stage];
    if (controls.sprint) speed *= SPEED.sprintScale;
    if (controls.slow) speed *= SPEED.slowScale;
    if (turkey.mudTimer > 0) speed *= 0.6;
    state.speed = speed;
    state.scrollX += speed * dt;

    if (!harmless) {
      const metres = (speed * dt) / PX_PER_METRE;
      state.distance += metres;
      state.score += metres * SCORE.perMetre;
      if (state.distance >= ESCAPE_METRES && !state.escaped) {
        state.escaped = true;
        state.score += SCORE.escapeBonus;
        events |= EVENT_ESCAPED;
      }
    }

    // The farmer: clean running pulls away, sprinting pulls away faster, dawdling and mud let him close.
    if (!harmless) {
      let drift = FARMER.fallBehind;
      if (controls.sprint) drift += FARMER.sprintFallBehind;
      if (controls.slow) drift -= FARMER.slowGain;
      if (turkey.mudTimer > 0) drift -= 2;
      state.farmerBehind = Math.min(120, Math.max(0, state.farmerBehind + drift * dt));
      if (state.farmerBehind <= 0 && !state.caught) {
        state.caught = true;
        events |= EVENT_OVER;
      }
    }

    // The turkey's vertical motion: jump, hold for height, fall, land.
    if (controls.jump && turkey.onGround && !turkey.sliding) {
      turkey.vy = TURKEY.jumpVelocity;
      turkey.onGround = false;
    }
    const gravity = turkey.vy < 0 && controls.jumpHeld ? TURKEY.gravity * TURKEY.holdGravityScale : TURKEY.gravity;
    turkey.vy += gravity * dt;
    turkey.y += turkey.vy * dt;
    if (turkey.y >= FIELD.groundY - turkey.height) {
      turkey.y = FIELD.groundY - turkey.height;
      turkey.vy = 0;
      turkey.onGround = true;
    }

    // Sliding: a low profile for a short time, then back up (re-trigger while held).
    if (controls.slide && turkey.onGround) {
      if (!turkey.sliding) {
        turkey.sliding = true;
        turkey.slideTimer = TURKEY.slideTime;
      }
    }
    if (turkey.sliding) {
      turkey.slideTimer -= dt;
      if (turkey.slideTimer <= 0) turkey.sliding = false;
    }
    turkey.height = turkey.sliding ? TURKEY.slideHeight : TURKEY.height;
    if (turkey.sliding) turkey.y = FIELD.groundY - turkey.height;

    // Steering: sprint and slow shift the turkey, the pointer pulls it, else it drifts home.
    let targetX = TURKEY.x;
    if (controls.sprint) targetX = TURKEY.xMax;
    else if (controls.slow) targetX = TURKEY.xMin;
    else if (controls.pointerX !== null && controls.pointerX !== undefined) targetX = controls.pointerX;
    const dx = targetX - turkey.x;
    const maxMove = TURKEY.steerSpeed * dt;
    turkey.x += Math.max(-maxMove, Math.min(maxMove, dx));
    turkey.x = Math.max(TURKEY.xMin, Math.min(TURKEY.xMax, turkey.x));

    if (turkey.invulnerable > 0) turkey.invulnerable = Math.max(0, turkey.invulnerable - dt);
    if (turkey.mudTimer > 0) turkey.mudTimer = Math.max(0, turkey.mudTimer - dt);
    turkey.runPhase += (speed / 60) * dt;

    // Spawning: obstacle groups on a timer, corn on its own timer, a rare golden feather.
    if (!harmless) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnGroup();
        state.spawnTimer += spawnInterval();
      }
      state.cornTimer -= dt;
      if (state.cornTimer <= 0) {
        const y = FIELD.groundY - 40 - random() * 120;
        spawnPickup(KIND_CORN, FIELD.width + 40, y);
        if (random() < 0.12) spawnPickup(KIND_FEATHER, FIELD.width + 120, FIELD.groundY - 180);
        state.cornTimer += 1.6 + random() * 1.4;
      }
    }

    // Obstacles scroll left with the world.
    for (let index = 0; index < obstacles.length; index += 1) {
      const item = obstacles[index];
      if (!item.active) continue;
      item.x -= speed * dt;
      if (item.x + item.width < -20) {
        item.active = false;
        continue;
      }
      if (harmless || turkey.invulnerable > 0) continue;
      if (!overlaps(item, turkey)) continue;
      if (item.kind === OB.MUD) {
        // Mud only slows: it drags the run and lets the farmer close in.
        if (turkey.mudTimer === 0) events |= EVENT_MUD;
        turkey.mudTimer = 0.6;
        continue;
      }
      item.active = false;
      state.lives -= 1;
      turkey.invulnerable = TURKEY.invulnerable;
      state.farmerBehind = Math.max(0, state.farmerBehind - FARMER.stumbleGain);
      events |= EVENT_HIT;
      if (state.lives <= 0 || state.farmerBehind <= 0) {
        state.caught = true;
        events |= EVENT_OVER;
        break;
      }
    }

    // Pickups scroll left and are collected on touch.
    for (let index = 0; index < pickups.length; index += 1) {
      const item = pickups[index];
      if (!item.active) continue;
      item.x -= speed * dt;
      if (item.x + item.width < -20) {
        item.active = false;
        continue;
      }
      if (harmless || !overlaps(item, turkey)) continue;
      item.active = false;
      if (item.kind === KIND_CORN) {
        state.score += CORN.points;
        events |= EVENT_CORN;
      } else {
        state.score += FEATHER.points;
        events |= EVENT_FEATHER;
      }
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
