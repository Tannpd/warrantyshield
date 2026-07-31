import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import fs from 'fs';
import path from 'path';

const customStudionet = {
  ...studionet,
  rpcUrls: {
    default: { http: ['https://studio.genlayer.com/api'] },
    public: { http: ['https://studio.genlayer.com/api'] },
  }
};

async function deploy() {
  const contractPath = path.resolve('../contracts/warrantyshield.py');
  const code = fs.readFileSync(contractPath, 'utf8');

  console.log('Deploying updated WarrantyShield Intelligent Contract to StudioNet (https://studio.genlayer.com/api)...');
  const account = createAccount();
  const client = createClient({ chain: customStudionet, account });

  const txHash = await client.deployContract({
    code: code,
    args: []
  });

  console.log('Deploy Tx Hash:', txHash);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  console.log('Receipt:', receipt);
}

deploy().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
