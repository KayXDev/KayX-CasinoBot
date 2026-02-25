import { createCanvas, loadImage, registerFont } from 'canvas';

// Puedes registrar una fuente personalizada si tienes un archivo ttf
// registerFont('./assets/LoteriaFont.ttf', { family: 'Loteria' });

export async function generarBoletoLoteria({ numero }) {
  const width = 320;
  const height = 140;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fondo degradado bonito
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#fffbe6');
  grad.addColorStop(1, '#ffe0a3');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Borde redondeado
  ctx.strokeStyle = '#c9a74a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(width - 15, 0);
  ctx.quadraticCurveTo(width, 0, width, 15);
  ctx.lineTo(width, height - 15);
  ctx.quadraticCurveTo(width, height, width - 15, height);
  ctx.lineTo(15, height);
  ctx.quadraticCurveTo(0, height, 0, height - 15);
  ctx.lineTo(0, 15);
  ctx.quadraticCurveTo(0, 0, 15, 0);
  ctx.closePath();
  ctx.stroke();

  // Título
  ctx.font = 'bold 26px Arial';
  ctx.fillStyle = '#c9a74a';
  ctx.textAlign = 'center';
  ctx.fillText('Boleto Lotería', width / 2, 45);

  // Número grande
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  ctx.fillText(numero.toString().padStart(5, '0'), width / 2, 100);

  // Detalle decorativo (línea inferior)
  ctx.strokeStyle = '#c9a74a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, height - 25);
  ctx.lineTo(width - 40, height - 25);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}
