import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { getUserBalance, updateUserBalance } from '../db.js';
import { comprarBoleto, getInfoSorteos, getBoletosByUser, ejecutarSorteo, getSorteoActivo } from '../util/database/loteriaDb.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('loteria')
  .setDescription('🎰 Lottery System 2.0 - Choose your lucky numbers')
  .addSubcommand(subcommand =>
    subcommand
      .setName('comprar')
      .setDescription('Buy lottery ticket choosing your numbers')
      .addStringOption(option =>
        option.setName('tipo')
          .setDescription('Lottery type')
          .setRequired(true)
          .addChoices(
            { name: `${config.loteria?.emojis?.diaria || ''} ${config.loteria?.tipos?.diaria?.nombre || 'Diaria'} (${(config.loteria?.tipos?.diaria?.precio_boleto || 5000).toLocaleString()} ${config.casino?.moneda || ''})`, value: 'diaria' },
            { name: `${config.loteria?.emojis?.semanal || ''} ${config.loteria?.tipos?.semanal?.nombre || 'Semanal'} (${(config.loteria?.tipos?.semanal?.precio_boleto || 15000).toLocaleString()} ${config.casino?.moneda || ''})`, value: 'semanal' },
            { name: `${config.loteria?.emojis?.mensual || ''} ${config.loteria?.tipos?.mensual?.nombre || 'Mensual'} (${(config.loteria?.tipos?.mensual?.precio_boleto || 50000).toLocaleString()} ${config.casino?.moneda || ''})`, value: 'mensual' }
          ))
      .addStringOption(option =>
        option.setName('numeros')
          .setDescription(`${config.loteria?.numeros?.numeros_por_boleto || 6} números del ${config.loteria?.numeros?.min_numero || 1} al ${config.loteria?.numeros?.max_numero || 49} separados por comas (ej: 7,14,21,28,35,42)`)
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('info')
      .setDescription('View information of all active lotteries'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('misboletos')
      .setDescription('View your purchased tickets')
      .addStringOption(option =>
        option.setName('tipo')
          .setDescription('Filter by lottery type')
          .setRequired(false)
          .addChoices(
            { name: `${config.loteria?.emojis?.diaria || ''} ${config.loteria?.tipos?.diaria?.nombre || 'Diaria'}`, value: 'diaria' },
            { name: `${config.loteria?.emojis?.semanal || ''} ${config.loteria?.tipos?.semanal?.nombre || 'Semanal'}`, value: 'semanal' },
            { name: `${config.loteria?.emojis?.mensual || ''} ${config.loteria?.tipos?.mensual?.nombre || 'Mensual'}`, value: 'mensual' }
          )));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const moneda = config.casino?.moneda || '';

  try {
    switch (subcommand) {
      case 'comprar':
        await ejecutarComprar(interaction, moneda);
        break;
      case 'info':
        await mostrarInfo(interaction, moneda);
        break;
      case 'misboletos':
        await mostrarMisBoletos(interaction, moneda);
        break;
    }
  } catch (error) {
    const embed = new EmbedBuilder()
      .setTitle(' Error')
      .setDescription(error.message)
      .setColor(0xe74c3c);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}

async function ejecutarComprar(interaction, moneda) {
  const userId = interaction.user.id;
  const tipoSorteo = interaction.options.getString('tipo');
  const numerosStr = interaction.options.getString('numeros');

  const numerosArray = numerosStr.split(',').map(n => parseInt(n.trim()));
  
  // Usar configuraciones del config.yml
  const numerosRequeridos = config.loteria?.numeros?.numeros_por_boleto || 6;
  const minNumero = config.loteria?.numeros?.min_numero || 1;
  const maxNumero = config.loteria?.numeros?.max_numero || 49;
  
  if (numerosArray.length !== numerosRequeridos) {
    throw new Error(`Debes elegir exactamente ${numerosRequeridos} números`);
  }

  for (const num of numerosArray) {
    if (isNaN(num) || num < minNumero || num > maxNumero) {
      throw new Error(`Todos los números deben estar entre ${minNumero} y ${maxNumero}`);
    }
  }

  // Obtener precios desde configuración
  const precio = config.loteria?.tipos?.[tipoSorteo]?.precio_boleto || 5000;
  
  const balance = await getUserBalance(userId);
  if (balance.hand < precio) {
    throw new Error(`No tienes suficiente dinero. Necesitas ${precio.toLocaleString()} ${moneda} pero solo tienes ${balance.hand.toLocaleString()} ${moneda}`);
  }

  const resultado = await comprarBoleto(userId, tipoSorteo, numerosArray, precio);
  await updateUserBalance(userId, -precio, 0);

  // Log lottery ticket purchase
  await logGamblingCommand(interaction.user, 'loteria', {
    amount: `${precio} ${moneda}`,
    result: `TICKET BOUGHT - ${tipoSorteo}`,
    additional: `Numbers: ${numerosArray.join(', ')}`
  });

  // Usar emojis y textos configurables
  const emoji = config.loteria?.emojis?.[tipoSorteo] || '';
  const nombreTipo = config.loteria?.tipos?.[tipoSorteo]?.nombre || tipoSorteo;
  const tituloCompra = config.loteria?.mensajes?.titulo_compra || 'Boleto Comprado';
  const descripcionCompra = config.loteria?.mensajes?.descripcion_compra || '¡Tu boleto ha sido registrado exitosamente!';
  
  // Crear textos de premios configurables
  const premiosTexto = [
    ` **${config.loteria?.nombres_premios?.[6] || '6 aciertos'}:** ${Math.round((config.loteria?.premios?.seis_aciertos || 0.70) * 100)}% del pozo`,
    ` **${config.loteria?.nombres_premios?.[5] || '5 aciertos'}:** ${Math.round((config.loteria?.premios?.cinco_aciertos || 0.20) * 100)}% del pozo`,
    ` **${config.loteria?.nombres_premios?.[4] || '4 aciertos'}:** ${Math.round((config.loteria?.premios?.cuatro_aciertos || 0.10) * 100)}% del pozo`
  ].join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${tituloCompra} - Lotería ${nombreTipo}`)
    .setDescription(`**${descripcionCompra}**\n\n${config.loteria?.emojis?.boleto || ''} **Tus números:** ${numerosArray.join(' - ')}\n${config.loteria?.emojis?.premio || ''} **Precio pagado:** ${precio.toLocaleString()} ${moneda}`)
    .setColor(0x2ecc71)
    .addFields(
      {
        name: `${config.loteria?.emojis?.fecha || ''} Información del Sorteo`,
        value: `${config.loteria?.emojis?.fecha || ''} **Fecha:** <t:${Math.floor(new Date(resultado.fechaSorteo).getTime() / 1000)}:F>\n${config.loteria?.emojis?.pozo || ''} **Pozo actual:** ${resultado.pozoTotal.toLocaleString()} ${moneda}`,
        inline: true
      },
      {
        name: `${config.loteria?.emojis?.numeros || ''} Premios Disponibles`,
        value: premiosTexto,
        inline: true
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function mostrarInfo(interaction, moneda) {
  const sorteos = await getInfoSorteos();
  
  const tituloSorteos = config.loteria?.mensajes?.titulo_sorteos || 'Lotería 2.0 - Sorteos Activos';
  const descripcionSorteos = config.loteria?.mensajes?.descripcion_sorteos || '¡Elige tus números de la suerte y participa!';
  
  const embed = new EmbedBuilder()
    .setTitle(`${config.loteria?.emojis?.boleto || ''} ${tituloSorteos}`)
    .setDescription(`**${descripcionSorteos}**`)
    .setColor(0x3498db);

  for (const sorteo of sorteos) {
    const fechaSorteo = new Date(sorteo.fecha_sorteo);
    const timeUntil = Math.floor(fechaSorteo.getTime() / 1000);
    const emoji = config.loteria?.emojis?.[sorteo.tipo] || '';
    const nombreTipo = config.loteria?.tipos?.[sorteo.tipo]?.nombre || sorteo.tipo;

    embed.addFields({
      name: `${emoji} Lotería ${nombreTipo}`,
      value: `${config.loteria?.emojis?.pozo || ''} **Pozo:** ${sorteo.pozo_total.toLocaleString()} ${moneda}\n${config.loteria?.emojis?.boleto || ''} **Boletos vendidos:** ${sorteo.total_boletos}\n **Sorteo:** <t:${timeUntil}:R>`,
      inline: true
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function mostrarMisBoletos(interaction, moneda) {
  const userId = interaction.user.id;
  const tipoFiltro = interaction.options?.getString('tipo');
  const boletos = await getBoletosByUser(userId, tipoFiltro);
  
  const tituloMisBoletos = config.loteria?.mensajes?.titulo_mis_boletos || 'Mis Boletos de Lotería';
  const sinBoletos = config.loteria?.mensajes?.sin_boletos || 'No tienes boletos comprados aún.';
  const usoComprar = config.loteria?.mensajes?.uso_comprar || 'Usa `/loteria comprar` para participar en los sorteos.';
  
  if (boletos.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle(`${config.loteria?.emojis?.boleto || ''} Mis Boletos`)
      .setDescription(`${sinBoletos}\n\n${usoComprar}`)
      .setColor(0x95a5a6);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${config.loteria?.emojis?.boleto || ''} ${tituloMisBoletos}`)
    .setDescription(`**${boletos.length} boleto${boletos.length !== 1 ? 's' : ''} encontrado${boletos.length !== 1 ? 's' : ''}**${tipoFiltro ? ` (${tipoFiltro})` : ''}`)
    .setColor(0x3498db);

  const maxMostrar = config.loteria?.limites?.max_boletos_mostrar || 10;
  for (let i = 0; i < Math.min(boletos.length, maxMostrar); i++) {
    const boleto = boletos[i];
    const numeros = JSON.parse(boleto.numeros);
    const emoji = config.loteria?.emojis?.[boleto.tipo] || '';
    const nombreTipo = config.loteria?.tipos?.[boleto.tipo]?.nombre || boleto.tipo;
    
    embed.addFields({
      name: `${emoji} ${nombreTipo}`,
      value: `${config.loteria?.emojis?.numeros || ''} **Números:** ${numeros.join(' - ')}\n${config.loteria?.emojis?.premio || ''} **Pagado:** ${boleto.precio_pagado.toLocaleString()} ${moneda}`,
      inline: true
    });
  }

  if (boletos.length > maxMostrar) {
    embed.setFooter({ text: `Mostrando los últimos ${maxMostrar} de ${boletos.length} boletos` });
  }

  await interaction.reply({ embeds: [embed] });
}

// Función para verificar si el usuario es administrador
// Funciones de admin movidas a comandos separados: admin-loteria-terminar.js y admin-loteria-pozo.js
