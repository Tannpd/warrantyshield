import React, { useState, useEffect } from 'react';
import { 
  useWarrantyShield, 
  formatGen 
} from './useWarrantyShield';
import { 
  ShieldCheck, 
  Wallet, 
  PlusCircle, 
  FolderOpen, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Coins,
  Sparkles,
  RefreshCw,
  Globe,
  Cpu,
  ArrowRight,
  Shield,
  ShoppingBag,
  RotateCcw,
  Check,
  XCircle,
  Smartphone
} from 'lucide-react';

export default function App() {
  const {
    address,
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
    contractAddress
  } = useWarrantyShield();

  const [activeTab, setActiveTab] = useState('LANDING'); // LANDING, CREATE, CLAIMS
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  
  // Form inputs
  const [sellerInput, setSellerInput] = useState('0x3523C5E98EC441F2C619c968fF6eA92e3D0ba34');
  const [policyUrlInput, setPolicyUrlInput] = useState('https://warrantyshield.vercel.app/mock_warranty_policy.txt');
  const [amountInput, setAmountInput] = useState('5.0');
  const [evidenceUrlInput, setEvidenceUrlInput] = useState('');

  const selectedClaim = claims.find(c => Number(c.id) === Number(selectedClaimId));

  // Auto select first claim
  useEffect(() => {
    if (activeTab === 'CLAIMS' && claims.length > 0 && selectedClaimId === null) {
      setSelectedClaimId(claims[0].id);
    }
  }, [activeTab, claims, selectedClaimId]);

  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    if (!sellerInput || !policyUrlInput || !amountInput) return;
    try {
      await createWarrantyEscrow(sellerInput, policyUrlInput, amountInput);
      setSellerInput('0x3523C5E98EC441F2C619c968fF6eA92e3D0ba34');
      setPolicyUrlInput('https://warrantyshield.vercel.app/mock_warranty_policy.txt');
      setAmountInput('5.0');
      setActiveTab('CLAIMS');
      setSelectedClaimId(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileClaimAndAudit = async (e) => {
    e.preventDefault();
    if (!evidenceUrlInput || selectedClaimId === null) return;
    try {
      await fileClaimAndAudit(selectedClaimId, evidenceUrlInput);
      setEvidenceUrlInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReleaseToSeller = async (e) => {
    e.preventDefault();
    if (selectedClaimId === null) return;
    try {
      await releaseToSeller(selectedClaimId);
    } catch (err) {
      console.error(err);
    }
  };

  // Compute stat summary metrics
  const activeCount = claims.filter(c => c.status === 'ACTIVE').length;
  const refundedCount = claims.filter(c => c.status === 'REFUNDED').length;
  const releasedCount = claims.filter(c => c.status === 'RELEASED').length;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand-logo" onClick={() => setActiveTab('LANDING')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-box">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="brand-title">WarrantyShield</div>
            <div className="brand-subtitle">E-Commerce Warranty & Refund Escrow</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="nav-links">
            <button 
              onClick={() => setActiveTab('LANDING')}
              className={`nav-link ${activeTab === 'LANDING' ? 'active' : ''}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('CREATE')}
              className={`nav-link ${activeTab === 'CREATE' ? 'active' : ''}`}
            >
              Create Escrow
            </button>
            <button 
              onClick={() => {
                setActiveTab('CLAIMS');
                fetchClaimsState();
              }}
              className={`nav-link ${activeTab === 'CLAIMS' ? 'active' : ''}`}
            >
              Claims Vault ({claims.length})
            </button>
          </div>

          <div style={{ background: '#111622', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '6px 14px', fontSize: '12px', color: 'var(--primary-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-cyan)', boxShadow: '0 0 8px var(--primary-cyan)' }} />
            StudioNet
          </div>

          {address ? (
            <div style={{ background: 'var(--primary-cyan-dim)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '10px', padding: '8px 16px', color: '#FFF', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={16} color="var(--primary-cyan)" />
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          ) : (
            <button onClick={connectWallet} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
              <Wallet size={16} />
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Modern Web3 Full-Screen Loading Modal Overlay */}
      {loading && (
        <div className="modal-overlay">
          <div className="loading-modal-card">
            <div className="loading-spinner-box">
              <RefreshCw size={44} className="animate-spin" color="var(--primary-cyan)" />
              <div className="spinner-glow-ring" />
            </div>

            <h3 className="loading-modal-title">
              GenLayer Hardware AI Audit in Progress
            </h3>

            <p className="loading-modal-status">
              {txStatus || 'Writing transaction instructions to GenLayer Virtual Machine...'}
            </p>

            <div className="loading-steps-box">
              <div className="loading-step-item">
                <span className="step-dot active" />
                <span>1. Corroborating unboxing evidence URL & manufacturer policy</span>
              </div>
              <div className="loading-step-item">
                <span className="step-dot active" />
                <span>2. Executing Senior Hardware Auditor LLM prompt</span>
              </div>
              <div className="loading-step-item">
                <span className="step-dot active" />
                <span>3. Re-executing validator nodes for fail-closed consensus</span>
              </div>
            </div>

            {txHash && (
              <div className="loading-tx-hash">
                <span>TX HASH:</span> {txHash}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LANDING PAGE TAB */}
      {activeTab === 'LANDING' && (
        <div className="landing-wrapper">
          {/* Hero Section */}
          <div className="hero-section">
            <div className="hero-badge">
              <Sparkles size={14} color="var(--primary-cyan)" />
              <span>POWERED BY GENLAYER INTELLIGENT CONTRACTS v0.2.16</span>
            </div>

            <h1 className="hero-title">
              Autonomous E-Commerce <br />
              <span className="gradient-text">Warranty & Refund Escrow</span>
            </h1>

            <p className="hero-description">
              Stop online hardware warranty disputes. WarrantyShield locks purchase funds into smart escrows and uses AI validator nodes to audit unboxing logs and defect evidence against official manufacturer policies before triggering refunds.
            </p>

            <div className="hero-cta-group">
              <button onClick={() => setActiveTab('CREATE')} className="btn-primary" style={{ width: 'auto', padding: '16px 36px', fontSize: '16px' }}>
                Create Purchase Escrow
                <ArrowRight size={18} />
              </button>

              <button onClick={() => { setActiveTab('CLAIMS'); fetchClaimsState(); }} className="btn-secondary">
                <FolderOpen size={18} />
                Explore Claims Vault
              </button>
            </div>

            {/* Live Stats Row */}
            <div className="hero-stats">
              <div className="hero-stat-item">
                <div className="hero-stat-num">{claims.length}</div>
                <div className="hero-stat-lbl">Total Escrow Vaults</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <div className="hero-stat-num" style={{ color: 'var(--primary-cyan)' }}>{formatGen(contractBalance)} GEN</div>
                <div className="hero-stat-lbl">Active Escrow Locked</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <div className="hero-stat-num" style={{ color: 'var(--emerald-success)' }}>{refundedCount}</div>
                <div className="hero-stat-lbl">Buyer Factory Defect Refunds</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <div className="hero-stat-num" style={{ color: 'var(--amber-warn)' }}>{releasedCount}</div>
                <div className="hero-stat-lbl">Seller Purchase Releases</div>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--primary-cyan)' }}>
                <Globe size={24} />
              </div>
              <h3 className="feature-title">Multi-Source Web Evidence</h3>
              <p className="feature-text">
                GenLayer AI nodes fetch BOTH the manufacturer's warranty terms and the customer's unboxing video/photo report URL via <code className="code-tag">gl.nondet.web.render</code>.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber-warn)' }}>
                <Cpu size={24} />
              </div>
              <h3 className="feature-title">Senior Hardware AI Auditor</h3>
              <p className="feature-text">
                An AI hardware auditor distinguishes factory defects (DOA screen, burnt power IC) from user damage (liquid submersion, drops). Fault scores $\ge$ 50% trigger 100% buyer refund.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald-success)' }}>
                <Shield size={24} />
              </div>
              <h3 className="feature-title">Fail-Closed Protection</h3>
              <p className="feature-text">
                If web scraping or LLM parsing encounters errors, the contract fails closed (<code className="code-tag">is_faulty = False</code>), ensuring funds remain locked in escrow safely.
              </p>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="how-it-works-panel">
            <h2 className="section-heading">How WarrantyShield Protocol Works</h2>
            <p className="section-sub">A transparent 3-step warranty resolution lifecycle for e-commerce</p>

            <div className="steps-container">
              <div className="step-box">
                <div className="step-number">01</div>
                <h4 className="step-title">Create Escrow & Lock Purchase</h4>
                <p className="step-desc">Buyer deposits GEN purchase funds into <code className="code-tag">create_warranty_escrow</code> and binds the seller address + official manufacturer warranty policy URL.</p>
              </div>

              <div className="step-box">
                <div className="step-number">02</div>
                <h4 className="step-title">File Claim & AI Hardware Audit</h4>
                <p className="step-desc">If a defect occurs, buyer submits unboxing evidence URL. AI validator nodes render both policy and evidence text to evaluate factory defect vs user damage.</p>
              </div>

              <div className="step-box">
                <div className="step-number">03</div>
                <h4 className="step-title">Automated Refund or Release</h4>
                <p className="step-desc">Confirmed factory defects automatically refund 100% to buyer. User damage or clean items release funds to seller via <code className="code-tag">emit_transfer</code>.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE TAB: CREATE or CLAIMS */}
      {activeTab !== 'LANDING' && (
        <main>
          {/* Stats Overview Bar */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span>TOTAL ESCROW VAULTS</span>
                <ShoppingBag size={16} color="var(--primary-cyan)" />
              </div>
              <div className="stat-value">{claims.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>ACTIVE ESCROW LOCKED</span>
                <Coins size={16} color="var(--primary-cyan)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--primary-cyan)' }}>
                {formatGen(contractBalance)} GEN
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>BUYER DEFECT REFUNDS</span>
                <RotateCcw size={16} color="var(--emerald-success)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--emerald-success)' }}>{refundedCount}</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>SELLER PURCHASE RELEASES</span>
                <CheckCircle2 size={16} color="var(--amber-warn)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--amber-warn)' }}>{releasedCount}</div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '12px', padding: '16px 20px', color: '#FDA4AF', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="var(--rose-slash)" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: CREATE ESCROW */}
          {activeTab === 'CREATE' && (
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div className="glass-panel">
                <div className="panel-title">
                  <Lock size={22} color="var(--primary-cyan)" />
                  Create Warranty Purchase Escrow
                </div>
                <p className="panel-desc">
                  Lock GEN purchase funds into a protected escrow vault and bind the seller wallet address along with the official manufacturer warranty policy URL.
                </p>

                <form onSubmit={handleCreateEscrow}>
                  <div className="form-group">
                    <label className="form-label">SELLER WALLET ADDRESS</label>
                    <input 
                      type="text" 
                      placeholder="0x3523C5E98EC441F2C619c968fF6eA92e3D0ba34" 
                      value={sellerInput}
                      onChange={(e) => setSellerInput(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">OFFICIAL MANUFACTURER WARRANTY POLICY URL</label>
                    <input 
                      type="text" 
                      placeholder="https://warrantyshield.vercel.app/mock_warranty_policy.txt" 
                      value={policyUrlInput}
                      onChange={(e) => setPolicyUrlInput(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">PURCHASE ESCROW AMOUNT (GEN)</label>
                    <input 
                      type="number" 
                      step="0.001" 
                      min="0.001"
                      placeholder="5.0" 
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Locking Purchase Funds in Vault...
                      </>
                    ) : (
                      <>
                        <PlusCircle size={18} />
                        Create Escrow & Lock Purchase Funds
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 2: CLAIMS VAULT */}
          {activeTab === 'CLAIMS' && (
            <div>
              {claims.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <FolderOpen size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px auto' }} />
                  <h3 style={{ fontSize: '18px', color: '#FFF', marginBottom: '8px' }}>No Warranty Escrows Found</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                    Create your first purchase escrow in the "Create Escrow" tab.
                  </p>
                  <button onClick={() => setActiveTab('CREATE')} className="btn-primary" style={{ width: 'auto' }}>
                    Create Purchase Escrow
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
                  {/* Escrow List Sidebar */}
                  <div className="dossier-list">
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      ESCROW VAULTS ({claims.length})
                    </div>

                    {claims.map((c) => (
                      <div 
                        key={c.id}
                        onClick={() => setSelectedClaimId(c.id)}
                        className={`dossier-item ${Number(selectedClaimId) === Number(c.id) ? 'selected' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700, color: '#FFF' }}>
                            Escrow #{c.id}
                          </span>
                          <span className={`badge ${c.status === 'REFUNDED' ? 'badge-refunded' : c.status === 'RELEASED' ? 'badge-released' : 'badge-active'}`}>
                            {c.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Buyer: {c.buyer.slice(0, 6)}...{c.buyer.slice(-4)}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-cyan)', marginTop: '4px' }}>
                          {formatGen(c.amount)} GEN
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Selected Escrow Details */}
                  <div>
                    {selectedClaim && (
                      <div className="glass-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>WARRANTY ESCROW VAULT RECORD</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, color: '#FFF' }}>
                              Escrow Vault Ref #{selectedClaim.id}
                            </div>
                          </div>

                          <span className={`badge ${selectedClaim.status === 'REFUNDED' ? 'badge-refunded' : selectedClaim.status === 'RELEASED' ? 'badge-released' : 'badge-active'}`} style={{ fontSize: '14px', padding: '8px 18px' }}>
                            {selectedClaim.status === 'REFUNDED' && <RotateCcw size={16} />}
                            {selectedClaim.status === 'RELEASED' && <CheckCircle2 size={16} />}
                            {selectedClaim.status === 'ACTIVE' && <Sparkles size={16} />}
                            {selectedClaim.status}
                          </span>
                        </div>

                        {/* Detail Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                          <div style={{ background: '#0D1017', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>BUYER WALLET</div>
                            <div style={{ fontSize: '12px', color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{selectedClaim.buyer.slice(0, 6)}...{selectedClaim.buyer.slice(-4)}</div>
                          </div>

                          <div style={{ background: '#0D1017', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SELLER WALLET</div>
                            <div style={{ fontSize: '12px', color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{selectedClaim.seller.slice(0, 6)}...{selectedClaim.seller.slice(-4)}</div>
                          </div>

                          <div style={{ background: '#0D1017', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ESCROW VALUE</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-cyan)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                              {formatGen(selectedClaim.amount)} GEN
                            </div>
                          </div>
                        </div>

                        {/* Official Manufacturer Policy URL */}
                        {selectedClaim.policy_url && (
                          <div style={{ background: '#0D1017', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>OFFICIAL MANUFACTURER WARRANTY POLICY URL</div>
                            <a 
                              href={selectedClaim.policy_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ color: 'var(--primary-cyan)', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)' }}
                            >
                              {selectedClaim.policy_url}
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        )}

                        {/* Progress Gauge */}
                        {selectedClaim.fault_score > 0 && (
                          <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                              <span>HARDWARE FACTORY DEFECT RATING</span>
                              <span style={{ color: selectedClaim.is_faulty ? 'var(--emerald-success)' : 'var(--amber-warn)' }}>
                                {selectedClaim.fault_score}% FACTORY DEFECT SCORE
                              </span>
                            </div>
                            <div className="progress-bar-track">
                              <div 
                                className={`progress-bar-fill ${selectedClaim.fault_score >= 50 ? 'high' : 'low'}`}
                                style={{ width: `${selectedClaim.fault_score}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Audit Decree Box */}
                        {selectedClaim.audit_reasoning && (
                          <div className={`decree-box ${selectedClaim.status === 'REFUNDED' ? 'refunded' : selectedClaim.status === 'RELEASED' ? 'released' : ''}`}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: selectedClaim.status === 'REFUNDED' ? 'var(--emerald-success)' : selectedClaim.status === 'RELEASED' ? 'var(--amber-warn)' : 'var(--primary-cyan)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <ShieldCheck size={16} />
                              SENIOR HARDWARE AI AUDITOR REPORT LOG
                            </div>
                            <div style={{ fontStyle: 'italic', fontSize: '14px', color: '#E2E8F0', lineHeight: '22px' }}>
                              "{selectedClaim.audit_reasoning}"
                            </div>

                            {selectedClaim.evidence_url && (
                              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>UNBOXING / DEFECT EVIDENCE URL:</span>
                                <a 
                                  href={selectedClaim.evidence_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ color: 'var(--primary-cyan)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {selectedClaim.evidence_url}
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Form & Buyer Actions */}
                        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                          {selectedClaim.status === 'ACTIVE' || selectedClaim.status === 'FAILED' ? (
                            <div>
                              <div style={{ background: 'var(--primary-cyan-dim)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#93E5FF', marginBottom: '20px' }}>
                                FILE WARRANTY CLAIM // Submit unboxing video or defect photo log URL to trigger AI hardware audit. Confirmed factory defects trigger 100% buyer refund.
                              </div>

                              {/* Preset Fill Buttons */}
                              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button
                                  type="button"
                                  className="preset-btn preset-btn-emerald"
                                  onClick={() => setEvidenceUrlInput('https://warrantyshield.vercel.app/mock_factory_defect_evidence.txt')}
                                >
                                  <RotateCcw size={14} />
                                  + Fill Factory Defect Evidence (Trigger 100% Refund)
                                </button>

                                <button
                                  type="button"
                                  className="preset-btn preset-btn-amber"
                                  onClick={() => setEvidenceUrlInput('https://warrantyshield.vercel.app/mock_user_damage_evidence.txt')}
                                >
                                  <XCircle size={14} />
                                  + Fill User Damage Evidence (Release to Seller)
                                </button>
                              </div>

                              <form onSubmit={handleFileClaimAndAudit} style={{ marginBottom: '20px' }}>
                                <div className="form-group">
                                  <label className="form-label">UNBOXING / DEFECT EVIDENCE URL (Video Log, Photos, Diagnostic Report)</label>
                                  <input 
                                    type="text" 
                                    placeholder="https://warrantyshield.vercel.app/mock_factory_defect_evidence.txt" 
                                    value={evidenceUrlInput || 'https://warrantyshield.vercel.app/mock_factory_defect_evidence.txt'}
                                    onChange={(e) => setEvidenceUrlInput(e.target.value)}
                                    className="form-input"
                                    required
                                  />
                                </div>

                                <button type="submit" className="btn-primary" disabled={loading}>
                                  {loading ? (
                                    <>
                                      <RefreshCw size={18} className="animate-spin" />
                                      Auditing Hardware Evidence via GenLayer AI...
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck size={18} />
                                      File Claim & Audit Hardware Defect
                                    </>
                                  )}
                                </button>
                              </form>

                              {/* Buyer Manual Release to Seller Button */}
                              {address.toLowerCase() === selectedClaim.buyer.toLowerCase() && Number(selectedClaim.amount) > 0 && (
                                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    MANUAL SATISFACTION RELEASE: Product received in clean working condition with no defects.
                                  </div>
                                  <button 
                                    onClick={handleReleaseToSeller} 
                                    className="preset-btn preset-btn-amber"
                                    style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }}
                                    disabled={loading}
                                  >
                                    <CheckCircle2 size={16} />
                                    Release Purchase Escrow Funds to Seller
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : selectedClaim.status === 'REFUNDED' ? (
                            <div style={{ background: '#0D1017', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--emerald-success)', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                              Factory Defect Confirmed. 100% Purchase Escrow Refunded to Buyer Wallet.
                            </div>
                          ) : (
                            <div style={{ background: '#0D1017', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--amber-warn)', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                              User Damage / Satisfaction Confirmed. Purchase Escrow Released to Seller Wallet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
