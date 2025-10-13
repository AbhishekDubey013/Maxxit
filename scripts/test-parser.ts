import { TelegramCommandParser } from '../lib/telegram-command-parser';

const parser = new TelegramCommandParser();

async function main() {
  const tests = [
    'Buy 1 USDC of GMX',
    'Buy 2 USDC of LINK',
    'Buy 0.5 USDC of PEPE',
    'Buy 1 USDC of ARB',
    'Buy 3 USDC of WETH',
    'Buy 1 USDC of SNX',
  ];

  console.log('\n🧪 Testing Token Extraction:\n');
  console.log('Command                    → Token   Amount  Type');
  console.log('═══════════════════════════════════════════════════════');

  for (const cmd of tests) {
    const result = await parser.parseCommand(cmd);
    const status = result.token ? '✅' : '❌';
    console.log(
      `${status} ${cmd.padEnd(26)} → ${(result.token || 'NULL').padEnd(7)} ${
        (result.amount || 0).toString().padEnd(7)
      } ${result.amountType || 'N/A'}`
    );
  }

  console.log('');
}

main();

