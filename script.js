// --- Canvas and Game Initialization ---
const canvas = document.getElementById('garden-canvas');
const ctx = canvas.getContext('2d');
const gameViewport = document.getElementById('game-viewport');

// UI Elements
const gardenLevelVal = document.getElementById('garden-level-val');
const xpBarFill = document.getElementById('xp-bar-fill');
const catsMetVal = document.getElementById('cats-met-val');
const timeEmoji = document.getElementById('time-emoji');
const timeVal = document.getElementById('time-val');
const timeCycleStatus = document.getElementById('time-cycle-status');
const btnTimeCycle = document.getElementById('btn-time-cycle');
const btnTimeAdvance = document.getElementById('btn-time-advance');
const btnFlower = document.getElementById('btn-flower');
const btnSnack = document.getElementById('btn-snack');
const albumTuxedo = document.getElementById('album-tuxedo');
const albumGinger = document.getElementById('album-ginger');

// Game States & Constants
let currentAction = 'flower'; // 'flower' or 'snack'
let gardenLevel = 1;
let gardenXP = 0;
const xpPerLevel = 100;

// Unique cats met tracker
const catsMet = {
  tuxedo: false,
  ginger: false
};

// Day-Night Cycle Variables
const TimeStates = {
  DAWN: 0,
  DAY: 1,
  DUSK: 2,
  NIGHT: 3
};
let timeOfDay = TimeStates.DAY;
const timeNames = ['Dawn', 'Day', 'Dusk', 'Night'];
const timeEmojis = ['🌅', '☀️', '🌇', '🌙'];
const bodyThemes = ['dawn-theme', 'day-theme', 'dusk-theme', 'night-theme'];

let isTimeCycleAuto = true;
let timeSecondsLeft = 15; // 15 seconds per time of day
const timeDuration = 15;

// Game Objects Arrays
const cats = [];
const items = []; // Flowers and Snacks
const particles = []; // Heart, Star, Zzz, Leaf, Crumb particles

// Cat Configuration
const CAT_TYPES = {
  TUXEDO: 'tuxedo',
  GINGER: 'ginger'
};

