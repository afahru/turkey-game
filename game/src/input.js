// Keyboard and pointer input. Held keys give the run's steering (sprint, slow, slide, jump hold);
// one-shot presses (jump, start or restart, pause, mute) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost and never counted twice. The mouse
// steers the turkey by its x position and a click jumps.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_JUMP = 8;

const JUMP = new Set(['ArrowUp', 'Space', 'KeyW']);
const SLIDE = new Set(['ArrowDown', 'KeyS']);
const SPRINT = new Set(['ArrowRight', 'KeyD']);
const SLOW = new Set(['ArrowLeft', 'KeyA']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let jumpHeld = false;
  let slideHeld = false;
  let sprintHeld = false;
  let slowHeld = false;
  let actions = 0;
  /** The pointer's x in CSS pixels over the canvas, or null when it never moved. */
  let pointerX = null;

  window.addEventListener('keydown', (event) => {
    if (JUMP.has(event.code)) {
      jumpHeld = true;
      if (!event.repeat) actions |= ACTION_JUMP | ACTION_CONFIRM;
    } else if (SLIDE.has(event.code)) {
      slideHeld = true;
    } else if (SPRINT.has(event.code)) {
      sprintHeld = true;
    } else if (SLOW.has(event.code)) {
      slowHeld = true;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (JUMP.has(event.code)) jumpHeld = false;
    else if (SLIDE.has(event.code)) slideHeld = false;
    else if (SPRINT.has(event.code)) sprintHeld = false;
    else if (SLOW.has(event.code)) slowHeld = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    jumpHeld = false;
    slideHeld = false;
    sprintHeld = false;
    slowHeld = false;
  });
  target.addEventListener('pointerdown', (event) => {
    actions |= ACTION_JUMP | ACTION_CONFIRM;
    pointerX = event.clientX;
  });
  target.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
  });
  // When the pointer leaves the canvas, stop steering: the turkey drifts back home.
  target.addEventListener('pointerleave', () => {
    pointerX = null;
  });

  return {
    jumpHeld() {
      return jumpHeld;
    },
    slideHeld() {
      return slideHeld;
    },
    sprintHeld() {
      return sprintHeld;
    },
    slowHeld() {
      return slowHeld;
    },
    /** The pointer's x in CSS pixels, or null when it never moved. */
    pointerX() {
      return pointerX;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
