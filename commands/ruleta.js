
import {  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists, getCurrentMultiplier, hasGuaranteedWin, useGuaranteedWin, getActiveEffects } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('roulette')
  .setDescription('Play roulette with all classic bets.');

export async function execute(interaction, config, client) {
  const userId = interaction.user.id;
  const moneda = config.casino?.moneda || '💰';
  const minBet = config.roulette?.minBet || 10;
  const maxBet = config.roulette?.maxBet || 10000;
  
  await addUserIfNotExists(userId);
  const balances = await getUserBalances(userId);

  // Verificar si tiene suficiente dinero
  if (balances.hand < minBet) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You need at least ${minBet} ${moneda} in hand to play roulette!\n\nYour current hand balance: ${balances.hand} ${moneda}`)
          .setColor(0xe74c3c)
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  // Verificar efectos activos
  const activeEffects = await getActiveEffects(userId);
  const currentMultiplier = await getCurrentMultiplier(userId);
  const hasGuaranteed = await hasGuaranteedWin(userId);
  
  console.log(`User ${userId} starting roulette: multiplier=${currentMultiplier}, effects=${activeEffects.length}, guaranteed=${hasGuaranteed}`);

  // Embed de selección de apuesta
  let description = 'Select your bet type and then enter the amount when prompted.';
  
  if (currentMultiplier > 1) {
    description += `\n\n⚡ **${currentMultiplier}x Multiplier Active** - Your winnings will be boosted!`;
  }
  
  if (hasGuaranteed) {
    description += `\n\n✨ **Lucky Ticket Active** - Your next bet is guaranteed to win!`;
  }
  


  const embed = new EmbedBuilder()
    .setTitle('🎰 Roulette Table')
    .setDescription(description)
    .setColor(currentMultiplier > 1 ? 0xf39c12 : 0x2c3e50)
    .addFields(
      { name: 'Hand Balance', value: `${balances.hand.toLocaleString()} ${moneda}`, inline: true },
      { name: 'Minimum Bet', value: `${minBet.toLocaleString()} ${moneda}`, inline: true },
      { name: 'Maximum Bet', value: `${maxBet.toLocaleString()} ${moneda}`, inline: true }
    );

  // Botones de apuestas
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bet_red').setLabel('Red (2:1)').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('bet_black').setLabel('Black (2:1)').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('bet_odd').setLabel('Odd (2:1)').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('bet_even').setLabel('Even (2:1)').setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bet_1_18').setLabel('1-18 (2:1)').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('bet_19_36').setLabel('19-36 (2:1)').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('bet_green').setLabel('Green 0 (36:1)').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('bet_number').setLabel('Single Number (36:1)').setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ embeds: [embed], components: [row1, row2] });

  // Collector para manejar los botones
  const collector = interaction.channel.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 60000,
    max: 1
  });

  collector.on('collect', async i => {
    try {
      const betType = i.customId.replace('bet_', '');
      
      // Crear modal según el tipo de apuesta
      let modal;
      
      if (betType === 'number') {
        modal = new ModalBuilder()
          .setCustomId('roulette_number_modal')
          .setTitle('Single Number Bet')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('number')
                .setLabel('Number (0-36)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter a number from 0 to 36')
                .setRequired(true)
                .setMaxLength(2)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('bet_amount')
                .setLabel(`Bet Amount (${minBet}-${maxBet} ${moneda})`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`e.g. ${minBet}`)
                .setRequired(true)
            )
          );
      } else {
        const betTypeLabels = {
          red: 'Red Numbers',
          black: 'Black Numbers', 
          odd: 'Odd Numbers',
          even: 'Even Numbers',
          '1_18': 'Low (1-18)',
          '19_36': 'High (19-36)',
          green: 'Green (0)'
        };
        
        modal = new ModalBuilder()
          .setCustomId(`roulette_${betType}_modal`)
          .setTitle(`${betTypeLabels[betType]} Bet`)
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('bet_amount')
                .setLabel(`Bet Amount (${minBet}-${maxBet} ${moneda})`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`e.g. ${minBet}`)
                .setRequired(true)
            )
          );
      }
      
      await i.showModal(modal);
      
      // Manejar la respuesta del modal
      try {
        const modalSubmit = await i.awaitModalSubmit({
          filter: m => m.user.id === userId && m.customId.startsWith('roulette_'),
          time: 60000
        });
        
        await processRouletteBet(modalSubmit, betType, config);
        
      } catch (error) {
        console.error('Modal submission timeout or error:', error);
      }
      
    } catch (error) {
      console.error('Error handling roulette button:', error);
      if (!i.replied && !i.deferred) {
        await i.reply({ 
          content: 'There was an error processing your bet. Please try again.', 
          flags: MessageFlags.Ephemeral 
        });
      }
    }
  });

  collector.on('end', async () => {
    // Deshabilitar botones cuando expire el tiempo
    try {
      const disabledRow1 = ActionRowBuilder.from(row1);
      const disabledRow2 = ActionRowBuilder.from(row2);
      
      disabledRow1.components.forEach(button => button.setDisabled(true));
      disabledRow2.components.forEach(button => button.setDisabled(true));
      
      const timeoutEmbed = new EmbedBuilder()
        .setTitle('🎰 Roulette - Time Expired')
        .setDescription('The roulette session has expired. Use `/roulette` again to play.')
        .setColor(0x95a5a6);
      
      await interaction.editReply({ 
        embeds: [timeoutEmbed], 
        components: [disabledRow1, disabledRow2] 
      });
    } catch (error) {
      // Ignorar errores si el mensaje ya no existe
    }
  });

}

async function processRouletteBet(modalSubmit, betType, config) {
  const userId = modalSubmit.user.id;
  const moneda = config.casino?.moneda || '💰';
  const minBet = config.roulette?.minBet || 10;
  const maxBet = config.roulette?.maxBet || 10000;

  try {
    // Obtener valores del modal
    let betNumber = null;
    let betAmount;
    
    if (betType === 'number') {
      const numberInput = modalSubmit.fields.getTextInputValue('number');
      betNumber = parseInt(numberInput);
      betAmount = parseInt(modalSubmit.fields.getTextInputValue('bet_amount'));
      
      // Validar número
      if (isNaN(betNumber) || betNumber < 0 || betNumber > 36) {
        return modalSubmit.reply({
          content: `❌ Invalid number! Please enter a number between 0 and 36.`,
          flags: MessageFlags.Ephemeral
        });
      }
    } else {
      betAmount = parseInt(modalSubmit.fields.getTextInputValue('bet_amount'));
    }

    // Validar cantidad de apuesta
    if (isNaN(betAmount) || betAmount < minBet || betAmount > maxBet) {
      return modalSubmit.reply({
        content: `❌ Invalid bet amount! Must be between ${minBet} and ${maxBet} ${moneda}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Verificar balance
    const currentBalances = await getUserBalances(userId);
    if (currentBalances.hand < betAmount) {
      return modalSubmit.reply({
        content: `❌ Insufficient funds! You need ${betAmount} ${moneda} but only have ${currentBalances.hand} ${moneda} in hand.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Girar la ruleta
    const result = spinRoulette();
    let win = false;
    let payout = 0;
    let desc = '';

    // Determinar si ganó según el tipo de apuesta
    switch (betType) {
      case 'red':
        win = result.color === 'red';
        payout = win ? betAmount * 2 : 0;
        desc = 'Red';
        break;
      case 'black':
        win = result.color === 'black';
        payout = win ? betAmount * 2 : 0;
        desc = 'Black';
        break;
      case 'odd':
        win = result.number > 0 && result.number % 2 === 1;
        payout = win ? betAmount * 2 : 0;
        desc = 'Odd';
        break;
      case 'even':
        win = result.number > 0 && result.number % 2 === 0;
        payout = win ? betAmount * 2 : 0;
        desc = 'Even';
        break;
      case '1_18':
        win = result.number >= 1 && result.number <= 18;
        payout = win ? betAmount * 2 : 0;
        desc = 'Low (1-18)';
        break;
      case '19_36':
        win = result.number >= 19 && result.number <= 36;
        payout = win ? betAmount * 2 : 0;
        desc = 'High (19-36)';
        break;
      case 'green':
        win = result.number === 0;
        payout = win ? betAmount * 36 : 0;
        desc = 'Green (0)';
        break;
      case 'number':
        win = result.number === betNumber;
        payout = win ? betAmount * 36 : 0;
        desc = `Number ${betNumber}`;
        break;
    }

    // Verificar guaranteed win
    const hasGuaranteed = await hasGuaranteedWin(userId);
    if (hasGuaranteed && !win) {
      win = true;
      // Dar el payout mínimo para que sea una victoria
      switch (betType) {
        case 'red': case 'black': case 'odd': case 'even': case '1_18': case '19_36':
          payout = betAmount * 2;
          break;
        case 'green': case 'number':
          payout = betAmount * 36;
          break;
      }
      await useGuaranteedWin(userId);
    }

    // Aplicar multiplicadores si ganó
    let multiplierApplied = false;
    if (win && payout > betAmount) {
      const multiplier = await getCurrentMultiplier(userId);
      console.log(`Checking multiplier: ${multiplier} for user ${userId}`);
      
      if (multiplier > 1) {
        const originalWinnings = payout - betAmount;
        const multipliedWinnings = Math.floor(originalWinnings * multiplier);
        const oldPayout = payout;
        payout = multipliedWinnings + betAmount;
        multiplierApplied = true;
        console.log(`Roulette multiplier applied: Bet=${betAmount}, Original payout=${oldPayout}, New payout=${payout}, Multiplier=${multiplier}x`);
      } else {
        console.log(`No multiplier to apply (multiplier: ${multiplier})`);
      }
    } else {
      console.log(`Multiplier check skipped: win=${win}, payout=${payout}, betAmount=${betAmount}`);
    }

    // Actualizar balance
    let newBalance = currentBalances.hand;
    if (win) {
      newBalance = newBalance - betAmount + payout;
    } else {
      newBalance = newBalance - betAmount;
    }
    
    await setUserBalances(userId, newBalance, currentBalances.bank);

    // Log roulette result
    await logGamblingCommand(modalSubmit.user, 'roulette', {
      amount: `${betAmount} ${moneda}`,
      result: `${win ? 'WON' : 'LOST'} - Ball: ${result.number} ${result.color === 'red' ? '🔴' : result.color === 'black' ? '⚫' : '🟢'}`,
      additional: `Bet: ${desc} | ${win ? `Payout: +${payout - betAmount}` : `Lost: -${betAmount}`}${hasGuaranteed ? ' | Lucky Ticket used' : ''}`
    });

    // Crear embed de resultado
    const resultEmbed = new EmbedBuilder()
      .setTitle('🎰 Roulette Result')
      .setDescription(`The ball landed on **${result.number}** ${result.color === 'red' ? '🔴' : result.color === 'black' ? '⚫' : '🟢'}`)
      .addFields(
        { name: 'Your Bet', value: `${desc} - ${betAmount.toLocaleString()} ${moneda}`, inline: true },
        { name: 'Result', value: win ? `🎉 YOU WIN! +${(payout - betAmount).toLocaleString()} ${moneda}` : `😢 You lose -${betAmount.toLocaleString()} ${moneda}`, inline: true },
        { name: 'New Balance', value: `${newBalance.toLocaleString()} ${moneda}`, inline: true }
      )
      .setColor(win ? 0x27ae60 : 0xe74c3c)
      .setTimestamp();

    // Agregar información de multiplicadores y efectos especiales
    if (win && multiplierApplied) {
      const multiplier = await getCurrentMultiplier(userId);
      resultEmbed.addFields({
        name: '⚡ Multiplier Bonus',
        value: `Earnings boosted by ${multiplier}x!`,
        inline: true
      });
    }

    if (hasGuaranteed && win) {
      resultEmbed.setFooter({ text: '✨ Lucky Ticket used - Guaranteed Win!' });
    } else if (multiplierApplied) {
      resultEmbed.setFooter({ text: '⚡ Multiplier effect applied to your winnings!' });
    }

    await modalSubmit.reply({ embeds: [resultEmbed] });

  } catch (error) {
    console.error('Error processing roulette bet:', error);
    if (!modalSubmit.replied && !modalSubmit.deferred) {
      await modalSubmit.reply({
        content: '❌ There was an error processing your bet. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

function spinRoulette() {
  const number = Math.floor(Math.random() * 37); // 0-36
  let color = 'green';
  
  if (number > 0) {
    // Números rojos: 1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    color = redNumbers.includes(number) ? 'red' : 'black';
  }
  
  return { number, color };
}
