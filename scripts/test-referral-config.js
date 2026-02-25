#!/usr/bin/env node

/**
 * Script para probar la configuración del sistema de referidos
 * Verifica que todas las configuraciones se carguen correctamente
 */

import fs from 'fs';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '..', 'config.yml');

console.log('🔍 Testing Referral Configuration...\n');

try {
  // Cargar configuración
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  
  console.log('✅ Configuration loaded successfully');
  
  // Verificar sección de referidos
  if (!config.referrals) {
    console.log('❌ ERROR: referrals section not found in config.yml');
    process.exit(1);
  }
  
  console.log('✅ Referrals section found');
  
  // Verificar recompensas
  console.log('\n📊 Basic Rewards:');
  console.log(`   Referrer reward: ${config.referrals.rewards.referrer.toLocaleString()}`);
  console.log(`   Referee reward: ${config.referrals.rewards.referee.toLocaleString()}`);
  
  // Verificar milestones
  const milestones = config.referrals.milestones;
  const milestoneKeys = Object.keys(milestones).map(Number).sort((a, b) => a - b);
  
  console.log('\n🎯 Milestones:');
  milestoneKeys.forEach(milestone => {
    console.log(`   ${milestone} referrals: ${milestones[milestone].toLocaleString()} coins`);
  });
  
  // Verificar títulos
  console.log('\n👑 Titles:');
  const titles = config.referrals.display.titles;
  Object.keys(titles).forEach(key => {
    console.log(`   ${key}: ${titles[key]}`);
  });
  
  // Verificar códigos
  console.log('\n🔧 Code Generation:');
  console.log(`   Length: ${config.referrals.codes.length} characters`);
  console.log(`   Use uppercase: ${config.referrals.codes.uppercase}`);
  console.log(`   Use numbers: ${config.referrals.codes.includeNumbers}`);
  console.log(`   Exclude confusing chars: ${config.referrals.codes.excludeConfusing}`);
  
  // Verificar límites
  console.log('\n🛡️ Limits:');
  console.log(`   Max referrals per day: ${config.referrals.limits.maxReferralsPerDay}`);
  console.log(`   Min account age: ${config.referrals.limits.minAccountAgeHours} hours`);
  console.log(`   Check alt accounts: ${config.referrals.limits.checkAltAccounts}`);
  
  // Estadísticas
  console.log('\n📈 Statistics:');
  console.log(`   Expected total milestones: ${milestoneKeys.length}`);
  console.log(`   Max milestone: ${Math.max(...milestoneKeys)} referrals`);
  console.log(`   Max milestone reward: ${Math.max(...Object.values(milestones)).toLocaleString()} coins`);
  
  const totalRewards = Object.values(milestones).reduce((sum, reward) => sum + reward, 0);
  console.log(`   Total milestone rewards: ${totalRewards.toLocaleString()} coins`);
  
  console.log('\n🎉 All configuration tests passed!');
  console.log('The referral system is ready to use with the new configuration.');
  
} catch (error) {
  console.error('❌ Configuration test failed:', error.message);
  process.exit(1);
}