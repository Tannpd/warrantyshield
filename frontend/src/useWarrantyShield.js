import { useState, useCallback, useEffect } from 'react';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

// Custom chain that proxies RPC through Vercel same-origin to bypass browser CORS policies
const getRpcEndpoint = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${window.location.origin}/api/rpc`;
  }
  return 'https://studio.genlayer.com/api';
};

const customStudionet = {
  ...studionet,
  rpcUrls: {
    default: { http: [getRpcEndpoint()] },
    public: { http: [getRpcEndpoint()] },
  }
};

let _readClient = null;

function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: customStudionet });
  }
  return _readClient;
}

function getWriteClient(account) {
  return createClient({ chain: customStudionet, account });
}

// Persistent account helper: guarantees exact same keypair and address across operations
function getStoredAccount() {
  try {
    const storedPk = localStorage.getItem('genlayer_warrantyshield_pk');
    if (storedPk && storedPk.startsWith('0x') && storedPk.length === 66) {
      return createAccount(storedPk);
    }
  } catch (e) {
    console.warn('LocalStorage PK read warning:', e);
  }
  
  // Generate new keypair and persist
  const newAcc = createAccount();
  if (newAcc && newAcc.privateKey) {
    try {
      localStorage.setItem('genlayer_warrantyshield_pk', newAcc.privateKey);
    } catch (e) {
      console.warn('LocalStorage PK write warning:', e);
    }
  }
  return newAcc;
}

// Convert Wei (u256) to human readable GEN string
export function formatGen(weiVal) {
  if (!weiVal) return '0';
  try {
    const big = BigInt(weiVal);
    const integerPart = big / 10n**18n;
    const fractionalPart = big % 10n**18n;
    let fractionStr = fractionalPart.toString().padStart(18, '0');
    fractionStr = fractionStr.replace(/0+$/, '');
    if (fractionStr === '') {
      return integerPart.toString();
    }
    return `${integerPart}.${fractionStr.slice(0, 4)}`;
  } catch (e) {
    return '0';
  }
}

// Convert human readable GEN input to Wei (u256 BigInt)
export function parseGen(genVal) {
  if (!genVal || genVal.toString().trim() === '') return 0n;
  try {
    const parts = genVal.toString().split('.');
    let integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';
    fractionalPart = fractionalPart.slice(0, 18).padEnd(18, '0');
    return BigInt(integerPart) * 10n**18n + BigInt(fractionalPart);
  } catch (e) {
    return 0n;
  }
}

export function useWarrantyShield() {
  const [address, setAddress] = useState('');
  const [glAccount, setGlAccount] = useState(null);
  const [claims, setClaims] = useState([]);
  const [contractBalance, setContractBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // ONLY triggered when user explicitly clicks "Connect Wallet"
  const connectWallet = useCallback(async () => {
    try {
      const acc = getStoredAccount();
      setAddress(acc.address);
      setGlAccount(acc);
      return acc.address;
    } catch (err) {
      console.error('Wallet connect error:', err);
      const fallbackAcc = createAccount();
      setAddress(fallbackAcc.address);
      setGlAccount(fallbackAcc);
      return fallbackAcc.address;
    }
  }, []);

  // Switch wallet by custom Private Key
  const switchAccount = (privateKeyHex) => {
    try {
      const formattedPk = privateKeyHex.trim();
      const acc = createAccount(formattedPk);
      localStorage.setItem('genlayer_warrantyshield_pk', acc.privateKey);
      setAddress(acc.address);
      setGlAccount(acc);
      return acc.address;
    } catch (e) {
      console.error('Invalid private key:', e);
      throw new Error('Invalid Private Key. Must be a 32-byte hex string starting with 0x.');
    }
  };

  // Generate a brand new wallet address
  const generateNewWallet = () => {
    const acc = createAccount();
    if (acc && acc.privateKey) {
      localStorage.setItem('genlayer_warrantyshield_pk', acc.privateKey);
    }
    setAddress(acc.address);
    setGlAccount(acc);
    return acc.address;
  };

  const fetchClaimsState = useCallback(async () => {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    setLoading(true);
    try {
      const client = getReadClient();
      const countBig = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_claims_count',
        args: [],
      });
      
      const count = Number(countBig);
      const fetchedClaims = [];

      for (let i = 0; i < count; i++) {
        const claimJsonStr = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_claim',
          args: [i],
        });
        if (claimJsonStr && claimJsonStr !== '{}') {
          try {
            const parsed = JSON.parse(claimJsonStr);
            fetchedClaims.push(parsed);
          } catch (e) {
            console.error('Error parsing claim json:', e);
          }
        }
      }
      
      const rawBalance = await client.getBalance({ address: CONTRACT_ADDRESS });
      setContractBalance(rawBalance.toString());
      setClaims(fetchedClaims.reverse());
      setError('');
    } catch (err) {
      console.error('Error fetching warranty claims:', err);
      setError('Failed to fetch claims: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Warranty Escrow
  const createWarrantyEscrow = async (sellerAddress, policyUrl, amountGen) => {
    let currentAccount = glAccount || getStoredAccount();
    if (!glAccount) {
      setGlAccount(currentAccount);
      setAddress(currentAccount.address);
    }
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Creating warranty escrow deposit of ${amountGen} GEN...`);

    try {
      const client = getWriteClient(currentAccount);
      const valueWei = parseGen(amountGen);
      
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'create_warranty_escrow',
        args: [sellerAddress.trim(), policyUrl.trim()],
        value: valueWei,
      });
      
      setTxHash(hash);
      setTxStatus('Transmitting escrow creation transaction to GenLayer Virtual Machine...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Contract execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Warranty purchase escrow created.');
      await fetchClaimsState();
      return receipt;
    } catch (err) {
      console.error('Escrow creation failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // File Claim & Audit
  const fileClaimAndAudit = async (claimId, evidenceUrl) => {
    let currentAccount = glAccount || getStoredAccount();
    if (!glAccount) {
      setGlAccount(currentAccount);
      setAddress(currentAccount.address);
    }
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Submitting defect evidence for claim #${claimId}...`);

    try {
      const client = getWriteClient(currentAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'file_claim_and_audit',
        args: [Number(claimId), evidenceUrl.trim()],
      });
      
      setTxHash(hash);
      setTxStatus('Senior Hardware AI Scanners are parsing unboxing logs & warranty policy terms. Enforcing multi-node consensus. Please wait 15-30s...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Audit execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Warranty audit completed. Funds refunded or released based on defect verdict.');
      await fetchClaimsState();
      return receipt;
    } catch (err) {
      console.error('Warranty audit failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Release to Seller
  const releaseToSeller = async (claimId) => {
    let currentAccount = glAccount || getStoredAccount();
    if (!glAccount) {
      setGlAccount(currentAccount);
      setAddress(currentAccount.address);
    }
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Releasing escrow funds to seller for claim #${claimId}...`);

    try {
      const client = getWriteClient(currentAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'release_to_seller',
        args: [Number(claimId)],
      });
      
      setTxHash(hash);
      setTxStatus('Transmitting manual release transaction...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Release execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Funds released to seller wallet.');
      await fetchClaimsState();
      return receipt;
    } catch (err) {
      console.error('Release failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial claims data on mount without triggering wallet popup
  useEffect(() => {
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      fetchClaimsState();
    }
  }, [fetchClaimsState]);

  return {
    address,
    glAccount,
    claims,
    contractBalance,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    switchAccount,
    generateNewWallet,
    fetchClaimsState,
    createWarrantyEscrow,
    fileClaimAndAudit,
    releaseToSeller,
    contractAddress: CONTRACT_ADDRESS,
  };
}
