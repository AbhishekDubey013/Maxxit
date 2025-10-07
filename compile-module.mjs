#!/usr/bin/env node
/**
 * Compile MaxxitTradingModule using solc directly
 */

import solc from 'solc';
import fs from 'fs';
import path from 'path';

const modulePath = './contracts/modules/MaxxitTradingModule.sol';
const ierc20Path = './contracts/interfaces/IERC20.sol';
const isafePath = './contracts/interfaces/ISafe.sol';

console.log('📦 Compiling MaxxitTradingModule...\n');

try {
  // Read source files
  const moduleSource = fs.readFileSync(modulePath, 'utf8');
  const ierc20Source = fs.readFileSync(ierc20Path, 'utf8');
  const isafeSource = fs.readFileSync(isafePath, 'utf8');

  // Prepare input for solc with proper import resolution
  const input = {
    language: 'Solidity',
    sources: {
      'contracts/modules/MaxxitTradingModule.sol': { content: moduleSource },
      'contracts/interfaces/IERC20.sol': { content: ierc20Source },
      'contracts/interfaces/ISafe.sol': { content: isafeSource },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  // Compile
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // Check for errors
  if (output.errors) {
    const hasErrors = output.errors.some(error => error.severity === 'error');
    if (hasErrors) {
      console.log('❌ Compilation errors:');
      output.errors.forEach(error => {
        if (error.severity === 'error') {
          console.log(`  ${error.formattedMessage}`);
        }
      });
      process.exit(1);
    }
  }

  // Get compiled contract
  const contractKey = Object.keys(output.contracts).find(k => k.includes('MaxxitTradingModule'));
  if (!contractKey) {
    console.log('❌ Contract not found. Available contracts:');
    console.log(Object.keys(output.contracts));
    process.exit(1);
  }
  
  const contract = output.contracts[contractKey]['MaxxitTradingModule'];
  
  if (!contract) {
    console.log('❌ MaxxitTradingModule not found in', contractKey);
    console.log('Available:', Object.keys(output.contracts[contractKey]));
    process.exit(1);
  }

  // Save artifacts
  const artifact = {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
  };

  fs.mkdirSync('./artifacts', { recursive: true });
  fs.writeFileSync(
    './artifacts/MaxxitTradingModule.json',
    JSON.stringify(artifact, null, 2)
  );

  console.log('✅ Compilation successful!');
  console.log(`   Bytecode size: ${contract.evm.bytecode.object.length / 2} bytes`);
  console.log('   Saved to: ./artifacts/MaxxitTradingModule.json\n');

} catch (error) {
  console.log('❌ Error:', error.message);
  process.exit(1);
}

