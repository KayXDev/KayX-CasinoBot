import {  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists, getCurrentMultiplier } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

// Estado global de juegos de rasca activos
const scratchGames = new Map();

// Símbolos por defecto (fallback si no hay config)
const DEFAULT_SYMBOLS = {
  '🍒': { name: 'Cherry', multiplier: 2, rarity: 0.25 },
  '🍋': { name: 'Lemon', multiplier: 3, rarity: 0.20 },
  '🍊': { name: 'Orange', multiplier: 4, rarity: 0.18 },
  '🍇': { name: 'Grapes', multiplier: 5, rarity: 0.15 },
  '🔔': { name: 'Bell', multiplier: 8, rarity: 0.10 },
  '⭐': { name: 'Star', multiplier: 12, rarity: 0.07 },
  '💎': { name: 'Diamond', multiplier: 20, rarity: 0.04 },
  '👑': { name: 'Crown', multiplier: 50, rarity: 0.01 }
};

export const data = new SlashCommandBuilder()
  .setName('rasca')
  .setDescription('🎫 Scratch a fortune ticket! Reveal 3 matching symbols to win big!');

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const moneda = config?.casino?.moneda || '💰';
  
  // Obtener configuración del juego
  const scratchCost = config?.rasca?.precio || 200;
  const simbolosConfig = config?.rasca?.simbolos || {};
  
  // Crear símbolos desde la configuración
  const casinoSymbols = {};
  for (const [key, symbolData] of Object.entries(simbolosConfig)) {
    casinoSymbols[symbolData.emoji] = {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      multiplier: symbolData.multiplier,
      rarity: symbolData.rarity
    };
  }
  
  // Si no hay configuración, usar símbolos por defecto
  const gameSymbols = Object.keys(casinoSymbols).length > 0 ? casinoSymbols : DEFAULT_SYMBOLS;

  // Verificar y agregar usuario si no existe
  await addUserIfNotExists(userId);
  const userBalances = await getUserBalances(userId);

  // Verificar saldo suficiente
  if (userBalances.hand < scratchCost) {
    const insufficientEmbed = new EmbedBuilder()
      .setTitle('💸 Insufficient Funds')
      .setDescription([
        `You need **${scratchCost}** ${moneda} to buy a scratch ticket!`,
        ``,
        `💰 **Your Balance:** ${userBalances.hand} ${moneda}`,
        `📊 **Required:** ${scratchCost} ${moneda}`,
        `💳 **Missing:** ${scratchCost - userBalances.hand} ${moneda}`
      ].join('\n'))
      .setColor(0xff6b6b)
      .setFooter({ text: 'Use /deposit to add more funds to your hand!' })
      .setTimestamp();

    return interaction.reply({ embeds: [insufficientEmbed], flags: MessageFlags.Ephemeral });
  }

  // Cobrar el ticket
  await setUserBalances(userId, userBalances.hand - scratchCost, userBalances.bank);

  // Generar símbolos aleatorios para las 9 posiciones
  const symbols = generateRandomSymbols(gameSymbols);
  
  // Crear el juego
  scratchGames.set(userId, {
    symbols: symbols,
    revealed: [],
    isComplete: false,
    startTime: Date.now(),
    scratchCost: scratchCost,
    gameSymbols: gameSymbols
  });

  // Crear embed inicial
  const gameEmbed = createGameEmbed(userId, symbols, [], moneda, false, scratchCost, gameSymbols);
  const gameButtons = createGameButtons(userId, []);

  await interaction.reply({
    embeds: [gameEmbed],
    components: gameButtons
  });
}

