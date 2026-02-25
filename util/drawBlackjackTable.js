// util/drawBlackjackTable.js
import { createCanvas } from 'canvas';

export function createModernCasinoCanvas(playerHand, dealerHand, options = {}) {
  const { hideDealerFirst = false } = options;

  // Canvas grande
  const canvasWidth = 1200;
  const canvasHeight = 700;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // --- Fondo gris oscuro ---
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGradient.addColorStop(0, '#2c2c2c'); // gris oscuro arriba
  bgGradient.addColorStop(1, '#1a1a1a'); // casi negro abajo
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Configuración de cartas (grandes)
  const cardWidth = 160;
  const cardHeight = 240;

  // Mano del jugador (abajo)
  const playerX = canvasWidth / 2 - ((cardWidth + 30) * playerHand.length - 30) / 2;
  const playerY = canvasHeight - cardHeight - 80;
  drawHandModern(ctx, playerHand, playerX, playerY, cardWidth, cardHeight);

  // Mano del dealer (arriba)
  const dealerX = canvasWidth / 2 - ((cardWidth + 30) * dealerHand.length - 30) / 2;
  const dealerY = 80;
  drawHandModern(ctx, dealerHand, dealerX, dealerY, cardWidth, cardHeight, hideDealerFirst);

  return canvas;
}

function drawHandModern(ctx, hand, x, y, cardWidth, cardHeight, hideFirstCard = false) {
  for (let i = 0; i < hand.length; i++) {
    const offsetX = x + i * (cardWidth + 30);
    if (hideFirstCard && i === 1) {
      drawCardBackModern(ctx, offsetX, y, cardWidth, cardHeight);
    } else {
      drawCardFaceModern(ctx, hand[i].name, hand[i].suit, offsetX, y, cardWidth, cardHeight);
    }
  }
}

function drawCardFaceModern(ctx, value, suit, x, y, width, height) {
  // Fondo blanco de carta
  const cardGradient = ctx.createLinearGradient(x, y, x, y + height);
  cardGradient.addColorStop(0, '#ffffff');
  cardGradient.addColorStop(1, '#f7f7f7');
  ctx.fillStyle = cardGradient;
  roundedRect(ctx, x, y, width, height, 16);

  // Borde gris
  ctx.strokeStyle = '#bbbbbb';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Valor + símbolo arriba
  ctx.fillStyle = (suit.includes('♥') || suit.includes('♦')) ? '#E74C3C' : '#333333';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(value, x + 12, y + 36);
  ctx.font = 'bold 32px Arial';
  ctx.fillText(suit, x + 12, y + 70);

  // Símbolo gigante transparente
  ctx.globalAlpha = 0.15;
  ctx.font = 'bold 150px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(suit, x + width / 2, y + height / 2 + 50);
  ctx.globalAlpha = 1;
}

function drawCardBackModern(ctx, x, y, width, height) {
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, '#555555'); // gris medio
  grad.addColorStop(1, '#333333'); // más oscuro
  ctx.fillStyle = grad;
  roundedRect(ctx, x, y, width, height, 16);

  // Detalle en el reverso
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 12, y + 12, width - 24, height - 24);
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
