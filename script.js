"use strict";

const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");

function drawWaitingScreen() {
  context.fillStyle = "#0a0e1c";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#aab0ca";
  context.font = '14px "DM Mono", monospace';
  context.textAlign = "center";
  context.fillText("PREPÁRATE PARA PENSAR EN DOS DIRECCIONES", canvas.width / 2, canvas.height / 2);
}

drawWaitingScreen();
