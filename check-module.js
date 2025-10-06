const { ethers } = require('ethers');

async function checkModule() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC || 'https://ethereum-sepolia.publicnode.com');
  const safeABI = ['function isModuleEnabled(address module) external view returns (bool)'];
  const safe = new ethers.Contract('0xC613Df8883852667066a8a08c65c18eDe285678D', safeABI, provider);
  
  try {
    const isEnabled = await safe.isModuleEnabled('0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE');
    console.log('Module enabled:', isEnabled);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkModule();
