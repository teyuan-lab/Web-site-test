const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = 430;

const scoreValue = document.getElementById("scoreValue");
const livesValue = document.getElementById("livesValue");
const heartValue = document.getElementById("heartValue");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

const keys = { left: false, right: false };
const basket = {
  x: WIDTH / 2 - 58,
  y: GROUND_Y - 36,
  width: 116,
  height: 32,
  speed: 430,
};

let score = 0;
let lives = 3;
let apples = [];
let running = false;
let lastTime = 0;
let spawnTimer = 0;
let animationId = null;
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

function playTone(frequency, duration, type = "sine", volume = 0.08, delay = 0) {
  const audio = getAudioContext();
  if (!audio) return;

  const startTime = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playSound(soundName) {
  const audio = getAudioContext();
  if (!audio) return;

  // A button or key press unlocks audio in modern browsers.
  audio.resume().catch(() => {});

  if (soundName === "start") {
    playTone(520, 0.1, "sine", 0.06);
    playTone(700, 0.14, "sine", 0.06, 0.1);
  } else if (soundName === "catch") {
    playTone(760, 0.08, "triangle", 0.08);
    playTone(980, 0.12, "triangle", 0.07, 0.07);
  } else if (soundName === "miss") {
    playTone(220, 0.16, "sawtooth", 0.045);
  } else if (soundName === "gameover") {
    playTone(360, 0.16, "sine", 0.06);
    playTone(240, 0.28, "sine", 0.06, 0.17);
  }
}

function randomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function resetGame() {
  score = 0;
  lives = 3;
  apples = [];
  spawnTimer = 0;
  basket.x = WIDTH / 2 - basket.width / 2;
  updateScoreboard();
  drawScene();
}

function updateScoreboard() {
  scoreValue.textContent = score;
  livesValue.textContent = `${lives} / 3`;
  heartValue.textContent = "❤️ ".repeat(lives) + "🖤 ".repeat(3 - lives);
  heartValue.setAttribute("aria-label", `剩餘 ${lives} 條生命`);
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove("is-hidden");
}

function hideOverlay() {
  overlay.classList.add("is-hidden");
}

function startGame() {
  if (running) return;

  resetGame();
  playSound("start");
  running = true;
  startButton.disabled = true;
  hideOverlay();
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function restartGame() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }
  running = false;
  startButton.disabled = false;
  resetGame();
  startGame();
}

function endGame() {
  running = false;
  animationId = null;
  startButton.disabled = false;
  playSound("gameover");
  showOverlay("遊戲結束！", `你接到了 ${score} 分，按下「重新開始」再挑戰一次吧！`);
  drawScene();
}

function spawnApple() {
  apples.push({
    x: randomNumber(155, WIDTH - 155),
    y: 105,
    radius: randomNumber(14, 19),
    speed: randomNumber(170, 235) + score * 3,
    wobble: randomNumber(0, Math.PI * 2),
  });
}

function updateGame(deltaTime) {
  const direction = Number(keys.right) - Number(keys.left);
  basket.x += direction * basket.speed * deltaTime;
  basket.x = Math.max(18, Math.min(WIDTH - basket.width - 18, basket.x));

  spawnTimer += deltaTime;
  const spawnInterval = Math.max(0.38, 0.85 - score * 0.015);
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnApple();
  }

  for (let index = apples.length - 1; index >= 0; index -= 1) {
    const apple = apples[index];
    apple.y += apple.speed * deltaTime;
    apple.wobble += deltaTime * 4;
    apple.x += Math.sin(apple.wobble) * 0.35;

    const touchesBasket =
      apple.y + apple.radius >= basket.y &&
      apple.y - apple.radius <= basket.y + basket.height &&
      apple.x + apple.radius >= basket.x &&
      apple.x - apple.radius <= basket.x + basket.width;

    if (touchesBasket) {
      score += 1;
      playSound("catch");
      apples.splice(index, 1);
      updateScoreboard();
    } else if (apple.y - apple.radius > GROUND_Y) {
      lives -= 1;
      playSound("miss");
      apples.splice(index, 1);
      updateScoreboard();

      if (lives <= 0) {
        endGame();
        return;
      }
    }
  }
}

