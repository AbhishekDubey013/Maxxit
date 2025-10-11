#!/usr/bin/env tsx
/**
 * Check Telegram Webhook Status
 */

import dotenv from 'dotenv';

dotenv.config();

async function checkWebhook() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!BOT_TOKEN) {
    console.log('❌ TELEGRAM_BOT_TOKEN not found in .env');
    console.log('');
    console.log('Add to .env:');
    console.log('TELEGRAM_BOT_TOKEN=8485300778:AAFo7JqL1LtuC_B41NmRAGTLJeRFgNN4PQ8');
    return;
  }
  
  console.log('🤖 TELEGRAM BOT STATUS');
  console.log('═'.repeat(70));
  console.log('');
  
  try {
    // Get bot info
    console.log('📊 Bot Information:');
    const botInfoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botInfo = await botInfoRes.json();
    
    if (botInfo.ok) {
      console.log('   ✅ Bot connected:', botInfo.result.username);
      console.log('   Name:', botInfo.result.first_name);
      console.log('   ID:', botInfo.result.id);
    } else {
      console.log('   ❌ Bot error:', botInfo.description);
    }
    console.log('');
    
    // Get webhook info
    console.log('🌐 Webhook Status:');
    const webhookRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookInfo = await webhookRes.json();
    
    if (webhookInfo.ok) {
      const info = webhookInfo.result;
      
      if (info.url) {
        console.log('   ✅ Webhook configured');
        console.log('   URL:', info.url);
        console.log('   Pending updates:', info.pending_update_count || 0);
        console.log('   Last error:', info.last_error_message || 'None');
        if (info.last_error_date) {
          console.log('   Last error time:', new Date(info.last_error_date * 1000).toISOString());
        }
      } else {
        console.log('   ❌ No webhook configured!');
        console.log('');
        console.log('   To set up webhook:');
        console.log('   1. Make sure Railway deployment has TELEGRAM_BOT_TOKEN');
        console.log('   2. Run: npx tsx scripts/setup-telegram-webhook.ts');
      }
    }
    console.log('');
    
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

checkWebhook();

