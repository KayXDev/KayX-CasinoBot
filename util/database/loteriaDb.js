// loteriaDb.js - Sistema de Lotería 2.0 con múltiples tipos y números elegidos
import { pool } from '../../db.js';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

// Crear tablas de la nueva lotería
export async function ensureLoteriaV2Tables() {
  // Tabla de sorteos
  await pool.query(`CREATE TABLE IF NOT EXISTS loteria_sorteos (
    id_sorteo INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('diaria', 'semanal', 'mensual') NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_sorteo DATETIME NOT NULL,
    estado ENUM('abierto', 'cerrado', 'finalizado') DEFAULT 'abierto',
    pozo_total BIGINT DEFAULT 0,
    numeros_ganadores JSON,
    fecha_cierre DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de boletos
  await pool.query(`CREATE TABLE IF NOT EXISTS loteria_boletos (
    id_boleto INT AUTO_INCREMENT PRIMARY KEY,
    id_sorteo INT NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    numeros JSON NOT NULL,
    precio_pagado BIGINT NOT NULL,
    aciertos INT DEFAULT 0,
    premio_ganado BIGINT DEFAULT 0,
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sorteo) REFERENCES loteria_sorteos(id_sorteo),
    INDEX idx_user_sorteo (user_id, id_sorteo)
  )`);
}

// Obtener sorteo activo por tipo
export async function getSorteoActivo(tipo) {
  const [rows] = await pool.query(
    "SELECT * FROM loteria_sorteos WHERE tipo = ? AND estado = 'abierto' ORDER BY id_sorteo DESC LIMIT 1",
    [tipo]
  );
  return rows[0] || null;
}

// Crear nuevo sorteo
export async function crearSorteo(tipo) {
  const ahora = new Date();
  let fechaSorteo = new Date(ahora);
  
  // Obtener configuración del tipo de lotería
  const tipoConfig = config.loteria?.tipos?.[tipo];
  if (!tipoConfig || !tipoConfig.enabled) {
    throw new Error(`Lotería tipo '${tipo}' no está habilitada o configurada`);
  }
  
  // Definir cuándo será el próximo sorteo basado en configuración
  switch(tipo) {
    case 'diaria':
      // Próximo sorteo: mañana a la hora configurada
      fechaSorteo.setDate(fechaSorteo.getDate() + 1);
      fechaSorteo.setHours(tipoConfig.hora_sorteo || 20, 0, 0, 0);
      break;
      
    case 'semanal':
      // Próximo domingo a la hora configurada
      const diaSorteo = tipoConfig.dia_sorteo || 0; // 0 = domingo por defecto
      const diasHastaSorteo = (7 - fechaSorteo.getDay() + diaSorteo) % 7;
      fechaSorteo.setDate(fechaSorteo.getDate() + (diasHastaSorteo === 0 ? 7 : diasHastaSorteo));
      fechaSorteo.setHours(tipoConfig.hora_sorteo || 21, 0, 0, 0);
      break;
      
    case 'mensual':
      // Día del mes configurado del próximo mes a la hora configurada
      const diaMes = tipoConfig.dia_mes || 1;
      fechaSorteo.setMonth(fechaSorteo.getMonth() + 1, diaMes);
      fechaSorteo.setHours(tipoConfig.hora_sorteo || 22, 0, 0, 0);
      break;
  }

  const [result] = await pool.query(
    'INSERT INTO loteria_sorteos (tipo, fecha_inicio, fecha_sorteo, pozo_total) VALUES (?, ?, ?, ?)',
    [tipo, ahora, fechaSorteo, 0]
  );

  return result.insertId;
}

// Comprar boleto
export async function comprarBoleto(userId, tipoSorteo, numeros, precio) {
  // Obtener configuraciones
  const numerosRequeridos = config.loteria?.numeros?.numeros_por_boleto || 6;
  const minNumero = config.loteria?.numeros?.min_numero || 1;
  const maxNumero = config.loteria?.numeros?.max_numero || 49;

  // Validar números
  if (!Array.isArray(numeros) || numeros.length !== numerosRequeridos) {
    throw new Error(`Debes elegir exactamente ${numerosRequeridos} números`);
  }

  // Validar rango de números
  for (const num of numeros) {
    if (num < minNumero || num > maxNumero) {
      throw new Error(`Los números deben estar entre ${minNumero} y ${maxNumero}`);
    }
  }

  // Validar números únicos
  if (new Set(numeros).size !== numeros.length) {
    throw new Error('No puedes repetir números en el mismo boleto');
  }

  // Obtener sorteo activo
  let sorteo = await getSorteoActivo(tipoSorteo);
  if (!sorteo) {
    // Crear nuevo sorteo si no existe
    const idSorteo = await crearSorteo(tipoSorteo);
    sorteo = await getSorteoActivo(tipoSorteo);
  }

  // Verificar límite de boletos por usuario por sorteo
  const maxBoletos = config?.loteria?.max_boletos_por_sorteo || 5;
  const [countRows] = await pool.query(
    'SELECT COUNT(*) as total FROM loteria_boletos WHERE id_sorteo = ? AND user_id = ?',
    [sorteo.id_sorteo, userId]
  );

  if (countRows[0].total >= maxBoletos) {
    throw new Error(`Ya tienes el máximo de ${maxBoletos} boletos para este sorteo`);
  }

  // Verificar que no tenga los mismos números
  const [existingRows] = await pool.query(
    'SELECT numeros FROM loteria_boletos WHERE id_sorteo = ? AND user_id = ?',
    [sorteo.id_sorteo, userId]
  );

  const numerosStr = JSON.stringify(numeros.sort((a, b) => a - b));
  for (const row of existingRows) {
    try {
      const existingNumeros = JSON.stringify(JSON.parse(row.numeros).sort((a, b) => a - b));
      if (existingNumeros === numerosStr) {
        throw new Error('Ya tienes un boleto con estos mismos números');
      }
    } catch (parseError) {
      console.warn(`⚠️ Boleto con datos JSON corruptos encontrado, saltando verificación: ${row.numeros}`);
      // Continuar con el siguiente boleto si hay datos corruptos
      continue;
    }
  }

  // Crear boleto
  await pool.query(
    'INSERT INTO loteria_boletos (id_sorteo, user_id, numeros, precio_pagado) VALUES (?, ?, ?, ?)',
    [sorteo.id_sorteo, userId, JSON.stringify(numeros), precio]
  );

  // Actualizar pozo
  await pool.query(
    'UPDATE loteria_sorteos SET pozo_total = pozo_total + ? WHERE id_sorteo = ?',
    [precio, sorteo.id_sorteo]
  );

  return {
    sorteoId: sorteo.id_sorteo,
    tipoSorteo: sorteo.tipo,
    fechaSorteo: sorteo.fecha_sorteo,
    pozoTotal: sorteo.pozo_total + precio
  };
}

// Obtener información de todos los sorteos activos
export async function getInfoSorteos() {
  const [rows] = await pool.query(`
    SELECT 
      tipo,
      pozo_total,
      fecha_sorteo,
      (SELECT COUNT(*) FROM loteria_boletos WHERE id_sorteo = loteria_sorteos.id_sorteo) as total_boletos
    FROM loteria_sorteos 
    WHERE estado = 'abierto'
    ORDER BY 
      CASE tipo 
        WHEN 'diaria' THEN 1 
        WHEN 'semanal' THEN 2 
        WHEN 'mensual' THEN 3 
      END
  `);
  return rows;
}

// Obtener boletos de un usuario
export async function getBoletosByUser(userId, tipoSorteo = null) {
  let query = `
    SELECT 
      lb.numeros,
      lb.precio_pagado,
      lb.fecha_compra,
      ls.tipo,
      ls.fecha_sorteo,
      ls.estado,
      lb.aciertos,
      lb.premio_ganado
    FROM loteria_boletos lb
    JOIN loteria_sorteos ls ON lb.id_sorteo = ls.id_sorteo
    WHERE lb.user_id = ?
  `;
  
  const params = [userId];
  
  if (tipoSorteo) {
    query += ' AND ls.tipo = ?';
    params.push(tipoSorteo);
  }
  
  query += ' ORDER BY lb.fecha_compra DESC LIMIT 20';
  
  const [rows] = await pool.query(query, params);
  return rows;
}

// Ejecutar sorteo
export async function ejecutarSorteo(tipoSorteo) {
  const sorteo = await getSorteoActivo(tipoSorteo);
  if (!sorteo) {
    throw new Error(`No hay sorteo activo para ${tipoSorteo}`);
  }

  // Verificar si hay boletos vendidos
  const [boletosCount] = await pool.query(
    'SELECT COUNT(*) as total FROM loteria_boletos WHERE id_sorteo = ?',
    [sorteo.id_sorteo]
  );

  if (boletosCount[0].total === 0) {
    throw new Error('No se puede realizar el sorteo: no hay boletos vendidos');
  }

  // Generar números ganadores usando configuración
  const cantidadGanadores = config.loteria?.numeros?.numeros_ganadores || 6;
  const minNumero = config.loteria?.numeros?.min_numero || 1;
  const maxNumero = config.loteria?.numeros?.max_numero || 49;
  
  const numerosGanadores = [];
  while (numerosGanadores.length < cantidadGanadores) {
    const num = Math.floor(Math.random() * (maxNumero - minNumero + 1)) + minNumero;
    if (!numerosGanadores.includes(num)) {
      numerosGanadores.push(num);
    }
  }
  numerosGanadores.sort((a, b) => a - b);

  // Cerrar sorteo
  await pool.query(
    'UPDATE loteria_sorteos SET estado = "cerrado", numeros_ganadores = ?, fecha_cierre = NOW() WHERE id_sorteo = ?',
    [JSON.stringify(numerosGanadores), sorteo.id_sorteo]
  );

  // Calcular aciertos y premios
  const [boletos] = await pool.query(
    'SELECT id_boleto, user_id, numeros FROM loteria_boletos WHERE id_sorteo = ?',
    [sorteo.id_sorteo]
  );

  const resultados = {
    6: [], // 6 aciertos - jackpot
    5: [], // 5 aciertos - segundo premio
    4: []  // 4 aciertos - tercer premio
  };

  // Calcular aciertos para cada boleto
  for (const boleto of boletos) {
    try {
      const numerosUsuario = JSON.parse(boleto.numeros);
      
      // Verificar que sea un array válido
      if (!Array.isArray(numerosUsuario) || numerosUsuario.length === 0) {
        console.warn(`⚠️ Boleto ${boleto.id_boleto} tiene datos inválidos, saltando...`);
        continue;
      }
      
      const aciertos = numerosUsuario.filter(num => numerosGanadores.includes(num)).length;
      
      await pool.query(
        'UPDATE loteria_boletos SET aciertos = ? WHERE id_boleto = ?',
        [aciertos, boleto.id_boleto]
      );

      if (aciertos >= 4) {
        resultados[aciertos].push({
          userId: boleto.user_id,
          idBoleto: boleto.id_boleto,
          numeros: numerosUsuario,
          aciertos
        });
      }
    } catch (parseError) {
      console.error(`❌ Error procesando boleto ${boleto.id_boleto}: ${parseError.message}`);
      console.warn(`⚠️ Saltando boleto con datos corruptos: ${boleto.numeros}`);
      
      // Opcional: marcar el boleto como corrupto para revisión posterior
      try {
        await pool.query(
          'UPDATE loteria_boletos SET aciertos = -1 WHERE id_boleto = ?',
          [boleto.id_boleto]
        );
      } catch (updateError) {
        console.error(`❌ Error marcando boleto corrupto ${boleto.id_boleto}:`, updateError.message);
      }
    }
  }

  // Distribuir premios
  const pozoTotal = sorteo.pozo_total;
  let premiosDistribuidos = 0;

  // Obtener configuración de premios
  const premiosConfig = config.loteria?.premios || {
    seis_aciertos: 0.70,
    cinco_aciertos: 0.20,
    cuatro_aciertos: 0.10
  };

  // 6 aciertos - 70% del pozo por defecto
  if (resultados[6].length > 0) {
    const premioUnitario = Math.floor((pozoTotal * premiosConfig.seis_aciertos) / resultados[6].length);
    for (const ganador of resultados[6]) {
      await pool.query(
        'UPDATE loteria_boletos SET premio_ganado = ? WHERE id_boleto = ?',
        [premioUnitario, ganador.idBoleto]
      );
      
      // Dar dinero al ganador
      const { updateUserBalance } = await import('./db.js');
      await updateUserBalance(ganador.userId, premioUnitario, 0);
      
      premiosDistribuidos += premioUnitario;
    }
  }

  // 5 aciertos - 20% del pozo por defecto
  if (resultados[5].length > 0) {
    const premioUnitario = Math.floor((pozoTotal * premiosConfig.cinco_aciertos) / resultados[5].length);
    for (const ganador of resultados[5]) {
      await pool.query(
        'UPDATE loteria_boletos SET premio_ganado = ? WHERE id_boleto = ?',
        [premioUnitario, ganador.idBoleto]
      );
      
      // Dar dinero al ganador
      const { updateUserBalance } = await import('./db.js');
      await updateUserBalance(ganador.userId, premioUnitario, 0);
      
      premiosDistribuidos += premioUnitario;
    }
  }

  // 4 aciertos - 10% del pozo por defecto
  if (resultados[4].length > 0) {
    const premioUnitario = Math.floor((pozoTotal * premiosConfig.cuatro_aciertos) / resultados[4].length);
    for (const ganador of resultados[4]) {
      await pool.query(
        'UPDATE loteria_boletos SET premio_ganado = ? WHERE id_boleto = ?',
        [premioUnitario, ganador.idBoleto]
      );
      
      // Dar dinero al ganador
      const { updateUserBalance } = await import('./db.js');
      await updateUserBalance(ganador.userId, premioUnitario, 0);
      
      premiosDistribuidos += premioUnitario;
    }
  }

  // Finalizar sorteo
  await pool.query(
    'UPDATE loteria_sorteos SET estado = "finalizado" WHERE id_sorteo = ?',
    [sorteo.id_sorteo]
  );

  // Crear nuevo sorteo para reemplazar el terminado
  await crearSorteo(tipoSorteo);

  return {
    sorteoId: sorteo.id_sorteo,
    numerosGanadores,
    pozoTotal,
    premiosDistribuidos,
    ganadores: resultados,
    totalBoletos: boletos.length
  };
}

// Verificar y ejecutar sorteos expirados automáticamente
export async function verificarSorteosExpirados() {
  try {
    const ahora = new Date();
    
    // Buscar sorteos que deberían haber terminado
    const [sorteosExpirados] = await pool.query(`
      SELECT * FROM loteria_sorteos 
      WHERE estado = 'abierto' AND fecha_sorteo <= ?
    `, [ahora]);

    for (const sorteo of sorteosExpirados) {
      console.log(`🎲 Ejecutando sorteo automático: ${sorteo.tipo} (ID: ${sorteo.id_sorteo})`);
      
      try {
        // Verificar si hay boletos vendidos antes de ejecutar
        const [boletosCount] = await pool.query(
          'SELECT COUNT(*) as total FROM loteria_boletos WHERE id_sorteo = ?',
          [sorteo.id_sorteo]
        );

        if (boletosCount[0].total > 0) {
          // Verificar la integridad de los datos antes de ejecutar
          const [boletosCorruptos] = await pool.query(
            'SELECT COUNT(*) as total FROM loteria_boletos WHERE id_sorteo = ? AND (numeros IS NULL OR numeros = "" OR JSON_VALID(numeros) = 0)',
            [sorteo.id_sorteo]
          );
          
          if (boletosCorruptos[0].total > 0) {
            console.warn(`⚠️ Se encontraron ${boletosCorruptos[0].total} boletos con datos corruptos en sorteo ${sorteo.id_sorteo}`);
            // Eliminar boletos corruptos antes del sorteo
            await pool.query(
              'DELETE FROM loteria_boletos WHERE id_sorteo = ? AND (numeros IS NULL OR numeros = "" OR JSON_VALID(numeros) = 0)',
              [sorteo.id_sorteo]
            );
            console.log(`🧹 Boletos corruptos eliminados del sorteo ${sorteo.id_sorteo}`);
          }
          
          const resultado = await ejecutarSorteo(sorteo.tipo);
          console.log(`✅ Sorteo ${sorteo.tipo} ejecutado automáticamente. Pozo: ${resultado.pozoTotal}`);
        } else {
          // Si no hay boletos, simplemente crear nuevo sorteo y cerrar el actual
          await pool.query(
            'UPDATE loteria_sorteos SET estado = "finalizado" WHERE id_sorteo = ?',
            [sorteo.id_sorteo]
          );
          await crearSorteo(sorteo.tipo);
          console.log(`🔄 Sorteo ${sorteo.tipo} sin boletos - creando nuevo sorteo`);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando sorteo automático ${sorteo.tipo}:`, error.message);
        console.error('Stack trace:', error.stack);
        
        // Intentar marcar el sorteo como problemático en lugar de dejarlo colgado
        try {
          await pool.query(
            'UPDATE loteria_sorteos SET estado = "error", fecha_sorteo = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id_sorteo = ?',
            [sorteo.id_sorteo]
          );
          console.log(`🔧 Sorteo ${sorteo.id_sorteo} marcado como error y pospuesto 1 hora`);
        } catch (updateError) {
          console.error(`❌ Error marcando sorteo como problemático:`, updateError.message);
        }
      }
    }
    
    return sorteosExpirados.length;
  } catch (error) {
    console.error('❌ Error verificando sorteos expirados:', error.message);
    return 0;
  }
}

