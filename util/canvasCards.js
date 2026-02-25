import { createCanvas, registerFont } from 'canvas';

// Puedes registrar una fuente personalizada si tienes una en assets/fonts
// registerFont('./assets/fonts/YourFont.ttf', { family: 'YourFont' });

const CARD_WIDTH = 160;
const CARD_HEIGHT = 240;
const CORNER_RADIUS = 22;
const SUIT_COLORS = {
  '♥️': '#e53935',
  '♦️': '#e53935', // diamonds now red
  '♠️': '#222',
  '♣️': '#222'
};
const SUIT_SYMBOLS = {
  '♥️': '♥',
  '♦️': '♦',
  '♠️': '♠',
  '♣️': '♣'
};
const SUIT_FONTS = {
  '♥️': 'Arial',
  '♦️': 'Arial',
  '♠️': 'Arial',
  '♣️': 'Arial'
};

function drawCard(ctx, value, suit, x, y) {
  // Card background: white, modern, subtle shadow, no gold border
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(x + CORNER_RADIUS, y);
  ctx.lineTo(x + CARD_WIDTH - CORNER_RADIUS, y);
  ctx.quadraticCurveTo(x + CARD_WIDTH, y, x + CARD_WIDTH, y + CORNER_RADIUS);
  ctx.lineTo(x + CARD_WIDTH, y + CARD_HEIGHT - CORNER_RADIUS);
  ctx.quadraticCurveTo(x + CARD_WIDTH, y + CARD_HEIGHT, x + CARD_WIDTH - CORNER_RADIUS, y + CARD_HEIGHT);
  ctx.lineTo(x + CORNER_RADIUS, y + CARD_HEIGHT);
  ctx.quadraticCurveTo(x, y + CARD_HEIGHT, x, y + CARD_HEIGHT - CORNER_RADIUS);
  ctx.lineTo(x, y + CORNER_RADIUS);
  ctx.quadraticCurveTo(x, y, x + CORNER_RADIUS, y);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Subtle gray border
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.moveTo(x + CORNER_RADIUS, y);
  ctx.lineTo(x + CARD_WIDTH - CORNER_RADIUS, y);
  ctx.quadraticCurveTo(x + CARD_WIDTH, y, x + CARD_WIDTH, y + CORNER_RADIUS);
  ctx.lineTo(x + CARD_WIDTH, y + CARD_HEIGHT - CORNER_RADIUS);
  ctx.quadraticCurveTo(x + CARD_WIDTH, y + CARD_HEIGHT, x + CARD_WIDTH - CORNER_RADIUS, y + CARD_HEIGHT);
  ctx.lineTo(x + CORNER_RADIUS, y + CARD_HEIGHT);
  ctx.quadraticCurveTo(x, y + CARD_HEIGHT, x, y + CARD_HEIGHT - CORNER_RADIUS);
  ctx.lineTo(x, y + CORNER_RADIUS);
  ctx.quadraticCurveTo(x, y, x + CORNER_RADIUS, y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Top-left value and suit
  ctx.save();
  ctx.font = 'bold 54px Arial';
  ctx.fillStyle = SUIT_COLORS[suit] || '#222';
  ctx.textAlign = 'left';
  ctx.fillText(value, x + 22, y + 62);
  ctx.font = '48px Arial';
  ctx.fillText(SUIT_SYMBOLS[suit] || suit, x + 22, y + 120);
  ctx.restore();

  // Bottom-right suit only (rotated)
  ctx.save();
  ctx.translate(x + CARD_WIDTH - 22, y + CARD_HEIGHT - 22);
  ctx.rotate(Math.PI);
  ctx.font = '48px Arial';
  ctx.fillStyle = SUIT_COLORS[suit] || '#222';
  ctx.textAlign = 'left';
  ctx.fillText(SUIT_SYMBOLS[suit] || suit, 0, -58);
  ctx.restore();

  // Large suit in center (custom font, more subtle)
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.font = '160px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = SUIT_COLORS[suit] || '#222';
  ctx.fillText(SUIT_SYMBOLS[suit] || suit, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2 + 60);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawHand(cards, label = '', hideFirst = false) {
  // Layout: cards centered, spaced, white with rounded corners, like the reference image
  const gap = 24;
  const width = cards.length * (CARD_WIDTH + gap) - gap + 80;
  const height = CARD_HEIGHT + 80;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  const startX = (width - (cards.length * CARD_WIDTH + (cards.length - 1) * gap)) / 2;
  for (let i = 0; i < cards.length; i++) {
    if (hideFirst && i === 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(startX + i * (CARD_WIDTH + gap) + CORNER_RADIUS, 40);
      ctx.lineTo(startX + i * (CARD_WIDTH + gap) + CARD_WIDTH - CORNER_RADIUS, 40);
      ctx.quadraticCurveTo(startX + i * (CARD_WIDTH + gap) + CARD_WIDTH, 40, startX + i * (CARD_WIDTH + gap) + CARD_WIDTH, 40 + CORNER_RADIUS);
      ctx.lineTo(startX + i * (CARD_WIDTH + gap) + CARD_WIDTH, 40 + CARD_HEIGHT - CORNER_RADIUS);
      ctx.quadraticCurveTo(startX + i * (CARD_WIDTH + gap) + CARD_WIDTH, 40 + CARD_HEIGHT, startX + i * (CARD_WIDTH + gap) + CARD_WIDTH - CORNER_RADIUS, 40 + CARD_HEIGHT);
      ctx.lineTo(startX + i * (CARD_WIDTH + gap) + CORNER_RADIUS, 40 + CARD_HEIGHT);
      ctx.quadraticCurveTo(startX + i * (CARD_WIDTH + gap), 40 + CARD_HEIGHT, startX + i * (CARD_WIDTH + gap), 40 + CARD_HEIGHT - CORNER_RADIUS);
      ctx.lineTo(startX + i * (CARD_WIDTH + gap), 40 + CORNER_RADIUS);
      ctx.quadraticCurveTo(startX + i * (CARD_WIDTH + gap), 40, startX + i * (CARD_WIDTH + gap) + CORNER_RADIUS, 40);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 40, 0, 40 + CARD_HEIGHT);
      grad.addColorStop(0, '#2d2a4a');
      grad.addColorStop(1, '#bfa13a');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.font = 'bold 90px Arial';
      ctx.fillStyle = '#fffde4';
      ctx.globalAlpha = 0.22;
      ctx.textAlign = 'center';
      ctx.fillText('★', startX + i * (CARD_WIDTH + gap) + CARD_WIDTH / 2, 40 + CARD_HEIGHT / 2 + 30);
      ctx.globalAlpha = 1;
      ctx.restore();
      continue;
    }
    drawCard(ctx, cards[i].name, cards[i].suit, startX + i * (CARD_WIDTH + gap), 40);
  }
  return canvas;
}