"use strict";

const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;
const middle = width / 2;
const shipY = height - 86;
const shipSize = 13;
const lanePadding = 38;
const movementSpeed = 0.46;
const bestScoreKey = "espejo-best-score";

const game = {
  phase: "ready",
  offset: 0.5,
  keys: new Set(),
  obstacles: [],
  spawnTimer: 0.6,
  elapsed: 0,
  score: 0,
  bestScore: loadBestScore(),
  pulseTimer: 0,
  pulseCooldown: 0,
  lastFrame: 0,
};

function loadBestScore() {
  try {
    const storedScore = Number(window.localStorage.getItem(bestScoreKey));
    return Number.isFinite(storedScore) && storedScore > 0 ? Math.floor(storedScore) : 0;
  } catch (error) {
    console.warn("No se pudo leer el récord local de ESPEJO.", error);
    return 0;
  }
}

function saveBestScore() {
  try {
    window.localStorage.setItem(bestScoreKey, String(game.bestScore));
  } catch (error) {
    console.warn("No se pudo guardar el récord local de ESPEJO.", error);
    document.querySelector("#game-message").textContent = "Récord no guardado: el almacenamiento local no está disponible.";
  }
}

function updateScoreboard() {
  document.querySelector("#score").textContent = String(game.score).padStart(6, "0");
  document.querySelector("#best-score").textContent = String(game.bestScore).padStart(6, "0");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shipPositions() {
  const laneWidth = middle - lanePadding * 2;
  const leftX = lanePadding + game.offset * laneWidth;
  return [leftX, width - leftX];
}

function drawBoard() {
  context.fillStyle = "#0a0e1c";
  context.fillRect(0, 0, width, height);

  for (let x = 24; x < width; x += 40) {
    for (let y = 24; y < height; y += 40) {
      context.fillStyle = "rgba(178, 188, 230, 0.055)";
      context.fillRect(x, y, 1, 1);
    }
  }

  const glow = context.createLinearGradient(middle - 70, 0, middle + 70, 0);
  glow.addColorStop(0, "rgba(130, 241, 210, 0)");
  glow.addColorStop(0.5, "rgba(130, 241, 210, 0.1)");
  glow.addColorStop(1, "rgba(130, 241, 210, 0)");
  context.fillStyle = glow;
  context.fillRect(middle - 70, 0, 140, height);

  context.setLineDash([4, 9]);
  context.strokeStyle = "rgba(171, 181, 223, 0.18)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(middle, 25);
  context.lineTo(middle, height - 28);
  context.stroke();
  context.setLineDash([]);

  context.strokeStyle = "rgba(171, 181, 223, 0.09)";
  context.beginPath();
  context.moveTo(0, shipY + 31);
  context.lineTo(width, shipY + 31);
  context.stroke();
}

function drawShip(x, color, accent) {
  context.save();
  context.translate(x, shipY);
  context.shadowColor = color;
  context.shadowBlur = 20;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, -shipSize);
  context.lineTo(shipSize * 0.76, shipSize * 0.7);
  context.lineTo(0, shipSize * 0.22);
  context.lineTo(-shipSize * 0.76, shipSize * 0.7);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = accent;
  context.beginPath();
  context.arc(0, 1, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawShips() {
  const [leftX, rightX] = shipPositions();
  drawShip(leftX, "#ff7a72", "#fff1e7");
  drawShip(rightX, "#a895ff", "#f0edff");
}

function drawPulseEffects() {
  const active = game.pulseTimer > 0;
  if (active) {
    const shimmer = 0.5 + Math.sin(game.elapsed * 18) * 0.5;
    context.save();
    context.strokeStyle = `rgba(130, 241, 210, ${0.3 + shimmer * 0.35})`;
    context.shadowColor = "#82f1d2";
    context.shadowBlur = 20;
    context.lineWidth = 2;
    context.strokeRect(4, 4, width - 8, height - 8);
    context.globalAlpha = 0.14;
    context.fillStyle = "#82f1d2";
    for (let y = 30; y < height - 30; y += 38) {
      context.fillRect(0, y, width, 1);
    }
    context.restore();
  }

  const label = active
    ? `TIEMPO ×0.35  ${game.pulseTimer.toFixed(1)}s`
    : game.pulseCooldown > 0
      ? `PULSO  ${game.pulseCooldown.toFixed(1)}s`
      : "PULSO  LISTO";
  context.save();
  context.fillStyle = active ? "rgba(35, 92, 89, 0.84)" : "rgba(16, 20, 38, 0.86)";
  context.strokeStyle = active ? "rgba(130, 241, 210, 0.68)" : "rgba(171, 181, 223, 0.19)";
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(width - 177, 19, 157, 28, 7);
  context.fill();
  context.stroke();
  context.fillStyle = active || game.pulseCooldown === 0 ? "#82f1d2" : "#9198b3";
  context.font = '10px "DM Mono", monospace';
  context.textAlign = "center";
  context.fillText(label, width - 98.5, 37);
  context.restore();
}

function drawObstacle(obstacle) {
  context.save();
  context.translate(obstacle.x, obstacle.y);
  context.rotate(obstacle.rotation);
  context.shadowColor = obstacle.color;
  context.shadowBlur = 15;
  context.fillStyle = obstacle.color;
  context.fillRect(-obstacle.size / 2, -obstacle.size / 2, obstacle.size, obstacle.size);
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255, 255, 255, 0.58)";
  context.lineWidth = 1;
  context.strokeRect(-obstacle.size / 2 + 4, -obstacle.size / 2 + 4, obstacle.size - 8, obstacle.size - 8);
  context.restore();
}

function spawnObstaclePair() {
  const colors = ["#ffb45f", "#fa6c84", "#bb8aff"];
  for (let side = 0; side < 2; side += 1) {
    const laneStart = side === 0 ? 0 : middle;
    const laneWidth = middle;
    const size = 18 + Math.random() * 17;
    game.obstacles.push({
      x: laneStart + lanePadding + size + Math.random() * (laneWidth - lanePadding * 2 - size * 2),
      y: -size,
      size,
      speed: 150 + Math.random() * 55,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function update(deltaSeconds) {
  if (game.phase !== "playing") return;

  game.elapsed += deltaSeconds;
  game.score = Math.floor(game.elapsed * 10);
  updateScoreboard();

  const movingRight = game.keys.has("ArrowRight") || game.keys.has("KeyD");
  const movingLeft = game.keys.has("ArrowLeft") || game.keys.has("KeyA");
  const direction = Number(movingRight) - Number(movingLeft);
  game.offset = clamp(game.offset + direction * movementSpeed * deltaSeconds, 0, 1);

  game.pulseTimer = Math.max(0, game.pulseTimer - deltaSeconds);
  game.pulseCooldown = Math.max(0, game.pulseCooldown - deltaSeconds);
  const worldDelta = deltaSeconds * (game.pulseTimer > 0 ? 0.35 : 1);

  game.spawnTimer -= worldDelta;
  if (game.spawnTimer <= 0) {
    spawnObstaclePair();
    game.spawnTimer = 0.82;
  }

  const [leftX, rightX] = shipPositions();
  const shipX = [leftX, rightX];
  for (let index = game.obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = game.obstacles[index];
    obstacle.y += obstacle.speed * worldDelta;
    obstacle.rotation += obstacle.spin * worldDelta;

    if (obstacle.y > height + obstacle.size) {
      game.obstacles.splice(index, 1);
      continue;
    }

    const ship = obstacle.x < middle ? 0 : 1;
    const dx = obstacle.x - shipX[ship];
    const dy = obstacle.y - shipY;
    const collisionRadius = obstacle.size * 0.5 + shipSize * 0.65;
    if (dx * dx + dy * dy < collisionRadius * collisionRadius) {
      endGame();
      break;
    }
  }
}

function endGame() {
  game.phase = "over";
  game.keys.clear();
  document.querySelector("#game-message").textContent = `Puntuación: ${game.score}. Una nave chocó.`;
  document.querySelector("#game-status").textContent = `Partida terminada. Tu puntuación fue ${game.score}. Pulsa Enter para intentarlo otra vez.`;
  if (game.score > game.bestScore) {
    game.bestScore = game.score;
    saveBestScore();
    document.querySelector("#game-message").textContent = `¡Nuevo récord: ${game.score}!`;
  }
  updateScoreboard();
}

function render() {
  drawBoard();
  for (const obstacle of game.obstacles) drawObstacle(obstacle);
  drawShips();
  if (game.phase === "playing") drawPulseEffects();
  if (game.phase === "ready" || game.phase === "over") {
    context.fillStyle = "rgba(5, 8, 19, 0.66)";
    context.fillRect(0, 0, width, height);
    context.textAlign = "center";
    context.fillStyle = "#f4f5ff";
    context.font = '600 22px "Space Grotesk", sans-serif';
    context.fillText(
      game.phase === "ready" ? "UNA MENTE. DOS DIRECCIONES." : "EL REFLEJO TE ALCANZÓ.",
      middle,
      height / 2 - 16,
    );
    context.fillStyle = "#82f1d2";
    context.font = '12px "DM Mono", monospace';
    context.fillText(
      game.phase === "ready" ? "PULSA ENTER O HAZ CLIC PARA EMPEZAR" : `PUNTOS ${game.score}  ·  ENTER PARA REINTENTAR`,
      middle,
      height / 2 + 17,
    );
  }
}

function frame(timestamp) {
  const deltaSeconds = Math.min((timestamp - game.lastFrame) / 1000 || 0, 0.05);
  game.lastFrame = timestamp;
  update(deltaSeconds);
  render();
  requestAnimationFrame(frame);
}

function startGame() {
  if (game.phase === "playing") return;
  game.offset = 0.5;
  game.obstacles = [];
  game.spawnTimer = 0.6;
  game.elapsed = 0;
  game.score = 0;
  game.pulseTimer = 0;
  game.pulseCooldown = 0;
  game.keys.clear();
  game.phase = "playing";
  updateScoreboard();
  document.querySelector("#game-message").textContent = "No pierdas de vista ninguno de los dos lados.";
  document.querySelector("#game-status").textContent = "Partida en curso. Usa A y D o las flechas para mover ambas naves.";
}

function activatePulse() {
  if (game.phase !== "playing" || game.pulseCooldown > 0) return;
  game.pulseTimer = 2.4;
  game.pulseCooldown = 9;
}

function isGameKey(key) {
  return ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "Enter"].includes(key);
}

window.addEventListener("keydown", (event) => {
  if (isGameKey(event.code)) event.preventDefault();
  if (event.code === "Enter") startGame();
  if (event.code === "Space" && !event.repeat) activatePulse();
  if (game.phase === "playing" && isGameKey(event.code)) game.keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  game.keys.delete(event.code);
});

window.addEventListener("blur", () => {
  game.keys.clear();
});

canvas.addEventListener("click", () => {
  canvas.focus();
  startGame();
});

updateScoreboard();
requestAnimationFrame(frame);
