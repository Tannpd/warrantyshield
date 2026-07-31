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
  if (typeof account === 'string') {
    return createClient({ chain: customStudionet, account: account });
  }
  return createClient({ chain: customStudionet, account });
}

// Fallback account generator for environments without MetaMask
function getFallbackAccount() {
  if (typeof window === 'undefined') return createAccount();
  try {
    const savedPk = localStorage.getItem('warrantyshield_genlayer_pk');
    if (savedPk && savedPk.startsWith('0x') && savedPk.length === 66) {
      return createAccount(savedPk);
    }
    const newAcc = createAccount();
    if (newAcc && newAcc.privateKey) {
      localStorage.setItem('warrantyshield_genlayer_pk', newAcc.privateKey);
    }
    return newAcc;
  } catch (e) {
    return createAccount();
  }
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

// Helper function to clean up raw Python tracebacks, RPC errors, and format clean user-friendly messages
export function parseCleanError(err) {
  if (!err) return '';
  const msg = typeof err === 'string' ? err : (err.message || String(err));
  
  if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('User denied')) {
    return 'Transaction was canceled in your wallet.';
  }
  if (msg.includes('insufficient funds')) {
    return 'Insufficient GEN balance in wallet for gas and transaction value.';
  }
  if (msg.includes('Server busy') || msg.includes('execution slots occupied')) {
    return 'GenLayer network nodes are currently busy. Please retry in a few seconds.';
  }

  // Handle Python UserError inside GenLayer Traceback
  if (msg.includes('UserError:')) {
    const parts = msg.split('UserError:');
    let raw = parts[parts.length - 1].trim();
    if (raw.includes('"')) {
      raw = raw.split('"')[0].trim();
    }
    if (raw.includes('\n')) {
      raw = raw.split('\n')[0].trim();
    }
    if (raw) return raw;
  }

  // Clean Python Traceback lines
  if (msg.includes('Traceback')) {
    const lines = msg.split('\n').filter(line => !line.includes('File "') && !line.includes('Traceback') && !line.includes('^^^') && !line.includes('lambda'));
    const cleanStr = lines.join(' ').trim();
    if (cleanStr) return cleanStr.length > 150 ? cleanStr.slice(0, 145) + '...' : cleanStr;
  }

  const clean = msg.replace(/^Error:\s*/, '').replace(/UserError:\s*/, '').trim();
  return clean.length > 150 ? clean.slice(0, 145) + '...' : clean;
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

  // Auto clear error banner after 6 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Connects directly to user's MetaMask wallet when clicked
  const connectWallet = useCallback(async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          const userAddr = accounts[0];
          setAddress(userAddr);
          setGlAccount(userAddr);
          return userAddr;
        }
      }
      
      // Fallback if MetaMask is not installed
      const acc = getFallbackAccount();
      setGlAccount(acc);
      setAddress(acc.address);
      return acc.address;
    } catch (err) {
      console.error('MetaMask connect error:', err);
      const acc = getFallbackAccount();
      setGlAccount(acc);
      setAddress(acc.address);
      return acc.address;
    }
  }, []);

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
  const createWarrantyEscrow = async (sellerAddress, productId, saleId, policyUrl, amountGen) => {
    let currentAccount = glAccount;
    if (!currentAccount) {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0) {
            currentAccount = accounts[0];
            setGlAccount(currentAccount);
            setAddress(currentAccount);
          }
        } catch (e) {
          console.warn('MetaMask connect failed:', e);
        }
      }
      if (!currentAccount) {
        currentAccount = getFallbackAccount();
        setGlAccount(currentAccount);
        setAddress(typeof currentAccount === 'string' ? currentAccount : currentAccount.address);
      }
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
        args: [sellerAddress.trim(), productId.trim(), saleId.trim(), policyUrl.trim()],
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
      setError(parseCleanError(err));
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // File Claim & Audit
  const fileClaimAndAudit = async (claimId, evidenceUrl) => {
    let currentAccount = glAccount;
    if (!currentAccount) {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0) {
            currentAccount = accounts[0];
            setGlAccount(currentAccount);
            setAddress(currentAccount);
          }
        } catch (e) {
          console.warn('MetaMask connect failed:', e);
        }
      }
      if (!currentAccount) {
        currentAccount = getFallbackAccount();
        setGlAccount(currentAccount);
        setAddress(typeof currentAccount === 'string' ? currentAccount : currentAccount.address);
      }
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
      setError(parseCleanError(err));
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Release to Seller
  const releaseToSeller = async (claimId) => {
    let currentAccount = glAccount;
    if (!currentAccount) {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0) {
            currentAccount = accounts[0];
            setGlAccount(currentAccount);
            setAddress(currentAccount);
          }
        } catch (e) {
          console.warn('MetaMask connect failed:', e);
        }
      }
      if (!currentAccount) {
        currentAccount = getFallbackAccount();
        setGlAccount(currentAccount);
        setAddress(typeof currentAccount === 'string' ? currentAccount : currentAccount.address);
      }
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

      setTxStatus('Success! Escrow funds released to seller.');
      await fetchClaimsState();
      return receipt;
    } catch (err) {
      console.error('Manual release failed:', err);
      setError(parseCleanError(err));
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Listen to MetaMask account switches
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setGlAccount(accounts[0]);
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

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
    fetchClaimsState,
    createWarrantyEscrow,
    fileClaimAndAudit,
    releaseToSeller,
    contractAddress: CONTRACT_ADDRESS,
  };
}
