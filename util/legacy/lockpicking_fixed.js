// Minijuego de lockpicking corregido - solo la función
async function playLockpickingGame(interaction, difficulty) {
  const pins = [];
  
  // Generar secuencia de pines a descifrar
  for (let i = 0; i < difficulty; i++) {
    pins.push(Math.floor(Math.random() * 5));
  }

  // Mostrar cerradura
  const lockEmbed = new EmbedBuilder()
    .setTitle('🔓 Forzando Cerradura')
    .setDescription(`**Analiza el mecanismo de la cerradura...**\n\n🔍 La cerradura tiene **${difficulty}** pines que debes descifrar\n⏰ Tiempo límite: 45 segundos\n\n*Presiona el botón correcto para cada pin*`)
    .setColor(0x8b4513);

  // Crear botones para los pines - usando solo texto
  const pinRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('pin_0')
        .setLabel('PIN 1')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('pin_1')
        .setLabel('PIN 2')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('pin_2')
        .setLabel('PIN 3')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('pin_3')
        .setLabel('PIN 4')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('pin_4')
        .setLabel('PIN 5')
        .setStyle(ButtonStyle.Secondary)
    );

  const lockMessage = await interaction.followUp({ embeds: [lockEmbed], components: [pinRow] });

  let currentPin = 0;
  const startTime = Date.now();

  try {
    const collector = lockMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 45000,
      filter: inter => inter.user.id === interaction.user.id && inter.customId.startsWith('pin_')
    });

    return new Promise((resolve) => {
      collector.on('collect', async (buttonInteraction) => {
        const selectedPin = parseInt(buttonInteraction.customId.split('_')[1]);
        
        if (selectedPin === pins[currentPin]) {
          currentPin++;
          
          if (currentPin >= difficulty) {
            // ¡Cerradura abierta!
            const timeBonus = Math.max(0, 1 - ((Date.now() - startTime) / 45000));
            await buttonInteraction.update({
              embeds: [new EmbedBuilder()
                .setTitle('✅ ¡Cerradura Forzada!')
                .setDescription('Has logrado abrir la cerradura con éxito. El camino está despejado.')
                .setColor(0x27ae60)],
              components: []
            });
            collector.stop('success');
            resolve({ success: true, bonus: 1 + timeBonus });
          } else {
            // Pin correcto, continuar
            await buttonInteraction.update({
              embeds: [lockEmbed.setDescription(`**Pin ${currentPin}/${difficulty} descifrado correctamente**\n\n🔓 Progreso: ${'█'.repeat(currentPin)}${'░'.repeat(difficulty - currentPin)}\n⏰ Tiempo restante: ${Math.max(0, Math.round((45000 - (Date.now() - startTime)) / 1000))}s\n\n*Continúa con el siguiente pin...*`)],
              components: [pinRow]
            });
          }
        } else {
          // Pin incorrecto
          await buttonInteraction.update({
            embeds: [new EmbedBuilder()
              .setTitle('❌ ¡Cerradura Bloqueada!')
              .setDescription('Has roto la ganzúa. La cerradura se ha bloqueado.')
              .setColor(0xe74c3c)],
            components: []
          });
          collector.stop('failed');
          resolve({ success: false, bonus: 0 });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          resolve({ success: false, bonus: 0 });
        }
      });
    });

  } catch (error) {
    return { success: false, bonus: 0 };
  }
}