import {  SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists, getCurrentMultiplier } from '../db.js';
import { logGamblingCommand, safeInteractionUpdate } from '../util/selectiveLogging.js';

const suits = ['♠️', '♥️', '♦️', '♣️'];
const values = [
  { name: 'A', val: 11 },
  { name: '2', val: 2 },
  { name: '3', val: 3 },
  { name: '4', val: 4 },
  { name: '5', val: 5 },
  { name: '6', val: 6 },
  { name: '7', val: 7 },
  { name: '8', val: 8 },
  { name: '9', val: 9 },
  { name: '10', val: 10 },
  { name: 'J', val: 10 },
  { name: 'Q', val: 10 },
  { name: 'K', val: 10 }
];

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const v of values) {
      deck.push({ name: v.name, suit, val: v.val });
    }
  }
  return deck;
}

function drawCard(deck) {
  const idx = Math.floor(Math.random() * deck.length);
  return deck.splice(idx, 1)[0];
}

function handValue(hand) {
  let value = hand.reduce((acc, c) => acc + c.val, 0);
  let aces = hand.filter(c => c.name === 'A').length;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function handToString(hand) {
  return hand.map(c => `${c.name}${c.suit}`).join(' ');
}

function createCardVisual(card, hidden = false) {
  if (hidden) {
    return '🎴';
  }
  
  // Create card representation matching the image
  return `🂠 ${card.name}${card.suit}`;
}

function createCardDisplay(hand, hideFirst = false) {
  if (!hand || hand.length === 0) return '🎴';
  
  let cardDisplay = '';
  
  for (let i = 0; i < hand.length; i++) {
    if (i === 0 && hideFirst) {
      cardDisplay += '🎴';
    } else {
      const card = hand[i];
      cardDisplay += getCardEmoji(card);
    }
    
    if (i < hand.length - 1) cardDisplay += ' ';
  }
  
  return cardDisplay;
}

function getCardEmoji(card) {
  const cardMap = {
    // Spades (♠️)
    'A♠️': '🂡', '2♠️': '🂢', '3♠️': '🂣', '4♠️': '🂤', '5♠️': '🂥', 
    '6♠️': '🂦', '7♠️': '🂧', '8♠️': '🂨', '9♠️': '🂩', '10♠️': '🂪',
    'J♠️': '🂫', 'Q♠️': '🂭', 'K♠️': '🂮',
    // Hearts (♥️)
    'A♥️': '🂱', '2♥️': '🂲', '3♥️': '🂳', '4♥️': '🂴', '5♥️': '🂵',
    '6♥️': '🂶', '7♥️': '🂷', '8♥️': '🂸', '9♥️': '🂹', '10♥️': '🂺',
    'J♥️': '🂻', 'Q♥️': '🂽', 'K♥️': '🂾',
    // Diamonds (♦️)
    'A♦️': '🃁', '2♦️': '🃂', '3♦️': '🃃', '4♦️': '🃄', '5♦️': '🃅',
    '6♦️': '🃆', '7♦️': '🃇', '8♦️': '🃈', '9♦️': '🃉', '10♦️': '🃊',
    'J♦️': '🃋', 'Q♦️': '🃍', 'K♦️': '🃎',
    // Clubs (♣️)
    'A♣️': '🃑', '2♣️': '🃒', '3♣️': '🃓', '4♣️': '🃔', '5♣️': '🃕',
    '6♣️': '🃖', '7♣️': '🃗', '8♣️': '🃘', '9♣️': '🃙', '10♣️': '🃚',
    'J♣️': '🃛', 'Q♣️': '🃝', 'K♣️': '🃞'
  };
  
  const cardKey = `${card.name}${card.suit}`;
  return cardMap[cardKey] || `${card.name}${card.suit}`;
}

function createCardVisualDisplay(hand, hideFirst = false) {
  if (!hand || hand.length === 0) return 'No cards';
  
  let cardDisplay = '';
  
  for (let i = 0; i < hand.length; i++) {
    if (i === 0 && hideFirst) {
      cardDisplay += '🎴 ';
    } else {
      const card = hand[i];
      // Use actual card emojis for much better visual
      cardDisplay += `${getCardEmoji(card)} `;
    }
  }
  
  return cardDisplay.trim();
}

function createCardValues(hand, hideFirst = false) {
  if (!hand || hand.length === 0) return '?';
  
  let valueDisplay = '';
  
  for (let i = 0; i < hand.length; i++) {
    if (i === 0 && hideFirst) {
      valueDisplay += '? ';
    } else {
      const card = hand[i];
      valueDisplay += `${card.name}${card.suit} `;
    }
  }
  
  return valueDisplay.trim();
}

function calculateGameStats(userBalances, bet, gameState, actualWinnings = 0) {
  const pocket = userBalances.hand;
  let sessionWinnings = actualWinnings; // Actual winnings for this game
  let net = 0;
  let potentialPayout = 0;
  
  if (gameState.gameStatus === 'won') {
    net = sessionWinnings; // Net gain from actual winnings
  } else if (gameState.gameStatus === 'lost') {
    net = -bet; // Net loss
  } else if (gameState.gameStatus === 'push') {
    net = 0; // No change
  } else {
    // Game still active - show potential winnings
    potentialPayout = bet;
    net = 0;
  }
  
  return { pocket, sessionWinnings, net, potentialPayout, currentBet: bet };
}

function createGameEmbed(playerHand, dealerHand, gameState, playerName, bet, userBalances, hideDealerFirst = false, sessionWinnings = 0) {
  const playerValue = handValue(playerHand);
  const dealerValue = hideDealerFirst ? '?' : handValue(dealerHand);
  const stats = calculateGameStats(userBalances, bet, gameState, sessionWinnings);
  
  // Sophisticated color scheme based on game state
  let embedColor = '#1a1a2e'; // Deep midnight blue default
  let tableTheme = '🎯';
  
  if (gameState.gameStatus === 'won') {
    embedColor = '#0d7377'; // Teal green
    tableTheme = '✨';
  } else if (gameState.gameStatus === 'lost') {
    embedColor = '#c73e1d'; // Burgundy red  
    tableTheme = '⚡';
  } else if (gameState.gameStatus === 'push') {
    embedColor = '#f39c12'; // Golden amber
    tableTheme = '💫';
  }
  
  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`${tableTheme} **BLACKJACK PREMIUM** ${tableTheme}`)
    .setDescription(`**${playerName}** is at the VIP table`);

  // Luxurious dashboard design
  const balanceDisplay = `💎 **${stats.pocket.toLocaleString()}**`;
  const betDisplay = `🔥 **${stats.currentBet.toLocaleString()}**`;
  const netDisplay = stats.sessionWinnings >= 0 
    ? `📈 **+${stats.sessionWinnings.toLocaleString()}**`
    : `📉 **${stats.sessionWinnings.toLocaleString()}**`;

  embed.addFields({
    name: '╭─────── **DASHBOARD** ───────╮',
    value: `\`\`\`
┌─ Balance     ${balanceDisplay}
├─ Current Bet ${betDisplay}  
└─ Session     ${netDisplay}
\`\`\``,
    inline: false
  });

  // Elegant card table layout
  const dealerCardLine = createCardVisualDisplay(dealerHand, hideDealerFirst);
  const playerCardLine = createCardVisualDisplay(playerHand, false);
  
  const dealerValueText = dealerValue === '?' ? '**???**' : `**${dealerValue}**`;
  const playerValueText = `**${playerValue}**`;
  
  embed.addFields({
    name: '╭─────── **THE TABLE** ───────╮',
    value: `
🎭 **DEALER**
${dealerCardLine}
**Total:** ${dealerValueText}

👤 **${playerName.toUpperCase()}**
${playerCardLine}
**Total:** ${playerValueText}
    `,
    inline: false
  });

  // Status and results section
  if (gameState.message) {
    let resultIcon = '🎪';
    let resultColor = '';
    
    if (gameState.gameStatus === 'won') {
      resultIcon = '🎉';
      resultColor = '```diff\n+ ';
    } else if (gameState.gameStatus === 'lost') {
      resultIcon = '💥';
      resultColor = '```diff\n- ';
    } else if (gameState.gameStatus === 'push') {
      resultIcon = '🤝';
      resultColor = '```yaml\n';
    }
    
    embed.addFields({
      name: `${resultIcon} **GAME RESULT**`,
      value: `${resultColor}${gameState.message}\n\`\`\``,
      inline: false
    });
  }

  // Dynamic game state descriptions
  if (playerValue === 21 && playerHand.length === 2) {
    embed.setDescription(`**${playerName}** is at the VIP table\n\n🌟 **BLACKJACK!** 🌟\n*Natural 21 - Premium Payout!*`);
  } else if (playerValue > 21) {
    embed.setDescription(`**${playerName}** is at the VIP table\n\n💥 **BUST!** 💥\n*Over 21 - House Wins*`);
  } else if (gameState.gameActive) {
    embed.setDescription(`**${playerName}** is at the VIP table\n\n${tableTheme} **Your Turn** ${tableTheme}\n*Make your next move...*`);
  } else if (gameState.gameStatus === 'won') {
    embed.setDescription(`**${playerName}** is at the VIP table\n\n🏆 **WINNER!** 🏆\n*Payout: $${sessionWinnings.toLocaleString()}*`);
  }

  // Premium footer
  const tableNumber = Math.floor(Math.random() * 25) + 1;
  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    timeZone: 'America/Los_Angeles' 
  });
  
  embed.setFooter({ 
    text: `🎰 Premium Table ${tableNumber} • Las Vegas Time: ${timestamp} • Minimum Bet: $10`
  });

  return embed;
}

