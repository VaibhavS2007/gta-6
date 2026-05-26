/**
 * GTA VI — VICE CITY HEIST MINI GAME (FIXED)
 */

// --- Wait for DOM
(function() {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // --- roundRect polyfill for older browsers
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      this.closePath();
    };
  }

  // --- Resize canvas to fit container
  function resizeCanvas() {
    const container = canvas.parentElement;
    const w = container.clientWidth || 800;
    canvas.width = w;
    canvas.height = Math.min(500, Math.floor(w * 0.56));
    canvas.style.width = '100%';
  }

  // --- Game State
  let gameRunning = false;
  let animFrame = null;
  let lastTime = 0;
  let scrollOffset = 0;
  let copTimer = 0;
  let cashTimer = 0;
  let spawnSpeed = 1;
  let levelUpMsg = null;

  const COP_INTERVAL  = 2600; // ms
  const CASH_INTERVAL = 1600; // ms

  const state = {
    score: 0,
    lives: 3,
    level: 1,
    wantedLevel: 0,
    cashCollected: 0,
    highScore: parseInt(localStorage.getItem('gta6hs') || '0'),
  };

  // --- Entities
  let cops      = [];
  let cashBags  = [];
  let particles = [];
  let buildings = [];

  // --- Road config
  const road = { leftEdge: 0, rightEdge: 0, laneCount: 3, laneWidth: 0 };

  // --- Player
  const player = {
    x: 0, y: 0,
    w: 34, h: 58,
    speed: 0,
    maxSpeed: 5.5,
    accel: 0.2,
    brake: 0.15,
    friction: 0.05,
    turnSpeed: 3.5,
    color: '#ff2d6b',
    trail: [],
    invincible: 0,
  };

  // --- Keys
  const keys = {};
  window.mobileKeys = window.mobileKeys || { left: false, right: false, up: false, down: false };
  const mobileKeys = window.mobileKeys;

  window.addEventListener('keydown', function(e) {
    keys[e.key] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', function(e) { keys[e.key] = false; });

  function isLeft()  { return keys['ArrowLeft']  || keys['a'] || keys['A'] || mobileKeys.left;  }
  function isRight() { return keys['ArrowRight'] || keys['d'] || keys['D'] || mobileKeys.right; }
  function isUp()    { return keys['ArrowUp']    || keys['w'] || keys['W'] || mobileKeys.up;    }
  function isDown()  { return keys['ArrowDown']  || keys['s'] || keys['S'] || mobileKeys.down;  }

  // --- Init road layout
  function initRoad() {
    road.leftEdge  = canvas.width * 0.1;
    road.rightEdge = canvas.width * 0.9;
    road.laneWidth = (road.rightEdge - road.leftEdge) / road.laneCount;
  }

  // --- Init buildings on sidewalks
  function initBuildings() {
    buildings = [];
    const colors = ['#ff2d6b','#00d4ff','#ffd700','#a855f7','#22d3ee','#f97316'];
    for (let i = 0; i < 10; i++) {
      // left
      const lw = Math.max(road.leftEdge - 20, 10);
      buildings.push({
        x: 5 + Math.random() * Math.max(lw - 30, 10),
        y: Math.random() * canvas.height,
        w: 18 + Math.random() * 30,
        h: 40 + Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
      // right
      const rStart = road.rightEdge + 10;
      const rMax   = canvas.width - rStart - 10;
      buildings.push({
        x: rStart + Math.random() * Math.max(rMax - 30, 5),
        y: Math.random() * canvas.height,
        w: 18 + Math.random() * 30,
        h: 40 + Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  // --- Reset player to starting position
  function resetPlayer() {
    player.x         = canvas.width / 2;
    player.y         = canvas.height - 90;
    player.speed     = 0;
    player.trail     = [];
    player.invincible = 0;
  }

  // --- Spawn helpers
  function laneX(lane) {
    return road.leftEdge + road.laneWidth * lane + road.laneWidth / 2;
  }

  function spawnCop() {
    const lane = Math.floor(Math.random() * road.laneCount);
    cops.push({
      x: laneX(lane),
      y: -70,
      w: 30, h: 54,
      speed: 2.8 + state.level * 0.4 + Math.random() * 1.5,
    });
  }

  function spawnCash() {
    const lane = Math.floor(Math.random() * road.laneCount);
    cashBags.push({
      x: laneX(lane),
      y: -36,
      w: 28, h: 28,
      bob: Math.random() * Math.PI * 2,
    });
  }

  // --- Particles
  function addParticles(x, y, color, count) {
    count = count || 12;
    for (let i = 0; i < count; i++) {
      const ang   = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const spd   = 1.5 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        decay: 0.022 + Math.random() * 0.02,
        color: color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  // --- AABB collision
  function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) * 0.38 &&
           Math.abs(ay - by) < (ah + bh) * 0.36;
  }

  // --- Level check
  function checkLevel() {
    const newLevel = Math.floor(state.cashCollected / 5) + 1;
    if (newLevel > state.level) {
      state.level       = newLevel;
      state.wantedLevel = Math.min(5, Math.floor(state.level / 2));
      spawnSpeed        = 1 + (state.level - 1) * 0.18;
      updateHUD();
      levelUpMsg = { text: 'LEVEL ' + state.level, alpha: 1, y: canvas.height * 0.35 };
    }
  }

  // =====================
  // DRAW FUNCTIONS
  // =====================

  function drawRoad() {
    // Sidewalks
    ctx.fillStyle = '#16162a';
    ctx.fillRect(0, 0, road.leftEdge, canvas.height);
    ctx.fillRect(road.rightEdge, 0, canvas.width - road.rightEdge, canvas.height);

    // Road surface
    ctx.fillStyle = '#1e1e2c';
    ctx.fillRect(road.leftEdge, 0, road.rightEdge - road.leftEdge, canvas.height);

    // Neon edge lines
    ctx.save();
    ctx.shadowColor = '#ff2d6b';
    ctx.shadowBlur  = 12;
    ctx.strokeStyle = 'rgba(255,45,107,0.7)';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(road.leftEdge,  0); ctx.lineTo(road.leftEdge,  canvas.height);
    ctx.moveTo(road.rightEdge, 0); ctx.lineTo(road.rightEdge, canvas.height);
    ctx.stroke();
    ctx.restore();

    // Dashed lane dividers (animated)
    const stripeLen = 40;
    const gap       = 28;
    const total     = stripeLen + gap;
    ctx.save();
    ctx.shadowColor  = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur   = 5;
    ctx.strokeStyle  = 'rgba(255,215,0,0.4)';
    ctx.lineWidth    = 2;
    ctx.setLineDash([stripeLen, gap]);
    for (let lane = 1; lane < road.laneCount; lane++) {
      const lx = road.leftEdge + road.laneWidth * lane;
      ctx.lineDashOffset = -(scrollOffset % total);
      ctx.beginPath();
      ctx.moveTo(lx, 0); ctx.lineTo(lx, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawBuildings() {
    buildings.forEach(function(b) {
      // Scroll buildings at a slower rate (parallax)
      var y = ((b.y + scrollOffset * 0.35) % (canvas.height + b.h + 20)) - b.h;
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur  = 12;
      // Building face
      ctx.fillStyle   = b.color + '18';
      ctx.strokeStyle = b.color + 'aa';
      ctx.lineWidth   = 1.5;
      ctx.fillRect(b.x, y, b.w, b.h);
      ctx.strokeRect(b.x, y, b.w, b.h);
      // Windows
      ctx.fillStyle  = b.color + '55';
      ctx.shadowBlur = 4;
      for (var wy = y + 6; wy < y + b.h - 10; wy += 16) {
        for (var wx = b.x + 4; wx < b.x + b.w - 8; wx += 12) {
          ctx.fillRect(wx, wy, 7, 9);
        }
      }
      ctx.restore();
    });
  }

  function drawPalms() {
    const spacing  = 110;
    const count    = Math.ceil(canvas.height / spacing) + 2;
    const leftX    = road.leftEdge * 0.5;
    const rightX   = road.rightEdge + (canvas.width - road.rightEdge) * 0.5;

    for (let i = 0; i < count; i++) {
      const y = ((i * spacing + scrollOffset * 1.1) % (count * spacing)) - spacing;
      drawOnePalm(leftX,  y);
      drawOnePalm(rightX, y);
    }
  }

  function drawOnePalm(x, y) {
    ctx.save();
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth   = 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y - 44); ctx.stroke();

    ctx.strokeStyle = '#22c55e';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur  = 8;
    ctx.lineWidth   = 2.5;
    const fronds = [[-26,-14],[-18,-24],[0,-28],[18,-24],[26,-14]];
    fronds.forEach(function(f) {
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 42);
      ctx.lineTo(x - 4 + f[0], y - 42 + f[1]);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawCar(cx, cy, cw, ch, color, isPlayer) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowColor = color;
    ctx.shadowBlur  = isPlayer ? 22 : 14;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-cw/2, -ch/2, cw, ch, 7);
    ctx.fill();

    // Windshield
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = isPlayer ? 'rgba(0,212,255,0.75)' : 'rgba(160,220,255,0.55)';
    ctx.fillRect(-cw/2 + 4, -ch/2 + 7, cw - 8, ch * 0.27);

    // Rear window
    ctx.fillStyle = isPlayer ? 'rgba(0,212,255,0.5)' : 'rgba(160,220,255,0.35)';
    ctx.fillRect(-cw/2 + 4, ch/2 - ch * 0.22, cw - 8, ch * 0.17);

    // Wheels
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-cw/2 - 4, -ch/2 + 5,  7, 12);
    ctx.fillRect( cw/2 - 3, -ch/2 + 5,  7, 12);
    ctx.fillRect(-cw/2 - 4,  ch/2 - 17, 7, 12);
    ctx.fillRect( cw/2 - 3,  ch/2 - 17, 7, 12);

    if (isPlayer) {
      // Headlights
      ctx.fillStyle   = 'rgba(255,255,180,0.95)';
      ctx.shadowColor = '#ffffaa';
      ctx.shadowBlur  = 14;
      ctx.fillRect(-cw/2 + 3, -ch/2, 9, 5);
      ctx.fillRect( cw/2 - 12, -ch/2, 9, 5);
    } else {
      // Siren
      const t = Date.now() / 110;
      const sirenColor = Math.sin(t) > 0 ? '#ff2d6b' : '#00d4ff';
      ctx.fillStyle   = sirenColor;
      ctx.shadowColor = sirenColor;
      ctx.shadowBlur  = 22;
      ctx.beginPath();
      ctx.arc(-cw/4, -ch/2 + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc( cw/4, -ch/2 + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      // "POLICE" label
      ctx.shadowBlur       = 0;
      ctx.fillStyle        = 'white';
      ctx.font             = 'bold 7px Orbitron, monospace';
      ctx.textAlign        = 'center';
      ctx.textBaseline     = 'middle';
      ctx.fillText('POLICE', 0, 5);
    }
    ctx.restore();
  }

  function drawCashBag(bag) {
    const bob = Math.sin(bag.bob + Date.now() / 380) * 4;
    ctx.save();
    ctx.translate(bag.x, bag.y + bob);
    ctx.shadowColor  = '#ffd700';
    ctx.shadowBlur   = 22;
    ctx.font         = bag.w + 'px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰', 0, 0);
    ctx.restore();
  }

  function drawTrail() {
    if (player.trail.length < 2) return;
    ctx.save();
    for (let i = 1; i < player.trail.length; i++) {
      const a = (i / player.trail.length) * 0.45;
      ctx.beginPath();
      ctx.strokeStyle  = 'rgba(255,45,107,' + a + ')';
      ctx.shadowColor  = '#ff2d6b';
      ctx.shadowBlur   = 6;
      ctx.lineWidth    = 3 * (i / player.trail.length);
      ctx.moveTo(player.trail[i-1].x, player.trail[i-1].y);
      ctx.lineTo(player.trail[i].x,   player.trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(function(p) {
      ctx.save();
      ctx.globalAlpha  = Math.max(0, p.life);
      ctx.shadowColor  = p.color;
      ctx.shadowBlur   = 10;
      ctx.fillStyle    = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, p.size * p.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // --- HUD update
  function updateHUD() {
    const scoreEl  = document.getElementById('score');
    const levelEl  = document.getElementById('level');
    const livesEl  = document.getElementById('lives');
    const wantedEl = document.getElementById('wantedStars');
    if (!scoreEl) return;

    scoreEl.textContent = state.score.toLocaleString();
    levelEl.textContent = state.level;
    const heartArr = ['❤️','❤️','❤️'];
    livesEl.textContent = heartArr.slice(0, state.lives).join('') || '💀';

    const stars = wantedEl.querySelectorAll('.star');
    stars.forEach(function(s, i) {
      s.classList.toggle('active', i < state.wantedLevel);
    });
  }

  // =====================
  // GAME LOOP
  // =====================
  function gameLoop(ts) {
    if (!gameRunning) return;

    const dt = Math.min((ts - lastTime) / 16.67, 3);
    lastTime = ts;

    // --- Scroll speed
    const baseScroll = 3.2 + state.level * 0.35;
    const scrollSpd  = player.speed > 0
      ? baseScroll + player.speed * 0.55
      : baseScroll * 0.45;
    scrollOffset += scrollSpd * dt;

    // --- Player input
    const turning     = isLeft() ? -1 : isRight() ? 1 : 0;
    const accelerating = isUp();
    const braking      = isDown();

    if (accelerating) {
      player.speed = Math.min(player.maxSpeed + state.level * 0.15, player.speed + player.accel * dt);
    } else if (braking) {
      player.speed = Math.max(-player.maxSpeed * 0.35, player.speed - player.brake * dt);
    } else {
      player.speed *= Math.pow(1 - player.friction, dt);
      if (Math.abs(player.speed) < 0.05) player.speed = 0;
    }

    const turnFactor = 0.5 + Math.abs(player.speed) / player.maxSpeed * 0.7;
    player.x += turning * player.turnSpeed * turnFactor * dt;
    player.x  = Math.max(road.leftEdge  + player.w / 2 + 3,
                 Math.min(road.rightEdge - player.w / 2 - 3, player.x));

    // Trail
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 20) player.trail.shift();

    // Invincibility countdown
    if (player.invincible > 0) player.invincible -= dt;

    // --- Spawning
    copTimer  += dt * 16.67;
    cashTimer += dt * 16.67;
    if (copTimer  > COP_INTERVAL  / spawnSpeed) { spawnCop();  copTimer  = 0; }
    if (cashTimer > CASH_INTERVAL / spawnSpeed) { spawnCash(); cashTimer = 0; }

    // --- Move cops (falling down screen)
    cops.forEach(function(c) { c.y += (c.speed + state.level * 0.12) * dt; });
    cops = cops.filter(function(c) { return c.y < canvas.height + 80; });

    // --- Move cash bags
    cashBags.forEach(function(b) { b.y += (2.2 + state.level * 0.08) * dt; b.bob += 0.055 * dt; });
    cashBags = cashBags.filter(function(b) { return b.y < canvas.height + 50; });

    // --- Particles
    particles.forEach(function(p) {
      p.x   += p.vx * dt;
      p.y   += p.vy * dt;
      p.vy  += 0.07 * dt;
      p.life -= p.decay * dt;
    });
    particles = particles.filter(function(p) { return p.life > 0; });

    // --- Score tick
    state.score += Math.ceil(state.level * 0.28 * dt);
    updateHUD();

    // --- Cash collision
    cashBags = cashBags.filter(function(b) {
      if (overlaps(player.x, player.y, player.w, player.h, b.x, b.y, b.w, b.h)) {
        state.score += 500 * state.level;
        state.cashCollected++;
        addParticles(b.x, b.y, '#ffd700', 18);
        checkLevel();
        return false;
      }
      return true;
    });

    // --- Cop collision
    if (player.invincible <= 0) {
      for (let i = cops.length - 1; i >= 0; i--) {
        const c = cops[i];
        if (overlaps(player.x, player.y, player.w, player.h, c.x, c.y, c.w, c.h)) {
          state.lives--;
          player.invincible = 100;
          addParticles(player.x, player.y, '#ff2d6b', 22);
          addParticles(c.x, c.y, '#00d4ff', 14);
          cops.splice(i, 1);
          updateHUD();
          if (state.lives <= 0) { endGame(); return; }
          break;
        }
      }
    }

    // Level-up message decay
    if (levelUpMsg) {
      levelUpMsg.alpha -= 0.007 * dt;
      levelUpMsg.y     -= 0.35  * dt;
      if (levelUpMsg.alpha <= 0) levelUpMsg = null;
    }

    // =====================
    // DRAW
    // =====================
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sky/BG
    ctx.fillStyle = '#0c0c18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawPalms();
    drawBuildings();
    drawRoad();

    // Cash bags
    cashBags.forEach(drawCashBag);

    // Cops
    cops.forEach(function(c) { drawCar(c.x, c.y, c.w, c.h, '#2277ff', false); });

    // Player trail + car
    drawTrail();
    if (player.invincible <= 0 || Math.floor(player.invincible / 7) % 2 === 0) {
      drawCar(player.x, player.y, player.w, player.h, player.color, true);
    }

    // Particles
    drawParticles();

    // Level-up overlay text
    if (levelUpMsg) {
      ctx.save();
      ctx.globalAlpha     = Math.max(0, levelUpMsg.alpha);
      ctx.shadowColor     = '#ff2d6b';
      ctx.shadowBlur      = 30;
      ctx.fillStyle       = '#ffffff';
      ctx.font            = 'bold 52px Bebas Neue, Impact, sans-serif';
      ctx.textAlign       = 'center';
      ctx.textBaseline    = 'middle';
      ctx.fillText(levelUpMsg.text, canvas.width / 2, levelUpMsg.y);
      ctx.fillStyle       = '#ffd700';
      ctx.shadowColor     = '#ffd700';
      ctx.font            = '16px Orbitron, monospace';
      ctx.fillText('WANTED LEVEL UP!', canvas.width / 2, levelUpMsg.y + 46);
      ctx.restore();
    }

    // Bottom HUD bar on canvas
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,14,0.72)';
    ctx.fillRect(0, canvas.height - 32, canvas.width, 32);
    ctx.fillStyle = 'rgba(255,45,107,0.5)';
    ctx.fillRect(0, canvas.height - 32, canvas.width, 1);

    ctx.font         = '13px Orbitron, monospace';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 8;

    ctx.textAlign    = 'left';
    ctx.fillStyle    = '#ffd700';
    ctx.shadowColor  = '#ffd700';
    ctx.fillText('HI: ' + state.highScore.toLocaleString(), 14, canvas.height - 16);

    ctx.textAlign   = 'right';
    ctx.fillStyle   = '#ff2d6b';
    ctx.shadowColor = '#ff2d6b';
    ctx.fillText('💰 ' + state.cashCollected, canvas.width - 14, canvas.height - 16);
    ctx.restore();

    animFrame = requestAnimationFrame(gameLoop);
  }

  // --- End game
  function endGame() {
    gameRunning = false;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }

    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('gta6hs', state.highScore);
    }

    const overlay = document.getElementById('gameOverlay');
    const title   = document.getElementById('overlayTitle');
    const msg     = document.getElementById('overlayMsg');
    const btn     = document.getElementById('startGameBtn');

    title.textContent  = 'WASTED';
    title.style.color  = '#ff2d6b';
    msg.innerHTML      =
      'SCORE: <strong style="color:#ffd700">' + state.score.toLocaleString() + '</strong><br>' +
      'BEST:  <strong style="color:#00d4ff">' + state.highScore.toLocaleString() + '</strong><br>' +
      '💰 CASH BAGS: ' + state.cashCollected;
    btn.textContent    = 'PLAY AGAIN';

    showOverlay();

    // Reset state for next round
    state.score          = 0;
    state.lives          = 3;
    state.level          = 1;
    state.wantedLevel    = 0;
    state.cashCollected  = 0;
    cops = []; cashBags = []; particles = [];
    spawnSpeed  = 1;
    copTimer    = 0;
    cashTimer   = 0;
    scrollOffset = 0;
  }

  function showOverlay() {
    const overlay = document.getElementById('gameOverlay');
    overlay.style.display = 'flex';
  }
  function hideOverlay() {
    const overlay = document.getElementById('gameOverlay');
    overlay.style.display = 'none';
  }

  // --- Public start function
  window.startGame = function() {
    hideOverlay();

    resizeCanvas();
    initRoad();
    initBuildings();
    resetPlayer();

    cops = []; cashBags = []; particles = [];
    spawnSpeed   = 1;
    copTimer     = 0;
    cashTimer    = 0;
    scrollOffset = 0;
    levelUpMsg   = null;

    // Reset state
    state.score         = 0;
    state.lives         = 3;
    state.level         = 1;
    state.wantedLevel   = 0;
    state.cashCollected = 0;

    document.getElementById('overlayTitle').style.color = '';
    document.getElementById('overlayTitle').textContent = 'THE HEIST';
    document.getElementById('overlayMsg').textContent   =
      'Drive through Vice City. Collect 💰 cash bags and dodge 🚔 police!';
    document.getElementById('startGameBtn').textContent = 'START THE HEIST';

    updateHUD();

    gameRunning = true;
    lastTime    = performance.now();
    animFrame   = requestAnimationFrame(gameLoop);
  };

  // --- Mobile control event listeners (attach after DOM is ready)
  function attachMobileControls() {
    const pairs = [
      ['mobLeft',  'left'],
      ['mobRight', 'right'],
      ['mobUp',    'up'],
      ['mobDown',  'down'],
    ];
    pairs.forEach(function(pair) {
      const el = document.getElementById(pair[0]);
      if (!el) return;
      const key = pair[1];
      el.addEventListener('touchstart', function(e) { e.preventDefault(); mobileKeys[key] = true;  }, { passive: false });
      el.addEventListener('touchend',   function(e) { e.preventDefault(); mobileKeys[key] = false; }, { passive: false });
      el.addEventListener('mousedown',  function()  { mobileKeys[key] = true;  });
      el.addEventListener('mouseup',    function()  { mobileKeys[key] = false; });
    });
  }

  // --- Show overlay on load
  function init() {
    resizeCanvas();
    initRoad();
    showOverlay();
    attachMobileControls();
    window.addEventListener('resize', function() {
      if (!gameRunning) { resizeCanvas(); initRoad(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
