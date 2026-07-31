// WarrantyShield JavaScript SDK Client
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = "0xF4423Ef14b710e9a9103904F0945805275F9ba9B";

export async function getClaimsCount() {
  const client = createClient({ chain: studionet });
  const count = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_claims_count",
    args: []
  });
  return Number(count);
}

export async function getClaim(claimId) {
  const client = createClient({ chain: studionet });
  const claimJsonStr = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_claim",
    args: [claimId]
  });
  return JSON.parse(claimJsonStr);
}
