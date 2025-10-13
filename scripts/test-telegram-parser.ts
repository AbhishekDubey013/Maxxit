/**
 * Test Telegram command parsing
 */

import { TelegramCommandParser } from '../lib/telegram-command-parser';

async function main() {
  const parser = new TelegramCommandParser();
  
  const testCommands = [
    'Buy 1 USDC of WETH',
    'Buy 1 USDC WETH',
    'Buy WETH',
    'Close WETH',
    'Sell WETH',
  ];
  
  console.log('🔍 Testing Telegram Command Parsing...\n');
  
  for (const command of testCommands) {
    console.log(`Command: "${command}"`);
    try {
      const result = await parser.parse(command);
      console.log(`  Intent: ${result.intent}`);
      console.log(`  Token: ${result.tokenSymbol}`);
      if (result.amount) {
        console.log(`  Amount: ${result.amount} USDC`);
      }
      console.log(`  Confidence: ${result.confidence}\n`);
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }
}

main();

