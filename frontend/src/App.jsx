import React, { useState, useEffect } from 'react';
import { useWarrantyShield, formatGen } from './useWarrantyShield';
import { analyzeUnboxingImage } from './geminiVision';
import { generateEvidenceReportUrl } from './reportGenerator';
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
  RotateCcw,
  XCircle,
  Award,
  Eye,
  Camera,
  FileText,
  Upload
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

  const [activeTab, setActiveTab] = useState('LANDING'); // LANDING, CREATE, CLAIMS, VISION
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  
  // Form inputs
  const [sellerInput, setSellerInput] = useState('0x3523C5E98EC441F2C619c968fF6eA92e3D0ba34');
  const [productIdInput, setProductIdInput] = useState('PRD-MACBOOK-M3-001');
  const [saleIdInput, setSaleIdInput] = useState('SALE-2026-88492');
  const [policyUrlInput, setPolicyUrlInput] = useState('https://warrantyshield-app.vercel.app/mock_warranty_policy.txt');
  const [amountInput, setAmountInput] = useState('5.0');
  const [evidenceUrlInput, setEvidenceUrlInput] = useState('');

  // Layer 1 Vision AI Inspector States
  const [visionImage, setVisionImage] = useState(null);
  const [visionImagePreview, setVisionImagePreview] = useState('');
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionResult, setVisionResult] = useState('');
  const [generatedReportUrl, setGeneratedReportUrl] = useState('');
  const [visionApiKeyInput, setVisionApiKeyInput] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');

  const selectedClaim = claims.find(c => Number(c.id) === Number(selectedClaimId));

  // Auto select first claim
  useEffect(() => {
    if (activeTab === 'CLAIMS' && claims.length > 0 && selectedClaimId === null) {
      setSelectedClaimId(claims[0].id);
    }
  }, [activeTab, claims, selectedClaimId]);

  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    if (!sellerInput || !productIdInput || !saleIdInput || !policyUrlInput || !amountInput) return;
    try {
      await createWarrantyEscrow(sellerInput, productIdInput, saleIdInput, policyUrlInput, amountInput);
      setSellerInput('0x3523C5E98EC441F2C619c968fF6eA92e3D0ba34');
      setProductIdInput('PRD-MACBOOK-M3-001');
      setSaleIdInput('SALE-2026-88492');
      setPolicyUrlInput('https://warrantyshield-app.vercel.app/mock_warranty_policy.txt');
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

  const extractVideoFrame = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        video.currentTime = Math.min(1.0, video.duration / 2);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(video.src);
        resolve(base64);
      };
      video.onerror = () => reject(new Error('Failed to load video file.'));
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVisionLoading(true);
        try {
          const frameBase64 = await extractVideoFrame(file);
          setVisionImage({ base64: frameBase64, mimeType: 'image/jpeg', isVideo: true, fileName: file.name });
          setVisionImagePreview(frameBase64);
        } catch (err) {
          console.error('Error extracting video frame:', err);
          alert('Could not extract frame from video. Please select an unboxing image or photo frame.');
        } finally {
          setVisionLoading(false);
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setVisionImage({ base64: reader.result, mimeType: file.type, isVideo: false, fileName: file.name });
          setVisionImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAnalyzeVision = async (e) => {
    e.preventDefault();
    if (!visionImagePreview) return;
    setVisionLoading(true);
    setVisionResult('');
    setGeneratedReportUrl('');
    try {
      const resultText = await analyzeUnboxingImage({
        imageBase64: visionImagePreview,
        mimeType: visionImage?.mimeType || 'image/jpeg',
        productId: productIdInput,
        saleId: saleIdInput,
        apiKey: visionApiKeyInput
      });
      setVisionResult(resultText);
      const url = generateEvidenceReportUrl(resultText);
      setGeneratedReportUrl(url);
    } catch (err) {
      console.error('Vision analysis error:', err);
      setVisionResult(`Analysis Error: ${err.message}`);
    } finally {
      setVisionLoading(false);
    }
  };

  const handleUseGeneratedReport = () => {
    if (generatedReportUrl) {
      setEvidenceUrlInput(generatedReportUrl);
      setActiveTab('CLAIMS');
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
  const refundedCount = claims.filter(c => c.status === 'REFUNDED').length;
  const releasedCount = claims.filter(c => c.status === 'RELEASED').length;
  const activeCount = claims.filter(c => c.status === 'ACTIVE').length;

  const isBuyer = address && selectedClaim && address.toLowerCase() === selectedClaim.buyer.toLowerCase();

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
            <div className="brand-subtitle">AI Hardware Defect & Warranty Audit</div>
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
              onClick={() => setActiveTab('VISION')}
              className={`nav-link ${activeTab === 'VISION' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Eye size={14} color="var(--primary-cyan)" />
              Vision AI Inspector
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

          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '6px 14px', fontSize: '12px', color: 'var(--primary-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              GenLayer AI Hardware Defect Audit in Progress
            </h3>

            <p className="loading-modal-status">
              {txStatus || 'Writing transaction instructions to GenLayer Virtual Machine...'}
            </p>

            <div className="loading-steps-box">
              <div className="loading-step-item">
                <span className="step-dot active" />
                <span>1. Corroborating warranty policy & defect evidence log URL</span>
              </div>
              <div className="loading-step-item">
                <span className="step-dot active" />
                <span>2. Executing Senior Hardware Quality Auditor LLM prompt</span>
              </div>
              <div className="loading-step-item">
                <span className="step-dot active" />
                <span>3. Re-executing validator nodes for fail-closed consensus</span>
              </div>
            </div>

            {address && (
              <div style={{ background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.25)', borderRadius: '10px', padding: '10px 14px', margin: '14px 0 6px 0', fontSize: '13px', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Wallet size={16} color="var(--primary-cyan)" />
                <span>SIGNER (METAMASK WRITER):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-cyan)' }}>{address}</span>
              </div>
            )}

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
              <span className="gradient-text">Warranty & Defect Audit Escrow</span>
            </h1>

            <p className="hero-description">
              Eliminate e-commerce warranty disputes. WarrantyShield locks purchase funds into smart escrows. GenLayer AI validator nodes analyze unboxing logs and defect photo/video reports against official manufacturer warranty policies to instantly grant 100% buyer refunds or release payments to honest sellers.
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
                <div className="hero-stat-lbl">Total Warranty Escrows</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <div className="hero-stat-num" style={{ color: 'var(--primary-cyan)' }}>{formatGen(contractBalance)} GEN</div>
                <div className="hero-stat-lbl">Escrow Value Locked</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <div className="hero-stat-num" style={{ color: 'var(--primary-cyan)' }}>{refundedCount}</div>
                <div className="hero-stat-lbl">Factory Defect Refunds</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <div className="hero-stat-num" style={{ color: 'var(--amber-release)' }}>{releasedCount}</div>
                <div className="hero-stat-lbl">Seller Releases</div>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--primary-cyan)' }}>
                <Globe size={24} />
              </div>
              <h3 className="feature-title">Dual Web Corroboration</h3>
              <p className="feature-text">
                GenLayer AI nodes fetch BOTH the manufacturer's official warranty terms and the customer's unboxing/defect report via <code className="code-tag">gl.nondet.web.render</code>.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--sky-accent)' }}>
                <Cpu size={24} />
              </div>
              <h3 className="feature-title">Senior Hardware AI Auditor</h3>
              <p className="feature-text">
                LLM prompt distinguishes DOA hardware, burnt ICs, and dead pixels from user drops, liquid submersion, or unauthorized teardowns.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber-release)' }}>
                <Shield size={24} />
              </div>
              <h3 className="feature-title">Fail-Closed Escrow Safety</h3>
              <p className="feature-text">
                If evidence fetching or LLM execution fails, the escrow locks safely without releasing funds, protecting both buyer and seller.
              </p>
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
                <span>TOTAL WARRANTY ESCROWS</span>
                <ShieldCheck size={16} color="var(--primary-cyan)" />
              </div>
              <div className="stat-value">{claims.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>ESCROW VALUE LOCKED</span>
                <Coins size={16} color="var(--primary-cyan)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--primary-cyan)' }}>
                {formatGen(contractBalance)} GEN
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>FACTORY DEFECT REFUNDS</span>
                <RotateCcw size={16} color="var(--primary-cyan)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--primary-cyan)' }}>{refundedCount}</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>SELLER RELEASES</span>
                <Award size={16} color="var(--amber-release)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--amber-release)' }}>{releasedCount}</div>
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
                  Lock purchase deposit into a smart escrow vault bound with the seller's address, Product ID, Sale ID, and official warranty policy URL.
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">SELLER-APPROVED PRODUCT ID</label>
                      <input 
                        type="text" 
                        placeholder="PRD-MACBOOK-M3-001" 
                        value={productIdInput}
                        onChange={(e) => setProductIdInput(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">SELLER-APPROVED SALE / ORDER ID</label>
                      <input 
                        type="text" 
                        placeholder="SALE-2026-88492" 
                        value={saleIdInput}
                        onChange={(e) => setSaleIdInput(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">OFFICIAL MANUFACTURER WARRANTY POLICY URL</label>
                    <input 
                      type="text" 
                      placeholder="https://warrantyshield-app.vercel.app/mock_warranty_policy.txt" 
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

          {/* Tab 2: VISION AI INSPECTOR (LAYER 1 OFF-CHAIN) */}
          {activeTab === 'VISION' && (
            <div style={{ maxWidth: '780px', margin: '0 auto' }}>
              <div className="glass-panel">
                <div className="panel-title">
                  <Eye size={22} color="var(--primary-cyan)" />
                  Layer 1: Off-Chain Vision AI Inspector (Google Gemini Pro)
                </div>
                <p className="panel-desc">
                  Upload an unboxing photo or video frame. Google Gemini Vision AI scans real hardware features (OLED dead pixels, water contact sensors, factory seals) and generates a verifiable Diagnostic Evidence Audit URL for GenLayer VM consensus.
                </p>

                <form onSubmit={handleAnalyzeVision}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">BOUND PRODUCT ID</label>
                      <input 
                        type="text" 
                        value={productIdInput}
                        onChange={(e) => setProductIdInput(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">BOUND SALE / ORDER ID</label>
                      <input 
                        type="text" 
                        value={saleIdInput}
                        onChange={(e) => setSaleIdInput(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">UPLOAD UNBOXING PHOTO OR MP4/WEBM VIDEO</label>
                    <div style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '24px', textAlign: 'center', background: '#0D131F', cursor: 'pointer', position: 'relative' }}>
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        onChange={handleImageUpload}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      />
                      {visionImagePreview ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <img src={visionImagePreview} alt="Unboxing Frame Preview" style={{ maxHeight: '200px', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border-color)' }} />
                          {visionImage?.isVideo && (
                            <span style={{ background: 'var(--primary-cyan-dim)', border: '1px solid var(--primary-cyan)', color: '#FFF', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>
                              🎬 VIDEO FRAME EXTRACTED ({visionImage.fileName})
                            </span>
                          )}
                          <span style={{ fontSize: '12px', color: 'var(--primary-cyan)' }}>Click or drop to replace photo/video file</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Upload size={32} color="var(--primary-cyan)" />
                          <span style={{ fontSize: '14px', color: '#FFF', fontWeight: 600 }}>Click or Drag & Drop Unboxing Photo or Video (.mp4 / .webm)</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supports JPG, PNG, WEBP, MP4, WEBM, MOV (Auto Video Frame Extraction)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" disabled={visionLoading || !visionImagePreview}>
                    {visionLoading ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Scanning Hardware Features with Gemini Vision AI...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Inspect Photo with Gemini Vision AI (Layer 1)
                      </>
                    )}
                  </button>
                </form>

                {/* Inspection Result Box */}
                {visionResult && (
                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-cyan)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <FileText size={16} />
                      GEMINI VISION AI DIAGNOSTIC AUDIT LOG
                    </div>
                    <pre style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#E2E8F0', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', lineHeight: '20px' }}>
                      {visionResult}
                    </pre>

                    {generatedReportUrl && (
                      <div style={{ marginTop: '16px', background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFF' }}>
                          GENERATED DIAGNOSTIC EVIDENCE REPORT URL (FOR GENLAYER VM):
                        </div>
                        <a 
                          href={generatedReportUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ fontSize: '12px', color: 'var(--primary-cyan)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {generatedReportUrl}
                          <ExternalLink size={14} />
                        </a>

                        <button 
                          onClick={handleUseGeneratedReport}
                          className="btn-primary" 
                          style={{ width: 'auto', alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}
                        >
                          <CheckCircle2 size={16} />
                          Auto-Fill Evidence URL into Claims Vault
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: CLAIMS VAULT */}
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
                      ESCROW RECORDS ({claims.length})
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
                          <span className={`badge ${c.status === 'REFUNDED' ? 'badge-verified' : c.status === 'RELEASED' ? 'badge-released' : 'badge-registered'}`}>
                            {c.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Buyer: {c.buyer.slice(0, 6)}...{c.buyer.slice(-4)}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-cyan)', marginTop: '4px' }}>
                          {formatGen(c.amount)} GEN LOCKED
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
                              Escrow Ref #{selectedClaim.id}
                            </div>
                          </div>

                          <span className={`badge ${selectedClaim.status === 'REFUNDED' ? 'badge-verified' : selectedClaim.status === 'RELEASED' ? 'badge-released' : 'badge-registered'}`} style={{ fontSize: '14px', padding: '8px 18px' }}>
                            {selectedClaim.status === 'REFUNDED' && <RotateCcw size={16} />}
                            {selectedClaim.status === 'RELEASED' && <Award size={16} />}
                            {selectedClaim.status === 'ACTIVE' && <Sparkles size={16} />}
                            {selectedClaim.status}
                          </span>
                        </div>

                        {/* Detail Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>BUYER WALLET</div>
                            <div style={{ fontSize: '12px', color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{selectedClaim.buyer.slice(0, 6)}...{selectedClaim.buyer.slice(-4)}</div>
                          </div>

                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SELLER WALLET</div>
                            <div style={{ fontSize: '12px', color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{selectedClaim.seller.slice(0, 6)}...{selectedClaim.seller.slice(-4)}</div>
                          </div>

                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ESCROW VALUE LOCKED</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-cyan)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                              {formatGen(selectedClaim.amount)} GEN
                            </div>
                          </div>
                        </div>

                        {/* Product & Sale ID Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>BOUND PRODUCT ID</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{selectedClaim.product_id || 'N/A'}</div>
                          </div>

                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>BOUND SALE / ORDER ID</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{selectedClaim.sale_id || 'N/A'}</div>
                          </div>
                        </div>

                        {/* Manufacturer Warranty Policy URL */}
                        {selectedClaim.policy_url && (
                          <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px' }}>
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
                              <span>HARDWARE DEFECT SCORE RATING</span>
                              <span style={{ color: selectedClaim.is_faulty ? 'var(--primary-cyan)' : 'var(--amber-release)' }}>
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
                          <div className={`decree-box ${selectedClaim.status === 'REFUNDED' ? 'verified' : selectedClaim.status === 'RELEASED' ? 'slashed' : ''}`}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: selectedClaim.status === 'REFUNDED' ? 'var(--primary-cyan)' : selectedClaim.status === 'RELEASED' ? 'var(--amber-release)' : 'var(--sky-accent)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <Shield size={16} />
                              SENIOR HARDWARE QUALITY AUDITOR REPORT LOG
                            </div>
                            <div style={{ fontStyle: 'italic', fontSize: '14px', color: '#E2E8F0', lineHeight: '22px' }}>
                              "{selectedClaim.audit_reasoning}"
                            </div>

                            {selectedClaim.evidence_url && (
                              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.5px' }}>
                                  UNBOXING / DEFECT EVIDENCE REPORT URL:
                                </div>
                                <a 
                                  href={selectedClaim.evidence_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ 
                                    color: 'var(--primary-cyan)', 
                                    textDecoration: 'none', 
                                    wordBreak: 'break-all', 
                                    fontFamily: 'var(--font-mono)', 
                                    fontSize: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(0, 240, 255, 0.05)',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(0, 240, 255, 0.2)',
                                    overflow: 'hidden'
                                  }}
                                >
                                  <span style={{ flex: 1, wordBreak: 'break-all' }}>
                                    {selectedClaim.evidence_url.length > 70 
                                      ? `${selectedClaim.evidence_url.slice(0, 65)}...` 
                                      : selectedClaim.evidence_url}
                                  </span>
                                  <ExternalLink size={14} style={{ flexShrink: 0 }} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Form & Buyer Actions */}
                        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                          {selectedClaim.status === 'ACTIVE' || selectedClaim.status === 'FAILED' ? (
                            <div>
                              {/* ENFORCE BUYER WALLET ACCESS CONTROL IN UI */}
                              {isBuyer ? (
                                <div>
                                  <div style={{ background: 'var(--primary-cyan-dim)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#93E5FF', marginBottom: '20px' }}>
                                    FILE WARRANTY CLAIM // Submit unboxing video or defect photo log URL to trigger AI hardware audit. Confirmed factory defects trigger 100% buyer refund.
                                  </div>

                                  {/* Preset Fill Buttons */}
                                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <button
                                      type="button"
                                      className="preset-btn preset-btn-emerald"
                                      onClick={() => setEvidenceUrlInput('https://warrantyshield-app.vercel.app/mock_factory_defect_evidence.txt')}
                                    >
                                      <RotateCcw size={14} />
                                      + Fill Factory Defect Evidence (Trigger 100% Refund)
                                    </button>

                                    <button
                                      type="button"
                                      className="preset-btn preset-btn-amber"
                                      onClick={() => setEvidenceUrlInput('https://warrantyshield-app.vercel.app/mock_user_damage_evidence.txt')}
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
                                        placeholder="https://warrantyshield-app.vercel.app/mock_factory_defect_evidence.txt" 
                                        value={evidenceUrlInput || 'https://warrantyshield-app.vercel.app/mock_factory_defect_evidence.txt'}
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
                                  {Number(selectedClaim.amount) > 0 && (
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
                                        Release Purchase Funds to Seller Wallet
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                                  <Lock size={20} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                                    READ-ONLY ESCROW VIEW
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Only the registered Buyer (<code className="code-tag">{selectedClaim.buyer.slice(0, 6)}...{selectedClaim.buyer.slice(-4)}</code>) can submit defect claims or release funds for this escrow.
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : selectedClaim.status === 'REFUNDED' ? (
                            <div style={{ background: '#0D131F', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--primary-cyan)', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                              Factory Defect Confirmed! Purchase Deposit 100% Refunded to Buyer Wallet.
                            </div>
                          ) : (
                            <div style={{ background: '#0D131F', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--amber-release)', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                              User Damage Verified / Buyer Release. Purchase Funds Released to Seller Wallet.
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
