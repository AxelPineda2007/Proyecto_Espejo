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

const game = {
  phase: "ready",
  offset: 0.5,
  keys: new Set(),
  lastFrame: 0,
};

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

function drawReadyPrompt() {
  context.fillStyle = "rgba(5, 8, 19, 0.64)";
  context.fillRect(0, 0, width, height);
  context.textAlign = "center";
  context.fillStyle = "#f4f5ff";
  context.font = '600 22px "Space Grotesk", sans-serif';
  context.fillText("UNA MENTE. DOS DIRECCIONES.", middle, height / 2 - 16);
  context.fillStyle = "#82f1d2";
  context.font = '12px "DM Mono", monospace';
  context.fillText("PULSA ENTER O HAZ CLIC PARA EMPEZAR", middle, height / 2 + 17);
}

function update(deltaSeconds) {
  if (game.phase !== "playing") return;

  const movingRight = game.keys.has("ArrowRight") || game.keys.has("KeyD");
  const movingLeft = game.keys.has("ArrowLeft") || game.keys.has("KeyA");
  const direction = Number(movingRight) - Number(movingLeft);
  game.offset = clamp(game.offset + direction * movementSpeed * deltaSeconds, 0, 1);
}

function render() {
  drawBoard();
  drawShips();
  if (game.phase === "ready") drawReadyPrompt();
}

function frame(timestamp) {
  const deltaSeconds = Math.min((timestamp - game.lastFrame) / 1000 || 0, 0.05);
  game.lastFrame = timestamp;
  update(deltaSeconds);
  render();
  requestAnimationFrame(frame);
}

function startGame() {
  if (game.phase !== "ready") return;
  game.phase = "playing";
  document.querySelector("#game-message").textContent = "No pierdas de vista ninguno de los dos lados.";
  document.querySelector("#game-status").textContent = "Partida en curso. Usa A y D o las flechas para mover ambas naves.";
}

function isGameKey(key) {
  return ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "Enter"].includes(key);
}

window.addEventListener("keydown", (event) => {
  if (isGameKey(event.code)) event.preventDefault();
  if (event.code === "Enter") startGame();
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

requestAnimationFrame(frame);
