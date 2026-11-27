// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Flat
// shapes (a turkey, a farmer, fences, hay bales, the oven, corn), canvas text for the HUD and
// the panels. Text that holds a number is rebuilt only when the number changes, so a frame
// allocates nothing.
import { FIELD, FONT, LIVES, OB, PALETTE } from './config.js';
import { KIND_CORN } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width and top; its height grows with its lines. */
const PANEL = { width: 640, top: 110 };
const HEART_SIZE = 22;
const HEART_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const distanceLabel = cachedLabel('');
  const stageLabel = cachedLabel('');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const farmerLabel = cachedLabel('');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  /** Convert a pointer's client x (CSS pixels) to a logical field x. */
  function toLogicalX(clientX) {
    const ratio = window.devicePixelRatio || 1;
    return (clientX * ratio - view.x) / view.scale;
  }

  /** The sky: a warm sunset outside, dark firelit wood in the kitchen. */
  function drawSky(stage) {
    if (stage === 2) {
      context.fillStyle = PALETTE.kitchenWall;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      return;
    }
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    // The low sun.
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(1050, 150, 52, 0, Math.PI * 2);
    context.fill();
  }

  function drawClouds(scrollX) {
    if (scrollX === undefined) return;
    context.fillStyle = PALETTE.cloud;
    for (let index = 0; index < 4; index += 1) {
      const x = (((index * 380 + 120 - scrollX * 0.15) % 1400) + 1400) % 1400 - 60;
      const y = 70 + index * 42;
      context.beginPath();
      context.ellipse(x, y, 64, 20, 0, 0, Math.PI * 2);
      context.ellipse(x + 40, y + 8, 44, 16, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  /** The barn and windmill on the horizon, drifting slowly with the world. */
  function drawBarn(scrollX) {
    const x = (((-scrollX * 0.3) % 1600) + 1600) % 1600 - 160;
    context.fillStyle = PALETTE.barn;
    context.fillRect(x, FIELD.groundY - 150, 150, 150);
    context.fillStyle = PALETTE.barnRoof;
    context.beginPath();
    context.moveTo(x - 12, FIELD.groundY - 150);
    context.lineTo(x + 75, FIELD.groundY - 210);
    context.lineTo(x + 162, FIELD.groundY - 150);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.panel;
    context.fillRect(x + 55, FIELD.groundY - 70, 40, 70);
    // The windmill, a little further along.
    const wx = x + 320;
    context.strokeStyle = PALETTE.fence;
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(wx, FIELD.groundY);
    context.lineTo(wx + 20, FIELD.groundY - 170);
    context.moveTo(wx + 40, FIELD.groundY);
    context.lineTo(wx + 20, FIELD.groundY - 170);
    context.stroke();
    context.fillStyle = PALETTE.fence;
    context.beginPath();
    context.arc(wx + 20, FIELD.groundY - 170, 10, 0, Math.PI * 2);
    context.fill();
  }

  function drawFencePosts(scrollX) {
    context.fillStyle = PALETTE.fence;
    for (let index = 0; index < 9; index += 1) {
      const x = (((index * 170 - scrollX * 0.6) % 1530) + 1530) % 1530 - 20;
      context.fillRect(x, FIELD.groundY - 58, 10, 58);
    }
    context.fillRect(0, FIELD.groundY - 52, FIELD.width, 6);
    context.fillRect(0, FIELD.groundY - 30, FIELD.width, 6);
  }

  function drawCornStalks(scrollX) {
    context.fillStyle = PALETTE.cornStalk;
    for (let index = 0; index < 12; index += 1) {
      const x = (((index * 130 - scrollX * 0.85) % 1560) + 1560) % 1560 - 30;
      const h = 90 + (index % 3) * 22;
      context.fillRect(x, FIELD.groundY - h, 8, h);
      context.fillStyle = PALETTE.cornLeaf;
      context.beginPath();
      context.moveTo(x + 4, FIELD.groundY - h + 20);
      context.lineTo(x - 22, FIELD.groundY - h + 46);
      context.lineTo(x + 4, FIELD.groundY - h + 40);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.cornStalk;
    }
  }

  function drawGround(state) {
    if (state.stage === 2) {
      context.fillStyle = PALETTE.kitchenFloor;
      context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
      context.fillStyle = PALETTE.kitchenWall;
      context.fillRect(0, FIELD.groundY, FIELD.width, 8);
      // Floorboards.
      context.strokeStyle = PALETTE.kitchenWall;
      context.lineWidth = 3;
      for (let index = 0; index < 8; index += 1) {
        context.beginPath();
        context.moveTo(0, FIELD.groundY + 14 + index * 12);
        context.lineTo(FIELD.width, FIELD.groundY + 14 + index * 12);
        context.stroke();
      }
      return;
    }
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.groundTop;
    context.fillRect(0, FIELD.groundY, FIELD.width, 10);
    // Grass tufts, scrolling with the world.
    context.fillStyle = PALETTE.grass;
    for (let index = 0; index < 24; index += 1) {
      const x = (((index * 97 - state.scrollX) % 1344) + 1344) % 1344 - 32;
      const y = FIELD.groundY + 18 + ((index * 37) % 70);
      context.fillRect(x, y, 14, 5);
      context.fillRect(x + 4, y - 6, 6, 6);
    }
  }

  /** The oven in the kitchen background: a big dark box with a fire glowing inside. */
  function drawKitchenOven(state) {
    const x = (((-state.scrollX * 0.5) % 2200) + 2200) % 2200 - 300;
    context.fillStyle = PALETTE.ovenBody;
    context.fillRect(x, FIELD.groundY - 260, 220, 260);
    context.fillStyle = PALETTE.ovenDoor;
    context.fillRect(x + 24, FIELD.groundY - 170, 172, 130);
    const flicker = 0.75 + 0.25 * Math.sin(state.elapsed * 9);
    context.fillStyle = PALETTE.ovenFire;
    context.globalAlpha = flicker;
    context.beginPath();
    context.moveTo(x + 60, FIELD.groundY - 60);
    context.lineTo(x + 110, FIELD.groundY - 140);
    context.lineTo(x + 160, FIELD.groundY - 60);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = PALETTE.ovenGlow;
    context.fillRect(x + 90, FIELD.groundY - 220, 40, 14);
    // A warm window on the kitchen wall, and copper pots hanging from a rail.
    const wx = (((-state.scrollX * 0.25) % 1800) + 1800) % 1800 - 200;
    context.fillStyle = PALETTE.ovenGlow;
    context.globalAlpha = 0.85;
    context.fillRect(wx, 120, 130, 150);
    context.globalAlpha = 1;
    context.fillStyle = PALETTE.kitchenWall;
    context.fillRect(wx + 8, 128, 114, 134);
    context.fillStyle = PALETTE.ovenGlow;
    context.globalAlpha = 0.5;
    context.fillRect(wx + 8, 128, 114, 134);
    context.globalAlpha = 1;
    context.strokeStyle = PALETTE.fence;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(wx + 8, 195);
    context.lineTo(wx + 122, 195);
    context.moveTo(wx + 65, 128);
    context.lineTo(wx + 65, 262);
    context.stroke();
    const px = (((-state.scrollX * 0.4) % 1500) + 1500) % 1500 - 150;
    // A rail with copper pots hanging from it.
    context.strokeStyle = PALETTE.fence;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(px - 40, 108);
    context.lineTo(px + 280, 108);
    context.stroke();
    context.fillStyle = PALETTE.ovenGlow;
    for (let index = 0; index < 3; index += 1) {
      const potX = px + index * 90;
      context.beginPath();
      context.arc(potX, 150, 26, 0, Math.PI);
      context.fill();
      context.fillRect(potX - 26, 150, 52, 8);
      context.fillRect(potX - 3, 108, 6, 20);
    }
  }

  function drawField(state) {
    drawSky(state.stage);
    if (state.stage === 2) {
      drawKitchenOven(state);
    } else {
      drawClouds(state.scrollX);
      drawBarn(state.scrollX);
      drawFencePosts(state.scrollX);
      if (state.stage === 1) drawCornStalks(state.scrollX);
    }
    drawGround(state);

    // Pickups.
    for (let index = 0; index < state.pickups.length; index += 1) {
      const item = state.pickups[index];
      if (!item.active) continue;
      if (item.kind === KIND_CORN) {
        context.fillStyle = PALETTE.corn;
        context.beginPath();
        context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 3, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.cornHusk;
        context.fillRect(item.x + 2, item.y + item.height / 2, 6, 10);
      } else {
        context.fillStyle = PALETTE.feather;
        context.beginPath();
        context.ellipse(item.x + item.width / 2, item.y + item.height / 2, 8, 16, 0.5, 0, Math.PI * 2);
        context.fill();
      }
    }

    // Obstacles.
    for (let index = 0; index < state.obstacles.length; index += 1) {
      const item = state.obstacles[index];
      if (!item.active) continue;
      drawObstacle(item);
    }

    // The farmer, closing in from the left as his distance shrinks.
    drawFarmer(state);

    // The turkey, blinking while invulnerable after a hit.
    const turkey = state.turkey;
    if (turkey.invulnerable === 0 || Math.floor(turkey.invulnerable * 10) % 2 === 1) {
      drawTurkey(turkey, state.elapsed);
    }
  }

  function drawObstacle(item) {
    if (item.kind === OB.FENCE) {
      context.fillStyle = PALETTE.fence;
      context.fillRect(item.x, item.y, 8, item.height);
      context.fillRect(item.x + item.width - 8, item.y, 8, item.height);
      context.fillRect(item.x, item.y + 12, item.width, 8);
      context.fillRect(item.x, item.y + 38, item.width, 8);
    } else if (item.kind === OB.HAY) {
      context.fillStyle = PALETTE.hay;
      context.beginPath();
      context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.hayBand;
      context.lineWidth = 4;
      context.beginPath();
      context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 3, item.height / 3, 0, 0, Math.PI * 2);
      context.stroke();
    } else if (item.kind === OB.BRANCH) {
      context.fillStyle = PALETTE.branch;
      context.fillRect(item.x, item.y + 10, item.width, 10);
      context.fillStyle = PALETTE.leaf;
      for (let index = 0; index < 4; index += 1) {
        context.beginPath();
        context.ellipse(item.x + 10 + index * 16, item.y + 6, 12, 7, 0, 0, Math.PI * 2);
        context.fill();
      }
    } else if (item.kind === OB.KNIFE) {
      context.fillStyle = PALETTE.knifeHandle;
      context.fillRect(item.x + item.width / 2 - 4, item.y + item.height - 16, 8, 16);
      context.fillStyle = PALETTE.knifeBlade;
      context.beginPath();
      context.moveTo(item.x, item.y + item.height - 14);
      context.lineTo(item.x + item.width, item.y + item.height - 14);
      context.lineTo(item.x + item.width / 2, item.y);
      context.closePath();
      context.fill();
    } else if (item.kind === OB.OVEN) {
      context.fillStyle = PALETTE.ovenBody;
      context.fillRect(item.x, item.y, item.width, item.height);
      context.fillStyle = PALETTE.ovenDoor;
      context.fillRect(item.x + 14, item.y + 30, item.width - 28, item.height - 44);
      const flicker = 0.7 + 0.3 * Math.sin(item.x * 0.05);
      context.fillStyle = PALETTE.ovenFire;
      context.globalAlpha = flicker;
      context.beginPath();
      context.moveTo(item.x + 30, item.y + item.height - 16);
      context.lineTo(item.x + item.width / 2, item.y + 44);
      context.lineTo(item.x + item.width - 30, item.y + item.height - 16);
      context.closePath();
      context.fill();
      context.globalAlpha = 1;
      context.fillStyle = PALETTE.ovenGlow;
      context.fillRect(item.x + item.width / 2 - 14, item.y + 8, 28, 10);
    } else if (item.kind === OB.MUD) {
      context.fillStyle = PALETTE.mud;
      context.beginPath();
      context.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 2, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  /** The farmer, running in from the left, a carving knife in his hand. */
  function drawFarmer(state) {
    const behind = state.farmerBehind;
    if (behind > 60) return;
    const turkey = state.turkey;
    const x = turkey.x - 40 - behind * 2.2;
    if (x < -110) return;
    const base = FIELD.groundY;
    const run = Math.sin(state.elapsed * 14) * 6;
    const close = behind < 15;
    // Legs.
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(x + 14, base - 34 + run, 8, 34 - run);
    context.fillRect(x + 30, base - 34 - run, 8, 34 + run);
    // Body: overalls over a shirt.
    context.fillStyle = PALETTE.farmerShirt;
    context.fillRect(x + 8, base - 78, 38, 46);
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(x + 12, base - 62, 30, 30);
    // Head and straw hat.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(x + 27, base - 92, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(x + 27, base - 102, 26, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(x + 14, base - 118, 26, 16);
    context.fillStyle = PALETTE.farmerHatBand;
    context.fillRect(x + 14, base - 106, 26, 5);
    // The carving knife in his raised hand.
    context.fillStyle = PALETTE.farmerKnife;
    context.fillRect(x + 46, base - 108, 6, 34);
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(x + 44, base - 112, 10, 10);
    if (close) {
      text('!', x + 27, base - 140, 36, PALETTE.danger, 'center');
    }
  }

  /** The turkey: a brown body under a fan of tail feathers, running, jumping or sliding. */
  function drawTurkey(turkey, elapsed) {
    const cx = turkey.x + turkey.width / 2;
    const base = turkey.y + turkey.height;
    const run = turkey.onGround ? Math.sin(turkey.runPhase * 10) : 0;
    const sway = Math.sin(elapsed * 3) * 3;
    if (turkey.sliding) {
      // Low and stretched, slipping under the branch.
      context.fillStyle = PALETTE.turkeyBody;
      context.beginPath();
      context.ellipse(cx, base - 14, 34, 14, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.turkeyHead;
      context.fillRect(cx + 22, base - 34, 14, 14);
      context.fillStyle = PALETTE.turkeyBeak;
      context.fillRect(cx + 36, base - 30, 10, 5);
      return;
    }
    // Tail feathers, fanned behind, swaying as the turkey runs.
    for (let index = 0; index < 5; index += 1) {
      context.fillStyle = PALETTE.tail[index];
      context.beginPath();
      context.ellipse(cx - 26 - index * 2, base - 34 + sway * (index % 2 === 0 ? 1 : -1), 12, 26, -0.5 - index * 0.18, 0, Math.PI * 2);
      context.fill();
    }
    // Body.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(cx, base - 26, 26, 30, 0, 0, Math.PI * 2);
    context.fill();
    // Wing.
    context.fillStyle = PALETTE.turkeyWing;
    context.beginPath();
    context.ellipse(cx - 4, base - 24, 14, 18, -0.3, 0, Math.PI * 2);
    context.fill();
    // Legs, alternating while running, tucked while jumping.
    context.fillStyle = PALETTE.turkeyLeg;
    if (turkey.onGround) {
      context.fillRect(cx - 10, base - 8, 5, 10 + run);
      context.fillRect(cx + 6, base - 8, 5, 10 - run);
    } else {
      context.fillRect(cx - 10, base - 8, 5, 8);
      context.fillRect(cx + 6, base - 8, 5, 8);
    }
    // Head, beak and wattle.
    context.fillStyle = PALETTE.turkeyHead;
    context.beginPath();
    context.arc(cx + 16, base - 62, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.turkeyBeak;
    context.beginPath();
    context.moveTo(cx + 26, base - 64);
    context.lineTo(cx + 38, base - 60);
    context.lineTo(cx + 26, base - 56);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.turkeyWattle;
    context.fillRect(cx + 22, base - 52, 6, 10);
    // An eye, looking ahead.
    context.fillStyle = '#1c1c20';
    context.beginPath();
    context.arc(cx + 20, base - 64, 2.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(Math.floor(state.score)), 24, 18, 28, PALETTE.text, 'left');
    text(distanceLabel(Math.floor(state.distance) + ' m'), FIELD.width - 24, 18, 28, PALETTE.text, 'right');
    const stageName = state.stage === 0 ? 'Farmyard' : state.stage === 1 ? 'Cornfield' : 'Kitchen';
    text(stageLabel(stageName), FIELD.width / 2, 18, 28, PALETTE.text, 'center');
    // Lives as hearts.
    for (let index = 0; index < LIVES; index += 1) {
      const x = 30 + index * (HEART_SIZE + HEART_GAP);
      const y = 56;
      context.fillStyle = index < state.lives ? PALETTE.danger : PALETTE.muted;
      context.beginPath();
      context.moveTo(x, y + 6);
      context.bezierCurveTo(x, y, x - 8, y - 4, x - 8, y + 4);
      context.bezierCurveTo(x - 8, y + 10, x, y + 14, x, y + 16);
      context.bezierCurveTo(x, y + 14, x + 8, y + 10, x + 8, y + 4);
      context.bezierCurveTo(x + 8, y - 4, x, y, x, y + 6);
      context.fill();
    }
    // The farmer meter: how far behind he is, green when far, red when close.
    const barX = FIELD.width / 2 - 150;
    const barY = 56;
    const barW = 300;
    const barH = 12;
    const closeness = 1 - Math.min(1, state.farmerBehind / 60);
    context.fillStyle = PALETTE.panel;
    context.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    context.fillStyle = closeness > 0.66 ? PALETTE.danger : closeness > 0.33 ? PALETTE.ovenGlow : PALETTE.safe;
    context.fillRect(barX, barY, barW * closeness, barH);
    text(farmerLabel('FARMER ' + Math.floor(state.farmerBehind) + 'm'), FIELD.width / 2, barY + 18, 16, PALETTE.muted, 'center');
  }

  function drawPanel(lines, prompt) {
    // Each line gets its own font size plus a gap, so a big title never crowds the next line.
    let contentHeight = 24;
    for (const line of lines) contentHeight += line.size + 12;
    contentHeight += 44;
    const height = PANEL.top + contentHeight;
    const x = (FIELD.width - PANEL.width) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, PANEL.top, PANEL.width, height - PANEL.top);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, PANEL.top, PANEL.width, height - PANEL.top);
    context.textBaseline = 'top';
    let y = PANEL.top + 24;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      text(line.text, FIELD.width / 2, y, line.size, line.color, 'center');
      y += line.size + 12;
    }
    text(prompt, FIELD.width / 2, height - 52, 22, PALETTE.muted, 'center');
  }

  function drawTitle(state, best) {
    drawField(state);
    context.fillStyle = 'rgba(20, 10, 6, 0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    drawPanel(
      [
        { text: 'GOBBLE DASH', size: 56, color: PALETTE.ovenGlow },
        { text: 'The Great Turkey Escape', size: 28, color: PALETTE.text },
        { text: 'Thanksgiving is coming. Run, turkey, run.', size: 22, color: PALETTE.muted },
        { text: 'Jump the fences. Slide under the branches.', size: 22, color: PALETTE.text },
        { text: 'Dodge the oven and the carving knife.', size: 22, color: PALETTE.text },
        { text: 'Outrun the farmer to the forest, 1000 m away.', size: 22, color: PALETTE.text },
        { text: best > 0 ? 'Best score ' + best : '', size: 22, color: PALETTE.ovenGlow },
      ].filter((line) => line.text !== ''),
      'Space or click to start  |  Arrows / WASD to run  |  M mutes',
    );
  }

  function drawPaused() {
    drawPanel(
      [
        { text: 'PAUSED', size: 44, color: PALETTE.text },
        { text: 'The farmer waits. The turkey does not.', size: 22, color: PALETTE.muted },
      ],
      'P or Space to keep running',
    );
  }

  function drawOver(state, best, escaped) {
    drawField(state);
    context.fillStyle = 'rgba(20, 10, 6, 0.5)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    if (escaped) {
      drawPanel(
        [
          { text: 'ESCAPED!', size: 52, color: PALETTE.safe },
          { text: 'You made it to the forest. No dinner today.', size: 24, color: PALETTE.text },
          { text: 'Distance 1000 m', size: 24, color: PALETTE.text },
          { text: 'Score ' + Math.floor(state.score), size: 24, color: PALETTE.text },
          { text: 'Best ' + Math.max(best, Math.floor(state.score)), size: 24, color: PALETTE.ovenGlow },
        ],
        'Space or click to run again',
      );
    } else {
      drawPanel(
        [
          { text: 'CAUGHT!', size: 52, color: PALETTE.danger },
          { text: 'The farmer got you. Thanksgiving is on.', size: 24, color: PALETTE.text },
          { text: 'Distance ' + Math.floor(state.distance) + ' m', size: 24, color: PALETTE.text },
          { text: 'Score ' + Math.floor(state.score), size: 24, color: PALETTE.text },
          { text: 'Best ' + Math.max(best, Math.floor(state.score)), size: 24, color: PALETTE.ovenGlow },
        ],
        'Space or click to run again',
      );
    }
  }

  return {
    resize,
    toLogicalX,
    draw(state, screen, best, escaped) {
      resize();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = PALETTE.backdrop;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) {
        drawField(state);
        drawHud(state);
        drawPaused();
      } else if (screen === SCREEN_OVER) {
        drawOver(state, best, escaped);
      } else {
        drawField(state);
        drawHud(state);
      }
    },
  };
}
