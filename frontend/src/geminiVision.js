// =============================================================================
//  geminiVision.js - Layer 1 Off-Chain Vision AI Inspector Module
//  Uses Google Gemini 1.5 Vision API to scan real unboxing photos/video frames
// =============================================================================

export async function analyzeUnboxingImage({
  imageBase64,
  mimeType = 'image/jpeg',
  productId = 'PRD-MACBOOK-M3-001',
  saleId = 'SALE-2026-88492',
  apiKey = ''
}) {
  const effectiveApiKey = apiKey.trim() || import.meta.env.VITE_GEMINI_API_KEY || '';

  if (!effectiveApiKey) {
    throw new Error('Gemini API Key is missing. Please enter your Google Gemini API Key.');
  }

  // Strip data URL prefix if present
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
2. Estimate a "fault_score" from 0 to 100 (where 0 means 100% user damage/no defect, and 100 means confirmed factory DOA defect).
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

  // Active supported Gemini models for generateContent with multimodal input
  const models = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest'
  ];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveApiKey}`;
      
      const response = await fetch(endpoint, {
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

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status} from ${model}`;
        console.warn(`Model ${model} failed: ${errMsg}`);
        lastError = new Error(errMsg);
        continue;
      }

      const data = await response.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        lastError = new Error(`Gemini API model ${model} returned an empty response.`);
        continue;
      }

      return generatedText.trim();
    } catch (err) {
      console.warn(`Gemini Vision API model ${model} error:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to analyze image with Gemini Vision API.');
}
