// WarrantyShield JavaScript SDK Client
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = "0x742Cb4396cbBb94Cb950Fd44260208B9eC7c562e";

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
