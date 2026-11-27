// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One metre of run is this many pixels of world scrolled past. */
export const PX_PER_METRE = 20;

/** The distance, in metres, that wins the game: the forest, past the kitchen. */
export const ESCAPE_METRES = 1000;

/** The turkey. Jump velocity and gravity give a tap jump of about 175 px, enough to clear the oven. */
export const TURKEY = {
  x: 280,
  width: 64,
  height: 66,
  slideHeight: 34,
  gravity: 2200,
  jumpVelocity: -880,
  /** Holding jump while rising cuts gravity, so a tap hops and a hold jumps high. */
  holdGravityScale: 0.75,
  /** How far left/right of home the turkey may be steered. */
  xMin: 140,
  xMax: 560,
  steerSpeed: 320,
  invulnerable: 1.5,
  slideTime: 0.55,
};

/** The farmer chasing from behind. Distance is in metres behind the turkey. */
export const FARMER = {
  startBehind: 50,
  /** Metres the farmer gains on the turkey for each stumble. */
  stumbleGain: 15,
  /** Metres a second the farmer falls behind while the turkey runs clean. */
  fallBehind: 1.2,
  /** Extra fall-behind while sprinting, extra gain while dawdling. */
  sprintFallBehind: 3.0,
  slowGain: 3.0,
};

export const LIVES = 3;

/** Scroll speed in px/s at each stage, and how much sprinting/slowing moves it. */
export const SPEED = {
  base: 380,
  sprintScale: 1.4,
  slowScale: 0.6,
  stageScale: [1, 1.15, 1.3],
};

/** Stages by distance: farmyard, cornfield, kitchen. The forest is the escape. */
export const STAGES = [
  { name: 'Farmyard', from: 0, to: 300 },
  { name: 'Cornfield', from: 300, to: 700 },
  { name: 'Kitchen', from: 700, to: 1000 },
];

/** Obstacle kinds. Jumpable ones are cleared by jumping; the branch is cleared by sliding. */
export const OB = {
  FENCE: 0,
  HAY: 1,
  BRANCH: 2,
  KNIFE: 3,
  OVEN: 4,
  MUD: 5,
};

/** Width, height and whether it is jumped (true) or slid under (false). */
export const OB_DEFS = {
  [OB.FENCE]: { width: 34, height: 72, jump: true },
  [OB.HAY]: { width: 62, height: 56, jump: true },
  [OB.BRANCH]: { width: 70, height: 26, jump: false },
  [OB.KNIFE]: { width: 26, height: 44, jump: true },
  [OB.OVEN]: { width: 116, height: 112, jump: true },
  [OB.MUD]: { width: 90, height: 14, jump: true },
};

/** Which obstacles each stage spawns. The oven only appears in the kitchen. */
export const STAGE_OBS = [
  [OB.FENCE, OB.HAY],
  [OB.FENCE, OB.HAY, OB.BRANCH, OB.KNIFE, OB.MUD],
  [OB.FENCE, OB.HAY, OB.BRANCH, OB.KNIFE, OB.MUD, OB.OVEN],
];

/** Spawn pacing: seconds between obstacle groups, shrinking as the stage advances. */
export const SPAWN = { interval: 1.15, intervalScale: 0.9, minInterval: 0.55 };

export const CORN = { size: 26, points: 10 };
export const FEATHER = { size: 30, points: 50 };

/** How many obstacles and pickups can exist at once; the pools are allocated once, at boot. */
export const POOL_SIZE = 48;

/** Points: 1 per metre run, plus pickups, plus a bonus for reaching the forest. */
export const SCORE = { perMetre: 1, escapeBonus: 500 };

export const PALETTE = {
  backdrop: '#2b1a12',
  // Farmyard / cornfield sky: a warm Thanksgiving sunset.
  skyTop: '#f7b733',
  skyMid: '#f2703f',
  skyLow: '#c94b4b',
  sun: '#ffe9a8',
  cloud: '#ffe9c4',
  barn: '#8a3b2e',
  barnRoof: '#5e2a20',
  fence: '#7a4a26',
  ground: '#6b4a2a',
  groundTop: '#8a5a2e',
  grass: '#c98a3d',
  cornStalk: '#7a8a2a',
  cornLeaf: '#a8b83a',
  // Kitchen: dark wood and firelight.
  kitchenWall: '#54402c',
  kitchenFloor: '#6b4a2a',
  ovenBody: '#2e2e34',
  ovenDoor: '#1c1c20',
  ovenFire: '#ff7a2a',
  ovenGlow: '#ffb347',
  // The turkey.
  turkeyBody: '#8a5230',
  turkeyWing: '#6e3f22',
  turkeyHead: '#c9d2e3',
  turkeyBeak: '#e8a33c',
  turkeyWattle: '#e5534b',
  turkeyLeg: '#e8a33c',
  tail: ['#a0522d', '#d2691e', '#e8a33c', '#c94b4b', '#8a5a2e'],
  // The farmer.
  farmerSkin: '#e8b88a',
  farmerShirt: '#4a7a3a',
  farmerOveralls: '#3a5a8a',
  farmerHat: '#e8c94c',
  farmerHatBand: '#8a5a2e',
  farmerKnife: '#c9ced6',
  // Obstacles and pickups.
  hay: '#e8c94c',
  hayBand: '#b8963a',
  branch: '#5a3a1e',
  leaf: '#5a8a2a',
  knifeBlade: '#d8dde6',
  knifeHandle: '#3a2a1e',
  mud: '#4a3220',
  corn: '#f2c94c',
  cornHusk: '#7a8a2a',
  feather: '#ffd94c',
  panel: '#2b1a12',
  panelEdge: '#e8a33c',
  text: '#fff3e0',
  muted: '#d8b88a',
  danger: '#ff5a4b',
  safe: '#7ac74f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
