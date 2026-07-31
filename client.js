// WarrantyShield JavaScript SDK Client
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = "0x38142bEf0F989De0dEB1d8d58176b3FE440E305C";

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
