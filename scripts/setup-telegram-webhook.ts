#!/usr/bin/env tsx
/**
 * Setup Telegram Webhook
 * Registers the webhook URL with Telegram servers
 */

const BOT_TOKEN = '8485300778:AAFo7JqL1LtuC_B41NmRAGTLJeRFgNN4PQ8';
const WEBHOOK_URL = 'https://maxxit.vercel.app/api/telegram/webhook';

async function setupWebhook() {
  console.log('🔧 SETTING UP TELEGRAM WEBHOOK');
  console.log('═'.repeat(70));
  console.log('');
  console.log('Bot Token:', BOT_TOKEN.substring(0, 20) + '...');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('');
  
  try {
    // First, delete any existing webhook
    console.log('1️⃣ Removing old webhook...');
    const deleteRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    const deleteResult = await deleteRes.json();
    console.log('   Result:', deleteResult.description || deleteResult.ok ? 'OK' : 'Failed');
    console.log('');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Set new webhook
    console.log('2️⃣ Setting new webhook...');
    const setRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true, // Clear any old pending messages
      })
    });
    const setResult = await setRes.json();
    
    if (setResult.ok) {
      console.log('   ✅ Webhook set successfully!');
      console.log('   Description:', setResult.description);
    } else {
      console.log('   ❌ Failed:', setResult.description);
      return;
    }
    console.log('');
    
    // Verify webhook
    console.log('3️⃣ Verifying webhook...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const verifyRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const verifyResult = await verifyRes.json();
    
    if (verifyResult.ok) {
      const info = verifyResult.result;
      console.log('   ✅ Webhook verified!');
      console.log('   URL:', info.url);
      console.log('   Pending updates:', info.pending_update_count || 0);
      console.log('   Last error:', info.last_error_message || 'None');
    }
    console.log('');
    
    // Test bot
    console.log('4️⃣ Testing bot...');
    const botRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botResult = await botRes.json();
    
    if (botResult.ok) {
      console.log('   ✅ Bot is active!');
      console.log('   Username: @' + botResult.result.username);
      console.log('   Name:', botResult.result.first_name);
    }
    console.log('');
    
    console.log('═'.repeat(70));
    console.log('🎉 WEBHOOK SETUP COMPLETE!');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Open Telegram and find @' + (botResult.result?.username || 'Maxxinn_bot'));
    console.log('2. Send: /link I47PQN');
    console.log('3. Bot should respond immediately!');
    console.log('');
    console.log('⚠️  IMPORTANT: Make sure Railway has TELEGRAM_BOT_TOKEN env variable');
    console.log('   Railway → Settings → Variables → Add:');
    console.log('   TELEGRAM_BOT_TOKEN=' + BOT_TOKEN);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

setupWebhook();