function createGameButtons(gameState, canDouble = false, canSplit = false, bet = 0) {
  const components = [];
  
  if (gameState.gameActive) {
    // Main action buttons - sleek and professional
    const primaryRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('hit')
          .setLabel('HIT ME')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎯'),
        new ButtonBuilder()
          .setCustomId('stand')
          .setLabel('I STAND')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✋')
      );
    
    components.push(primaryRow);
    
    // Advanced options row
    const advancedButtons = [];
    
    if (canDouble) {
      advancedButtons.push(
        new ButtonBuilder()
          .setCustomId('double')
          .setLabel(`DOUBLE DOWN • $${bet.toLocaleString()}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💎')
      );
    }
    
    if (canSplit) {
      advancedButtons.push(
        new ButtonBuilder()
          .setCustomId('split')
          .setLabel('SPLIT HAND')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⚡')
      );
    }
    
    // Add surrender as a risk management option
    advancedButtons.push(
      new ButtonBuilder()
        .setCustomId('surrender')
        .setLabel('SURRENDER')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🏳️')
    );
    
    if (advancedButtons.length > 0) {
      const advancedRow = new ActionRowBuilder().addComponents(...advancedButtons);
      components.push(advancedRow);
    }
  }
  
  return components;
}

export const data = new SlashCommandBuilder()
  .setName('blackjack')
  .setDescription('Play blackjack against the house or challenge another player!')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount to bet (min: $10, max: $10,000)')
      .setRequired(true)
      .setMinValue(10)
      .setMaxValue(10000)
  )
  .addUserOption(option =>
    option.setName('opponent')
      .setDescription('Challenge another player (optional)')
      .setRequired(false)
  );

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger('bet');
  const opponent = interaction.options.getUser('opponent');

  const blackjackConfig = config?.blackjack || {};
  const minBet = blackjackConfig.minBet || 10;
  const maxBet = blackjackConfig.maxBet || 10000;
  const payout = blackjackConfig.payout || 2;
  const dealerStand = blackjackConfig.dealerStand || 17;
  const moneda = config.casino?.moneda || '💰';

  // Validate bet amount
  if (bet < minBet || bet > maxBet) {
    return interaction.reply({
      content: `❌ Bet must be between $${minBet.toLocaleString()} and $${maxBet.toLocaleString()}.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // Add users to database if they don't exist
  await addUserIfNotExists(userId);
  const userBalances = await getUserBalances(userId);

  // Check if user has enough balance
  if (userBalances.hand < bet) {
    return interaction.reply({
      content: `❌ Insufficient hand balance! You have $${userBalances.hand.toLocaleString()}, but need $${bet.toLocaleString()}.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // Handle PvP mode
  if (opponent) {
    if (opponent.id === userId) {
      return interaction.reply({
        content: '❌ You cannot challenge yourself!',
        flags: MessageFlags.Ephemeral
      });
    }

    if (opponent.bot) {
      return interaction.reply({
        content: '❌ You cannot challenge a bot!',
        flags: MessageFlags.Ephemeral
      });
    }

    // PvP Challenge System
    const challengeEmbed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle('🎯 **BLACKJACK CHALLENGE**')
      .setDescription(`\`\`\`diff
+ ${interaction.user.displayName} challenges ${opponent.displayName} to Blackjack!
\`\`\``)
      .addFields(
        {
          name: '💰 **Bet Amount**',
          value: `$${bet.toLocaleString()}`,
          inline: true
        },
        {
          name: '⏱️ **Time Limit**',
          value: '60 seconds',
          inline: true
        }
      )
      .setFooter({ text: 'Accept or decline the challenge!' });

    const challengeButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accept_challenge')
          .setLabel('Accept ✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('decline_challenge')
          .setLabel('Decline ❌')
          .setStyle(ButtonStyle.Danger)
      );

    await interaction.reply({
      content: `${opponent}`,
      embeds: [challengeEmbed],
      components: [challengeButtons]
    });

    const filter = i => i.user.id === opponent.id && (i.customId === 'accept_challenge' || i.customId === 'decline_challenge');
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'decline_challenge') {
        const declineEmbed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🚫 **Challenge Declined**')
          .setDescription(`${opponent.displayName} declined the blackjack challenge.`);
        
        await safeInteractionUpdate(i, { embeds: [declineEmbed], components: [] });
        collector.stop();
      } else if (i.customId === 'accept_challenge') {
        await addUserIfNotExists(opponent.id);
        const opponentBalances = await getUserBalances(opponent.id);
        
        if (opponentBalances.hand < bet) {
          const content = `❌ ${opponent.displayName} doesn't have enough balance! They have $${opponentBalances.hand.toLocaleString()}, but need $${bet.toLocaleString()}.`;
          await safeInteractionUpdate(i, { content, embeds: [], components: [] });
          collector.stop();
          return;
        }

        // Start PvP game - REAL IMPLEMENTATION
        await i.deferUpdate(); // Important: defer the interaction first
        await startPvPBlackjack(interaction, interaction.user, opponent, bet, config);
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        safeInteractionUpdate(interaction, {
          content: '⏰ Challenge expired.',
          embeds: [],
          components: []
        });
      }
    });
    
    return;
  }

  // House Mode - Single Player Game
  await playHouseGame(interaction, bet, userBalances, blackjackConfig);
}

async function playHouseGame(interaction, bet, userBalances, config) {
  const userId = interaction.user.id;
  const payout = config.payout || 2;
  const dealerStand = config.dealerStand || 17;
  const moneda = config.casino?.moneda || '💰';

  // Initialize game
  const deck = createDeck();
  const playerHand = [drawCard(deck), drawCard(deck)];
  const dealerHand = [drawCard(deck), drawCard(deck)];
  
  const playerValue = handValue(playerHand);
  const dealerValue = handValue(dealerHand);

  // Check for natural blackjacks
  const playerBlackjack = playerValue === 21;
  const dealerBlackjack = dealerValue === 21;

  let gameState = {
    gameActive: true,
    gameStatus: null,
    playerStatus: playerBlackjack ? 'Blackjack!' : 'Playing',
    dealerStatus: 'Playing',
    message: null
  };

  // Handle natural blackjacks
  if (playerBlackjack && dealerBlackjack) {
    gameState.gameActive = false;
    gameState.gameStatus = 'push';
    gameState.dealerStatus = 'Blackjack!';
    gameState.message = '+ Both have Blackjack! Push - bet returned.';
  } else if (playerBlackjack) {
    gameState.gameActive = false;
    gameState.gameStatus = 'won';
    gameState.message = '+ BLACKJACK! You win with natural 21!';
    
    const multiplier = await getCurrentMultiplier(userId);
    let winnings = Math.floor(bet * 1.5); // Blackjack pays 3:2
    if (multiplier > 1) {
      winnings = Math.floor(winnings * multiplier);
    }
    
    await setUserBalances(userId, userBalances.hand + winnings, userBalances.bank);
    userBalances.hand += winnings; // Update local balance
    
    // Log blackjack win
    await logGamblingCommand(interaction.user, 'blackjack', {
      amount: `${bet} ${moneda}`,
      result: `BLACKJACK WON - Payout: +${winnings}`,
      additional: multiplier > 1 ? `${multiplier}x multiplier applied` : undefined
    });
  } else if (dealerBlackjack) {
    gameState.gameActive = false;
    gameState.gameStatus = 'lost';
    gameState.dealerStatus = 'Blackjack!';
    gameState.message = '- Dealer has Blackjack! You lose.';
    
    await setUserBalances(userId, userBalances.hand - bet, userBalances.bank);
    userBalances.hand -= bet; // Update local balance
    
    // Log dealer blackjack loss
    await logGamblingCommand(interaction.user, 'blackjack', {
      amount: `${bet} ${moneda}`,
      result: `DEALER BLACKJACK - Lost: -${bet}`,
      additional: 'Dealer natural blackjack'
    });
  }

  // Determine available actions
  const canDouble = playerHand.length === 2 && userBalances.hand >= bet * 2 && gameState.gameActive;
  const canSplit = playerHand.length === 2 && 
                   playerHand[0].name === playerHand[1].name && 
                   userBalances.hand >= bet * 2 && 
                   gameState.gameActive;

  const embed = createGameEmbed(
    playerHand, 
    dealerHand, 
    gameState, 
    interaction.user.displayName, 
    bet, 
    userBalances, 
    gameState.gameActive, // Hide dealer's first card only if game is active
    gameState.gameStatus === 'won' ? (playerBlackjack ? Math.floor(bet * 1.5) : bet) : 0 // Session winnings
  );

  const buttonRows = createGameButtons(gameState, canDouble, canSplit, bet);
  const components = gameState.gameActive ? buttonRows : [];

  try {
    await interaction.reply({ embeds: [embed], components });
  } catch (error) {
    console.error('Error replying to interaction:', error);
    return;
  }

  // If game is already over, return early
  if (!gameState.gameActive) return;

  // Set up button collector for ongoing game
  const filter = i => i.user.id === userId;
  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 }); // Reduced timeout

  collector.on('collect', async i => {
    if (!i.deferred && !i.replied) {
      await i.deferUpdate().catch(() => {});
    }
    
    // Ensure moneda is available in this scope
    const currentMoneda = config.casino?.moneda || '💰';
    
    try {
      if (i.customId === 'hit') {
        await handleHit(i, deck, playerHand, dealerHand, bet, userBalances, config, collector, currentMoneda);
      } else if (i.customId === 'stand') {
        await handleStand(i, deck, playerHand, dealerHand, bet, userBalances, config, collector, currentMoneda);
      } else if (i.customId === 'double') {
        await handleDouble(i, deck, playerHand, dealerHand, bet, userBalances, config, collector, currentMoneda);
      } else if (i.customId === 'split') {
        await handleSplit(i, deck, playerHand, dealerHand, bet, userBalances, config, collector, currentMoneda);
      } else if (i.customId === 'surrender') {
        await handleSurrender(i, playerHand, dealerHand, bet, userBalances, collector, currentMoneda);
      }
    } catch (error) {
      console.error('Error handling blackjack action:', error);
      try {
        if (!i.replied && !i.deferred) {
          await i.reply({ content: '❌ An error occurred. Please try again.', flags: MessageFlags.Ephemeral });
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'time') {
      await safeInteractionUpdate(interaction, {
        content: '⏰ Game timed out.',
        components: []
      });
    }
  });
}

async function handleHit(interaction, deck, playerHand, dealerHand, bet, userBalances, config, collector, moneda) {
  const userId = interaction.user.id;
  
  // Draw a card
  playerHand.push(drawCard(deck));
  const playerValue = handValue(playerHand);

  let gameState = {
    gameActive: true,
    gameStatus: null,
    playerStatus: 'Playing',
    dealerStatus: 'Playing',
    message: null
  };

  // Check if player busted
  if (playerValue > 21) {
    gameState.gameActive = false;
    gameState.gameStatus = 'lost';
    gameState.playerStatus = 'Busted!';
    gameState.message = '- You busted! Dealer wins.';
    
    await setUserBalances(userId, userBalances.hand - bet, userBalances.bank);
    userBalances.hand -= bet;
    collector.stop();
  }

  const canDouble = playerHand.length === 2 && userBalances.hand >= bet * 2 && gameState.gameActive;
  const canSplit = false; // Can't split after hitting

  const embed = createGameEmbed(
    playerHand, 
    dealerHand, 
    gameState, 
    interaction.user.displayName, 
    bet, 
    userBalances, 
    gameState.gameActive,
    gameState.gameStatus === 'lost' ? -bet : 0 // Show loss if busted
  );

  const buttonRows = createGameButtons(gameState, canDouble, canSplit, bet);
  const components = gameState.gameActive ? buttonRows : [];

  await safeInteractionUpdate(interaction, { embeds: [embed], components });
}

async function handleStand(interaction, deck, playerHand, dealerHand, bet, userBalances, config, collector, moneda) {
  const userId = interaction.user.id;
  const payout = config.payout || 2;
  const dealerStand = config.dealerStand || 17;
  
  // Dealer plays
  while (handValue(dealerHand) < dealerStand) {
    dealerHand.push(drawCard(deck));
  }

  const playerValue = handValue(playerHand);
  const dealerValue = handValue(dealerHand);

  let gameState = {
    gameActive: false,
    gameStatus: null,
    playerStatus: 'Stood',
    dealerStatus: dealerValue > 21 ? 'Busted!' : 'Stood',
    message: null
  };

  // Determine winner and calculate session winnings
  let sessionWinnings = 0;
  
  if (dealerValue > 21) {
    gameState.gameStatus = 'won';
    gameState.message = '+ Dealer busted! You win!';
    
    const multiplier = await getCurrentMultiplier(userId);
    let winnings = bet * (payout - 1);
    if (multiplier > 1) {
      winnings = Math.floor(winnings * multiplier);
    }
    
    sessionWinnings = winnings;
    await setUserBalances(userId, userBalances.hand + winnings, userBalances.bank);
    userBalances.hand += winnings;
    
    // Log dealer bust win
    await logGamblingCommand(interaction.user, 'blackjack', {
      amount: `${bet} ${moneda}`,
      result: `DEALER BUST WON - Payout: +${winnings}`,
      additional: `Dealer: ${dealerValue} | Player: ${playerValue}`
    });
  } else if (playerValue > dealerValue) {
    gameState.gameStatus = 'won';
    gameState.message = `+ You win! ${playerValue} beats ${dealerValue}!`;
    
    const multiplier = await getCurrentMultiplier(userId);
    let winnings = bet * (payout - 1);
    if (multiplier > 1) {
      winnings = Math.floor(winnings * multiplier);
    }
    
    sessionWinnings = winnings;
    await setUserBalances(userId, userBalances.hand + winnings, userBalances.bank);
    userBalances.hand += winnings;
    
    // Log regular win
    await logGamblingCommand(interaction.user, 'blackjack', {
      amount: `${bet} ${moneda}`,
      result: `WON - Payout: +${winnings}`,
      additional: `Player: ${playerValue} vs Dealer: ${dealerValue}${multiplier > 1 ? ` (${multiplier}x boost)` : ''}`
    });
  } else if (playerValue === dealerValue) {
    gameState.gameStatus = 'push';
    gameState.message = '= Push! Bet returned.';
    sessionWinnings = 0;
    
    // Log push/tie
    await logGamblingCommand(interaction.user, 'blackjack', {
      amount: `${bet} ${moneda}`,
      result: `PUSH - Bet returned`,
      additional: `Both: ${playerValue} - Tie game`
    });
  } else {
    gameState.gameStatus = 'lost';
    gameState.message = `- Dealer wins! ${dealerValue} beats ${playerValue}.`;
    sessionWinnings = -bet;
    
    await setUserBalances(userId, userBalances.hand - bet, userBalances.bank);
    
    // Log regular loss
    await logGamblingCommand(interaction.user, 'blackjack', {
      amount: `${bet} ${moneda}`,
      result: `LOST - Lost: -${bet}`,
      additional: `Player: ${playerValue} vs Dealer: ${dealerValue}`
    });
    userBalances.hand -= bet;
  }

  const embed = createGameEmbed(
    playerHand, 
    dealerHand, 
    gameState, 
    interaction.user.displayName, 
    bet, 
    userBalances, 
    false, // Show all dealer cards
    sessionWinnings // Pass actual session winnings
  );

  await safeInteractionUpdate(interaction, { embeds: [embed], components: [] });
  collector.stop();
}

async function handleDouble(interaction, deck, playerHand, dealerHand, bet, userBalances, config, collector, moneda) {
  const userId = interaction.user.id;
  const payout = config.payout || 2;
  const dealerStand = config.dealerStand || 17;

  // Check if double down is valid
  if (playerHand.length !== 2 || userBalances.hand < bet * 2) {
    await interaction.reply({
      content: '❌ Cannot double down. You need exactly 2 cards and sufficient balance.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Double the bet and draw exactly one card
  playerHand.push(drawCard(deck));
  const playerValue = handValue(playerHand);

  let gameState = {
    gameActive: false,
    gameStatus: null,
    playerStatus: playerValue > 21 ? 'Busted!' : 'Doubled',
    dealerStatus: 'Playing',
    message: null
  };

  let sessionWinnings = 0;
  
  if (playerValue > 21) {
    gameState.gameStatus = 'lost';
    gameState.message = '- You busted on double down! You lose double bet.';
    sessionWinnings = -bet * 2;
    
    await setUserBalances(userId, userBalances.hand - bet * 2, userBalances.bank);
    userBalances.hand -= bet * 2;
  } else {
    // Dealer plays
    while (handValue(dealerHand) < dealerStand) {
      dealerHand.push(drawCard(deck));
    }

    const dealerValue = handValue(dealerHand);
    gameState.dealerStatus = dealerValue > 21 ? 'Busted!' : 'Stood';

    if (dealerValue > 21 || playerValue > dealerValue) {
      gameState.gameStatus = 'won';
      gameState.message = '+ Double down wins! You win double bet!';
      
      const multiplier = await getCurrentMultiplier(userId);
      let winnings = bet * (payout - 1) * 2;
      if (multiplier > 1) {
        winnings = Math.floor(winnings * multiplier);
      }
      
      sessionWinnings = winnings;
      await setUserBalances(userId, userBalances.hand + winnings, userBalances.bank);
      userBalances.hand += winnings;
    } else if (playerValue === dealerValue) {
      gameState.gameStatus = 'push';
      gameState.message = '= Double down push! Double bet returned.';
      sessionWinnings = 0;
    } else {
      gameState.gameStatus = 'lost';
      gameState.message = '- Double down loses! You lose double bet.';
      sessionWinnings = -bet * 2;
      
      await setUserBalances(userId, userBalances.hand - bet * 2, userBalances.bank);
      userBalances.hand -= bet * 2;
    }
  }

  const embed = createGameEmbed(
    playerHand, 
    dealerHand, 
    gameState, 
    interaction.user.displayName, 
    bet * 2, // Show doubled bet
    userBalances, 
    false,
    sessionWinnings
  );

  await safeInteractionUpdate(interaction, { embeds: [embed], components: [] });
  collector.stop();
}

async function handleSplit(interaction, deck, playerHand, dealerHand, bet, userBalances, config, collector, moneda) {
  const userId = interaction.user.id;
  const payout = config.payout || 2;
  const dealerStand = config.dealerStand || 17;

  // Check if split is valid
  if (playerHand.length !== 2 || 
      playerHand[0].name !== playerHand[1].name || 
      userBalances.hand < bet * 2) {
    await interaction.reply({
      content: '❌ Cannot split. You need two identical cards and sufficient balance.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Create two hands
  const hand1 = [playerHand[0], drawCard(deck)];
  const hand2 = [playerHand[1], drawCard(deck)];

  // Play both hands automatically (simplified version)
  const hands = [hand1, hand2];
  const results = [];

  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    let value = handValue(hand);
    
    // Simple strategy: hit if under 17
    while (value < 17 && value <= 21) {
      hand.push(drawCard(deck));
      value = handValue(hand);
    }
    
    results.push(value);
  }

  // Dealer plays
  while (handValue(dealerHand) < dealerStand) {
    dealerHand.push(drawCard(deck));
  }

  const dealerValue = handValue(dealerHand);
  let totalResult = 0;
  let resultMessage = '**SPLIT RESULTS:**\n';

  const multiplier = await getCurrentMultiplier(userId);

  for (let i = 0; i < 2; i++) {
    const handValue = results[i];
    resultMessage += `Hand ${i + 1}: ${handToString(hands[i])} (${handValue}) - `;
    
    if (handValue > 21) {
      resultMessage += 'Busted! Lose bet.\n';
      totalResult -= bet;
    } else if (dealerValue > 21 || handValue > dealerValue) {
      let winnings = bet * (payout - 1);
      if (multiplier > 1) {
        winnings = Math.floor(winnings * multiplier);
      }
      resultMessage += `Win! Gain $${winnings.toLocaleString()}.\n`;
      totalResult += winnings;
    } else if (handValue === dealerValue) {
      resultMessage += 'Push! Bet returned.\n';
    } else {
      resultMessage += 'Lose!\n';
      totalResult -= bet;
    }
  }

  await setUserBalances(userId, userBalances.hand + totalResult, userBalances.bank);
  userBalances.hand += totalResult;
  
  // Log del comando de gambling (Split result)
  await logGamblingCommand(interaction.user, 'blackjack', {
    amount: `${totalBet} ${moneda}`,
    result: `SPLIT ${totalResult > 0 ? 'WON' : totalResult < 0 ? 'LOST' : 'PUSH'} - Net: ${totalResult}`,
    additional: `Split hands completed`
  });

  let gameState = {
    gameActive: false,
    gameStatus: totalResult > 0 ? 'won' : (totalResult < 0 ? 'lost' : 'push'),
    playerStatus: 'Split Complete',
    dealerStatus: dealerValue > 21 ? 'Busted!' : 'Stood',
    message: resultMessage
  };

  const embed = createGameEmbed(
    hands[0], // Show first hand
    dealerHand, 
    gameState, 
    interaction.user.displayName, 
    bet * 2, // Total bet amount
    userBalances, 
    false,
    totalResult // Pass split winnings
  );

  await safeInteractionUpdate(interaction, { embeds: [embed], components: [] });
  collector.stop();
}

async function handleSurrender(interaction, playerHand, dealerHand, bet, userBalances, collector, moneda) {
  const userId = interaction.user.id;
  
  // Surrender loses half the bet
  const loss = Math.floor(bet / 2);
  
  await setUserBalances(userId, userBalances.hand - loss, userBalances.bank);
  userBalances.hand -= loss;

  let gameState = {
    gameActive: false,
    gameStatus: 'lost',
    playerStatus: 'Surrendered',
    dealerStatus: 'Wins',
    message: `- You surrendered! You lose half your bet ($${loss.toLocaleString()}).`
  };

  const embed = createGameEmbed(
    playerHand, 
    dealerHand, 
    gameState, 
    interaction.user.displayName, 
    bet, 
    userBalances, 
    false,
    -loss // Pass surrender loss
  );

  await safeInteractionUpdate(interaction, { embeds: [embed], components: [] });
  collector.stop();
}

// ═══════════════════════════════════════════════════════════════
// 🥊 PVP BLACKJACK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════

async function startPvPBlackjack(interaction, challenger, opponent, bet, config) {
  const moneda = config.casino?.moneda || '💰';
  
  try {
    // Deduct bet from both players
    const challengerBalances = await getUserBalances(challenger.id);
    const opponentBalances = await getUserBalances(opponent.id);
    
    await setUserBalances(challenger.id, challengerBalances.hand - bet, challengerBalances.bank);
    await setUserBalances(opponent.id, opponentBalances.hand - bet, opponentBalances.bank);
    
    // Create decks for both players
    const challengerDeck = createDeck();
    const opponentDeck = createDeck();
    
    // Deal initial cards
    const challengerHand = [drawCard(challengerDeck), drawCard(challengerDeck)];
    const opponentHand = [drawCard(opponentDeck), drawCard(opponentDeck)];
    
    // Game state
    const gameState = {
      challenger: {
        hand: challengerHand,
        deck: challengerDeck,
        finished: false,
        busted: false,
        blackjack: handValue(challengerHand) === 21
      },
      opponent: {
        hand: opponentHand,
        deck: opponentDeck,
        finished: false,
        busted: false,
        blackjack: handValue(opponentHand) === 21
      },
      currentPlayer: challenger.id,
      bet: bet
    };
    
    // Check for initial blackjacks
    if (gameState.challenger.blackjack && gameState.opponent.blackjack) {
      return await endPvPGame(interaction, challenger, opponent, gameState, 'tie', config);
    } else if (gameState.challenger.blackjack) {
      return await endPvPGame(interaction, challenger, opponent, gameState, 'challenger', config);
    } else if (gameState.opponent.blackjack) {
      return await endPvPGame(interaction, challenger, opponent, gameState, 'opponent', config);
    }
    
    // Send initial loading message
    const loadingEmbed = new EmbedBuilder()
      .setTitle('🥊 PvP BLACKJACK STARTING')
      .setDescription('Setting up the game...')
      .setColor(0xf39c12);
    
    await interaction.editReply({
      embeds: [loadingEmbed],
      components: []
    });
    
    // Start the game after a brief moment
    setTimeout(async () => {
      await displayPvPGame(interaction, challenger, opponent, gameState, config);
    }, 1000);
    
  } catch (error) {
    console.error('Error in PvP Blackjack:', error);
    await interaction.followUp({
      content: '❌ An error occurred while starting the PvP game. Bets have been refunded.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function displayPvPGame(interaction, challenger, opponent, gameState, config) {
  const moneda = config.casino?.moneda || '💰';
  const currentPlayer = gameState.currentPlayer === challenger.id ? challenger : opponent;
  const currentPlayerState = gameState.currentPlayer === challenger.id ? gameState.challenger : gameState.opponent;
  
  const embed = new EmbedBuilder()
    .setTitle('🥊 PvP BLACKJACK BATTLE')
    .setColor(gameState.currentPlayer === challenger.id ? 0x3498db : 0xe74c3c)
    .setDescription(`**${currentPlayer.displayName}'s Turn**\n\n💰 **Pot:** ${(gameState.bet * 2).toLocaleString()} ${moneda}`)
    .addFields(
      {
        name: `🎯 ${challenger.displayName} (${handValue(gameState.challenger.hand)})`,
        value: `${handToString(gameState.challenger.hand)}${gameState.challenger.finished ? ' ✅' : ''}${gameState.challenger.busted ? ' 💥' : ''}`,
        inline: false
      },
      {
        name: `🎯 ${opponent.displayName} (${handValue(gameState.opponent.hand)})`,
        value: `${handToString(gameState.opponent.hand)}${gameState.opponent.finished ? ' ✅' : ''}${gameState.opponent.busted ? ' 💥' : ''}`,
        inline: false
      }
    )
    .setFooter({ text: `Turn: ${currentPlayer.displayName}` })
    .setTimestamp();
  
  // Create buttons for current player
  const buttons = new ActionRowBuilder();
  
  if (!currentPlayerState.finished && !currentPlayerState.busted) {
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`pvp_hit_${gameState.currentPlayer}`)
        .setLabel('Hit 🃏')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`pvp_stand_${gameState.currentPlayer}`)
        .setLabel('Stand ✋')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  
  await interaction.editReply({
    content: `${currentPlayer}`,
    embeds: [embed],
    components: buttons.components.length > 0 ? [buttons] : []
  });
  
  // Set up collector for player actions
  const filter = i => i.user.id === gameState.currentPlayer && i.customId.startsWith('pvp_');
  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 45000 });
  
  collector.on('collect', async i => {
    const action = i.customId.split('_')[1];
    const playerId = i.customId.split('_')[2];
    const playerState = playerId === challenger.id ? gameState.challenger : gameState.opponent;
    
    if (action === 'hit') {
      // Player hits
      const newCard = drawCard(playerState.deck);
      playerState.hand.push(newCard);
      
      const handVal = handValue(playerState.hand);
      if (handVal > 21) {
        playerState.busted = true;
        playerState.finished = true;
      }
      
      await i.deferUpdate();
      
      // Check if current player is done
      if (playerState.busted || playerState.finished) {
        await switchTurnOrEnd(interaction, challenger, opponent, gameState, config);
      } else {
        await displayPvPGame(interaction, challenger, opponent, gameState, config);
      }
      
    } else if (action === 'stand') {
      // Player stands
      playerState.finished = true;
      await i.deferUpdate();
      await switchTurnOrEnd(interaction, challenger, opponent, gameState, config);
    }
    
    collector.stop();
  });
  
  collector.on('end', (_, reason) => {
    if (reason === 'time') {
      // Auto-stand on timeout
      const playerState = gameState.currentPlayer === challenger.id ? gameState.challenger : gameState.opponent;
      playerState.finished = true;
      switchTurnOrEnd(interaction, challenger, opponent, gameState, config);
    }
  });
}

async function switchTurnOrEnd(interaction, challenger, opponent, gameState, config) {
  // Check if both players are finished
  if (gameState.challenger.finished && gameState.opponent.finished) {
    return await determinePvPWinner(interaction, challenger, opponent, gameState, config);
  }
  
  // Switch turns
  if (gameState.currentPlayer === challenger.id && !gameState.opponent.finished) {
    gameState.currentPlayer = opponent.id;
    await displayPvPGame(interaction, challenger, opponent, gameState, config);
  } else if (gameState.currentPlayer === opponent.id && !gameState.challenger.finished) {
    gameState.currentPlayer = challenger.id;
    await displayPvPGame(interaction, challenger, opponent, gameState, config);
  } else {
    // Current player finished, other player is also finished or it's their turn
    await determinePvPWinner(interaction, challenger, opponent, gameState, config);
  }
}

async function determinePvPWinner(interaction, challenger, opponent, gameState, config) {
  const challengerValue = handValue(gameState.challenger.hand);
  const opponentValue = handValue(gameState.opponent.hand);
  
  let winner = null;
  
  // Determine winner
  if (gameState.challenger.busted && gameState.opponent.busted) {
    winner = 'tie'; // Both busted
  } else if (gameState.challenger.busted) {
    winner = 'opponent';
  } else if (gameState.opponent.busted) {
    winner = 'challenger';
  } else if (challengerValue > opponentValue) {
    winner = 'challenger';
  } else if (opponentValue > challengerValue) {
    winner = 'opponent';
  } else {
    winner = 'tie';
  }
  
  await endPvPGame(interaction, challenger, opponent, gameState, winner, config);
}

async function endPvPGame(interaction, challenger, opponent, gameState, winner, config) {
  const moneda = config.casino?.moneda || '💰';
  const pot = gameState.bet * 2;
  
  // Calculate payouts
  let challengerPayout = 0;
  let opponentPayout = 0;
  let resultText = '';
  let embedColor = 0x95a5a6; // Gray for tie
  
  if (winner === 'challenger') {
    challengerPayout = pot;
    opponentPayout = 0;
    resultText = `🏆 **${challenger.displayName} WINS!**`;
    embedColor = 0x2ecc71; // Green
  } else if (winner === 'opponent') {
    challengerPayout = 0;
    opponentPayout = pot;
    resultText = `🏆 **${opponent.displayName} WINS!**`;
    embedColor = 0x2ecc71; // Green
  } else {
    // Tie - refund bets
    challengerPayout = gameState.bet;
    opponentPayout = gameState.bet;
    resultText = `🤝 **IT'S A TIE!**`;
    embedColor = 0xf39c12; // Orange
  }
  
  // Update balances
  if (challengerPayout > 0) {
    const challengerBalances = await getUserBalances(challenger.id);
    await setUserBalances(challenger.id, challengerBalances.hand + challengerPayout, challengerBalances.bank);
  }
  
  if (opponentPayout > 0) {
    const opponentBalances = await getUserBalances(opponent.id);
    await setUserBalances(opponent.id, opponentBalances.hand + opponentPayout, opponentBalances.bank);
  }
  
  // Create final embed
  const finalEmbed = new EmbedBuilder()
    .setTitle('🥊 PvP BLACKJACK RESULTS')
    .setColor(embedColor)
    .setDescription(resultText)
    .addFields(
      {
        name: `🎯 ${challenger.displayName} (${handValue(gameState.challenger.hand)})`,
        value: `${handToString(gameState.challenger.hand)}\n💰 **Payout:** ${challengerPayout.toLocaleString()} ${moneda}`,
        inline: true
      },
      {
        name: `🎯 ${opponent.displayName} (${handValue(gameState.opponent.hand)})`,
        value: `${handToString(gameState.opponent.hand)}\n💰 **Payout:** ${opponentPayout.toLocaleString()} ${moneda}`,
        inline: true
      },
      {
        name: '💰 Total Pot',
        value: `${pot.toLocaleString()} ${moneda}`,
        inline: false
      }
    )
    .setFooter({ text: 'Thanks for playing PvP Blackjack!' })
    .setTimestamp();
  
  await interaction.editReply({
    content: `${challenger} ${opponent}`,
    embeds: [finalEmbed],
    components: []
  });
  
  // Log the PvP game
  await logGamblingCommand('blackjack-pvp', challenger, {
    amount: `${gameState.bet} ${moneda}`,
    result: winner === 'challenger' ? 'WIN' : winner === 'tie' ? 'TIE' : 'LOSS',
    additional: `PvP vs ${opponent.displayName} - Payout: ${challengerPayout}`
  });
  
  await logGamblingCommand('blackjack-pvp', opponent, {
    amount: `${gameState.bet} ${moneda}`,
    result: winner === 'opponent' ? 'WIN' : winner === 'tie' ? 'TIE' : 'LOSS',
    additional: `PvP vs ${challenger.displayName} - Payout: ${opponentPayout}`
  });
}