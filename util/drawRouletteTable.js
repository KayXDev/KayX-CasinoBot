// Draws a roulette table with numbers and highlights bets using node-canvas
import { createCanvas } from 'canvas';

/**
 * Draws a roulette table image with highlighted bets
 * @param {Array} bets - Array of bet objects: { type, value, amount }
 * @returns {Buffer} PNG buffer
 */
export function drawRouletteTable(bets = []) {
  const width = 700, height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#145a32';
  ctx.fillRect(0, 0, width, height);

  // Draw 0
  ctx.fillStyle = '#229954';
  ctx.fillRect(20, 20, 60, 60);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('0', 45, 60);

  // Draw numbers 1-36 in 3 columns
  const cols = 3, rows = 12, cellW = 60, cellH = 30;
  for (let i = 1; i <= 36; i++) {
    const col = (i - 1) % cols;
    const row = Math.floor((i - 1) / cols);
    const x = 100 + col * cellW;
    const y = 20 + row * cellH;
    // Color
    ctx.fillStyle = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(i) ? '#e74c3c' : '#222';
    ctx.fillRect(x, y, cellW, cellH);
    // Highlight if bet
    if (bets.some(b => b.type === 'number' && b.value === i)) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 4;
      ctx.strokeRect(x+2, y+2, cellW-4, cellH-4);
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(i.toString(), x + 20, y + 22);
  }

  // TODO: Draw chips/amounts for each bet
  // TODO: Draw color, even/odd, dozen bets visually

  return canvas.toBuffer('image/png');
}
