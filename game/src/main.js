// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over (caught or escaped).
//
// ?seed=N fixes the obstacle pattern. ?shot=start|play|kitchen|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CORN, EVENT_ESCAPED, EVENT_FEATHER, EVENT_HIT, EVENT_MUD, EVENT_OVER, EVENT_STAGE } from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, scene.escaped);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let escaped = false;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    escaped = false;
    screen = SCREEN_PLAY;
    sound.unlock();
    sound.gobble();
    announce(`Playing. ${LIVES} lives. Outrun the farmer to the forest.`);
  }

  function endGame(won) {
    escaped = won;
    screen = SCREEN_OVER;
    const score = Math.floor(world.state.score);
    if (score > best) {
      best = score;
      saveBest(best);
    }
    if (won) {
      sound.escaped();
      announce(`Escaped. Score ${score}. Best ${best}.`);
    } else {
      sound.caught();
      announce(`Caught. Score ${score}. Best ${best}.`);
    }
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      const controls = {
        jump: false,
        jumpHeld: false,
        slide: false,
        sprint: false,
        slow: false,
        pointerX: null,
      };
      world.step(STEP, controls, true);
      return;
    }
    const controls = {
      jump: Boolean(actions & ACTION_JUMP),
      jumpHeld: input.jumpHeld(),
      slide: input.slideHeld(),
      sprint: input.sprintHeld(),
      slow: input.slowHeld(),
      pointerX: input.pointerX() === null ? null : renderer.toLogicalX(input.pointerX()),
    };
    // Clamp the pointer's steering target to the turkey's allowed range.
    if (controls.pointerX !== null) {
      controls.pointerX = Math.max(140, Math.min(560, controls.pointerX));
    }
    const events = world.step(STEP, controls, false);
    if (events & EVENT_HIT) {
      sound.hit();
      announce(world.state.lives === 1 ? 'Hit. 1 life left. The farmer is closing in.' : `Hit. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_CORN) sound.corn();
    if (events & EVENT_FEATHER) sound.feather();
    if (events & EVENT_MUD) sound.mud();
    if (events & EVENT_STAGE) {
      sound.stage();
      const stageName = world.state.stage === 1 ? 'Cornfield' : 'Kitchen';
      announce(`${stageName}. It gets faster from here.`);
    }
    if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Take the one-shot presses once per frame: handleActions reads them, and the first step
    // of the frame spends the jump, so a press is never lost and never counted twice.
    let actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        actions &= ~ACTION_JUMP;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, escaped);
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch the turkey unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Dash. Press Space or click to start.');
  // A read-only handle for live checks: returns the screen, distance, score and lives.
  window.__gobble = () => ({
    screen,
    distance: Math.round(world.state.distance),
    score: Math.floor(world.state.score),
    lives: world.state.lives,
    stage: world.state.stage,
    turkeyY: Math.round(world.state.turkey.y),
    onGround: world.state.turkey.onGround,
  });
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
