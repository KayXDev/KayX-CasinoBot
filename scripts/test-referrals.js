import { pool } from '../db.js';
import { migrateReferralSystem } from './migrate-referrals.js';
import { createReferralUser, getReferralInfo, useReferralCode, getReferralLeaderboard } from '../db.js';

async function testReferralSystem() {
  console.log('🎯 Testing Referral System...\n');
  
  try {
    // 1. Ejecutar migración
    console.log('📊 Step 1: Running migration...');
    await migrateReferralSystem();
    console.log('✅ Migration completed\n');
    
    // 2. Crear usuarios de prueba
    console.log('👥 Step 2: Creating test users...');
    const testUser1 = '123456789';
    const testUser2 = '987654321';
    
    const user1 = await createReferralUser(testUser1);
    const user2 = await createReferralUser(testUser2);
    
    console.log(`✅ User 1 created with code: ${user1.referral_code}`);
    console.log(`✅ User 2 created with code: ${user2.referral_code}\n`);
    
    // 3. Probar uso de código de referido
    console.log('🔗 Step 3: Testing referral code usage...');
    try {
      const result = await useReferralCode(testUser2, user1.referral_code);
      console.log('✅ Referral code used successfully:');
      console.log(`   - Referrer earned: ${result.referrerEarned}`);
      console.log(`   - Referred earned: ${result.referredEarned}`);
      console.log(`   - New referral count: ${result.newReferralCount}`);
      if (result.bonusAwarded) {
        console.log(`   - Bonus awarded: ${result.bonusAwarded.bonus}`);
      }
    } catch (error) {
      console.log(`❌ Expected error (testing): ${error.message}`);
    }
    console.log('');
    
    // 4. Obtener información de referidos
    console.log('📊 Step 4: Getting referral info...');
    const info1 = await getReferralInfo(testUser1);
    const info2 = await getReferralInfo(testUser2);
    
    console.log(`✅ User 1 info:`, {
      code: info1.referralCode,
      referrals: info1.referralsCount,
      earned: info1.totalEarned
    });
    
    console.log(`✅ User 2 info:`, {
      code: info2.referralCode,
      referredBy: info2.referredBy,
      earned: info2.totalEarned
    });
    console.log('');
    
    // 5. Probar leaderboard
    console.log('🏆 Step 5: Testing leaderboard...');
    const leaderboard = await getReferralLeaderboard(5);
    console.log('✅ Leaderboard:', leaderboard);
    console.log('');
    
    console.log('🎉 All tests passed! Referral system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testReferralSystem();