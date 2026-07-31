// Vercel Serverless Function to call Google Gemini Vision API securely on the backend
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { imageBase64, mimeType = 'image/jpeg', productId = 'PRD-MACBOOK-M3-001', saleId = 'SALE-2026-88492' } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64 in request body.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    return res.status(500).json({ error: 'Backend GEMINI_API_KEY environment variable is not configured.' });
  }

  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const promptText = `You are a Senior Off-Chain Hardware Quality Inspector for the WarrantyShield Escrow Protocol.
Inspect this unboxing photo / video frame for hardware defects vs user damage.

Seller-Approved Product ID: ${productId}
Seller-Approved Sale ID: ${saleId}

Instructions:
1. Examine the image for hardware defects (e.g. OLED screen dead pixels/stripes, DOA motherboard burnt IC, battery cell swelling) versus user physical damage (e.g. cracked screen glass from drop, liquid submersion, water contact sensor tripped).
2. STRICT FAULT SCORE EVALUATION RULES:
   - If the image/video is random, obscured, unopened bubble wrap, package box only, or uninspectable: You MUST set Estimated Fault Score to 0 and explicitly reject the claim for invalid/insufficient unboxing evidence.
   - If user physical damage, drop marks, or water submersion is detected: Set Estimated Fault Score between 0 and 40.
   - ONLY set Estimated Fault Score >= 50 if clear, visible factory DOA hardware defect (e.g. screen dead pixels, burnt IC) on the unboxed device is verified.
3. Write a concise 2-3 sentence technical diagnostic finding.

Format your final response EXACTLY in this structured report template:

CUSTOMER DEFECT EVIDENCE REPORT (VISION AI AUDIT LOG)
--------------------------------------------------------------
Seller-Approved Product ID: ${productId}
Seller-Approved Sale ID: ${saleId}
Inspection Timestamp: ${new Date().toISOString()}

Vision AI Hardware Diagnostic Findings:
- Screen / Chassis Condition: <Your analysis of display/body>
- Liquid Contact Indicator (LCI): <Status of liquid sensors if visible or dry status>
- Factory Seal Integrity: <Status of packaging/seals>
- Estimated Fault Score: <0-100>

Hardware Auditor Verdict: <Concise 2-3 sentence verdict on factory defect vs user damage>
`;

  const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const apiRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: cleanBase64
                }
              }
            ]
          }]
        })
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        lastError = new Error(errJson?.error?.message || `HTTP ${apiRes.status} from ${model}`);
        continue;
      }

      const data = await apiRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        lastError = new Error(`Empty response from ${model}`);
        continue;
      }

      return res.status(200).json({ result: text.trim() });
    } catch (err) {
      lastError = err;
    }
  }

  return res.status(500).json({ error: lastError?.message || 'Failed to analyze image with backend Vision API.' });
}
