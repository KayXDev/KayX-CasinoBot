// ═══════════════════════════════════════════════════════════════
// 🏦 LOAN SYSTEM - Sistema Completo de Préstamos y Crédito
// ═══════════════════════════════════════════════════════════════

import { pool } from '../db.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LoanSystem {
  constructor() {
    this.config = null;
    this.loadConfig();
    this.startLoanProcessing();
  }

  // ═══════════════════════════════════════════════════════════════
  // 📁 CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'config.yml');
      const configFile = fs.readFileSync(configPath, 'utf8');
      const fullConfig = yaml.load(configFile);
      this.config = fullConfig.economy?.loans || {};
      console.log('✅ Loan System configurado correctamente');
    } catch (error) {
      console.error('❌ Error cargando configuración de préstamos:', error);
      this.config = { enabled: false };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 SISTEMA DE CREDIT SCORE
  // ═══════════════════════════════════════════════════════════════

  async getUserCreditScore(userId) {
    try {
      const [creditData] = await pool.execute(`
        SELECT * FROM user_credit_scores WHERE user_id = ?
      `, [userId]);

      if (creditData.length === 0) {
        // Crear credit score inicial para usuario nuevo
        await this.initializeUserCreditScore(userId);
        return await this.getUserCreditScore(userId);
      }

      return creditData[0];
    } catch (error) {
      console.error('❌ Error obteniendo credit score:', error);
      return null;
    }
  }

  async initializeUserCreditScore(userId) {
    try {
      // Credit score inicial basado en actividad del usuario
      const [userActivity] = await pool.execute(`
        SELECT 
          hand,
          daily_streak,
          weekly_streak,
          COALESCE(DATEDIFF(NOW(), last_daily), 0) as days_since_daily
        FROM users 
        WHERE user_id = ?
      `, [userId]);

      let initialScore = 300; // Score mínimo

      if (userActivity.length > 0) {
        const activity = userActivity[0];
        
        // Bonus por racha de daily (actividad consistente)
        if (activity.daily_streak > 7) initialScore += 50;
        if (activity.daily_streak > 30) initialScore += 100;
        
        // Bonus por racha de weekly
        if (activity.weekly_streak > 4) initialScore += 75;
        if (activity.weekly_streak > 12) initialScore += 125;
        
        // Bonus por balance
        if (activity.hand > 10000) initialScore += 50;
        if (activity.hand > 100000) initialScore += 100;
        
        // Penalización por inactividad reciente
        if (activity.days_since_daily > 7) initialScore -= 50;
      }

      // Limitar entre 300-850
      initialScore = Math.min(Math.max(initialScore, 300), 850);

      await pool.execute(`
        INSERT INTO user_credit_scores 
        (user_id, credit_score, on_time_payments, late_payments, defaulted_loans) 
        VALUES (?, ?, 0, 0, 0)
      `, [userId, initialScore]);

      console.log(`✅ Credit score inicial de ${initialScore} creado para usuario ${userId}`);
      
    } catch (error) {
      console.error('❌ Error inicializando credit score:', error);
    }
  }

  async updateCreditScore(userId, paymentMade = false, missedPayment = false) {
    try {
      const creditData = await this.getUserCreditScore(userId);
      if (!creditData) return;

      let newScore = creditData.credit_score;

      if (paymentMade) {
        // Mejorar credit score por pago a tiempo
        newScore += Math.floor(Math.random() * 10) + 5; // +5 a +15 puntos
        
        // Incrementar contador de pagos puntuales
        await pool.execute(`
          UPDATE user_credit_scores 
          SET on_time_payments = on_time_payments + 1
          WHERE user_id = ?
        `, [userId]);
      }

      if (missedPayment) {
        // Empeorar credit score por pago perdido
        newScore -= Math.floor(Math.random() * 30) + 20; // -20 a -50 puntos
        
        // Incrementar contador de pagos tardíos
        await pool.execute(`
          UPDATE user_credit_scores 
          SET late_payments = late_payments + 1
          WHERE user_id = ?
        `, [userId]);
      }

      // Limitar score entre 300-850
      newScore = Math.min(Math.max(newScore, 300), 850);

      await pool.execute(`
        UPDATE user_credit_scores 
        SET credit_score = ?, last_updated = NOW()
        WHERE user_id = ?
      `, [newScore, userId]);

      console.log(`📊 Credit score actualizado para usuario ${userId}: ${creditData.credit_score} → ${newScore}`);

    } catch (error) {
      console.error('❌ Error actualizando credit score:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 💰 GESTIÓN DE PRÉSTAMOS
  // ═══════════════════════════════════════════════════════════════

  async getAvailableLoans(userId) {
    try {
      const creditData = await this.getUserCreditScore(userId);
      if (!creditData) return [];

      const loans = [];
      
      for (const [loanType, config] of Object.entries(this.config.types)) {
        if (creditData.credit_score >= config.min_credit_score) {
          // Calcular límite de préstamo basado en credit score
          const maxAmount = this.calculateMaxLoanAmount(creditData, config);
          
          loans.push({
            type: loanType,
            name: this.getLoanDisplayName(loanType),
            description: config.description,
            max_amount: maxAmount,
            interest_rate: config.interest_rate,
            max_term_days: config.max_term_days,
            emoji: this.getLoanEmoji(loanType),
            required_credit_score: config.min_credit_score
          });
        }
      }

      return loans.sort((a, b) => a.interest_rate - b.interest_rate);
      
    } catch (error) {
      console.error('❌ Error obteniendo préstamos disponibles:', error);
      return [];
    }
  }

  async requestLoan(userId, loanType, amount, termDays) {
    try {
      // Verificar si el tipo de préstamo existe
      const loanConfig = this.config.types[loanType];
      if (!loanConfig) {
        throw new Error('Tipo de préstamo no válido');
      }

      // Verificar credit score del usuario
      const creditData = await this.getUserCreditScore(userId);
      if (!creditData || creditData.credit_score < loanConfig.min_credit_score) {
        throw new Error(`Credit score insuficiente. Necesitas ${loanConfig.min_credit_score}, tienes ${creditData?.credit_score || 0}`);
      }

      // Verificar límites del préstamo
      const maxAmount = this.calculateMaxLoanAmount(creditData, loanConfig);
      if (amount > maxAmount) {
        throw new Error(`Monto máximo para este préstamo: ${maxAmount}`);
      }

      if (termDays > loanConfig.max_term_days) {
        throw new Error(`Plazo máximo para este préstamo: ${loanConfig.max_term_days} días`);
      }

      // Verificar préstamos activos
      const [activeLoans] = await pool.execute(`
        SELECT COUNT(*) as count, SUM(remaining_amount) as total_debt
        FROM user_loans 
        WHERE user_id = ? AND status = 'active'
      `, [userId]);

      if (activeLoans[0].count >= (this.config.max_active_loans || 3)) {
        throw new Error('Ya tienes el máximo de préstamos activos permitidos');
      }

      // Verificar ratio de deuda
      const totalDebt = (activeLoans[0].total_debt || 0) + amount;
      const [userBalance] = await pool.execute('SELECT hand FROM users WHERE user_id = ?', [userId]);
      const debtRatio = totalDebt / (userBalance[0].hand + 1); // +1 para evitar división por 0

      if (debtRatio > (this.config.max_debt_ratio || 0.8)) {
        throw new Error('Ratio de deuda demasiado alto');
      }

      // Calcular detalles del préstamo
      const interestRate = this.calculateInterestRate(creditData, loanConfig);
      const totalInterest = (amount * interestRate * termDays) / 365;
      const totalAmount = amount + totalInterest;
      const dailyPayment = totalAmount / termDays;

      // Crear el préstamo
      await pool.query('START TRANSACTION');

      try {
        // Insertar préstamo
        const [result] = await pool.execute(`
          INSERT INTO user_loans 
          (user_id, loan_type, original_amount, remaining_amount, interest_rate, 
           term_days, daily_payment, next_payment_date, total_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), ?)
        `, [
          userId, loanType, amount, totalAmount, interestRate,
          termDays, dailyPayment, totalAmount
        ]);

        // Dar dinero al usuario
        await pool.execute(
          'UPDATE users SET hand = hand + ? WHERE user_id = ?',
          [amount, userId]
        );

        // Actualizar estadísticas de préstamos
        await pool.execute(`
          UPDATE user_credit_scores 
          SET total_loans_taken = total_loans_taken + 1,
              total_borrowed = total_borrowed + ?
          WHERE user_id = ?
        `, [amount, userId]);

        await pool.query('COMMIT');

        console.log(`✅ Préstamo de ${amount} otorgado a usuario ${userId}`);
        return {
          success: true,
          loanId: result.insertId,
          amount,
          totalAmount,
          dailyPayment: Math.round(dailyPayment),
          interestRate: (interestRate * 100).toFixed(2)
        };

      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('❌ Error procesando solicitud de préstamo:', error);
      throw error;
    }
  }

  async makePayment(userId, loanId, amount = null) {
    try {
      // Obtener información del préstamo
      const [loans] = await pool.execute(`
        SELECT * FROM user_loans 
        WHERE id = ? AND user_id = ? AND status = 'active'
      `, [loanId, userId]);

      if (loans.length === 0) {
        throw new Error('Préstamo no encontrado o ya está pagado');
      }

      const loan = loans[0];
      
      // Si no se especifica monto, usar el pago diario
      if (amount === null) {
        amount = loan.daily_payment;
      }

      // Verificar balance del usuario
      const [userBalance] = await pool.execute(
        'SELECT hand FROM users WHERE user_id = ?',
        [userId]
      );

      if (userBalance.length === 0 || userBalance[0].hand < amount) {
        throw new Error('Fondos insuficientes para realizar el pago');
      }

      // Procesar el pago
      await pool.query('START TRANSACTION');

      try {
        // Descontar dinero del usuario
        await pool.execute(
          'UPDATE users SET hand = hand - ? WHERE user_id = ?',
          [amount, userId]
        );

        // Actualizar préstamo
        const newRemaining = Math.max(0, loan.remaining_amount - amount);
        const newStatus = newRemaining === 0 ? 'completed' : 'active';
        
        await pool.execute(`
          UPDATE user_loans 
          SET remaining_amount = ?, 
              next_payment_date = DATE_ADD(NOW(), INTERVAL 1 DAY),
              last_payment_date = NOW(),
              status = ?
          WHERE id = ?
        `, [newRemaining, newStatus, loanId]);

        // Registrar pago
        await pool.execute(`
          INSERT INTO loan_payment_history 
          (loan_id, payment_amount, remaining_balance_after) 
          VALUES (?, ?, ?)
        `, [loanId, amount, newRemaining]);

        // Si el préstamo se completó, actualizar estadísticas
        if (newStatus === 'completed') {
          await pool.execute(`
            UPDATE user_credit_scores 
            SET total_loans_paid = total_loans_paid + 1,
                total_repaid = total_repaid + ?
            WHERE user_id = ?
          `, [loan.original_amount, userId]);
        }

        // Mejorar credit score por pago a tiempo
        await this.updateCreditScore(userId, true, false);

        await pool.query('COMMIT');

        console.log(`💰 Pago de ${amount} realizado para préstamo ${loanId}`);
        return {
          success: true,
          paidAmount: amount,
          remainingBalance: newRemaining,
          loanCompleted: newStatus === 'completed'
        };

      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('❌ Error procesando pago de préstamo:', error);
      throw error;
    }
  }

  async getUserLoans(userId) {
    try {
      const [loans] = await pool.execute(`
        SELECT *, 
               DATEDIFF(next_payment_date, NOW()) as days_until_payment,
               DATEDIFF(NOW(), loan_date) as loan_age_days
        FROM user_loans 
        WHERE user_id = ? AND status = 'active'
        ORDER BY next_payment_date ASC
      `, [userId]);

      return loans.map(loan => ({
        ...loan,
        displayName: this.getLoanDisplayName(loan.loan_type),
        emoji: this.getLoanEmoji(loan.loan_type),
        progress: ((loan.total_amount - loan.remaining_amount) / loan.total_amount * 100).toFixed(1),
        is_overdue: loan.days_until_payment < 0
      }));

    } catch (error) {
      console.error('❌ Error obteniendo préstamos del usuario:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ⚙️ PROCESAMIENTO AUTOMÁTICO
  // ═══════════════════════════════════════════════════════════════

  startLoanProcessing() {
    if (!this.config.enabled) return;

    // Procesar préstamos cada 6 horas
    setInterval(async () => {
      try {
        await this.processOverdueLoans();
        await this.updateCreditScores();
      } catch (error) {
        console.error('❌ Error en procesamiento automático de préstamos:', error);
      }
    }, 21600000); // 6 horas

    console.log('🏦 Sistema automático de procesamiento de préstamos iniciado');
  }

  async processOverdueLoans() {
    try {
      // Obtener préstamos vencidos
      const [overdueLoans] = await pool.execute(`
        SELECT * FROM user_loans 
        WHERE status = 'active' 
        AND next_payment_date < NOW()
        AND DATEDIFF(NOW(), next_payment_date) <= 7
      `);

      for (const loan of overdueLoans) {
        const daysOverdue = Math.floor((Date.now() - new Date(loan.next_payment_date)) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue >= 7) {
          // Marcar como en default después de 7 días
          await pool.execute(`
            UPDATE user_loans SET status = 'defaulted' WHERE id = ?
          `, [loan.id]);

          // Penalizar credit score severamente
          await this.updateCreditScore(loan.user_id, false, true);
          
          console.log(`🚫 Préstamo ${loan.id} marcado como en default`);
        } else {
          // Aplicar recargo por retraso
          const penalty = loan.daily_payment * 0.1; // 10% de recargo
          
          await pool.execute(`
            UPDATE user_loans 
            SET remaining_amount = remaining_amount + ?
            WHERE id = ?
          `, [penalty, loan.id]);

          console.log(`⚠️ Recargo de ${penalty} aplicado a préstamo ${loan.id}`);
        }
      }

    } catch (error) {
      console.error('❌ Error procesando préstamos vencidos:', error);
    }
  }

  async updateCreditScores() {
    try {
      // Actualizar credit scores basado en actividad reciente
      const [users] = await pool.execute(`
        SELECT DISTINCT user_id FROM user_credit_scores 
        WHERE last_updated < DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      for (const user of users) {
        // Mejorar ligeramente el score por tiempo sin incidentes
        await pool.execute(`
          UPDATE user_credit_scores 
          SET credit_score = LEAST(credit_score + 2, 850),
              last_updated = NOW()
          WHERE user_id = ?
        `, [user.user_id]);
      }

    } catch (error) {
      console.error('❌ Error actualizando credit scores automáticamente:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🧮 CÁLCULOS Y UTILIDADES
  // ═══════════════════════════════════════════════════════════════

  calculateMaxLoanAmount(creditData, loanConfig) {
    let maxAmount = loanConfig.max_amount;
    
    // Ajustar basado en credit score
    if (creditData.credit_score >= 750) {
      maxAmount *= 1.5;
    } else if (creditData.credit_score >= 650) {
      maxAmount *= 1.2;
    } else if (creditData.credit_score < 500) {
      maxAmount *= 0.5;
    }
    
    return Math.round(maxAmount);
  }

  calculateInterestRate(creditData, loanConfig) {
    let rate = loanConfig.interest_rate;
    
    // Ajustar tasa basada en credit score
    if (creditData.credit_score >= 750) {
      rate *= 0.8; // 20% descuento
    } else if (creditData.credit_score >= 650) {
      rate *= 0.9; // 10% descuento
    } else if (creditData.credit_score < 500) {
      rate *= 1.5; // 50% incremento
    }
    
    return rate;
  }

  getLoanDisplayName(loanType) {
    const names = {
      personal: 'Préstamo Personal',
      business: 'Préstamo Comercial',
      mortgage: 'Hipoteca',
      emergency: 'Préstamo de Emergencia'
    };
    
    return names[loanType] || loanType;
  }

  getLoanEmoji(loanType) {
    const emojis = {
      personal: '💳',
      business: '🏢',
      mortgage: '🏠',
      emergency: '🚨'
    };
    
    return emojis[loanType] || '💰';
  }

  getCreditScoreRating(score) {
    if (score >= 750) return { rating: 'Excelente', emoji: '🌟', color: '#00ff00' };
    if (score >= 650) return { rating: 'Bueno', emoji: '✅', color: '#90ee90' };
    if (score >= 550) return { rating: 'Regular', emoji: '⚠️', color: '#ffff00' };
    if (score >= 450) return { rating: 'Malo', emoji: '❌', color: '#ff6600' };
    return { rating: 'Muy Malo', emoji: '🚫', color: '#ff0000' };
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 ESTADÍSTICAS DE PRÉSTAMOS
  // ═══════════════════════════════════════════════════════════════

  async getLoanStats(userId) {
    try {
      const [loanStats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_loans,
          SUM(CASE WHEN status = 'active' THEN remaining_amount ELSE 0 END) as current_debt,
          SUM(CASE WHEN status = 'completed' THEN original_amount ELSE 0 END) as total_repaid,
          AVG(CASE WHEN status = 'completed' THEN 
            DATEDIFF(completion_date, loan_date) ELSE NULL END) as avg_repayment_days
        FROM user_loans 
        WHERE user_id = ?
      `, [userId]);

      const [paymentStats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(payment_amount) as total_paid,
          AVG(payment_amount) as avg_payment
        FROM loan_payment_history lph
        JOIN user_loans ul ON lph.loan_id = ul.id
        WHERE ul.user_id = ?
      `, [userId]);

      return {
        ...loanStats[0],
        ...paymentStats[0],
        credit_data: await this.getUserCreditScore(userId)
      };

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de préstamos:', error);
      return null;
    }
  }
}

export default new LoanSystem();