// Canvas DPI scaling for crisp rendering
function resizeCanvas() {
  const rect = gameViewport.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Particle System ---
class Particle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'heart', 'star', 'zzz', 'leaf', 'crumb'
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = type === 'zzz' ? -0.5 - Math.random() * 0.5 : -1 - Math.random() * 2;
    this.alpha = 1;
    this.scale = 0.5 + Math.random() * 0.8;
    this.life = 0;
    this.maxLife = type === 'zzz' ? 120 : type === 'crumb' ? 40 : 80;
    this.color = type === 'heart' ? '#ff4757' : type === 'star' ? '#ffa502' : type === 'leaf' ? '#2ed573' : '#a4b0be';
    this.text = type === 'zzz' ? 'Zzz' : '';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life++;
    this.alpha = 1 - (this.life / this.maxLife);
    if (this.type === 'zzz') {
      this.vx = Math.sin(this.life / 10) * 0.4; // float wobbly
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    if (this.type === 'heart') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-5, -5, -10, 0, 0, 8);
      ctx.bezierCurveTo(10, 0, 5, -5, 0, 0);
      ctx.fill();
    } else if (this.type === 'star') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 6, -Math.sin((18 + i * 72) * Math.PI / 180) * 6);
        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 3, -Math.sin((54 + i * 72) * Math.PI / 180) * 3);
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'zzz') {
      ctx.fillStyle = '#b0c4de';
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.fillText(this.text, 0, 0);
    } else if (this.type === 'leaf') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'crumb') {
      ctx.fillStyle = '#ffbe76';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- Garden Items System ---
class GardenItem {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'flower' or 'snack'
    this.scale = 0;
    this.growth = 0;
    this.portions = type === 'snack' ? 5 : 0; // Food portions
    this.flowerColor = type === 'flower' ? ['#ff7979', '#ffb8b8', '#fffa65', '#ff9f43', '#c56cf0'][Math.floor(Math.random() * 5)] : null;
    this.claimedBy = null; // Cat that is heading for this snack
  }

  update() {
    if (this.scale < 1) {
      this.scale += 0.08;
      if (this.scale > 1) this.scale = 1;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    if (this.type === 'flower') {
      // Draw stem
      ctx.strokeStyle = '#2ed573';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -12);
      ctx.stroke();

      // Leaves
      ctx.fillStyle = '#26de81';
      ctx.beginPath();
      ctx.ellipse(-3, -6, 4, 2, -Math.PI / 6, 0, Math.PI * 2);
      ctx.ellipse(3, -9, 4, 2, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Flower petals
      ctx.fillStyle = this.flowerColor;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const angle = (i * Math.PI * 2) / 5;
        const px = Math.cos(angle) * 5;
        const py = Math.sin(angle) * 5 - 12;
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -12, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'snack') {
      // Draw Food Bowl
      ctx.fillStyle = '#ef5777'; // Red bowl
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff7675'; // Innards
      ctx.beginPath();
      ctx.ellipse(0, -2, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Kibble/Fish biscuit stack inside
      if (this.portions > 0) {
        ctx.fillStyle = '#eccc68'; // Golden brown food
        const foodHeights = [0, -1, -2, -1, 0];
        const foodCount = Math.ceil(this.portions);
        ctx.beginPath();
        ctx.ellipse(0, -3, 9, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw small cookie bits depending on portions
        for (let i = 0; i < foodCount; i++) {
          ctx.fillStyle = '#ffa502';
          ctx.beginPath();
          ctx.arc(-5 + i * 2.5, -4 - Math.abs(foodHeights[i]), 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}

// --- Cute Cartoon Cat ---
class Cat {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'tuxedo' or 'ginger'
    this.name = type === CAT_TYPES.TUXEDO ? 'Tuxedo Cow Cat' : 'Ginger Tabby';

    this.size = 22; // Chubby radius
    this.state = 'idle'; // 'idle', 'walking', 'eating', 'sleeping'
    this.stateTimer = Math.floor(60 + Math.random() * 100);
    
    // Movement target
    this.targetX = x;
    this.targetY = y;
    this.speed = 0.8 + Math.random() * 0.4;
    this.vx = 0;
    this.vy = 0;

    // Drawing variables
    this.facingRight = Math.random() > 0.5;
    this.walkFrame = Math.random() * 100;
    this.tailAngle = 0;
    this.eyeBlinkTimer = Math.random() * 100;
    this.isBlinking = false;
    this.pettedJump = 0;
    this.pettedJumpVelocity = 0;
    this.gravity = 0.4;

    this.sproutRotation = 0;
    this.eatingTarget = null;
  }

  update() {
    // Blinking logic
    this.eyeBlinkTimer--;
    if (this.eyeBlinkTimer <= 0) {
      if (this.isBlinking) {
        this.isBlinking = false;
        this.eyeBlinkTimer = 100 + Math.random() * 200;
      } else {
        this.isBlinking = true;
        this.eyeBlinkTimer = 5 + Math.random() * 10;
      }
    }

    // Happy petting jump physics
    if (this.pettedJump > 0 || this.pettedJumpVelocity !== 0) {
      this.pettedJump += this.pettedJumpVelocity;
      this.pettedJumpVelocity -= this.gravity;
      if (this.pettedJump <= 0) {
        this.pettedJump = 0;
        this.pettedJumpVelocity = 0;
      }
    }

    // Animation wiggles
    this.tailAngle = Math.sin(Date.now() / 180) * 0.3;
    this.sproutRotation = Math.cos(Date.now() / 250) * 0.15;

    // AI Decision loop
    this.stateTimer--;

    // High priority: Look for food if hungry and not sleeping/eating
    if (this.state !== 'eating' && this.state !== 'sleeping') {
      const nearestFood = this.findNearestFood();
      if (nearestFood) {
        this.targetX = nearestFood.x;
        this.targetY = nearestFood.y + 4; // align slightly below bowl center
        this.state = 'walking';
        this.eatingTarget = nearestFood;
      }
    }

    // State actions
    switch (this.state) {
      case 'idle':
        this.vx = 0;
        this.vy = 0;
        if (this.stateTimer <= 0) {
          // Wander around the lawn
          this.targetX = 60 + Math.random() * (canvas.width / (window.devicePixelRatio || 1) - 120);
          // Limit lawn area to the bottom half
          const height = canvas.height / (window.devicePixelRatio || 1);
          this.targetY = height * 0.55 + Math.random() * (height * 0.35);
          this.state = 'walking';
          this.stateTimer = Math.floor(120 + Math.random() * 200);
        }
        break;

      case 'walking':
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 3) {
          this.vx = (dx / dist) * this.speed;
          this.vy = (dy / dist) * this.speed;
          this.x += this.vx;
          this.y += this.vy;
          this.facingRight = this.vx > 0;
          this.walkFrame += 0.2;
        } else {
          // Reached target
          this.x = this.targetX;
          this.y = this.targetY;
          this.vx = 0;
          this.vy = 0;
          
          if (this.eatingTarget && items.includes(this.eatingTarget) && this.eatingTarget.portions > 0) {
            this.state = 'eating';
            this.stateTimer = Math.floor(120 + Math.random() * 80);
          } else {
            // Chance to sleep or stand idle
            if (Math.random() < 0.3) {
              this.state = 'sleeping';
              this.stateTimer = Math.floor(300 + Math.random() * 400);
            } else {
              this.state = 'idle';
              this.stateTimer = Math.floor(80 + Math.random() * 150);
            }
          }
          this.eatingTarget = null;
        }
        break;

      case 'eating':
        this.vx = 0;
        this.vy = 0;
        // Face the food
        const food = this.findNearestFood();
        if (food) {
          this.facingRight = food.x > this.x;
          // Spawn crumb crumbs every 10 frames
          if (Math.floor(Date.now() / 150) % 2 === 0) {
            particles.push(new Particle(this.x + (this.facingRight ? 12 : -12), this.y - 2, 'crumb'));
          }

          if (this.stateTimer % 20 === 0) {
            food.portions -= 0.5;
            if (food.portions <= 0) {
              // Food is finished!
              const index = items.indexOf(food);
              if (index > -1) items.splice(index, 1);
              this.state = 'idle';
              this.stateTimer = 100;
              // Make happy stars after eating
              for (let i = 0; i < 4; i++) {
                particles.push(new Particle(this.x, this.y - this.size, 'star'));
              }
            }
          }

          // If the cat has eaten for the full duration of its state timer, it stops eating
          if (this.stateTimer <= 0 && food.portions > 0) {
            this.state = 'idle';
            this.stateTimer = Math.floor(100 + Math.random() * 100);
            // 50% chance to fall asleep after a nice meal
            if (Math.random() < 0.5) {
              this.state = 'sleeping';
              this.stateTimer = Math.floor(250 + Math.random() * 300);
            }
          }
        } else {
          // Food disappeared suddenly
          this.state = 'idle';
          this.stateTimer = 60;
        }
        break;

      case 'sleeping':
        this.vx = 0;
        this.vy = 0;
        // Spawn Zzz particles occasionally
        if (Math.random() < 0.015) {
          particles.push(new Particle(this.x + (this.facingRight ? 8 : -8), this.y - this.size + 4, 'zzz'));
        }
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = Math.floor(100 + Math.random() * 100);
        }
        break;
    }
  }

  findNearestFood() {
    let nearest = null;
    let minDist = 300; // max sensing distance
    for (let item of items) {
      if (item.type === 'snack' && item.portions > 0) {
        const d = Math.hypot(item.x - this.x, item.y - this.y);
        if (d < minDist) {
          minDist = d;
          nearest = item;
        }
      }
    }
    return nearest;
  }

  jump() {
    this.pettedJumpVelocity = 6;
    this.pettedJump = 1; // start jump
    if (this.state === 'sleeping') {
      this.state = 'idle';
      this.stateTimer = 100;
    }
    // Hearts and stars!
    for (let i = 0; i < 3; i++) {
      particles.push(new Particle(this.x, this.y - this.size, 'heart'));
      particles.push(new Particle(this.x + (Math.random() - 0.5) * 15, this.y - this.size - 5, 'star'));
    }
    
    // Mark as Met in album
    if (!catsMet[this.type]) {
      catsMet[this.type] = true;
      unlockAlbumCard(this.type);
      updateMetCount();
    }
  }

  draw(ctx) {
    ctx.save();
    
    // Compute current jump position
    const currentY = this.y - this.pettedJump;
    
    ctx.translate(this.x, currentY);

    // Apply facing direction scale
    if (!this.facingRight) {
      ctx.scale(-1, 1);
    }

    // Walking waddle angle
    let waddleAngle = 0;
    let bobY = 0;
    if (this.state === 'walking') {
      waddleAngle = Math.sin(this.walkFrame) * 0.06;
      bobY = Math.abs(Math.sin(this.walkFrame * 2)) * 1.5;
      ctx.rotate(waddleAngle);
    } else if (this.state === 'sleeping') {
      // breathing animation
      ctx.scale(1 + Math.sin(Date.now() / 500) * 0.02, 1 - Math.sin(Date.now() / 500) * 0.02);
    }

    // --- Draw Tail ---
    ctx.save();
    ctx.translate(-14, 2);
    ctx.rotate(this.tailAngle + (this.state === 'sleeping' ? -0.5 : 0.2));
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    if (this.type === CAT_TYPES.TUXEDO) {
      ctx.strokeStyle = '#2b2d42'; // Tuxedo tail
    } else {
      ctx.strokeStyle = '#f0932b'; // Ginger tail
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-5, -5, -8, -12, -4, -18);
    ctx.stroke();

    // Ginger tail stripes
    if (this.type === CAT_TYPES.GINGER) {
      ctx.strokeStyle = '#d35400';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-2, -5);
      ctx.lineTo(-4, -6);
      ctx.moveTo(-6, -11);
      ctx.lineTo(-8, -12);
      ctx.stroke();
    }
    ctx.restore();

    // --- Draw Stubby Legs ---
    ctx.fillStyle = this.type === CAT_TYPES.TUXEDO ? '#2b2d42' : '#f9ca24';
    ctx.lineWidth = 1;

    // Alternating leg steps for walking waddle
    let legOffset1 = 0;
    let legOffset2 = 0;
    if (this.state === 'walking') {
      legOffset1 = Math.sin(this.walkFrame * 2) * 3;
      legOffset2 = -Math.sin(this.walkFrame * 2) * 3;
    }

    // Sleeping tucks legs away
    if (this.state !== 'sleeping') {
      // Front Leg 1
      ctx.beginPath();
      ctx.arc(8, 14 + legOffset1, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // Back Leg 1
      ctx.beginPath();
      ctx.arc(-8, 14 + legOffset2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // White paws
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(8, 16 + legOffset1, 3.5, 0, Math.PI * 2);
      ctx.arc(-8, 16 + legOffset2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Draw Body Shape (Chubby Mascot Blob) ---
    ctx.beginPath();
    if (this.type === CAT_TYPES.TUXEDO) {
      ctx.fillStyle = '#2b2d42'; // Dark charcoal black
    } else {
      ctx.fillStyle = '#f0932b'; // Soft orange ginger
    }
    
    // Draw chubby bean silhouette
    ctx.ellipse(0, 0, 19, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Draw Patterns ---
    if (this.type === CAT_TYPES.TUXEDO) {
      // Draw White Tuxedo Chest Plate
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.bezierCurveTo(8, -11, 14, -4, 12, 3);
      ctx.bezierCurveTo(9, 9, 2, 12, 0, 12);
      ctx.bezierCurveTo(-5, 12, -4, 7, -3, 3);
      ctx.bezierCurveTo(-1, -3, -5, -11, 0, -11);
      ctx.fill();

      // White face markings (snout star)
      ctx.beginPath();
      ctx.moveTo(7, -3);
      ctx.lineTo(15, -1);
      ctx.lineTo(10, 3);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === CAT_TYPES.GINGER) {
      // Draw Ginger stripes on back/head
      ctx.strokeStyle = '#d35400';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      // Back stripes
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-6, -3);
      ctx.moveTo(-14, -4);
      ctx.lineTo(-10, 0);
      ctx.moveTo(-8, 4);
      ctx.lineTo(-4, 7);
      ctx.stroke();

      // Head stripes
      ctx.beginPath();
      ctx.moveTo(3, -11);
      ctx.lineTo(5, -7);
      ctx.moveTo(8, -9);
      ctx.lineTo(9, -6);
      ctx.stroke();

      // Cream belly
      ctx.fillStyle = '#fff9e6';
      ctx.beginPath();
      ctx.ellipse(-1, 5, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cream snout patch
      ctx.beginPath();
      ctx.ellipse(12, 0, 4.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Draw Ears ---
    ctx.save();
    // Ears are shifted towards face
    ctx.translate(6, -11);
    ctx.rotate(0.1);
    
    // Main ear color
    ctx.fillStyle = this.type === CAT_TYPES.TUXEDO ? '#2b2d42' : '#f0932b';
    ctx.beginPath();
    ctx.moveTo(-3, -1);
    ctx.lineTo(3, -9);
    ctx.lineTo(6, 2);
    ctx.closePath();
    ctx.fill();
    // Inner pink ear
    ctx.fillStyle = '#ffb8b8';
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.lineTo(3, -6);
    ctx.lineTo(4, 2);
    ctx.closePath();
    ctx.fill();

    // Back Ear
    ctx.translate(-14, 1);
    ctx.rotate(-0.35);
    ctx.fillStyle = this.type === CAT_TYPES.TUXEDO ? '#1e2022' : '#d35400';
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(2, -8);
    ctx.lineTo(5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Draw Face Features ---
    ctx.fillStyle = '#2b2d42'; // Dark color for face details
    const isSleeping = this.state === 'sleeping';

    if (isSleeping) {
      // Closed sleeping eyes: curved lines (u-shape or ^-shape)
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Eye 1
      ctx.arc(9, -2, 2, Math.PI, 0, true);
      // Eye 2 (if visible / face angled)
      ctx.arc(15, -2, 2, Math.PI, 0, true);
      ctx.stroke();
    } else if (this.isBlinking) {
      // Blinking lines
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(7, -2); ctx.lineTo(11, -2);
      ctx.moveTo(13, -2); ctx.lineTo(17, -2);
      ctx.stroke();
    } else {
      // Cute happy curved eyes or simple round dots
      if (this.type === CAT_TYPES.GINGER) {
        // Ginger has friendly curved happy eyes (^-^)
        ctx.strokeStyle = '#5a3d28';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(9, -2, 2, 0, Math.PI, true);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(15, -2, 2, 0, Math.PI, true);
        ctx.stroke();
      } else {
        // Tuxedo has round white eyes with tiny dark pupils
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8.5, -2.5, 3.5, 0, Math.PI * 2);
        ctx.arc(15.5, -2.5, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2b2d42';
        ctx.beginPath();
        ctx.arc(9, -2.5, 1.8, 0, Math.PI * 2);
        ctx.arc(15, -2.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Little pink nose
    ctx.fillStyle = '#ff7675';
    ctx.beginPath();
    ctx.moveTo(11.5, -0.5);
    ctx.lineTo(13.5, -0.5);
    ctx.lineTo(12.5, 1);
    ctx.closePath();
    ctx.fill();

    // Whiskers (subtle lines)
    ctx.strokeStyle = this.type === CAT_TYPES.TUXEDO ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Left side whiskers (pointing forward)
    ctx.moveTo(15, 0); ctx.lineTo(21, -1);
    ctx.moveTo(15.5, 2); ctx.lineTo(20.5, 3);
    ctx.stroke();

    // --- Draw Head Pikmin Sprout ---
    ctx.save();
    ctx.translate(1, -13); // Center of head top
    ctx.rotate(this.sproutRotation);
    
    // Sprout stem
    ctx.strokeStyle = '#8d6e63'; // Brown stem
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-1, -5, -2, -10, -1, -15);
    ctx.stroke();

    // Left green leaf
    ctx.translate(-1, -15);
    ctx.fillStyle = '#26de81'; // Green leaf
    ctx.beginPath();
    ctx.ellipse(-4, -2, 5, 2.5, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Right green leaf
    ctx.beginPath();
    ctx.ellipse(4, -2, 5, 2.5, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}

// --- Time and Environment Controller ---

function advanceTime() {
  timeOfDay = (timeOfDay + 1) % 4;
  updateEnvironmentTheme();
}

function updateEnvironmentTheme() {
  // Remove old theme classes and add the new one
  document.body.className = '';
  document.body.classList.add(bodyThemes[timeOfDay]);

  // Update UI indicators
  timeEmoji.innerText = timeEmojis[timeOfDay];
  timeVal.innerText = timeNames[timeOfDay];

  // Dynamically change window lit states in the dormitory background
  const windows = document.querySelectorAll('.dorm-windows .window');
  windows.forEach((win) => {
    // Dawn/Day: mostly unlit. Dusk/Night: mostly lit.
    if (timeOfDay === TimeStates.DAWN) {
      win.classList.toggle('lit-window', Math.random() < 0.2);
    } else if (timeOfDay === TimeStates.DAY) {
      win.classList.remove('lit-window');
    } else if (timeOfDay === TimeStates.DUSK) {
      win.classList.toggle('lit-window', Math.random() < 0.6);
    } else if (timeOfDay === TimeStates.NIGHT) {
      win.classList.toggle('lit-window', Math.random() < 0.85);
    }
  });

  // Make lamps glow in Dusk & Night
  const streetlamps = document.querySelectorAll('.streetlamp');
  streetlamps.forEach(lamp => {
    if (timeOfDay === TimeStates.DUSK || timeOfDay === TimeStates.NIGHT) {
      lamp.classList.add('glowing');
    } else {
      lamp.classList.remove('glowing');
    }
  });
}

// Day-Night Loop
setInterval(() => {
  if (isTimeCycleAuto) {
    timeSecondsLeft--;
    if (timeSecondsLeft <= 0) {
      timeSecondsLeft = timeDuration;
      advanceTime();
    }
  }
}, 1000);

btnTimeCycle.addEventListener('click', () => {
  isTimeCycleAuto = !isTimeCycleAuto;
  timeCycleStatus.innerText = isTimeCycleAuto ? 'ON' : 'OFF';
});

btnTimeAdvance.addEventListener('click', () => {
  timeSecondsLeft = timeDuration;
  advanceTime();
});

// --- Gameplay Mechanics (Garden Levels & Spawning) ---

function addXP(amount) {
  gardenXP += amount;
  if (gardenXP >= xpPerLevel) {
    gardenXP -= xpPerLevel;
    gardenLevel++;
    triggerLevelUpEffect();
  }
  updateXPBar();
}

function updateXPBar() {
  gardenLevelVal.innerText = gardenLevel;
  const pct = (gardenXP / xpPerLevel) * 100;
  xpBarFill.style.width = `${pct}%`;
}

function triggerLevelUpEffect() {
  // Sparkle stars in center of screen
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  for (let i = 0; i < 20; i++) {
    particles.push(new Particle(w / 2 + (Math.random() - 0.5) * 150, h / 2 + (Math.random() - 0.5) * 100, 'star'));
  }
  // Attract new cat immediately
  spawnCat();
}

function unlockAlbumCard(type) {
  if (type === CAT_TYPES.TUXEDO) {
    albumTuxedo.classList.remove('locked');
    albumTuxedo.querySelector('.status-text').innerText = 'Met & Loving It!';
    albumTuxedo.querySelector('.album-avatar').innerText = '🐱';
  } else if (type === CAT_TYPES.GINGER) {
    albumGinger.classList.remove('locked');
    albumGinger.querySelector('.status-text').innerText = 'Met & Loving It!';
    albumGinger.querySelector('.album-avatar').innerText = '🐱';
  }
}

function updateMetCount() {
  let count = 0;
  if (catsMet.tuxedo) count++;
  if (catsMet.ginger) count++;
  catsMetVal.innerText = `${count} / 2`;
}

// Spawning Cats based on Garden Level & Food
function spawnCat() {
  const maxCats = 1 + gardenLevel;
  if (cats.length >= maxCats) return;

  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  
  // Choose type randomly
  const type = Math.random() < 0.5 ? CAT_TYPES.TUXEDO : CAT_TYPES.GINGER;
  
  // Spawn just offscreen left or right
  const side = Math.random() < 0.5;
  const startX = side ? -30 : w + 30;
  const startY = h * 0.6 + Math.random() * (h * 0.3);

  const newCat = new Cat(startX, startY, type);
  // Set immediate walk target in lawn
  newCat.targetX = 80 + Math.random() * (w - 160);
  newCat.targetY = startY;
  newCat.state = 'walking';

  cats.push(newCat);
}

// Periodic Cat Spawn Trigger
setInterval(() => {
  // If there are snacks, or garden is lush, there's a higher chance to attract cats
  const snackCount = items.filter(i => i.type === 'snack').length;
  const flowerCount = items.filter(i => i.type === 'flower').length;
  
  let spawnChance = 0.2; // base chance
  if (snackCount > 0) spawnChance += 0.45; // snacks attract cats easily!
  if (flowerCount > 0) spawnChance += 0.15; // flowers attract too

  if (Math.random() < spawnChance) {
    spawnCat();
  }
}, 8000);

// --- User Interaction & Click Handling ---

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  // 1. Check if clicked directly on a cat
  for (let cat of cats) {
    const d = Math.hypot(cat.x - clickX, cat.y - clickY);
    // Include jump height in vertical touch boundary
    const verticalBoundary = Math.hypot(cat.x - clickX, (cat.y - cat.pettedJump) - clickY);
    if (d < cat.size || verticalBoundary < cat.size) {
      cat.jump();
      addXP(5); // Petting gives XP
      return;
    }
  }

  // 2. Otherwise, plant flower or place snack
  // Enforce garden boundary (click must be in bottom half meadow)
  const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
  if (clickY < logicalHeight * 0.45) {
    // Clicked too high (e.g. in the sky / building zone)
    return;
  }

  if (currentAction === 'flower') {
    // Limit to max 12 items on screen to prevent clutter
    if (items.filter(i => i.type === 'flower').length < 15) {
      items.push(new GardenItem(clickX, clickY, 'flower'));
      addXP(10); // Sprout gives +10 XP
      
      // Sparkle green leaf particles
      for (let i = 0; i < 4; i++) {
        particles.push(new Particle(clickX, clickY, 'leaf'));
      }
    }
  } else if (currentAction === 'snack') {
    // Limit snacks
    if (items.filter(i => i.type === 'snack').length < 4) {
      items.push(new GardenItem(clickX, clickY, 'snack'));
      addXP(15); // Snack gives +15 XP
      
      // Sparkle stars
      for (let i = 0; i < 3; i++) {
        particles.push(new Particle(clickX, clickY, 'star'));
      }

      // Alert nearby cats of the snack
      cats.forEach(cat => {
        if (cat.state !== 'eating' && cat.state !== 'sleeping') {
          cat.state = 'idle'; // wakes up/resets to find the snack
          cat.stateTimer = 5;
        }
      });
    }
  }
});

// UI Control buttons setup
btnFlower.addEventListener('click', () => {
  currentAction = 'flower';
  btnFlower.classList.add('active');
  btnSnack.classList.remove('active');
});

btnSnack.addEventListener('click', () => {
  currentAction = 'snack';
  btnSnack.classList.add('active');
  btnFlower.classList.remove('active');
});

// --- Main Game Loop ---

function gameLoop() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw details in canvas backdrop if needed (e.g., custom layered lawn details)
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  // Draw Cozy Green Grass Lawn
  ctx.fillStyle = '#6ab04c'; // base grass color
  ctx.beginPath();
  ctx.rect(0, h * 0.45, w, h * 0.55);
  ctx.fill();

  // Draw lawn borders/shading
  ctx.fillStyle = '#5c9d3e';
  ctx.beginPath();
  ctx.rect(0, h * 0.45, w, 15);
  ctx.fill();

  // Draw subtle grassy tufts
  ctx.strokeStyle = '#7bbd56';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < w; i += 70) {
    // alternating heights and positions
    const tuftX = i + (i % 3 === 0 ? 15 : -15);
    const tuftY = h * 0.5 + ((i * 123) % (h * 0.4));
    ctx.beginPath();
    ctx.moveTo(tuftX, tuftY);
    ctx.lineTo(tuftX - 3, tuftY - 6);
    ctx.moveTo(tuftX, tuftY);
    ctx.lineTo(tuftX + 3, tuftY - 7);
    ctx.moveTo(tuftX, tuftY);
    ctx.lineTo(tuftX, tuftY - 8);
    ctx.stroke();
  }

  // 2. Update and Draw Items (Flowers & Snacks)
  // Sort items by Y position so items in background draw first (perspective)
  items.sort((a, b) => a.y - b.y);
  items.forEach(item => {
    item.update();
    item.draw(ctx);
  });

  // 3. Update and Draw Cats
  // Sort cats by Y position so cats in foreground overlap background objects
  cats.sort((a, b) => a.y - b.y);
  cats.forEach(cat => {
    cat.update();
    cat.draw(ctx);
  });

  // 4. Update and Draw Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw(ctx);
    if (p.alpha <= 0 || p.life >= p.maxLife) {
      particles.splice(i, 1);
    }
  }

  requestAnimationFrame(gameLoop);
}

// Start environment theme and game loop
updateEnvironmentTheme();
spawnCat(); // Initial stray cat
spawnCat(); // Spawn second stray cat
gameLoop();
updateXPBar();
updateMetCount();