function generateRandomSymbols(casinoSymbols) {
  const symbols = [];
  const symbolKeys = Object.keys(casinoSymbols);
  
  // Generar 9 símbolos aleatorios basados en rareza
  for (let i = 0; i < 9; i++) {
    let random = Math.random();
    let cumulativeProbability = 0;
    
    for (const symbol of symbolKeys) {
      cumulativeProbability += casinoSymbols[symbol].rarity;
      if (random <= cumulativeProbability) {
        symbols.push(symbol);
        break;
      }
    }
    
    // Fallback por si acaso
    if (symbols.length <= i) {
      symbols.push(symbolKeys[0] || '🍒');
    }
  }
  
  return symbols;
}

function createGameEmbed(userId, symbols, revealed, moneda, isGameComplete, scratchCost, gameSymbols) {
  const user = `<@${userId}>`;
  
  // Crear la grilla visual 3x3
  let grid = '';
  for (let i = 0; i < 9; i++) {
    if (i % 3 === 0 && i !== 0) grid += '\n';
    
    if (revealed.includes(i)) {
      grid += symbols[i] + ' ';
    } else {
      grid += '❓ ';
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('🎫 SCRATCH FORTUNE')
    .setColor(isGameComplete ? (checkWinCondition(symbols, revealed, scratchCost, gameSymbols).isWin ? 0x00ff88 : 0xff6b6b) : 0x4169ff);

  if (isGameComplete) {
    const winResult = checkWinCondition(symbols, revealed, scratchCost, gameSymbols);
    if (winResult.isWin) {
      embed.setDescription([
        `🎉 **CONGRATULATIONS ${user}!**`,
        ``,
        `**🎰 Winning Combination:** ${winResult.matchedSymbol.repeat(3)}`,
        `**💰 Prize Won:** ${winResult.prize} ${moneda}`,
        `**⚡ Multiplier:** ${winResult.multiplier}x`,
        ``,
        `**📊 Final Grid:**`,
        `${grid}`,
        ``,
        `🏆 *What an amazing scratch! Try your luck again!*`
      ].join('\n'));
    } else {
      embed.setDescription([
        `💔 **Better luck next time, ${user}!**`,
        ``,
        `**📊 Final Grid:**`,
        `${grid}`,
        ``,
        `*No matching symbols this time, but fortune favors the brave!*`,
        `🎲 Try again for another chance at the jackpot!`
      ].join('\n'));
    }
  } else {
    const revealedCount = revealed.length;
    const remaining = 3 - revealedCount;
    
    embed.setDescription([
      `🎮 **${user}'s Scratch Game**`,
      ``,
      `**🎯 Goal:** Reveal 3 matching symbols to win!`,
      `**🎫 Ticket Cost:** ${scratchCost} ${moneda}`,
      `**🔓 Revealed:** ${revealedCount}/3`,
      ``,
      `**📊 Current Grid:**`,
      `${grid}`,
      ``,
      `🎲 *Choose ${remaining} more position${remaining > 1 ? 's' : ''} to scratch!*`
    ].join('\n'));
  }

  // Agregar información de premios
  const prizeTable = ['```'];
  for (const [symbol, data] of Object.entries(gameSymbols)) {
    const name = data.name.padEnd(8, ' ');
    prizeTable.push(`${symbol} ${name} ×3 → ${data.multiplier}x  💰`);
  }
  prizeTable.push('```');
  
  embed.addFields({
    name: '🏆 Prize Table',
    value: prizeTable.join('\n'),
    inline: false
  });

  embed.setFooter({ text: 'Good luck! May fortune smile upon you!' })
    .setTimestamp();

  return embed;
}

function createGameButtons(userId, revealed) {
  const rows = [];
  
  for (let row = 0; row < 3; row++) {
    const actionRow = new ActionRowBuilder();
    
    for (let col = 0; col < 3; col++) {
      const position = row * 3 + col;
      const isRevealed = revealed.includes(position);
      
      const button = new ButtonBuilder()
        .setCustomId(`scratch_${userId}_${position}`)
        .setLabel(`${position + 1}`)
        .setStyle(isRevealed ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(isRevealed || revealed.length >= 3);
      
      actionRow.addComponents(button);
    }
    
    rows.push(actionRow);
  }
  
  return rows;
}

function checkWinCondition(symbols, revealed, scratchCost, gameSymbols) {
  if (revealed.length < 3) return { isWin: false };
  
  const revealedSymbols = revealed.map(pos => symbols[pos]);
  
  // Contar ocurrencias de cada símbolo
  const symbolCounts = {};
  revealedSymbols.forEach(symbol => {
    symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
  });
  
  // Verificar si hay 3 iguales
  for (const [symbol, count] of Object.entries(symbolCounts)) {
    if (count === 3) {
      const symbolData = gameSymbols[symbol];
      const prize = scratchCost * symbolData.multiplier;
      
      return {
        isWin: true,
        matchedSymbol: symbol,
        multiplier: symbolData.multiplier,
        prize: prize
      };
    }
  }
  
  return { isWin: false };
}

// Handler para los botones de rascar
export async function handleScratchButton(interaction, config) {
  const userId = interaction.user.id;
  const customId = interaction.customId;
  
  if (!customId.startsWith('scratch_')) return;
  
  const parts = customId.split('_');
  if (parts[1] !== userId) {
    return interaction.reply({
      content: '❌ You can only scratch your own ticket!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  const position = parseInt(parts[2]);
  const game = scratchGames.get(userId);
  
  if (!game) {
    return interaction.reply({
      content: '❌ You don\'t have an active scratch game!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  if (game.revealed.includes(position)) {
    return interaction.reply({
      content: '❌ You already scratched that position!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  if (game.revealed.length >= 3) {
    return interaction.reply({
      content: '❌ You already scratched 3 positions!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  // Agregar la posición revelada
  game.revealed.push(position);
  
  const moneda = config?.casino?.moneda || '💰';
  
  // Obtener configuración del juego guardada
  const scratchCost = game.scratchCost;
  const gameSymbols = game.gameSymbols;
  
  // Verificar si el juego está completo
  if (game.revealed.length === 3) {
    game.isComplete = true;
    
    // Verificar si ganó
    const winResult = checkWinCondition(game.symbols, game.revealed, scratchCost, gameSymbols);
    
    if (winResult.isWin) {
      // Obtener multiplicador del usuario y aplicarlo
      const userMultiplier = await getCurrentMultiplier(userId);
      const finalPrize = Math.floor(winResult.prize * userMultiplier);
      
      // Dar el premio al usuario
      const userBalances = await getUserBalances(userId);
      await setUserBalances(userId, userBalances.hand + finalPrize, userBalances.bank);
      
      // Log winning scratch card
      await logGamblingCommand(interaction.user, 'rasca', {
        amount: `${scratchCost} ${moneda}`,
        result: `WON - Prize: +${finalPrize}`,
        additional: `Symbols: ${winResult.symbols.join(' ')} | Match: ${winResult.matchingSymbol}${userMultiplier > 1 ? ` | ${userMultiplier}x boost` : ''}`
      });
      
      // Actualizar el resultado con el multiplicador aplicado
      winResult.prize = finalPrize;
      winResult.appliedMultiplier = userMultiplier;
    } else if (game.isComplete) {
      // Log losing scratch card
      await logGamblingCommand(interaction.user, 'rasca', {
        amount: `${scratchCost} ${moneda}`,
        result: `LOST - No matching symbols`,
        additional: `Symbols revealed: ${game.symbols.join(' ')}`
      });
    }
    
    // Limpiar el juego
    scratchGames.delete(userId);
  }
  
  // Actualizar el embed y botones
  const gameEmbed = createGameEmbed(userId, game.symbols, game.revealed, moneda, game.isComplete, scratchCost, gameSymbols);
  const gameButtons = game.isComplete ? [] : createGameButtons(userId, game.revealed);
  
  await interaction.update({
    embeds: [gameEmbed],
    components: gameButtons
  });
}