function gameLoop(timestamp) {
  if (!running) return;

  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  updateGame(deltaTime);
  drawScene();

  if (running) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function drawScene() {
  drawBackground();
  drawTree();
  apples.forEach(drawApple);
  drawBasket();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#68c8e2");
  sky.addColorStop(0.58, "#c7edf0");
  sky.addColorStop(0.73, "#d8edc3");
  sky.addColorStop(0.74, "#83bd72");
  sky.addColorStop(1, "#4e985d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Distant hills make the orchard feel deeper.
  ctx.fillStyle = "rgba(91, 157, 111, 0.48)";
  ctx.beginPath();
  ctx.moveTo(0, 365);
  ctx.quadraticCurveTo(140, 285, 280, 365);
  ctx.quadraticCurveTo(450, 270, 720, 355);
  ctx.lineTo(720, 430);
  ctx.lineTo(0, 430);
  ctx.closePath();
  ctx.fill();

  drawCloud(95, 76, 0.9);
  drawCloud(585, 65, 0.75);

  // Small grass blades are drawn with fixed positions so they do not flicker.
  ctx.strokeStyle = "rgba(38, 111, 63, 0.45)";
  ctx.lineWidth = 2;
  for (let index = 0; index < 70; index += 1) {
    const x = (index * 83) % WIDTH;
    const height = 5 + (index % 5) * 2;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 8);
    ctx.lineTo(x - 3, GROUND_Y + 8 - height);
    ctx.moveTo(x, GROUND_Y + 8);
    ctx.lineTo(x + 4, GROUND_Y + 8 - height * 0.8);
    ctx.stroke();
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(-28, 8, 22, 0, Math.PI * 2);
  ctx.arc(0, -4, 29, 0, Math.PI * 2);
  ctx.arc(32, 8, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTree() {
  // Tree trunk with a warm light-to-dark bark gradient.
  const trunkGradient = ctx.createLinearGradient(70, 0, 155, 0);
  trunkGradient.addColorStop(0, "#6e392b");
  trunkGradient.addColorStop(0.45, "#b86e43");
  trunkGradient.addColorStop(1, "#77402f");
  ctx.fillStyle = trunkGradient;
  ctx.beginPath();
  ctx.moveTo(78, 430);
  ctx.quadraticCurveTo(88, 330, 91, 230);
  ctx.quadraticCurveTo(106, 212, 128, 228);
  ctx.quadraticCurveTo(135, 340, 153, 430);
  ctx.closePath();
  ctx.fill();

  // Branches.
  ctx.strokeStyle = "#75402f";
  ctx.lineCap = "round";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(110, 270);
  ctx.quadraticCurveTo(83, 218, 50, 166);
  ctx.moveTo(116, 260);
  ctx.quadraticCurveTo(145, 205, 181, 153);
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(86, 225);
  ctx.lineTo(40, 181);
  ctx.moveTo(142, 210);
  ctx.lineTo(205, 168);
  ctx.stroke();

  // Bark lines add texture to the trunk.
  ctx.strokeStyle = "rgba(74, 37, 29, 0.5)";
  ctx.lineWidth = 3;
  [[93, 270, 88, 405], [115, 250, 120, 415], [135, 295, 145, 400]].forEach(
    ([startX, startY, endX, endY]) => {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(startX - 7, (startY + endY) / 2, endX, endY);
      ctx.stroke();
    },
  );

  // Layered green canopy.
  const leaves = [
    [60, 135, 82], [135, 110, 95], [218, 142, 78],
    [285, 118, 80], [360, 145, 92], [445, 115, 84],
    [525, 145, 85], [585, 118, 70], [326, 75, 74],
  ];
  leaves.forEach(([x, y, radius], index) => {
    const leafGradient = ctx.createRadialGradient(
      x - radius * 0.35,
      y - radius * 0.45,
      radius * 0.1,
      x,
      y,
      radius,
    );
    leafGradient.addColorStop(0, index % 2 === 0 ? "#9ad879" : "#81cc70");
    leafGradient.addColorStop(0.7, index % 2 === 0 ? "#4f9f5c" : "#3f8f52");
    leafGradient.addColorStop(1, "#2d7045");
    ctx.fillStyle = leafGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // A few small highlights suggest individual leaves.
  ctx.fillStyle = "rgba(196, 232, 129, 0.5)";
  [[90, 84], [236, 105], [351, 65], [480, 96], [600, 102]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 5, -0.45, 0, Math.PI * 2);
    ctx.fill();
  });

  // Decorative apples in the tree.
  [[72, 128], [185, 100], [288, 145], [410, 92], [520, 130]].forEach(([x, y]) => {
    drawApple({ x, y, radius: 10, wobble: 0 });
  });
}

function drawApple(apple) {
  ctx.save();
  ctx.translate(apple.x, apple.y);

  const radius = apple.radius;
  const appleGradient = ctx.createRadialGradient(
    -radius * 0.38,
    -radius * 0.48,
    radius * 0.12,
    0,
    radius * 0.2,
    radius * 1.15,
  );
  appleGradient.addColorStop(0, "#ffb18b");
  appleGradient.addColorStop(0.24, "#f36b5b");
  appleGradient.addColorStop(0.72, "#c9323d");
  appleGradient.addColorStop(1, "#7f1f36");

  ctx.shadowColor = "rgba(77, 39, 37, 0.3)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = appleGradient;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.48);
  ctx.bezierCurveTo(-radius * 0.25, -radius * 0.8, -radius * 0.86, -radius * 0.66, -radius * 0.9, -radius * 0.05);
  ctx.bezierCurveTo(-radius * 0.95, radius * 0.72, -radius * 0.35, radius * 1.02, 0, radius * 1.06);
  ctx.bezierCurveTo(radius * 0.35, radius * 1.02, radius * 0.95, radius * 0.72, radius * 0.9, -radius * 0.05);
  ctx.bezierCurveTo(radius * 0.86, -radius * 0.66, radius * 0.25, -radius * 0.8, 0, -radius * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Soft reflected light on the apple skin.
  const highlight = ctx.createRadialGradient(-radius * 0.42, -radius * 0.35, 1, -radius * 0.42, -radius * 0.35, radius * 0.3);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.85)");
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(-radius * 0.4, -radius * 0.35, radius * 0.22, radius * 0.34, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#6f4b35";
  ctx.lineWidth = Math.max(2, radius * 0.13);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.52);
  ctx.quadraticCurveTo(radius * 0.08, -radius * 0.87, radius * 0.2, -radius * 1.02);
  ctx.stroke();

  ctx.fillStyle = "#56a968";
  ctx.beginPath();
  ctx.ellipse(radius * 0.32, -radius * 0.92, radius * 0.34, radius * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBasket() {
  const x = basket.x;
  const y = basket.y;

  ctx.save();
  // Curved handle behind the basket.
  ctx.strokeStyle = "#8b522f";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 22, y + 8);
  ctx.bezierCurveTo(x + 22, y - 48, x + basket.width - 22, y - 48, x + basket.width - 22, y + 8);
  ctx.stroke();
  ctx.strokeStyle = "#e5a35b";
  ctx.lineWidth = 3;
  ctx.stroke();

  // A slightly tapered basket body.
  const basketGradient = ctx.createLinearGradient(0, y, 0, y + basket.height);
  basketGradient.addColorStop(0, "#f0bd72");
  basketGradient.addColorStop(0.5, "#d98a49");
  basketGradient.addColorStop(1, "#a95e35");
  ctx.fillStyle = basketGradient;
  ctx.strokeStyle = "#82472d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + basket.width - 4, y);
  ctx.lineTo(x + basket.width - 18, y + basket.height);
  ctx.lineTo(x + 18, y + basket.height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wicker lines clipped inside the basket.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + basket.width - 4, y);
  ctx.lineTo(x + basket.width - 18, y + basket.height);
  ctx.lineTo(x + 18, y + basket.height);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(255, 224, 145, 0.7)";
  ctx.lineWidth = 3;
  for (let stripeX = x + 14; stripeX < x + basket.width; stripeX += 22) {
    ctx.beginPath();
    ctx.moveTo(stripeX, y - 4);
    ctx.lineTo(stripeX - 12, y + basket.height + 4);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(119, 60, 35, 0.5)";
  ctx.lineWidth = 2;
  for (let lineY = y + 9; lineY < y + basket.height; lineY += 9) {
    ctx.beginPath();
    ctx.moveTo(x, lineY);
    ctx.lineTo(x + basket.width, lineY);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "#f7ca7c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 2);
  ctx.lineTo(x + basket.width - 5, y + 2);
  ctx.stroke();
  ctx.restore();
}

function setDirection(direction, isPressed) {
  keys[direction] = isPressed;
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    event.preventDefault();
    setDirection("left", true);
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    event.preventDefault();
    setDirection("right", true);
  }
  if (event.key.toLowerCase() === "r" && !running) {
    restartGame();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    setDirection("left", false);
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    setDirection("right", false);
  }
});

document.querySelectorAll(".move-button").forEach((button) => {
  const direction = button.dataset.direction;
  button.addEventListener("pointerdown", () => setDirection(direction, true));
  button.addEventListener("pointerup", () => setDirection(direction, false));
  button.addEventListener("pointerleave", () => setDirection(direction, false));
  button.addEventListener("pointercancel", () => setDirection(direction, false));
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

resetGame();