// Función para limpiar boletos con datos JSON corruptos
export async function limpiarBoletosCorruptos() {
  try {
    console.log('🧹 Iniciando limpieza de boletos corruptos...');
    
    // Encontrar boletos con JSON inválido
    const [boletosCorruptos] = await pool.query(`
      SELECT id_boleto, numeros, user_id, id_sorteo 
      FROM loteria_boletos 
      WHERE numeros IS NULL OR numeros = "" OR JSON_VALID(numeros) = 0
    `);
    
    if (boletosCorruptos.length === 0) {
      console.log('✅ No se encontraron boletos corruptos');
      return { eliminados: 0, arreglados: 0 };
    }
    
    console.log(`🔍 Encontrados ${boletosCorruptos.length} boletos con datos corruptos`);
    
    let eliminados = 0;
    let arreglados = 0;
    
    for (const boleto of boletosCorruptos) {
      console.log(`📝 Procesando boleto ${boleto.id_boleto}: "${boleto.numeros}"`);
      
      // Intentar extraer números válidos del string corrupto
      let numerosArreglados = null;
      if (typeof boleto.numeros === 'string' && boleto.numeros.length > 0) {
        const match = boleto.numeros.match(/\d+/g);
        if (match && match.length >= 3) { // Mínimo 3 números para ser válido
          numerosArreglados = match.map(n => parseInt(n)).slice(0, 6);
          console.log(`🔧 Números extraídos: [${numerosArreglados.join(', ')}]`);
        }
      }
      
      if (numerosArreglados && numerosArreglados.length >= 3) {
        // Intentar arreglar el boleto
        try {
          await pool.query(
            'UPDATE loteria_boletos SET numeros = ? WHERE id_boleto = ?',
            [JSON.stringify(numerosArreglados), boleto.id_boleto]
          );
          console.log(`✅ Boleto ${boleto.id_boleto} arreglado`);
          arreglados++;
        } catch (updateError) {
          console.error(`❌ Error arreglando boleto ${boleto.id_boleto}:`, updateError.message);
          // Si no se puede arreglar, eliminar
          await pool.query('DELETE FROM loteria_boletos WHERE id_boleto = ?', [boleto.id_boleto]);
          eliminados++;
        }
      } else {
        // Eliminar boleto irrecuperable
        try {
          await pool.query('DELETE FROM loteria_boletos WHERE id_boleto = ?', [boleto.id_boleto]);
          console.log(`🗑️ Boleto ${boleto.id_boleto} eliminado (irrecuperable)`);
          eliminados++;
        } catch (deleteError) {
          console.error(`❌ Error eliminando boleto ${boleto.id_boleto}:`, deleteError.message);
        }
      }
    }
    
    console.log(`\n📊 Limpieza completada:`);
    console.log(`🔧 Boletos arreglados: ${arreglados}`);
    console.log(`🗑️ Boletos eliminados: ${eliminados}`);
    
    return { eliminados, arreglados };
    
  } catch (error) {
    console.error('❌ Error durante la limpieza de boletos:', error);
    throw error;
  }
}

export { ensureLoteriaV2Tables as ensureLoteriaTables };
