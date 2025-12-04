#!/usr/bin/env node

/**
 * YKS Hub - Firebase Deployment Script
 * =====================================
 * 
 * Bu script, uygulamayı Firebase Hosting'e deploy eder
 * 
 * Kullanım:
 *   npm run deploy
 * 
 * Ön Koşullar:
 *   1. Firebase CLI kurulmuş olmalı: npm install -g firebase-tools
 *   2. Google hesapla login yapılmış: firebase login
 *   3. Project seçilmiş: firebase use ykshub-8c76f
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    log(`\n▶️  ${command}`, 'cyan');
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function checkPrerequisites() {
  log('\n🔍 Ön Koşulları Kontrol Ediyor...', 'blue');
  
  // Check Node.js
  try {
    const nodeVersion = await runCommand('node --version');
    log(`✅ Node.js: ${nodeVersion.trim()}`, 'green');
  } catch (e) {
    log('❌ Node.js bulunamadı', 'red');
    process.exit(1);
  }
  
  // Check Firebase CLI
  try {
    const firebaseVersion = await runCommand('firebase --version');
    log(`✅ Firebase CLI: ${firebaseVersion.trim()}`, 'green');
  } catch (e) {
    log('❌ Firebase CLI bulunamadı', 'red');
    log('   Kurulum: npm install -g firebase-tools', 'yellow');
    process.exit(1);
  }
  
  // Check .env.local
  if (!fs.existsSync('.env.local')) {
    log('⚠️  .env.local dosyası bulunamadı!', 'yellow');
    log('   API keys ekleyin: VITE_GOOGLE_AI_API_KEY=...', 'yellow');
  } else {
    log('✅ .env.local dosyası mevcut', 'green');
  }
  
  // Check dist folder
  if (!fs.existsSync('dist')) {
    log('⚠️  dist/ klasörü bulunamadı', 'yellow');
    log('   Önce build yapmalısın: npm run build', 'yellow');
  } else {
    log('✅ dist/ klasörü mevcut', 'green');
  }
}

async function buildProject() {
  log('\n📦 Projeyi Derliyor...', 'blue');
  
  if (!fs.existsSync('dist')) {
    try {
      await runCommand('npm run build');
      log('✅ Build başarılı!', 'green');
    } catch (e) {
      log('❌ Build başarısız!', 'red');
      log(e.message, 'red');
      process.exit(1);
    }
  } else {
    log('✅ dist/ zaten mevcut', 'green');
  }
}

async function deployToFirebase() {
  log('\n🚀 Firebase Hosting\'e Deploy Ediliyor...', 'blue');
  
  try {
    const result = await runCommand('firebase deploy --only hosting');
    log(result);
    log('✅ Deploy başarılı!', 'green');
  } catch (e) {
    log('❌ Deploy başarısız!', 'red');
    log(e.message, 'red');
    process.exit(1);
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
}

async function main() {
  log('\n╔════════════════════════════════════════╗', 'cyan');
  log('║  YKS Hub - Firebase Deployment        ║', 'cyan');
  log('║  Version: 1.0.0                       ║', 'cyan');
  log('╚════════════════════════════════════════╝', 'cyan');
  
  // Check prerequisites
  try {
    await checkPrerequisites();
  } catch (e) {
    log(`Hata: ${e.message}`, 'red');
    process.exit(1);
  }
  
  // Ask for confirmation
  log('\n⚠️  Bu işlem uygulamayı canlı ortama göndecek!', 'yellow');
  const confirm = await askQuestion('\nDevam et? (evet/hayır): ');
  
  if (confirm !== 'evet' && confirm !== 'yes' && confirm !== 'y') {
    log('\nİptal edildi.', 'yellow');
    rl.close();
    process.exit(0);
  }
  
  // Build project
  try {
    await buildProject();
  } catch (e) {
    log(`Build hatası: ${e.message}`, 'red');
    rl.close();
    process.exit(1);
  }
  
  // Deploy
  try {
    await deployToFirebase();
  } catch (e) {
    log(`Deploy hatası: ${e.message}`, 'red');
    rl.close();
    process.exit(1);
  }
  
  // Summary
  log('\n╔════════════════════════════════════════╗', 'green');
  log('║  ✅ DEPLOYMENT BAŞARILI!              ║', 'green');
  log('╚════════════════════════════════════════╝', 'green');
  
  log('\n POST-Deployment Checks:', 'blue');
  log('1. https://ykshub-8c76f.web.app open', 'cyan');
  log('2. iPhone Debug: /iphone-debug.html', 'cyan');
  log('3. All tests GREEN?', 'cyan');
  log('4. Dashboard loads after login?', 'cyan');
  
  log('\n📱 Test iPhone\'da:', 'blue');
  log('1. Safari: https://ykshub-8c76f.web.app', 'cyan');
  log('2. Login yap', 'cyan');
  log('3. Debug: /iphone-debug.html', 'cyan');
  
  log('\n Guide: IPHONE_DEBUG_GUIDE.md\n', 'yellow');
  
  rl.close();
}

main().catch((error) => {
  log(`Kritik hata: ${error.message}`, 'red');
  process.exit(1);
});
